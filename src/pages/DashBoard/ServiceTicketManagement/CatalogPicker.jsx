import { Fragment, useEffect, useState, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Package, Columns3 } from 'lucide-react';
import styles from './CatalogPicker.module.css';
import {
  searchWarehouseCatalogItemsDetail,
  fetchWarehouseBrands,
  fetchWarehouseProductLines,
  fetchWarehouseItemCategories,
} from '../../../services/warehouseService.js';
import { fetchHomeServiceDetail, fetchHomeProductDetail } from '../../../services/homeService.js';
import ItemDetailModal from '../WarehouseManagement/ItemDetailModal.jsx';
import { formatCurrencyVnd, toIdOrNull } from './useAdvisorItemsTableHandlers.js';

const TABLE_COLUMNS = [
  { key: 'select', label: 'CHỌN', pinned: true, defaultWidth: 130 },
  { key: 'image', label: 'ẢNH', defaultVisible: true, defaultWidth: 64 },
  { key: 'itemName', label: 'TÊN SẢN PHẨM', defaultVisible: true, defaultWidth: 220 },
  { key: 'sku', label: 'SKU', defaultVisible: true, defaultWidth: 120 },
  { key: 'itemType', label: 'LOẠI', defaultVisible: true, defaultWidth: 110 },
  { key: 'brand', label: 'HÃNG', defaultVisible: true, defaultWidth: 120 },
  { key: 'color', label: 'MÀU SẮC', defaultVisible: true, defaultWidth: 90 },
  { key: 'origin', label: 'XUẤT XỨ', defaultVisible: true, defaultWidth: 100 },
  { key: 'price', label: 'GIÁ', defaultVisible: true, defaultWidth: 130 },
  { key: 'unit', label: 'ĐƠN VỊ', defaultVisible: true, defaultWidth: 80 },
  { key: 'productLine', label: 'DÒNG SP', defaultVisible: false, defaultWidth: 130 },
  { key: 'description', label: 'MÔ TẢ', defaultVisible: false, defaultWidth: 200 },
  { key: 'compatibleCars', label: 'XE TƯƠNG THÍCH', defaultVisible: false, defaultWidth: 160 },
];
const MIN_COLUMN_WIDTH = 50;
const COLUMN_PREFS_KEY = 'gms_catalog_picker_columns_v2';
const REORDERABLE_COLUMN_KEYS = TABLE_COLUMNS.filter((c) => !c.pinned).map((c) => c.key);

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
          const savedKnown = parsed.order.filter((key) => REORDERABLE_COLUMN_KEYS.includes(key));
          const missing = REORDERABLE_COLUMN_KEYS.filter((key) => !savedKnown.includes(key));
          order = [...savedKnown, ...missing];
        }
      }
    } catch {
      // Ignore
    }
  }
  return { visibility, widths, order };
};

const saveColumnPrefs = (visibility, widths, order) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify({ visibility, widths, order }));
  } catch {
    // Ignore
  }
};

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNullablePositiveNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function getServiceIdFromUnknownShape(input) {
  if (!input || typeof input !== 'object') return null;
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey || '').toLowerCase();
    if (key.includes('service') && key.includes('id')) {
      const val = toNullablePositiveNumber(rawValue);
      if (val != null) return val;
    }
  }
  return null;
}

function getServiceServiceId(item) {
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
}

function ItemTableImage({ item }) {
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
              const firstImgMedia = mediaList.find((m) => {
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
            border: '1px solid #e2e8f0',
          }}
        >
          <Package size={20} />
        </div>
      )}
    </div>
  );
}

const ITEM_TYPE_LABELS = { PART: 'Phụ tùng', SERVICE: 'Dịch vụ', PRODUCT: 'Sản phẩm', MACHINERY: 'Máy móc', EQUIPMENT: 'Thiết bị', COMBO: 'Combo', MAINTENANCE_PACKAGE: 'Gói bảo dưỡng' };
function getItemTypeText(item) {
  return ITEM_TYPE_LABELS[String(item?.itemType || '').toUpperCase()] || item?.itemType || '-';
}

function renderItemTypeBadge(item) {
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
}

function getWarehouseDisplayName(detail) {
  return String(detail?.warehouseName || detail?.warehouseCode || detail?.warehouseId || '').trim() || '-';
}

function getWarehouseAvailableQty(detail) {
  // Remaining quantity should prefer `availableStockLevel` (API-calculated).
  const availableStockLevel = toFiniteNumber(
    detail?.availableStockLevel
    ?? detail?.available_stock_level
    ?? detail?.availableStock
    ?? detail?.available_stock,
  );
  if (availableStockLevel != null) return availableStockLevel;

  const qty = toFiniteNumber(detail?.quantity ?? detail?.stockQuantity ?? detail?.stock_quantity);
  if (qty != null) return qty;

  const availableQty = toFiniteNumber(detail?.availableQuantity ?? detail?.available_quantity);
  if (availableQty != null) return availableQty;

  return null;
}

function isOutOfStock(detail) {
  const qty = toFiniteNumber(getWarehouseAvailableQty(detail));
  return qty != null && qty <= 0;
}

function buildPickedCatalogItem(item, warehouseDetail, selectedLot) {
  if (!warehouseDetail) return item;
  const sellingPrice = selectedLot ? selectedLot?.sellingPrice : warehouseDetail?.sellingPrice;
  const nextPrice = sellingPrice ?? item?.price ?? item?.unitPrice;
  const availableQuantity = selectedLot
    ? selectedLot?.remainingQuantity
    : getWarehouseAvailableQty(warehouseDetail);

  return {
    ...item,
    warehouseId: warehouseDetail?.warehouseId,
    selectedWarehouse: warehouseDetail,
    sellingPrice,
    price: nextPrice,
    unitPrice: nextPrice,
    availableQuantity,
    entryItemId: selectedLot ? selectedLot?.entryItemId : null,
    entryCode: selectedLot ? selectedLot?.entryCode : null,
  };
}

