import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
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

const RECEPTIONIST_WORKFLOW_STEPS = [
  {
    target: 'body',
    title: 'Hướng dẫn Quy trình Tiếp nhận & Đặt lịch',
    content: 'Tour này sẽ đồng hành cùng bạn đi vào chi tiết các trang nghiệp vụ chính của Lễ tân trên hệ thống.',
    placement: 'center',
  },
  {
    path: '/create-booking',
    target: 'body',
    title: '1. Trang Tạo lịch giữ chỗ',
    content: 'Chào mừng bạn đến với trang Tạo lịch giữ chỗ. Lễ tân thao tác tại đây khi khách hàng đặt lịch trực tiếp hoặc qua hotline.',
    placement: 'center',
  },
  {
    path: '/create-booking',
    target: '[class*="estimatePanel"]',
    title: '1.1. Bảng báo giá dự kiến',
    content: 'Tại đây, bạn có thể thêm các phụ tùng lốp Michelin chính hãng hoặc các dịch vụ đi kèm để tạm tính chi phí ban đầu gửi khách hàng.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/create-booking',
    target: '[class*="stepper-wrapper"]',
    title: '1.2. Quy trình các bước tạo lịch',
    content: 'Theo dõi tiến trình qua 3 bước tiện lợi: Ước lượng báo giá -> Chọn lịch -> Nhập thông tin & Yêu cầu đặc biệt của chủ xe.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/booking-request-management',
    target: 'body',
    title: '2. Quản lý Yêu cầu đặt lịch',
    content: 'Đây là giao diện Quản lý Yêu cầu đặt lịch, nơi tập hợp các yêu cầu đặt lịch hẹn online do khách hàng gửi từ website.',
    placement: 'center',
  },
  {
    path: '/booking-request-management',
    target: '[class*="pending-filters"]',
    title: '2.1. Bộ lọc và Tìm kiếm',
    content: 'Lọc nhanh danh sách theo loại khách hàng, ngày hẹn, trạng thái (Chờ duyệt, Xác nhận...) hoặc tìm kiếm trực tiếp theo tên/mã.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/booking-request-management',
    target: '[class*="booking-table__wrapper"]',
    title: '2.2. Danh sách yêu cầu đặt lịch',
    content: 'Bấm nút "Xem chi tiết" ở dòng tương ứng để kiểm tra thông tin chi tiết, phê duyệt hoặc từ chối lịch hẹn của khách hàng.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-management',
    target: 'body',
    title: '3. Quản lý Phiếu dịch vụ',
    content: 'Cuối cùng là trang Quản lý Phiếu dịch vụ, nơi quản lý toàn bộ phiếu dịch vụ/sửa chữa đang chạy trong garage.',
    placement: 'center',
  },
  {
    path: '/service-ticket-management',
    target: '[class*="pending-filters"]',
    title: '3.1. Trạng thái phiếu dịch vụ',
    content: 'Lọc phiếu theo các tiến độ sửa chữa thực tế tại xưởng như: Đang kiểm tra, Chờ xử lý, Đang sửa chữa, Chờ thanh toán...',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/service-ticket-management',
    target: '[class*="booking-table__wrapper"]',
    title: '3.2. Chi tiết và Phân công',
    content: 'Bấm "Xem chi tiết" để xem báo giá hoặc "Xem phân công" để quản lý/đổi Cố vấn dịch vụ cho xe.',
    placement: 'top',
    mobilePlacement: 'top',
  }
];

