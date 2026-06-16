import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './UserTour.css';

const STAFF_STEPS = [
  {
    target: 'body',
    title: 'Chào mừng bạn đến với Michelin Sơn Tây!',
    content: 'Hệ thống GMS (Garage Management System) đã sẵn sàng phục vụ. Chúng tôi sẽ hướng dẫn bạn nhanh qua các khu vực chức năng chính.',
    placement: 'center',
  },
  {
    target: '.sidebar, .mobile-navbar',
    title: 'Thanh điều hướng chức năng',
    content: 'Đây là nơi tập hợp tất cả các tính năng làm việc của bạn (như Quản lý lịch hẹn, Phiếu dịch vụ, Quản lý kho, Doanh thu...). Hệ thống tự động phân quyền theo vai trò của bạn.',
    placement: 'right',
    mobilePlacement: 'top',
  },
  {
    target: '.staff-header__bell-container, .mobile-navbar button:last-child',
    title: 'Trung tâm thông báo realtime',
    content: 'Các thông báo khẩn cấp, cập nhật trạng thái phiếu hoặc yêu cầu đặt lịch mới của khách hàng sẽ hiển thị ngay tại đây dưới dạng thời gian thực.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    target: '.staff-header__profile-container, .sidebar__toggle',
    title: 'Tài khoản & Cá nhân hóa',
    content: 'Xem thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu và đăng xuất khỏi phiên làm việc một cách an toàn.',
    placement: 'bottom',
    mobilePlacement: 'top',
  }
];

