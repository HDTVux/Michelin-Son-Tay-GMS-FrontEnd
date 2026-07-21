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
import BlogFormModal from '../PartManagement/BlogFormModal.jsx';

const toNullablePositiveNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
};

// Backend may surface the linked article record under any of these shapes.
const getServiceServiceId = (item) => {
    if (!item || typeof item !== 'object') return null;
    const candidates = [
        item?.serviceServiceId,
        item?.service_service_id,
        item?.serviceId,
        item?.service_id,
        item?.service?.serviceId,
        item?.service?.service_service_id,
    ];
    for (const value of candidates) {
        const parsed = toNullablePositiveNumber(value);
        if (parsed != null) return parsed;
    }
    return null;
};

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

export default function EditItemModal({ item, onClose, onSaved }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Catalog fields
    const [itemName, setItemName] = useState('');
    const [sku, setSku] = useState('');
    const [unit, setUnit] = useState('');
    const [price, setPrice] = useState('');
    const [origin, setOrigin] = useState('');
    const [color, setColor] = useState('');
    const [description, setDescription] = useState('');
    const [compatibleCars, setCompatibleCars] = useState('');
    const [categories, setCategories] = useState([]);
    const [workCategoryId, setWorkCategoryId] = useState('');

    // Nested Warehouse and Lot fields state
    const [warehouseDetailsState, setWarehouseDetailsState] = useState([]);

    // Raw catalog detail payload, kept for the linked article/blog editor below
    const [detailPayload, setDetailPayload] = useState(null);
    const [showBlogEditor, setShowBlogEditor] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!item) return;

            const id = item?.itemId ?? item?.id ?? null;
            if (!id) {
                setError('Không tìm thấy ID phụ tùng.');
                return;
            }

            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
                const [res, catRes] = await Promise.all([
                    fetchWarehouseCatalogItemDetail(id, token),
                    fetchWarehouseItemCategories(token)
                ]);

                const payload = res?.data?.data ?? res?.data ?? res;
                const base = payload ?? {};

                const catList = Array.isArray(catRes?.data?.data ?? catRes?.data ?? catRes)
                    ? (catRes?.data?.data ?? catRes?.data ?? catRes)
                    : [];
                const mappedCats = catList.map((c) => ({
                    id: c.itemCategoryId ?? c.workCategoryId ?? c.workCateId ?? c.id,
                    name: c.categoryName ?? c.name,
                    type: c.categoryType ?? c.type
                })).filter(c => (c.type === 'PART' || !c.type || c.type === 'null') && c.id);

                if (!cancelled) {
                    setDetailPayload(base);
                    setCategories(mappedCats);
                    setItemName(base.itemName || '');
                    setSku(base.sku || '');
                    setUnit(base.unit || '');
                    setPrice(base.price != null ? String(base.price) : '');
                    setOrigin(getItemOriginText(base) || '');
                    setColor(getItemColorText(base) || '');
                    setDescription(base.description || '');
                    setCompatibleCars(base.compatibleCars || '');
                    setWorkCategoryId(base.workCategoryId != null ? String(base.workCategoryId) : '');

                    // Map warehouseDetails hierarchy
                    const whDetails = Array.isArray(base.warehouseDetails) ? base.warehouseDetails : [];
                    setWarehouseDetailsState(
                        whDetails.map((w) => ({
                            ...w,
                            quantity: getWarehouseOnHandQty(w),
                            reservedQuantity: getWarehouseReservedQty(w),
                            sellingPrice: getWarehouseSellingPrice(w),
                            hasCustomPricing: w.hasCustomPricing ?? false,
                            lots: Array.isArray(w.lots)
                                ? w.lots.map((lot) => ({
                                      ...lot,
                                      remainingQuantity: lot.remainingQuantity ?? 0,
                                      sellingPrice: lot.sellingPrice ?? 0,
                                      importPrice: lot.importPrice ?? 0,
                                      markupMultiplier: lot.markupMultiplier ?? 1,
                                  }))
                                : [],
                        }))
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || 'Không thể tải chi tiết sản phẩm.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [item]);

    if (!item) return null;

    const itemHasBlog = getServiceServiceId(detailPayload) != null;

    // Handlers for updating local warehouse values
    const handleWarehouseChange = (whIndex, field, value) => {
        setWarehouseDetailsState((prev) =>
            prev.map((w, idx) => {
                if (idx !== whIndex) return w;
                return { ...w, [field]: value };
            })
        );
    };

    // Handlers for updating local lot values inside a warehouse
    const handleLotChange = (whIndex, lotIndex, field, value) => {
        setWarehouseDetailsState((prev) =>
            prev.map((w, idx) => {
                if (idx !== whIndex) return w;
                const updatedLots = w.lots.map((lot, lIdx) => {
                    if (lIdx !== lotIndex) return lot;
                    const updatedLot = { ...lot, [field]: value };

                    // Recalculations
                    if (field === 'importPrice' || field === 'markupMultiplier' || field === 'markupMultiplierWholesale') {
                        const imp = field === 'importPrice' ? Number(value) : Number(lot.importPrice);
                        const mul = field === 'markupMultiplier' ? Number(value) : Number(lot.markupMultiplier);
                        const mulWholesale = field === 'markupMultiplierWholesale' ? Number(value) : Number(lot.markupMultiplierWholesale ?? lot.markupMultiplier ?? 1.0);
                        if (Number.isFinite(imp) && Number.isFinite(mul)) {
                            updatedLot.sellingPrice = Number((imp * mul).toFixed(2));
                        }
                        if (Number.isFinite(imp) && Number.isFinite(mulWholesale)) {
                            updatedLot.sellingPriceWholesale = Number((imp * mulWholesale).toFixed(2));
                        }
                    } else if (field === 'sellingPrice') {
                        const sel = Number(value);
                        const imp = Number(lot.importPrice);
                        if (Number.isFinite(sel) && Number.isFinite(imp) && imp > 0) {
                            updatedLot.markupMultiplier = Number((sel / imp).toFixed(4));
                        }
                    } else if (field === 'sellingPriceWholesale') {
                        const selWholesale = Number(value);
                        const imp = Number(lot.importPrice);
                        if (Number.isFinite(selWholesale) && Number.isFinite(imp) && imp > 0) {
                            updatedLot.markupMultiplierWholesale = Number((selWholesale / imp).toFixed(4));
                        }
                    }
                    return updatedLot;
                });
                return { ...w, lots: updatedLots };
            })
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!itemName.trim()) {
            toast.error('Tên phụ tùng không được bỏ trống.');
            return;
        }
        if (!sku.trim()) {
            toast.error('Mã SKU không được bỏ trống.');
            return;
        }
        if (!workCategoryId) {
            toast.error('Hạng mục / Nhóm sản phẩm không được bỏ trống.');
            return;
        }

        const priceNum = Number(price);
        if (price !== '' && (!Number.isFinite(priceNum) || priceNum < 0)) {
            toast.error('Giá bán mặc định không hợp lệ.');
            return;
        }

        // Validate warehouse details & lots
        for (const w of warehouseDetailsState) {
            const qty = Number(w.quantity);
            const reserved = Number(w.reservedQuantity);
            const whPrice = Number(w.sellingPrice);

            if (!Number.isFinite(qty) || qty < 0) {
                toast.error(`Số lượng khả dụng ở kho "${w.warehouseName || w.warehouseId}" không hợp lệ.`);
                return;
            }
            if (!Number.isFinite(reserved) || reserved < 0) {
                toast.error(`Số lượng khách giữ ở kho "${w.warehouseName || w.warehouseId}" không hợp lệ.`);
                return;
            }
            if (!Number.isFinite(whPrice) || whPrice < 0) {
                toast.error(`Giá bán ở kho "${w.warehouseName || w.warehouseId}" không hợp lệ.`);
                return;
            }

            for (const lot of w.lots) {
                const lotQty = Number(lot.remainingQuantity);
                const lotPrice = Number(lot.sellingPrice);
                const lotImportPrice = Number(lot.importPrice);
                const lotMarkup = Number(lot.markupMultiplier);

                if (!Number.isFinite(lotQty) || lotQty < 0) {
                    toast.error(`Số lượng lô "${lot.entryCode}" không hợp lệ.`);
                    return;
                }
                if (!Number.isFinite(lotPrice) || lotPrice < 0) {
                    toast.error(`Giá bán lô "${lot.entryCode}" không hợp lệ.`);
                    return;
                }
                if (!Number.isFinite(lotImportPrice) || lotImportPrice < 0) {
                    toast.error(`Giá nhập lô "${lot.entryCode}" không hợp lệ.`);
                    return;
                }
                if (!Number.isFinite(lotMarkup) || lotMarkup < 0) {
                    toast.error(`Hệ số markup lô "${lot.entryCode}" không hợp lệ.`);
                    return;
                }
            }
        }

        setSaving(true);
        setError('');
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
            const id = item?.itemId ?? item?.id;

            // Construct payload
            const payload = {
                itemName: itemName.trim(),
                sku: sku.trim(),
                unit: unit.trim(),
                price: price === '' ? null : priceNum,
                origin: origin.trim(),
                color: color.trim(),
                description: description.trim(),
                compatibleCars: compatibleCars.trim(),
                workCategoryId: workCategoryId === '' ? null : Number(workCategoryId),
                warehouseDetails: warehouseDetailsState.map((w) => ({
                    warehouseId: w.warehouseId,
                    quantity: Number(w.quantity),
                    reservedQuantity: Number(w.reservedQuantity),
                    sellingPrice: w.hasCustomPricing ? Number(w.sellingPrice) : null,
                    lots: w.lots.map((lot) => ({
                        entryItemId: lot.entryItemId,
                        remainingQuantity: Number(lot.remainingQuantity),
                        sellingPrice: Number(lot.sellingPrice),
                        importPrice: Number(lot.importPrice),
                        markupMultiplier: Number(lot.markupMultiplier),
                    })),
                })),
            };

            await updateWarehouseCatalogItem(id, payload, token);
            toast.success('Cập nhật phụ tùng thành công.');
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            setError(err?.message || 'Không thể cập nhật phụ tùng.');
            toast.error(err?.message || 'Không thể cập nhật phụ tùng.');
        } finally {
            setSaving(false);
        }
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
                disabled={saving}
            />
            <div className={styles['modal-box']} style={{ width: 'min(1000px, 95vw)', position: 'relative', zIndex: 10 }}>
                <div className={styles['modal-header']}>
                    <h3>Chỉnh sửa danh mục & Tồn kho</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            className={styles['ghost-button']}
                            onClick={() => setShowBlogEditor(true)}
                            disabled={loading || saving}
                            title={itemHasBlog ? 'Sửa bài viết phụ tùng' : 'Tạo bài viết phụ tùng'}
                        >
                            {itemHasBlog ? 'Sửa bài viết' : 'Tạo bài viết'}
                        </button>
                        <button type="button" className={styles['modal-close']} onClick={onClose} aria-label="Đóng" disabled={saving}>
                            ×
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSave} className={styles['modal-body']}>
                    {loading && <div className={styles['empty-row']}>Đang tải chi tiết...</div>}
                    {error && <div className={styles['error-banner']}>{error}</div>}

                    {!loading && (
                        <>
                            {/* Catalog Information Section */}
                            <div className={styles['modal-section']}>
                                <div className={styles['modal-section-title']}>Thông tin danh mục</div>
                                <div className={styles['field-row']}>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-name">Tên phụ tùng <span className={styles['required']}>*</span></label>
                                        <input
                                            id="edit-item-name"
                                            value={itemName}
                                            onChange={(e) => setItemName(e.target.value)}
                                            required
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-sku">Mã SKU <span className={styles['required']}>*</span></label>
                                        <input
                                            id="edit-item-sku"
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            required
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                                <div className={styles['field-row']}>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-category">Hạng mục / Nhóm sản phẩm <span className={styles['required']}>*</span></label>
                                        <select
                                            id="edit-item-category"
                                            value={workCategoryId}
                                            onChange={(e) => setWorkCategoryId(e.target.value)}
                                            disabled={saving}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                fontSize: '14px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '6px',
                                                backgroundColor: '#ffffff',
                                                height: '42px'
                                            }}
                                        >
                                            <option value="">-- Chọn hạng mục --</option>
                                            {categories.map((c) => (
                                                <option key={String(c.id)} value={String(c.id)}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-unit">Đơn vị</label>
                                        <input
                                            id="edit-item-unit"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                                <div className={styles['field-row']}>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-price">Giá mặc định (₫)</label>
                                        <input
                                            id="edit-item-price"
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-origin">Xuất xứ</label>
                                        <input
                                            id="edit-item-origin"
                                            value={origin}
                                            onChange={(e) => setOrigin(e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                                <div className={styles['field-row']}>
                                    <div className={styles['field']}>
                                        <label htmlFor="edit-item-color">Màu</label>
                                        <input
                                            id="edit-item-color"
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className={styles['field']}>
                                        <label>Xe tương thích</label>
                                        <CompatibleCarsSelector
                                            value={compatibleCars}
                                            onChange={setCompatibleCars}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                                <div className={styles['field']}>
                                    <label htmlFor="edit-item-description">Mô tả</label>
                                    <textarea
                                        id="edit-item-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            {/* Inventory and Lot Configuration per Warehouse */}
                            <div className={styles['modal-section']}>
                                <div className={styles['modal-section-title']}>Tồn kho & Lô hàng</div>
                                {warehouseDetailsState.map((w, whIdx) => (
                                    <div
                                        key={String(w.warehouseId)}
                                        style={{
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            marginBottom: '16px',
                                            backgroundColor: '#f8fafc',
                                        }}
                                    >
                                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '12px' }}>
                                            📍 {w.warehouseName || `Kho ID #${w.warehouseId}`}
                                        </div>

                                        {/* Warehouse Inventory Controls */}
                                        <div className={styles['field-row']} style={{ marginBottom: '12px' }}>
                                            <div className={styles['field']}>
                                                <label>Số lượng khả dụng (Hàng tồn)</label>
                                                <input
                                                    type="number"
                                                    value={w.quantity}
                                                    onChange={(e) => handleWarehouseChange(whIdx, 'quantity', e.target.value)}
                                                    disabled={saving}
                                                    min={0}
                                                />
                                            </div>
                                            <div className={styles['field']}>
                                                <label>Khách giữ hàng (Hàng giữ)</label>
                                                <input
                                                    type="number"
                                                    value={w.reservedQuantity}
                                                    onChange={(e) => handleWarehouseChange(whIdx, 'reservedQuantity', e.target.value)}
                                                    disabled={saving}
                                                    min={0}
                                                />
                                            </div>
                                            <div className={styles['field']}>
                                                <label>Giá bán tại kho (₫)</label>
                                                <input
                                                    type="number"
                                                    value={w.sellingPrice}
                                                    onChange={(e) => handleWarehouseChange(whIdx, 'sellingPrice', e.target.value)}
                                                    disabled={saving || !w.hasCustomPricing}
                                                    min={0}
                                                />
                                                {!w.hasCustomPricing && (
                                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                                        Chưa cấu hình giá riêng.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Lots / Batches controls */}
                                        {w.lots && w.lots.length > 0 && (
                                            <div style={{ marginTop: '12px' }}>
                                                <div style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                                                    Danh sách lô hàng ({w.lots.length})
                                                </div>
                                                {/* Desktop: Table layout */}
                                                <div className={styles['desktop-lots-table']}>
                                                    <div className={styles['spec-table-wrap']}>
                                                        <table className={styles['spec-table']}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Mã lô (Entry Code)</th>
                                                                    <th>Ngày nhập</th>
                                                                    <th>Số lượng tồn lô</th>
                                                                    <th>Giá nhập lô (₫)</th>
                                                                    <th>Hệ số markup lẻ</th>
                                                                    <th>Giá bán lẻ lô (₫)</th>
                                                                    <th>Hệ số markup buôn</th>
                                                                    <th>Giá bán buôn lô (₫)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {w.lots.map((lot, lotIdx) => (
                                                                    <tr key={String(lot.entryItemId || lotIdx)}>
                                                                        <td style={{ fontWeight: '600' }}>{lot.entryCode || '-'}</td>
                                                                        <td>{lot.entryDate ? new Date(lot.entryDate).toLocaleDateString('vi-VN') : '-'}</td>
                                                                        <td>
                                                                            <input
                                                                                type="number"
                                                                                value={lot.remainingQuantity}
                                                                                onChange={(e) => handleLotChange(whIdx, lotIdx, 'remainingQuantity', e.target.value)}
                                                                                style={{ padding: '6px 8px', width: '80px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                                disabled={saving}
                                                                                min={0}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                type="number"
                                                                                value={lot.importPrice}
                                                                                onChange={(e) => handleLotChange(whIdx, lotIdx, 'importPrice', e.target.value)}
                                                                                style={{ padding: '6px 8px', width: '100px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                                disabled={saving}
                                                                                min={0}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                type="number"
                                                                                step="0.0001"
                                                                                value={lot.markupMultiplier}
                                                                                onChange={(e) => handleLotChange(whIdx, lotIdx, 'markupMultiplier', e.target.value)}
                                                                                style={{ padding: '6px 8px', width: '80px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                                disabled={saving}
                                                                                min={0}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                type="number"
                                                                                value={lot.sellingPrice}
                                                                                onChange={(e) => handleLotChange(whIdx, lotIdx, 'sellingPrice', e.target.value)}
                                                                                style={{ padding: '6px 8px', width: '110px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                                disabled={saving}
                                                                                min={0}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                type="number"
                                                                                step="0.0001"
                                                                                value={lot.markupMultiplierWholesale ?? lot.markupMultiplier ?? 1.0}
                                                                                onChange={(e) => handleLotChange(whIdx, lotIdx, 'markupMultiplierWholesale', e.target.value)}
                                                                                style={{ padding: '6px 8px', width: '80px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                                disabled={saving}
                                                                                min={0}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                type="number"
                                                                                value={lot.sellingPriceWholesale ?? lot.sellingPrice ?? 0}
                                                                                onChange={(e) => handleLotChange(whIdx, lotIdx, 'sellingPriceWholesale', e.target.value)}
                                                                                style={{ padding: '6px 8px', width: '110px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                                disabled={saving}
                                                                                min={0}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Mobile: Card-based input list */}
                                                <div className={styles['mobile-lots-list']}>
                                                    {w.lots.map((lot, lotIdx) => (
                                                        <div key={String(lot.entryItemId || lotIdx)} className={styles['mobile-lot-card']}>
                                                            <div className={styles['mobile-lot-card__header']}>
                                                                <span className={styles['mobile-lot-card__code']}>Lô: {lot.entryCode || '-'}</span>
                                                                <span className={styles['mobile-lot-card__date']}>{lot.entryDate ? new Date(lot.entryDate).toLocaleDateString('vi-VN') : '-'}</span>
                                                            </div>
                                                            <div className={styles['mobile-lot-card__grid']}>
                                                                <div className={styles['mobile-lot-field']}>
                                                                    <label>Tồn lô</label>
                                                                    <input
                                                                        type="number"
                                                                        value={lot.remainingQuantity}
                                                                        onChange={(e) => handleLotChange(whIdx, lotIdx, 'remainingQuantity', e.target.value)}
                                                                        disabled={saving}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <div className={styles['mobile-lot-field']}>
                                                                    <label>Giá nhập (₫)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={lot.importPrice}
                                                                        onChange={(e) => handleLotChange(whIdx, lotIdx, 'importPrice', e.target.value)}
                                                                        disabled={saving}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <div className={styles['mobile-lot-field']}>
                                                                    <label>Markup lẻ</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.0001"
                                                                        value={lot.markupMultiplier}
                                                                        onChange={(e) => handleLotChange(whIdx, lotIdx, 'markupMultiplier', e.target.value)}
                                                                        disabled={saving}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <div className={styles['mobile-lot-field']}>
                                                                    <label>Giá lẻ (₫)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={lot.sellingPrice}
                                                                        onChange={(e) => handleLotChange(whIdx, lotIdx, 'sellingPrice', e.target.value)}
                                                                        disabled={saving}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <div className={styles['mobile-lot-field']}>
                                                                    <label>Markup buôn</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.0001"
                                                                        value={lot.markupMultiplierWholesale ?? lot.markupMultiplier ?? 1.0}
                                                                        onChange={(e) => handleLotChange(whIdx, lotIdx, 'markupMultiplierWholesale', e.target.value)}
                                                                        disabled={saving}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <div className={styles['mobile-lot-field']}>
                                                                    <label>Giá buôn (₫)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={lot.sellingPriceWholesale ?? lot.sellingPrice ?? 0}
                                                                        onChange={(e) => handleLotChange(whIdx, lotIdx, 'sellingPriceWholesale', e.target.value)}
                                                                        disabled={saving}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Actions Footer */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    className={styles['ghost-button']}
                                    onClick={onClose}
                                    disabled={saving}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className={styles['primary-button']}
                                    disabled={saving}
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>

            {showBlogEditor && (
                <BlogFormModal
                    item={{
                        ...detailPayload,
                        itemId: item?.itemId ?? item?.id,
                        itemType: 'PART',
                    }}
                    mode={itemHasBlog ? 'edit' : 'createFromCatalog'}
                    onClose={() => setShowBlogEditor(false)}
                    onSaved={(saved) => {
                        setDetailPayload((prev) => ({ ...(prev || {}), ...saved }));
                        setShowBlogEditor(false);
                    }}
                />
            )}
        </div>
    );
}

EditItemModal.propTypes = {
    item: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func,
};
