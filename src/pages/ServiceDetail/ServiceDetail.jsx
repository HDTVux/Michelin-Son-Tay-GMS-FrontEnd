import styles from './ServiceDetail.module.css';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchHomeProductDetail, fetchHomeServiceDetail } from '../../services/homeService';
import {
  fetchWarehouseCatalogItemDetail,
  fetchWarehouseSpecificationsByCatalogItemId,
} from '../../services/warehouseService.js';
import serviceFallback from '../../assets/lop and mam.jpg';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const isMeaningfulValue = (value) => {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const mergeWithMeaningfulFallback = (primary, ...fallbacks) => {
  const base = primary && typeof primary === 'object' ? { ...primary } : {};
  fallbacks.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    Object.entries(item).forEach(([key, value]) => {
      if (!isMeaningfulValue(value)) return;
      if (isMeaningfulValue(base[key])) return;
      base[key] = value;
    });
  });
  return base;
};

const toBoolean = (value, fallback = false) => {
  if (value === true || value === false) return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'active', 'enabled', 'published'].includes(t)) return true;
    if (['false', '0', 'no', 'inactive', 'disabled', 'unpublished'].includes(t)) return false;
  }
  return fallback;
};

const toPriceNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/liên hệ|lien he/i.test(text)) return null;
  const normalized = text.replace(/[^\d]/g, '');
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const withVndSuffix = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  const num = toPriceNumber(text);
  if (num != null) return `${num.toLocaleString('vi-VN')} VND`;
  if (/liên hệ|lien he/i.test(text)) return text;
  return /vnd/i.test(text) ? text : `${text} VND`;
};

const pickFirstText = (item, keys, fallback = '') => {
  for (const key of keys) {
    const value = item?.[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text && text !== '-') return text;
  }
  return fallback;
};

const getOriginText = (item, fallback = '') => (
  pickFirstText(item, [
    'origin',
    'itemOrigin',
    'originCountry',
    'countryOfOrigin',
    'country_origin',
    'madeIn',
  ], fallback)
);

const getColorText = (item, fallback = '') => (
  pickFirstText(item, [
    'color',
    'itemColor',
    'colour',
    'productColor',
    'catalogColor',
  ], fallback)
);

const formatEstimateTimeText = (item) => {
  const raw = pickFirstText(item, [
    'estimateTime',
    'estimatedTime',
    'estimate_time',
    'estimated_time',
    'durationMinutes',
    'duration_minutes',
    'serviceDurationMinutes',
    'service_duration_minutes',
    'estimatedDurationMinutes',
    'estimated_duration_minutes',
    'duration',
    'serviceDuration',
    'estimatedDuration',
    'timeEstimate',
    'estimatedWorkTime',
    'warrantyDurationMonths',
  ]);
  if (!raw) return 'Đang cập nhật';

  const text = String(raw).trim();
  if (/[a-zA-ZÀ-ỹ]/.test(text) && !/^\d+$/.test(text)) return text;

  const minutes = Number(text.replace(/[^\d]/g, ''));
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Đang cập nhật';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${mins} phút`;
};

const isVideoMedia = (media = {}) => (
  /^(VIDEO|video)$/i.test(media?.mediaType || '')
  || /\.(mp4|webm|ogg)$/i.test(media?.mediaUrl || '')
);

const normalizeMedia = (item) => {
  const candidates = Array.isArray(item?.media)
    ? item.media
    : Array.isArray(item?.mediaList)
      ? item.mediaList
      : [];
  return candidates
    .map((m, idx) => {
      const mediaUrl = String(m?.mediaUrl || m?.url || '').trim();
      if (!mediaUrl) return null;
      return {
        serviceMediaId: m?.serviceMediaId ?? m?.id ?? idx,
        mediaUrl,
        mediaType: String(m?.mediaType || m?.type || '').trim(),
        mediaDescription: String(m?.mediaDescription || m?.description || '').trim(),
      };
    })
    .filter(Boolean);
};

