import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import ItemDetailModal from './ItemDetailModal.jsx';
import BlogFormModal from './BlogFormModal.jsx';
import { searchWarehouseCatalogItems } from '../../../services/warehouseService.js';
import { fetchHomeProducts, fetchHomeServices } from '../../../services/homeService.js';
import { formatCurrencyVnd, formatItemTypeLabel } from './itemFormatters.js';
import styles from './ServiceManagement.module.css';

const buildRowKeyWithIndex = (baseKey, idx) => `${String(baseKey ?? '')}-${idx}`;
const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const SERVICE_LINK_CACHE_KEY = 'gms_service_link_cache_v2';

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
      entry?.serviceId ?? entry?.service_id ?? entry?.id,
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

const hasBlog = (item) => {
  const candidates = [
    item?.serviceServiceId,
    item?.service_service_id,
    item?.service_serviceId,
    item?.serviceServiceID,
    item?.serviceId,
    item?.service_id,
    item?.data?.serviceId,
    item?.data?.serviceServiceId,
    item?.service?.serviceServiceId,
    item?.service?.service_service_id,
    item?.service?.serviceServiceID,
    item?.service?.id,
  ];
  return candidates.some((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0;
  });
};

const parseIsActive = (item) => {
  if (item == null || typeof item !== 'object') return null;
  const candidates = [
    item.isActive,
    item.is_active,
    item.isactive,
    item.active,
    item.status,
    item.is_enabled,
    item.enabled,
  ];
  for (const raw of candidates) {
    if (raw === true) return true;
    if (raw === false) return false;
    if (raw === 1 || raw === '1') return true;
    if (raw === 0 || raw === '0') return false;
    const text = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (['true', 'active', 'enabled', 'published', 'visible'].includes(text)) return true;
    if (['false', 'inactive', 'disabled', 'unpublished'].includes(text)) return false;
  }
  return null;
};

