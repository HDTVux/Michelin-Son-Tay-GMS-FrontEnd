import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import ItemDetailModal from './ItemDetailModal.jsx';
import {
  fetchWarehouseInventorySyncTemplate,
  fetchWarehousesAll,
  searchWarehouseCatalogItemsDetail,
  syncWarehouseInventoryExcel,
} from '../../../services/warehouseService.js';
import { fetchHomeProducts, fetchHomeServices } from '../../../services/homeService.js';
import {
  formatCurrencyVnd,
  getItemColorText,
  getItemOriginText,
} from '../PartManagement/itemFormatters.js';
import styles from './WarehouseManagement.module.css';

const buildRowKeyWithIndex = (baseKey, idx) => `${String(baseKey ?? '')}-${idx}`;
const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const SERVICE_LINK_CACHE_KEY = 'gms_service_link_cache_v3';

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const getWarehouseDetails = (item) => {
  if (!item || typeof item !== 'object') return [];
  const candidates = [
    item?.warehouseDetails,
    item?.warehouse_details,
    item?.warehouseDetailList,
    item?.warehouse_detail_list,
    item?.warehouses,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

const getWarehouseDisplayName = (detail) => {
  return String(detail?.warehouseName || detail?.warehouseCode || detail?.warehouseId || '').trim() || '-';
};

const getWarehouseAvailableQty = (detail) => {
  const qty = toFiniteNumber(detail?.quantity ?? detail?.stockQuantity ?? detail?.stock_quantity);
  if (qty != null) return qty;
  const availableStockLevel = toFiniteNumber(
    detail?.availableStockLevel
      ?? detail?.available_stock_level
      ?? detail?.availableStock
      ?? detail?.available_stock,
  );
  if (availableStockLevel != null) return availableStockLevel;
  const availableQty = toFiniteNumber(detail?.availableQuantity ?? detail?.available_quantity);
  if (availableQty != null) return availableQty;
  return null;
};
const getWarehouseReservedQty = (detail) => {
  const reserved = toFiniteNumber(
    detail?.reservedQuantity,
  );
  if (reserved != null) return reserved;

  const reservedStockLevel = toFiniteNumber(
    detail?.reservedStockLevel
      ?? detail?.reserved_stock_level,
  );
  if (reservedStockLevel != null) return reservedStockLevel;

  return null;
};

const getWarehouseSellingPrice = (detail) => {
  const price = toFiniteNumber(
    detail?.sellingPrice
      ?? detail?.selling_price
      ?? detail?.price
      ?? detail?.unitPrice
      ?? detail?.unit_price,
  );
  return price;
};

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
  let list = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.content)) list = payload.content;
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
  const storage = globalThis?.localStorage;
  if (!storage) return new Map();
  try {
    const raw = storage.getItem(SERVICE_LINK_CACHE_KEY);
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
  const storage = globalThis?.localStorage;
  if (!storage) return;
  const safeCatalogItemId = toNullablePositiveNumber(catalogItemId);
  const safeServiceId = toNullablePositiveNumber(serviceId);
  if (safeCatalogItemId == null || safeServiceId == null) return;
  try {
    const raw = storage.getItem(SERVICE_LINK_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === 'object' ? parsed : {};
    next[String(safeCatalogItemId)] = safeServiceId;
    storage.setItem(SERVICE_LINK_CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore cache errors (private mode/quota).
  }
};



export default function PartManagement() {
  useScrollToTop();
  const navigate = useNavigate();
  const excelInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isSyncingExcel, setIsSyncingExcel] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const res = await fetchWarehousesAll(token);
        const payload = res?.data?.data ?? res?.data ?? res;
        const list = Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setWarehouses(list);

        // Auto-select first active warehouse (if none selected).
        if (!selectedWarehouseId) {
          const firstActive = list.find((w) => w?.isActive === true) || list[0] || null;
          if (firstActive?.warehouseId != null) setSelectedWarehouseId(String(firstActive.warehouseId));
        }
      } catch {
        if (!cancelled) setWarehouses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // selectedWarehouseId is intentionally excluded to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          searchWarehouseCatalogItemsDetail(params, token),
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
          let homeServiceId = null;
          let cachedServiceId = null;
          if (itemId != null) {
            homeServiceId = homeServiceIdByCatalogId.get(itemId) ?? null;
            cachedServiceId = cachedServiceIdByCatalogId.get(itemId) ?? null;
          }
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
        setError(err?.message || 'Không thể tải danh sách phụ tùng.');
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
  }, [page, size, debouncedSearch, statusFilter, originFilter, colorFilter, refreshKey]);
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
  const itemsLengthFallback = Array.isArray(items) ? items.length : 0;
  const totalElements = hasClientOnlyFilters
    ? filteredItems.length
    : Number(totalElementsServer ?? itemsLengthFallback);
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


  const formatPrice = (item) => {
    const show = item?.showPrice;
    const price = item?.price;
    return show ? `${formatCurrencyVnd(price)} ₫` : 'Liên hệ';
  };

  const renderWarehouseLines = (item, renderLine, emptyContent = '-') => {
    const details = getWarehouseDetails(item);
    const itemKey = String(item?.itemId ?? item?.id ?? '');
    if (!details.length) {
      return [
        <div key={`${itemKey}-empty`} className={styles['warehouse-line']}>
          {emptyContent}
        </div>,
      ];
    }
    return details.map((d, i) => {
      const wid = d?.warehouseId ?? d?.warehouse_id ?? i;
      const key = `${itemKey}-${String(wid)}-${i}`;
      return (
        <div key={key} className={styles['warehouse-line']}>
          {renderLine(d)}
        </div>
      );
    });
  };

  const handleDownloadTemplate = async () => {
    const wid = toNullablePositiveNumber(selectedWarehouseId);
    if (wid == null) {
      setError('Vui lòng chọn kho để xuất mẫu Excel.');
      return;
    }
    try {
      setIsDownloadingTemplate(true);
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const { blob, filename } = await fetchWarehouseInventorySyncTemplate(wid, token);
      const url = globalThis.URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = filename || `inventory-sync-template-warehouse-${wid}.xlsx`;
      globalThis.document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Không thể tải mẫu Excel.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleChooseExcelFile = () => {
    const wid = toNullablePositiveNumber(selectedWarehouseId);
    if (wid == null) {
      setError('Vui lòng chọn kho trước khi nhập Excel.');
      return;
    }
    excelInputRef.current?.click?.();
  };

  const handleExcelFileSelected = async (e) => {
    const wid = toNullablePositiveNumber(selectedWarehouseId);
    const file = e?.target?.files?.[0] || null;
    // allow selecting same file again
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (wid == null || !file) return;

    try {
      setIsSyncingExcel(true);
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      await syncWarehouseInventoryExcel(wid, file, token);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err?.message || 'Không thể nhập kho bằng Excel.');
    } finally {
      setIsSyncingExcel(false);
    }
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
          <h1>Quản lý kho</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className={styles['primary-button']} onClick={() => navigate('/part-management/create-product')}>
            Thêm phụ tùng
          </button>
          <span className={styles['total-count']}>{totalElements} phụ tùng</span>
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

          <select
            className={styles['status-filter']}
            value={String(selectedWarehouseId)}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            title="Chọn kho"
          >
            <option value="">Chọn kho...</option>
            {warehouses.map((w) => (
              <option key={String(w?.warehouseId ?? w?.warehouseCode)} value={String(w?.warehouseId ?? '')}>
                {String(w?.warehouseName || w?.warehouseCode || w?.warehouseId || '-')}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles['ghost-button']}
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate || isSyncingExcel}
            title="Xuất file mẫu Excel theo kho"
          >
            {isDownloadingTemplate ? 'Dang tai mau...' : 'Xuất file Excel'}
          </button>

          <button
            type="button"
            className={styles['primary-button']}
            onClick={handleChooseExcelFile}
            disabled={isDownloadingTemplate || isSyncingExcel}
            title="Nhập kho bằng file Excel"
          >
            {isSyncingExcel ? 'Dang nhap...' : 'Nhập file Excel'}
          </button>

          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleExcelFileSelected}
          />

          <button className={styles['ghost-button']} onClick={handleResetFilters}>
            Xóa bộ lọc
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
                <th>KHO</th>
                <th>SỐ LƯỢNG</th>
                <th>ĐANG GIỮ</th>
                  <th>ĐANG GIỮ</th>
                <th>GIÁ (KHO)</th>
                <th>ĐƠN VỊ</th>
                <th>XUẤT XỨ</th>
                <th>MÀU</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                    <td colSpan="13" className={styles['empty-row']}>Dang tai du lieu...</td>
                </tr>
              )}
              {!isLoading && totalElements === 0 && (
                <tr>
                    <td colSpan="13" className={styles['empty-row']}>Khong co phu tung nao.</td>
                </tr>
              )}
              {!isLoading &&
                paged.map((item, idx) => {
                  const key = buildRowKeyWithIndex(item.itemId, idx);
                  const showPrice = Boolean(item?.showPrice);
                  return (
                    <tr key={String(key)}>
                      <td>{item.itemId ?? '-'}</td>
                      <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.itemName ?? '-'}</td>
                      <td>{item.sku || '-'}</td>
                      <td>{item.brand || '-'}</td>
                      <td>{item.productLine || '-'}</td>
                      <td className={styles['warehouse-cell']}>
                        {renderWarehouseLines(item, (d) => (
                          <span>{getWarehouseDisplayName(d)}</span>
                        ))}
                      </td>
                      <td className={`${styles['warehouse-cell']} ${styles['td-number']}`}>
                        {renderWarehouseLines(item, (d) => {
                          const qty = getWarehouseAvailableQty(d);
                          return <span>{qty == null ? '-' : new Intl.NumberFormat('vi-VN').format(qty)}</span>;
                        })}
                      </td>
                        <td className={`${styles['warehouse-cell']} ${styles['td-number']}`}>
                          {renderWarehouseLines(item, (d) => {
                            const reservedQty = getWarehouseReservedQty(d);
                            return <span>{reservedQty == null ? '-' : new Intl.NumberFormat('vi-VN').format(reservedQty)}</span>;
                          })}
                        </td>
                      <td className={`${styles['warehouse-cell']} ${styles['td-number']}`}>
                        {renderWarehouseLines(item, (d) => {
                          const reservedQty = getWarehouseReservedQty(d);
                          return <span>{reservedQty == null ? '-' : new Intl.NumberFormat('vi-VN').format(reservedQty)}</span>;
                        })}
                      </td>
                      <td className={`${styles['warehouse-cell']} ${styles['td-number']}`}>
                        {renderWarehouseLines(
                          item,
                          (d) => {
                            if (!showPrice) return <span>Liên hệ</span>;
                            const sellingPrice = getWarehouseSellingPrice(d);
                            if (sellingPrice == null) return <span>-</span>;
                            return <span>{formatCurrencyVnd(sellingPrice)} ₫</span>;
                          },
                          formatPrice(item),
                        )}
                      </td>
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
                            Xem chi tiết
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
    </div>
  );
}
