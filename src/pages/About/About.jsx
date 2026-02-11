import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './About.css';
import visionImage from '../../assets/anh_tam_nhin.jpg';
import facilityImg1 from '../../assets/z7501188211493_472143d80204db754b377a67838c33f5.jpg';
import facilityImg2 from '../../assets/z7501188266461_80cd9d87424adaf8b0a78bd40b3545a1.jpg';
import facilityImg3 from '../../assets/z7501188266555_1d32eab995cb25311ddb7d0ce6a4172c.jpg';
import facilityImg4 from '../../assets/z7501188266556_2e19562ee0b89224a3f3ec42d4b9232f.jpg';

const About = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    const handleStorageChange = (e) => {
      if (e.key === 'customerToken' || !e.key) {
        checkAuthStatus();
      }
    };
    
    const handleFocus = () => {
      checkAuthStatus();
    };
    
    const handleAuthChange = () => {
      checkAuthStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('customerToken');
    setIsAuthenticated(!!token);
  };
  return (
    <section className="aboutPage">
      <div className="aboutHero">
        <h1 className="aboutTitle">Về chúng tôi</h1>
        <p className="aboutSubtitle">
          Michelin Sơn Tây - Địa chỉ tin cậy cho mọi dịch vụ chăm sóc xe
        </p>
      </div>

      <div className="aboutContent">
        <div className="aboutSection">
          <div className="aboutText">
            <h2>Tầm nhìn & Ảnh hưởng</h2>
            <p>
              Michelin Sơn Tây hướng tới trở thành trung tâm dịch vụ lốp và chăm sóc xe chuẩn mực tại khu vực,
              nơi mọi khách hàng đều cảm thấy an tâm mỗi khi giao xe cho chúng tôi.
            </p>
            <p>
              Bằng việc áp dụng quy trình minh bạch, kỹ thuật hiện đại và trải nghiệm dịch vụ nhất quán,
              chúng tôi mong muốn góp phần nâng cao tiêu chuẩn an toàn giao thông và thói quen bảo dưỡng xe
              chuyên nghiệp cho cộng đồng địa phương.
            </p>
          </div>
          <div className="aboutImage">
            <img src={visionImage} alt="Tầm nhìn Michelin Sơn Tây" className="aboutVisionImage" />
          </div>
        </div>

        <div className="aboutValues">
          <h2 className="valuesTitle">Cơ sở vật chất</h2>
          <div className="valuesGrid facilityGrid">
            <div className="facilityCard">
              <img src={facilityImg1} alt="Khu sửa chữa" />
              <h3>Khu sửa chữa tiêu chuẩn</h3>
              <p>Trang bị thiết bị nâng hạ, dụng cụ đo kiểm hiện đại, đáp ứng các hạng mục sửa chữa quan trọng.</p>
            </div>
            <div className="facilityCard">
              <img src={facilityImg2} alt="Khu tiếp nhận khách hàng" />
              <h3>Khu tiếp nhận & chờ</h3>
              <p>Không gian tiếp khách thoáng, sạch và tiện nghi để bạn nghỉ ngơi trong lúc xe được chăm sóc.</p>
            </div>
            <div className="facilityCard">
              <img src={facilityImg3} alt="Khu lốp & cân chỉnh" />
              <h3>Khu lốp & cân chỉnh</h3>
              <p>Máy ra vào lốp, cân bằng động và căn chỉnh góc đặt bánh giúp xe vận hành êm ái, an toàn.</p>
            </div>
            <div className="facilityCard">
              <img src={facilityImg4} alt="Kho vật tư" />
              <h3>Khu kho & vật tư</h3>
              <p>Khu vực kho lốp và phụ tùng được sắp xếp gọn gàng, đảm bảo nguồn linh kiện luôn sẵn sàng.</p>
            </div>
          </div>
        </div>

        <div className="aboutStats">
          <div className="statItem">
            <div className="statNumber">10+</div>
            <div className="statLabel">Năm kinh nghiệm</div>
          </div>
          <div className="statItem">
            <div className="statNumber">5000+</div>
            <div className="statLabel">Khách hàng hài lòng</div>
          </div>
          <div className="statItem">
            <div className="statNumber">24/7</div>
            <div className="statLabel">Dịch vụ cứu hộ</div>
          </div>
          <div className="statItem">
            <div className="statNumber">100%</div>
            <div className="statLabel">Sản phẩm chính hãng</div>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="aboutCTA">
            <h2>Bạn muốn trải nghiệm dịch vụ của chúng tôi?</h2>
            <p>Hãy đặt lịch nhanh hôm nay để được phục vụ tốt nhất</p>
            <Link to="/booking" className="ctaButton">Đặt lịch nhanh</Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default About;
