import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Box, CalendarPlus, FileText, Bell, Users, Settings, Clock, Briefcase, DollarSign, Wrench, Contact } from 'lucide-react';
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

const hasAnyRole = (allowedRoles, staffRoles) => {
  if (allowedRoles === 'ALL') return true;
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;
  const roleSet = new Set(staffRoles);
  return allowedRoles.some((role) => roleSet.has(normalizeRoleName(role)));
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

const MobileNavbar = ({ notificationState }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Read staff roles from storage on render (synchronized with SSO / updates)
  const staffRoles = useMemo(() => readStaffRoles(), [location.pathname]);

  const visibleItems = useMemo(() => {
    return getDynamicNavItems(staffRoles, true);
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