const normalizeSpecsFromList = (list) => {
  const arr = Array.isArray(list) ? list : [];
  const mapped = arr
    .map((s, idx) => {
      const name = String(
        s?.displayName
        || s?.attributeName
        || s?.attributeCode
        || s?.specType
        || s?.name
        || s?.label
        || `Thông số ${idx + 1}`,
      ).trim();
      const value = String(
        s?.specValue
        ?? s?.value
        ?? s?.attributeValue
        ?? s?.specificationValue
        ?? '',
      ).trim();
      const unit = String(s?.specUnit ?? s?.unit ?? '').trim();
      if (!name && !value && !unit) return null;
      return {
        key: String(s?.specId ?? s?.attributeId ?? `${name}-${value}-${idx}`),
        name: name || '-',
        value: value || '-',
        unit,
      };
    })
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  mapped.forEach((s) => {
    const sig = `${s.name}|${s.value}|${s.unit}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    unique.push(s);
  });
  return unique;
};

const normalizeSpecs = (item) => {
  const merged = [
    ...(Array.isArray(item?.specifications) ? item.specifications : []),
    ...(Array.isArray(item?.specs) ? item.specs : []),
    ...(Array.isArray(item?.specificationValues) ? item.specificationValues : []),
    ...(Array.isArray(item?.attributes) ? item.attributes : []),
  ];
  return normalizeSpecsFromList(merged);
};

const pickItemType = (raw, stateItemType) => {
  const type = String(raw?.itemType || raw?.type || stateItemType || 'SERVICE').trim().toUpperCase();
  return type === 'PART' ? 'PART' : 'SERVICE';
};

const normalizeDetail = (raw, fallbackCatalogId, stateItemType) => {
  if (!raw || typeof raw !== 'object') return null;
  const catalogItemId = toPositiveNumber(
    raw?.catalogItemId ?? raw?.catalog_item_id ?? raw?.itemId ?? fallbackCatalogId,
  );
  const serviceId = toPositiveNumber(raw?.serviceId ?? raw?.service_id ?? raw?.id);
  const itemType = pickItemType(raw, stateItemType);
  const displayPriceText = withVndSuffix(raw?.displayPrice);
  const priceNum = toPriceNumber(raw?.price);
  const originalPriceNum = toPriceNumber(raw?.originalPrice);

  return {
    raw,
    catalogItemId,
    serviceId,
    itemType,
    title: String(raw?.title || raw?.itemName || raw?.name || 'Chi tiết').trim(),
    shortDescription: String(raw?.shortDescription || raw?.description || '').trim(),
    fullDescription: String(raw?.fullDescription || raw?.descriptionHtml || '').trim(),
    showPrice: toBoolean(raw?.showPrice, true),
    displayPriceText,
    priceNum,
    originalPriceNum,
    originText: getOriginText(raw),
    colorText: getColorText(raw),
    estimateTimeText: formatEstimateTimeText(raw),
    mediaThumbnail: String(raw?.thumbnailUrl || raw?.imageUrl || raw?.mediaThumbnail || '').trim(),
    media: normalizeMedia(raw),
    specifications: normalizeSpecs(raw),
  };
};

const ServiceDetail = () => {
  const { serviceId: routeParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const routeId = useMemo(() => toPositiveNumber(routeParam), [routeParam]);
  const stateCatalogItemId = useMemo(() => toPositiveNumber(location?.state?.catalogItemId), [location?.state]);
  const stateServiceId = useMemo(() => toPositiveNumber(location?.state?.serviceId), [location?.state]);
  const stateItemType = useMemo(() => String(location?.state?.itemType || '').trim().toUpperCase(), [location?.state]);
  const isPartFromState = stateItemType === 'PART';

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(serviceFallback);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    const serviceLookupId = stateServiceId ?? routeId;

    if (!serviceLookupId) {
      setError('Không tìm thấy nội dung cần xem.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    setService(null);

    (async () => {
      try {
        const serviceRes = await fetchHomeServiceDetail(serviceLookupId).catch(() => null);
        const raw = extractPayload(serviceRes);

        if (!raw || typeof raw !== 'object') {
          throw new Error('Không tìm thấy thông tin chi tiết.');
        }

        const rawCatalogItemId = toPositiveNumber(
          raw?.catalogItemId ?? raw?.catalog_item_id ?? raw?.itemId ?? raw?.catalog?.catalogItemId,
        );
        const effectiveCatalogLookupId = stateCatalogItemId ?? rawCatalogItemId ?? null;
        let homeProductDetail = null;

        if (effectiveCatalogLookupId) {
          try {
            const homeProductRes = await fetchHomeProductDetail(effectiveCatalogLookupId);
            homeProductDetail = extractPayload(homeProductRes);
          } catch {
            homeProductDetail = null;
          }
        }

        const mergedRaw = mergeWithMeaningfulFallback(
          raw,
          raw?.service,
          raw?.serviceInfo,
          raw?.data,
          homeProductDetail,
        );

        let normalized = normalizeDetail(
          mergedRaw,
          effectiveCatalogLookupId,
          isPartFromState ? 'PART' : (stateItemType || 'SERVICE'),
        );
        if (!normalized) throw new Error('Dữ liệu chi tiết không hợp lệ.');

        // Keep catalogItemId from state for booking/spec flow when /home/service response lacks it.
        if (!normalized.catalogItemId && stateCatalogItemId) {
          normalized = { ...normalized, catalogItemId: stateCatalogItemId };
        }

        // For part detail: always attempt enrich specs via warehouse API.
        const effectiveCatalogId = normalized.catalogItemId || stateCatalogItemId || null;
        if (
          (isPartFromState || normalized.itemType === 'PART')
          && effectiveCatalogId
        ) {
          const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
          const [detailRes, specsRes] = await Promise.all([
            fetchWarehouseCatalogItemDetail(effectiveCatalogId, token).catch(() => null),
            fetchWarehouseSpecificationsByCatalogItemId(effectiveCatalogId, token).catch(() => null),
          ]);
          const detailPayload = extractPayload(detailRes);
          const specsPayload = extractPayload(specsRes);
          const specs = normalizeSpecsFromList(specsPayload);
          const detailSpecs = normalizeSpecs(detailPayload);

          if (detailPayload && typeof detailPayload === 'object') {
            normalized = {
              ...normalized,
              originText: getOriginText(detailPayload, normalized.originText),
              colorText: getColorText(detailPayload, normalized.colorText),
            };
          }

          if (specs.length > 0 || detailSpecs.length > 0) {
            const existingSpecs = Array.isArray(normalized.specifications) ? normalized.specifications : [];
            const mergedSpecs = normalizeSpecsFromList([...existingSpecs, ...detailSpecs, ...specs]);
            normalized = { ...normalized, specifications: mergedSpecs };
          }
        }

        if (!active) return;
        setService(normalized);

        const imageCandidates = [
          normalized.mediaThumbnail,
          ...normalized.media.filter((m) => !isVideoMedia(m)).map((m) => m.mediaUrl),
        ].filter(Boolean);
        setActiveImg(imageCandidates[0] || serviceFallback);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Không thể tải thông tin chi tiết.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isPartFromState, routeId, stateCatalogItemId, stateItemType, stateServiceId]);

  const isPart = service?.itemType === 'PART';
  const listPath = isPart ? '/parts' : '/services';
  const listLabel = isPart ? 'Phụ tùng' : 'Dịch vụ';

  const hasDiscount =
    service?.originalPriceNum != null
    && service?.priceNum != null
    && service.originalPriceNum > 0
    && service.priceNum >= 0
    && service.originalPriceNum > service.priceNum;
  const discountPct = hasDiscount
    ? Math.round((1 - service.priceNum / service.originalPriceNum) * 100)
    : 0;

  const mediaList = Array.isArray(service?.media) ? service.media : [];
  const mediaImages = mediaList
    .filter((m) => !isVideoMedia(m))
    .map((m) => m.mediaUrl)
    .filter(Boolean);
  const allImages = Array.from(new Set([service?.mediaThumbnail, ...mediaImages].filter(Boolean)));
  const partInfoRows = isPart
    ? [
      { label: 'Xuất xứ', value: service?.originText || 'Đang cập nhật' },
      ...(service?.colorText ? [{ label: 'Màu', value: service.colorText }] : []),
    ]
    : [];
  const handleBooking = () => {
    const catalogId = service?.catalogItemId || service?.serviceId;
    navigate('/booking', { state: catalogId ? { catalogItemId: catalogId } : undefined });
  };

  const detailTabs = [
    { key: 'description', label: 'Mô tả' },
    { key: 'specs', label: 'Thông số' },
    { key: 'extra', label: 'Bổ sung' },
  ];

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingSpinner} />
        <p>Đang tải thông tin chi tiết...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorIcon}>!</div>
        <h2>Không tìm thấy thông tin</h2>
        <p>{error || 'Nội dung hiện không khả dụng.'}</p>
        <Link to={listPath} className={styles.backBtn}>Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.breadcrumbs}>
        <Link to={listPath}>{listLabel}</Link>
        <span className={styles.breadSep}>/</span>
        <span>{service.title}</span>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.galleryCol}>
          <div className={styles.heroWrap}>
            <img src={activeImg} alt={service.title} className={styles.heroImg} />
            {hasDiscount && <div className={styles.imgBadge}>-{discountPct}%</div>}
          </div>
          {allImages.length > 1 && (
            <div className={styles.thumbRow}>
              {allImages.map((img, idx) => (
                <button
                  key={`thumb-${idx}`}
                  className={`${styles.thumbBtn} ${activeImg === img ? styles.thumbActive : ''}`}
                  onClick={() => setActiveImg(img)}
                  aria-label={`Xem ảnh ${idx + 1}`}
                  type="button"
                >
                  <img src={img} alt={`Ảnh ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.infoCol}>
          <div className={styles.infoCard}>
            <div className={styles.categoryTag}>{isPart ? 'Phụ tùng' : 'Dịch vụ'}</div>
            <h1 className={styles.title}>{service.title}</h1>
            <p className={styles.shortDesc}>
              {stripHtml(service.shortDescription) || 'Mô tả đang được cập nhật.'}
            </p>

            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Giá:</span>
              {service.showPrice ? (
                service.displayPriceText ? (
                  <>
                    <span className={styles.priceNew}>{service.displayPriceText}</span>
                    {service.originalPriceNum != null && (
                      <span className={styles.priceOld}>{service.originalPriceNum.toLocaleString('vi-VN')} VND</span>
                    )}
                    {hasDiscount && <span className={styles.discountChip}>-{discountPct}%</span>}
                  </>
                ) : service.priceNum != null ? (
                  <>
                    <span className={styles.priceNew}>{service.priceNum.toLocaleString('vi-VN')} VND</span>
                    {service.originalPriceNum != null && (
                      <span className={styles.priceOld}>{service.originalPriceNum.toLocaleString('vi-VN')} VND</span>
                    )}
                  </>
                ) : (
                  <span className={styles.priceContact}>Liên hệ báo giá</span>
                )
              ) : (
                <span className={styles.priceContact}>Liên hệ báo giá</span>
              )}
            </div>

            <dl className={styles.quickFacts}>
              <div>
                <dt>{isPart ? 'Loại hạng mục' : 'Thời gian dự tính'}</dt>
                <dd>{isPart ? 'Phụ tùng chính hãng' : service.estimateTimeText}</dd>
              </div>
            </dl>

            <div className={styles.divider} />

            <button className={styles.bookingBtn} onClick={handleBooking} type="button">
              <span>Đặt lịch ngay</span>
            </button>

            <a href="tel:0987545680" className={styles.hotlineLink}>
              Gọi tư vấn: <strong>0987 545 680</strong>
            </a>
          </div>
        </div>
      </div>

      <section className={styles.detailTabsSection} aria-label="Thông tin chi tiết">
        <div className={styles.tabList} role="tablist">
          {detailTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabPanel}>
          {activeTab === 'description' && (
            service.fullDescription ? (
              <div className={styles.descContent} dangerouslySetInnerHTML={{ __html: service.fullDescription }} />
            ) : (
              <p className={styles.tabEmpty}>Mô tả chi tiết đang được cập nhật.</p>
            )
          )}

          {activeTab === 'specs' && (
            isPart ? (
              <>
                <h3 className={styles.specSubTitle}>Thông số kỹ thuật</h3>
                <div className={styles.specTableWrap}>
                  <table className={styles.specTable}>
                    <thead>
                      <tr>
                        <th>Thông số</th>
                        <th>Giá trị</th>
                        <th>Đơn vị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {service.specifications.length > 0 ? (
                        service.specifications.map((s) => (
                          <tr key={s.key}>
                            <td>{s.name}</td>
                            <td>{s.value}</td>
                            <td>{s.unit || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className={styles.specEmpty}>Chưa có thông số phụ tùng.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <dl className={styles.partMetaList}>
                <div className={styles.partMetaItem}>
                  <dt>Thời gian dự tính</dt>
                  <dd>{service.estimateTimeText}</dd>
                </div>
              </dl>
            )
          )}

          {activeTab === 'extra' && (
            <dl className={styles.partMetaList}>
              {isPart ? (
                partInfoRows.map((row) => (
                  <div className={styles.partMetaItem} key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))
              ) : (
                <>
                  <div className={styles.partMetaItem}>
                    <dt>Loại hạng mục</dt>
                    <dd>Dịch vụ</dd>
                  </div>
                  <div className={styles.partMetaItem}>
                    <dt>Tư vấn</dt>
                    <dd>0987 545 680</dd>
                  </div>
                </>
              )}
            </dl>
          )}
        </div>
      </section>

    </div>
  );
};

export default ServiceDetail;
