import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './WarehouseManagement.module.css';
import { fetchWarehouseCatalogItemDetail, fetchWarehouseSpecificationsByCatalogItemId } from '../../../services/warehouseService.js';
import { getItemColorText, getItemOriginText } from '../PartManagement/itemFormatters.js';

const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
};

const getWarehouseDisplayName = (detail) => {
    return String(detail?.warehouseName || detail?.warehouseCode || detail?.warehouseId || '').trim() || '-';
};

const getWarehouseOnHandQty = (detail) => {
    const qty = toFiniteNumber(detail?.quantity ?? detail?.stockQuantity ?? detail?.stock_quantity);
    return qty;
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
    return toFiniteNumber(
        detail?.sellingPrice
        ?? detail?.selling_price
        ?? detail?.price
        ?? detail?.unitPrice
        ?? detail?.unit_price,
    );
};

const formatCurrencyVnd = (value) => {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(n)) return '-';
    return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};

const formatTaxRatePercent = (value) => {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(n)) return '-';

    // Support both 0-1 (e.g. 0.1) and 0-100 (e.g. 10)
    const percent = n > 0 && n <= 1 ? n * 100 : n;
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(percent)}%`;
};


export default function ItemDetailModal({ item, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!item) return;

            const id = item?.itemId ?? item?.id ?? null;
            if (!id) {
                setDetail(item);
                return;
            }

            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetchWarehouseCatalogItemDetail(id, token);

                const payload = res?.data?.data ?? res?.data ?? res;
                let base = payload ?? {};

                if (!base.specifications || !Array.isArray(base.specifications) || base.specifications.length === 0) {
                    try {
                        const specsRes = await fetchWarehouseSpecificationsByCatalogItemId(id, token);
                        const specsPayload = specsRes?.data?.data ?? specsRes?.data ?? specsRes;
                        base.specifications = Array.isArray(specsPayload) ? specsPayload : [];
                    } catch {
                        base.specifications = base.specifications ?? [];
                    }
                }

                if (!cancelled) setDetail(base);
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || 'Không thể tải chi tiết sản phẩm.');
                    setDetail(item);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [item]);

    if (!item) return null;

    const display = detail ?? item;
    const priceText = display?.showPrice ? `${formatCurrencyVnd(display?.price)} ₫` : 'Liên hệ';
    const tax = display?.taxRule ?? display?.tax ?? null;
    const taxName = tax?.taxName || '-';
    const taxRateText = formatTaxRatePercent(tax?.taxRate);
    const taxText = taxName === '-' && taxRateText === '-' ? '-' : `${taxName} (${taxRateText})`;
    const brandText = typeof display?.brandId === 'string'
        ? display.brandId
        : (display?.brand?.brandName || '-');

    const productLineText = typeof display?.productLine === 'string'
        ? display.productLine
        : (display?.productLine?.lineName || display?.productLineId || '-');

    const specs = Array.isArray(display?.specifications) ? display.specifications : [];
    const originText = getItemOriginText(display);
    const colorText = getItemColorText(display);
    const warehouseDetails = Array.isArray(display?.warehouseDetails) ? display.warehouseDetails : [];
    const showPriceByPolicy = Boolean(display?.showPrice);

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
            />
            <div
                className={styles['modal-box']}
            >
                <div className={styles['modal-header']}>
                    <h3 id="item-detail-title">Chi tiết phụ tùng</h3>
                    <button type="button" className={styles['modal-close']} onClick={onClose} aria-label="Đóng">
                        ×
                    </button>
                </div>

                <div className={styles['modal-body']}>
                    {loading && <div className={styles['empty-row']}>Đang tải chi tiết...</div>}
                    {error && <div className={styles['error-banner']}>{error}</div>}

                    <div className={styles['modal-section']}>
                        <div className={styles['modal-section-title']}>Thông tin chính</div>
                        <table className={styles['detail-table']}>
                            <tbody>
                                <tr><th>ID</th><td>{display?.itemId ?? '-'}</td></tr>
                                <tr><th>Tên</th><td>{display?.itemName || '-'}</td></tr>
                                <tr><th>SKU</th><td>{display?.sku || '-'}</td></tr>
                                <tr><th>Hãng</th><td>{brandText}</td></tr>
                                <tr><th>Dòng sản phẩm</th><td>{productLineText}</td></tr>
                                <tr><th>Giá</th><td>{priceText}</td></tr>
                                <tr><th>Thuế</th><td>{taxText}</td></tr>
                                <tr><th>Đơn vị</th><td>{display?.unit || '-'}</td></tr>
                                <tr><th>Xuất xứ</th><td>{originText}</td></tr>
                                <tr><th>Màu</th><td>{colorText}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className={styles['modal-section']}>
                        <div className={styles['modal-section-title']}>Tồn kho theo kho</div>
                        <div className={styles['spec-table-wrap']}>
                            <table className={styles['spec-table']}>
                                <thead>
                                    <tr>
                                        <th>KHO</th>
                                        <th>SỐ LƯỢNG</th>
                                        <th>ĐANG GIỮ</th>
                                        <th>GIÁ (KHO)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {warehouseDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className={styles['empty-row-compact']}>
                                                Không có dữ liệu kho.
                                            </td>
                                        </tr>
                                    ) : (
                                        warehouseDetails.map((w, idx) => {
                                            const qty = getWarehouseOnHandQty(w);
                                            const reservedQty = getWarehouseReservedQty(w);
                                            const sellingPrice = getWarehouseSellingPrice(w);
                                            const qtyText = qty == null ? '-' : new Intl.NumberFormat('vi-VN').format(qty);
                                            const reservedText = reservedQty == null ? '-' : new Intl.NumberFormat('vi-VN').format(reservedQty);
                                            let priceTextByWarehouse = '-';
                                            if (!showPriceByPolicy) priceTextByWarehouse = 'Liên hệ';
                                            else if (sellingPrice != null) priceTextByWarehouse = `${formatCurrencyVnd(sellingPrice)} ₫`;

                                            return (
                                                <tr key={String(w?.warehouseId ?? w?.warehouseCode ?? `${idx}`)}>
                                                    <td>{getWarehouseDisplayName(w)}</td>
                                                    <td>{qtyText}</td>
                                                    <td>{reservedText}</td>
                                                    <td>{priceTextByWarehouse}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles['modal-section']}>
                        <div className={styles['modal-section-title']}>Mô tả</div>
                        <div className={styles['modal-text']}>{display?.description || '—'}</div>
                    </div>

                    <div className={styles['modal-section']}>
                        <div className={styles['modal-section-title']}>Thông số</div>
                        <div className={styles['spec-table-wrap']}>
                            <table className={styles['spec-table']}>
                                <thead>
                                    <tr>
                                        <th>THÔNG SỐ</th>
                                        <th>GIÁ TRỊ</th>
                                        <th>ĐƠN VỊ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {specs.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className={styles['empty-row-compact']}>
                                                Không có thông số.
                                            </td>
                                        </tr>
                                    ) : (
                                        specs.map((s) => (
                                            <tr key={String(s?.attributeCode ?? s?.specId ?? `${s?.specType}-${s?.specValue}`)}>
                                                <td>{s?.displayName || '-'}</td>
                                                <td>{s?.specValue || s?.value || '-'}</td>
                                                <td>{s?.unit || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

ItemDetailModal.propTypes = {
    item: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};
