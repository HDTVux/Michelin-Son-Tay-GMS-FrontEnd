import './Services.css';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeServices } from '../../../services/homeService';
import serviceFallback from '../../../assets/lop and mam.jpg';
import processImg from '../../../assets/Quy trình 7 bước (1).png';

const Services = () => {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');

  // Debug log
  useEffect(() => {
    console.log('[Services] State updated:', { 
      servicesCount: services.length, 
      servicesLoading, 
      servicesError,
      services 
    });
  }, [services, servicesLoading, servicesError]);

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

    fetchHomeServices()
      .then((res) => {
        if (!active) return;
        console.log('[Services] API response:', res);
        const list = Array.isArray(res?.data) ? res.data : [];
        console.log('[Services] Services list:', list);
        const mapped = list.map((item) => ({
          id: item.serviceId,
          title: item.title || 'Dịch vụ',
          description: item.shortDescription || '',
          image: item.mediaThumbnail || '',
          price: item.showPrice ? item.displayPrice || 'Liên hệ' : 'Liên hệ',
        }));
        console.log('[Services] Mapped services:', mapped);
        setServices(mapped);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[Services] Error loading services:', err);
        setServicesError(err?.message || 'Không thể tải danh sách dịch vụ.');
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // State cho dịch vụ slider
  const [serviceIndex, setServiceIndex] = useState(0);
  const [serviceVisible, setServiceVisible] = useState(4);
  const [isServicePaused, setIsServicePaused] = useState(false);
  const serviceTrackRef = useRef(null);
  const servicePointer = useRef({ startX: 0, deltaX: 0, dragging: false });

  // Scroll reveal cho 3 phần: dịch vụ, quy trình, combo
  const servicesHeroRef = useRef(null);
  const processHeaderRef = useRef(null);

  const [servicesIntroVisible, setServicesIntroVisible] = useState(false);
  const [processIntroVisible, setProcessIntroVisible] = useState(false);
  
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 480) {
        setServiceVisible(1);
      } else if (w <= 768) {
        setServiceVisible(2);
      } else if (w <= 1024) {
        setServiceVisible(3);
      } else {
        setServiceVisible(4);
      }
      setServiceIndex(0);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setServiceIndex(0), 0);
    return () => clearTimeout(t);
  }, [serviceVisible, services.length]);

  const serviceMaxIndex = Math.max(0, services.length - serviceVisible);
  const serviceOffset = (serviceIndex * 100) / serviceVisible;
  const servicePrev = () => setServiceIndex(i => Math.max(0, i - 1));
  const serviceNext = () => setServiceIndex(i => Math.min(serviceMaxIndex, i + 1));

  // Tự động chuyển slide dịch vụ
  useEffect(() => {
    if (serviceMaxIndex === 0 || isServicePaused) return;
    const id = setInterval(() => {
      setServiceIndex((current) => (current >= serviceMaxIndex ? 0 : current + 1));
    }, 4000);
    return () => clearInterval(id);
  }, [serviceMaxIndex, isServicePaused]);

  // Handlers cho dịch vụ slider
  const handleServicePointerDown = (event) => {
    setIsServicePaused(true);
    servicePointer.current.dragging = true;
    servicePointer.current.startX = event.clientX ?? event.touches?.[0]?.clientX;
  };

  const handleServicePointerMove = (event) => {
    if (!servicePointer.current.dragging) return;
    const x = event.clientX ?? event.touches?.[0]?.clientX;
    servicePointer.current.deltaX = x - servicePointer.current.startX;
  };

  const handleServicePointerUp = () => {
    if (!servicePointer.current.dragging) return;
    servicePointer.current.dragging = false;
    const dx = servicePointer.current.deltaX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) serviceNext();
      else servicePrev();
    }
    servicePointer.current.deltaX = 0;
    setTimeout(() => setIsServicePaused(false), 300);
  };

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
      {/* Danh sách dịch vụ tiện ích nổi bật */}
      <section className="servicesPage">
        <div
          ref={servicesHeroRef}
          className={`servicesHero ${servicesIntroVisible ? 'visible' : ''}`}
          style={{ opacity: 1, transform: 'translateX(0)' }}
        >
          <div className="servicesLabel">DỊCH VỤ NỔI BẬT</div>
          <h1 className="servicesTitle">
            <span className="titlePart1">Dịch vụ</span>
            <span className="titlePart2">tiện ích chính hãng Michelin Sơn Tây</span>
          </h1>
          <p className="servicesSubtitle">
            Các dịch vụ chuyên nghiệp, chuẩn quy trình – giúp chiếc xe của bạn luôn an toàn và bền bỉ trên mọi hành trình.
          </p>
        </div>

        <div
          className="servicesSlider"
          onMouseEnter={() => setIsServicePaused(true)}
          onMouseLeave={() => setIsServicePaused(false)}
        >
          <button 
            className="sliderArrow left" 
            onClick={servicePrev} 
            aria-label="Previous" 
            disabled={serviceIndex === 0}
          >
            &lt;
          </button>
          <div className="sliderViewport">
            {servicesLoading && (
              <div className="serviceStatus" style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
                Đang tải dịch vụ...
              </div>
            )}
            {!servicesLoading && servicesError && (
              <div className="serviceStatus error" style={{ padding: '40px', textAlign: 'center', fontSize: '18px', color: 'red' }}>
                {servicesError}
              </div>
            )}
            {!servicesLoading && !servicesError && services.length === 0 && (
              <div className="serviceStatus" style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
                Chưa có dịch vụ để hiển thị.
              </div>
            )}
            {services.length > 0 && (
              <div
                className="sliderTrack"
                ref={serviceTrackRef}
                style={{ 
                  transform: `translateX(-${serviceOffset}%)`,
                  display: 'flex',
                  transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
                onPointerDown={handleServicePointerDown}
                onPointerMove={handleServicePointerMove}
                onPointerUp={handleServicePointerUp}
                onPointerCancel={handleServicePointerUp}
                onTouchStart={handleServicePointerDown}
                onTouchMove={handleServicePointerMove}
                onTouchEnd={handleServicePointerUp}
              >
                {services.map((service, idx) => (
                  <div key={service.id || idx} className="serviceSlide">
                    <div className="serviceCard">
                      <div className="serviceCard-imageTop">
                        <img src={service.image || serviceFallback} alt={service.title} className="serviceCard-image" />
                      </div>
                      <div className="serviceCard-content">
                        <h3 className="serviceTitle">{service.title}</h3>
                        <p className="serviceDescription">{service.description || 'Hiện chưa có mô tả cho dịch vụ này.'}</p>
                        <div className="servicePrice">Giá: {service.price || 'Liên hệ'}</div>
                        <div className="serviceActions">
                          <Link
                            to={service.id ? `/services/${service.id}` : '/services'}
                            className="btnViewDetail"
                          >
                            Xem chi tiết
                          </Link>
                          <Link
                            to="/booking"
                            state={service.id ? { serviceId: service.id } : undefined}
                            className="btnBookNow"
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
            className="sliderArrow right" 
            onClick={serviceNext} 
            aria-label="Next" 
            disabled={serviceIndex >= serviceMaxIndex}
          >
            &gt;
          </button>
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