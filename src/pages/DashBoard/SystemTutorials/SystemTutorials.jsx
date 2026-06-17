import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Search, 
  BookOpen, 
  Users, 
  Wrench, 
  ClipboardList, 
  Box, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Info,
  Calendar,
  Layers3,
  HelpCircle,
  X
} from 'lucide-react';
import './SystemTutorials.css';

// Helper to determine customer site URL in production vs development
const getCustomerSiteUrl = (path = '') => {
  const { protocol, hostname, port } = window.location;
  // Loại bỏ subdomain staff. hoặc admin. để chuyển về tên miền chính của khách hàng
  const mainHost = hostname.replace(/^(staff|admin)\./, '');
  if (hostname.includes('sontaygarage.vn')) {
    return `${protocol}//${mainHost}${path}`;
  }
  const portStr = port ? `:${port}` : '';
  return `${protocol}//${mainHost}${portStr}${path}`;
};

const TUTORIAL_CATEGORIES = [
  { id: 'ALL', label: 'Tất cả hướng dẫn', icon: <Layers3 size={16} /> },
  { id: 'interactive', label: 'Hướng dẫn tương tác', icon: <Play size={16} /> },
  { id: 'receptionist', label: 'Nghiệp vụ Lễ tân', icon: <Calendar size={16} /> },
  { id: 'advisor', label: 'Cố vấn dịch vụ', icon: <ClipboardList size={16} /> },
  { id: 'technician', label: 'Kỹ thuật viên', icon: <Wrench size={16} /> },
  { id: 'warehouse', label: 'Thủ kho & Vật tư', icon: <Box size={16} /> },
  { id: 'accountant', label: 'Kế toán & Thu ngân', icon: <DollarSign size={16} /> },
];

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRolesFromStorage = () => {
  let roles = [];
  try {
    const raw = localStorage.getItem('staffRoles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        roles = parsed
          .filter((r) => typeof r === 'string')
          .map((r) => normalizeRoleName(r))
          .filter(Boolean);
      }
    }
  } catch (_) {
    // ignore storage error
  }

  if (roles.length === 0) {
    try {
      const rawProfile = localStorage.getItem('staffProfile');
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile);
        const profileRoles = Array.isArray(parsed?.role) ? parsed.role : [];
        roles = profileRoles
          .filter((r) => typeof r === 'string')
          .map((r) => normalizeRoleName(r))
          .filter(Boolean);
      }
    } catch (_) {
      roles = [];
    }
  }

  if (roles.includes('WAREHOUSE_MANAGER') && !roles.includes('WAREHOUSE_KEEPER')) {
    roles.push('WAREHOUSE_KEEPER');
  }
  return roles;
};

