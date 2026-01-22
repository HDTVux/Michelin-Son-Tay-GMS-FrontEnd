import './About.css';

const About = () => {
  return (
    <section className="aboutPage">
      <div className="aboutHero">
        <h1 className="aboutTitle">Về chúng tôi</h1>
        <p className="aboutSubtitle">
          Michellin Sơn Tây - Địa chỉ tin cậy cho mọi dịch vụ chăm sóc xe
        </p>
      </div>

      <div className="aboutContent">
        <div className="aboutSection">
          <div className="aboutText">
            <h2>Giới thiệu</h2>
            <p>
              Michellin Sơn Tây là đại lý chính thức của thương hiệu Michelin tại khu vực Sơn Tây, 
              Hà Nội. Với nhiều năm kinh nghiệm trong ngành, chúng tôi tự hào là địa chỉ uy tín 
              cung cấp các sản phẩm và dịch vụ chăm sóc xe chất lượng cao.
            </p>
            <p>
              Chúng tôi chuyên cung cấp lốp xe, dầu nhớt, ắc quy chính hãng cùng với các dịch vụ 
              sửa chữa, sơn gò hàn và chăm sóc làm đẹp xe từ A-Z. Đội ngũ kỹ thuật viên chuyên nghiệp 
              và hệ thống cứu hộ 24/7 luôn sẵn sàng phục vụ quý khách.
            </p>
          </div>
          <div className="aboutImage">
            <div className="imagePlaceholder">
              <span>🚗</span>
            </div>
          </div>
        </div>

        <div className="aboutValues">
          <h2 className="valuesTitle">Giá trị cốt lõi</h2>
          <div className="valuesGrid">
            <div className="valueCard">
              <div className="valueIcon">✓</div>
              <h3>Chất lượng</h3>
              <p>Sản phẩm chính hãng, đảm bảo chất lượng và an toàn</p>
            </div>
            <div className="valueCard">
              <div className="valueIcon">⚡</div>
              <h3>Nhanh chóng</h3>
              <p>Dịch vụ nhanh chóng, tiết kiệm thời gian của bạn</p>
            </div>
            <div className="valueCard">
              <div className="valueIcon">💎</div>
              <h3>Chuyên nghiệp</h3>
              <p>Đội ngũ kỹ thuật viên giàu kinh nghiệm và chuyên nghiệp</p>
            </div>
            <div className="valueCard">
              <div className="valueIcon">❤️</div>
              <h3>Tận tâm</h3>
              <p>Phục vụ tận tâm, đặt lợi ích khách hàng lên hàng đầu</p>
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

        <div className="aboutCTA">
          <h2>Bạn muốn trải nghiệm dịch vụ của chúng tôi?</h2>
          <p>Hãy đặt lịch ngay hôm nay để được phục vụ tốt nhất</p>
          <a href="/register" className="ctaButton">Đặt lịch ngay</a>
        </div>
      </div>
    </section>
  );
};

export default About;
