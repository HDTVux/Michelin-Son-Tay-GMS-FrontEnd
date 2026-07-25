import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driverCustomTheme.css';

let activeDriverInstance = null;
let isOnboardingStarted = false;

export const ONBOARDING_STEPS = [
  {
    element: 'body',
    popover: {
      title: '👋 Chào mừng bạn đến với Michelin Sơn Tây GMS!',
      description: 'Hệ thống Quản lý Garage Michelin đã sẵn sàng. Chúng tôi sẽ hướng dẫn nhanh các khu vực chức năng chính trên màn hình.',
      side: 'bottom'
    }
  },
  {
    element: '.staff-header, .staff-header__left',
    popover: {
      title: '🖥️ Thanh Header Navbar điều hướng',
      description: 'Thanh điều hướng phía trên chứa thương hiệu Michelin Sơn Tây và các liên kết truy cập nhanh phân hệ chính.',
      side: 'bottom'
    }
  },
  {
    element: '.staff-header__search-container, .sidebar__search-wrapper',
    popover: {
      title: '🔍 Ô Tìm kiếm Mọi thứ & Trợ lý AI (Ctrl + K)',
      description: 'Tra cứu thông minh tất cả dữ liệu (Biển số xe, Khách hàng, Mã phiếu, SKU lốp Michelin) kết hợp Trợ lý AI giải đáp nghiệp vụ tức thì.',
      side: 'bottom'
    }
  },
  {
    element: '.staff-header__scan-btn, .staff-header__chat-container',
    popover: {
      title: '📷 & 💬 Bộ công cụ Nhanh: Quét mã QR/Barcode & Nhắn tin (Message)',
      description: 'Cụm công cụ mở camera quét mã tem lốp Michelin/phiếu dịch vụ tức thì và nhắn tin trao đổi nội bộ thời gian thực giữa các phân hệ.',
      side: 'bottom'
    }
  },
  {
    element: '.sidebar, .sidebar__nav, [data-tour-id="general"]',
    popover: {
      title: '📌 Thanh menu điều hướng chức năng',
      description: 'Nơi chứa toàn bộ phân hệ làm việc (Lễ tân, Cố vấn, Kỹ thuật viên, Kho, Thu ngân) và Trung tâm Tài liệu /docs.',
      side: 'right'
    }
  },
  {
    element: '.mobile-navbar, .mobile-navbar__dock',
    popover: {
      title: '📱 Thanh Mobile Bottom Dock (Linh hoạt trên Điện thoại)',
      description: 'Trải nghiệm mượt mà trên di động: Bạn có thể nhấn giữ để thu gọn / mở rộng menu, hoặc kéo thả vị trí dock tới góc làm việc thuận tay nhất!',
      side: 'top'
    }
  },
  {
    element: '.staff-header__profile-container, .sidebar__profile',
    popover: {
      title: '👤 Tài khoản & Đổi mật khẩu',
      description: 'Xem thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu và xem lịch sử chấm công của bạn.',
      side: 'bottom'
    }
  }
];

export const startDriverJsTour = (steps = [], onComplete = null) => {
  if (!steps || steps.length === 0) return;

  // Destroy previous active tour instance if any
  if (activeDriverInstance) {
    try {
      activeDriverInstance.destroy();
    } catch (err) {
      console.warn('Destroy active tour error:', err);
    }
    activeDriverInstance = null;
  }

  // Dynamically filter steps to only include elements that are visible on the current screen (handles Mobile vs Desktop)
  const visibleSteps = steps.filter(step => {
    if (!step.element || step.element === 'body') return true;
    const matchedEls = Array.from(document.querySelector(step.element) ? [document.querySelector(step.element)] : document.querySelectorAll(step.element));
    return matchedEls.some(el => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
  });

  const finalSteps = visibleSteps.length > 0 ? visibleSteps : steps;

  const driverObj = driver({
    showProgress: true,
    animate: true,
    popoverClass: 'driverjs-theme',
    overlayColor: 'rgba(15, 23, 42, 0.75)',
    nextBtnText: 'Tiếp tục ➔',
    prevBtnText: '◄ Quay lại',
    doneBtnText: 'Hoàn thành Tour 🎉',
    onDestroyStarted: () => {
      activeDriverInstance = null;
      if (onComplete) onComplete();
      driverObj.destroy();
    },
    steps: finalSteps.map(step => ({
      element: step.element,
      popover: {
        title: step.popover?.title || 'Hướng dẫn thao tác',
        description: step.popover?.description || '',
        side: step.popover?.side || 'bottom',
        align: 'start'
      }
    }))
  });

  activeDriverInstance = driverObj;
  driverObj.drive();
};

export const launchDriverTour = (tourSteps = [], onComplete = null, navigate = null, targetPath = '/dashboard') => {
  if (!tourSteps || tourSteps.length === 0) {
    alert('Bài học này chưa cấu hình tour tương tác!');
    return;
  }

  // Clear any pending tour
  sessionStorage.removeItem('pendingDriverTour');

  const isCurrentDocsPage = window.location.pathname.startsWith('/docs');

  if (navigate && isCurrentDocsPage) {
    // When called from /docs, save pending tour and navigate to live app dashboard
    sessionStorage.setItem('pendingDriverTour', JSON.stringify({
      steps: tourSteps,
      targetPath: targetPath || '/dashboard',
      completedTopicId: tourSteps.topicId || null
    }));

    window.dispatchEvent(new CustomEvent('triggerTour'));
    navigate(targetPath || '/dashboard');
  } else {
    // Already on live app screen, run tour directly
    startDriverJsTour(tourSteps, onComplete);
  }
};

export const checkAndRunPendingDriverTour = (onComplete = null) => {
  try {
    const raw = sessionStorage.getItem('pendingDriverTour');
    if (!raw) return false;

    const data = JSON.parse(raw);
    sessionStorage.removeItem('pendingDriverTour');

    if (data && Array.isArray(data.steps) && data.steps.length > 0) {
      window.dispatchEvent(new CustomEvent('triggerTour'));
      setTimeout(() => {
        startDriverJsTour(data.steps, () => {
          if (onComplete) onComplete(data.completedTopicId);
        });
      }, 350);
      return true;
    }
  } catch (err) {
    console.warn('Error launching pending driver tour:', err);
  }
  return false;
};

export const checkAndRunFirstTimeStaffOnboarding = () => {
  // Check if pending topic tour exists first
  const pendingRaw = sessionStorage.getItem('pendingDriverTour');
  if (pendingRaw) {
    checkAndRunPendingDriverTour();
    return;
  }

  // Guard against duplicate execution (React StrictMode or multiple component mounts)
  if (isOnboardingStarted) {
    return;
  }

  try {
    const hasSeen = localStorage.getItem('hasSeenStaffTour');
    if (!hasSeen) {
      // Mark immediately synchronously to prevent duplicate triggers
      isOnboardingStarted = true;
      localStorage.setItem('hasSeenStaffTour', 'true');

      setTimeout(() => {
        startDriverJsTour(ONBOARDING_STEPS);
      }, 600);
    }
  } catch (err) {
    console.warn('Error checking staff onboarding:', err);
  }
};
