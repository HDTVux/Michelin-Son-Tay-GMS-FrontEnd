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
  Search,
  Loader2,
  User,
  Download,
  Upload,
  Undo,
  Layers,
  X
} from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import './StaffHeader.css';
import { request } from '../../services/apiClient.js';


const normalizeSearchText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

const SEARCHABLE_FUNCTIONS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', roles: 'ALL' },
  { id: 'system-tutorials', label: 'Hướng dẫn sử dụng', path: '/system-tutorials', roles: 'ALL' },
  { id: 'customer-manager', label: 'Danh bạ khách hàng', path: '/customer-manager', roles: ['RECEPTIONIST', 'ADMIN'] },
  { id: 'create-booking', label: 'Tạo lịch giữ chỗ', path: '/create-booking', roles: ['RECEPTIONIST'] },
  { id: 'booking-management', label: 'Quản lý lịch hẹn', path: '/booking-management', roles: ['RECEPTIONIST'] },
  { id: 'booking-request-management', label: 'Yêu cầu đặt lịch', path: '/booking-request-management', roles: ['RECEPTIONIST'] },
  { id: 'queue-management', label: 'Quản lý hàng chờ đặt lịch', path: '/queue-management', roles: ['RECEPTIONIST'] },
  { id: 'advisor-inspection', label: 'Điều phối phiếu dịch vụ', path: '/advisor/inspection', roles: ['ADVISOR', 'MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ADMIN'] },
  { id: 'service-ticket-management', label: 'Phiếu dịch vụ', path: '/service-ticket-management', roles: ['RECEPTIONIST', 'ACCOUNTANT'] },
  { id: 'my-tasks', label: 'Công việc hôm nay', path: '/technician/my-tasks', roles: ['TECHNICIAN'] },
  { id: 'service-management', label: 'Quản lý dịch vụ', path: '/service-management', roles: ['MANAGER', 'ACCOUNTANT'] },
  { id: 'combo-management', label: 'Quản lý gói Combo', path: '/combo-management', roles: ['MANAGER', 'ACCOUNTANT'] },
  { id: 'warehouse-management', label: 'Quản lý kho', path: '/warehouse-management', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-config', label: 'Cấu hình kho', path: '/warehouse-config', roles: ['MANAGER', 'ADMIN', 'WAREHOUSE_MANAGER'] },
  { id: 'warehouse-pricing', label: 'Giá theo kho', path: '/warehouse-pricing', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'part-management', label: 'Quản lý phụ tùng', path: '/part-management', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-stock-entries', label: 'Quản lý phiếu nhập', path: '/warehouse-stock-entries', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-stock-issues', label: 'Quản lý phiếu xuất', path: '/warehouse-stock-issues', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-return-entries', label: 'Quản lý phiếu trả hàng', path: '/warehouse-return-entries', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-defective-inventory', label: 'Kho hàng lỗi', path: '/warehouse-defective-inventory', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-defect-report', label: 'Báo cáo lỗi & Trách nhiệm', path: '/warehouse-defect-report', roles: ['MANAGER'] },
  { id: 'staff-manager', label: 'Quản lý nhân viên', path: '/staff-manager', roles: ['MANAGER', 'ADMIN'] },
  { id: 'employee-manager', label: 'Quản lý hồ sơ nhân viên', path: '/employee-manager', roles: ['MANAGER', 'ADMIN'] },
  { id: 'shift-management', label: 'Quản lý ca làm việc', path: '/shift-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'staff-notification-sender', label: 'Thông báo nhân viên', path: '/staff-notification-sender', roles: ['RECEPTIONIST', 'MANAGER', 'ADMIN'] },
  { id: 'promotion-management', label: 'Quản lý khuyến mãi', path: '/promotion-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'maintenance-reminders', label: 'Nhắc lịch bảo dưỡng', path: '/maintenance-reminders', roles: ['RECEPTIONIST', 'MANAGER'] },
  { id: 'announcement-campaign', label: 'Chiến dịch thông báo', path: '/announcement_campaign', roles: ['RECEPTIONIST', 'MANAGER'] },
  { id: 'feedback-management', label: 'Quản lý feedback', path: '/feedback-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'system-log-management', label: 'Nhật ký hệ thống', path: '/system-log-management', roles: ['ADMIN'] },
  { id: 'revenue-management', label: 'Quản lý doanh thu', path: '/revenue-management', roles: ['ACCOUNTANT', 'MANAGER', 'ADMIN'] },
  { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', roles: 'ALL' },
  { id: 'staff-notifications-page', label: 'Thông báo cá nhân', path: '/notifications', roles: 'ALL' },
  { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', roles: 'ALL' },
];

const querySearch = async (searchTerm, staffRoles) => {
  const token = localStorage.getItem('authToken');
  if (!token || !searchTerm.trim()) return null;

  const query = searchTerm.trim();
  const normalizedRoles = staffRoles.map(normalizeRoleName);

  const results = {
    functions: [],
    customers: [],
    tickets: [],
    stockEntries: [],
    stockIssues: [],
    returnEntries: []
  };

  // 1. Local functions search
  const normalizedQuery = normalizeSearchText(query);
  results.functions = SEARCHABLE_FUNCTIONS.filter(item => {
    const hasRole = item.roles === 'ALL' || (Array.isArray(item.roles) && item.roles.some(r => normalizedRoles.includes(normalizeRoleName(r))));
    if (!hasRole) return false;
    return normalizeSearchText(item.label).includes(normalizedQuery);
  }).slice(0, 5);

  // 2. Fetch other categories in parallel
  const promises = [];

  // Customers
  const hasCustomerAccess = normalizedRoles.some(r => ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(r));
  if (hasCustomerAccess) {
    promises.push(
      request(`/api/admin/customer/getAllCustomer?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then(res => {
          results.customers = (res?.data?.content || []).map(c => ({
            id: c.customerId || c.id,
            title: c.fullName || 'Khách hàng',
            subtitle: c.phoneNumber || c.phone || '',
            path: `/customer-manager?search=${encodeURIComponent(c.phoneNumber || c.fullName)}`
          }));
        })
        .catch(() => {})
    );
  }

  // Service Tickets
  const hasTicketAccess = normalizedRoles.some(r => ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'ADVISOR', 'TECHNICIAN'].includes(r));
  if (hasTicketAccess) {
    promises.push(
      request(`/api/service-ticket/manage/tickets?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then(res => {
          results.tickets = (res?.data?.content || []).map(t => ({
            id: t.serviceTicketId || t.ticketId || t.id,
            title: t.ticketCode || t.code || 'Phiếu dịch vụ',
            subtitle: `${t.licensePlate || ''} - ${t.customerName || ''}`,
            path: `/service-ticket-detail/${encodeURIComponent(t.ticketCode || t.code)}`
          }));
        })
        .catch(() => {})
    );
  }

  // Warehouse
  const hasWarehouseAccess = normalizedRoles.some(r => ['ADMIN', 'MANAGER', 'WAREHOUSE_KEEPER', 'WAREHOUSE_MANAGER'].includes(r));
  if (hasWarehouseAccess) {
    promises.push(
      request(`/api/warehouse/stock-entries?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then(res => {
          results.stockEntries = (res?.data?.content || []).map(e => ({
            id: e.entryId,
            title: e.entryCode || 'Phiếu nhập',
            subtitle: `NCC: ${e.supplierName || ''} - Tổng: ${e.totalAmount?.toLocaleString('vi-VN') || 0}đ`,
            path: `/warehouse-stock-entries/${e.entryId}`
          }));
        })
        .catch(() => {})
    );

    promises.push(
      request(`/api/warehouse/stock-issues?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then(res => {
          results.stockIssues = (res?.data?.content || []).map(e => ({
            id: e.issueId,
            title: e.issueCode || 'Phiếu xuất',
            subtitle: `Người nhận: ${e.receiverName || ''} - Loại: ${e.issueType || ''}`,
            path: `/warehouse-stock-issues/${e.issueId}`
          }));
        })
        .catch(() => {})
    );

    promises.push(
      request(`/api/warehouse/return-entries?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then(res => {
          results.returnEntries = (res?.data?.content || []).map(e => ({
            id: e.returnId,
            title: e.returnCode || 'Phiếu hoàn hàng',
            subtitle: `Người trả: ${e.staffName || ''} - Lý do: ${e.reason || ''}`,
            path: `/warehouse-return-entries/${e.returnId}`
          }));
        })
        .catch(() => {})
    );
  }

  await Promise.all(promises);
  return results;
};

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

  const searchContainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const normalizedRoles = useMemo(() => staffRoles.map(normalizeRoleName), [staffRoles]);

  // Ctrl + K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchContainerRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside search
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await querySearch(searchQuery, staffRoles);
        setSearchResults(data);
      } catch (err) {
        console.error('Lỗi khi tìm kiếm universal:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, staffRoles]);

  const handleItemClick = (path) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(path);
  };

  const suggestedFunctions = useMemo(() => {
    return SEARCHABLE_FUNCTIONS.filter(item => {
      return item.roles === 'ALL' || (Array.isArray(item.roles) && item.roles.some(r => normalizedRoles.includes(normalizeRoleName(r))));
    }).slice(0, 4);
  }, [normalizedRoles]);

  const hasResults = useMemo(() => {
    return searchResults && Object.values(searchResults).some(arr => Array.isArray(arr) && arr.length > 0);
  }, [searchResults]);

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
        {/* Universal Search Container */}
        <div 
          className={`staff-header__search-container ${isSearchFocused ? 'is-focused' : ''}`}
          ref={searchContainerRef}
        >
          <div className="universal-search__wrapper">
            <Search size={16} className="universal-search__icon" />
            <input
              type="text"
              placeholder="Tìm kiếm mọi thứ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="universal-search__input"
            />
            {searchQuery ? (
              <button
                type="button"
                className="universal-search__clear"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa từ khóa"
              >
                <X size={14} />
              </button>
            ) : (
              <span className="universal-search__shortcut">Ctrl K</span>
            )}
          </div>

          {isSearchFocused && (
            <div className="universal-search__dropdown">
              {isSearching ? (
                <div className="universal-search__loader">
                  <Loader2 size={24} />
                </div>
              ) : searchQuery.trim() ? (
                !hasResults ? (
                  <div className="universal-search__empty">
                    <p>Không tìm thấy kết quả phù hợp cho "{searchQuery}"</p>
                  </div>
                ) : (
                  <>
                    {/* 1. Functions */}
                    {searchResults.functions && searchResults.functions.length > 0 && (
                      <div className="universal-search__group">
                        <div className="universal-search__group-header">Chức năng</div>
                        {searchResults.functions.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="universal-search__item"
                            onClick={() => handleItemClick(item.path)}
                          >
                            <span className="universal-search__item-icon"><Layers size={14} /></span>
                            <div className="universal-search__item-info">
                              <div className="universal-search__item-title">{item.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 2. Customers */}
                    {searchResults.customers && searchResults.customers.length > 0 && (
                      <div className="universal-search__group">
                        <div className="universal-search__group-header">Khách hàng</div>
                        {searchResults.customers.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="universal-search__item"
                            onClick={() => handleItemClick(item.path)}
                          >
                            <span className="universal-search__item-icon"><User size={14} /></span>
                            <div className="universal-search__item-info">
                              <div className="universal-search__item-title">{item.title}</div>
                              <div className="universal-search__item-subtitle">{item.subtitle}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 3. Tickets */}
                    {searchResults.tickets && searchResults.tickets.length > 0 && (
                      <div className="universal-search__group">
                        <div className="universal-search__group-header">Phiếu dịch vụ</div>
                        {searchResults.tickets.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="universal-search__item"
                            onClick={() => handleItemClick(item.path)}
                          >
                            <span className="universal-search__item-icon"><FileText size={14} /></span>
                            <div className="universal-search__item-info">
                              <div className="universal-search__item-title">{item.title}</div>
                              <div className="universal-search__item-subtitle">{item.subtitle}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 4. Stock Entries */}
                    {searchResults.stockEntries && searchResults.stockEntries.length > 0 && (
                      <div className="universal-search__group">
                        <div className="universal-search__group-header">Phiếu nhập kho</div>
                        {searchResults.stockEntries.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="universal-search__item"
                            onClick={() => handleItemClick(item.path)}
                          >
                            <span className="universal-search__item-icon"><Download size={14} /></span>
                            <div className="universal-search__item-info">
                              <div className="universal-search__item-title">{item.title}</div>
                              <div className="universal-search__item-subtitle">{item.subtitle}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 5. Stock Issues */}
                    {searchResults.stockIssues && searchResults.stockIssues.length > 0 && (
                      <div className="universal-search__group">
                        <div className="universal-search__group-header">Phiếu xuất kho</div>
                        {searchResults.stockIssues.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="universal-search__item"
                            onClick={() => handleItemClick(item.path)}
                          >
                            <span className="universal-search__item-icon"><Upload size={14} /></span>
                            <div className="universal-search__item-info">
                              <div className="universal-search__item-title">{item.title}</div>
                              <div className="universal-search__item-subtitle">{item.subtitle}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 6. Return Entries */}
                    {searchResults.returnEntries && searchResults.returnEntries.length > 0 && (
                      <div className="universal-search__group">
                        <div className="universal-search__group-header">Phiếu hoàn hàng</div>
                        {searchResults.returnEntries.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="universal-search__item"
                            onClick={() => handleItemClick(item.path)}
                          >
                            <span className="universal-search__item-icon"><Undo size={14} /></span>
                            <div className="universal-search__item-info">
                              <div className="universal-search__item-title">{item.title}</div>
                              <div className="universal-search__item-subtitle">{item.subtitle}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className="universal-search__suggestions">
                  <div className="universal-search__group-header">Gợi ý chức năng</div>
                  {suggestedFunctions.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="universal-search__item"
                      onClick={() => handleItemClick(item.path)}
                    >
                      <span className="universal-search__item-icon"><Layers size={14} /></span>
                      <div className="universal-search__item-info">
                        <div className="universal-search__item-title">{item.label}</div>
                      </div>
                    </button>
                  ))}
                  <div className="universal-search__tip">
                    Mẹo: Nhấn <kbd>Ctrl + K</kbd> để tìm nhanh từ bất kỳ đâu.
                  </div>
                </div>
              )}
            </div>
          )}
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
