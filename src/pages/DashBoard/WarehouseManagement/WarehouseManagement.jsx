import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { Package, Eye, Pencil, Columns3, Star, Wrench, Layers } from 'lucide-react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import ItemDetailModal from './ItemDetailModal.jsx';
import EditItemModal from './EditItemModal.jsx';
import BulkEditItemsModal from './BulkEditItemsModal.jsx';
import { fetchHomeServiceDetail, fetchHomeProductDetail } from '../../../services/homeService.js';

const getServiceIdFromUnknownShape = (input) => {
  if (!input || typeof input !== 'object') return null;
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey || '').toLowerCase();
    if (key.includes('service') && key.includes('id')) {
      const val = toNullablePositiveNumber(rawValue);
      if (val != null) return val;
    }
  }
  return null;
};

const getServiceServiceId = (item) => {
  if (!item || typeof item !== 'object') return null;
  const candidates = [
    item.service_service_id, item.serviceServiceId, item.service_serviceId, item.serviceServiceID,
    item.serviceId, item.service_id,
    item?.data?.serviceId, item?.data?.service_service_id, item?.data?.serviceServiceId,
    item?.service?.service_service_id, item?.service?.serviceServiceId,
    item?.service?.service_id, item?.serviceInfo?.service_service_id,
    item?.serviceInfo?.serviceServiceId, item?.serviceInfo?.service_id,
  ];
  for (const value of candidates) {
    const parsed = toNullablePositiveNumber(value);
    if (parsed != null) return parsed;
  }
  return getServiceIdFromUnknownShape(item);
};

const ItemTableImage = ({ item }) => {
  const id = item?.itemId ?? item?.id ?? null;
  const initialImg = item?.imageUrl || item?.thumbnailUrl || item?.mediaThumbnail || item?.photoUrl || '';
  const [imgUrl, setImgUrl] = useState(initialImg);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadImg = async () => {
      if (!id) return;
      try {
        const serviceId = getServiceServiceId(item);
        let serviceDetail = null;
        if (serviceId) {
          try {
            const serviceRes = await fetchHomeServiceDetail(serviceId);
            serviceDetail = serviceRes?.data?.data ?? serviceRes?.data ?? serviceRes;
          } catch {
            // ignore
          }
        }
        if (!serviceDetail) {
          try {
            const homeProductRes = await fetchHomeProductDetail(id);
            serviceDetail = homeProductRes?.data?.data ?? homeProductRes?.data ?? homeProductRes;
          } catch {
            // ignore
          }
        }

        if (serviceDetail && !cancelled) {
          let serviceImg = serviceDetail.thumbnailUrl || serviceDetail.mediaThumbnail || serviceDetail.imageUrl;
          if (!serviceImg) {
            const mediaList = serviceDetail.media || serviceDetail.mediaList || [];
            if (Array.isArray(mediaList) && mediaList.length > 0) {
              const firstImgMedia = mediaList.find(m => {
                const url = String(m?.mediaUrl || m?.url || '').trim();
                const type = String(m?.mediaType || m?.type || '').trim().toUpperCase();
                const isVideo = type === 'VIDEO' || /\.(mp4|webm|ogg)$/i.test(url);
                return url && !isVideo;
              });
              if (firstImgMedia) {
                serviceImg = String(firstImgMedia.mediaUrl || firstImgMedia.url).trim();
              }
            }
          }
          if (!serviceImg) {
            const htmlContent = serviceDetail.fullDescription || serviceDetail.descriptionHtml || serviceDetail.description || '';
            const match = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match && match[1]) {
              serviceImg = match[1];
            }
          }
          if (serviceImg) {
            setImgUrl(serviceImg);
          }
        }
      } catch {
        // ignore
      }
    };
    loadImg();
    return () => { cancelled = true; };
  }, [id, item]);

  return (
    <div style={{ position: 'relative', width: '40px', height: '40px', margin: '0 auto' }}>
      {imgUrl && !err ? (
        <img
          src={imgUrl}
          alt={item?.itemName || 'item image'}
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
          onError={() => setErr(true)}
        />
      ) : null}
      {(!imgUrl || err) && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            color: '#94a3b8',
            border: '1px solid #e2e8f0'
          }}
        >
          <Package size={20} />
        </div>
      )}
    </div>
  );
};

import {
  fetchWarehouseInventorySyncTemplate,
  fetchWarehousesAll,
  searchWarehouseCatalogItemsDetail,
  syncWarehouseInventoryExcel,
} from '../../../services/warehouseService.js';

const readStaffRolesFromStorage = () => {
  try {
    const raw = localStorage.getItem('staffRoles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(r => String(r).toUpperCase());
    }
  } catch {
    // ignore
  }
  return [];
};
// ...existing code...
import {
  formatCurrencyVnd,
  getItemColorText,
  getItemOriginText,
} from '../PartManagement/itemFormatters.js';
import styles from './WarehouseManagement.module.css';

const buildRowKeyWithIndex = (baseKey, idx) => `${String(baseKey ?? '')}-${idx}`;
const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
// ...existing code...

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

