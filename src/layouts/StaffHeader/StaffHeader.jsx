import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  CalendarPlus,
  FileText,
  ChevronRight,
  ChevronDown,
  Contact,
  Bell,
  Calendar,
  Briefcase,
  LogOut,
  Users,
  Settings,
  Clock,
  DollarSign,
  Wrench,
  ShoppingCart,
  ScanQrCode,
  FileClock,
} from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import UniversalScannerModal from '../../components/UniversalScanner/UniversalScannerModal.jsx';
import UniversalSearch from '../../components/UniversalSearch/UniversalSearch.jsx';
import './StaffHeader.css';

const STAFF_ROLE = {
  MANAGER: 'MANAGER',
  ADVISOR: 'ADVISOR',
  RECEPTIONIST: 'RECEPTIONIST',
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
  ACCOUNTANT: 'ACCOUNTANT',
};

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRoles = () => {
  let roles = [];
  try {
    const rawRoles = localStorage.getItem('staffRoles');
    if (rawRoles) {
      const parsedRoles = JSON.parse(rawRoles);
      if (Array.isArray(parsedRoles)) {
        roles = parsedRoles
          .filter((role) => typeof role === 'string')
          .map(normalizeRoleName)
          .filter(Boolean);
      }
    }
  } catch {}

  if (roles.length === 0) {
    try {
      const rawProfile = localStorage.getItem('staffProfile');
      const profile = rawProfile ? JSON.parse(rawProfile) : null;
      const profileRoles = Array.isArray(profile?.role) ? profile.role : [];
      roles = profileRoles
        .filter((role) => typeof role === 'string')
        .map(normalizeRoleName)
        .filter(Boolean);
    } catch {
      roles = [];
    }
  }

  if (roles.includes('WAREHOUSE_MANAGER') && !roles.includes('WAREHOUSE_KEEPER')) {
    roles.push('WAREHOUSE_KEEPER');
  }
  return roles;
};

const readStaffProfile = () => {
  try {
    const rawProfile = localStorage.getItem('staffProfile');
    if (rawProfile) {
      return JSON.parse(rawProfile);
    }
  } catch {}
  return null;
};

const hasAnyRole = (allowedRoles, staffRoles) => {
  if (allowedRoles === 'ALL') return true;
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;
  const roleSet = new Set(staffRoles);
  return allowedRoles.some((role) => roleSet.has(normalizeRoleName(role)));
};

const filterItemsByRoles = (items, staffRoles) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
      const allowedRoles = item?.id === 'advisor-inspection'
          ? [STAFF_ROLE.ADVISOR]
          : item?.roles;
      return hasAnyRole(allowedRoles, staffRoles);
  });
};

const checkToanQuyen = (roles) => {
  if (!roles || roles.length === 0) return false;
  const normalized = roles.map((r) => normalizeRoleName(r));
  return normalized.includes('ADMIN') && normalized.includes('MANAGER') && normalized.includes('ADVISOR');
};

const getHighestPriorityRole = (roles) => {
  if (!roles || roles.length === 0) return null;
  const normalized = roles.map((r) => normalizeRoleName(r));

  if (checkToanQuyen(roles)) return 'TOAN_QUYEN';
  if (normalized.includes('ADMIN')) return 'ADMIN';
  if (normalized.includes('MANAGER')) return 'MANAGER';
  if (normalized.includes('ADVISOR')) return 'ADVISOR';
  if (normalized.includes('WAREHOUSE_KEEPER')) return 'WAREHOUSE_KEEPER';
  if (normalized.includes('RECEPTIONIST')) return 'RECEPTIONIST';
  if (normalized.includes('ACCOUNTANT')) return 'ACCOUNTANT';
  if (normalized.includes('TECHNICIAN')) return 'TECHNICIAN';
  return null;
};

