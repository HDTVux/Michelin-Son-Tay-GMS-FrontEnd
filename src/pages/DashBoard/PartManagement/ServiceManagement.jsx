import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchCatalogItems } from '../../../services/blogService.js';
import { fetchHomeProducts, fetchHomeServices } from '../../../services/homeService.js';
import styles from './ServiceManagement.module.css';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;

const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const SERVICE_LINK_CACHE_KEY = 'gms_service_link_cache_v3';
const CLIENT_SORT_FETCH_SIZE = 5000;

const toNullableBoolean = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (!text) return null;
    if (['true', '1', 'active', 'enabled', 'published', 'visible', 'available'].includes(text)) return true;
    if (['false', '0', 'inactive', 'disabled', 'hidden', 'unpublished', 'draft', 'expired', 'archived'].includes(text)) return false;
  }
  return null;
};

const getServiceServiceId = (item) => {
  if (!item || typeof item !== 'object') return null;
  const candidates = [
    item.service_service_id, item.serviceServiceId,
    item.service_serviceId, item.serviceServiceID,
    item.serviceId, item.service_id,
    item?.data?.serviceId, item?.data?.service_service_id,
    item?.data?.serviceServiceId,
    item?.service?.service_service_id, item?.service?.serviceServiceId,
    item?.service?.service_id,
    item?.serviceInfo?.service_service_id, item?.serviceInfo?.serviceServiceId,
    item?.serviceInfo?.service_id,
  ];
  for (const value of candidates) {
    const parsed = toNullablePositiveNumber(value);
    if (parsed != null) return parsed;
  }
  // Deep scan fallback: support unknown backend response shapes.
  const visited = new Set();
  const queue = [{ node: item, depth: 0 }];
  const MAX_DEPTH = 5;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { node, depth } = current;
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);

    const entries = Array.isArray(node) ? node.map((v, i) => [String(i), v]) : Object.entries(node);
    for (const [rawKey, rawValue] of entries) {
      const key = String(rawKey || '').toLowerCase();
      const looksLikeServiceObject = key.includes('service') && rawValue && typeof rawValue === 'object';
      if (looksLikeServiceObject) {
        const nestedFromServiceObject = toNullablePositiveNumber(
          rawValue.serviceId ?? rawValue.service_id ?? rawValue.service_service_id ?? rawValue.serviceServiceId,
        );
        if (nestedFromServiceObject != null) return nestedFromServiceObject;
      }
      const looksLikeServiceId =
        (key.includes('service') && key.includes('id'))
        || key === 'serviceid'
        || key === 'service_id'
        || key === 'service_service_id';
      if (looksLikeServiceId) {
        const direct = toNullablePositiveNumber(rawValue);
        if (direct != null) return direct;
        if (rawValue && typeof rawValue === 'object') {
          const nested = toNullablePositiveNumber(
            rawValue.serviceId ?? rawValue.service_id ?? rawValue.service_service_id ?? rawValue.serviceServiceId,
          );
          if (nested != null) return nested;
        }
      }
      if (depth < MAX_DEPTH && rawValue && typeof rawValue === 'object') {
        queue.push({ node: rawValue, depth: depth + 1 });
      }
    }
  }
  return null;
};

const buildHomeServiceMap = (homeRes) => {
  const payload = extractPayload(homeRes);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : [];
  const serviceIdByCatalogId = new Map();
  list.forEach((entry) => {
    const catalogItemId = toNullablePositiveNumber(
      entry?.catalogItemId ?? entry?.catalog_item_id ?? entry?.catalogId ?? entry?.itemId,
    );
    const serviceId = toNullablePositiveNumber(
      entry?.serviceId
      ?? entry?.service_id
      ?? entry?.serviceServiceId
      ?? entry?.service_service_id
      ?? entry?.service?.serviceId
      ?? entry?.service?.service_id
      ?? entry?.service?.serviceServiceId
      ?? entry?.service?.service_service_id,
    );
    if (catalogItemId != null && serviceId != null) {
      serviceIdByCatalogId.set(catalogItemId, serviceId);
    }
  });
  return serviceIdByCatalogId;
};

const readServiceLinkCache = () => {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(SERVICE_LINK_CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return new Map();
    const map = new Map();
    Object.entries(parsed).forEach(([rawCatalogId, rawServiceId]) => {
      const catalogItemId = toNullablePositiveNumber(rawCatalogId);
      const serviceId = toNullablePositiveNumber(rawServiceId);
      if (catalogItemId != null && serviceId != null) {
        map.set(catalogItemId, serviceId);
      }
    });
    return map;
  } catch {
    return new Map();
  }
};

