import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

import { createWarehousePricing, searchWarehouseCatalogItemsDetail } from '../../../services/warehouseService.js';
import { formatCurrencyVnd } from '../PartManagement/itemFormatters.js';
import styles from '../AdvisorInspection/AdvisorInspection.module.css';
import commonStyles from '../common/ManagementCommon.module.css';

const extractPagedContent = (payload) => {
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload)) return payload;
  return [];
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
};

const toIsoDateInput = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWarehouseDisplayName = (detail) => {
  return String(detail?.warehouseName || detail?.warehouseCode || detail?.warehouseId || '').trim() || '-';
};

const getWarehouseAvailableQty = (detail) => {
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
};

const isOutOfStock = (detail) => {
  const qty = toFiniteNumber(getWarehouseAvailableQty(detail));
  return qty != null && qty <= 0;
};

const formatVnd = (value) => {
  const text = formatCurrencyVnd(value);
  if (!text || text === '-') return '-';
  return `${text} ₫`;
};

const buildItemKey = (item, index) => String(item?.itemId ?? item?.id ?? `res-${index}`);

function CatalogItemRow({
  item,
  index,
  itemKey,
  selectedWarehouseId,
  onWarehouseChange,
  onPick,
}) {
  const itemId = item?.itemId ?? item?.id;
  const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
  const hasWarehouses = details.length > 0;
  const selectedDetail = details.find((d) => String(d?.warehouseId) === String(selectedWarehouseId)) || null;
  const notifyText = String(selectedDetail?.notify ?? '').trim();

  let displayPrice = null;
  if (hasWarehouses) displayPrice = toFiniteNumber(selectedDetail?.sellingPrice);
  else displayPrice = toFiniteNumber(item?.price) ?? toFiniteNumber(item?.unitPrice);

  const canPickAnyWarehouse = details.some((d) => {
    const qty = toFiniteNumber(getWarehouseAvailableQty(d));
    return qty == null || qty > 0;
  });

  const pickDisabled = hasWarehouses
    ? !(selectedWarehouseId && selectedDetail && !isOutOfStock(selectedDetail))
    : false;

  return (
    <Fragment key={itemKey}>
      <tr>
        <td>{itemId ?? '-'}</td>
        <td>{item?.itemName || item?.name || '-'}</td>
        <td>{item?.sku || '-'}</td>
        <td>{item?.brand || '-'}</td>
        <td>{item?.color || '-'}</td>
        <td>{item?.madeIn || '-'}</td>
        <td>{item?.unit || '-'}</td>
        <td>{displayPrice == null ? '-' : formatVnd(displayPrice)}</td>
        <td>
          {hasWarehouses ? (
            <select
              className={commonStyles.input}
              value={selectedWarehouseId}
              onChange={(e) => onWarehouseChange(item, index, e.target.value)}
            >
              <option value="" disabled>
                Chọn kho...
              </option>
              {details.map((d, idx2) => {
                const wid = d?.warehouseId;
                const name = getWarehouseDisplayName(d);
                const qty = toFiniteNumber(getWarehouseAvailableQty(d));
                const outOfStock = qty != null && qty <= 0;
                let label = name;
                if (qty != null) {
                  label = outOfStock ? `${name} (Hết hàng)` : `${name} (SL: ${qty})`;
                }
                return (
                  <option
                    key={String(wid ?? `w-${idx2}`)}
                    value={String(wid ?? '')}
                    disabled={outOfStock}
                  >
                    {label}
                  </option>
                );
              })}
            </select>
          ) : (
            '-'
          )}
        </td>
        <td>
          {hasWarehouses ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {canPickAnyWarehouse ? null : <span>Hết hàng</span>}
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => onPick(item, index)}
                disabled={pickDisabled || canPickAnyWarehouse === false}
              >
                Chọn
              </button>
            </div>
          ) : (
            <button type="button" className={styles.primaryButton} onClick={() => onPick(item, index)}>
              Chọn
            </button>
          )}
        </td>
      </tr>
      {notifyText ? (
        <tr>
          <td colSpan={10} style={{ fontStyle: 'italic' }}>
            {notifyText}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

CatalogItemRow.propTypes = {
  item: PropTypes.object,
  index: PropTypes.number.isRequired,
  itemKey: PropTypes.string.isRequired,
  selectedWarehouseId: PropTypes.string,
  onWarehouseChange: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
};

function PickerSection({
  search,
  onSearchChange,
  error,
  loading,
  results,
  page,
  pageCount,
  size,
  totalElements,
  onPrev,
  onNext,
  selectedWarehouseByItemKey,
  onWarehouseChange,
  onPick,
}) {
  return (
    <>
      <hr style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <strong>Chọn sản phẩm (PART)</strong>
        <div className={styles.searchBox} style={{ maxWidth: 520, width: '100%' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input placeholder="Tìm theo tên, SKU..." value={search} onChange={onSearchChange} />
        </div>
      </div>

      {error ? (
        <div className={styles.errorBanner} style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>TÊN</th>
                <th>SKU</th>
                <th>HÃNG</th>
                <th>MÀU</th>
                <th>XUẤT XỨ</th>
                <th>ĐƠN VỊ</th>
                <th>GIÁ</th>
                <th>KHO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className={styles.emptyRow}>
                    Đang tải...
                  </td>
                </tr>
              ) : null}

              {!loading && (!Array.isArray(results) || results.length === 0) ? (
                <tr>
                  <td colSpan="10" className={styles.emptyRow}>
                    Không có kết quả.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                Array.isArray(results) &&
                results.map((it, idx) => {
                  const itemKey = buildItemKey(it, idx);
                  const selectedWarehouseId = String(selectedWarehouseByItemKey[itemKey] ?? '');
                  return (
                    <CatalogItemRow
                      key={itemKey}
                      item={it}
                      index={idx}
                      itemKey={itemKey}
                      selectedWarehouseId={selectedWarehouseId}
                      onWarehouseChange={onWarehouseChange}
                      onPick={onPick}
                    />
                  );
                })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            gap: 12,
          }}
        >
          <div className={styles.pageSize}>
            <span>
              Trang {page + 1} / {pageCount}
            </span>
          </div>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <button type="button" className={styles.ghostButton} onClick={onPrev} disabled={page <= 0 || loading}>
              ← Trước
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={onNext}
              disabled={(page + 1) * size >= totalElements || loading}
            >
              Tiếp →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

PickerSection.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  loading: PropTypes.bool,
  results: PropTypes.array,
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  totalElements: PropTypes.number.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  selectedWarehouseByItemKey: PropTypes.object.isRequired,
  onWarehouseChange: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
};

export default function WarehousePricingCreateModal({
  open,
  onClose,
  warehouses,
  initialWarehouseId,
  onCreated,
}) {
  const dialogRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [picked, setPicked] = useState(null);
  const [basePriceInput, setBasePriceInput] = useState('');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(toIsoDateInput());
  const [effectiveTo, setEffectiveTo] = useState(toIsoDateInput());

  const [showPicker, setShowPicker] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const size = 10;

  const [results, setResults] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedWarehouseByItemId, setSelectedWarehouseByItemId] = useState({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setCreateError('');
    setFieldErrors({});
    setPicked(null);
    setBasePriceInput('');
    setSellingPriceInput('');
    setEffectiveFrom(toIsoDateInput());
    setEffectiveTo(toIsoDateInput());
    setShowPicker(true);

    setSearch('');
    setDebouncedSearch('');
    setPage(0);
    setResults([]);
    setTotalElements(0);
    setLoading(false);
    setError('');
    setSelectedWarehouseByItemId({});
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [open, search]);

  useEffect(() => {
    if (open) setPage(0);
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

        const params = {
          page,
          size,
          search: debouncedSearch,
          itemType: 'PART',
          isActive: 1,
        };

        const res = await searchWarehouseCatalogItemsDetail(params, token);
        const envelope = res?.data ?? res;
        const payload = envelope?.data ?? envelope;
        const content = extractPagedContent(payload);

        if (cancelled) return;
        setResults(content);
        setTotalElements(Number(payload?.totalElements ?? content.length));
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setTotalElements(0);
        setError(err?.message || 'Không thể tải danh sách sản phẩm.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, page, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    if (!initialWarehouseId) return;

    const wid = String(initialWarehouseId);
    setSelectedWarehouseByItemId((prev) => {
      const next = { ...prev };
      for (let i = 0; i < results.length; i += 1) {
        const it = results[i];
        const key = buildItemKey(it, i);
        if (next[key]) continue;
        const details = Array.isArray(it?.warehouseDetails) ? it.warehouseDetails : [];
        const match = details.find((d) => String(d?.warehouseId) === wid);
        if (match && !isOutOfStock(match)) next[key] = wid;
      }
      return next;
    });
  }, [open, initialWarehouseId, results]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(totalElements / size)), [totalElements]);

  const handleWarehouseChange = (item, itemIndex, warehouseIdRaw) => {
    const itemKey = buildItemKey(item, itemIndex);
    const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
    const selectedDetail = details.find((d) => String(d?.warehouseId) === String(warehouseIdRaw)) || null;

    if (selectedDetail && isOutOfStock(selectedDetail)) return;

    setSelectedWarehouseByItemId((prev) => ({
      ...prev,
      [itemKey]: warehouseIdRaw,
    }));
  };

  const handlePickItem = (item, itemIndex) => {
    const details = Array.isArray(item?.warehouseDetails) ? item.warehouseDetails : [];
    const itemKey = buildItemKey(item, itemIndex);
    const selectedWarehouseId = selectedWarehouseByItemId[itemKey] ?? '';

    if (details.length > 0) {
      const selectedDetail = details.find((d) => String(d?.warehouseId) === String(selectedWarehouseId)) || null;
      if (!selectedDetail || isOutOfStock(selectedDetail)) return;

      const itemId = item?.itemId ?? item?.id;
      const itemName = item?.itemName || item?.name || '-';

      const currentSelling = toFiniteNumber(selectedDetail?.sellingPrice);
      setPicked({
        itemId,
        itemName,
        warehouseId: selectedDetail?.warehouseId,
        warehouseName: getWarehouseDisplayName(selectedDetail),
        detail: selectedDetail,
      });

      setBasePriceInput(String(toFiniteNumber(selectedDetail?.basePrice) ?? currentSelling ?? '').trim());
      setSellingPriceInput(String(currentSelling ?? '').trim());
      setFieldErrors((prev) => ({ ...prev, selectedItem: undefined, warehouseId: undefined }));
      setShowPicker(false);
      return;
    }

    const itemId = item?.itemId ?? item?.id;
    const itemName = item?.itemName || item?.name || '-';
    setPicked({
      itemId,
      itemName,
      warehouseId: initialWarehouseId || null,
      warehouseName: warehouses?.find((w) => String(w?.warehouseId) === String(initialWarehouseId))?.warehouseName || '',
      detail: null,
    });

    setFieldErrors((prev) => ({ ...prev, selectedItem: undefined }));
    setShowPicker(false);
  };

  const submit = async () => {
    const nextErrors = {};

    if (!picked?.itemId) nextErrors.selectedItem = 'Vui lòng chọn sản phẩm.';
    if (!picked?.warehouseId) nextErrors.warehouseId = 'Vui lòng chọn kho.';

    const selling = toFiniteNumber(sellingPriceInput);
    if (selling == null || selling <= 0) nextErrors.sellingPrice = 'Giá bán phải là số > 0.';

    const base = toFiniteNumber(basePriceInput);
    if (basePriceInput !== '' && (base == null || base < 0)) nextErrors.basePrice = 'Giá gốc không hợp lệ.';

    if (!effectiveFrom) nextErrors.effectiveFrom = 'Vui lòng chọn ngày bắt đầu.';
    if (!effectiveTo) nextErrors.effectiveTo = 'Vui lòng chọn ngày kết thúc.';
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) nextErrors.effectiveTo = 'Ngày kết thúc phải >= ngày bắt đầu.';

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCreateError('Vui lòng kiểm tra lại thông tin.');
      return;
    }

    try {
      setSubmitting(true);
      setCreateError('');

      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const basePrice = toFiniteNumber(basePriceInput) ?? selling;
      const markupMultiplier = basePrice > 0 ? Number((selling / basePrice).toFixed(6)) : 0;

      const payload = {
        warehouseId: Number(picked.warehouseId),
        itemId: Number(picked.itemId),
        basePrice,
        markupMultiplier,
        sellingPrice: selling,
        effectiveFrom,
        effectiveTo,
      };

      const res = await createWarehousePricing(payload, token);
      const message = res?.data?.message || res?.message || 'Tạo giá theo kho thành công.';
      toast.success(message);

      onCreated?.({ warehouseId: picked.warehouseId });
      onClose?.();
    } catch (err) {
      const message = err?.message || 'Không thể tạo giá theo kho.';
      setCreateError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={commonStyles.modalDialog}
      aria-label="Tạo giá theo kho"
      onCancel={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        onClose?.();
      }}
    >
      <div className={`${commonStyles.modal} ${commonStyles.modalWide}`}>
        <div className={commonStyles.modalHeader}>
          <h3 className={commonStyles.modalTitle}>Tạo giá theo kho mới</h3>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={submitting}>
            Đóng
          </button>
        </div>

        <div className={commonStyles.modalBody}>
          {createError ? <div className={styles.errorBanner}>{createError}</div> : null}

          <div className={commonStyles.modalGrid}>
            <div className={commonStyles.full}>
              <strong>Kho:</strong>{' '}
              {picked?.warehouseName
                || warehouses?.find((w) => String(w?.warehouseId) === String(picked?.warehouseId))?.warehouseName
                || warehouses?.find((w) => String(w?.warehouseId) === String(initialWarehouseId))?.warehouseName
                || '-'}
            </div>

            <div className={commonStyles.full}>
              <strong>Sản phẩm đã chọn:</strong> {picked?.itemName || 'Chưa chọn'}
            </div>

            {fieldErrors?.selectedItem ? (
              <div className={commonStyles.full}>
                <div className={styles.errorBanner}>{fieldErrors.selectedItem}</div>
              </div>
            ) : null}

            {fieldErrors?.warehouseId ? (
              <div className={commonStyles.full}>
                <div className={styles.errorBanner}>{fieldErrors.warehouseId}</div>
              </div>
            ) : null}

            <div className={commonStyles.field}>
              <label htmlFor="warehouse-pricing-basePrice">Giá hiện tại</label>
              <input
                id="warehouse-pricing-basePrice"
                className={commonStyles.input}
                type="number"
                step="0.01"
                value={basePriceInput}
                onChange={(e) => setBasePriceInput(e.target.value)}
                placeholder="Nhập giá hiện tại"
              />
              {fieldErrors?.basePrice ? <div className={styles.errorBanner}>{fieldErrors.basePrice}</div> : null}
            </div>

            <div className={commonStyles.field}>
              <label htmlFor="warehouse-pricing-sellingPrice">Giá bán</label>
              <input
                id="warehouse-pricing-sellingPrice"
                className={commonStyles.input}
                type="number"
                step="0.01"
                value={sellingPriceInput}
                onChange={(e) => setSellingPriceInput(e.target.value)}
                placeholder="Nhập giá bán"
              />
              {fieldErrors?.sellingPrice ? <div className={styles.errorBanner}>{fieldErrors.sellingPrice}</div> : null}
            </div>

            <div className={commonStyles.field}>
              <label htmlFor="warehouse-pricing-effectiveFrom">Hiệu lực từ</label>
              <input
                id="warehouse-pricing-effectiveFrom"
                className={commonStyles.input}
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
              {fieldErrors?.effectiveFrom ? <div className={styles.errorBanner}>{fieldErrors.effectiveFrom}</div> : null}
            </div>

            <div className={commonStyles.field}>
              <label htmlFor="warehouse-pricing-effectiveTo">Hiệu lực đến</label>
              <input
                id="warehouse-pricing-effectiveTo"
                className={commonStyles.input}
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
              {fieldErrors?.effectiveTo ? <div className={styles.errorBanner}>{fieldErrors.effectiveTo}</div> : null}
            </div>
          </div>

          {showPicker ? (
            <PickerSection
              search={search}
              onSearchChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              error={error}
              loading={loading}
              results={results}
              page={page}
              pageCount={pageCount}
              size={size}
              totalElements={totalElements}
              onPrev={() => setPage(Math.max(0, page - 1))}
              onNext={() => setPage(page + 1)}
              selectedWarehouseByItemKey={selectedWarehouseByItemId}
              onWarehouseChange={handleWarehouseChange}
              onPick={handlePickItem}
            />
          ) : null}
        </div>

        <div className={commonStyles.modalFooter}>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button type="button" className={styles.primaryButton} onClick={submit} disabled={submitting}>
            Lưu
          </button>
        </div>
      </div>
    </dialog>
  );
}

WarehousePricingCreateModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  warehouses: PropTypes.arrayOf(PropTypes.shape({
    warehouseId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    warehouseName: PropTypes.string,
  })),
  initialWarehouseId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onCreated: PropTypes.func,
};