const CUSTOMER_STEPS = [
  {
    target: 'body',
    title: 'Chào mừng quý khách!',
    content: 'Cảm ơn quý khách đã tin dùng dịch vụ của Michelin Sơn Tây. Cùng khám phá nhanh các khu vực đặt lịch và hỗ trợ trực tuyến.',
    placement: 'center',
  },
  {
    target: '.headerNav',
    title: 'Thanh menu dịch vụ',
    content: 'Dễ dàng truy cập Trang chủ, Giới thiệu cửa hàng, thông tin chi tiết về các loại Dịch vụ & Phụ tùng chính hãng tiêu chuẩn Michelin.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    target: '.headerHotline',
    title: 'Đường dây nóng hỗ trợ',
    content: 'Gọi trực tiếp Hotline hỗ trợ kỹ thuật và giải đáp thắc mắc dịch vụ 24/7 của chúng tôi chỉ với một chạm.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    target: '.headerAuth',
    title: 'Tài khoản cá nhân',
    content: 'Sau khi đăng nhập thành công, quý khách có thể đặt lịch hẹn dịch vụ mới, xem lại lịch hẹn đã đặt hoặc cập nhật thông tin cá nhân tại đây.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  }
];

export default function UserTour({ type = 'staff' }) {
  const [activeStep, setActiveStep] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowPlacement, setArrowPlacement] = useState('top');
  const tourRef = useRef(null);

  const steps = type === 'staff' ? STAFF_STEPS : CUSTOMER_STEPS;
  const currentStep = steps[activeStep];

  // Khởi tạo và kiểm tra xem có cần hiển thị tour không
  useEffect(() => {
    // Tránh render phía SSR
    if (typeof window === 'undefined') return;

    const checkAuthAndTour = () => {
      if (type === 'staff') {
        const staffToken = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!staffToken) return;

        let staffId = 'guest';
        try {
          const rawProfile = localStorage.getItem('staffProfile');
          if (rawProfile) {
            const profile = JSON.parse(rawProfile);
            if (profile?.staffId) staffId = profile.staffId;
          }
        } catch (_) {}

        const key = `hasSeenTour_staff_${staffId}`;
        const hasSeen = localStorage.getItem(key);
        if (!hasSeen) {
          setShowTour(true);
          setActiveStep(0);
        }
      } else {
        const customerToken = localStorage.getItem('customerToken');
        if (!customerToken) return;

        const key = 'hasSeenTour_customer';
        const hasSeen = localStorage.getItem(key);
        if (!hasSeen) {
          setShowTour(true);
          setActiveStep(0);
        }
      }
    };

    // Kiểm tra ngay khi mount
    checkAuthAndTour();

    // Đối với luồng đăng nhập SPA, lắng nghe sự thay đổi storage / authChange
    const handleAuthChange = () => {
      checkAuthAndTour();
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [type]);

  // Cập nhật vị trí Spotlight & Tooltip khi đổi bước, scroll hoặc resize
  useEffect(() => {
    if (!showTour || !currentStep) return;

    const updatePosition = () => {
      if (currentStep.placement === 'center' || currentStep.target === 'body') {
        setSpotlightStyle(null);
        setTooltipStyle({});
        setArrowPlacement('center');
        return;
      }

      const elements = currentStep.target.split(',').map(sel => document.querySelector(sel.trim())).filter(Boolean);
      const targetElement = elements[0]; // Lấy phần tử khớp đầu tiên

      if (!targetElement) {
        // Fallback: nếu không thấy phần tử cần hướng dẫn, hiển thị dạng center modal
        setSpotlightStyle(null);
        setTooltipStyle({});
        setArrowPlacement('center');
        return;
      }

      // Cuộn phần tử đích vào tầm nhìn nếu cần
      targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      // Chờ animation cuộn xong và đo kích thước
      setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        
        // 1. Cập nhật Spotlight Style
        setSpotlightStyle({
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          borderRadius: window.getComputedStyle(targetElement).borderRadius || '8px',
        });

        // 2. Tính toán vị trí Tooltip Card
        let placement = currentStep.placement || 'bottom';
        if (window.innerWidth <= 980) {
          if (currentStep.mobilePlacement) {
            placement = currentStep.mobilePlacement;
          } else if (placement === 'right' || placement === 'left') {
            placement = 'top';
          }
        }

        const gap = 12;
        const tooltipWidth = 320; 
        const tooltipHeight = 180; // Chiều cao ước lượng tối đa
        let top = 0;
        let left = 0;

        if (placement === 'bottom') {
          top = rect.bottom + window.scrollY + gap;
          left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;
        } else if (placement === 'top') {
          top = rect.top + window.scrollY - tooltipHeight - gap;
          left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;
        } else if (placement === 'right') {
          left = rect.right + window.scrollX + gap;
          top = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2;
        } else if (placement === 'left') {
          left = rect.left + window.scrollX - tooltipWidth - gap;
          top = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2;
        }

        // Đảm bảo tooltip không bị tràn khung hình viewport
        const padding = 10;
        if (left < padding) left = padding;
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = window.innerWidth - tooltipWidth - padding;
        }
        if (top < padding) top = padding;

        setTooltipStyle({
          top: `${top}px`,
          left: `${left}px`,
          position: 'absolute',
        });
        setArrowPlacement(placement);
      }, 100);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [showTour, activeStep, currentStep]);

  if (!showTour) return null;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setShowTour(false);
    if (type === 'staff') {
      let staffId = 'guest';
      try {
        const rawProfile = localStorage.getItem('staffProfile');
        if (rawProfile) {
          const profile = JSON.parse(rawProfile);
          if (profile?.staffId) staffId = profile.staffId;
        }
      } catch (_) {}
      localStorage.setItem(`hasSeenTour_staff_${staffId}`, 'true');
    } else {
      localStorage.setItem('hasSeenTour_customer', 'true');
    }
  };

  const isLastStep = activeStep === steps.length - 1;
  const isCentered = currentStep.placement === 'center' || !spotlightStyle;

  return createPortal(
    <div className="user-tour-overlay" ref={tourRef}>
      {/* 1. Spotlight Overlay hoặc Backdrop */}
      {isCentered ? (
        <div className="user-tour-backdrop" onClick={handleComplete} />
      ) : (
        <div className="user-tour-spotlight" style={spotlightStyle} />
      )}

      {/* 2. Tooltip Card */}
      <div 
        className={`user-tour-tooltip ${isCentered ? 'is-centered' : ''}`}
        style={isCentered ? {} : tooltipStyle}
        role="dialog"
        aria-modal="true"
      >
        <div className="user-tour-header">
          <span className="user-tour-badge">Hướng dẫn {activeStep + 1}/{steps.length}</span>
          <button type="button" className="user-tour-skip-btn" onClick={handleComplete}>
            Bỏ qua
          </button>
        </div>

        <div className="user-tour-body">
          <h3>{currentStep.title}</h3>
          <p>{currentStep.content}</p>
        </div>

        <div className="user-tour-footer">
          <div className="user-tour-dots">
            {steps.map((_, i) => (
              <span key={i} className={`user-tour-dot ${i === activeStep ? 'is-active' : ''}`} />
            ))}
          </div>

          <div className="user-tour-actions">
            {activeStep > 0 && (
              <button type="button" className="user-tour-btn is-back" onClick={handleBack}>
                Quay lại
              </button>
            )}
            <button type="button" className="user-tour-btn is-next" onClick={handleNext}>
              {isLastStep ? 'Hoàn thành' : 'Tiếp tục'}
            </button>
          </div>
        </div>

        {/* Mũi tên trỏ vào phần tử */}
        {!isCentered && (
          <div className={`user-tour-arrow is-${arrowPlacement}`} aria-hidden="true" />
        )}
      </div>
    </div>,
    document.body
  );
}