export default function PartManagement() {
  useScrollToTop();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [blogModalItem, setBlogModalItem] = useState(null);

  const [items, setItems] = useState([]);
  const [totalElementsServer, setTotalElementsServer] = useState(0);
  const [totalPagesServer, setTotalPagesServer] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const params = { page, size, itemType: 'PART' };
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter) params.isActive = statusFilter === 'true' ? 1 : 0;

        const [res, homeRes, homeProductsRes] = await Promise.all([
          searchWarehouseCatalogItems(params, token),
          fetchHomeServices().catch(() => null),
          fetchHomeProducts({ page: 0, size: 500, itemType: 'PART' }).catch(() => null),
        ]);
        const homeServiceIdByCatalogId = new Map([
          ...buildHomeServiceMap(homeRes),
          ...buildHomeServiceMap(homeProductsRes),
        ]);
        const cachedServiceIdByCatalogId = readServiceLinkCache();
        const payload = res?.data ?? res;
        const content = Array.isArray(payload?.content) ? payload.content : [];

        const withStatus = content.map((item) => {
          if (item?.itemId == null) return item;
          const itemId = toNullablePositiveNumber(item.itemId);
          const homeServiceId = itemId != null ? homeServiceIdByCatalogId.get(itemId) ?? null : null;
          const cachedServiceId = itemId != null ? cachedServiceIdByCatalogId.get(itemId) ?? null : null;
          const itemServiceId = hasBlog(item)
            ? toNullablePositiveNumber(
              item?.serviceServiceId
                ?? item?.service_service_id
                ?? item?.serviceId
                ?? item?.service_id
                ?? item?.data?.serviceId
                ?? item?.data?.serviceServiceId,
            )
            : null;
          const resolvedServiceId = itemServiceId ?? homeServiceId ?? cachedServiceId;
          if (itemId != null && resolvedServiceId != null) {
            writeServiceLinkCache(itemId, resolvedServiceId);
          }
          return {
            ...item,
            serviceServiceId: resolvedServiceId ?? null,
            service_service_id: resolvedServiceId ?? null,
          };
        });

        if (cancelled) return;
        setItems(withStatus);
        setTotalElementsServer(Number(payload?.totalElements ?? content.length));
        setTotalPagesServer(
          Number(payload?.totalPages ?? Math.max(1, Math.ceil((payload?.totalElements ?? content.length) / Math.max(1, size)))),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Khong the tai danh sach phu tung.');
        setItems([]);
        setTotalElementsServer(0);
        setTotalPagesServer(1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, size, debouncedSearch, dataVersion, statusFilter]);

  const totalElements = Number(totalElementsServer ?? (Array.isArray(items) ? items.length : 0));
  const totalPages = Math.max(1, Number(totalPagesServer ?? Math.max(1, Math.ceil(totalElements / Math.max(1, size)))));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const pageButtons = useMemo(() => {
    const max = 5;
    const last = Math.max(1, totalPages) - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const result = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) result.push(i);
    return result;
  }, [safePage, totalPages]);

  const paged = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const handleResetFilters = () => {
    setPage(0);
    setSize(10);
    setSearch('');
    setStatusFilter('');
  };

  const handleBlogSaved = (savedData) => {
    const savedItemId = savedData?.catalogItemId ?? blogModalItem?.itemId;
    setBlogModalItem(null);
    if (savedData?.serviceServiceId && savedItemId) {
      writeServiceLinkCache(savedItemId, savedData.serviceServiceId);
      setItems((prev) =>
        prev.map((item) =>
          item.itemId === savedItemId
            ? {
                ...item,
                serviceServiceId: savedData.serviceServiceId,
                service_service_id: savedData.serviceServiceId,
              }
            : item,
        ),
      );
    } else {
      setDataVersion((v) => v + 1);
    }
  };

  const formatPrice = (item) => {
    const show = item?.showPrice;
    const price = item?.price;
    return show ? `${formatCurrencyVnd(price)} ₫` : 'Lien he';
  };

  return (
    <div className={styles['service-page']}>
      <div className={styles['service-header']}>
        <div className={styles['service-header-title']}>
          <span className={styles['header-icon']}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.1a5.3 5.3 0 0 0-6.9 6.9l-4.2 4.2a1.6 1.6 0 0 0 2.3 2.3l4.2-4.2a5.3 5.3 0 0 0 6.9-6.9l-2.4 2.4-2.9-.7-.7-2.9 2.4-2.4Z" />
            </svg>
          </span>
          <h1>Danh sach phu tung</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className={styles['primary-button']} onClick={() => navigate('/part-management/create-product')}>
            Them phu tung
          </button>
          <span className={styles['total-count']}>{totalElements} phu tung</span>
        </div>
      </div>

      <div className={styles['pending-filters']}>
        <div className={styles['filter-card-actions']}>
          <div className={styles['search-box']}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Tim kiem theo ten, SKU, hang, dong san pham..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            className={styles['status-filter']}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tat ca trang thai</option>
            <option value="true">Hoat dong</option>
            <option value="false">Khong hoat dong</option>
          </select>
          <button className={styles['ghost-button']} onClick={handleResetFilters}>
            Xoa bo loc
          </button>
        </div>
      </div>

      {error && <div className={styles['error-banner']}>{error}</div>}

      <div className={styles['service-card']}>
        <div className={styles['table-wrapper']}>
          <table className={styles['service-table']}>
            <thead>
              <tr>
                <th>ID</th>
                <th>TEN</th>
                <th>SKU</th>
                <th>HANG</th>
                <th>DONG SP</th>
                <th>LOAI</th>
                <th>GIA</th>
                <th>DON VI</th>
                <th>TRANG THAI</th>
                <th>TẠO BÀI VIẾT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="10" className={styles['empty-row']}>Dang tai du lieu...</td>
                </tr>
              )}
              {!isLoading && totalElements === 0 && (
                <tr>
                  <td colSpan="10" className={styles['empty-row']}>Khong co phu tung nao.</td>
                </tr>
              )}
              {!isLoading &&
                paged.map((item, idx) => {
                  const key = buildRowKeyWithIndex(item.itemId, idx);
                  const itemHasBlog = hasBlog(item);
                  return (
                    <tr key={String(key)}>
                      <td>{item.itemId ?? '-'}</td>
                      <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.itemName ?? '-'}</td>
                      <td>{item.sku || '-'}</td>
                      <td>{item.brand || '-'}</td>
                      <td>{item.productLine || '-'}</td>
                      <td>{formatItemTypeLabel(item.itemType)}</td>
                      <td>{formatPrice(item)}</td>
                      <td>{item.unit || '-'}</td>
                      <td>
                        <span className={`${styles['status-badge']} ${parseIsActive(item) ? styles['status-active'] : styles['status-inactive']}`}>
                          {parseIsActive(item) === true
                            ? 'Hoat dong'
                            : parseIsActive(item) === false
                              ? 'Khong hoat dong'
                              : '-'}
                        </span>
                      </td>
                      <td>
                        <div className={styles['action-buttons']}>
                          <button
                            className={`${styles['action-btn']} ${styles['view-btn']}`}
                            onClick={() => setSelectedItem(item)}
                            title="Xem chi tiet"
                          >
                            Chi tiet
                          </button>
                          <button
                            className={`${styles['action-btn']} ${itemHasBlog ? styles['edit-btn'] : styles['create-btn']}`}
                            onClick={() => setBlogModalItem(item)}
                            title={itemHasBlog ? 'Sửa bài viết phụ tùng' : 'Tạo bài viết phụ tùng'}
                          >
                            {itemHasBlog ? 'Sửa bài viết' : 'Tạo bài viết'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className={styles['service-footer']}>
          <div className={styles['page-size']}>
            <span>Hien thi:</span>
            <select
              value={String(size)}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
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
              Truoc
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

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {blogModalItem && (
        <BlogFormModal
          item={blogModalItem}
          mode={hasBlog(blogModalItem) ? 'edit' : 'createFromCatalog'}
          onClose={() => setBlogModalItem(null)}
          onSaved={handleBlogSaved}
        />
      )}
    </div>
  );
}
