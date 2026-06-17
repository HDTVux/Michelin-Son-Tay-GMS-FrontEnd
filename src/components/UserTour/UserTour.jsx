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
    target: '.sidebar__toggle, .sidebar, .mobile-navbar',
    title: 'Thanh điều hướng chức năng',
    content: 'Đây là nơi tập hợp tất cả các tính năng làm việc của bạn (như Quản lý lịch hẹn, Phiếu dịch vụ, Quản lý kho, Doanh thu...). Hệ thống tự động phân quyền theo vai trò của bạn.',
    placement: 'right',
    mobilePlacement: 'bottom',
  },
  {
    target: '.staff-header__bell-container, .mobile-navbar button:last-child',
    title: 'Trung tâm thông báo realtime',
    content: 'Các thông báo khẩn cấp, cập nhật trạng thái phiếu hoặc yêu cầu đặt lịch mới của khách hàng sẽ hiển thị ngay tại đây dưới dạng thời gian thực.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    target: '.staff-header__profile-container, .sidebar__profile',
    title: 'Tài khoản & Cá nhân hóa',
    content: 'Xem thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu và đăng xuất khỏi phiên làm việc một cách an toàn.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
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

    // Lắng nghe sự kiện phát hướng dẫn thủ công (on-demand)
    const handleTriggerTour = (e) => {
      const targetType = e.detail?.type || type;
      if (targetType === type) {
        setShowTour(true);
        setActiveStep(0);
      }
    };

    // Kiểm tra query parameter để kích hoạt tour
    const params = new URLSearchParams(window.location.search);
    if (params.get('startTour') === type) {
      setShowTour(true);
      setActiveStep(0);

      // Xóa query parameter khỏi URL mà không làm tải lại trang
      const url = new URL(window.location);
      url.searchParams.delete('startTour');
      window.history.replaceState({}, '', url);
    }

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('authChange', handleAuthChange);
    window.addEventListener('triggerTour', handleTriggerTour);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('authChange', handleAuthChange);
      window.removeEventListener('triggerTour', handleTriggerTour);
    };
  }, [type]);

  // Tự động cuộn lên đầu trang khi bắt đầu tour
  useEffect(() => {
    if (showTour) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showTour]);

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
      // Ưu tiên chọn phần tử đang hiển thị trên màn hình (như mobile-navbar thay vì sidebar khi ở trên mobile)
      const visibleElements = elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      });
      const targetElement = visibleElements[0] || elements[0]; // Lấy phần tử khớp đầu tiên

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
        
        // 1. Cập nhật Spotlight Style (Sử dụng Fixed để không bị ảnh hưởng bởi scroll tài liệu)
        setSpotlightStyle({
          top: `${rect.top}px`,
          left: `${rect.left}px`,
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
        
        // Đo chiều cao thực tế của tooltip để tránh đè lấp phần tử được highlight
        const tooltipEl = tourRef.current?.querySelector('.user-tour-tooltip');
        const measuredHeight = tooltipEl ? tooltipEl.offsetHeight : 180;
        const tooltipHeight = measuredHeight > 50 ? measuredHeight : 180;
        
        let top = 0;
        let left = 0;

        if (placement === 'bottom') {
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
        } else if (placement === 'top') {
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
        } else if (placement === 'right') {
          left = rect.right + gap;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        } else if (placement === 'left') {
          left = rect.left - tooltipWidth - gap;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
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
          position: 'fixed',
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
