import './Services.css';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeProducts } from '../../../services/homeService';
import serviceFallback from '../../../assets/lop and mam.jpg';
import processImg from '../../../assets/Quy trình 7 bước (1).png';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const parsePriceNumber = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;

  const text = String(value).toLowerCase().trim();
  if (!text || text.includes('liên hệ')) return null;

  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const rawNumber = match[0];
  const normalizedNumber = rawNumber.includes(',')
    ? rawNumber.replace(/\./g, '').replace(',', '.')
    : rawNumber.replace(/\./g, '');
  const parsed = Number(normalizedNumber);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const suffix = text.slice(match.index + rawNumber.length);
  if (/^\s*k\b/.test(suffix) || suffix.includes('nghìn') || suffix.includes('ngàn')) return parsed * 1000;
  if (suffix.includes('triệu') || suffix.includes('trieu')) return parsed * 1000000;
  return parsed;
};
const normalizeItemType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART') return 'PART';
  return 'SERVICE';
};
const toDisplayPrice = (item) => {
  if (item?.showPrice !== true) return 'Liên hệ';
  const display = String(item?.displayPrice || '').trim();
  if (display) return display;
  const numeric = Number(item?.price);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('vi-VN')} đ` : 'Liên hệ';
};
const extractList = (res) => {
  const payload = extractPayload(res);
  return Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload)
      ? payload
      : [];
};

const ITEMS_PER_ROW = 4;
const INITIAL_ROWS = 1;

const Services = () => {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('SERVICE');
  const [gridExpanded, setGridExpanded] = useState(false);
  const [priceSort, setPriceSort] = useState('DEFAULT');
  const [searchQuery, setSearchQuery] = useState('');

  // Gói dịch vụ được tin dùng (commented out - not used currently)
  /*
  const combos = [
    {
      title: 'Combo "Trước chuyến đi"',
      description: 'Kiểm tra toàn diện trước khi đi xa',
      features: [
        'Kiểm tra lốp xe và áp suất',
        'Kiểm tra hệ thống phanh',
        'Kiểm tra đèn và hệ thống điện',
        'Kiểm tra dầu nhớt và nước làm mát'
      ],
      image: combo1,
      price: 'Liên hệ'
    },
    {
      title: 'Combo "Êm lái – hết rung"',
      description: 'Giải quyết vấn đề rung lắc khi lái xe',
      features: [
        'Cân bằng lốp xe',
        'Kiểm tra hệ thống treo',
        'Kiểm tra vành và mâm xe',
        'Điều chỉnh góc đặt bánh xe'
      ],
      image: combo2,
      price: 'Liên hệ'
    },
    {
      title: 'Combo "Lốp an toàn"',
      description: 'Đảm bảo lốp xe luôn trong tình trạng tốt nhất',
      features: [
        'Thay lốp mới chính hãng',
        'Cân bằng và điều chỉnh góc đặt',
        'Kiểm tra áp suất định kỳ',
        'Bảo hành chính thức'
      ],
      image: combo3,
      price: 'Liên hệ'
    },
    {
      title: 'Combo "Phanh an tâm"',
      description: 'Đảm bảo hệ thống phanh luôn hoạt động an toàn và hiệu quả',
      features: [
        'Kiểm tra hệ thống phanh toàn diện',
        'Thay thế má phanh khi cần',
        'Kiểm tra dầu phanh',
        'Bảo hành chính thức'
      ],
      image: combo4,
      price: 'Liên hệ'
    }
  ];
  */

  useEffect(() => {
    let active = true;
    setTimeout(() => { if (active) { setServicesLoading(true); setServicesError(''); }}, 0);

    Promise.allSettled([
      fetchHomeProducts({ page: 0, size: 40, itemType: 'SERVICE' }),
      fetchHomeProducts({ page: 0, size: 40, itemType: 'PART' }),
      fetchHomeProducts({ page: 0, size: 40, itemType: 'PRODUCT' }),
    ])
      .then((results) => {
        if (!active) return;

        const [serviceRes, partRes, productRes] = results;
        const mergedRaw = [
          ...(serviceRes?.status === 'fulfilled'
            ? extractList(serviceRes.value).map((item) => ({ ...item, __sourceType: 'SERVICE' }))
            : []),
          ...(partRes?.status === 'fulfilled'
            ? extractList(partRes.value).map((item) => ({ ...item, __sourceType: 'PART' }))
            : []),
          ...(productRes?.status === 'fulfilled'
            ? extractList(productRes.value).map((item) => ({ ...item, __sourceType: 'PART' }))
            : []),
        ];

        const mapped = mergedRaw
          .map((item) => {
            const itemType = normalizeItemType(item?.itemType ?? item?.type ?? item?.__sourceType);
            const catalogItemId = toPositiveNumber(item?.catalogItemId ?? item?.itemId);
            const serviceId = toPositiveNumber(item?.serviceId);
            return {
              id: catalogItemId ?? serviceId,
              catalogItemId,
              serviceId,
              itemType,
              title: String(item?.title || item?.itemName || (itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ')).trim(),
              description: String(item?.shortDescription || item?.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
              image: String(item?.thumbnailUrl || item?.imageUrl || item?.mediaThumbnail || '').trim(),
              price: toDisplayPrice(item),
              rawPrice: item?.showPrice === true
                ? (parsePriceNumber(item?.price) ?? parsePriceNumber(item?.displayPrice))
                : null,
            };
          })
          .filter((item) => item.id || item.title);

        const deduped = new Map();
        mapped.forEach((item) => {
          const key = `${item.itemType}:${item.catalogItemId ?? item.serviceId ?? item.title}`;
          if (!deduped.has(key)) deduped.set(key, item);
        });

        setServices(Array.from(deduped.values()));

        if (serviceRes?.status === 'rejected' && partRes?.status === 'rejected' && productRes?.status === 'rejected') {
          setServicesError(
            serviceRes?.reason?.message ||
            partRes?.reason?.message ||
            productRes?.reason?.message ||
            'Không thể tải danh sách dịch vụ và phụ tùng.',
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('[Services] Error loading services:', err);
        setServicesError(err?.message || 'Không thể tải danh sách dịch vụ và phụ tùng.');
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Scroll reveal cho 3 phần: dịch vụ, quy trình, combo
  const servicesHeroRef = useRef(null);
  const processHeaderRef = useRef(null);

  const [servicesIntroVisible, setServicesIntroVisible] = useState(false);
  const [processIntroVisible, setProcessIntroVisible] = useState(false);
  const visibleServices = useMemo(() => {
    let filtered = services.filter((item) => item.itemType === catalogFilter);

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }

    if (priceSort === 'ASC') {
      filtered = [...filtered].sort((a, b) => {
        const pa = a.rawPrice ?? Infinity;
        const pb = b.rawPrice ?? Infinity;
        return pa - pb;
      });
    } else if (priceSort === 'DESC') {
      filtered = [...filtered].sort((a, b) => {
        const pa = a.rawPrice ?? -Infinity;
        const pb = b.rawPrice ?? -Infinity;
        return pb - pa;
      });
    }

    return filtered;
  }, [catalogFilter, services, priceSort, searchQuery]);

  const gridItemsToShow = useMemo(() => {
    if (gridExpanded) return visibleServices;
    return visibleServices.slice(0, ITEMS_PER_ROW * INITIAL_ROWS);
  }, [gridExpanded, visibleServices]);

  const hasMoreItems = visibleServices.length > ITEMS_PER_ROW * INITIAL_ROWS;

  // Dynamic title/label/subtitle based on active filter
  const dynamicLabel = useMemo(() => {
    if (catalogFilter === 'PART') return 'DANH MỤC PHỤ TÙNG';
    return 'DANH MỤC DỊCH VỤ';
  }, [catalogFilter]);

  const dynamicTitlePart1 = useMemo(() => {
    if (catalogFilter === 'PART') return 'Phụ tùng';
    return 'Dịch vụ';
  }, [catalogFilter]);

  const dynamicSubtitle = useMemo(() => {
    if (catalogFilter === 'PART')
      return 'Phụ tùng chính hãng, đa dạng chủng loại, đảm bảo chất lượng và giá cả hợp lý.';
    return 'Các dịch vụ bảo dưỡng, sửa chữa chuyên nghiệp với đội ngũ kỹ thuật viên giàu kinh nghiệm.';
  }, [catalogFilter]);
  // IntersectionObserver cho tiêu đề các phần
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === servicesHeroRef.current) {
            setServicesIntroVisible(true);
          }
          if (entry.target === processHeaderRef.current) {
            setProcessIntroVisible(true);
          }
        });
      },
      { threshold: 0.25 }
    );

    const servicesEl = servicesHeroRef.current;
    const processEl = processHeaderRef.current;

    if (servicesEl) observer.observe(servicesEl);
    if (processEl) observer.observe(processEl);

    return () => {
      if (servicesEl) observer.unobserve(servicesEl);
      if (processEl) observer.unobserve(processEl);
      observer.disconnect();
    };
  }, []);
  return (
    <>
      {/* Hero + Grid Section */}
      <section className="servicesPage">
        <div className="servicesPage-bg" />
        <div
          ref={servicesHeroRef}
          className={`servicesHero ${servicesIntroVisible ? 'visible' : ''}`}
          style={{ opacity: 1, transform: 'translateX(0)' }}
        >
          <div className="servicesLabel">{dynamicLabel}</div>
          <h1 className="servicesTitle">
            <span className="titlePart1">{dynamicTitlePart1}</span>
            <span className="titlePart2">chính hãng</span>
          </h1>
          <p className="servicesSubtitle">{dynamicSubtitle}</p>
        </div>

        {/* Unified Toolbar: filters + sort + search */}
        <div className="unifiedToolbar">
          <div className="toolbarLeft">
            {[
              { value: 'SERVICE', label: 'Dịch vụ' },
              { value: 'PART', label: 'Phụ tùng' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`catalogFilterButton ${catalogFilter === item.value ? 'is-active' : ''}`}
                onClick={() => {
                  setCatalogFilter(item.value);
                  setGridExpanded(false);
                }}
              >
                {item.label}
                {catalogFilter === item.value && (
                  <span className="filterCount">{services.filter(s => s.itemType === item.value).length}</span>
                )}
              </button>
            ))}

            <span className="toolbarDivider" />

            <label className="sortSelectWrap" htmlFor="servicesPriceSort">
              <span>Sắp xếp giá</span>
              <select
                id="servicesPriceSort"
                className="sortSelect"
                value={priceSort}
                onChange={(e) => {
                  setPriceSort(e.target.value);
                  setGridExpanded(false);
                }}
              >
                <option value="DEFAULT">Mặc định</option>
                <option value="ASC">Giá tăng dần</option>
                <option value="DESC">Giá giảm dần</option>
              </select>
            </label>
          </div>

          <div className="toolbarSearch">
            <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              type="text"
              className="searchInput"
              placeholder="Tìm kiếm dịch vụ, phụ tùng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setGridExpanded(false);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="searchClear"
                onClick={() => {
                  setSearchQuery('');
                  setGridExpanded(false);
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Grid layout */}
        <div className="servicesGridWrapper">
          {servicesLoading && (
            <div className="serviceStatus">
              <div className="loadingSpinner" />
              <span>Đang tải danh mục...</span>
            </div>
          )}
          {!servicesLoading && servicesError && (
            <div className="serviceStatus error">
              {servicesError}
            </div>
          )}
          {!servicesLoading && !servicesError && visibleServices.length === 0 && (
            <div className="serviceStatus">
              Chưa có hạng mục phù hợp để hiển thị.
            </div>
          )}
          {gridItemsToShow.length > 0 && (
            <div className="servicesGrid">
              {gridItemsToShow.map((service, idx) => (
                <div key={service.id || idx} className="serviceGridItem">
                  <div className="serviceCard">
                    <div className="serviceCard-imageTop">
                      <img src={service.image || serviceFallback} alt={service.title} className="serviceCard-image" />
                      <div className="serviceCard-overlay">
                        <Link
                          to={service.serviceId || service.catalogItemId ? `/services/${service.serviceId || service.catalogItemId}` : '/services'}
                          state={
                            service.catalogItemId != null || service.serviceId != null
                              ? { catalogItemId: service.catalogItemId, serviceId: service.serviceId, itemType: service.itemType || 'SERVICE' }
                              : undefined
                          }
                          className="overlayViewBtn"
                        >
                          Xem chi tiết →
                        </Link>
                      </div>
                      <div className="catalogTypeBadge">{service.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'}</div>
                    </div>
                    <div className="serviceCard-content">
                      <h3 className="serviceTitle">{service.title}</h3>
                      <p className="serviceDescription">{service.description || 'Hiện chưa có mô tả.'}</p>
                      <div className="serviceCard-footer">
                        <div className="servicePrice">{service.price || 'Liên hệ'}</div>
                        <Link
                          to="/booking"
                          state={service.catalogItemId != null ? { catalogItemId: service.catalogItemId, itemType: service.itemType } : undefined}
                          className="btnBookNow"
                        >
                          Đặt lịch
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMoreItems && !servicesLoading && (
            <div className="gridToggleWrapper">
              <button
                type="button"
                className="gridToggleButton"
                onClick={() => setGridExpanded((prev) => !prev)}
              >
                {gridExpanded ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    Thu gọn
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    Xem thêm ({visibleServices.length - ITEMS_PER_ROW * INITIAL_ROWS} sản phẩm)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Quy trình dịch vụ */}
      <section className="processSection">
        <div className="processInner">
          <div
            ref={processHeaderRef}
            className={`processHeader ${processIntroVisible ? 'visible' : ''}`}
          >
            <div className="servicesLabel">QUY TRÌNH DỊCH VỤ</div>
            <h2 className="processTitle">
              <span className="titlePart1">Quy trình</span>
              <span className="titlePart2">chăm sóc & bảo dưỡng xe chuẩn Michelin</span>
            </h2>
            <p className="processSub">
              7 bước rõ ràng, minh bạch – từ tiếp nhận đến bàn giao, mang lại cho bạn trải nghiệm an tâm và chuyên nghiệp.
            </p>
          </div>

          <div className="processDiagram">
            <div className="processImageWrapper">
              <img className="processImageCenter" src={processImg} alt="Quy trình dịch vụ Michelin Sơn Tây" />
            </div>

            {[
              {
                no: 1,
                title: 'Tiếp nhận yêu cầu khách hàng',
                desc: 'Ghi nhận thông tin, nhu cầu và mong muốn của khách trước khi thao tác trên xe.'
              },
              {
                no: 2,
                title: 'Đưa xe vào khoang dịch vụ',
                desc: 'Hướng dẫn đưa xe vào đúng vị trí, đảm bảo an toàn cho người và phương tiện.'
              },
              {
                no: 3,
                title: 'Kiểm tra an toàn xe',
                desc: 'Kiểm tra sơ bộ các hạng mục an toàn chính trước khi tiến hành công việc.'
              },
              {
                no: 4,
                title: 'Thực hiện dịch vụ',
                desc: 'Thực hiện bảo dưỡng, sửa chữa theo quy trình và tiêu chuẩn kỹ thuật.'
              },
              {
                no: 5,
                title: 'Kiểm tra chất lượng',
                desc: 'Rà soát lại kết quả công việc, đảm bảo xe hoạt động ổn định sau dịch vụ.'
              },
              {
                no: 6,
                title: 'Chuẩn bị bàn giao xe',
                desc: 'Vệ sinh, sắp xếp và hoàn thiện các thủ tục cần thiết trước khi giao xe.'
              },
              {
                no: 7,
                title: 'Bàn giao xe',
                desc: 'Giải thích hạng mục đã thực hiện, bàn giao xe và hướng dẫn sử dụng an toàn.'
              }
            ].map((s) => (
              <div
                key={s.no}
                className={`processStepBubble step-${s.no}`}
              >
                <div className="processNo">{s.no}</div>
                <div className="processText">
                  <div className="processStepTitle">{s.title}</div>
                  <div className="processStepDesc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gói dịch vụ được tin dùng */}
      {/* <section className="combosPage">
        <div
          ref={combosHeroRef}
          className={`servicesHero ${combosIntroVisible ? 'visible' : ''}`}
        >
          <div className="servicesLabel">GÓI COMBO ƯU ĐÃI</div>
          <h1 className="servicesTitle">
            <span className="titlePart1">Combo</span>
            <span className="titlePart2">dịch vụ được khách hàng tin dùng</span>
          </h1>
          <p className="servicesSubtitle">
            Giá cả minh bạch, tối ưu chi phí – phù hợp cho từng nhu cầu sử dụng và bảo dưỡng xe của bạn.
          </p>
        </div>

        <div
          className="servicesSlider"
          onMouseEnter={() => setIsComboPaused(true)}
          onMouseLeave={() => setIsComboPaused(false)}
        >
          <button 
            className="sliderArrow left" 
            onClick={comboPrev} 
            aria-label="Previous" 
            disabled={comboIndex === 0}
          >
            &lt;
          </button>
          <div className="sliderViewport">
            <div
              className="sliderTrack"
              ref={comboTrackRef}
              style={{ 
                transform: `translateX(-${comboOffset}%)`,
                display: 'flex',
                transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
              onPointerDown={handleComboPointerDown}
              onPointerMove={handleComboPointerMove}
              onPointerUp={handleComboPointerUp}
              onPointerCancel={handleComboPointerUp}
              onTouchStart={handleComboPointerDown}
              onTouchMove={handleComboPointerMove}
              onTouchEnd={handleComboPointerUp}
            >
              {combos.map((combo, idx) => (
                <div key={idx} className="serviceSlide">
                  <div className="serviceCard">
                    <div className="serviceCard-imageTop">
                      <img src={combo.image} alt={combo.title} className="serviceCard-image" />
                    </div>
                    <div className="serviceCard-content">
                      <h3 className="serviceTitle">{combo.title}</h3>
                      <p className="serviceDescription comboDescription">
                        {combo.description}
                        {combo.features?.length ? ` • ${combo.features.join(' • ')}` : ''}
                      </p>
                      <div className="servicePrice">Giá: {combo.price}</div>
                      <div className="serviceActions">
                        <Link to="/services" className="btnViewDetail">Xem chi tiết</Link>
                        <Link to="/booking" className="btnBookNow">Đặt lịch ngay</Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            className="sliderArrow right" 
            onClick={comboNext} 
            aria-label="Next" 
            disabled={comboIndex >= comboMaxIndex}
          >
            &gt;
          </button>
        </div>
      </section> */}
    </>
  );
};

export default Services;