const ADVISOR_WORKFLOW_STEPS = [
  {
    target: 'body',
    title: 'Quy trình Khảo sát & Lên Báo giá',
    content: 'Tour này sẽ hướng dẫn Cố vấn dịch vụ và Quản lý các thao tác tiếp nhận xe, phân công việc và quản lý phiếu dịch vụ.',
    placement: 'center',
  },
  {
    path: '/advisor/inspection',
    target: 'table, [class*="table"], [class*="mobileTicketsList"]',
    title: '1. Màn hình Điều phối phiếu dịch vụ',
    content: 'Chào mừng bạn đến với trung tâm điều phối của Cố vấn dịch vụ. Tất cả các xe đã làm thủ tục check-in sẽ xuất hiện tại danh sách ở dưới.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/advisor/inspection',
    target: 'input, [class*="search"]',
    title: '1.1. Tìm kiếm và Lọc thông tin',
    content: 'Tìm kiếm nhanh biển số xe, mã phiếu, hoặc lọc danh sách theo ngày hẹn và trạng thái (Đang kiểm tra, Chờ xử lý...).',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/advisor/inspection',
    target: 'table, [class*="table"], [class*="mobileTicketCard"]',
    title: '1.2. Danh sách xe hiện hành',
    content: 'Theo dõi biển số xe, số thứ tự hàng chờ, trạng thái hiện tại của xe, và thông tin kỹ thuật viên/cố vấn phụ trách.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/advisor/inspection',
    target: '#tour-assign-btn',
    title: '1.3. Phân công Kỹ thuật viên',
    content: 'Bấm nút "Phân công" (hoặc "Xem phân công") để điều phối kỹ thuật viên nhận việc dựa vào số lượng phiếu đang làm của họ.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    path: '/advisor/inspection',
    target: '#tour-view-btn',
    title: '1.4. Chi tiết phiếu dịch vụ',
    content: 'Bấm nút "Mở" (icon mắt) để đi vào chi tiết phiếu dịch vụ. Tại đó, bạn tiến hành ghi nhận kết quả khảo sát an toàn, chọn phụ tùng/dịch vụ Michelin và in báo giá gửi khách hàng.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-detail/demo',
    target: 'body',
    title: '2. Chi tiết phiếu dịch vụ (Demo)',
    content: 'Chào mừng bạn đến với giao diện chi tiết phiếu dịch vụ ở trạng thái Demo. Tại đây, chúng ta sẽ xem chi tiết thông tin tiếp nhận xe, hạng mục kiểm tra an toàn và báo giá.',
    placement: 'center',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-customer-info',
    title: '2.1. Thông tin Khách hàng',
    content: 'Hiển thị Họ tên và Số điện thoại liên hệ của chủ xe đã được tiếp nhận.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-edit-info-btn',
    title: '2.2. Chỉnh sửa Thông tin',
    content: 'Nút chỉnh sửa các thông tin đó. Bạn có thể cập nhật Họ tên, Điện thoại, Email hoặc các tuỳ chọn kỹ thuật.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-inspection-title',
    title: '2.3. Phiếu kiểm tra An toàn & Lốp xe',
    content: 'Phiếu kiểm tra an toàn do Cố vấn ghi nhận: gồm tiêu đề trạng thái tổng quan, thông số kỹ thuật lốp (độ mòn gai mm, áp suất thực tế & khuyến cáo) và các hạng mục an toàn xe.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-safety-checklist-card',
    title: '2.4. Hạng mục kiểm tra an toàn',
    content: 'Đánh giá các bộ phận an toàn theo các mức độ Tốt, Lưu ý hoặc Thay thế.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-vehicle-photos',
    title: '2.5. Ảnh tình trạng xe',
    content: 'Xem ảnh chụp thực tế tình trạng xe khi đưa vào xưởng dịch vụ.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-vehicle-info-card',
    title: '2.6. Thông tin xe đang sửa',
    content: 'Hiển thị Biển số xe, Loại xe & Đời xe, Số Odo phục vụ việc tư vấn sửa chữa.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-estimate-section',
    title: '2.7. Chi tiết Báo giá',
    content: 'Bảng báo giá dự kiến ghi nhận các hạng mục dịch vụ sửa chữa và phụ tùng thay thế.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-promo-code-input',
    title: '2.8. Áp dụng Mã giảm giá & Ưu đãi',
    content: 'Áp dụng các coupon khuyến mãi phần trăm trên tổng hóa đơn hoặc chọn các mặt hàng quà tặng đi kèm.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/service-ticket-detail/demo',
    target: '#tour-estimate-section [class*="ui-actions"], #tour-estimate-section button',
    title: '2.9. Lưu báo giá',
    content: 'Bấm nút tạo phiên bản báo giá mới để lưu báo giá hiện tại gửi khách hàng.',
    placement: 'top',
    mobilePlacement: 'top',
  }
];

