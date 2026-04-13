import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SideBar.css';

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
                    { id: 'booking-request-management', label: 'Yêu cầu đặt lịch', path: '/booking-request-management', icon: <IconHistory />, roles: [STAFF_ROLE.RECEPTIONIST] },
                ]
            },
            {
                id: 'sub-service',
                label: 'Dịch vụ & Xưởng',
                items: [
                    { id: 'advisor-inspection', label: 'Điều phối phiếu dịch vụ', path: '/advisor/inspection', icon: <IconTask />, roles: [STAFF_ROLE.ADVISOR, STAFF_ROLE.MANAGER, STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.TECHNICIAN, STAFF_ROLE.ADMIN] },
                    { id: 'service-ticket-management', label: 'Phiếu dịch vụ', path: '/service-ticket-management', icon: <IconPost />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ACCOUNTANT] },
                    { id: 'my-tasks', label: 'Công việc hôm nay', path: '/technician/my-tasks', icon: <IconTask />, roles: 'ALL' },
                    { id: 'service-management', label: 'Quản lý dịch vụ', path: '/service-management', icon: <IconSettings />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-warehouse',
                label: 'Kho & Phụ tùng',
                items: [
                    { id: 'warehouse-management', label: 'Quản lý kho', path: '/warehouse-management', icon: <IconBox />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'part-management', label: 'Quản lý phụ tùng', path: '/part-management', icon: <IconSettings />, roles: [STAFF_ROLE.MANAGER] },
                    { id: 'warehouse-stock-entries', label: 'Quản lý phiếu nhập', path: '/warehouse-stock-entries', icon: <IconBox />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN, STAFF_ROLE.WAREHOUSE_KEEPER] },
                    { id: 'warehouse-return-entries', label: 'Quản lý phiếu trả hàng', path: '/warehouse-return-entries', icon: <IconBox />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN, STAFF_ROLE.WAREHOUSE_KEEPER] },
                ]
            },
            {
                id: 'sub-hr',
                label: 'Nhân sự',
                items: [
                    { id: 'staff-manager', label: 'Quản lý nhân viên', path: '/staff-manager', icon: <IconUser />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'employee-manager', label: 'Quản lý hồ sơ nhân viên', path: '/employee-manager', icon: <IconUser />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'shift-management', label: 'Quản lý ca làm việc', path: '/shift-management', icon: <IconCalendar />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-marketing',
                label: 'Marketing & CSKH',
                items: [
                    { id: 'promotion-management', label: 'Quản lý khuyến mãi', path: '/promotion-management', icon: <IconBell />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                    { id: 'maintenance-reminders', label: 'Nhắc lịch bảo dưỡng', path: '/maintenance-reminders', icon: <IconBell />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER] },
                    { id: 'announcement-campaign', label: 'Chiến dịch thông báo', path: '/announcement_campaign', icon: <IconBell />, roles: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER] },
                    { id: 'feedback-management', label: 'Quản lý feedback', path: '/feedback-management', icon: <IconBell />, roles: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN] },
                ]
            },
            {
                id: 'sub-system',
                label: 'Hệ thống',
                items: [
                    { id: 'system-log-management', label: 'Nhật ký hệ thống', path: '/system-log-management', icon: <IconHistory />, roles: [STAFF_ROLE.ADMIN] },
                ]
            }
        ],
    },
    {
        id: 'personal',
        label: 'Cá nhân',
        defaultOpen: true,
        items: [
            { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', icon: <IconUser />, roles: 'ALL' },
            { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', icon: <IconCalendar />, roles: 'ALL' },
            { id: 'work-history-technician', label: 'Lịch sử công việc', path: '/work-history/technician', icon: <IconHistory />, roles: [STAFF_ROLE.TECHNICIAN] },
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
    return items.filter((item) => hasAnyRole(item?.roles, staffRoles));
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

const SideBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState(() =>
        Object.fromEntries(NAV_GROUPS.map((g) => [g.id, Boolean(g.defaultOpen)]))
    );
    const [openSubGroups, setOpenSubGroups] = useState({});
    
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

// --- ICONS ---
function IconHome() { return <svg viewBox="0 0 24 24"><path d="M4 9.5 12 3l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>; }
function IconUser() { return <svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5m0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5" /></svg>; }
function IconHistory() { return <svg viewBox="0 0 24 24"><path d="M4 5.5V10h4.5l-1.8-1.8A6.5 6.5 0 1 1 5 12H3a9 9 0 1 0 2.1-5.5z" /><path d="M12 7v5l3.5 2.1.8-1.3-2.8-1.7V7z" /></svg>; }
function IconEdit() { return <svg viewBox="0 0 24 24"><path d="m3 17.25 9.94-9.94 3.75 3.75L6.75 21H3z" /><path d="m14.77 5.19 2.04-2.04a1.5 1.5 0 0 1 2.12 0l1.92 1.92a1.5 1.5 0 0 1 0 2.12l-2.04 2.04z" /></svg>; }
function IconBell() { return <svg viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22m6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z" /></svg>; }
function IconSettings() { return <svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5m8.14-2.39-1.36-.76a6.52 6.52 0 0 0 0-1.7l1.36-.76a.5.5 0 0 0 .21-.68l-1.5-2.6a.5.5 0 0 0-.64-.21l-1.35.78a6.4 6.4 0 0 0-1.46-.85l-.2-1.54a.5.5 0 0 0-.5-.44h-3a.5.5 0 0 0-.5.44l-.2 1.54a6.4 6.4 0 0 0-1.46.85L5.79 6.3a.5.5 0 0 0-.64.21l-1.5 2.6a.5.5 0 0 0 .21.68l1.36.76a6.52 6.52 0 0 0 0 1.7l-1.36.76a.5.5 0 0 0-.21.68l1.5 2.6a.5.5 0 0 0 .64.21l1.35-.78a6.4 6.4 0 0 0 1.46.85l.2 1.54a.5.5 0 0 0 .5.44h3a.5.5 0 0 0 .5-.44l.2-1.54a6.4 6.4 0 0 0 1.46-.85l1.35.78a.5.5 0 0 0 .64-.21l1.5-2.6a.5.5 0 0 0-.21-.68M12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5" /></svg>; }
function IconPost() { return <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>; }
function IconLogout() { return <svg viewBox="0 0 24 24"><path d="M16 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2h-2V5H5v14h9v-2z" /><path d="m14 13-6 .02V11h6V8l6 4z" /></svg>; }
function IconMenu() { return <svg viewBox="0 0 24 24"><path d="M4 7.5h16M4 12h16M4 16.5h16" /></svg>; }
function IconClose() { return <svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17" /></svg>; }
function IconChevron() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>; }
function IconCalendar() { return <svg viewBox="0 0 24 24"><path d="M7 3v2M17 3v2" /><path d="M4.5 8.5h15" /><path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></svg>; }
function IconBox() { return <svg viewBox="0 0 24 24"><path d="M3.5 7.5 12 3l8.5 4.5L12 12z" /><path d="M3.5 7.5V16.5L12 21l8.5-4.5V7.5" /><path d="M12 12v9" /></svg>; }
function IconTask() { return <svg viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3.7 7.7 1.4 1.4L6.4 15.8l-2.1-2.1 1.4-1.4 1.4 1.4 1.6-1.1Z" /></svg>; }
function IconVehicle() { return <svg viewBox="0 0 24 24"><path d="M5.4 8.2a3 3 0 0 1 2.8-2.2h7.6a3 3 0 0 1 2.8 2.2l.7 2.8A2.5 2.5 0 0 1 21 13.4V18a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1v-1H6.2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4.6A2.5 2.5 0 0 1 4.7 11z" /><circle cx="7.2" cy="14.4" r="1.2" /><circle cx="16.8" cy="14.4" r="1.2" /></svg>; }

export { SideBar };
export default SideBar;