export default function SystemTutorials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeDetailGuide, setActiveDetailGuide] = useState(null);

  // Read current user's roles
  const userRoles = useMemo(() => readStaffRolesFromStorage(), []);

  // List of all guides built on frontend
  const tutorialsList = useMemo(() => [
    {
      id: 'staff-tour',
      title: 'Hướng dẫn Giao diện Nhân viên',
      description: 'Làm quen nhanh với các thành phần chính của hệ thống quản lý garage (GMS) gồm: Thanh điều hướng, Trung tâm thông báo trực tiếp, và Trang cá nhân.',
      category: 'interactive',
      role: 'Tất cả nhân viên',
      duration: '2 phút',
      type: 'interactive',
      icon: <Users className="tutorial-card__icon text-indigo" />,
      actionLabel: 'Bắt đầu Tour',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('triggerTour', { detail: { type: 'staff' } }));
      }
    },
    {
      id: 'customer-tour',
      title: 'Hướng dẫn Giao diện Khách hàng',
      description: 'Khám phá giao diện bên ngoài dành cho khách hàng: cách đặt lịch hẹn, xem thông tin dịch vụ, bảng giá phụ tùng, và theo dõi trạng thái xe.',
      category: 'interactive',
      role: 'Khách hàng',
      duration: '2 phút',
      type: 'interactive',
      icon: <HelpCircle className="tutorial-card__icon text-orange" />,
      actionLabel: 'Xem trang khách hàng',
      onClick: () => {
        const targetUrl = getCustomerSiteUrl('/?startTour=customer');
        window.open(targetUrl, '_blank');
      }
    },
    {
      id: 'receptionist-workflow',
      title: 'Quy trình Tiếp nhận & Đặt lịch',
      description: 'Quy trình chuẩn từ lúc tiếp nhận yêu cầu đặt lịch hẹn trực tuyến/trực tiếp, kiểm tra hàng chờ điều phối đến việc check-in xe và tạo phiếu dịch vụ ban đầu.',
      category: 'receptionist',
      role: 'Lễ tân, Cố vấn, Quản lý, Admin',
      duration: '5 phút',
      type: 'interactive',
      icon: <Calendar className="tutorial-card__icon text-blue" />,
      actionLabel: 'Bắt đầu Tour',
      allowedRoles: ['ADMIN', 'MANAGER', 'ADVISOR', 'RECEPTIONIST'],
      onClick: () => {
        window.dispatchEvent(new CustomEvent('triggerTour', { detail: { type: 'receptionist-workflow' } }));
      }
    },
    {
      id: 'advisor-workflow',
      title: 'Quy trình Khảo sát & Lên Báo giá',
      description: 'Hướng dẫn Cố vấn dịch vụ thực hiện nhận phiếu dịch vụ, tiến hành lập biên bản khảo sát tình trạng xe, chọn phụ tùng, dịch vụ phù hợp và xin phê duyệt báo giá.',
      category: 'advisor',
      role: 'Cố vấn, Quản lý, Admin',
      duration: '7 phút',
      type: 'interactive',
      icon: <ClipboardList className="tutorial-card__icon text-green" />,
      actionLabel: 'Bắt đầu Tour',
      allowedRoles: ['ADMIN', 'MANAGER', 'ADVISOR'],
      onClick: () => {
        window.dispatchEvent(new CustomEvent('triggerTour', { detail: { type: 'advisor-workflow' } }));
      }
    },
    {
      id: 'technician-workflow',
      title: 'Quy trình Nhận việc & Báo cáo tiến độ',
      description: 'Quy trình dành cho Kỹ thuật viên: Kiểm tra công việc được phân công hàng ngày, nhận vật tư phụ tùng tại kho và cập nhật tiến độ sửa chữa.',
      category: 'technician',
      role: 'Kỹ thuật viên',
      duration: '4 phút',
      type: 'workflow',
      icon: <Wrench className="tutorial-card__icon text-amber" />,
      actionLabel: 'Xem quy trình',
      steps: [
        {
          title: 'Xem danh sách việc hôm nay',
          desc: 'Truy cập màn hình "Công việc hôm nay" để xem danh sách các xe được điều phối cho bạn. Nhấp vào chi tiết để xem các hạng mục cần sửa chữa hoặc bảo dưỡng.'
        },
        {
          title: 'Yêu cầu phụ tùng từ kho',
          desc: 'Xem danh sách phụ tùng đã phê duyệt trên phiếu dịch vụ, liên hệ Thủ kho để nhận phụ tùng tương ứng phục vụ cho quá trình thay thế.'
        },
        {
          title: 'Cập nhật tiến độ làm việc',
          desc: 'Bấm chuyển trạng thái công việc sang "Đang làm" khi bắt đầu thực hiện. Sau khi làm xong, nhấn chọn "Hoàn thành" để cập nhật trạng thái thời gian thực lên hệ thống.'
        },
        {
          title: 'Bàn giao xe & Chạy thử',
          desc: 'Thực hiện kiểm tra an toàn sau sửa chữa, vệ sinh khu vực sửa chữa và thông báo cho Cố vấn dịch vụ để nghiệm thu bàn giao lại cho khách hàng.'
        }
      ],
      tips: 'Nếu trong quá trình sửa chữa phát sinh hư hỏng mới, hãy báo ngay cho Cố vấn dịch vụ để kịp thời cập nhật phiếu dịch vụ và xin ý kiến khách hàng, không tự ý thay thế.'
    },
    {
      id: 'warehouse-workflow',
      title: 'Quản lý Nhập xuất & Vật tư phụ tùng',
      description: 'Hướng dẫn chi tiết quy trình tạo phiếu nhập kho mua hàng, phiếu xuất kho cho kỹ thuật viên sửa chữa, kiểm kê kho lỗi và báo cáo trách nhiệm hao hụt.',
      category: 'warehouse',
      role: 'Thủ kho / Quản kho',
      duration: '8 phút',
      type: 'workflow',
      icon: <Box className="tutorial-card__icon text-red" />,
      actionLabel: 'Xem quy trình',
      steps: [
        {
          title: 'Tạo phiếu Nhập kho (Stock Entry)',
          desc: 'Khi phụ tùng mới được nhập về garage, Thủ kho vào mục "Quản lý phiếu nhập" để tạo phiếu nhập kho. Nhập số lượng, đơn giá mua vào, số lô, hãng sản xuất để hệ thống tính giá vốn trung bình.'
        },
        {
          title: 'Tạo phiếu Xuất kho (Stock Issue)',
          desc: 'Khi có yêu cầu phụ tùng từ Phiếu dịch vụ của Kỹ thuật viên, Thủ kho kiểm tra trạng thái phiếu và tạo phiếu xuất kho để giao phụ tùng, đồng thời giảm số lượng tồn kho khả dụng.'
        },
        {
          title: 'Tạo phiếu Trả hàng (Return Entry)',
          desc: 'Đối với phụ tùng đã xuất nhưng kỹ thuật viên không dùng hết hoặc khách hàng đổi ý không thay nữa, thực hiện tạo phiếu trả hàng để hoàn trả phụ tùng lại vào kho chính.'
        },
        {
          title: 'Quản lý kho lỗi & Báo cáo trách nhiệm',
          desc: 'Khi phát hiện phụ tùng hư hỏng do vận chuyển hoặc bảo quản, tạo phiếu chuyển vào "Kho hàng lỗi" và thực hiện lập báo cáo trách nhiệm để làm việc với nhà cung cấp hoặc cá nhân liên quan.'
        }
      ],
      tips: 'Nên kiểm tra định kỳ số lượng tồn kho tối thiểu trong phần "Giá theo kho" để chủ động đề xuất Giám đốc nhập thêm các phụ tùng bán chạy.'
    },
    {
      id: 'accountant-workflow',
      title: 'Thanh toán, Thu ngân & Hóa đơn tài chính',
      description: 'Quy trình đối soát chi phí trên phiếu dịch vụ, chọn phương thức thanh toán, in hóa đơn VAT và hoàn thành giao dịch bàn giao xe.',
      category: 'accountant',
      role: 'Kế toán / Thu ngân',
      duration: '6 phút',
      type: 'workflow',
      icon: <DollarSign className="tutorial-card__icon text-teal" />,
      actionLabel: 'Xem quy trình',
      steps: [
        {
          title: 'Kiểm tra chi phí phiếu chờ thanh toán',
          desc: 'Khi Cố vấn chuyển phiếu sang trạng thái "Chờ thanh toán", Kế toán mở màn hình "Phiếu dịch vụ" để kiểm tra tính đúng đắn của tiền công, phụ tùng và các chiết khấu khuyến mãi.'
        },
        {
          title: 'Chọn Phương thức thanh toán',
          desc: 'Nhấp chọn nút "Thanh toán". Lựa chọn phương thức khách hàng muốn trả: Tiền mặt, Chuyển khoản ngân hàng (quét mã QR động) hoặc thanh toán qua thẻ POS.'
        },
        {
          title: 'Xác nhận thanh toán và In hóa đơn',
          desc: 'Sau khi nhận đủ tiền, bấm xác nhận thanh toán để hệ thống ghi nhận doanh thu. Tiến hành in Hóa đơn bán lẻ (Accounting Invoice) hoặc Hóa đơn VAT (nếu khách yêu cầu).'
        },
        {
          title: 'Cập nhật trạng thái phiếu và Bàn giao xe',
          desc: 'Sau khi thanh toán thành công, phiếu tự động cập nhật sang trạng thái "Đã hoàn thành". Lễ tân/Cố vấn tiến hành bàn giao xe và chìa khóa cho khách hàng.'
        }
      ],
      tips: 'Khi dùng chuyển khoản, hãy luôn đối soát kỹ biến động số dư tài khoản ngân hàng trước khi xác nhận thanh toán trên hệ thống để tránh nhầm lẫn thông tin.'
    }
  ], []);

  // Filter & Search Logic
  const filteredTutorials = useMemo(() => {
    return tutorialsList.filter(item => {
      // Check role constraints if specified
      if (item.allowedRoles) {
        const hasRole = item.allowedRoles.some((role) => userRoles.includes(role));
        if (!hasRole) return false;
      }

      const matchSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [tutorialsList, searchTerm, selectedCategory, userRoles]);

  return (
    <div className="tutorials-page">
      {/* Premium Header */}
      <header className="tutorials-page__header">
        <div className="tutorials-page__header-content">
          <span className="tutorials-page__badge">
            <BookOpen size={12} style={{ marginRight: '6px' }} />
            Hệ thống GMS
          </span>
          <h1 className="tutorials-page__title">Trung tâm Hướng dẫn Sử dụng</h1>
          <p className="tutorials-page__subtitle">
            Học cách sử dụng hệ thống GMS Michelin Sơn Tây thông qua các tour hướng dẫn tương tác trực quan hoặc các tài liệu nghiệp vụ chi tiết.
          </p>
        </div>
        <div className="tutorials-page__header-graphic">
          <div className="graphic-circle circle-1"></div>
          <div className="graphic-circle circle-2"></div>
        </div>
      </header>

      {/* Control Panel: Search & Categories */}
      <section className="tutorials-controls">
        <div className="tutorials-search-box">
          <Search className="tutorials-search-box__icon" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm hướng dẫn, vai trò hoặc quy trình..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tutorials-categories">
          {TUTORIAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tutorials-category-btn ${selectedCategory === cat.id ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Grid of Tutorial Cards */}
      <main className="tutorials-grid-container">
        {filteredTutorials.length === 0 ? (
          <div className="tutorials-empty-state">
            <div className="tutorials-empty-state__icon-box">
              <Info size={40} />
            </div>
            <h3>Không tìm thấy hướng dẫn nào</h3>
            <p>Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc danh mục của bạn.</p>
          </div>
        ) : (
          <div className="tutorials-grid">
            {filteredTutorials.map((item) => (
              <div className={`tutorial-card ${item.type === 'interactive' ? 'is-interactive' : ''}`} key={item.id}>
                <div className="tutorial-card__header">
                  <div className="tutorial-card__icon-wrapper">
                    {item.icon}
                  </div>
                  <span className={`tutorial-card__type-badge ${item.type}`}>
                    {item.type === 'interactive' ? 'Tương tác' : 'Nghiệp vụ'}
                  </span>
                </div>

                <div className="tutorial-card__body">
                  <h3 className="tutorial-card__title">{item.title}</h3>
                  <p className="tutorial-card__desc">{item.description}</p>
                </div>

                <div className="tutorial-card__meta">
                  <div className="tutorial-card__meta-item">
                    <span className="meta-label">Vai trò:</span>
                    <span className="meta-value font-bold">{item.role}</span>
                  </div>
                  <div className="tutorial-card__meta-item">
                    <span className="meta-label">Thời lượng:</span>
                    <span className="meta-value">{item.duration}</span>
                  </div>
                </div>

                <div className="tutorial-card__footer">
                  {item.type === 'interactive' ? (
                    <button 
                      type="button" 
                      className="tutorial-card__btn btn-primary-glow"
                      onClick={item.onClick}
                    >
                      <span>{item.actionLabel}</span>
                      <Play size={14} style={{ marginLeft: '6px' }} />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="tutorial-card__btn btn-outline"
                      onClick={() => setActiveDetailGuide(item)}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight size={14} style={{ marginLeft: '6px' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Guide Detail Modal (Slide-over panel) */}
      {activeDetailGuide && (
        <div className="guide-modal-overlay" onClick={() => setActiveDetailGuide(null)}>
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="guide-modal-header">
              <div className="guide-modal-header__left">
                <span className="guide-modal-badge">{activeDetailGuide.role}</span>
                <h2>{activeDetailGuide.title}</h2>
              </div>
              <button 
                type="button" 
                className="guide-modal-close-btn"
                onClick={() => setActiveDetailGuide(null)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="guide-modal-body">
              <p className="guide-modal-description">{activeDetailGuide.description}</p>
              
              <div className="guide-steps-container">
                <h3 className="section-title">Các bước thực hiện trên phần mềm:</h3>
                <div className="guide-timeline">
                  {activeDetailGuide.steps?.map((step, idx) => (
                    <div className="guide-timeline-item" key={idx}>
                      <div className="guide-timeline-badge">{idx + 1}</div>
                      <div className="guide-timeline-content">
                        <h4>{step.title}</h4>
                        <p>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeDetailGuide.tips && (
                <div className="guide-tips-box">
                  <div className="guide-tips-box__icon">
                    <Info size={18} />
                  </div>
                  <div className="guide-tips-box__content">
                    <h5>Mẹo làm việc hiệu quả:</h5>
                    <p>{activeDetailGuide.tips}</p>
                  </div>
                </div>
              )}
            </div>

            <footer className="guide-modal-footer">
              <button 
                type="button" 
                className="guide-modal-action-btn"
                onClick={() => setActiveDetailGuide(null)}
              >
                Đã hiểu quy trình
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
