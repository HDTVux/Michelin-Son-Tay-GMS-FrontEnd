import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import styles from './WarehouseManagement.module.css';
import CompatibleCarsSelector from '../../../components/CompatibleCarsSelector.jsx';
import {
    fetchWarehouseCatalogItemDetail,
    updateWarehouseCatalogItem,
    fetchWarehouseItemCategories,
} from '../../../services/warehouseService.js';
import { getItemColorText, getItemOriginText } from '../PartManagement/itemFormatters.js';

const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
};

const getWarehouseOnHandQty = (detail) => {
    const qty = toFiniteNumber(detail?.quantity ?? detail?.stockQuantity ?? detail?.stock_quantity);
    return qty ?? 0;
};

const getWarehouseReservedQty = (detail) => {
    const reserved = toFiniteNumber(detail?.reservedQuantity ?? detail?.reservedStockLevel ?? detail?.reserved_stock_level);
    return reserved ?? 0;
};

const getWarehouseSellingPrice = (detail) => {
    return toFiniteNumber(detail?.sellingPrice ?? detail?.selling_price ?? detail?.price ?? detail?.unitPrice ?? detail?.unit_price) ?? 0;
};

// Rebuilds the exact warehouseDetails/lots payload shape the update endpoint expects,
// unchanged, so a bulk edit of catalog fields never touches stock/pricing data.
const buildWarehouseDetailsPayload = (rawWarehouseDetails) => {
    const list = Array.isArray(rawWarehouseDetails) ? rawWarehouseDetails : [];
    return list.map((w) => ({
        warehouseId: w.warehouseId,
        quantity: getWarehouseOnHandQty(w),
        reservedQuantity: getWarehouseReservedQty(w),
        sellingPrice: w.hasCustomPricing ? getWarehouseSellingPrice(w) : null,
        lots: Array.isArray(w.lots)
            ? w.lots.map((lot) => ({
                  entryItemId: lot.entryItemId,
                  remainingQuantity: toFiniteNumber(lot.remainingQuantity) ?? 0,
                  sellingPrice: toFiniteNumber(lot.sellingPrice) ?? 0,
                  importPrice: toFiniteNumber(lot.importPrice) ?? 0,
                  markupMultiplier: toFiniteNumber(lot.markupMultiplier) ?? 1,
              }))
            : [],
    }));
};

const FIELD_DEFS = [
    { key: 'workCategoryId', label: 'Hạng mục / Nhóm sản phẩm', type: 'category' },
    { key: 'unit', label: 'Đơn vị', type: 'text' },
    { key: 'price', label: 'Giá mặc định (₫)', type: 'number' },
    { key: 'origin', label: 'Xuất xứ', type: 'text' },
    { key: 'color', label: 'Màu', type: 'text' },
    { key: 'compatibleCars', label: 'Xe tương thích', type: 'compatibleCars' },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
];

const buildInitialFieldState = () =>
    FIELD_DEFS.reduce((acc, f) => {
        acc[f.key] = { enabled: false, value: '' };
        return acc;
    }, {});

