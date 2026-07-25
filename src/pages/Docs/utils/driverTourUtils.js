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
    element: '.sidebar, .sidebar__nav, [data-tour-id="general"]',
    popover: {
      title: '📌 Thanh điều hướng chức năng',
      description: 'Nơi chứa toàn bộ phân hệ làm việc (Lễ tân, Cố vấn, Kỹ thuật viên, Kho, Doanh thu) và Trung tâm Tài liệu /docs.',
      side: 'right'
    }
  },
  {
    element: '.sidebar__search-wrapper',
    popover: {
      title: '🔍 Ô tìm kiếm nhanh (Ctrl + K)',
      description: 'Gõ biển số xe, tên khách hàng hoặc mã phiếu dịch vụ để tra cứu tức thì ở bất kỳ đâu.',
      side: 'bottom'
    }
  },
  {
    element: '.sidebar__profile',
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
    steps: steps.map(step => ({
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

  // Check if target elements exist in current page DOM
  const hasOnPageElements = tourSteps.some(step => Boolean(document.querySelector(step.element)));

  if (hasOnPageElements) {
    startDriverJsTour(tourSteps, onComplete);
  } else if (navigate) {
    sessionStorage.setItem('pendingDriverTour', JSON.stringify({
      steps: tourSteps,
      targetPath: targetPath,
      completedTopicId: tourSteps.topicId || null
    }));

    window.dispatchEvent(new CustomEvent('triggerTour'));
    navigate(targetPath);
  } else {
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
