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
  let hasCrossPageRoute = false;
  const visibleSteps = steps.filter(step => {
    if (step.targetPath && step.targetPath !== window.location.pathname) {
      hasCrossPageRoute = true;
    }
    // If a step requires navigating to a different page route, keep all subsequent steps intact for the target page
    if (hasCrossPageRoute) return true;

    if (!step.element || step.element === 'body' || step.autoOpenDropdown || step.autoOpenChat || step.autoOpenChatNew || step.autoOpenNotification || step.targetPath || step.allowMissing || step.autoClick || (step.element && step.element.includes('modal'))) return true;
    try {
      const el = document.querySelector(step.element);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    } catch {
      return true;
    }
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
    onHighlightStarted: (element, step) => {
      // 1. Close Chat Popover if current step is NOT a Chat step
      if (!step || (!step.autoOpenChat && !step.autoOpenChatNew)) {
        const chatBtn = document.querySelector('.chat-widget__launcherBtn, .sidebar__chat-container button, .mobile-navbar__chat-btn');
        const chatPopover = document.querySelector('.chat-widget__popover');
        if (chatPopover && chatBtn) {
          chatBtn.click();
        }
      }

      // 2. Close Notification Panel if current step is NOT a Notification step
      if (!step || !step.autoOpenNotification) {
        const notifEl = document.querySelector('.staffNotification');
        if (notifEl && notifEl.hasAttribute('open')) {
          notifEl.removeAttribute('open');
        }
      }

      // 3. Close Profile Dropdown if current step is NOT a Profile Dropdown step
      if (!step || !step.autoOpenDropdown) {
        const dropdown = document.querySelector('.staff-header__dropdown, .sidebar__dropdown');
        const profileBtn = document.querySelector('.staff-header__profile-avatar-btn, .sidebar__profile-avatar-btn');
        if (dropdown && profileBtn) {
          profileBtn.click();
        }
      }

      // 4. Auto open profile dropdown when step.autoOpenDropdown is explicitly true
      if (step && step.autoOpenDropdown === true) {
        setTimeout(() => {
          const profileBtn = document.querySelector('.staff-header__profile-avatar-btn, .sidebar__profile-avatar-btn, .mobile-navbar__profile-btn');
          const dropdown = document.querySelector('.staff-header__dropdown, .sidebar__dropdown');
          if (profileBtn && !dropdown) {
            profileBtn.click();
          }
        }, 150);
      }

      // 5. Auto open Chat dropdown & click (+) New Chat button
      if (step && (step.autoOpenChat === true || step.autoOpenChatNew === true)) {
        setTimeout(() => {
          const chatBtn = document.querySelector('.chat-widget__launcherBtn, .sidebar__chat-container button, .mobile-navbar__chat-btn');
          const popover = document.querySelector('.chat-widget__popover');
          if (chatBtn && !popover) {
            chatBtn.click();
          }

          if (step.autoOpenChatNew === true) {
            setTimeout(() => {
              const newBtn = document.querySelector('.chat-widget__popoverNewBtn');
              if (newBtn) {
                newBtn.click();
              }
            }, 220);
          }
        }, 150);
      }

      // 6. Auto open Notification dropdown when step.autoOpenNotification is true
      if (step && step.autoOpenNotification === true) {
        setTimeout(() => {
          const detailsEl = document.querySelector('.staffNotification');
          const summaryBtn = document.querySelector('.staffNotification__button, .mobile-navbar__bell-btn');
          if (detailsEl) {
            if (summaryBtn && !detailsEl.hasAttribute('open')) {
              summaryBtn.click();
            } else {
              detailsEl.setAttribute('open', 'true');
            }
          }
        }, 150);
      }

      // 7. Auto click element if autoClick is specified (e.g. opening modal)
      const activeIdx = typeof driverObj?.getActiveIndex === 'function' ? driverObj.getActiveIndex() : -1;
      const targetStepObj = (activeIdx >= 0 && activeIdx < finalSteps.length) ? finalSteps[activeIdx] : step;
      const autoClickSelector = targetStepObj?.autoClick || step?.autoClick;

      if (autoClickSelector) {
        let attempts = 0;
        const tryClick = () => {
          const clickEl = document.querySelector(autoClickSelector)
            || document.querySelector('[data-tour-id="view-assign-btn"]')
            || document.querySelector('.assign-action-btn')
            || document.querySelector('table tbody tr:first-child button:nth-child(2)');
          if (clickEl) {
            clickEl.click();
          } else if (attempts < 15) {
            attempts++;
            setTimeout(tryClick, 200);
          }
        };
        setTimeout(tryClick, 150);
      }
    },
    onNextClick: () => {
      const activeIdx = typeof driverObj.getActiveIndex === 'function' ? driverObj.getActiveIndex() : 0;
      const nextIndex = activeIdx + 1;
      if (nextIndex < finalSteps.length) {
        const nextStep = finalSteps[nextIndex];
        const currentPath = window.location.pathname;
        const targetPath = nextStep.targetPath;

        // Check if next step requires opening a new page route (e.g. /staff-profile)
        if (targetPath && targetPath !== currentPath) {
          const remainingSteps = finalSteps.slice(nextIndex);
          sessionStorage.setItem('pendingDriverTour', JSON.stringify({
            steps: remainingSteps,
            targetPath: targetPath,
            completedTopicId: steps.topicId || null
          }));
          driverObj.destroy();
          window.location.href = targetPath;
          return;
        }
      }
      driverObj.moveNext();
    },
    onDestroyStarted: () => {
      activeDriverInstance = null;
      if (onComplete) onComplete();
      driverObj.destroy();

      // Return to /docs if launched from /docs and tour is completed
      const remainingPending = sessionStorage.getItem('pendingDriverTour');
      const isFromDocs = sessionStorage.getItem('driverTourIsFromDocs') === 'true';

      if (!remainingPending && isFromDocs && window.location.pathname !== '/docs') {
        sessionStorage.removeItem('driverTourIsFromDocs');
        setTimeout(() => {
          window.location.href = '/docs';
        }, 200);
      }
    },
    steps: finalSteps.map(step => ({
      element: step.element,
      autoOpenDropdown: step.autoOpenDropdown || false,
      autoOpenChat: step.autoOpenChat || false,
      autoOpenChatNew: step.autoOpenChatNew || false,
      autoOpenNotification: step.autoOpenNotification || false,
      targetPath: step.targetPath || null,
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

  // Flag tour as launched from /docs so completion returns to /docs
  sessionStorage.setItem('driverTourIsFromDocs', 'true');

  // Clear any pending tour
  sessionStorage.removeItem('pendingDriverTour');

  const destination = targetPath || '/dashboard';
  const isCurrentDocsPage = window.location.pathname.startsWith('/docs');

  if (navigate && isCurrentDocsPage) {
    // When called from /docs, save pending tour and navigate to live app destination route
    sessionStorage.setItem('pendingDriverTour', JSON.stringify({
      steps: tourSteps,
      targetPath: destination,
      completedTopicId: tourSteps.topicId || null
    }));

    window.dispatchEvent(new CustomEvent('triggerTour'));
    if (destination === '/login') {
      window.location.href = '/login';
    } else {
      navigate(destination);
    }
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
      // System onboarding tour - do NOT return to /docs
      sessionStorage.setItem('driverTourIsFromDocs', 'false');

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