const TECHNICIAN_WORKFLOW_STEPS = [
  {
    target: 'body',
    title: 'Quy trình Nhận việc & Báo cáo tiến độ',
    content: 'Tour này sẽ hướng dẫn Kỹ thuật viên (hoặc Quản lý/Cố vấn) các bước xem công việc được phân công, nhận xe và thực hiện kiểm tra báo cáo tiến độ.',
    placement: 'center',
  },
  {
    path: '/technician/my-tasks',
    target: 'table, [class*="bookingTable"]',
    title: '1. Danh sách công việc hôm nay',
    content: 'Tất cả các xe được phân công dịch vụ/sửa chữa cho bạn trong ngày hôm nay sẽ hiển thị tại danh sách này.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/technician/my-tasks',
    target: '#tour-tech-start-btn',
    title: '1.1. Tiếp nhận và bắt đầu làm việc',
    content: 'Bấm nút "Bắt đầu làm việc" (hoặc "Phiếu KT an toàn") để tiếp nhận xe thực hiện kiểm tra an toàn ban đầu.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    path: '/technician/safetyinspection-ticket/demo',
    target: 'body',
    title: '2. Phiếu kiểm tra An toàn & Lốp xe (Demo)',
    content: 'Chào mừng bạn đến với phiếu kiểm tra an toàn phương tiện. Hãy ghi nhận kết quả khảo sát chi tiết tại đây.',
    placement: 'center',
  },
  {
    path: '/technician/safetyinspection-ticket/demo',
    target: '#tour-tire-inspection-card',
    title: '2.1. Nhập thông số lốp xe',
    content: 'Đo độ mòn gai lốp (mm) và áp suất thực tế/khuyến cáo của 4 bánh xe và bánh dự phòng.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/technician/safetyinspection-ticket/demo',
    target: '#tour-safety-checklist-card',
    title: '2.2. Hạng mục kiểm tra an toàn',
    content: 'Đánh giá trạng thái hoạt động của các hệ thống an toàn khác trên xe (phanh, lái, giảm xóc...) theo các mức độ.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    path: '/technician/safetyinspection-ticket/demo',
    target: '#tour-tech-save-inspection-btn',
    title: '2.3. Hoàn thành & Báo cáo',
    content: 'Cuối cùng, bấm nút "Hoàn thành" để gửi kết quả kiểm tra lên hệ thống cho Cố vấn dịch vụ và quản lý phê duyệt.',
    placement: 'top',
    mobilePlacement: 'top',
  }
];

