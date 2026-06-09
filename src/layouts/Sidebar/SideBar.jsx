import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import {
    LayoutDashboard,
    User,
    CalendarPlus,
    Calendar,
    Clock,
    FileClock,
    ClipboardList,
    FileText,
    CheckSquare,
    Wrench,
    Box,
    Tag,
    Settings,
    Download,
    Upload,
    Undo,
    Users,
    Contact,
    CalendarDays,
    Bell,
    Gift,
    Megaphone,
    Star,
    TrendingUp,
    ChevronRight,
    ChevronLeft,
    LogOut,
    Menu,
    X,
    Briefcase,
    Terminal,
    Layers,
    DollarSign,
} from 'lucide-react';
import './SideBar.css';

const SIDEBAR_GROUPS_STORAGE_KEY = 'sidebarOpenGroups';
const SIDEBAR_SUBGROUPS_STORAGE_KEY = 'sidebarOpenSubGroups';

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

const readStaffRolesFromStorage = () => {
    try {
        const raw = localStorage.getItem('staffRoles');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((r) => typeof r === 'string')
            .map((r) => normalizeRoleName(r))
            .filter(Boolean);
    } catch {
        return [];
    }
};

const readStaffProfileFromStorage = () => {
    try {
        const raw = localStorage.getItem('staffProfile');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            staffId: parsed.staffId ?? null,
            fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
            avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
            role: Array.isArray(parsed.role) ? parsed.role : [],
        };
    } catch {
        return null;
    }
};

