import { Fragment, useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CatalogPicker.module.css'; 
import { 
  searchWarehouseCatalogItemsDetail,
  fetchWarehouseBrands,
  fetchWarehouseProductLines,
  fetchWarehouseItemCategories,
} from '../../../services/warehouseService.js';
import { formatCurrencyVnd, toIdOrNull } from './useAdvisorItemsTableHandlers.js';

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function getWarehouseDisplayName(detail) {
  return String(detail?.warehouseName || detail?.warehouseCode || detail?.warehouseId || '').trim() || '-';
}

function getWarehouseAvailableQty(detail) {
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

export default function CatalogPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};
  const {
    ticketCode = '',
    rowIndex = null,
    categoryCode = '',
    existingSelectionKeys = [],
    excludeSelectionKey = null,
    initialSearch = '',
    initialPage = 0,
    pageSize = 10,
    initQuery = '',
  } = state;

  const existingSelectionKeysSet = useMemo(() => new Set(existingSelectionKeys), [existingSelectionKeys]);

  const [savedState, setSavedState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('gms_catalog_picker_state');
      if (saved) {
        sessionStorage.removeItem('gms_catalog_picker_state');
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved catalog picker state:', e);
    }
    return null;
  });

  const [search, setSearch] = useState(() => {
    if (savedState) return savedState.search ?? '';
    return initialSearch || initQuery || '';
  });
  const [page, setPage] = useState(() => {
    if (savedState && savedState.page != null) {
      const parsed = Number(savedState.page);
      return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    }
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
  const [selectedWarehouseByItemId, setSelectedWarehouseByItemId] = useState(() => {
    if (savedState && savedState.selectedWarehouseByItemId) return savedState.selectedWarehouseByItemId;
    return {};
  });

  // Dynamic options loaded from API
  const [brandOptions, setBrandOptions] = useState([]);
  const [productLineOptions, setProductLineOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Filter values
  const [brandId, setBrandId] = useState(() => {
    if (savedState) return savedState.brandId ?? '';
    return '';
  });
  const [productLineId, setProductLineId] = useState(() => {
    if (savedState) return savedState.productLineId ?? '';
    return '';
  });
  const [categoryCodeFilter, setCategoryCodeFilter] = useState(() => {
    if (savedState) return savedState.categoryCodeFilter ?? '';
    return categoryCode || '';
  });
  const [itemType, setItemType] = useState(() => {
    if (savedState) return savedState.itemType ?? '';
    return '';
  });
  const [minPrice, setMinPrice] = useState(() => {
    if (savedState) return savedState.minPrice ?? '';
    return '';
  });
  const [maxPrice, setMaxPrice] = useState(() => {
    if (savedState) return savedState.maxPrice ?? '';
    return '';
  });
  const [sortBy, setSortBy] = useState(() => {
    if (savedState) return savedState.sortBy ?? '';
    return '';
  });

  // Khi mở trang: reset lại lựa chọn kho & bộ lọc (trừ trường hợp vừa phục hồi trạng thái)
  useEffect(() => {
    if (savedState) {
      setSavedState(null);
      return;
    }
    setSelectedWarehouseByItemId({});
    setBrandId('');
    setProductLineId('');
    setCategoryCodeFilter(categoryCode || '');
    setItemType('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('');
  }, [categoryCode]);

  // Tải danh mục hãng, dòng sản phẩm, nhóm hàng hỗ trợ bộ lọc
  useEffect(() => {
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
  }, []);

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

        const res = await searchWarehouseCatalogItemsDetail(params, token);
        const envelope = res?.data ?? res;
        const payload = envelope?.data ?? envelope;
        let content = [];
        if (Array.isArray(payload?.content)) content = payload.content;
        else if (Array.isArray(payload)) content = payload;
        if (cancelled) return;
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
  }, [page, size, search, categoryCodeFilter, itemType, brandId, productLineId, minPrice, maxPrice, sortBy]);

  const handlePick = (item) => {
    const activeTicketId = ticketCode || 'new_booking';
    const pickedProductData = {
      item,
      rowIndex,
    };
    sessionStorage.setItem(`gms_picked_product_${activeTicketId}`, JSON.stringify(pickedProductData));
    navigate(-1);
  };

  const handleWarehouseChange = (item, warehouseIdRaw) => {
    const itemId = item?.itemId ?? item?.id ?? null;
    const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
    const warehouseIdNum = typeof warehouseIdRaw === 'number' ? warehouseIdRaw : Number(warehouseIdRaw);
    const selectedDetail = details.find((d) => Number(d?.warehouseId) === warehouseIdNum) || null;

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
      handlePick(item);
      return;
    }

    const itemKey = String(item?.itemId ?? item?.id ?? '');
    const selectedWarehouseIdRaw = selectedWarehouseByItemId[itemKey];
    const selectedWarehouseIdNum = typeof selectedWarehouseIdRaw === 'number'
      ? selectedWarehouseIdRaw
      : Number(selectedWarehouseIdRaw);
    const selectedDetail = details.find((d) => Number(d?.warehouseId) === selectedWarehouseIdNum) || null;
    if (!selectedDetail || isOutOfStock(selectedDetail)) return;

    // Check if the selected warehouse has lots
    const hasLots = Array.isArray(selectedDetail?.lots) && selectedDetail.lots.length > 0;
    if (hasLots) {
      // Save current search/filter states to sessionStorage
      const stateToSave = {
        search,
        page,
        brandId,
        productLineId,
        categoryCodeFilter,
        itemType,
        minPrice,
        maxPrice,
        sortBy,
        selectedWarehouseByItemId,
      };
      sessionStorage.setItem('gms_catalog_picker_state', JSON.stringify(stateToSave));

      // Navigate to lot-picker page
      navigate('/lot-picker', {
        state: {
          ticketCode,
          rowIndex,
          item,
          selectedWarehouse: selectedDetail,
        },
      });
    } else {
      // No lots, pick directly
      handlePick(buildPickedCatalogItem(item, selectedDetail, null));
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Chọn sản phẩm từ danh mục</h2>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>

      <div className={styles.modalBody} style={{ padding: 0 }}>
        <div className={styles.filterSection}>
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
          </div>

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
          </div>
        </div>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        {loading ? (
          <div>Đang tải danh mục...</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên</th>
                    <th>SKU</th>
                    <th>HÃNG</th>
                    <th>Màu sắc</th>
                    <th>Xuất xứ</th>
                    <th>GIÁ</th>
                    <th>ĐV</th>
                    <th />
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
                        const notifyText = String(selectedDetail?.notify ?? '').trim();
                        const hasAnyPrice = (
                          toFiniteNumber(it?.price) != null
                          || toFiniteNumber(it?.unitPrice) != null
                          || details.some((d) => toFiniteNumber(d?.sellingPrice) != null)
                        );

                        let displayPrice = null;
                        if (details.length > 0) {
                          displayPrice = toFiniteNumber(selectedDetail?.sellingPrice);
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
                          && existingSelectionKeysSet?.has?.(candidateKey)
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
                              {canPickAnyWarehouse ? null : <span>Hết hàng</span>}
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
                        const rowKey = String(it?.itemId ?? it?.id ?? `res-${i}`);
                        return (
                          <Fragment key={rowKey}>
                            <tr>
                              <td>{page * size + i + 1}</td>
                              <td>{it?.itemName || it?.name || '-'}</td>
                              <td>{it?.sku || '-'}</td>
                              <td>{it?.brand || '-'}</td>
                              <td>{it?.color || '-'}</td>
                              <td>{it?.madeIn || '-'}</td>
                              <td className={styles.tdNumber}>{priceCellText}</td>
                              <td>{it?.unit || '-'}</td>
                              <td>
                                {actionControl}
                              </td>
                            </tr>
                            {notifyText ? (
                              <tr className={styles.notifyRow}>
                                <td className={styles.notifyCell} colSpan={9}>
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
                      <td colSpan={9} className={styles.emptyRow}>
                        Không có kết quả.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.modalFooter}>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
