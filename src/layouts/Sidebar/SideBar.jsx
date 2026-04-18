import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
        defaultOpen: true,
        items: [
            { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <IconHome />, roles: 'ALL' },
        ],
    },
    {
        id: 'features',
        label: 'Chức năng',
        defaultOpen: true,
        subGroups: [
            {
                id: 'sub-booking',
                label: 'Khách hàng & Lịch hẹn',
                items: [
                    { id: 'customer-manager', label: 'Quản lý khách hàng', path: '/customer-manager', icon: <IconUser />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ADMIN] },
                    { id: 'vehicle-management', label: 'Quản lý phương tiện', path: '/vehicle-management', icon: <IconVehicle />, roles: [STAFF_ROLE.ADVISOR, STAFF_ROLE.RECEPTIONIST] },
                    { id: 'create-booking', label: 'Tạo lịch hẹn', path: '/create-booking', icon: <IconEdit />, roles: [STAFF_ROLE.RECEPTIONIST] },
                    { id: 'booking-management', label: 'Quản lý lịch hẹn', path: '/booking-management', icon: <IconCalendar />, roles: [STAFF_ROLE.RECEPTIONIST] },
                    { id: 'booking-request-management', label: 'Yêu cầu đặt lịch', path: '/booking-request-management', icon: <IconClock />, roles: [STAFF_ROLE.RECEPTIONIST] },
                    { id: 'queue-management', label: 'Quản lý hàng chờ đặt lịch', path: '/queue-management', icon: <IconCalendar />, roles: [STAFF_ROLE.RECEPTIONIST] },
                ]
            },
            {
                id: 'sub-service',
                label: 'Dịch vụ & Xưởng',
                items: [
                    { id: 'advisor-inspection', label: 'Điều phối phiếu dịch vụ', path: '/advisor/inspection', icon: <IconClipboard />, roles: [STAFF_ROLE.ADVISOR, STAFF_ROLE.MANAGER, STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.TECHNICIAN, STAFF_ROLE.ADMIN] },
                    { id: 'service-ticket-management', label: 'Phiếu dịch vụ', path: '/service-ticket-management', icon: <IconPost />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'my-tasks', label: 'Công việc hôm nay', path: '/technician/my-tasks', icon: <IconTask />, roles: [STAFF_ROLE.TECHNICIAN] },
                    { id: 'service-management', label: 'Quản lý dịch vụ', path: '/service-management', icon: <IconWrench />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-warehouse',
                label: 'Kho & Phụ tùng',
                items: [
                    { id: 'warehouse-management', label: 'Quản lý kho', path: '/warehouse-management', icon: <IconBox />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'warehouse-pricing', label: 'Giá theo kho', path: '/warehouse-pricing', icon: <IconBox />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'part-management', label: 'Quản lý phụ tùng', path: '/part-management', icon: <IconSettings />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'warehouse-stock-entries', label: 'Quản lý phiếu nhập', path: '/warehouse-stock-entries', icon: <IconDownload />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'warehouse-stock-issues', label: 'Quản lý phiếu xuất', path: '/warehouse-stock-issues', icon: <IconUpload />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'warehouse-return-entries', label: 'Quản lý phiếu trả hàng', path: '/warehouse-return-entries', icon: <IconUpload />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN, STAFF_ROLE.ACCOUNTANT] },
                ]
            },
            {
                id: 'sub-hr',
                label: 'Nhân sự',
                items: [
                    { id: 'staff-manager', label: 'Quản lý nhân viên', path: '/staff-manager', icon: <IconUsers />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'employee-manager', label: 'Quản lý hồ sơ nhân viên', path: '/employee-manager', icon: <IconBadge />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'shift-management', label: 'Quản lý ca làm việc', path: '/shift-management', icon: <IconCalendar />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-marketing',
                label: 'Marketing & CSKH',
                items: [
                    { id: 'promotion-management', label: 'Quản lý khuyến mãi', path: '/promotion-management', icon: <IconGift />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'maintenance-reminders', label: 'Nhắc lịch bảo dưỡng', path: '/maintenance-reminders', icon: <IconBell />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER] },
                    { id: 'announcement-campaign', label: 'Chiến dịch thông báo', path: '/announcement_campaign', icon: <IconMegaphone />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER] },
                    { id: 'feedback-management', label: 'Quản lý feedback', path: '/feedback-management', icon: <IconStar />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-system',
                label: 'Hệ thống',
                items: [
                    { id: 'system-log-management', label: 'Nhật ký hệ thống', path: '/system-log-management', icon: <IconTerminal />, roles: [STAFF_ROLE.ADMIN] },
                ]
            }
        ],
    },
    {
        id: 'personal',
        label: 'Cá nhân',
        defaultOpen: true,
        items: [
            { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', icon: <IconBadge />, roles: 'ALL' },
            { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', icon: <IconCalendar />, roles: 'ALL' },
            { id: 'work-history-technician', label: 'Lịch sử công việc', path: '/work-history/technician', icon: <IconBriefcase />, roles: [STAFF_ROLE.TECHNICIAN] },
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
    const [openGroups, setOpenGroups] = useState(() =>
        ({
            ...Object.fromEntries(NAV_GROUPS.map((g) => [g.id, Boolean(g.defaultOpen)])),
            ...readSidebarState(SIDEBAR_GROUPS_STORAGE_KEY, {}),
        })
    );
    const [openSubGroups, setOpenSubGroups] = useState(() =>
        readSidebarState(SIDEBAR_SUBGROUPS_STORAGE_KEY, {})
    );
    
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
    const staffAvatarUrl = staffProfile?.avatarUrl || '';

    const visibleGroups = useMemo(() => {
        return buildVisibleGroups(NAV_GROUPS, staffRoles);
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

    const toggleMenu = () => setIsOpen((prev) => !prev);
    
    const handleNavClick = (path) => {
        setIsOpen(false);
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
        <aside className="sidebar">
            <div className="sidebar__profile">
                <div className="sidebar__avatar">
                    {staffAvatarUrl ? (
                        <img src={staffAvatarUrl} alt={staffFullName} />
                    ) : (
                        <img src="https://i.pravatar.cc/80?img=64" alt={staffFullName} />
                    )}
                </div>
                <div>
                    <p className="sidebar__greeting">Xin chào,</p>
                    <p className="sidebar__name">{staffFullName}</p>
                </div>
            </div>

            <button
                type="button"
                className="sidebar__toggle"
                onClick={toggleMenu}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
            >
                <span className="sidebar__toggleIcon">{isOpen ? <IconClose /> : <IconMenu />}</span>
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
                                <span className="navGroup__headerLabel">{group.label}</span>
                                <span className={`navGroup__chevron ${isGroupOpen ? 'is-open' : ''}`} aria-hidden="true">
                                    <IconChevron />
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
                                                        <span className="navGroup__subHeaderLabel">{subGroup.label}</span>
                                                        <span className={`navGroup__chevron ${isSubGroupOpen ? 'is-open' : ''}`} aria-hidden="true">
                                                            <IconChevron />
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

            <button className="sidebar__logout" type="button" onClick={handleLogout}>
                <IconLogout />
                <span>Đăng xuất</span>
            </button>
        </aside>
    );
};

// --- ICONS (outline style – mỗi mục 1 icon riêng) ---
const svgProps = { fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' };

// Chung
function IconHome() { return <svg {...svgProps}><path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></svg>; }
function IconMenu() { return <svg {...svgProps}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>; }
function IconClose() { return <svg {...svgProps}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
function IconChevron() { return <svg {...svgProps} strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>; }
function IconLogout() { return <svg {...svgProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>; }

// Khách hàng & Lịch hẹn
function IconUser() { return <svg {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }
function IconVehicle() { return <svg {...svgProps}><path d="M5 17h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-1.17-1.82l-1.5-4.5A2 2 0 0 0 16.44 4H7.56a2 2 0 0 0-1.89 1.68l-1.5 4.5A2 2 0 0 0 3 12v3a2 2 0 0 0 2 2z" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" /></svg>; }
function IconEdit() { return <svg {...svgProps}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function IconCalendar() { return <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>; }
function IconClock() { return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }

// Dịch vụ & Xưởng
function IconClipboard() { return <svg {...svgProps}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>; }
function IconPost() { return <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>; }
function IconTask() { return <svg {...svgProps}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>; }
function IconWrench() { return <svg {...svgProps}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>; }

// Kho & Phụ tùng
function IconBox() { return <svg {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>; }
function IconSettings() { return <svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>; }
function IconDownload() { return <svg {...svgProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function IconUpload() { return <svg {...svgProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>; }

// Nhân sự
function IconUsers() { return <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>; }
function IconBadge() { return <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7 20v-1a5 5 0 0 1 10 0v1" /></svg>; }

// Marketing & CSKH
function IconGift() { return <svg {...svgProps}><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>; }
function IconBell() { return <svg {...svgProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>; }
function IconMegaphone() { return <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>; }
function IconStar() { return <svg {...svgProps}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }
function IconHistory() { return <svg {...svgProps}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>; }

// Hệ thống
function IconTerminal() { return <svg {...svgProps}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>; }

// Cá nhân
function IconBriefcase() { return <svg {...svgProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>; }

export { SideBar };
export default SideBar;