function CatalogPicker({
  open,
  onClose,
  onPick,
  existingSelectionKeys,
  excludeSelectionKey,
  initialSearch = '',
  initialPage = 0,
  pageSize = 10,
  initQuery = '',
  categoryCode = '',
  vehicleBrand = '',
  vehicleModel = '',
  initialItemType = '',
}) {
  const dialogRef = useRef(null); // Tạo ref để điều khiển thẻ dialog

  const isItemCompatible = (item) => {
    if (!vehicleBrand && !vehicleModel) return false;
    const comp = String(item?.compatibleCars || '').trim();
    if (!comp) return true; // Empty/universal compatibility

    const compLower = comp.toLowerCase();
    if (vehicleBrand) {
      const brandLower = vehicleBrand.toLowerCase().trim();
      if (compLower.includes(brandLower)) return true;
    }
    if (vehicleModel) {
      const modelLower = vehicleModel.toLowerCase().trim();
      if (compLower.includes(modelLower)) return true;

      const firstWord = modelLower.split(/\s+/)[0];
      if (firstWord && compLower.includes(firstWord)) return true;
    }
    return false;
  };

  const [search, setSearch] = useState(initialSearch || initQuery);
  const [page, setPage] = useState(() => {
    const parsed = Number(initialPage);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  });
  const [size] = useState(() => {
    const parsed = Number(pageSize);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 10;
  });
  const [results, setResults] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Per-item selected warehouse for pricing display.
  const [selectedWarehouseByItemId, setSelectedWarehouseByItemId] = useState({});

  // Dynamic options loaded from API
  const [brandOptions, setBrandOptions] = useState([]);
  const [productLineOptions, setProductLineOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Filter values
  const [brandId, setBrandId] = useState('');
  const [productLineId, setProductLineId] = useState('');
  const [categoryCodeFilter, setCategoryCodeFilter] = useState(categoryCode || '');
  const [itemType, setItemType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [filterCompatible, setFilterCompatible] = useState(false);
  const [showFilters, setShowFilters] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.innerWidth > 768;
    } catch {
      return false;
    }
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (itemType) count++;
    if (brandId) count++;
    if (productLineId) count++;
    if (categoryCodeFilter) count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (sortBy) count++;
    return count;
  }, [itemType, brandId, productLineId, categoryCodeFilter, minPrice, maxPrice, sortBy]);

  // Selected item detail modal
  const [detailItem, setDetailItem] = useState(null);

  // Column preferences, resizing, reordering, and visibility
  const [columnPrefs, setColumnPrefs] = useState(loadColumnPrefs);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef(null);
  const resizingColumnRef = useRef(null);
  const draggedColumnKeyRef = useRef(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState(null);

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

  const visibleColumns = useMemo(() => {
    const selectCol = TABLE_COLUMNS.find((c) => c.key === 'select');
    const middle = columnPrefs.order
      .map((key) => TABLE_COLUMNS.find((c) => c.key === key))
      .filter((c) => c && columnPrefs.visibility[c.key]);
    return [selectCol, ...middle].filter(Boolean);
  }, [columnPrefs.order, columnPrefs.visibility]);

  // Auto-select warehouse if an item belongs to exactly one warehouse
  useEffect(() => {
    if (results && results.length > 0) {
      setSelectedWarehouseByItemId((prev) => {
        let changed = false;
        const next = { ...prev };
        results.forEach((it) => {
          const itemKey = String(it?.itemId ?? it?.id ?? '');
          if (itemKey && next[itemKey] === undefined) {
            const details = Array.isArray(it?.warehouseDetails) ? it.warehouseDetails : [];
            if (details.length === 1) {
              const singleDetail = details[0];
              const qty = toFiniteNumber(getWarehouseAvailableQty(singleDetail));
              const outOfStock = qty != null && qty <= 0;
              if (!outOfStock && singleDetail?.warehouseId != null) {
                next[itemKey] = String(singleDetail.warehouseId);
                changed = true;
              }
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [results]);

  // Mỗi lần mở modal: reset lại lựa chọn kho & bộ lọc (không giữ state lần trước).
  useEffect(() => {
    if (open) {
      setSelectedWarehouseByItemId({});
      setBrandId('');
      setProductLineId('');
      setCategoryCodeFilter(categoryCode || '');
      setItemType(initialItemType || '');
      setMinPrice('');
      setMaxPrice('');
      setSortBy('');
      setFilterCompatible(false);
      try {
        setShowFilters(typeof window !== 'undefined' && window.innerWidth > 768);
      } catch {
        setShowFilters(false);
      }
    }
  }, [open, categoryCode, initialItemType]);

  // Effect này bắt sự kiện khi prop 'open' thay đổi để mở/đóng Modal chính giữa màn hình
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      const isDemoMode = typeof window !== 'undefined' && window.location.pathname.includes('/demo');
      if (isDemoMode) {
        dialog.show();
      } else {
        dialog.showModal(); // Hàm này giúp Modal ra giữa màn hình và khóa nền
      }
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Khi mở dialog, nếu initQuery khác rỗng và khác search hiện tại thì setSearch(initQuery)
  useEffect(() => {
    if (open && initQuery && search !== initQuery) {
      setSearch(initQuery);
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initQuery]);

  // Tải danh mục hãng, dòng sản phẩm, nhóm hàng hỗ trợ bộ lọc
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setOptionsLoading(true);
        const token = localStorage.getItem('authToken');
        const [brandRes, lineRes, catRes] = await Promise.all([
          fetchWarehouseBrands(token),
          fetchWarehouseProductLines(token),
          fetchWarehouseItemCategories(token),
        ]);

        if (cancelled) return;

        const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

        const rawBrands = extractPayload(brandRes) || [];
        const rawLines = extractPayload(lineRes) || [];
        const rawCategories = extractPayload(catRes) || [];

        setBrandOptions(
          rawBrands
            .map((it) => ({
              brandId: it.brandId ?? it.id ?? null,
              brandName: it.brandName ?? it.name ?? '',
            }))
            .filter((b) => b.brandId && b.brandName)
        );

        setProductLineOptions(
          rawLines
            .map((it) => ({
              productLineId: it.productLineId ?? it.id ?? null,
              brandId: it.brandId ?? it.brandID ?? it.brand?.brandId ?? null,
              lineName: it.lineName ?? it.name ?? '',
            }))
            .filter((l) => l.productLineId && l.lineName)
        );

        setCategoryOptions(
          rawCategories
            .map((it) => ({
              itemCategoryId: it.itemCategoryId ?? it.workCategoryId ?? it.workCateId ?? it.id ?? null,
              categoryCode: it.categoryCode ?? it.code ?? '',
              categoryName: it.categoryName ?? it.name ?? '',
            }))
            .filter((c) => c.categoryCode && c.categoryName)
        );
      } catch (err) {
        console.error('Không thể tải các bộ lọc danh mục:', err);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Xử lý khi thay đổi Hãng sản xuất
  const handleBrandChange = (e) => {
    const nextBrandId = e.target.value;
    setBrandId(nextBrandId);

    // Clear dòng sản phẩm nếu dòng hiện tại không thuộc về hãng sản xuất mới
    if (nextBrandId && productLineId) {
      const currentLine = productLineOptions.find((l) => String(l.productLineId) === String(productLineId));
      if (currentLine && String(currentLine.brandId) !== String(nextBrandId)) {
        setProductLineId('');
      }
    }
    setPage(0);
  };

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');

        // Tạo params tìm kiếm chi tiết dựa trên state bộ lọc hiện tại
        const params = { page, size };
        if (search) params.search = search;
        if (itemType) params.itemType = itemType;
        if (brandId) params.brand = brandId;
        if (productLineId) params.productLine = productLineId;
        if (categoryCodeFilter) params.categoryCode = categoryCodeFilter;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (sortBy) params.sortBy = sortBy;

        if (filterCompatible) {
          if (vehicleBrand) params.vehicleBrand = vehicleBrand;
          if (vehicleModel) params.vehicleModel = vehicleModel;
        }

        const res = await searchWarehouseCatalogItemsDetail(params, token);
        // New API returns: { success, ..., data: { content, totalElements, ... } }
        // Keep backward-compat: if data wrapper is absent, use response directly.
        const envelope = res?.data ?? res;
        const payload = envelope?.data ?? envelope;
        let content = [];
        if (Array.isArray(payload?.content)) content = payload.content;
        else if (Array.isArray(payload)) content = payload;
        if (cancelled) return;

        // If sortBy is empty (default), sort locally to prioritize compatible items.
        if (!sortBy && (vehicleBrand || vehicleModel)) {
          content = [...content].sort((a, b) => {
            const aComp = isItemCompatible(a) ? 1 : 0;
            const bComp = isItemCompatible(b) ? 1 : 0;
            return bComp - aComp;
          });
        }

        setResults(content);
        setTotalElements(Number(payload?.totalElements ?? content.length));
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setTotalElements(0);
        setError(err?.message || 'Không thể tải danh mục sản phẩm.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, page, size, search, categoryCodeFilter, itemType, brandId, productLineId, minPrice, maxPrice, sortBy, filterCompatible, vehicleBrand, vehicleModel]);

  const handlePick = (item, warehouseDetail) => {
    onPick?.(item, warehouseDetail);
  };

  const handleWarehouseChange = (item, warehouseIdRaw) => {
    const itemId = item?.itemId ?? item?.id ?? null;
    const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
    const warehouseIdNum = typeof warehouseIdRaw === 'number' ? warehouseIdRaw : Number(warehouseIdRaw);
    const selectedDetail = details.find((d) => Number(d?.warehouseId) === warehouseIdNum) || null;

    // Không cho trỏ tới kho đã hết hàng.
    if (selectedDetail && isOutOfStock(selectedDetail)) return;

    if (itemId != null) {
      const itemKey = String(itemId);
      setSelectedWarehouseByItemId((prev) => ({
        ...prev,
        [itemKey]: Number.isFinite(warehouseIdNum) ? warehouseIdNum : warehouseIdRaw,
      }));
    }
  };

  const handlePickItem = (item) => {
    const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
    if (details.length === 0) {
      handlePick(item, null);
      return;
    }

    const itemKey = String(item?.itemId ?? item?.id ?? '');
    const selectedWarehouseIdRaw = selectedWarehouseByItemId[itemKey];
    const selectedWarehouseIdNum = typeof selectedWarehouseIdRaw === 'number'
      ? selectedWarehouseIdRaw
      : Number(selectedWarehouseIdRaw);
    const selectedDetail = details.find((d) => Number(d?.warehouseId) === selectedWarehouseIdNum) || null;
    if (!selectedDetail || isOutOfStock(selectedDetail)) return;

    handlePick(item, selectedDetail);
  };

  // Chỉ render dialog khi `open` = true để tránh reflow/jitter khi không hiển thị
  if (!open) return null;

  return (
    <dialog
      ref={dialogRef} // Gắn ref vào đây
      className={styles.catalogPickerDialog}
      aria-labelledby="catalog-picker-title"
      onCancel={(e) => {
        // Ngăn ESC đóng modal; chỉ đóng qua nút 'Đóng' hoặc '×'
        e.preventDefault();
      }}
    >
      <div className={styles.modalHeader}>
        <h3 id="catalog-picker-title" className={styles.modalTitle}>Chọn sản phẩm từ danh mục</h3>
        <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Đóng">×</button>
      </div>
      <div className={styles.modalBody}>
        <div className={styles.filterSection}>
          {!isMobile ? (
            <div className={styles.searchRow}>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => setPage(0)} disabled={loading}>
                Tìm kiếm
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--ghost"
                onClick={() => {
                  setSearch('');
                  setItemType('');
                  setBrandId('');
                  setProductLineId('');
                  setCategoryCodeFilter(categoryCode || '');
                  setMinPrice('');
                  setMaxPrice('');
                  setSortBy('');
                  setPage(0);
                }}
                disabled={loading || optionsLoading}
              >
                Đặt lại
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--ghost"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Ẩn bộ lọc ▲' : 'Bộ lọc ▼'}
              </button>
              <div className={styles.columnPicker} ref={columnPickerRef}>
                <button
                  type="button"
                  className={styles.columnPickerBtn}
                  onClick={() => setIsColumnPickerOpen((prev) => !prev)}
                  title="Chọn cột hiển thị"
                >
                  <Columns3 size={16} className={styles.columnPickerIcon} />
                  <span>Cột hiển thị</span>
                  <span className={styles.columnPickerCountBadge}>
                    {visibleColumns.length - 1}/{TABLE_COLUMNS.length - 1}
                  </span>
                </button>
                {isColumnPickerOpen && (
                  <div className={styles.columnPickerPanel}>
                    <div className={styles.columnPickerPanelHeader}>
                      <span className={styles.columnPickerPanelTitle}>CỘT HIỂN THỊ</span>
                      <button type="button" className={styles.columnPickerReset} onClick={resetColumnPrefs}>
                        Mặc định
                      </button>
                    </div>
                    <div className={styles.columnPickerList}>
                      {TABLE_COLUMNS.filter((c) => !c.pinned).map((c) => {
                        const isChecked = Boolean(columnPrefs.visibility[c.key]);
                        return (
                          <label key={c.key} className={`${styles.columnPickerItem} ${isChecked ? styles.columnPickerItemActive : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleColumnVisibility(c.key)}
                              className={styles.columnCheckbox}
                            />
                            <span className={styles.columnItemLabel}>{c.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.mobileFilterToggleRow}>
              <input
                type="text"
                placeholder="Tìm kiếm tên, SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className={styles.searchBarMobile}
              />
              <button
                type="button"
                className={`${styles.filterToggleBtn} ${showFilters ? styles.filterToggleBtnActive : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                Bộ lọc
                {activeFiltersCount > 0 && (
                  <span className={styles.filterBadge}>{activeFiltersCount}</span>
                )}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--ghost"
                style={{ padding: '8px 10px', height: '38px' }}
                onClick={() => {
                  setSearch('');
                  setItemType('');
                  setBrandId('');
                  setProductLineId('');
                  setCategoryCodeFilter(categoryCode || '');
                  setMinPrice('');
                  setMaxPrice('');
                  setSortBy('');
                  setPage(0);
                }}
                disabled={loading || optionsLoading}
              >
                Đặt lại
              </button>
            </div>
          )}

          {(!isMobile && showFilters) && (
            <div className={styles.filterGrid}>
              {/* Phân loại */}
              <div className={styles.filterGroup}>
                <label>Phân loại</label>
                <select
                  value={itemType}
                  onChange={(e) => {
                    setItemType(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">-- Tất cả phân loại --</option>
                  <option value="PART">Phụ tùng / Sản phẩm</option>
                  <option value="SERVICE">Dịch vụ</option>
                  <option value="MACHINERY">Máy móc</option>
                  <option value="EQUIPMENT">Thiết bị</option>
                  <option value="COMBO">Combo</option>
                  <option value="MAINTENANCE_PACKAGE">Gói bảo dưỡng</option>
                </select>
              </div>

              {/* Hãng sản xuất */}
              <div className={styles.filterGroup}>
                <label>Hãng sản xuất</label>
                <select
                  value={brandId}
                  onChange={handleBrandChange}
                  disabled={optionsLoading}
                >
                  <option value="">-- Tất cả hãng --</option>
                  {brandOptions.map((b) => (
                    <option key={String(b.brandId)} value={String(b.brandId)}>
                      {b.brandName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dòng sản phẩm */}
              <div className={styles.filterGroup}>
                <label>Dòng sản phẩm</label>
                <select
                  value={productLineId}
                  onChange={(e) => {
                    setProductLineId(e.target.value);
                    setPage(0);
                  }}
                  disabled={optionsLoading}
                >
                  <option value="">-- Tất cả dòng --</option>
                  {productLineOptions
                    .filter((l) => !brandId || String(l.brandId) === String(brandId))
                    .map((l) => (
                      <option key={String(l.productLineId)} value={String(l.productLineId)}>
                        {l.lineName}
                      </option>
                    ))}
                </select>
              </div>

              {/* Nhóm sản phẩm */}
              <div className={styles.filterGroup}>
                <label>Nhóm sản phẩm</label>
                <select
                  value={categoryCodeFilter}
                  onChange={(e) => {
                    setCategoryCodeFilter(e.target.value);
                    setPage(0);
                  }}
                  disabled={optionsLoading}
                >
                  <option value="">-- Tất cả nhóm --</option>
                  {categoryOptions.map((c) => (
                    <option key={String(c.categoryCode)} value={String(c.categoryCode)}>
                      [{c.categoryCode}] {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Giá từ */}
              <div className={styles.filterGroup}>
                <label>Giá từ (đ)</label>
                <input
                  type="number"
                  placeholder="Từ..."
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              {/* Giá đến */}
              <div className={styles.filterGroup}>
                <label>Giá đến (đ)</label>
                <input
                  type="number"
                  placeholder="Đến..."
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              {/* Sắp xếp */}
              <div className={styles.filterGroup}>
                <label>Sắp xếp</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Mặc định</option>
                  <option value="itemName,asc">Tên: A → Z</option>
                  <option value="itemName,desc">Tên: Z → A</option>
                  <option value="price,asc">Giá: Thấp → Cao</option>
                  <option value="price,desc">Giá: Cao → Thấp</option>
                  <option value="sku,asc">SKU: A → Z</option>
                </select>
              </div>

              {(vehicleBrand || vehicleModel) && (
                <div className={styles.filterGroupCheckbox}>
                  <label htmlFor="filterCompatibleToggle">Danh mục tương thích</label>
                  <div className={`${styles.switchWrapper} ${filterCompatible ? styles.switchWrapperActive : ''}`}>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        id="filterCompatibleToggle"
                        checked={filterCompatible}
                        onChange={(e) => {
                          setFilterCompatible(e.target.checked);
                          setPage(0);
                        }}
                      />
                      <span className={`${styles.slider} ${styles.round}`}></span>
                    </label>
                    <span className={styles.switchLabelText}>
                      {filterCompatible ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isMobile && (
            <div className={`${styles.mobileFilterCollapse} ${showFilters ? styles.mobileFilterCollapseOpen : styles.mobileFilterCollapseClosed}`}>
              <div className={styles.filterGroup}>
                <label>Phân loại</label>
                <select
                  value={itemType}
                  onChange={(e) => {
                    setItemType(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">-- Tất cả phân loại --</option>
                  <option value="PART">Phụ tùng / Sản phẩm</option>
                  <option value="SERVICE">Dịch vụ</option>
                  <option value="MACHINERY">Máy móc</option>
                  <option value="EQUIPMENT">Thiết bị</option>
                  <option value="COMBO">Combo</option>
                  <option value="MAINTENANCE_PACKAGE">Gói bảo dưỡng</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Hãng sản xuất</label>
                <select
                  value={brandId}
                  onChange={handleBrandChange}
                  disabled={optionsLoading}
                >
                  <option value="">-- Tất cả hãng --</option>
                  {brandOptions.map((b) => (
                    <option key={String(b.brandId)} value={String(b.brandId)}>
                      {b.brandName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Dòng sản phẩm</label>
                <select
                  value={productLineId}
                  onChange={(e) => {
                    setProductLineId(e.target.value);
                    setPage(0);
                  }}
                  disabled={optionsLoading}
                >
                  <option value="">-- Tất cả dòng --</option>
                  {productLineOptions
                    .filter((l) => !brandId || String(l.brandId) === String(brandId))
                    .map((l) => (
                      <option key={String(l.productLineId)} value={String(l.productLineId)}>
                        {l.lineName}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Nhóm sản phẩm</label>
                <select
                  value={categoryCodeFilter}
                  onChange={(e) => {
                    setCategoryCodeFilter(e.target.value);
                    setPage(0);
                  }}
                  disabled={optionsLoading}
                >
                  <option value="">-- Tất cả nhóm --</option>
                  {categoryOptions.map((c) => (
                    <option key={String(c.categoryCode)} value={String(c.categoryCode)}>
                      [{c.categoryCode}] {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Giá từ (đ)</label>
                <input
                  type="number"
                  placeholder="Từ..."
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Giá đến (đ)</label>
                <input
                  type="number"
                  placeholder="Đến..."
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Sắp xếp</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Mặc định</option>
                  <option value="itemName,asc">Tên: A → Z</option>
                  <option value="itemName,desc">Tên: Z → A</option>
                  <option value="price,asc">Giá: Thấp → Cao</option>
                  <option value="price,desc">Giá: Cao → Thấp</option>
                  <option value="sku,asc">SKU: A → Z</option>
                </select>
              </div>

              {(vehicleBrand || vehicleModel) && (
                <div className={styles.filterGroupCheckboxMobile}>
                  <label htmlFor="filterCompatibleToggleMobile">Danh mục tương thích</label>
                  <div className={`${styles.switchWrapper} ${filterCompatible ? styles.switchWrapperActive : ''}`}>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        id="filterCompatibleToggleMobile"
                        checked={filterCompatible}
                        onChange={(e) => {
                          setFilterCompatible(e.target.checked);
                          setPage(0);
                        }}
                      />
                      <span className={`${styles.slider} ${styles.round}`}></span>
                    </label>
                    <span className={styles.switchLabelText}>
                      {filterCompatible ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        {loading ? (
          <div style={{ padding: '24px 0', textWrap: 'nowrap', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            Đang tải danh mục...
          </div>
        ) : (
          <>
            {!isMobile ? (
              <div className={styles.tableWrap}>
                <table className={styles.table} style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    {visibleColumns.map((c) => (
                      <col key={c.key} style={{ width: `${columnPrefs.widths[c.key] ?? c.defaultWidth}px` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      {visibleColumns.map((c) => {
                        const isLeftAligned = ['itemName', 'sku', 'description', 'compatibleCars'].includes(c.key);
                        return (
                          <th
                            key={c.key}
                            className={[
                              styles.resizableTh,
                              isLeftAligned && styles.tdLeft,
                              dragOverColumnKey === c.key && styles.thDragOver,
                            ].filter(Boolean).join(' ')}
                            draggable={!c.pinned}
                            onDragStart={(e) => handleColumnDragStart(c.key, e)}
                            onDragOver={(e) => handleColumnDragOver(c.key, e)}
                            onDrop={(e) => handleColumnDrop(c.key, e)}
                            onDragEnd={handleColumnDragEnd}
                          >
                            <span>{c.label}</span>
                            <span
                              className={styles.resizeHandle}
                              draggable={false}
                              onMouseDown={(e) => handleColumnResizeStart(c.key, e)}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(results) && results.length > 0) ? (
                      results.map((it, i) => (
                        (() => {
                          const itemKeyRaw = it?.itemId ?? it?.id ?? `res-${i}`;
                          const itemKey = String(itemKeyRaw);
                          const itemIdNum = toIdOrNull(it?.itemId ?? it?.id);
                          const details = Array.isArray(it?.warehouseDetails) ? it.warehouseDetails : [];
                          const selectedWarehouseId = selectedWarehouseByItemId[itemKey] ?? '';
                          const selectedDetail = details.find((d) => String(d?.warehouseId) === String(selectedWarehouseId)) || null;
                          const rawNotify = String(selectedDetail?.notify ?? '').trim();
                          const notifyText = rawNotify === 'Đang dùng giá nhập kho nhập mới nhất' ? '' : rawNotify;

                          const hasAnyPrice = (
                            toFiniteNumber(it?.price) != null
                            || toFiniteNumber(it?.unitPrice) != null
                            || details.some((d) => toFiniteNumber(d?.sellingPrice) != null)
                          );

                          let displayPrice = null;
                          if (details.length > 0) {
                            displayPrice = toFiniteNumber(selectedDetail?.sellingPrice ?? (details[0]?.sellingPrice));
                          } else {
                            displayPrice = toFiniteNumber(it?.price) ?? toFiniteNumber(it?.unitPrice);
                          }

                          const canPickAnyWarehouse = details.some((d) => {
                            const qty = toFiniteNumber(getWarehouseAvailableQty(d));
                            return qty == null || qty > 0;
                          });

                          const hasWarehouses = details.length > 0;
                          let pickDisabled = false;
                          if (hasWarehouses) {
                            const hasSelectedWarehouse = Boolean(selectedWarehouseId);
                            const hasSelectedDetail = Boolean(selectedDetail);
                            const selectedOutOfStock = selectedDetail ? isOutOfStock(selectedDetail) : false;
                            pickDisabled = !hasSelectedWarehouse || !hasSelectedDetail || selectedOutOfStock;
                          }

                          const selectedWarehouseIdNum = hasWarehouses ? toIdOrNull(selectedWarehouseId) : null;
                          const candidateWarehouseId = hasWarehouses
                            ? selectedWarehouseIdNum
                            : toIdOrNull(it?.warehouseId);

                          const candidateKey = itemIdNum ? `${itemIdNum}|${candidateWarehouseId ?? ''}` : '';
                          const isDuplicateSelection = Boolean(
                            itemIdNum
                            && candidateKey
                            && existingSelectionKeys?.has?.(candidateKey)
                            && candidateKey !== (excludeSelectionKey ?? ''),
                          );

                          let priceCellText = '-';
                          if (hasAnyPrice) {
                            if (displayPrice != null) priceCellText = formatCurrencyVnd(displayPrice);
                          } else {
                            priceCellText = 'Không có dữ liệu về giá';
                          }

                          let actionControl = null;
                          if (hasWarehouses) {
                            const selectControl = (
                              <select
                                className={styles.warehouseSelect}
                                value={selectedWarehouseId}
                                onChange={(e) => handleWarehouseChange(it, e.target.value)}
                              >
                                <option value="" disabled>Chọn kho...</option>
                                {details.map((d, idx2) => {
                                  const wid = d?.warehouseId;
                                  const name = getWarehouseDisplayName(d);
                                  const qty = toFiniteNumber(getWarehouseAvailableQty(d));
                                  const outOfStock = qty != null && qty <= 0;
                                  let label = name;
                                  if (qty != null) {
                                    if (outOfStock) label = `${name} (Hết hàng)`;
                                    else label = `${name} (SL: ${qty})`;
                                  }
                                  return (
                                    <option key={String(wid ?? `w-${idx2}`)} value={String(wid ?? '')} disabled={outOfStock}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                            );

                            const isPickDisabled = pickDisabled || canPickAnyWarehouse === false || isDuplicateSelection;

                            actionControl = (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectControl}
                                {canPickAnyWarehouse ? null : <span style={{ color: '#ef4444', fontSize: '12px' }}>Hết hàng</span>}
                                <button
                                  type="button"
                                  className="ui-btn ui-btn--primary"
                                  onClick={() => handlePickItem(it)}
                                  disabled={isPickDisabled}
                                >
                                  Chọn
                                </button>
                              </div>
                            );
                          } else {
                            actionControl = (
                              <button
                                type="button"
                                className="ui-btn ui-btn--primary"
                                onClick={() => handlePickItem(it)}
                                disabled={isDuplicateSelection}
                              >
                                Chọn
                              </button>
                            );
                          }

                          const renderTableCell = (colKey) => {
                            switch (colKey) {
                              case 'select':
                                return actionControl;
                              case 'image':
                                return <ItemTableImage item={it} />;
                              case 'itemName':
                                return (
                                  <div className={styles.nameCellWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, textAlign: 'left' }}>
                                    <span className={styles.itemNameText} style={{ fontWeight: 500 }}>{it?.itemName || it?.name || '-'}</span>
                                    {isItemCompatible(it) && (
                                      <span className={styles.compatibleBadge} title={`Tương thích với xe ${vehicleBrand} ${vehicleModel}`}>
                                        ✓ Tương thích
                                      </span>
                                    )}
                                  </div>
                                );
                              case 'sku':
                                return it?.sku || '-';
                              case 'itemType':
                                return renderItemTypeBadge(it);
                              case 'brand':
                                return it?.brand || '-';
                              case 'color':
                                return it?.color || '-';
                              case 'origin':
                                return it?.madeIn || it?.origin || '-';
                              case 'price':
                                return priceCellText;
                              case 'unit':
                                return it?.unit || '-';
                              case 'productLine':
                                return it?.productLine || '-';
                              case 'description':
                                return <span title={it?.description || ''}>{it?.description || '-'}</span>;
                              case 'compatibleCars':
                                return it?.compatibleCars || '-';
                              default:
                                return null;
                            }
                          };

                          const rowKey = String(it?.itemId ?? it?.id ?? `res-${i}`);
                          return (
                            <Fragment key={rowKey}>
                              <tr
                                onClick={(e) => {
                                  if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;
                                  setDetailItem(it);
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {visibleColumns.map((c) => {
                                  const isNumberCell = ['price'].includes(c.key);
                                  const isLeftAligned = ['itemName', 'sku', 'description', 'compatibleCars'].includes(c.key);
                                  const cellClassName = [
                                    isNumberCell && styles.tdNumber,
                                    isLeftAligned && styles.tdLeft,
                                    ['image'].includes(c.key) && styles.tdCompact,
                                  ].filter(Boolean).join(' ') || undefined;
                                  return (
                                    <td key={c.key} className={cellClassName} data-label={c.label}>
                                      {renderTableCell(c.key)}
                                    </td>
                                  );
                                })}
                              </tr>
                              {notifyText ? (
                                <tr className={styles.notifyRow}>
                                  <td className={styles.notifyCell} colSpan={visibleColumns.length}>
                                    {notifyText}
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })()
                      ))
                    ) : (
                      <tr>
                        <td colSpan={visibleColumns.length} className={styles.emptyRow}>
                          Không có kết quả.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.mobileCardList}>
                {(Array.isArray(results) && results.length > 0) ? (
                  results.map((it, i) => {
                    const itemKeyRaw = it?.itemId ?? it?.id ?? `res-${i}`;
                    const itemKey = String(itemKeyRaw);
                    const itemIdNum = toIdOrNull(it?.itemId ?? it?.id);
                    const details = Array.isArray(it?.warehouseDetails) ? it.warehouseDetails : [];
                    const selectedWarehouseId = selectedWarehouseByItemId[itemKey] ?? '';
                    const selectedDetail = details.find((d) => String(d?.warehouseId) === String(selectedWarehouseId)) || null;
                    const rawNotify = String(selectedDetail?.notify ?? '').trim();
                    const notifyText = rawNotify === 'Đang dùng giá nhập kho nhập mới nhất' ? '' : rawNotify;

                    const hasAnyPrice = (
                      toFiniteNumber(it?.price) != null
                      || toFiniteNumber(it?.unitPrice) != null
                      || details.some((d) => toFiniteNumber(d?.sellingPrice) != null)
                    );

                    let displayPrice = null;
                    if (details.length > 0) {
                      displayPrice = toFiniteNumber(selectedDetail?.sellingPrice ?? (details[0]?.sellingPrice));
                    } else {
                      displayPrice = toFiniteNumber(it?.price) ?? toFiniteNumber(it?.unitPrice);
                    }

                    const canPickAnyWarehouse = details.some((d) => {
                      const qty = toFiniteNumber(getWarehouseAvailableQty(d));
                      return qty == null || qty > 0;
                    });

                    const hasWarehouses = details.length > 0;
                    let pickDisabled = false;
                    if (hasWarehouses) {
                      const hasSelectedWarehouse = Boolean(selectedWarehouseId);
                      const hasSelectedDetail = Boolean(selectedDetail);
                      const selectedOutOfStock = selectedDetail ? isOutOfStock(selectedDetail) : false;
                      pickDisabled = !hasSelectedWarehouse || !hasSelectedDetail || selectedOutOfStock;
                    }

                    const selectedWarehouseIdNum = hasWarehouses ? toIdOrNull(selectedWarehouseId) : null;
                    const candidateWarehouseId = hasWarehouses
                      ? selectedWarehouseIdNum
                      : toIdOrNull(it?.warehouseId);

                    const candidateKey = itemIdNum ? `${itemIdNum}|${candidateWarehouseId ?? ''}` : '';
                    
                    const hasSelection = existingSelectionKeys && typeof existingSelectionKeys.has === 'function'
                      ? existingSelectionKeys.has(candidateKey)
                      : (Array.isArray(existingSelectionKeys) && existingSelectionKeys.includes(candidateKey));

                    const isDuplicateSelection = Boolean(
                      itemIdNum &&
                      candidateKey &&
                      hasSelection &&
                      candidateKey !== (excludeSelectionKey ?? '')
                    );

                    let priceCellText = '-';
                    if (hasAnyPrice) {
                      if (displayPrice != null) priceCellText = formatCurrencyVnd(displayPrice);
                    } else {
                      priceCellText = 'Chưa có giá';
                    }

                    let typeLabel = 'Sản phẩm';
                    let typeClass = styles.tagPart;
                    const itemTypeRaw = it?.itemType ?? 'PART';
                    if (itemTypeRaw === 'SERVICE') {
                      typeLabel = 'Dịch vụ';
                      typeClass = styles.tagService;
                    } else if (itemTypeRaw === 'EQUIPMENT') {
                      typeLabel = 'Thiết bị';
                      typeClass = styles.tagEquipment;
                    } else if (itemTypeRaw === 'MACHINERY') {
                      typeLabel = 'Máy móc';
                      typeClass = styles.tagEquipment;
                    } else if (itemTypeRaw === 'COMBO') {
                      typeLabel = 'Combo';
                      typeClass = styles.tagCombo;
                    } else if (itemTypeRaw === 'MAINTENANCE_PACKAGE') {
                      typeLabel = 'Gói bảo dưỡng';
                      typeClass = styles.tagPackage;
                    }

                    let stockStatusText = '';
                    let stockStatusClass = '';
                    if (hasWarehouses) {
                      if (!selectedWarehouseId) {
                        stockStatusText = 'Vui lòng chọn kho';
                        stockStatusClass = styles.stockNone;
                      } else if (selectedDetail) {
                        const qty = toFiniteNumber(getWarehouseAvailableQty(selectedDetail));
                        if (qty != null) {
                          if (qty <= 0) {
                            stockStatusText = 'Hết hàng';
                            stockStatusClass = styles.stockOut;
                          } else {
                            stockStatusText = `Còn hàng (Tồn: ${qty})`;
                            stockStatusClass = styles.stockIn;
                          }
                        } else {
                          stockStatusText = 'Sẵn sàng';
                          stockStatusClass = styles.stockIn;
                        }
                      }
                    }

                    return (
                      <div className={styles.mobileCard} key={itemKey}>
                        <div className={styles.cardHeader}>
                          <span className={`${styles.typeTag} ${typeClass}`}>
                            {itemTypeRaw === 'SERVICE' ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            )}
                            {typeLabel}
                          </span>
                          <span className={styles.skuTag}>{it?.sku || 'N/A'}</span>
                        </div>

                        <h4 className={styles.cardTitle}>
                          {it?.itemName || it?.name || '-'}
                          {isItemCompatible(it) && (
                            <span className={styles.compatibleBadgeMobile} title={`Tương thích với xe ${vehicleBrand} ${vehicleModel}`}>
                              ✓ Tương thích
                            </span>
                          )}
                        </h4>

                        <div className={styles.cardSpecsGrid}>
                          <div className={styles.specItem}>
                            <span className={styles.specLabel}>Hãng</span>
                            <span className={styles.specValue} title={it?.brand}>{it?.brand || '-'}</span>
                          </div>
                          <div className={styles.specItem}>
                            <span className={styles.specLabel}>Xuất xứ</span>
                            <span className={styles.specValue} title={it?.madeIn}>{it?.madeIn || '-'}</span>
                          </div>
                          <div className={styles.specItem}>
                            <span className={styles.specLabel}>Màu sắc</span>
                            <span className={styles.specValue} title={it?.color}>{it?.color || '-'}</span>
                          </div>
                          <div className={styles.specItem}>
                            <span className={styles.specLabel}>Đơn vị</span>
                            <span className={styles.specValue} title={it?.unit}>{it?.unit || '-'}</span>
                          </div>
                        </div>

                        {hasWarehouses && (
                          <>
                            <div className={styles.cardDivider} />
                            <div className={styles.warehouseSection}>
                              <label className={styles.warehouseLabel}>
                                <svg className={styles.warehouseIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                Chọn kho nhận hàng:
                              </label>
                              <select
                                className={styles.warehouseSelectMobile}
                                value={selectedWarehouseId}
                                onChange={(e) => handleWarehouseChange(it, e.target.value)}
                              >
                                <option value="" disabled>Chọn kho...</option>
                                {details.map((d, idx2) => {
                                  const wid = d?.warehouseId;
                                  const name = getWarehouseDisplayName(d);
                                  const qty = toFiniteNumber(getWarehouseAvailableQty(d));
                                  const outOfStock = qty != null && qty <= 0;
                                  let label = name;
                                  if (qty != null) {
                                    if (outOfStock) label = `${name} (Hết hàng)`;
                                    else label = `${name} (SL: ${qty})`;
                                  }
                                  return (
                                    <option key={String(wid ?? `w-${idx2}`)} value={String(wid ?? '')} disabled={outOfStock}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                              {stockStatusText && (
                                <div className={`${styles.stockStatus} ${stockStatusClass}`}>
                                  {stockStatusText === 'Hết hàng' ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                  ) : stockStatusText === 'Vui lòng chọn kho' ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  )}
                                  {stockStatusText}
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {notifyText && (
                          <div className={styles.mobileNotifyRow}>
                            {notifyText}
                          </div>
                        )}

                        <div className={styles.cardDivider} />

                        <div className={styles.cardFooter}>
                          <div className={styles.priceContainer}>
                            <span className={styles.priceLabel}>Giá bán</span>
                            <span className={styles.priceVal}>{priceCellText}</span>
                          </div>

                          {isDuplicateSelection ? (
                            <button
                              type="button"
                              className={`${styles.mobileActionBtn} ${styles.btnSuccess}`}
                              disabled
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Đã chọn
                            </button>
                          ) : hasWarehouses && (pickDisabled || canPickAnyWarehouse === false) ? (
                            <button
                              type="button"
                              className={`${styles.mobileActionBtn} ${styles.btnDisabled}`}
                              disabled
                            >
                              Hết hàng
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.mobileActionBtn} ${styles.btnPrimary}`}
                              onClick={() => handlePickItem(it)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Chọn
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyRow} style={{ padding: '40px 0', textWrap: 'nowrap', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    Không có kết quả.
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalFooter}>
              {/* Cụm phân trang bên trái */}
              <div className={styles.pagination}>
                <button
                  type="button"
                  className="ui-btn ui-btn--ghost"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page <= 0 || loading}
                >
                  ← Trước
                </button>

                <span className={styles.pageInfo}>
                  Trang {page + 1} / {Math.max(1, Math.ceil(totalElements / size))}
                </span>

                <button
                  type="button"
                  className="ui-btn ui-btn--ghost"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * size >= totalElements || loading}
                >
                  Tiếp →
                </button>
              </div>

              {/* Nút hành động bên phải */}
              <div className={styles.modalActions}>
                <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                  Đóng
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </dialog>
  );
}

CatalogPicker.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onPick: PropTypes.func,
  existingSelectionKeys: PropTypes.shape({
    has: PropTypes.func,
  }),
  excludeSelectionKey: PropTypes.string,
  initialSearch: PropTypes.string,
  initialPage: PropTypes.number,
  pageSize: PropTypes.number,
  initQuery: PropTypes.string,
  categoryCode: PropTypes.string,
  vehicleBrand: PropTypes.string,
  vehicleModel: PropTypes.string,
};

export default CatalogPicker;
