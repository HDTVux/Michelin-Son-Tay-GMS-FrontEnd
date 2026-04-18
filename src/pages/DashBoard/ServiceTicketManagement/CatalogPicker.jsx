import { Fragment, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
// Lưu ý: Nếu bạn để CSS chung thì giữ nguyên dòng này. 
// Nếu tách file thì đổi thành import styles from './CatalogPicker.module.css';
import styles from './CatalogPicker.module.css'; 
import { searchWarehouseCatalogItemsDetail } from '../../../services/warehouseService.js';
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

function buildPickedCatalogItem(item, warehouseDetail) {
  if (!warehouseDetail) return item;
  const sellingPrice = warehouseDetail?.sellingPrice;
  const nextPrice = sellingPrice ?? item?.price ?? item?.unitPrice;
  return {
    ...item,
    warehouseId: warehouseDetail?.warehouseId,
    selectedWarehouse: warehouseDetail,
    sellingPrice,
    price: nextPrice,
    unitPrice: nextPrice,
    // Keep naming for downstream code, but align value with what we show in dropdown.
    availableQuantity: getWarehouseAvailableQty(warehouseDetail),
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
}) {
  const dialogRef = useRef(null); // Tạo ref để điều khiển thẻ dialog

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

  // Mỗi lần mở modal: reset lại lựa chọn kho (không giữ state lần trước).
  useEffect(() => {
    if (open) setSelectedWarehouseByItemId({});
  }, [open]);

  // Effect này bắt sự kiện khi prop 'open' thay đổi để mở/đóng Modal chính giữa màn hình
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal(); // Hàm này giúp Modal ra giữa màn hình và khóa nền
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

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');
        // Nếu có categoryCode thì truyền vào params tìm kiếm
        const params = { page, size, search };
        if (categoryCode) params.categoryCode = categoryCode;
        const res = await searchWarehouseCatalogItemsDetail(params, token);
        // New API returns: { success, ..., data: { content, totalElements, ... } }
        // Keep backward-compat: if data wrapper is absent, use response directly.
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
  }, [open, page, size, search, categoryCode]);

  const handlePick = (item) => {
    onPick?.(item);
  };

  const handleWarehouseChange = (item, warehouseIdRaw) => {
    const itemId = item?.itemId ?? item?.id ?? null;
    const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
    const warehouseIdNum = typeof warehouseIdRaw === 'number' ? warehouseIdRaw : Number(warehouseIdRaw);
    const selectedDetail = details.find((d) => Number(d?.warehouseId) === warehouseIdNum) || null;

    // Không cho trỏ tới kho đã hết hàng.
    if (selectedDetail && isOutOfStock(selectedDetail)) return;

    if (itemId != null) {
      setSelectedWarehouseByItemId((prev) => ({
        ...prev,
        [String(itemId)]: Number.isFinite(warehouseIdNum) ? warehouseIdNum : warehouseIdRaw,
      }));
    }

    // UX: dropdown chỉ để chọn kho + cập nhật hiển thị, chưa pick ngay.
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
    handlePick(buildPickedCatalogItem(item, selectedDetail));
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
            Tìm
          </button>
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
                    <th>ID</th>
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
                          // Khi có kho: chỉ hiển thị giá theo kho đang chọn (nếu có).
                          displayPrice = toFiniteNumber(selectedDetail?.sellingPrice);
                        } else {
                          // Khi không có kho: dùng giá của item.
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
                          const pickEnabled = hasSelectedWarehouse && hasSelectedDetail && selectedOutOfStock === false;
                          pickDisabled = pickEnabled === false;
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
                              <td>{it?.itemId ?? '-'}</td>
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
            {/* KẾT THÚC PHẦN THAY THẾ */}
          </>
        )}
      </div>
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
};

export default CatalogPicker;
