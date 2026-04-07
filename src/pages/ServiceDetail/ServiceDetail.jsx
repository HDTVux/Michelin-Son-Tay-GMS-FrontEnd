import styles from './ServiceDetail.module.css';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchHomeServiceDetail } from '../../services/homeService';
import { fetchWarehouseSpecificationsByCatalogItemId } from '../../services/warehouseService.js';
import serviceFallback from '../../assets/lop and mam.jpg';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
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
  const normalized = text.replace(/,/g, '').replace(/\s+/g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

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
        || `Thong so ${idx + 1}`,
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
  const displayPriceText = String(raw?.displayPrice || '').trim();
  const priceNum = toPriceNumber(raw?.price);
  const originalPriceNum = toPriceNumber(raw?.originalPrice);

  return {
    raw,
    catalogItemId,
    serviceId,
    itemType,
    title: String(raw?.title || raw?.itemName || raw?.name || 'Chi tiet').trim(),
    shortDescription: String(raw?.shortDescription || raw?.description || '').trim(),
    fullDescription: String(raw?.fullDescription || raw?.descriptionHtml || '').trim(),
    showPrice: toBoolean(raw?.showPrice, true),
    displayPriceText,
    priceNum,
    originalPriceNum,
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

  useEffect(() => {
    const serviceLookupId = stateServiceId ?? routeId;
    const catalogLookupId = stateCatalogItemId ?? null;

    if (!serviceLookupId) {
      setError('Khong tim thay serviceId can xem chi tiet.');
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
          throw new Error('Khong tim thay thong tin chi tiet.');
        }

        let normalized = normalizeDetail(
          raw,
          catalogLookupId,
          isPartFromState ? 'PART' : (stateItemType || 'SERVICE'),
        );
        if (!normalized) throw new Error('Du lieu chi tiet khong hop le.');

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
          const specsRes = await fetchWarehouseSpecificationsByCatalogItemId(effectiveCatalogId, token).catch(() => null);
          const specsPayload = extractPayload(specsRes);
          const specs = normalizeSpecsFromList(specsPayload);
          if (specs.length > 0) {
            const existingSpecs = Array.isArray(normalized.specifications) ? normalized.specifications : [];
            const mergedSpecs = normalizeSpecsFromList([...existingSpecs, ...specs]);
            normalized = { ...normalized, specifications: mergedSpecs };
          }
        }

        if (!active) return;
        setService(normalized);

        const imageCandidates = [
          normalized.mediaThumbnail,
          ...normalized.media.map((m) => m.mediaUrl),
        ].filter(Boolean);
        setActiveImg(imageCandidates[0] || serviceFallback);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Khong the tai thong tin chi tiet.');
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
  const listLabel = isPart ? 'Phu tung' : 'Dich vu';

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
  const allImages = [service?.mediaThumbnail, ...mediaList.map((m) => m.mediaUrl)].filter(Boolean);

  const handleBooking = () => {
    const catalogId = service?.catalogItemId || service?.serviceId;
    navigate('/booking', { state: catalogId ? { catalogItemId: catalogId } : undefined });
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingSpinner} />
        <p>Dang tai thong tin chi tiet...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorIcon}>!</div>
        <h2>Khong tim thay thong tin</h2>
        <p>{error || 'Noi dung hien khong kha dung.'}</p>
        <Link to={listPath} className={styles.backBtn}>Quay lai danh sach</Link>
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
                  aria-label={`Xem anh ${idx + 1}`}
                  type="button"
                >
                  <img src={img} alt={`Anh ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.infoCol}>
          <div className={styles.infoCard}>
            <div className={styles.categoryTag}>{isPart ? 'Phu tung' : 'Dich vu'}</div>
            <h1 className={styles.title}>{service.title}</h1>
            <p className={styles.shortDesc}>
              {stripHtml(service.shortDescription) || 'Mo ta dang duoc cap nhat.'}
            </p>

            <div className={styles.priceRow}>
              {service.showPrice ? (
                service.displayPriceText ? (
                  <>
                    <span className={styles.priceNew}>{service.displayPriceText}</span>
                    {service.originalPriceNum != null && (
                      <span className={styles.priceOld}>{service.originalPriceNum.toLocaleString('vi-VN')} đ</span>
                    )}
                    {hasDiscount && <span className={styles.discountChip}>-{discountPct}%</span>}
                  </>
                ) : service.priceNum != null ? (
                  <>
                    <span className={styles.priceNew}>{service.priceNum.toLocaleString('vi-VN')} đ</span>
                    {service.originalPriceNum != null && (
                      <span className={styles.priceOld}>{service.originalPriceNum.toLocaleString('vi-VN')} đ</span>
                    )}
                  </>
                ) : (
                  <span className={styles.priceContact}>Lien he bao gia</span>
                )
              ) : (
                <span className={styles.priceContact}>Lien he bao gia</span>
              )}
            </div>

            <div className={styles.divider} />

            <button className={styles.bookingBtn} onClick={handleBooking} type="button">
              <span className={styles.bookingBtnIcon}>📅</span>
              <span>Dat lich ngay</span>
            </button>

            <a href="tel:0987545680" className={styles.hotlineLink}>
              <span>📞</span> Goi tu van: <strong>0987 545 680</strong>
            </a>
          </div>
        </div>
      </div>

      {isPart && (
        <div className={styles.specSection}>
          <div className={styles.specCard}>
            <h2 className={styles.specTitle}>Thong so phu tung</h2>
            {service.specifications.length > 0 ? (
              <div className={styles.specTableWrap}>
                <table className={styles.specTable}>
                  <thead>
                    <tr>
                      <th>Thong so</th>
                      <th>Gia tri</th>
                      <th>Don vi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.specifications.map((s) => (
                      <tr key={s.key}>
                        <td>{s.name}</td>
                        <td>{s.value}</td>
                        <td>{s.unit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.specEmpty}>Chua co thong so cho phu tung nay.</div>
            )}
          </div>
        </div>
      )}

      {service.fullDescription && (
        <div className={styles.descSection}>
          <div className={styles.descCard}>
            <h2 className={styles.descTitle}>Mo ta chi tiet</h2>
            <div className={styles.descContent} dangerouslySetInnerHTML={{ __html: service.fullDescription }} />
          </div>
        </div>
      )}

      {mediaList.length > 0 && (
        <div className={styles.gallerySection}>
          <h2 className={styles.galleryTitle}>Hinh anh thuc te</h2>
          <div className={styles.galleryGrid}>
            {mediaList.map((item, idx) => {
              const isVideo =
                item.mediaType === 'VIDEO'
                || item.mediaType === 'video'
                || /\.(mp4|webm|ogg)$/i.test(item.mediaUrl || '');
              return (
                <div key={`gallery-${item.serviceMediaId ?? idx}`} className={styles.galleryItem}>
                  {isVideo ? (
                    <video src={item.mediaUrl} controls preload="metadata" />
                  ) : (
                    <img src={item.mediaUrl} alt={item.mediaDescription || `${service.title} ${idx + 1}`} />
                  )}
                  {item.mediaDescription && (
                    <div className={styles.galleryCaption}>{item.mediaDescription}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.bottomCta}>
        <p>Ban can tu van them ve {isPart ? 'phu tung' : 'dich vu'} nay?</p>
        <div className={styles.bottomCtaBtns}>
          <a href="tel:0987545680" className={styles.ctaCall}>📞 Goi tu van</a>
          <button className={styles.ctaBook} onClick={handleBooking} type="button">📅 Dat lich ngay</button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