export default function UserTour({ type = 'staff' }) {
  const [tourType, setTourType] = useState(type);
  const [activeStep, setActiveStep] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowPlacement, setArrowPlacement] = useState('top');
  const tourRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const steps = React.useMemo(() => {
    if (tourType === 'customer') return CUSTOMER_STEPS;
    if (tourType === 'receptionist-workflow') return RECEPTIONIST_WORKFLOW_STEPS;
    if (tourType === 'advisor-workflow') return ADVISOR_WORKFLOW_STEPS;
    if (tourType === 'technician-workflow') return TECHNICIAN_WORKFLOW_STEPS;
    return STAFF_STEPS;
  }, [tourType]);
  
  const currentStep = steps[activeStep];

  // Tự động điều hướng khi bước tour yêu cầu trang khác
  useEffect(() => {
    if (showTour && currentStep?.path) {
      if (location.pathname !== currentStep.path) {
        navigate(currentStep.path);
      }
    }
  }, [showTour, activeStep, currentStep, location.pathname, navigate]);

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
      const isStaffLayoutTour = type === 'staff' && (targetType === 'staff' || targetType === 'receptionist-workflow' || targetType === 'advisor-workflow' || targetType === 'technician-workflow');
      const isCustomerLayoutTour = type === 'customer' && targetType === 'customer';
      
      if (isStaffLayoutTour || isCustomerLayoutTour) {
        setTourType(targetType);
        setShowTour(true);
        setActiveStep(0);
      }
    };

    // Kiểm tra query parameter để kích hoạt tour
    const params = new URLSearchParams(window.location.search);
    const startTourParam = params.get('startTour');
    const isMatchingParam = startTourParam === type || (type === 'staff' && (startTourParam === 'receptionist-workflow' || startTourParam === 'advisor-workflow' || startTourParam === 'technician-workflow'));
    
    if (isMatchingParam) {
      setTourType(startTourParam);
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

  // Phát sự kiện thay đổi bước tour để các component con có thể phản hồi (ví dụ: tự động mở popup)
  useEffect(() => {
    if (showTour && currentStep) {
      window.dispatchEvent(new CustomEvent('tourStepChange', {
        detail: {
          stepIndex: activeStep,
          title: currentStep.title || '',
          target: currentStep.target || '',
          tourType
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('tourStepChange', {
        detail: {
          stepIndex: -1,
          title: '',
          target: '',
          tourType: ''
        }
      }));
    }
  }, [showTour, activeStep, currentStep, tourType]);

  // Cập nhật vị trí Spotlight & Tooltip khi đổi bước, scroll hoặc resize
  useEffect(() => {
    if (!showTour || !currentStep) return;

    let positionTimeout;

    const updatePosition = (shouldScroll = true) => {
      if (currentStep.placement === 'center' || currentStep.target === 'body') {
        setSpotlightStyle(null);
        setTooltipStyle({});
        setArrowPlacement('center');
        return;
      }

      // Tìm tất cả các phần tử khớp với bất kỳ bộ chọn nào
      const allMatchedElements = [];
      currentStep.target.split(',').forEach(sel => {
        try {
          const found = document.querySelectorAll(sel.trim());
          found.forEach(el => allMatchedElements.push(el));
        } catch (e) {
          console.error(e);
        }
      });

      // Ưu tiên chọn phần tử đang hiển thị trên màn hình (như mobile-navbar thay vì sidebar khi ở trên mobile)
      const visibleElements = allMatchedElements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      });
      const targetElement = visibleElements[0] || allMatchedElements[0]; // Lấy phần tử đang hiển thị đầu tiên

      if (!targetElement) {
        // Fallback: nếu không thấy phần tử cần hướng dẫn, hiển thị dạng center modal
        setSpotlightStyle(null);
        setTooltipStyle({});
        setArrowPlacement('center');
        return;
      }

      // Cuộn phần tử đích vào tầm nhìn nếu cần (chỉ cuộn nếu phần tử chưa nằm trong khung nhìn để tránh giật lag khi phần tử đã hiện)
      if (shouldScroll) {
        const rect = targetElement.getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        if (!inViewport) {
          targetElement.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
      }

      // Chờ animation cuộn/modal slide-up xong và đo kích thước chính xác
      clearTimeout(positionTimeout);
      positionTimeout = setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        
        let spotlightLeft = rect.left;
        let spotlightWidth = rect.width;
        let spotlightTop = rect.top;
        let spotlightHeight = rect.height;

        // Giới hạn vùng highlight của spotlight vừa khít viewport trên mobile, tránh bị tràn
        if (window.innerWidth <= 980) {
          if (spotlightLeft < 0) {
            spotlightWidth += spotlightLeft;
            spotlightLeft = 0;
          }
          if (spotlightLeft + spotlightWidth > window.innerWidth) {
            spotlightWidth = window.innerWidth - spotlightLeft;
          }
          if (spotlightTop < 0) {
            spotlightHeight += spotlightTop;
            spotlightTop = 0;
          }
          if (spotlightTop + spotlightHeight > window.innerHeight) {
            spotlightHeight = window.innerHeight - spotlightTop;
          }
        }

        // 1. Cập nhật Spotlight Style (Sử dụng Fixed để không bị ảnh hưởng bởi scroll tài liệu)
        setSpotlightStyle({
          top: `${spotlightTop}px`,
          left: `${spotlightLeft}px`,
          width: `${spotlightWidth}px`,
          height: `${spotlightHeight}px`,
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
        
        // Đo kích thước thực tế (chiều rộng và chiều cao) của tooltip để định vị chính xác, tránh tràn màn hình và đè lấp phần tử được highlight
        const tooltipEl = tourRef.current?.querySelector('.user-tour-tooltip');
        
        const measuredWidth = tooltipEl ? tooltipEl.offsetWidth : 320;
        const tooltipWidth = measuredWidth > 100 ? measuredWidth : 320;

        const measuredHeight = tooltipEl ? tooltipEl.offsetHeight : 180;
        const tooltipHeight = measuredHeight > 50 ? measuredHeight : 180;

        // Tự động chọn bên có không gian rộng hơn trên desktop nếu cấu hình là hiển thị bên cạnh (right/left)
        if (window.innerWidth > 980) {
          const padding = 10;
          if (placement === 'right') {
            const rightSpace = window.innerWidth - rect.right - gap - padding;
            const leftSpace = rect.left - gap - padding;
            if (rightSpace < tooltipWidth && leftSpace > rightSpace) {
              placement = 'left';
            }
          } else if (placement === 'left') {
            const leftSpace = rect.left - gap - padding;
            const rightSpace = window.innerWidth - rect.right - gap - padding;
            if (leftSpace < tooltipWidth && rightSpace > leftSpace) {
              placement = 'right';
            }
          }
        }
        
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
        if (left < padding) left = padding; // Đảm bảo giới hạn bên trái tối thiểu sau khi trừ đi tooltipWidth
        
        if (top < padding) top = padding;
        if (top + tooltipHeight > window.innerHeight - padding) {
          top = window.innerHeight - tooltipHeight - padding;
        }
        if (top < padding) top = padding;

        setTooltipStyle({
          top: `${top}px`,
          left: `${left}px`,
          position: 'fixed',
        });
        setArrowPlacement(placement);
      }, shouldScroll ? 250 : 50); // Đợi lâu hơn (250ms) ở lần đầu đổi bước để tránh xung đột với animation modal slideUp
    };

    let scrollTimeout;
    const handleScroll = () => {
      const overlayEl = tourRef.current;
      if (overlayEl) {
        overlayEl.classList.add('is-scrolling');
      }
      updatePosition(false);
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (overlayEl) {
          overlayEl.classList.remove('is-scrolling');
        }
      }, 150);
    };

    const handleResize = () => {
      updatePosition(false);
    };

    updatePosition(true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(positionTimeout);
    };
  }, [showTour, activeStep, currentStep, location.pathname]);

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
    if (tourType === 'staff') {
      let staffId = 'guest';
      try {
        const rawProfile = localStorage.getItem('staffProfile');
        if (rawProfile) {
          const profile = JSON.parse(rawProfile);
          if (profile?.staffId) staffId = profile.staffId;
        }
      } catch (_) {}
      localStorage.setItem(`hasSeenTour_staff_${staffId}`, 'true');
    } else if (tourType === 'customer') {
      localStorage.setItem('hasSeenTour_customer', 'true');
    } else if (tourType === 'receptionist-workflow') {
      localStorage.setItem('hasSeenTour_receptionist_workflow', 'true');
      navigate('/system-tutorials');
    } else if (tourType === 'advisor-workflow') {
      localStorage.setItem('hasSeenTour_advisor_workflow', 'true');
      navigate('/system-tutorials');
    } else if (tourType === 'technician-workflow') {
      localStorage.setItem('hasSeenTour_technician_workflow', 'true');
      navigate('/system-tutorials');
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
          {/* Progress bar */}
          <div className="user-tour-progress">
            <div
              className="user-tour-progress-fill"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="user-tour-footer-row">
            <span className="user-tour-step-label">{activeStep + 1} / {steps.length}</span>

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
