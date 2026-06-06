import { useNavigate } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    const hostname = window.location.hostname;
    const isStaff = hostname.startsWith('staff.') || hostname.startsWith('admin.');
    if (isStaff) {
      navigate('/login');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <h1 className="notfound-code">404</h1>
        <div className="notfound-tire-icon">🛞</div>
        <h2 className="notfound-title">Trang không tìm thấy</h2>
        <p className="notfound-text">
          Đường dẫn bạn truy cập có vẻ đã đi sai hướng hoặc không tồn tại.
        </p>
        <button className="notfound-btn" onClick={handleGoHome}>
          Quay lại Trang chủ
        </button>
      </div>
    </div>
  );
}
