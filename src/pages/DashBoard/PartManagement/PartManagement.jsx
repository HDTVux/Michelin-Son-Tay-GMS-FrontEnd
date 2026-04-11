import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import ItemDetailModal from './ItemDetailModal.jsx';
import BlogFormModal from './BlogFormModal.jsx';
import { searchWarehouseCatalogItems } from '../../../services/warehouseService.js';
import { fetchHomeProducts, fetchHomeServices } from '../../../services/homeService.js';
import {
  formatCurrencyVnd,
  formatItemTypeLabel,
  getItemColorText,
  getItemOriginText,
} from './itemFormatters.js';
import styles from './ServiceManagement.module.css';

const buildRowKeyWithIndex = (baseKey, idx) => `${String(baseKey ?? '')}-${idx}`;
const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const SERVICE_LINK_CACHE_KEY = 'gms_service_link_cache_v3';

const getServiceServiceId = (item) => {
  if (!item || typeof item !== 'object') return null;
  const candidates = [
    item?.serviceServiceId,
    item?.service_service_id,
    item?.service_serviceId,
    item?.serviceServiceID,
    item?.serviceId,
    item?.service_id,
    item?.data?.serviceId,
    item?.data?.service_service_id,
    item?.data?.serviceServiceId,
    item?.service?.serviceId,
    item?.service?.service_service_id,
    item?.service?.serviceServiceId,
    item?.service?.serviceServiceID,
    item?.serviceInfo?.serviceId,
    item?.serviceInfo?.service_service_id,
    item?.serviceInfo?.serviceServiceId,
  ];
  for (const value of candidates) {
    const parsed = toNullablePositiveNumber(value);
    if (parsed != null) return parsed;
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

const hasBlog = (item) => {
  return getServiceServiceId(item) != null;
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
  const [originFilter, setOriginFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
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
  }, [statusFilter, originFilter, colorFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const hasClientOnlyFilters = Boolean(originFilter || colorFilter);
        const params = {
          page: hasClientOnlyFilters ? 0 : page,
          size: hasClientOnlyFilters ? 500 : size,
          itemType: 'PART',
        };
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
          const itemServiceId = getServiceServiceId(item);
          const resolvedServiceId = itemServiceId ?? homeServiceId ?? cachedServiceId;
          if (itemId != null && itemServiceId != null) {
            writeServiceLinkCache(itemId, itemServiceId);
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
  }, [page, size, debouncedSearch, dataVersion, statusFilter, originFilter, colorFilter]);
  const originOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      const text = getItemOriginText(item);
      if (text && text !== '-') set.add(text);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items]);

  const colorOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      const text = getItemColorText(item);
      if (text && text !== '-') set.add(text);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items]);

  const filteredItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list.filter((item) => {
      const matchesOrigin = !originFilter || getItemOriginText(item) === originFilter;
      const matchesColor = !colorFilter || getItemColorText(item) === colorFilter;
      return matchesOrigin && matchesColor;
    });
  }, [colorFilter, items, originFilter]);

  const hasClientOnlyFilters = Boolean(originFilter || colorFilter);
  const totalElements = hasClientOnlyFilters
    ? filteredItems.length
    : Number(totalElementsServer ?? (Array.isArray(items) ? items.length : 0));
  const totalPages = hasClientOnlyFilters
    ? Math.max(1, Math.ceil(totalElements / Math.max(1, size)))
    : Math.max(1, Number(totalPagesServer ?? Math.max(1, Math.ceil(totalElements / Math.max(1, size)))));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const pageButtons = useMemo(() => {
    const max = 5;
    const last = Math.max(1, totalPages) - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const result = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) result.push(i);
    return result;
  }, [safePage, totalPages]);

  const paged = useMemo(() => {
    if (!hasClientOnlyFilters) return Array.isArray(items) ? items : [];
    const start = safePage * size;
    return filteredItems.slice(start, start + size);
  }, [filteredItems, hasClientOnlyFilters, items, safePage, size]);

  const handleResetFilters = () => {
    setPage(0);
    setSize(10);
    setSearch('');
    setStatusFilter('');
    setOriginFilter('');
    setColorFilter('');
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
           placeholder="Tìm kiếm theo tên, SKU, hãng, dòng sản phẩm..."

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
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
          <select
            className={styles['status-filter']}
            value={originFilter}
            onChange={(e) => {
              setOriginFilter(e.target.value);
              setPage(0);
            }}
          >
               <option value="">Tất cả xuất xứ</option>
            {originOptions.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </select>
          <select
            className={styles['status-filter']}
            value={colorFilter}
            onChange={(e) => {
              setColorFilter(e.target.value);
              setPage(0);
            }}
          >
           <option value="">Tất cả màu</option>
            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
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
                <th>TÊN</th>
                <th>SKU</th>
                <th>HÃNG</th>
                <th>DÒNG SP</th>
                <th>LOẠI</th>
                <th>GIÁ</th>
                <th>ĐƠN VỊ</th>
                <th>XUẤT XỨ</th>
                <th>MÀU</th>
                <th>TẠO BÀI VIẾT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="11" className={styles['empty-row']}>Dang tai du lieu...</td>
                </tr>
              )}
              {!isLoading && totalElements === 0 && (
                <tr>
                  <td colSpan="11" className={styles['empty-row']}>Khong co phu tung nao.</td>
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
                      <td>{getItemOriginText(item)}</td>
                      <td>{getItemColorText(item)}</td>
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
