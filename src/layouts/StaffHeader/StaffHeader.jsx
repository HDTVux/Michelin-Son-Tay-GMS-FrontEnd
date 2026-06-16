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
  LogOut
} from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
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
  try {
    const rawRoles = localStorage.getItem('staffRoles');
    if (rawRoles) {
      const parsedRoles = JSON.parse(rawRoles);
      if (Array.isArray(parsedRoles)) {
        return parsedRoles
          .filter((role) => typeof role === 'string')
          .map(normalizeRoleName)
          .filter(Boolean);
      }
    }
  } catch {}

  try {
    const rawProfile = localStorage.getItem('staffProfile');
    const profile = rawProfile ? JSON.parse(rawProfile) : null;
    const roles = Array.isArray(profile?.role) ? profile.role : [];
    return roles
      .filter((role) => typeof role === 'string')
      .map(normalizeRoleName)
      .filter(Boolean);
  } catch {
    return [];
  }
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

const HEADER_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: 'ALL',
  },
  {
    id: 'warehouse',
    label: 'Quản lý Kho',
    path: '/warehouse-management',
    icon: <Box size={18} />,
    roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER],
  },
  {
    id: 'create-booking',
    label: 'Tạo Lịch hẹn',
    path: '/create-booking',
    icon: <CalendarPlus size={18} />,
    roles: [STAFF_ROLE.RECEPTIONIST],
  },
  {
    id: 'service-tickets',
    label: 'Phiếu dịch vụ',
    path: '/service-ticket-management',
    icon: <FileText size={18} />,
    roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ACCOUNTANT],
  },
];

const PERSONAL_NAV_ITEMS = [
  { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', icon: <Contact size={18} />, roles: 'ALL' },
  { id: 'staff-notifications-page', label: 'Thông báo', path: '/notifications', icon: <Bell size={18} />, roles: 'ALL' },
  { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', icon: <Calendar size={18} />, roles: 'ALL' },
  { id: 'work-history-technician', label: 'Lịch sử công việc', path: '/work-history/technician', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.TECHNICIAN] },
  { id: 'work-history-advisor', label: 'Lịch sử công việc', path: '/work-history/advisor', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ADVISOR] },
  { id: 'work-history-receptionist', label: 'Lịch sử công việc', path: '/work-history/receptionist', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
  { id: 'work-history-accountant', label: 'Lịch sử công việc', path: '/work-history/accountant', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ACCOUNTANT] },
  { id: 'work-history-manager', label: 'Lịch sử công việc', path: '/work-history/manager', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.MANAGER] },
  { id: 'work-history-admin', label: 'Lịch sử công việc', path: '/work-history/admin', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ADMIN] },
];

const StaffHeader = ({ notificationState, notificationBell }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const staffRoles = useMemo(() => readStaffRoles(), [location.pathname]);
  const staffProfile = useMemo(() => readStaffProfile(), [location.pathname]);

  const staffFullName = staffProfile?.fullName || 'Nhân viên';
  const staffAvatarUrl = getAvatarSrc(staffProfile?.avatarUrl);

  const visibleItems = useMemo(() => {
    return HEADER_NAV_ITEMS.filter((item) => hasAnyRole(item.roles, staffRoles));
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
    </header>
  );
};

export default StaffHeader;
