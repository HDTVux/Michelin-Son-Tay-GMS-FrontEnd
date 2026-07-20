import { Link } from 'react-router-dom';
import './VehicleBrands.css';

const BRANDS = [
  'Toyota', 'Honda', 'Hyundai', 'Kia', 'Mazda', 'Ford', 'Mitsubishi', 'VinFast',
];

const VehicleBrands = () => (
  <section className="vehicleBrandsSection">
    <div className="vehicleBrandsContainer">
      <div className="vehicleBrandsHeader">
        <div className="servicesLabel">TÌM THEO XE CỦA BẠN</div>
        <h2 className="vehicleBrandsTitle">
          <span className="titlePart1">Dịch vụ</span>
          <span className="titlePart2">theo dòng xe</span>
        </h2>
        <p className="vehicleBrandsSubtitle">
          Michelin Sơn Tây nhận bảo dưỡng, sửa chữa và thay phụ tùng chính hãng cho hầu hết các dòng xe phổ biến tại Việt Nam.
        </p>
      </div>

      <div className="vehicleBrandsGrid">
        {BRANDS.map((brand) => (
          <Link key={brand} to="/parts" className="vehicleBrandCard">
            <span className="vehicleBrandName">{brand}</span>
          </Link>
        ))}
      </div>

      <div className="vehicleBrandsFooter">
        <Link to="/parts" className="vehicleBrandsMore">
          Xem tất cả dòng xe được hỗ trợ
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </div>
  </section>
);

export default VehicleBrands;