const getDynamicNavItems = (roles, isMobile = false) => {
  const highest = getHighestPriorityRole(roles);
  const normalized = (roles || []).map((r) => normalizeRoleName(r));

  // If role is ADMIN
  if (highest === 'ADMIN') {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: isMobile ? <LayoutDashboard size={20} /> : <LayoutDashboard size={18} />,
      },
      {
        id: 'staff-notification-sender',
        label: isMobile ? 'Thông báo' : 'Thông báo NV',
        path: '/staff-notification-sender',
        icon: isMobile ? <Bell size={20} /> : <Bell size={18} />,
      },
      {
        id: 'customer-manager',
        label: isMobile ? 'Danh bạ' : 'Danh bạ khách hàng',
        path: '/customer-manager',
        icon: isMobile ? <Contact size={20} /> : <Contact size={18} />,
      },
      {
        id: 'staff-manager',
        label: isMobile ? 'Nhân viên' : 'Quản lý nhân viên',
        path: '/staff-manager',
        icon: isMobile ? <Users size={20} /> : <Users size={18} />,
      },
    ];
  }

  // If role is ACCOUNTANT
  if (highest === 'ACCOUNTANT') {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: isMobile ? <LayoutDashboard size={20} /> : <LayoutDashboard size={18} />,
      },
      {
        id: 'revenue-management',
        label: isMobile ? 'Doanh thu' : 'Quản lý doanh thu',
        path: '/revenue-management',
        icon: isMobile ? <DollarSign size={20} /> : <DollarSign size={18} />,
      },
      {
        id: 'service-management',
        label: isMobile ? 'Dịch vụ' : 'Quản lý dịch vụ',
        path: '/service-management',
        icon: isMobile ? <Wrench size={20} /> : <Wrench size={18} />,
      },
      {
        id: 'service-tickets',
        label: isMobile ? 'Phiếu DV' : 'Phiếu dịch vụ',
        path: '/service-ticket-management',
        icon: isMobile ? <FileText size={20} /> : <FileText size={18} />,
      },
    ];
  }

  // General flow for other roles (TOAN_QUYEN, MANAGER, ADVISOR, WAREHOUSE_KEEPER, RECEPTIONIST, TECHNICIAN)
  const items = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: isMobile ? <LayoutDashboard size={20} /> : <LayoutDashboard size={18} />,
    },
  ];

  // Slot 2: Kho vs Yêu cầu đặt lịch
  if (normalized.includes('WAREHOUSE_KEEPER') || normalized.includes('MANAGER')) {
    items.push({
      id: 'warehouse',
      label: isMobile ? 'Kho' : 'Quản lý Kho',
      path: '/warehouse-management',
      icon: isMobile ? <Box size={20} /> : <Box size={18} />,
    });
  } else if (highest !== 'TECHNICIAN') {
    items.push({
      id: 'booking-request',
      label: isMobile ? 'Yêu cầu đặt' : 'Yêu cầu đặt lịch',
      path: '/booking-request-management',
      icon: isMobile ? <Clock size={20} /> : <Clock size={18} />,
    });
  }

  // Slot 3: Tạo lịch (Receptionist hoặc Toàn Quyền)
  if (normalized.includes('RECEPTIONIST') || highest === 'TOAN_QUYEN') {
    items.push({
      id: 'create-booking',
      label: isMobile ? 'Tạo lịch' : 'Tạo Lịch hẹn',
      path: '/create-booking',
      icon: isMobile ? <CalendarPlus size={20} /> : <CalendarPlus size={18} />,
    });
    items.push({
      id: 'parts-sales',
      label: 'Bán hàng',
      path: '/parts-sales',
      icon: isMobile ? <ShoppingCart size={20} /> : <ShoppingCart size={18} />,
    });
  }

  // Slot 4: Phiếu dịch vụ / Action chính theo Role
  if (highest === 'TOAN_QUYEN' || highest === 'MANAGER' || highest === 'ADVISOR') {
    items.push({
      id: 'service-tickets',
      label: isMobile ? 'Phiếu DV' : 'Phiếu dịch vụ',
      path: '/advisor/inspection',
      icon: isMobile ? <FileText size={20} /> : <FileText size={18} />,
    });
  } else if (highest === 'WAREHOUSE_KEEPER') {
    items.push({
      id: 'part-management',
      label: isMobile ? 'Phụ tùng' : 'Quản lý phụ tùng',
      path: '/part-management',
      icon: isMobile ? <Settings size={20} /> : <Settings size={18} />,
    });
  } else if (highest === 'RECEPTIONIST') {
    items.push({
      id: 'service-tickets',
      label: isMobile ? 'Phiếu DV' : 'Phiếu dịch vụ',
      path: '/service-ticket-management',
      icon: isMobile ? <FileText size={20} /> : <FileText size={18} />,
    });
  } else if (highest === 'TECHNICIAN') {
    items.push({
      id: 'my-tasks',
      label: isMobile ? 'Nhiệm vụ' : 'Công việc hôm nay',
      path: '/technician/my-tasks',
      icon: isMobile ? <Briefcase size={20} /> : <Briefcase size={18} />,
    });
  } else {
    items.push({
      id: 'service-tickets',
      label: isMobile ? 'Phiếu DV' : 'Phiếu dịch vụ',
      path: '/service-ticket-management',
      icon: isMobile ? <FileText size={20} /> : <FileText size={18} />,
    });
  }

  return items;
};

