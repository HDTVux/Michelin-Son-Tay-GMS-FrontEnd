import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ServiceManagement.module.css';
import { fetchWarehouseCatalogItemDetail, fetchWarehouseSpecificationsByCatalogItemId } from '../../../services/warehouseService.js';
import { getItemColorText, getItemOriginText } from './itemFormatters.js';

const formatCurrencyVnd = (value) => {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(n)) return '-';
    return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};

const formatItemTypeLabel = (itemType) => {
    if (itemType === 'PART') return 'Phụ tùng';
    if (itemType === 'SERVICE') return 'Dịch vụ';
    return itemType || '-';
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
    const typeText = formatItemTypeLabel(display?.itemType);

    const brandText = typeof display?.brandId === 'string'
        ? display.brandId
        : (display?.brand?.brandName || '-');

    const productLineText = typeof display?.productLine === 'string'
        ? display.productLine
        : (display?.productLine?.lineName || display?.productLineId || '-');

    const specs = Array.isArray(display?.specifications) ? display.specifications : [];
    const originText = getItemOriginText(display);
    const colorText = getItemColorText(display);

    return (
        <div
            className={styles['modal-overlay']}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles['modal-box']} onClick={(e) => e.stopPropagation()}>
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
                                <tr><th>Loại</th><td>{typeText}</td></tr>
                                <tr><th>Hãng</th><td>{brandText}</td></tr>
                                <tr><th>Dòng sản phẩm</th><td>{productLineText}</td></tr>
                                <tr><th>Giá</th><td>{priceText}</td></tr>
                                <tr><th>Đơn vị</th><td>{display?.unit || '-'}</td></tr>
                                <tr><th>Xuất xứ</th><td>{originText}</td></tr>
                                <tr><th>Màu</th><td>{colorText}</td></tr>
                            </tbody>
                        </table>
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