const writeServiceLinkCache = (catalogItemId, serviceId) => {
  if (typeof window === 'undefined') return;
  const safeCatalogItemId = toNullablePositiveNumber(catalogItemId);
  const safeServiceId = toNullablePositiveNumber(serviceId);
  if (safeCatalogItemId == null || safeServiceId == null) return;
  try {
    const raw = window.localStorage.getItem(SERVICE_LINK_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === 'object' ? parsed : {};
    next[String(safeCatalogItemId)] = safeServiceId;
    window.localStorage.setItem(SERVICE_LINK_CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore cache errors (private mode/quota).
  }
};

const hasService = (item) => getServiceServiceId(item) != null;

const parseIsActive = (item) => {
  if (item == null || typeof item !== 'object') return null;
  const candidates = [
    item.isActive, item.is_active, item.isactive,
    item.active, item.status, item.is_enabled, item.enabled,
  ];
  for (const raw of candidates) {
    const parsed = toNullableBoolean(raw);
    if (parsed != null) return parsed;
  }
  return null;
};

const getSortValue = (item, field) => {
  if (field === 'itemId') return Number(item?.itemId ?? 0);
  if (field === 'price') return Number(item?.price ?? 0);
  if (field === 'status') return parseIsActive(item) === true ? 1 : 0;
  return String(item?.[field] ?? '').trim();
};

const compareItems = (a, b, field, direction) => {
  const aValue = getSortValue(a, field);
  const bValue = getSortValue(b, field);
  const multiplier = direction === 'desc' ? -1 : 1;
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return (aValue - bValue) * multiplier;
  }
  return String(aValue).localeCompare(String(bValue), 'vi', { numeric: true, sensitivity: 'base' }) * multiplier;
};

export default function ServiceManagement() {
  useScrollToTop();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('itemId');
  const [sortDirection, setSortDirection] = useState('asc');

  const [items, setItems] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch catalog items — only services (itemType: SERVICE)
  const isDefaultSort = sortField === 'itemId' && sortDirection === 'asc';
  const useClientSortedPaging = !isDefaultSort;

  useEffect(() => {
    setPage(0);
  }, [sortDirection, sortField]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const params = {
          page: useClientSortedPaging ? 0 : page,
          size: useClientSortedPaging ? CLIENT_SORT_FETCH_SIZE : size,
          itemType: 'SERVICE',
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter) params.isActive = statusFilter === 'true';
        if (useClientSortedPaging) params.sortBy = `${sortField},${sortDirection}`;

        const [res, homeRes, homeProductsRes] = await Promise.all([
          fetchCatalogItems(params, token),
          fetchHomeServices().catch(() => null),
          fetchHomeProducts({ page: 0, size: 500, itemType: 'SERVICE' }).catch(() => null),
        ]);
        const homeServiceIdByCatalogId = new Map([
          ...buildHomeServiceMap(homeRes),
          ...buildHomeServiceMap(homeProductsRes),
        ]);
        const cachedServiceIdByCatalogId = readServiceLinkCache();
        const payload = extractPayload(res);
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : [];

        const withStatus = content.map((item) => {
          if (item?.itemId == null) return item;
          const itemId = toNullablePositiveNumber(item.itemId);
          const homeServiceId = itemId != null ? homeServiceIdByCatalogId.get(itemId) ?? null : null;
          const cachedServiceId = itemId != null ? cachedServiceIdByCatalogId.get(itemId) ?? null : null;
          const directServiceId = getServiceServiceId(item);
          const resolvedServiceId = directServiceId ?? homeServiceId ?? cachedServiceId;
          const normalizedIsActive = parseIsActive(item);
          if (itemId != null && directServiceId != null) {
            writeServiceLinkCache(itemId, directServiceId);
          }
          return {
            ...item,
            isActive: normalizedIsActive ?? item?.isActive ?? item?.is_active ?? null,
            serviceServiceId: resolvedServiceId ?? null,
            service_service_id: resolvedServiceId ?? null,
          };
        });

        if (cancelled) return;
        setItems(withStatus);
        const nextTotalElements = useClientSortedPaging
          ? withStatus.length
          : Number(payload?.totalElements ?? content.length);
        setTotalElements(nextTotalElements);
        setTotalPages(
          useClientSortedPaging
            ? Math.max(1, Math.ceil(nextTotalElements / Math.max(1, size)))
            : Number(
                payload?.totalPages
                ?? Math.max(1, Math.ceil((payload?.totalElements ?? withStatus.length) / Math.max(1, size))),
              ),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải danh sách dịch vụ.');
        setItems([]);
        setTotalElements(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, size, debouncedSearch, statusFilter, sortDirection, sortField, useClientSortedPaging]);

  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => compareItems(a, b, sortField, sortDirection));
  }, [items, sortDirection, sortField]);

  const displayedItems = useMemo(() => {
    if (!useClientSortedPaging) return sortedItems;
    const start = safePage * size;
    return sortedItems.slice(start, start + size);
  }, [safePage, size, sortedItems, useClientSortedPaging]);

  const pageButtons = useMemo(() => {
    const max = 5;
    const last = Math.max(1, totalPages) - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const items2 = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) items2.push(i);
    return items2;
  }, [safePage, totalPages]);

  const handleResetFilters = () => {
    setPage(0);
    setSize(10);
    setSearch('');
    setStatusFilter('');
    setSortField('itemId');
    setSortDirection('asc');
  };

  const openCreateService = useCallback(() => {
    navigate('/service-management/create-service');
  }, [navigate]);

  const openCreateFromCatalog = useCallback((item) => {
    if (!item?.itemId) return;
    navigate(`/service-management/blog/${encodeURIComponent(String(item.itemId))}?mode=createFromCatalog`, {
      state: { item, mode: 'createFromCatalog' },
    });
  }, [navigate]);

  const openEditService = useCallback((item) => {
    if (!item?.itemId) return;
    navigate(`/service-management/blog/${encodeURIComponent(String(item.itemId))}?mode=edit`, {
      state: { item, mode: 'edit' },
    });
  }, [navigate]);

  const formatPrice = (item) => {
    if (toNullableBoolean(item?.showPrice) === true) {
      return item.price != null ? `${Number(item.price).toLocaleString('vi-VN')} ₫` : '-';
    }
    return 'Liên hệ';
  };

  const formatItemType = (item) => {
    const raw = String(item?.itemType ?? item?.type ?? '').trim().toUpperCase();
    if (raw === 'SERVICE') return 'Dịch vụ';
    if (raw === 'PRODUCT') return 'Phụ tùng';
    return raw || 'SERVICE';
  };

  return (
    <div className={styles['service-page']}>
      {/* Header */}
      <div className={styles['service-header']}>
        <div className={styles['service-header-title']}>
          <span className={styles['header-icon']}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </span>
          <h1>Danh sách dịch vụ</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className={styles['primary-button']} onClick={openCreateService}>
            Thêm dịch vụ
          </button>
          <span className={styles['total-count']}>{totalElements} dịch vụ</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles['pending-filters']}>
        <div className={styles['filter-card-actions']}>
          <div className={styles['search-box']}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Tìm kiếm theo tên dịch vụ, mã dịch vụ..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <select
            className={styles['status-filter']}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
          <select
            className={styles['status-filter']}
            value={sortField}
            onChange={(e) => { setSortField(e.target.value); setPage(0); }}
          >
            <option value="itemId">Sắp xếp: ID</option>
            <option value="itemName">Sắp xếp: Tên</option>
            <option value="sku">Sắp xếp: Mã</option>
            <option value="price">Sắp xếp: Giá</option>
            <option value="status">Sắp xếp: Trạng thái</option>
          </select>
          <select
            className={styles['status-filter']}
            value={sortDirection}
            onChange={(e) => { setSortDirection(e.target.value); setPage(0); }}
          >
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </select>
          <button className={styles['ghost-button']} onClick={handleResetFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {error && <div className={styles['error-banner']}>{error}</div>}

      {/* Table */}
      <div className={styles['service-card']}>
        <div className={styles['table-wrapper']}>
          <table className={styles['service-table']}>
            <thead>
              <tr>
                <th>ID</th>
                <th>TÊN DỊCH VỤ</th>
                <th>MÃ DỊCH VỤ</th>
                <th>LOẠI</th>
                <th>GIÁ</th>
                <th>TRẠNG THÁI</th>
                <th>TẠO BÀI VIẾT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan="7" className={styles['empty-row']}>Đang tải dữ liệu...</td></tr>
              )}
              {!isLoading && totalElements === 0 && (
                <tr><td colSpan="7" className={styles['empty-row']}>Chưa có dịch vụ nào.</td></tr>
              )}
              {!isLoading && displayedItems.map((item) => {
                const itemHasService = hasService(item);
                return (
                  <tr key={item.itemId}>
                    <td style={{ color: '#9333ea', fontWeight: 600, fontSize: 13 }}>{item.itemId}</td>
                    <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.itemName || '-'}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                        {item.sku || '-'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>
                        {formatItemType(item)}
                      </span>
                    </td>
                    <td>{formatPrice(item)}</td>
                    <td>
                      <span className={`${styles['status-badge']} ${parseIsActive(item) ? styles['status-active'] : styles['status-inactive']}`}>
                        {parseIsActive(item) === true
                          ? 'Hoạt động'
                          : parseIsActive(item) === false
                            ? 'Không hoạt động'
                            : '—'}
                      </span>
                    </td>
                    <td>
                      <div className={styles['action-buttons']}>
                        {itemHasService ? (
                          <button
                            className={`${styles['action-btn']} ${styles['edit-btn']}`}
                            onClick={() => openEditService(item)}
                          >
                            Sửa bài viết
                          </button>
                        ) : (
                          <button
                            className={`${styles['action-btn']} ${styles['create-btn']}`}
                            onClick={() => openCreateFromCatalog(item)}
                          >
                            Tạo bài viết
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: page size + pagination */}
        <div className={styles['service-footer']}>
          <div className={styles['page-size']}>
            <span>Hiển thị:</span>
            <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className={styles['pagination']}>
            <button
              className={styles['primary-button']}
              disabled={safePage <= 0 || isLoading}
              onClick={() => setPage(safePage - 1)}
            >
              Trước
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                className={p === safePage ? styles['ghost-button'] : `${styles['primary-button']} ${styles['is-ghost']}`}
                disabled={p === safePage || isLoading}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button
              className={styles['primary-button']}
              disabled={safePage >= Math.max(1, totalPages) - 1 || isLoading}
              onClick={() => setPage(safePage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