const PERSONAL_NAV_ITEMS = [
  { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', icon: <Contact size={18} />, roles: 'ALL' },
  { id: 'attendance-checkin', label: 'Chấm công QR', path: '/attendance-checkin', icon: <Clock size={18} />, roles: 'ALL' },
  { id: 'attendance-requests', label: 'Chấm công bù / Xin nghỉ', path: '/attendance-requests', icon: <FileClock size={18} />, roles: 'ALL' },
  { id: 'staff-notifications-page', label: 'Thông báo', path: '/notifications', icon: <Bell size={18} />, roles: 'ALL' },
  { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', icon: <Calendar size={18} />, roles: 'ALL' },
  { id: 'work-history-technician', label: 'Lịch sử công việc', path: '/work-history/technician', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.TECHNICIAN] },
  { id: 'work-history-advisor', label: 'Lịch sử công việc', path: '/work-history/advisor', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ADVISOR] },
  { id: 'work-history-receptionist', label: 'Lịch sử công việc', path: '/work-history/receptionist', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
  { id: 'work-history-accountant', label: 'Lịch sử công việc', path: '/work-history/accountant', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ACCOUNTANT] },
  { id: 'work-history-manager', label: 'Lịch sử công việc', path: '/work-history/manager', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.MANAGER] },
  { id: 'work-history-admin', label: 'Lịch sử công việc', path: '/work-history/admin', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ADMIN] },
];

const StaffHeader = ({ notificationState, notificationBell, chatButton }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const staffRoles = useMemo(() => readStaffRoles(), [location.pathname]);
  const staffProfile = useMemo(() => readStaffProfile(), [location.pathname]);

  const staffFullName = staffProfile?.fullName || 'Nhân viên';
  const staffAvatarUrl = getAvatarSrc(staffProfile?.avatarUrl);

  const visibleItems = useMemo(() => {
    return getDynamicNavItems(staffRoles, false);
  }, [staffRoles]);

  const personalItems = useMemo(() => {
    const filtered = filterItemsByRoles(PERSONAL_NAV_ITEMS, staffRoles);

    // Deduplicate multiple work history items to avoid duplicates in the dropdown menu
    const workHistoryItems = filtered.filter((item) => item.id.startsWith('work-history-'));
    if (workHistoryItems.length <= 1) {
        return filtered;
    }

    const firstWorkHistory = workHistoryItems[0];
    return filtered.filter((item) => {
        if (item.id.startsWith('work-history-')) {
            return item.id === firstWorkHistory.id;
        }
        return true;
    });
  }, [staffRoles]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('staffRoles');
    localStorage.removeItem('staffProfile');
    setIsProfileDropdownOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <header className="staff-header">
      <div className="staff-header__left">
        <h1 className="staff-header__brand">Michelin Sơn Tây GMS</h1>
        <nav className="staff-header__nav">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`staff-header__nav-item ${isActive ? 'is-active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="staff-header__right">
        <UniversalSearch staffRoles={staffRoles} className="staff-header__search-container" />

        {/* Universal QR/Barcode scanner */}
        <button
          type="button"
          className="staff-header__scan-btn"
          onClick={() => setIsScannerOpen(true)}
          aria-label="Quét mã QR / Barcode"
          title="Quét mã QR / Barcode"
        >
          <ScanQrCode size={20} />
        </button>

        {/* Chat nội bộ nhân viên */}
        <div className="staff-header__chat-container">
          {chatButton}
        </div>

        {/* Render notification bell here */}
        <div className="staff-header__bell-container">
          {notificationBell}
        </div>

        {/* User profile with dropdown - only avatar display */}
        <div className={`staff-header__profile-container ${isProfileDropdownOpen ? 'is-open' : ''}`} ref={dropdownRef}>
          <button
            type="button"
            className="staff-header__profile-avatar-btn"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            aria-label="Tài khoản cá nhân"
          >
            <div className="staff-header__avatar">
              <img
                src={staffAvatarUrl}
                alt={staffFullName}
                onError={handleAvatarError}
              />
              <span
                className={`staff-header__connectionDot ${notificationState?.connected ? 'isConnected' : ''}`}
                title={notificationState?.connected ? 'Đã kết nối realtime' : 'Mất kết nối realtime, đang thử kết nối lại...'}
                aria-label={notificationState?.connected ? 'Đã kết nối realtime' : 'Mất kết nối realtime'}
                role="status"
              />
              <span className="staff-header__avatar-badge">
                <ChevronDown size={8} />
              </span>
            </div>
          </button>

          {isProfileDropdownOpen && (
            <div className="staff-header__dropdown">
              {personalItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="staff-header__dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileDropdownOpen(false);
                    navigate(item.path);
                  }}
                >
                  <span className="staff-header__dropdown-item-icon">{item.icon}</span>
                  <span className="staff-header__dropdown-item-label">{item.label}</span>
                </button>
              ))}
              {personalItems.length > 0 && <hr className="staff-header__dropdown-divider" />}
              <button
                type="button"
                className="staff-header__dropdown-item logout"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <UniversalScannerModal open={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </header>
  );
};

export default StaffHeader;