const ITEM_TYPE_LABELS = { PART: 'Phụ tùng', SERVICE: 'Dịch vụ', PRODUCT: 'Sản phẩm', MACHINERY: 'Máy móc', EQUIPMENT: 'Thiết bị', COMBO: 'Combo', MAINTENANCE_PACKAGE: 'Gói bảo dưỡng' };
const getItemTypeText = (item) => ITEM_TYPE_LABELS[String(item?.itemType || '').toUpperCase()] || item?.itemType || '-';

const renderItemTypeBadge = (item) => {
  const rawType = String(item?.itemType || item?.type || '').toUpperCase();
  const label = getItemTypeText(item);

  let bg = '#f1f5f9';
  let color = '#475569';
  let border = '#e2e8f0';

  if (rawType === 'SERVICE') {
    bg = '#e0f2fe';
    color = '#0369a1';
    border = '#bae6fd';
  } else if (rawType === 'PART' || rawType === 'PRODUCT' || rawType === 'SPARE_PART' || rawType === 'SPAREPART') {
    bg = '#dcfce7';
    color = '#15803d';
    border = '#bbf7d0';
  } else if (rawType === 'COMBO' || rawType === 'COMBO_ITEM' || rawType === 'MAINTENANCE_PACKAGE') {
    bg = '#f3e8ff';
    color = '#6b21a8';
    border = '#e9d5ff';
  } else if (rawType === 'EQUIPMENT' || rawType === 'MACHINERY' || rawType === 'TOOL' || rawType === 'DEVICE') {
    bg = '#fef3c7';
    color = '#b45309';
    border = '#fde68a';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '700',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
      }}
    >
      {label}
    </span>
  );
};
const getWarrantyText = (item) => {
  const months = toFiniteNumber(item?.warrantyDurationMonths ?? item?.warranty_duration_months);
  return months != null ? `${months} tháng` : '-';
};
const truncateText = (value, maxLen = 60) => {
  const text = String(value ?? '').trim();
  if (!text) return '-';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
};

// Column catalog for the "column visibility" picker. `pinned` columns are always shown
// and excluded from the picker; the rest default to the state below but can be toggled
// and resized by the user (persisted to localStorage, see COLUMN_PREFS_KEY).
const TABLE_COLUMNS = [
  { key: 'select', label: '', pinned: true, defaultWidth: 48 },
  { key: 'favorite', label: '★', defaultVisible: false, defaultWidth: 56 },
  { key: 'image', label: 'ẢNH', defaultVisible: true, defaultWidth: 64 },
  { key: 'itemName', label: 'TÊN', defaultVisible: true, defaultWidth: 220 },
  { key: 'sku', label: 'SKU', defaultVisible: true, defaultWidth: 120 },
  { key: 'itemType', label: 'LOẠI', defaultVisible: true, defaultWidth: 110 },
  { key: 'warehouse', label: 'KHO', defaultVisible: true, defaultWidth: 140 },
  { key: 'quantity', label: 'SỐ LƯỢNG', defaultVisible: true, defaultWidth: 110 },
  { key: 'reserved', label: 'KHÁCH GIỮ HÀNG', defaultVisible: false, defaultWidth: 140 },
  { key: 'price', label: 'GIÁ (KHO)', defaultVisible: true, defaultWidth: 130 },
  { key: 'unit', label: 'ĐƠN VỊ', defaultVisible: false, defaultWidth: 90 },
  { key: 'origin', label: 'XUẤT XỨ', defaultVisible: false, defaultWidth: 100 },
  { key: 'color', label: 'MÀU', defaultVisible: false, defaultWidth: 90 },
  { key: 'brand', label: 'HÃNG', defaultVisible: false, defaultWidth: 120 },
  { key: 'productLine', label: 'DÒNG SP', defaultVisible: false, defaultWidth: 130 },
  { key: 'warranty', label: 'BẢO HÀNH', defaultVisible: false, defaultWidth: 110 },
  { key: 'description', label: 'MÔ TẢ', defaultVisible: false, defaultWidth: 240 },
  { key: 'compatibleCars', label: 'XE TƯƠNG THÍCH', defaultVisible: false, defaultWidth: 180 },
  { key: 'barcode', label: 'MÃ VẠCH', defaultVisible: false, defaultWidth: 130 },
  { key: 'actions', label: 'Thao tác', pinned: true, defaultWidth: 100 },
];
const MIN_COLUMN_WIDTH = 50;
const COLUMN_PREFS_KEY = 'gms_warehouse_table_columns_v2';
const REORDERABLE_COLUMN_KEYS = TABLE_COLUMNS.filter((c) => !c.pinned).map((c) => c.key);
// Columns whose value isn't a single per-item scalar (multi-line-per-warehouse, image, actions) can't be sorted.
const UNSORTABLE_COLUMN_KEYS = ['image', 'actions'];

