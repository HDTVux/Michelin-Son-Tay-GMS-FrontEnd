import { Outlet } from 'react-router-dom';
import Header from './Header/Header.jsx';
import Footer from './Footer/Footer.jsx';
import BackToTop from '../components/BackToTop/BackToTop.jsx';
import UserTour from '../components/UserTour/UserTour.jsx';
import CustomerAiWidget from '../components/AIAssistant/CustomerAiWidget.jsx';
import { CustomerAiAssistantProvider } from '../context/CustomerAiAssistantContext.jsx';
import './MainLayout.css';

// MainLayout cũng được dùng cho trang chi tiết dịch vụ trên domain staff —
// widget trợ lý ảo khách hàng chỉ hiện trên tên miền chính (khách).
const isStaffSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('staff.') || hostname.startsWith('admin.');
};

const MainLayoutContent = ({ isStaff }) => (
  <div className="layoutRoot">
    <Header />
    <main className="layoutMain">
      {/* Outlet là nơi nội dung của từng trang (Home, About...) sẽ hiển thị */}
      <Outlet />
    </main>
    <Footer />
    <BackToTop />
    <UserTour type="customer" />
    {!isStaff && <CustomerAiWidget />}
  </div>
);

// CustomerAiAssistantProvider chia sẻ 1 instance chat state cho CustomerAiWidget
// (nút mặc định) và nút robot tích hợp trong khối "Kênh liên hệ" ở trang chủ
// (BussinessInfor.jsx, render qua <Outlet />) — cùng mở chung một panel.
// Luôn bọc Provider (kể cả domain staff): rẻ (chỉ local state), và tránh phải
// tách 2 nhánh JSX riêng — trang chủ (nơi cần context) vốn chỉ tồn tại ở domain khách.
const MainLayout = () => {
  const isStaff = isStaffSubdomain();
  return (
    <CustomerAiAssistantProvider>
      <MainLayoutContent isStaff={isStaff} />
    </CustomerAiAssistantProvider>
  );
};

export default MainLayout;