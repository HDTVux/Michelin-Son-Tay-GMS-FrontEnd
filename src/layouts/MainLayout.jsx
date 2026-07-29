import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header/Header.jsx';
import Footer from './Footer/Footer.jsx';
import BackToTop from '../components/BackToTop/BackToTop.jsx';
import UserTour from '../components/UserTour/UserTour.jsx';
import CustomerAiWidget from '../components/AIAssistant/CustomerAiWidget.jsx';
import BottomContactBar from '../components/BottomContactBar/BottomContactBar.jsx';
import { CustomerAiAssistantProvider, useCustomerAiAssistant } from '../context/CustomerAiAssistantContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import BugReportModal from '../components/BugReport/BugReportModal.jsx';
import { useBugReportOpenEvent } from '../components/BugReport/bugReportBus.js';
import { useShakeToReport } from '../hooks/useShakeToReport.js';
import { Phone, X, Bot, Bug } from 'lucide-react';
import zaloLogo from '../assets/logo-zalo-vector.png';
import messengerLogo from '../assets/messenger-logo.webp';
import './MainLayout.css';

// MainLayout cũng được dùng cho trang chi tiết dịch vụ trên domain staff —
// widget trợ lý ảo khách hàng chỉ hiện trên tên miền chính (khách).
const isStaffSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('staff.') || hostname.startsWith('admin.');
};

const MainLayoutContent = ({ isStaff }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  // Nút báo lỗi cần danh tính người gửi nên chỉ mở cho khách đã đăng nhập.
  const [hasCustomerSession, setHasCustomerSession] = useState(
    () => Boolean(localStorage.getItem('customerToken')),
  );
  const aiState = useCustomerAiAssistant();

  useEffect(() => {
    const syncSession = () => setHasCustomerSession(Boolean(localStorage.getItem('customerToken')));
    // 'authChange' do luồng đăng nhập/đăng xuất phát ra, 'storage' cho tab khác.
    window.addEventListener('authChange', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('authChange', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  // Mở form từ mục "Báo lỗi phần mềm" trong dropdown avatar của Header.
  useBugReportOpenEvent(useCallback(() => setIsBugReportOpen(true), []));
  // Mobile không có nút nổi — lắc máy để báo lỗi.
  useShakeToReport(!isStaff && hasCustomerSession && !isBugReportOpen);

  return (
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
      {!isStaff && <BottomContactBar />}

      {/* Floating Kênh liên hệ - Toàn cục trên tất cả các trang khách */}
      {!isStaff && (
        isVisible ? (
          <div className="floatingContact">
            <button
              type="button"
              className="floatingContact__close"
              onClick={() => setIsVisible(false)}
              title="Thu gọn kênh liên hệ"
              aria-label="Thu gọn kênh liên hệ"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
            {hasCustomerSession && (
              <button
                type="button"
                className="floatingCircle floatingCircle--bug"
                onClick={() => setIsBugReportOpen(true)}
                aria-label="Báo lỗi phần mềm"
              >
                <span className="floatingCircle__tooltip">Báo lỗi phần mềm</span>
                <span className="floatingCircle__icon"><Bug size={22} strokeWidth={2.2} /></span>
              </button>
            )}
            {!isStaff && aiState?.enabled && !aiState.isOpen && (
              <button
                type="button"
                className="floatingCircle floatingCircle--ai"
                onClick={aiState.openPanel}
                aria-label="Mở trợ lý ảo"
              >
                <span className="floatingCircle__tooltip">Trợ lý ảo</span>
                <span className="floatingCircle__icon"><Bot size={22} strokeWidth={2.2} /></span>
              </button>
            )}
            <a className="floatingCircle floatingCircle--zalo" href="https://zalo.me/thietbilop" target="_blank" rel="noreferrer" aria-label="Liên hệ Zalo">
              <span className="floatingCircle__tooltip">Chat Zalo</span>
              <span className="floatingCircle__icon floatingCircle__icon--logo">
                <img src={zaloLogo} alt="Zalo" />
              </span>
            </a>
            <a className="floatingCircle floatingCircle--call" href="tel:0987545680" aria-label="Gọi điện">
              <span className="floatingCircle__tooltip">Gọi ngay</span>
              <span className="floatingCircle__icon"><Phone size={22} strokeWidth={2.2} /></span>
            </a>
            <a className="floatingCircle floatingCircle--messenger" href="https://m.me/michelinsontay" target="_blank" rel="noreferrer" aria-label="Nhắn tin Messenger">
              <span className="floatingCircle__tooltip">Nhắn tin Messenger</span>
              <span className="floatingCircle__icon floatingCircle__icon--logo floatingCircle__icon--messengerLogo">
                <img src={messengerLogo} alt="Messenger" />
              </span>
            </a>
          </div>
        ) : (
          <button
            className="floatingContact__trigger"
            onClick={() => setIsVisible(true)}
            title="Mở kênh liên hệ"
            aria-label="Mở kênh liên hệ"
          >
            📞
          </button>
        )
      )}

      {!isStaff && (
        <BugReportModal open={isBugReportOpen} onClose={() => setIsBugReportOpen(false)} />
      )}
    </div>
  );
};

// CustomerAiAssistantProvider chia sẻ 1 instance chat state cho CustomerAiWidget
// (nút mặc định) và nút robot tích hợp trong khối "Kênh liên hệ" ở trang chủ
// (BussinessInfor.jsx, render qua <Outlet />) — cùng mở chung một panel.
// Luôn bọc Provider (kể cả domain staff): rẻ (chỉ local state), và tránh phải
// tách 2 nhánh JSX riêng — trang chủ (nơi cần context) vốn chỉ tồn tại ở domain khách.
const MainLayout = () => {
  const isStaff = isStaffSubdomain();
  return (
    <CustomerAiAssistantProvider>
      {/* CartProvider: giỏ hàng dùng chung cho Header (badge) và các trang con qua Outlet */}
      <CartProvider>
        <MainLayoutContent isStaff={isStaff} />
      </CartProvider>
    </CustomerAiAssistantProvider>
  );
};

export default MainLayout;