const loadColumnPrefs = () => {
  const visibility = {};
  const widths = {};
  let order = [...REORDERABLE_COLUMN_KEYS];
  TABLE_COLUMNS.forEach((c) => {
    visibility[c.key] = c.pinned ? true : Boolean(c.defaultVisible);
    widths[c.key] = c.defaultWidth;
  });
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(COLUMN_PREFS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        if (parsed.visibility && typeof parsed.visibility === 'object') {
          Object.keys(visibility).forEach((key) => {
            if (typeof parsed.visibility[key] === 'boolean' && !TABLE_COLUMNS.find((c) => c.key === key)?.pinned) {
              visibility[key] = parsed.visibility[key];
            }
          });
        }
        if (parsed.widths && typeof parsed.widths === 'object') {
          Object.keys(widths).forEach((key) => {
            const w = Number(parsed.widths[key]);
            if (Number.isFinite(w) && w >= MIN_COLUMN_WIDTH) widths[key] = w;
          });
        }
        if (Array.isArray(parsed.order)) {
          // Keep only known reorderable keys, then append any new columns that weren't in the saved order yet.
          const savedKnown = parsed.order.filter((key) => REORDERABLE_COLUMN_KEYS.includes(key));
          const missing = REORDERABLE_COLUMN_KEYS.filter((key) => !savedKnown.includes(key));
          order = [...savedKnown, ...missing];
        }
      }
    } catch {
      // Ignore malformed/inaccessible storage.
    }
  }
  return { visibility, widths, order };
};

const saveColumnPrefs = (visibility, widths, order) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify({ visibility, widths, order }));
  } catch {
    // Ignore quota/private mode.
  }
};

const FAVORITE_ITEMS_KEY = 'gms_warehouse_favorite_items_v1';

const loadFavoriteIds = () => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITE_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set();
  }
};

const saveFavoriteIds = (ids) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITE_ITEMS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore quota/private mode.
  }
};

// ...existing code...

// ...existing code...

