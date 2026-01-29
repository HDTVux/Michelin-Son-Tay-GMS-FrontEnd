import './Services.css';
import { useEffect, useState } from 'react';

const Services = () => {
  const services = [
    {
      icon: '🚗',
      title: 'Lốp xe chính hãng',
      description: 'Cung cấp lốp xe Michelin chính hãng với đầy đủ kích cỡ, đảm bảo chất lượng và an toàn.',
      features: ['Lốp Michelin chính hãng', 'Đa dạng kích cỡ', 'Bảo hành chính thức', 'Giá cả hợp lý']
    },
    {
      icon: '🔋',
      title: 'Dầu nhớt & Ắc quy',
      description: 'Dầu nhớt và ắc quy chất lượng cao, phù hợp với mọi loại xe, đảm bảo hiệu suất tối ưu.',
      features: ['Dầu nhớt cao cấp', 'Ắc quy chính hãng', 'Tư vấn miễn phí', 'Thay thế nhanh chóng']
    },
    {
      icon: '🔧',
      title: 'Sửa chữa & Cứu hộ 24/7',
      description: 'Dịch vụ sửa chữa chuyên nghiệp và cứu hộ 24/7, luôn sẵn sàng hỗ trợ bạn mọi lúc mọi nơi.',
      features: ['Cứu hộ 24/7', 'Sửa chữa chuyên nghiệp', 'Đội ngũ kỹ thuật viên', 'Phụ tùng chính hãng']
    },
    {
      icon: '🎨',
      title: 'Sơn - Gò - Hàn',
      description: 'Dịch vụ sơn, gò, hàn chuyên nghiệp, phục hồi xe về trạng thái như mới với công nghệ hiện đại.',
      features: ['Sơn xe chuyên nghiệp', 'Gò phục hồi', 'Hàn kỹ thuật cao', 'Bảo hành chất lượng']
    },
    {
      icon: '✨',
      title: 'Chăm sóc & Làm đẹp xe',
      description: 'Dịch vụ chăm sóc và làm đẹp xe từ A-Z, giúp xe của bạn luôn sáng bóng và bền đẹp.',
      features: ['Rửa xe chuyên nghiệp', 'Đánh bóng', 'Bảo dưỡng định kỳ', 'Phụ kiện trang trí']
    },
    {
      icon: '📞',
      title: 'Tư vấn miễn phí',
      description: 'Đội ngũ tư vấn chuyên nghiệp, sẵn sàng hỗ trợ bạn chọn lựa dịch vụ phù hợp nhất.',
      features: ['Tư vấn 24/7', 'Chuyên nghiệp', 'Miễn phí', 'Nhiệt tình']
    }
  ];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 480) setVisible(1);
      else if (w <= 900) setVisible(2);
      else setVisible(3);
      setIndex(0);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const maxIndex = Math.max(0, services.length - visible);
  const offset = (index * 100) / visible;
  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(maxIndex, i + 1));

  return (
    <section className="servicesPage">
      <div className="servicesHero">
        <h1 className="servicesTitle">Dịch vụ của chúng tôi</h1>
        <p className="servicesSubtitle">
          Chúng tôi cung cấp đầy đủ các dịch vụ chăm sóc và bảo dưỡng xe từ A-Z
        </p>
      </div>

      <div className="servicesSlider">
        <button className="sliderArrow left" onClick={prev} aria-label="Previous" disabled={index === 0}>&lt;</button>
        <div className="sliderViewport">
          <div
            className="sliderTrack"
            style={{ 
            transform: `translateX(-${offset}%)`,
            display: 'flex',
            transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
>
            {services.map((service, idx) => (
              <div key={idx} className="serviceSlide" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="serviceCard">
                  <div className="serviceIcon">{service.icon}</div>
                  <h3 className="serviceTitle">{service.title}</h3>
                  <p className="serviceDescription">{service.description}</p>
                  <ul className="serviceFeatures">
                    {service.features.map((feature, fidx) => (
                      <li key={fidx}>
                        <span className="checkIcon">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="sliderArrow right" onClick={next} aria-label="Next" disabled={index >= maxIndex}>&gt;</button>
      </div>

    </section>
  );
};

export default Services;
