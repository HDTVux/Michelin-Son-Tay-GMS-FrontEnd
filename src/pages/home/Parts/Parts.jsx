import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeProducts } from '../../../services/homeService.js';
import partFallback from '../../../assets/lop and mam.jpg';
import './Parts.css';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const toDisplayPrice = (item) => {
  if (item?.showPrice !== true) return 'Liên hệ';
  const display = String(item?.displayPrice || '').trim();
  if (display) return display;
  const num = Number(item?.price);
  if (!Number.isFinite(num)) return 'Liên hệ';
  return `${num.toLocaleString('vi-VN')} đ`;
};

const dedupeByItemId = (list) => {
  const result = [];
  const seen = new Set();
  list.forEach((entry) => {
    const key = entry?.itemId ?? `title-${String(entry?.title || '').toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(entry);
  });
  return result;
};

export default function Parts() {
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [partIndex, setPartIndex] = useState(0);
  const [partVisible, setPartVisible] = useState(4);
  const [isPartPaused, setIsPartPaused] = useState(false);
  const partTrackRef = useRef(null);
  const partPointer = useRef({ startX: 0, deltaX: 0, dragging: false });

  // Scroll reveal
  const partsHeroRef = useRef(null);
  const partsSliderRef = useRef(null);
  const partsRevealed = useRef(false);
  const [partsIntroVisible, setPartsIntroVisible] = useState(false);
  const [partsSliderVisible, setPartsSliderVisible] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        setError('');

        const productsRes = await fetchHomeProducts({
          page: 0,
          size: 20,
          itemType: 'PART',
        }).catch((err) => { console.error('🔍 [Parts] API error:', err); return null; });

        console.log('🔍 [Parts] productsRes:', productsRes);
        const payload = extractPayload(productsRes);
        const raw = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : [];

        // DEBUG
        console.log('🔍 [Parts] payload:', payload);
        console.log('🔍 [Parts] raw:', raw, '| totalElements:', payload?.totalElements, '| totalPages:', payload?.totalPages);
        if (raw.length > 0) console.log('🔍 [Parts] First item keys:', Object.keys(raw[0]));

        const mapped = dedupeByItemId(
          raw.map((item) => ({
            itemId: toPositiveNumber(item?.catalogItemId),
            serviceId: toPositiveNumber(item?.serviceId),
            title: String(item?.title || 'Phụ tùng').trim(),
            description: stripHtml(item?.shortDescription || ''),
            image: String(item?.thumbnailUrl || item?.imageUrl || item?.mediaThumbnail || '').trim(),
            priceText: toDisplayPrice(item),
          })),
        );

        mapped.sort((a, b) => (b?.itemId || 0) - (a?.itemId || 0));
        if (!active) return;
        setParts(mapped);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Không thể tải danh sách phụ tùng.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 480) {
        setPartVisible(1);
      } else if (w <= 768) {
        setPartVisible(2);
      } else if (w <= 1024) {
        setPartVisible(3);
      } else {
        setPartVisible(4);
      }
      setPartIndex(0);
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPartIndex(0), 0);
    return () => clearTimeout(t);
  }, [partVisible, parts.length]);

  const partMaxIndex = Math.max(0, parts.length - partVisible);
  const partOffset = (partIndex * 100) / partVisible;
  const partPrev = () => setPartIndex((i) => Math.max(0, i - 1));
  const partNext = () => setPartIndex((i) => Math.min(partMaxIndex, i + 1));

  // Auto-slide
  useEffect(() => {
    if (partMaxIndex === 0 || isPartPaused) return;
    const id = setInterval(() => {
      setPartIndex((current) => (current >= partMaxIndex ? 0 : current + 1));
    }, 4000);
    return () => clearInterval(id);
  }, [partMaxIndex, isPartPaused]);

  const handlePartPointerDown = (event) => {
    setIsPartPaused(true);
    partPointer.current.dragging = true;
    partPointer.current.startX = event.clientX ?? event.touches?.[0]?.clientX;
  };

  const handlePartPointerMove = (event) => {
    if (!partPointer.current.dragging) return;
    const x = event.clientX ?? event.touches?.[0]?.clientX;
    partPointer.current.deltaX = x - partPointer.current.startX;
  };

  const handlePartPointerUp = () => {
    if (!partPointer.current.dragging) return;
    partPointer.current.dragging = false;
    const dx = partPointer.current.deltaX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) partNext();
      else partPrev();
    }
    partPointer.current.deltaX = 0;
    setTimeout(() => setIsPartPaused(false), 300);
  };

  // IntersectionObserver cho header
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === partsHeroRef.current) {
            setPartsIntroVisible(true);
          }
          if (entry.target === partsSliderRef.current && !partsRevealed.current) {
            partsRevealed.current = true;
            setPartsSliderVisible(true);
          }
        });
      },
      { threshold: 0.25 },
    );

    const el = partsHeroRef.current;
    const sliderEl = partsSliderRef.current;
    if (el) observer.observe(el);
    if (sliderEl) observer.observe(sliderEl);

    return () => {
      if (el) observer.unobserve(el);
      if (sliderEl) observer.unobserve(sliderEl);
      observer.disconnect();
    };
  }, []);

  return (
    <section className="partsPage">
      {/* Header */}
      <div
        ref={partsHeroRef}
        className={`partsHero ${partsIntroVisible ? 'visible' : ''}`}
      >
        <div className="partsLabel">DANH SÁCH PHỤ TÙNG NỔI BẬT</div>
        <h2 className="partsTitle">
          <span className="titlePart1">Phụ tùng</span>
          <span className="titlePart2">chính hãng Michelin Sơn Tây</span>
        </h2>
        <p className="partsSubtitle">
          Các phụ tùng chất lượng cao, chính hãng – giúp chiếc xe của bạn luôn bền bỉ và an toàn trên mọi hành trình.
        </p>
      </div>

      {/* Slider */}
      <div
        ref={partsSliderRef}
        className={`partsSlider reveal ${partsSliderVisible ? 'is-visible' : ''}`}
        onMouseEnter={() => setIsPartPaused(true)}
        onMouseLeave={() => setIsPartPaused(false)}
      >
        <button
          className="partsArrow left"
          onClick={partPrev}
          aria-label="Previous"
          disabled={partIndex === 0}
        >
          &lt;
        </button>

        <div className="partsViewport">
          {isLoading && (
            <div className="partsStatus">Đang tải phụ tùng...</div>
          )}
          {!isLoading && error && (
            <div className="partsStatus partsStatusError">{error}</div>
          )}
          {!isLoading && !error && !parts.length && (
            <div className="partsStatus">Chưa có phụ tùng để hiển thị.</div>
          )}
          {parts.length > 0 && (
            <div
              className="partsTrack"
              ref={partTrackRef}
              style={{
                transform: `translateX(-${partOffset}%)`,
                display: 'flex',
                transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onPointerDown={handlePartPointerDown}
              onPointerMove={handlePartPointerMove}
              onPointerUp={handlePartPointerUp}
              onPointerCancel={handlePartPointerUp}
              onTouchStart={handlePartPointerDown}
              onTouchMove={handlePartPointerMove}
              onTouchEnd={handlePartPointerUp}
            >
              {parts.map((part, idx) => (
                <div key={`part-${part.itemId ?? idx}`} className="partSlide">
                  <div className="partCard">
                    <div className="partCard-imageTop">
                      <img
                        src={part.image || partFallback}
                        alt={part.title}
                        className="partCard-image"
                        loading="lazy"
                      />
                    </div>
                    <div className="partCard-content">
                      <h3 className="partCardTitle">{part.title}</h3>
                      <p className="partCardDesc">
                        {part.description || 'Hiện chưa có mô tả cho phụ tùng này.'}
                      </p>
                      <div className="partCardPrice">Giá: {part.priceText}</div>
                      <div className="partCardActions">
                        <Link
                          to={part.serviceId ? `/services/${part.serviceId}` : '/services'}
                          state={
                            part.serviceId != null
                              ? {
                                  catalogItemId: part.itemId,
                                  serviceId: part.serviceId,
                                  itemType: 'PART',
                                  title: part.title,
                                }
                              : undefined
                          }
                          className="partOutlineBtn"
                        >
                          Xem chi tiết
                        </Link>
                        <Link
                          to="/booking"
                          state={part.itemId != null ? { catalogItemId: part.itemId } : undefined}
                          className="partSolidBtn"
                        >
                          Đặt lịch
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="partsArrow right"
          onClick={partNext}
          aria-label="Next"
          disabled={partIndex >= partMaxIndex}
        >
          &gt;
        </button>
      </div>
    </section>
  );
}



