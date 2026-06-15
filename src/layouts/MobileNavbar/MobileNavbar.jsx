import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Box, CalendarPlus, FileText, Bell } from 'lucide-react';
import './MobileNavbar.css';

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

const hasAnyRole = (allowedRoles, staffRoles) => {
  if (allowedRoles === 'ALL') return true;
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;
  const roleSet = new Set(staffRoles);
  return allowedRoles.some((role) => roleSet.has(normalizeRoleName(role)));
};

const MOBILE_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />,
    roles: 'ALL',
  },
  {
    id: 'warehouse',
    label: 'Kho',
    path: '/warehouse-management',
    icon: <Box size={20} />,
    roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER],
  },
  {
    id: 'create-booking',
    label: 'Tạo lịch',
    path: '/create-booking',
    icon: <CalendarPlus size={20} />,
    roles: [STAFF_ROLE.RECEPTIONIST],
  },
  {
    id: 'service-tickets',
    label: 'Phiếu DV',
    path: '/service-ticket-management',
    icon: <FileText size={20} />,
    roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ACCOUNTANT],
  },
];

const MobileNavbar = ({ notificationState }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Read staff roles from storage on render (synchronized with SSO / updates)
  const staffRoles = useMemo(() => readStaffRoles(), [location.pathname]);

  const visibleItems = useMemo(() => {
    return MOBILE_NAV_ITEMS.filter((item) => hasAnyRole(item.roles, staffRoles));
  }, [staffRoles]);

  const handleNavClick = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="mobile-navbar">
      {visibleItems.map((item) => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-navbar__item ${isActive ? 'is-active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Nút thông báo ở ngoài cùng bên phải, chuyển hướng trực tiếp */}
      <button
        type="button"
        className={`mobile-navbar__item ${location.pathname === '/notifications' ? 'is-active' : ''} ${notificationState?.unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => navigate('/notifications')}
      >
        <div className="mobile-navbar__bell-wrapper">
          <Bell size={20} />
          {notificationState?.connected && <span className="mobile-navbar__connection-dot is-connected" />}
          {notificationState?.unreadCount > 0 && <span className="mobile-navbar__badge">{notificationState.unreadCount}</span>}
        </div>
        <span>Thông báo</span>
      </button>
    </div>
  );
};

export default MobileNavbar;
export { MobileNavbar };
