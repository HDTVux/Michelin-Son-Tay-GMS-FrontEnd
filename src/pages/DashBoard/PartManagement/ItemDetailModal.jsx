import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Package } from 'lucide-react';
import styles from './ServiceManagement.module.css';
import { fetchWarehouseCatalogItemDetail, fetchWarehouseSpecificationsByCatalogItemId } from '../../../services/warehouseService.js';
import { fetchHomeServiceDetail, fetchHomeProductDetail } from '../../../services/homeService.js';
import { getItemColorText, getItemOriginText } from './itemFormatters.js';

const toNullablePositiveNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
};

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

const normalizeSpecLabelKey = (value) => (
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
);

const isInfoSpecLabel = (value) => {
    const key = normalizeSpecLabelKey(value);
    return [
        'ten',
        'ten san pham',
        'loai san pham',
        'loai hang muc',
        'thong tin nguon',
        'du lieu nguon',
        'source',
        'source info',
        'source information',
        'raw source',
        'dong san pham',
        'product line',
        'don vi',
        'unit',
        'xuat xu',
        'origin',
        'made in',
        'mau',
        'color',
        'colour',
    ].includes(key) || /^thong so \d+$/.test(key);
};

const getSpecDisplayName = (spec) => (
    String(
        spec?.displayName
        || spec?.attributeName
        || spec?.attributeCode
        || spec?.specType
        || spec?.name
        || spec?.label
        || '',
    ).trim()
);

const getSpecValue = (spec) => (
    String(
        spec?.specValue
        ?? spec?.value
        ?? spec?.attributeValue
        ?? spec?.specificationValue
        ?? '',
    ).trim()
);

const getTechnicalSpecs = (specifications) => {
    const specs = Array.isArray(specifications) ? specifications : [];
    return specs
        .map((spec, index) => {
            const name = getSpecDisplayName(spec);
            const value = getSpecValue(spec);
            const unit = String(spec?.unit ?? spec?.specUnit ?? '').trim();
            if (!name || isInfoSpecLabel(name) || (!value && !unit)) return null;
            return {
                key: String(spec?.attributeCode ?? spec?.specId ?? spec?.attributeId ?? `${name}-${value}-${index}`),
                name,
                value: value || '-',
                unit: unit || '-',
            };
        })
        .filter(Boolean);
};

export default function ItemDetailModal({ item, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [imageError, setImageError] = useState(false);

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
 
                 // Fetch linked service (blog) post to get the main image
                 const serviceId = getServiceServiceId(item) || getServiceServiceId(base);
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
 
                 if (serviceDetail) {
                     let serviceImg = null;
 
                     // 1. Prioritize cover image (ảnh bìa)
                     serviceImg = serviceDetail.thumbnailUrl || serviceDetail.mediaThumbnail || serviceDetail.imageUrl;
 
                     // 2. Fallback to first non-video media from media/mediaList
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
 
                     // 3. Fallback to first <img> tag from HTML content
                     if (!serviceImg) {
                         const htmlContent = serviceDetail.fullDescription || serviceDetail.descriptionHtml || serviceDetail.description || '';
                         const match = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
                         if (match && match[1]) {
                             serviceImg = match[1];
                         }
                     }
 
                     if (serviceImg) {
                         base.imageUrl = serviceImg;
                         base.thumbnailUrl = serviceImg;
                         base.mediaThumbnail = serviceImg;
                     }
                 }
 
                 if (!base.specifications || !Array.isArray(base.specifications) || base.specifications.length === 0) {
                     try {
                         const specsRes = await fetchWarehouseSpecificationsByCatalogItemId(id, token);
                         const specsPayload = specsRes?.data?.data ?? specsRes?.data ?? specsRes;
                         base.specifications = Array.isArray(specsPayload) ? specsPayload : [];
                     } catch {
                         base.specifications = base.specifications ?? [];
                     }
                 }
 
                 if (!cancelled) {
                     setDetail(base);
                     setImageError(false);
                 }
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || 'Không thể tải chi tiết sản phẩm.');
                    setDetail(item);
                    setImageError(false);
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

    const specs = getTechnicalSpecs(display?.specifications);
    const originText = getItemOriginText(display);
    const colorText = getItemColorText(display);
    const imgUrl = display?.imageUrl || display?.thumbnailUrl || display?.mediaThumbnail || display?.photoUrl || '';

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
                        <div className={styles['info-layout']}>
                            <div className={styles['image-container']}>
                                {imgUrl && !imageError ? (
                                    <img
                                        src={imgUrl}
                                        alt={display?.itemName}
                                        className={styles['item-detail-image']}
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className={styles['image-placeholder']}>
                                        <Package size={48} />
                                        <span>Không có ảnh</span>
                                    </div>
                                )}
                            </div>
                            <div className={styles['table-container']}>
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
                                            <tr key={s.key}>
                                                <td>{s.name}</td>
                                                <td>{s.value}</td>
                                                <td>{s.unit}</td>
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