// ...existing code...



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
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
  const isManagerOrWarehouseManager = useMemo(() => {
    return staffRoles.includes('MANAGER') || staffRoles.includes('WAREHOUSE_MANAGER') || staffRoles.includes('ROLE_MANAGER') || staffRoles.includes('ROLE_WAREHOUSE_MANAGER');
  }, [staffRoles]);

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Column visibility + width + order picker (persisted to localStorage)
  const [columnPrefs, setColumnPrefs] = useState(loadColumnPrefs);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef(null);
  const resizingColumnRef = useRef(null);
  const draggedColumnKeyRef = useRef(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Row selection (checkbox column) + favorite/star marking (persisted to localStorage)
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds);
  const [contextMenu, setContextMenu] = useState(null); // { x, y } | null
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeMenu = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenu(null);
    };
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const closeOnScroll = () => setContextMenu(null);
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('scroll', closeOnScroll, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('scroll', closeOnScroll, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  const toggleRowSelected = (itemId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleRowContextMenu = (item, e) => {
    e.preventDefault();
    if (!selectedRowIds.has(item.itemId)) {
      setSelectedRowIds(new Set([item.itemId]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleFavorite = (itemId) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      saveFavoriteIds(next);
      return next;
    });
  };

  useEffect(() => {
    if (!isColumnPickerOpen) return undefined;
    const handleClickOutside = (e) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target)) {
        setIsColumnPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnPickerOpen]);

  const toggleColumnVisibility = (key) => {
    setColumnPrefs((prev) => {
      const next = { ...prev, visibility: { ...prev.visibility, [key]: !prev.visibility[key] } };
      saveColumnPrefs(next.visibility, next.widths, next.order);
      return next;
    });
  };

  const resetColumnPrefs = () => {
    const fresh = { visibility: {}, widths: {}, order: [...REORDERABLE_COLUMN_KEYS] };
    TABLE_COLUMNS.forEach((c) => {
      fresh.visibility[c.key] = c.pinned ? true : Boolean(c.defaultVisible);
      fresh.widths[c.key] = c.defaultWidth;
    });
    setColumnPrefs(fresh);
    setSortConfig({ key: null, direction: 'asc' });
    saveColumnPrefs(fresh.visibility, fresh.widths, fresh.order);
  };

  const handleColumnResizeStart = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnPrefs.widths[key] ?? TABLE_COLUMNS.find((c) => c.key === key)?.defaultWidth ?? 120;
    resizingColumnRef.current = { key, startX, startWidth };

    const handleMouseMove = (moveEvent) => {
      const current = resizingColumnRef.current;
      if (!current) return;
      const nextWidth = Math.max(MIN_COLUMN_WIDTH, Math.round(current.startWidth + (moveEvent.clientX - current.startX)));
      setColumnPrefs((prev) => ({ ...prev, widths: { ...prev.widths, [current.key]: nextWidth } }));
    };
    const handleMouseUp = () => {
      const current = resizingColumnRef.current;
      resizingColumnRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (current) {
        setColumnPrefs((prev) => {
          saveColumnPrefs(prev.visibility, prev.widths, prev.order);
          return prev;
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag-and-drop column reordering. Only non-pinned columns (STT/Thao tác stay put) can move.
  const handleColumnDragStart = (key, e) => {
    if (TABLE_COLUMNS.find((c) => c.key === key)?.pinned) return;
    draggedColumnKeyRef.current = key;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const handleColumnDragOver = (key, e) => {
    if (!draggedColumnKeyRef.current || TABLE_COLUMNS.find((c) => c.key === key)?.pinned) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnKey !== key) setDragOverColumnKey(key);
  };

  const handleColumnDrop = (targetKey, e) => {
    e.preventDefault();
    const draggedKey = draggedColumnKeyRef.current;
    draggedColumnKeyRef.current = null;
    setDragOverColumnKey(null);
    if (!draggedKey || draggedKey === targetKey) return;
    setColumnPrefs((prev) => {
      const order = prev.order.filter((k) => k !== draggedKey);
      const targetIndex = order.indexOf(targetKey);
      order.splice(targetIndex === -1 ? order.length : targetIndex, 0, draggedKey);
      const next = { ...prev, order };
      saveColumnPrefs(next.visibility, next.widths, next.order);
      return next;
    });
  };

  const handleColumnDragEnd = () => {
    draggedColumnKeyRef.current = null;
    setDragOverColumnKey(null);
  };

  const handleSortClick = (key) => {
    if (UNSORTABLE_COLUMN_KEYS.includes(key)) return;
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setPage(0);
  };

  const visibleColumns = useMemo(() => {
    const selectCol = TABLE_COLUMNS.find((c) => c.key === 'select');
    const actionsCol = TABLE_COLUMNS.find((c) => c.key === 'actions');
    const middle = columnPrefs.order
      .map((key) => TABLE_COLUMNS.find((c) => c.key === key))
      .filter((c) => c && columnPrefs.visibility[c.key]);
    return [selectCol, ...middle, actionsCol].filter(Boolean);
  }, [columnPrefs.order, columnPrefs.visibility]);

  const [items, setItems] = useState([]);
  const [totalElementsServer, setTotalElementsServer] = useState(0);
  const [totalPagesServer, setTotalPagesServer] = useState(1);

  const hasClientOnlyFilters = Boolean(originFilter || colorFilter || itemTypeFilter || sortConfig.key);
  const pageForFetch = hasClientOnlyFilters ? 0 : page;
  const sizeForFetch = hasClientOnlyFilters ? 500 : size;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, originFilter, colorFilter, itemTypeFilter]);

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
        const params = {
          page: pageForFetch,
          size: sizeForFetch,
        };
        // Lấy tất cả trừ SERVICE, COMBO, MAINTENANCE_PACKAGE để gộp Phụ tùng, Máy móc, Thiết bị
        // Nếu API backend chỉ hỗ trợ 1 itemType, chúng ta sẽ phải gọi lấy tất cả và lọc ở client,
        // hoặc backend hỗ trợ không truyền itemType thì trả về tất cả.
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter) params.isActive = statusFilter === 'true' ? 1 : 0;

        const res = await searchWarehouseCatalogItemsDetail(params, token);
        const payload = res?.data ?? res;
        const content = Array.isArray(payload?.content) ? payload.content : [];
        if (cancelled) return;
        setItems(content);
        setSelectedRowIds(new Set());
        setTotalElementsServer(Number(payload?.totalElements ?? content.length));
        setTotalPagesServer(
          Number(payload?.totalPages ?? Math.max(1, Math.ceil((payload?.totalElements ?? content.length) / Math.max(1, sizeForFetch)))),
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
  }, [debouncedSearch, statusFilter, originFilter, colorFilter, refreshKey, pageForFetch, sizeForFetch, selectedWarehouseId]);
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

  const getColumnSortValue = (colKey, item) => {
    const details = getWarehouseDetails(item);
    const scopedDetails = selectedWarehouseId
      ? details.filter((d) => String(d?.warehouseId ?? d?.warehouse_id) === String(selectedWarehouseId))
      : details;
    switch (colKey) {
      case 'favorite': return favoriteIds.has(item.itemId) ? 1 : 0;
      case 'itemName': return item.itemName || '';
      case 'sku': return item.sku || '';
      case 'unit': return item.unit || '';
      case 'origin': return getItemOriginText(item);
      case 'color': return getItemColorText(item);
      case 'brand': return item.brand || '';
      case 'productLine': return item.productLine || '';
      case 'itemType': return getItemTypeText(item);
      case 'warranty': return toFiniteNumber(item.warrantyDurationMonths) ?? -1;
      case 'description': return item.description || '';
      case 'compatibleCars': return item.compatibleCars || '';
      case 'barcode': return item.barcode || '';
      case 'warehouse': return getWarehouseDisplayName(scopedDetails[0] || {});
      case 'quantity': return scopedDetails.reduce((sum, d) => sum + (getWarehouseAvailableQty(d) ?? 0), 0);
      case 'reserved': return scopedDetails.reduce((sum, d) => sum + (getWarehouseReservedQty(d) ?? 0), 0);
      case 'price': return getWarehouseSellingPrice(scopedDetails[0] || {}) ?? toFiniteNumber(item.price) ?? -1;
      default: return '';
    }
  };

  const compareBySort = (a, b, key, direction) => {
    const av = getColumnSortValue(key, a);
    const bv = getColumnSortValue(key, b);
    const result = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av ?? '').localeCompare(String(bv ?? ''), 'vi');
    return direction === 'desc' ? -result : result;
  };

  const filteredItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const filtered = list.filter((item) => {
      const matchesOrigin = !originFilter || getItemOriginText(item) === originFilter;
      const matchesColor = !colorFilter || getItemColorText(item) === colorFilter;
      const matchesItemType = !itemTypeFilter || (() => {
        const raw = String(item?.itemType || item?.type || '').toUpperCase();
        if (itemTypeFilter === 'PART') return raw === 'PART' || raw === 'PRODUCT' || raw === 'SPARE_PART' || raw === 'SPAREPART';
        if (itemTypeFilter === 'COMBO') return raw === 'COMBO' || raw === 'COMBO_ITEM' || raw === 'MAINTENANCE_PACKAGE';
        if (itemTypeFilter === 'EQUIPMENT') return raw === 'EQUIPMENT' || raw === 'MACHINERY' || raw === 'TOOL' || raw === 'DEVICE';
        if (itemTypeFilter === 'SERVICE') return raw === 'SERVICE';
        return raw === itemTypeFilter;
      })();
      return matchesOrigin && matchesColor && matchesItemType;
    });
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => compareBySort(a, b, sortConfig.key, sortConfig.direction));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorFilter, items, originFilter, itemTypeFilter, sortConfig, selectedWarehouseId, favoriteIds]);

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

  const isAllPagedSelected = paged.length > 0 && paged.every((it) => selectedRowIds.has(it.itemId));
  const isSomePagedSelected = !isAllPagedSelected && paged.some((it) => selectedRowIds.has(it.itemId));

  const toggleSelectAllOnPage = () => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (isAllPagedSelected) {
        paged.forEach((it) => next.delete(it.itemId));
      } else {
        paged.forEach((it) => next.add(it.itemId));
      }
      return next;
    });
  };

  const getSelectedItems = () => paged.filter((it) => selectedRowIds.has(it.itemId));

  const buildSelectedExportRows = (selectedItems) => {
    const header = [
      'STT', 'Tên', 'SKU', 'Kho', 'Số lượng', 'Khách giữ hàng', 'Giá (Kho)',
      'Đơn vị', 'Xuất xứ', 'Màu', 'Hãng', 'Dòng SP', 'Loại', 'Bảo hành', 'Mô tả', 'Xe tương thích', 'Mã vạch',
    ];
    const rows = selectedItems.map((item, idx) => {
      const details = getWarehouseDetails(item);
      const warehouseNames = details.map((d) => getWarehouseDisplayName(d)).join(', ') || '-';
      const totalQuantity = details.reduce((sum, d) => sum + (getWarehouseAvailableQty(d) ?? 0), 0);
      const totalReserved = details.reduce((sum, d) => sum + (getWarehouseReservedQty(d) ?? 0), 0);
      const price = getWarehouseSellingPrice(details[0] || {}) ?? toFiniteNumber(item.price) ?? 0;
      return [
        idx + 1,
        item.itemName || '',
        item.sku || '',
        warehouseNames,
        totalQuantity,
        totalReserved,
        price,
        item.unit || '',
        getItemOriginText(item),
        getItemColorText(item),
        item.brand || '',
        item.productLine || '',
        getItemTypeText(item),
        item.warrantyDurationMonths ?? '',
        item.description || '',
        item.compatibleCars || '',
        item.barcode || '',
      ];
    });
    return { header, rows };
  };

  const handleExportSelectedToExcel = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;
    const { header, rows } = buildSelectedExportRows(selectedItems);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'PhuTungDaChon');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phu-tung-da-chon-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setContextMenu(null);
  };

  const escapeCsvCell = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const handleCopySelectedAsCsv = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;
    const { header, rows } = buildSelectedExportRows(selectedItems);
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      toast.success(`Đã sao chép ${selectedItems.length} dòng dạng CSV.`);
    } catch {
      toast.error('Không thể sao chép vào clipboard.');
    }
    setContextMenu(null);
  };

  const handleResetFilters = () => {
    setPage(0);
    setSize(10);
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setOriginFilter('');
    setColorFilter('');
    setItemTypeFilter('');
  };


  const formatPrice = (item) => {
    const price = item?.price;
    return price != null && price !== '' ? `${formatCurrencyVnd(price)} ₫` : 'Liên hệ';
  };

  const renderWarehouseLines = (item, renderLine, emptyContent = '-') => {
    let details = getWarehouseDetails(item);
    if (selectedWarehouseId) {
      details = details.filter(
        (d) => String(d?.warehouseId ?? d?.warehouse_id) === String(selectedWarehouseId)
      );
    }
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

  const renderTableCell = (colKey, item) => {
    switch (colKey) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={selectedRowIds.has(item.itemId)}
            onChange={() => toggleRowSelected(item.itemId)}
            aria-label={`Chọn ${item.itemName || 'dòng'}`}
          />
        );
      case 'favorite': {
        const isFavorite = favoriteIds.has(item.itemId);
        return (
          <button
            type="button"
            className={styles['favorite-btn']}
            onClick={() => toggleFavorite(item.itemId)}
            title={isFavorite ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
          >
            <Star size={16} fill={isFavorite ? '#f59e0b' : 'none'} color="#f59e0b" />
          </button>
        );
      }
      case 'image':
        return <ItemTableImage item={item} />;
      case 'itemName':
        return <span style={{ fontWeight: 500 }}>{item.itemName ?? '-'}</span>;
      case 'sku':
        return <span title={item.sku}>{item.sku || '-'}</span>;
      case 'warehouse':
        return renderWarehouseLines(item, (d) => <span>{getWarehouseDisplayName(d)}</span>);
      case 'quantity':
        return renderWarehouseLines(item, (d) => {
          const qty = getWarehouseAvailableQty(d);
          return <span>{qty == null ? '-' : new Intl.NumberFormat('vi-VN').format(qty)}</span>;
        });
      case 'reserved':
        return renderWarehouseLines(item, (d) => {
          const reservedQty = getWarehouseReservedQty(d);
          return <span>{reservedQty == null ? '-' : new Intl.NumberFormat('vi-VN').format(reservedQty)}</span>;
        });
      case 'price':
        return renderWarehouseLines(
          item,
          (d) => {
            const sellingPrice = getWarehouseSellingPrice(d);
            return <span>{formatCurrencyVnd(sellingPrice)} ₫</span>;
          },
          formatPrice(item),
        );
      case 'unit':
        return item.unit || '-';
      case 'origin':
        return getItemOriginText(item);
      case 'color':
        return getItemColorText(item);
      case 'brand':
        return item.brand || '-';
      case 'productLine':
        return item.productLine || '-';
      case 'itemType':
        return renderItemTypeBadge(item);
      case 'warranty':
        return getWarrantyText(item);
      case 'description':
        return <span title={item.description || ''}>{truncateText(item.description)}</span>;
      case 'compatibleCars':
        return item.compatibleCars || '-';
      case 'barcode':
        return item.barcode || '-';
      case 'actions':
        return (
          <div className={styles['action-buttons']} style={{ justifyContent: 'center', gap: '6px' }}>
            <button
              className={`${styles['action-btn']} ${styles['view-btn']}`}
              onClick={() => setSelectedItem(item)}
              title="Xem chi tiết"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0 }}
            >
              <Eye size={16} />
            </button>
            {isManagerOrWarehouseManager && (
              <button
                className={`${styles['action-btn']} ${styles['edit-btn']}`}
                onClick={() => setEditingItem(item)}
                title="Sửa danh mục"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0 }}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
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
      <div className={styles['pending-filters']}>
        <div className={styles['pending-filters-title-row']}>
          <div className={styles['service-header-title']}>
            <span className={styles['header-icon']}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.1a5.3 5.3 0 0 0-6.9 6.9l-4.2 4.2a1.6 1.6 0 0 0 2.3 2.3l4.2-4.2a5.3 5.3 0 0 0 6.9-6.9l-2.4 2.4-2.9-.7-.7-2.9 2.4-2.4Z" />
              </svg>
            </span>
            <h1>Quản lý kho</h1>
          </div>
          <div className={styles['footer-right-group']}>
            <button
              type="button"
              className={styles['primary-button']}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                borderColor: '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
              }}
              onClick={() => navigate('/part-management/create-product')}
            >
              <Package size={16} />
              <span>Thêm phụ tùng</span>
            </button>
            <button
              type="button"
              className={styles['primary-button']}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                borderColor: '#0369a1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
              onClick={() => navigate('/service-management/create-service')}
            >
              <Wrench size={16} />
              <span>Thêm dịch vụ</span>
            </button>
            <button
              type="button"
              className={styles['primary-button']}
              style={{
                background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                borderColor: '#7e22ce',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(147, 51, 234, 0.25)',
              }}
              onClick={() => navigate('/combo-management/create-combo')}
            >
              <Layers size={16} />
              <span>Thêm combo</span>
            </button>
            <span className={styles['total-count']}>{totalElements} mục</span>
          </div>
        </div>
        <div className={styles['filter-card-controls']}>
          <div className={styles['field']}>
            <label htmlFor="filter-item-type">Phân loại</label>
            <select
              id="filter-item-type"
              className={styles['status-filter']}
              value={itemTypeFilter}
              onChange={(e) => {
                setItemTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả loại</option>
              <option value="SERVICE">Dịch vụ</option>
              <option value="PART">Phụ tùng</option>
              <option value="COMBO">Combo</option>
              <option value="EQUIPMENT">Thiết bị</option>
            </select>
          </div>
          <div className={styles['field']}>
            <label htmlFor="filter-status">Trạng thái</label>
            <select
              id="filter-status"
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
          </div>
          <div className={styles['field']}>
            <label htmlFor="filter-origin">Xuất xứ</label>
            <select
              id="filter-origin"
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
          </div>
          <div className={styles['field']}>
            <label htmlFor="filter-color">Màu</label>
            <select
              id="filter-color"
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
          </div>
          <div className={styles['field']}>
            <label htmlFor="filter-warehouse">Kho</label>
            <select
              id="filter-warehouse"
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
          </div>
        </div>

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

          <button
            type="button"
            className={styles['ghost-button']}
            onClick={selectedRowIds.size > 0 ? handleExportSelectedToExcel : handleDownloadTemplate}
            disabled={isDownloadingTemplate || isSyncingExcel}
            title={selectedRowIds.size > 0 ? 'Xuất các dòng đã chọn ra file Excel' : 'Xuất file mẫu Excel theo kho'}
          >
            {isDownloadingTemplate
              ? 'Đang tải mẫu...'
              : selectedRowIds.size > 0
                ? `Xuất Excel đã chọn (${selectedRowIds.size})`
                : 'Xuất file Excel'}
          </button>

          <button
            type="button"
            className={styles['primary-button']}
            onClick={() => navigate('/warehouse-excel-import')}
            disabled={isDownloadingTemplate}
            title="Nhập kho bằng file Excel"
          >
            Nhập file Excel
          </button>

          <div className={styles['column-picker']} ref={columnPickerRef}>
            <button
              type="button"
              className={styles['column-picker-btn']}
              onClick={() => setIsColumnPickerOpen((prev) => !prev)}
              title="Chọn cột hiển thị"
            >
              <Columns3 size={16} />
              Cột hiển thị
            </button>
            {isColumnPickerOpen && (
              <div className={styles['column-picker-panel']}>
                <div className={styles['column-picker-panel__header']}>
                  <span>Chọn cột hiển thị</span>
                  <button type="button" className={styles['column-picker-reset']} onClick={resetColumnPrefs}>
                    Mặc định
                  </button>
                </div>
                {TABLE_COLUMNS.filter((c) => !c.pinned).map((c) => (
                  <label key={c.key} className={styles['column-picker-item']}>
                    <input
                      type="checkbox"
                      checked={Boolean(columnPrefs.visibility[c.key])}
                      onChange={() => toggleColumnVisibility(c.key)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>

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
          <table className={styles['service-table']} style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {visibleColumns.map((c) => (
                <col key={c.key} style={{ width: `${columnPrefs.widths[c.key] ?? c.defaultWidth}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {visibleColumns.map((c) => {
                  const isLeftAligned = ['itemName', 'sku', 'description', 'compatibleCars'].includes(c.key);
                  const isSortable = !c.pinned && !UNSORTABLE_COLUMN_KEYS.includes(c.key);
                  const isSorted = sortConfig.key === c.key;
                  return (
                    <th
                      key={c.key}
                      className={[
                        styles['resizable-th'],
                        isLeftAligned && styles['td-left'],
                        dragOverColumnKey === c.key && styles['th-drag-over'],
                      ].filter(Boolean).join(' ')}
                      draggable={!c.pinned}
                      onDragStart={(e) => handleColumnDragStart(c.key, e)}
                      onDragOver={(e) => handleColumnDragOver(c.key, e)}
                      onDrop={(e) => handleColumnDrop(c.key, e)}
                      onDragEnd={handleColumnDragEnd}
                    >
                      {c.key === 'select' ? (
                        <input
                          type="checkbox"
                          checked={isAllPagedSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomePagedSelected;
                          }}
                          onChange={toggleSelectAllOnPage}
                          aria-label="Chọn tất cả"
                        />
                      ) : (
                        <span
                          className={isSortable ? styles['th-label-sortable'] : undefined}
                          onClick={isSortable ? () => handleSortClick(c.key) : undefined}
                          title={isSortable ? 'Kéo để đổi vị trí cột, bấm để sắp xếp' : undefined}
                        >
                          {c.key === 'favorite' ? <span style={{ color: '#b45309' }}>{c.label}</span> : c.label}
                          {isSorted && <span className={styles['sort-arrow']}>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>}
                        </span>
                      )}
                      <span
                        className={styles['resize-handle']}
                        draggable={false}
                        onMouseDown={(e) => handleColumnResizeStart(c.key, e)}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                    <td colSpan={visibleColumns.length} className={styles['empty-row']}>Đang tải dữ liệu...</td>
                </tr>
              )}
              {!isLoading && totalElements === 0 && (
                <tr>
                    <td colSpan={visibleColumns.length} className={styles['empty-row']}>Không có phụ tùng nào.</td>
                </tr>
              )}
              {!isLoading &&
                paged.map((item, idx) => {
                  const key = buildRowKeyWithIndex(item.itemId, idx);
                  return (
                    <tr
                      key={String(key)}
                      className={selectedRowIds.has(item.itemId) ? styles['row-selected'] : undefined}
                      onContextMenu={(e) => handleRowContextMenu(item, e)}
                    >
                      {visibleColumns.map((c) => {
                        const isWarehouseCell = ['warehouse', 'quantity', 'reserved', 'price'].includes(c.key);
                        const isNumberCell = ['quantity', 'reserved', 'price'].includes(c.key);
                        const isLeftAligned = ['itemName', 'sku', 'description', 'compatibleCars'].includes(c.key);
                        const cellClassName = [
                          isWarehouseCell && styles['warehouse-cell'],
                          isNumberCell && styles['td-number'],
                          isLeftAligned && styles['td-left'],
                          c.key === 'sku' && styles['td-ellipsis'],
                          ['image', 'select', 'favorite'].includes(c.key) && styles['td-compact'],
                        ].filter(Boolean).join(' ') || undefined;
                        return (
                          <td key={c.key} className={cellClassName}>
                            {renderTableCell(c.key, item)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className={styles['mobile-cards']}>
          {isLoading && (
            <div className={styles['empty-row']}>Đang tải dữ liệu...</div>
          )}
          {!isLoading && totalElements === 0 && (
            <div className={styles['empty-row']}>Không có phụ tùng nào.</div>
          )}
          {!isLoading &&
            paged.map((item, idx) => {
              const displayIndex = safePage * size + idx + 1;
              let details = getWarehouseDetails(item);
              if (selectedWarehouseId) {
                details = details.filter(
                  (d) => String(d?.warehouseId ?? d?.warehouse_id) === String(selectedWarehouseId)
                );
              }
              return (
                <div key={item.itemId ?? idx} className={styles['mobile-card']}>
                  <div className={styles['mobile-card__header']}>
                    <span className={styles['mobile-card__index']}>#{displayIndex}</span>
                    <span className={styles['mobile-card__sku']}>{item.sku || 'Không có SKU'}</span>
                  </div>

                  <h3 className={styles['mobile-card__title']}>{item.itemName ?? '-'}</h3>

                  <div className={styles['mobile-card__specs']}>
                    <span className={styles['spec-badge']}>ĐVT: {item.unit || '-'}</span>
                    <span className={styles['spec-badge']}>Xuất xứ: {getItemOriginText(item)}</span>
                    {getItemColorText(item) !== '-' && (
                      <span className={styles['spec-badge']}>Màu: {getItemColorText(item)}</span>
                    )}
                  </div>

                  <div className={styles['mobile-card__warehouses']}>
                    <h4 className={styles['warehouses-title']}>Chi tiết tồn kho:</h4>
                    {details.length === 0 ? (
                      <div className={styles['warehouse-empty']}>Không có thông tin kho</div>
                    ) : (
                      details.map((d, i) => {
                        const qty = getWarehouseAvailableQty(d);
                        const reservedQty = getWarehouseReservedQty(d);
                        const sellingPrice = getWarehouseSellingPrice(d);
                        return (
                          <div key={i} className={styles['warehouse-row']}>
                            <div className={styles['warehouse-row__name']}>
                              {getWarehouseDisplayName(d)}
                            </div>
                            <div className={styles['warehouse-row__info']}>
                              <span>Tồn: <strong>{qty == null ? '-' : new Intl.NumberFormat('vi-VN').format(qty)}</strong></span>
                              <span>Giữ: <strong>{reservedQty == null ? '-' : new Intl.NumberFormat('vi-VN').format(reservedQty)}</strong></span>
                              <span>Giá: <strong className={styles['warehouse-row__price']}>{sellingPrice == null ? 'Liên hệ' : `${formatCurrencyVnd(sellingPrice)} ₫`}</strong></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className={styles['mobile-card__actions']}>
                    <button
                      className={`${styles['action-btn']} ${styles['view-btn']}`}
                      onClick={() => setSelectedItem(item)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Eye size={15} /> Xem chi tiết
                    </button>
                    {isManagerOrWarehouseManager && (
                      <button
                        className={`${styles['action-btn']} ${styles['edit-btn']}`}
                        onClick={() => setEditingItem(item)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Pencil size={15} /> Sửa danh mục
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <div className={styles['service-footer']}>
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
          <div className={styles['page-size']}>
            <span>Hiển thị:</span>
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
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={styles['context-menu']}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className={styles['context-menu__header']}>{selectedRowIds.size} dòng đã chọn</div>
          <button type="button" className={styles['context-menu__item']} onClick={handleExportSelectedToExcel}>
            Xuất Excel
          </button>
          <button type="button" className={styles['context-menu__item']} onClick={handleCopySelectedAsCsv}>
            Sao chép dạng CSV
          </button>
          {isManagerOrWarehouseManager && (
            <button
              type="button"
              className={styles['context-menu__item']}
              onClick={() => {
                setIsBulkEditOpen(true);
                setContextMenu(null);
              }}
            >
              Sửa hàng loạt
            </button>
          )}
        </div>
      )}

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      {isBulkEditOpen && (
        <BulkEditItemsModal
          items={getSelectedItems()}
          onClose={() => setIsBulkEditOpen(false)}
          onSaved={() => {
            setIsBulkEditOpen(false);
            setSelectedRowIds(new Set());
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