export default function BulkEditItemsModal({ items, onClose, onSaved }) {
    const [fields, setFields] = useState(buildInitialFieldState);
    const [categories, setCategories] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
                const catRes = await fetchWarehouseItemCategories(token);
                const catList = Array.isArray(catRes?.data?.data ?? catRes?.data ?? catRes)
                    ? (catRes?.data?.data ?? catRes?.data ?? catRes)
                    : [];
                const mappedCats = catList
                    .map((c) => ({
                        id: c.itemCategoryId ?? c.workCategoryId ?? c.workCateId ?? c.id,
                        name: c.categoryName ?? c.name,
                        type: c.categoryType ?? c.type,
                    }))
                    .filter((c) => (c.type === 'PART' || !c.type || c.type === 'null') && c.id);
                if (!cancelled) setCategories(mappedCats);
            } catch {
                if (!cancelled) setCategories([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!items || items.length === 0) return null;

    const setFieldEnabled = (key, enabled) => {
        setFields((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }));
    };

    const setFieldValue = (key, value) => {
        setFields((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
    };

    const enabledFieldKeys = FIELD_DEFS.filter((f) => fields[f.key].enabled).map((f) => f.key);

    const handleSave = async (e) => {
        e.preventDefault();
        if (enabledFieldKeys.length === 0) {
            toast.error('Chọn ít nhất một trường muốn sửa hàng loạt.');
            return;
        }
        if (fields.price.enabled) {
            const priceNum = Number(fields.price.value);
            if (fields.price.value !== '' && (!Number.isFinite(priceNum) || priceNum < 0)) {
                toast.error('Giá bán mặc định không hợp lệ.');
                return;
            }
        }

        setIsSaving(true);
        setProgress({ done: 0, total: items.length });
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        let successCount = 0;
        let failCount = 0;

        for (const item of items) {
            const id = item?.itemId ?? item?.id;
            try {
                const res = await fetchWarehouseCatalogItemDetail(id, token);
                const detail = res?.data?.data ?? res?.data ?? res ?? {};

                const payload = {
                    itemName: detail.itemName || '',
                    sku: detail.sku || '',
                    unit: fields.unit.enabled ? fields.unit.value.trim() : (detail.unit || ''),
                    price: fields.price.enabled
                        ? (fields.price.value === '' ? null : Number(fields.price.value))
                        : (detail.price ?? null),
                    origin: fields.origin.enabled ? fields.origin.value.trim() : (getItemOriginText(detail) || ''),
                    color: fields.color.enabled ? fields.color.value.trim() : (getItemColorText(detail) || ''),
                    description: fields.description.enabled ? fields.description.value.trim() : (detail.description || ''),
                    compatibleCars: fields.compatibleCars.enabled ? fields.compatibleCars.value.trim() : (detail.compatibleCars || ''),
                    workCategoryId: fields.workCategoryId.enabled
                        ? (fields.workCategoryId.value === '' ? null : Number(fields.workCategoryId.value))
                        : (detail.workCategoryId != null ? Number(detail.workCategoryId) : null),
                    warehouseDetails: buildWarehouseDetailsPayload(detail.warehouseDetails),
                };

                await updateWarehouseCatalogItem(id, payload, token);
                successCount += 1;
            } catch {
                failCount += 1;
            } finally {
                setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
            }
        }

        setIsSaving(false);
        if (successCount > 0) {
            toast.success(`Đã cập nhật ${successCount} phụ tùng thành công.${failCount > 0 ? ` ${failCount} phụ tùng lỗi.` : ''}`);
        } else {
            toast.error('Không cập nhật được phụ tùng nào.');
        }
        if (successCount > 0 && onSaved) onSaved();
        else if (successCount === 0 && failCount === 0) onClose();
    };

    return (
        <div className={styles['modal-overlay']}>
            <button
                type="button"
                className={styles['modal-backdrop']}
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                }}
                aria-label="Đóng"
                disabled={isSaving}
            />
            <div className={styles['modal-box']} style={{ width: 'min(760px, 95vw)', position: 'relative', zIndex: 10 }}>
                <div className={styles['modal-header']}>
                    <h3>Sửa hàng loạt ({items.length} phụ tùng)</h3>
                    <button type="button" className={styles['modal-close']} onClick={onClose} aria-label="Đóng" disabled={isSaving}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSave} className={styles['modal-body']}>
                    <div className={styles['modal-section']}>
                        <div className={styles['modal-section-title']}>Thông tin danh mục</div>
                        <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
                            Tick vào trường muốn áp dụng cho tất cả {items.length} phụ tùng đã chọn. Tên phụ tùng và Mã SKU không
                            thể sửa hàng loạt.
                        </p>

                        {FIELD_DEFS.map((f) => (
                            <div key={f.key} className={styles['field-row']} style={{ alignItems: 'center' }}>
                                <div className={styles['field']} style={{ flex: '0 0 auto' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                        <input
                                            type="checkbox"
                                            checked={fields[f.key].enabled}
                                            onChange={(e) => setFieldEnabled(f.key, e.target.checked)}
                                            disabled={isSaving}
                                        />
                                        {f.label}
                                    </label>
                                </div>
                                <div className={styles['field']} style={{ flex: 1 }}>
                                    {f.type === 'category' && (
                                        <select
                                            value={fields[f.key].value}
                                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                                            disabled={!fields[f.key].enabled || isSaving}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                fontSize: '14px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '6px',
                                                backgroundColor: '#ffffff',
                                                height: '42px',
                                            }}
                                        >
                                            <option value="">-- Chọn hạng mục --</option>
                                            {categories.map((c) => (
                                                <option key={String(c.id)} value={String(c.id)}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {f.type === 'text' && (
                                        <input
                                            value={fields[f.key].value}
                                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                                            disabled={!fields[f.key].enabled || isSaving}
                                        />
                                    )}
                                    {f.type === 'number' && (
                                        <input
                                            type="number"
                                            value={fields[f.key].value}
                                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                                            disabled={!fields[f.key].enabled || isSaving}
                                        />
                                    )}
                                    {f.type === 'textarea' && (
                                        <textarea
                                            value={fields[f.key].value}
                                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                                            disabled={!fields[f.key].enabled || isSaving}
                                            rows={3}
                                        />
                                    )}
                                    {f.type === 'compatibleCars' && (
                                        <CompatibleCarsSelector
                                            value={fields[f.key].value}
                                            onChange={(v) => setFieldValue(f.key, v)}
                                            disabled={!fields[f.key].enabled || isSaving}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isSaving && (
                        <div className={styles['empty-row']}>
                            Đang cập nhật {progress.done}/{progress.total}...
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button type="button" className={styles['ghost-button']} onClick={onClose} disabled={isSaving}>
                            Hủy
                        </button>
                        <button type="submit" className={styles['primary-button']} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : `Áp dụng cho ${items.length} phụ tùng`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

BulkEditItemsModal.propTypes = {
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func,
};