const NAV_GROUPS = [
    {
        id: 'general',
        label: 'Màn hình chung',
        icon: <Layers size={14} />,
        defaultOpen: true,
        items: [
            { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: 'ALL' },
        ],
    },
    {
        id: 'features',
        label: 'Chức năng',
        icon: <Wrench size={14} />,
        defaultOpen: true,
        subGroups: [
            {
                id: 'sub-booking',
                label: 'Khách hàng & Lịch hẹn',
                icon: <User size={15} />,
                items: [
                    { id: 'customer-manager', label: 'Quản lý khách hàng', path: '/customer-manager', icon: <User size={18} />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ADMIN] },
                    { id: 'create-booking', label: 'Tạo lịch giữ chỗ', path: '/create-booking', icon: <CalendarPlus size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
                    { id: 'booking-management', label: 'Quản lý lịch hẹn', path: '/booking-management', icon: <Calendar size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
                    { id: 'booking-request-management', label: 'Yêu cầu đặt lịch', path: '/booking-request-management', icon: <Clock size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
                    { id: 'queue-management', label: 'Quản lý hàng chờ đặt lịch', path: '/queue-management', icon: <FileClock size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
                ]
            },
            {
                id: 'sub-service',
                label: 'Dịch vụ & Xưởng',
                icon: <ClipboardList size={15} />,
                items: [
                    { id: 'advisor-inspection', label: 'Điều phối phiếu dịch vụ', path: '/advisor/inspection', icon: <ClipboardList size={18} />, roles: [STAFF_ROLE.ADVISOR, STAFF_ROLE.MANAGER, STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.TECHNICIAN, STAFF_ROLE.ADMIN] },
                    { id: 'service-ticket-management', label: 'Phiếu dịch vụ', path: '/service-ticket-management', icon: <FileText size={18} />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'my-tasks', label: 'Công việc hôm nay', path: '/technician/my-tasks', icon: <CheckSquare size={18} />, roles: [STAFF_ROLE.TECHNICIAN] },
                    { id: 'service-management', label: 'Quản lý dịch vụ', path: '/service-management', icon: <Wrench size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ACCOUNTANT] },
                ]
            },
            {
                id: 'sub-warehouse',
                label: 'Kho & Phụ tùng',
                icon: <Box size={15} />,
                items: [
                    { id: 'warehouse-management', label: 'Quản lý kho', path: '/warehouse-management', icon: <Box size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'warehouse-pricing', label: 'Giá theo kho', path: '/warehouse-pricing', icon: <Tag size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'part-management', label: 'Quản lý phụ tùng', path: '/part-management', icon: <Settings size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'warehouse-stock-entries', label: 'Quản lý phiếu nhập', path: '/warehouse-stock-entries', icon: <Download size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'warehouse-stock-issues', label: 'Quản lý phiếu xuất', path: '/warehouse-stock-issues', icon: <Upload size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'warehouse-return-entries', label: 'Quản lý phiếu trả hàng', path: '/warehouse-return-entries', icon: <Undo size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                ]
            },
            {
                id: 'sub-hr',
                label: 'Nhân sự',
                icon: <Users size={15} />,
                items: [
                    { id: 'staff-manager', label: 'Quản lý nhân viên', path: '/staff-manager', icon: <Users size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'employee-manager', label: 'Quản lý hồ sơ nhân viên', path: '/employee-manager', icon: <Contact size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'shift-management', label: 'Quản lý ca làm việc', path: '/shift-management', icon: <CalendarDays size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'staff-notification-sender', label: 'Thông báo nhân viên', path: '/staff-notification-sender', icon: <Bell size={18} />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-marketing',
                label: 'Marketing & CSKH',
                icon: <Megaphone size={15} />,
                items: [
                    { id: 'promotion-management', label: 'Quản lý khuyến mãi', path: '/promotion-management', icon: <Gift size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'maintenance-reminders', label: 'Nhắc lịch bảo dưỡng', path: '/maintenance-reminders', icon: <Bell size={18} />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER] },
                    { id: 'announcement-campaign', label: 'Chiến dịch thông báo', path: '/announcement_campaign', icon: <Megaphone size={18} />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER] },
                    { id: 'feedback-management', label: 'Quản lý feedback', path: '/feedback-management', icon: <Star size={18} />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-system',
                label: 'Hệ thống',
                icon: <Terminal size={15} />,
                items: [
                    { id: 'system-log-management', label: 'Nhật ký hệ thống', path: '/system-log-management', icon: <Terminal size={18} />, roles: [STAFF_ROLE.ADMIN] },
                ]
            }
        ],
    },
    {
        id: 'finance',
        label: 'Tài chính & Doanh thu',
        icon: <DollarSign size={14} />,
        defaultOpen: true,
        items: [
            { id: 'revenue-management', label: 'Quản lý doanh thu', path: '/revenue-management', icon: <TrendingUp size={18} />, roles: [STAFF_ROLE.ACCOUNTANT, STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
        ],
    },
    {
        id: 'personal',
        label: 'Cá nhân',
        defaultOpen: true,
        items: [
            { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', icon: <Contact size={18} />, roles: 'ALL' },
            { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', icon: <Calendar size={18} />, roles: 'ALL' },
            { id: 'work-history-technician', label: 'Lịch sử công việc', path: '/work-history/technician', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.TECHNICIAN] },
            { id: 'work-history-advisor', label: 'Lịch sử công việc', path: '/work-history/advisor', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ADVISOR] },
            { id: 'work-history-receptionist', label: 'Lịch sử công việc', path: '/work-history/receptionist', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.RECEPTIONIST] },
            { id: 'work-history-accountant', label: 'Lịch sử công việc', path: '/work-history/accountant', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ACCOUNTANT] },
            { id: 'work-history-manager', label: 'Lịch sử công việc', path: '/work-history/manager', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.MANAGER] },
            { id: 'work-history-admin', label: 'Lịch sử công việc', path: '/work-history/admin', icon: <Briefcase size={18} />, roles: [STAFF_ROLE.ADMIN] },
        ],
    },
];

const hasAnyRole = (allowedRoles, staffRoles) => {
    if (allowedRoles === 'ALL') return true;
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;
    const roleSet = Array.isArray(staffRoles)
        ? new Set(staffRoles.map((r) => normalizeRoleName(r)).filter(Boolean))
        : new Set();
    return allowedRoles.some((r) => roleSet.has(normalizeRoleName(r)));
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

const filterSubGroupsByRoles = (subGroups, staffRoles) => {
    if (!Array.isArray(subGroups)) return [];
    const result = [];
    for (const subGroup of subGroups) {
        const items = filterItemsByRoles(subGroup?.items, staffRoles);
        if (items.length > 0) result.push({ ...subGroup, items });
    }
    return result;
};

const buildVisibleGroups = (navGroups, staffRoles) => {
    const result = [];
    for (const group of navGroups) {
        if (Array.isArray(group?.subGroups) && group.subGroups.length > 0) {
            const subGroups = filterSubGroupsByRoles(group.subGroups, staffRoles);
            if (subGroups.length > 0) result.push({ ...group, subGroups });
            continue;
        }

        const items = filterItemsByRoles(group?.items, staffRoles);
        if (items.length > 0) result.push({ ...group, items });
    }
    return result;
};

const readSidebarState = (storageKey, fallbackValue) => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return fallbackValue;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallbackValue;
        return parsed;
    } catch {
        return fallbackValue;
    }
};

const SideBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true';
    });
    const [openGroups, setOpenGroups] = useState(() =>
    ({
        ...Object.fromEntries(NAV_GROUPS.map((g) => [g.id, Boolean(g.defaultOpen)])),
        ...readSidebarState(SIDEBAR_GROUPS_STORAGE_KEY, {}),
    })
    );
    const [openSubGroups, setOpenSubGroups] = useState(() =>
        readSidebarState(SIDEBAR_SUBGROUPS_STORAGE_KEY, {})
    );

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }, [isCollapsed]);

    const navigate = useNavigate();
    const location = useLocation();

    // NOTE: roles/profile may be written to localStorage after the first render (e.g. SSO flow).
    // This component re-renders on route changes (useLocation), so reading on render keeps UI in sync.
    const staffProfile = readStaffProfileFromStorage();
    const staffRolesFromStorage = readStaffRolesFromStorage();
    const staffProfileRoles = Array.isArray(staffProfile?.role)
        ? staffProfile.role.map(normalizeRoleName).filter(Boolean)
        : [];
    const staffRoles = staffRolesFromStorage.length > 0 ? staffRolesFromStorage : staffProfileRoles;
    const staffFullName = staffProfile?.fullName || 'Nhân viên';
    const staffAvatarUrl = getAvatarSrc(staffProfile?.avatarUrl);

    const visibleGroups = useMemo(() => {
        // Lọc bỏ nhóm 'personal' vì đã chuyển vào dropdown profile
        const filteredNavGroups = NAV_GROUPS.filter((g) => g.id !== 'personal');
        return buildVisibleGroups(filteredNavGroups, staffRoles);
    }, [staffRoles]);

    const personalItems = useMemo(() => {
        const personalGroup = NAV_GROUPS.find((g) => g.id === 'personal');
        if (!personalGroup) return [];
        const filtered = filterItemsByRoles(personalGroup.items, staffRoles);

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

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(openGroups));
        } catch {
            // ignore storage errors
        }
    }, [openGroups]);

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_SUBGROUPS_STORAGE_KEY, JSON.stringify(openSubGroups));
        } catch {
            // ignore storage errors
        }
    }, [openSubGroups]);

    useEffect(() => {
        setIsProfileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isProfileOpen) return;
        const handleOutsideClick = (event) => {
            if (!event.target.closest('.sidebar__profile-container')) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [isProfileOpen]);

    const toggleMenu = () => setIsOpen((prev) => !prev);
    const toggleProfileDropdown = () => setIsProfileOpen((prev) => !prev);

    const handleNavClick = (path) => {
        setIsOpen(false);
        setIsProfileOpen(false);
        if (path) navigate(path);
    };

    const toggleGroup = (groupId) => {
        setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Hàm mở thư mục con được cập nhật để ghi nhận trạng thái thực tế
    const toggleSubGroup = (subGroupId, currentOpenState) => {
        setOpenSubGroups((prev) => ({ ...prev, [subGroupId]: !currentOpenState }));
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('staffRoles');
        localStorage.removeItem('staffProfile');
        setIsOpen(false);
        navigate('/login', { replace: true });
    };

    const renderNavItem = (item) => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        return (
            <button
                className={`navItem navItem--child ${isActive ? 'is-active' : ''}`}
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.path)}
            >
                <span className="navItem__icon">{item.icon}</span>
                <span className="navItem__label">{item.label}</span>
            </button>
        );
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`}>
            <div className={`sidebar__profile-container ${isProfileOpen ? 'is-open' : ''}`}>
                <div
                    className="sidebar__profile"
                    onClick={toggleProfileDropdown}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleProfileDropdown()}
                    aria-label="Thông tin cá nhân"
                >
                    <div className="sidebar__avatar">
                        <img src={staffAvatarUrl} alt={staffFullName} onError={handleAvatarError} />
                    </div>
                    <div className="sidebar__meta">
                        <p className="sidebar__greeting">Michelin ST</p>
                        <p className="sidebar__name" title={staffFullName}>{staffFullName}</p>
                    </div>
                    <div className="sidebar__profile-chevron" aria-hidden="true">
                        <ChevronRight />
                    </div>
                </div>

                <button
                    type="button"
                    className="sidebar__collapse-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsCollapsed(!isCollapsed);
                    }}
                    aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                {isProfileOpen && (
                    <div className="sidebar__profile-dropdown">
                        {personalItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="sidebar__profile-dropdown-item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavClick(item.path);
                                }}
                            >
                                <span className="dropdown-item__icon">{item.icon}</span>
                                <span className="dropdown-item__label">{item.label}</span>
                            </button>
                        ))}
                        {personalItems.length > 0 && <hr className="dropdown-divider" />}
                        <button
                            type="button"
                            className="sidebar__profile-dropdown-item logout"
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

            <button
                type="button"
                className="sidebar__toggle"
                onClick={toggleMenu}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
            >
                <span className="sidebar__toggleIcon">{isOpen ? <X /> : <Menu />}</span>
                <span className="sidebar__toggleLabel">Menu</span>
            </button>

            <nav className={`sidebar__nav ${isOpen ? 'is-open' : ''}`}>
                {visibleGroups.map((group) => {
                    const isGroupOpen = Boolean(openGroups[group.id]);
                    return (
                        <div className="navGroup" key={group.id}>
                            <button
                                className="navGroup__header"
                                type="button"
                                onClick={() => toggleGroup(group.id)}
                                aria-expanded={isGroupOpen}
                            >
                                <div className="navGroup__headerLeft">
                                    {group.icon && <span className="navGroup__headerIcon">{group.icon}</span>}
                                    <span className="navGroup__headerLabel">{group.label}</span>
                                </div>
                                <span className={`navGroup__chevron ${isGroupOpen ? 'is-open' : ''}`} aria-hidden="true">
                                    <ChevronRight />
                                </span>
                            </button>

                            <div className={`navGroup__itemsWrapper ${isGroupOpen ? 'is-open' : ''}`}>
                                <div className="navGroup__items">
                                    {group.subGroups ? (
                                        group.subGroups.map((subGroup) => {
                                            // LOGIC UX MỚI: Tự động sổ xuống nếu mục con chỉ có đúng 1 item (trừ khi user cố tình bấm đóng)
                                            const hasStoredOpenState = Object.hasOwn(openSubGroups, subGroup.id);
                                            const isSubGroupOpen = hasStoredOpenState
                                                ? openSubGroups[subGroup.id]
                                                : subGroup.items.length === 1;

                                             return (
                                                <div key={subGroup.id} className="navGroup__subGroup">
                                                    <button
                                                         className="navGroup__subHeader"
                                                         type="button"
                                                         onClick={() => toggleSubGroup(subGroup.id, isSubGroupOpen)}
                                                         aria-expanded={isSubGroupOpen}
                                                    >
                                                         <div className="navGroup__subHeaderLeft">
                                                             {subGroup.icon && <span className="navGroup__subHeaderIcon">{subGroup.icon}</span>}
                                                             <span className="navGroup__subHeaderLabel">{subGroup.label}</span>
                                                         </div>
                                                         <span className={`navGroup__chevron ${isSubGroupOpen ? 'is-open' : ''}`} aria-hidden="true">
                                                             <ChevronRight />
                                                         </span>
                                                    </button>

                                                    <div className={`navGroup__subItemsWrapper ${isSubGroupOpen ? 'is-open' : ''}`}>
                                                         <div className="navGroup__subItems">
                                                             {subGroup.items.map(renderNavItem)}
                                                         </div>
                                                    </div>
                                                </div>
                                             );
                                        })
                                    ) : (
                                        group.items?.map(renderNavItem)
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
};

export { SideBar };
export default SideBar;
