import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import {
  fetchStaffAttendanceHistory,
  fetchStaffDashboard,
  fetchStaffNotifications,
  fetchStaffSchedule,
  fetchStaffStatistics,
  fetchStaffTodayTasks,
  markStaffNotificationAsRead,
  fetchStaffDashboardConfigs,
  fetchActiveStaffDashboardConfig,
  createStaffDashboardConfig,
  updateStaffDashboardConfig,
  deleteStaffDashboardConfig,
  activateStaffDashboardConfig,
} from '../../../services/staffDashboardService.js';
import { fetchManagedBookingsPaged, fetchBookingRequests } from '../../../services/bookingService.js';
import { fetchServiceTicketsPaged } from '../../../services/serviceTicketService.js';
import styles from './StaffDashboard.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || '';

const STAFF_ROLE = {
  ACCOUNTANT: 'ACCOUNTANT',
  ADVISOR: 'ADVISOR',
  RECEPTIONIST: 'RECEPTIONIST',
  TECHNICIAN: 'TECHNICIAN',
};

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRolesFromStorage = () => {
  try {
    const rawRoles = localStorage.getItem('staffRoles');
    if (rawRoles) {
      const parsedRoles = JSON.parse(rawRoles);
      if (Array.isArray(parsedRoles)) {
        const roles = parsedRoles
          .filter((role) => typeof role === 'string')
          .map(normalizeRoleName)
          .filter(Boolean);
        if (roles.length > 0) return roles;
      }
    }

    const rawProfile = localStorage.getItem('staffProfile');
    if (!rawProfile) return [];
    const profile = JSON.parse(rawProfile);
    return Array.isArray(profile?.role)
      ? profile.role.map(normalizeRoleName).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const roleLabel = (role) => {
  const map = {
    ACCOUNTANT: 'Kế toán',
    ADVISOR: 'Cố vấn viên',
    RECEPTIONIST: 'Lễ tân',
    TECHNICIAN: 'Kỹ thuật viên',
  };
  return map[role] || role || 'Nhân viên';
};

const resolvePrimaryRole = (roles) => {
  if (roles.includes(STAFF_ROLE.ACCOUNTANT)) return STAFF_ROLE.ACCOUNTANT;
  if (roles.includes(STAFF_ROLE.TECHNICIAN)) return STAFF_ROLE.TECHNICIAN;
  if (roles.includes(STAFF_ROLE.ADVISOR)) return STAFF_ROLE.ADVISOR;
  if (roles.includes(STAFF_ROLE.RECEPTIONIST)) return STAFF_ROLE.RECEPTIONIST;
  return roles[0] || '';
};

const roleTaskConfig = (role) => {
  if (role === STAFF_ROLE.TECHNICIAN) {
    return {
      eyebrow: 'Công việc kỹ thuật',
      title: 'Phiếu được giao hôm nay',
      route: '/technician/my-tasks',
      button: 'Mở task',
      empty: 'Chưa có phiếu kỹ thuật nào được giao hôm nay.',
      hint: 'Từ /api/staff/tasks/today',
    };
  }

  if (role === STAFF_ROLE.ADVISOR) {
    return {
      eyebrow: 'Điều phối dịch vụ',
      title: 'Phiếu cần cố vấn',
      route: '/advisor/inspection',
      button: 'Mở điều phối',
      empty: 'Các phiếu cần cố vấn nằm trong màn điều phối dịch vụ.',
      hint: 'Theo dõi phiếu dịch vụ',
    };
  }

  if (role === STAFF_ROLE.RECEPTIONIST) {
    return {
      eyebrow: 'Tiếp nhận',
      title: 'Việc lễ tân hôm nay',
      route: '/booking-management',
      button: 'Mở lịch hẹn',
      empty: 'Các việc lễ tân nằm ở yêu cầu đặt lịch, lịch hẹn và check-in.',
      hint: 'Yêu cầu, lịch hẹn, check-in',
    };
  }

  if (role === STAFF_ROLE.ACCOUNTANT) {
    return {
      eyebrow: 'Thanh toán',
      title: 'Phiếu cần theo dõi',
      route: '/service-ticket-management',
      button: 'Mở phiếu',
      empty: 'Các việc kế toán nằm ở phiếu dịch vụ, xác nhận hóa đơn và thanh toán.',
      hint: 'Phiếu, hóa đơn, thanh toán',
    };
  }

  return {
    eyebrow: 'Công việc',
    title: 'Công việc hôm nay',
    route: '/daily-schedule',
    button: 'Mở lịch',
    empty: 'Chưa có công việc nào cần hiển thị cho vai trò này.',
    hint: 'Dashboard cá nhân',
  };
};

const roleTicketStatConfig = (role) => {
  if (role === STAFF_ROLE.ACCOUNTANT) {
    return {
      label: 'Phiếu đã thanh toán',
      hint: 'Tổng phiếu trạng thái PAID',
    };
  }

  if (role === STAFF_ROLE.TECHNICIAN) {
    return {
      label: 'Phiếu sửa chữa hoàn tất',
      hint: 'Thống kê cá nhân trong tháng',
    };
  }

  if (role === STAFF_ROLE.ADVISOR) {
    return {
      label: 'Phiếu cố vấn hoàn tất',
      hint: 'Thống kê cá nhân trong tháng',
    };
  }

  if (role === STAFF_ROLE.RECEPTIONIST) {
    return {
      label: 'Phiếu tiếp nhận hoàn tất',
      hint: 'Thống kê cá nhân trong tháng',
    };
  }

  return {
    label: 'Phiếu hoàn tất',
    hint: 'Thống kê cá nhân trong tháng',
  };
};

const quickActionsByRole = (role) => {
  const common = [
    ['Chấm công', '/staff-attendance', 'clock'],
    ['Lịch làm việc', '/daily-schedule', 'calendar'],
    ['Hồ sơ cá nhân', '/staff-profile', 'user'],
  ];

  if (role === STAFF_ROLE.TECHNICIAN) {
    return [
      ['Công việc hôm nay', '/technician/my-tasks', 'check'],
      ['Điều phối phiếu', '/advisor/inspection', 'ticket'],
      ['Lịch sử công việc', '/work-history/technician', 'chart'],
      ...common,
    ];
  }

  if (role === STAFF_ROLE.ADVISOR) {
    return [
      ['Điều phối phiếu', '/advisor/inspection', 'ticket'],
      ['Phương tiện', '/vehicle-management', 'user'],
      ['Lịch làm việc', '/daily-schedule', 'calendar'],
      ['Chấm công', '/staff-attendance', 'clock'],
      ['Hồ sơ cá nhân', '/staff-profile', 'user'],
    ];
  }

  if (role === STAFF_ROLE.RECEPTIONIST) {
    return [
      ['Yêu cầu đặt lịch', '/booking-request-management', 'calendar'],
      ['Lịch hẹn', '/booking-management', 'ticket'],
      ['Tạo lịch hẹn', '/create-booking', 'check'],
      ['Check-in', '/check-in', 'check'],
      ['Khách hàng', '/customer-manager', 'user'],
      ['Hàng chờ', '/queue-management', 'calendar'],
      ...common,
    ];
  }

  if (role === STAFF_ROLE.ACCOUNTANT) {
    return [
      ['Phiếu dịch vụ', '/service-ticket-management', 'ticket'],
      ['Quản lý dịch vụ', '/service-management', 'chart'],
      ['Kho phụ tùng', '/warehouse-management', 'ticket'],
      ['Giá theo kho', '/warehouse-pricing', 'chart'],
      ...common,
    ];
  }

  return common;
};

const pad2 = (value) => String(value).padStart(2, '0');

const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateVi = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const formatDateTimeVi = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const dayOfWeekVi = (value) => {
  const map = {
    MONDAY: 'T2',
    TUESDAY: 'T3',
    WEDNESDAY: 'T4',
    THURSDAY: 'T5',
    FRIDAY: 'T6',
    SATURDAY: 'T7',
    SUNDAY: 'CN',
  };
  return map[value] || value || '—';
};

const statusText = (status) => {
  const map = {
    PRESENT: 'Có mặt',
    LATE: 'Đi muộn',
    EARLY_LEAVE: 'Về sớm',
    ABSENT: 'Vắng',
    NOT_CHECKED_IN: 'Chưa chấm',
    SCHEDULED: 'Đã xếp lịch',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã hủy',
    OFF: 'Nghỉ',
    DRAFT: 'Nháp',
    CREATED: 'Mới',
    PENDING: 'Chờ xử lý',
    IN_PROGRESS: 'Đang làm',
    COMPLETED: 'Hoàn tất',
  };
  return map[String(status || '').toUpperCase()] || status || '—';
};

const statusTone = (status) => {
  const value = String(status || '').toUpperCase();
  if (['PRESENT', 'CONFIRMED', 'COMPLETED'].includes(value)) return 'success';
  if (['LATE', 'PENDING', 'SCHEDULED', 'CREATED'].includes(value)) return 'warning';
  if (['ABSENT', 'CANCELLED'].includes(value)) return 'danger';
  if (['EARLY_LEAVE', 'IN_PROGRESS'].includes(value)) return 'info';
  return 'neutral';
};

const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = String(checkIn).split(':').map(Number);
  const [outH, outM] = String(checkOut).split(':').map(Number);
  if (Number.isNaN(inH) || Number.isNaN(outH)) return 0;
  return Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
};

const unwrapList = (response, fallback = []) =>
  Array.isArray(response?.data) ? response.data : fallback;

const unwrapPayload = (response) => response?.data?.data ?? response?.data ?? response;

const unwrapPageContent = (response, fallback = []) => {
  const payload = unwrapPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return fallback;
};

const unwrapObject = (response, fallback = null) =>
  response?.data && typeof response.data === 'object' ? response.data : fallback;

const unwrapPageTotal = (response) => {
  const page = response?.data;
  if (!page || typeof page !== 'object') return 0;
  return Number(page.totalElements ?? page.total_elements ?? 0) || 0;
};

const buildAttendancePie = (summary) => {
  const segments = [
    { label: 'Có mặt', value: summary.present, color: '#059669', tone: 'success' },
    { label: 'Đi muộn', value: summary.late, color: '#d97706', tone: 'warning' },
    { label: 'Về sớm', value: summary.early, color: '#0891b2', tone: 'info' },
    { label: 'Vắng', value: summary.absent, color: '#dc2626', tone: 'danger' },
  ];
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = total > 0
    ? segments
      .filter((item) => item.value > 0)
      .map((item) => {
        const start = cursor;
        const end = cursor + (item.value / total) * 100;
        cursor = end;
        return `${item.color} ${start}% ${end}%`;
      })
      .join(', ')
    : '#e5e7eb 0% 100%';

  return { segments, total, gradient };
};

const getBookingCode = (booking) => String(
  booking?.bookingCode
    ?? booking?.booking_code
    ?? booking?.code
    ?? '',
).trim();

const formatBookingTime = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return raw;
};

const mapBookingToReceptionistTask = (booking) => {
  const bookingCode = getBookingCode(booking);
  const time = formatBookingTime(booking?.scheduledTime);
  const customer = booking?.customer ?? {};
  const customerName = String(
    customer?.fullName
      ?? booking?.customerName
      ?? booking?.fullName
      ?? booking?.name
      ?? '',
  ).trim();
  const customerPhone = String(customer?.phone ?? booking?.customerPhone ?? booking?.phone ?? '').trim();

  return {
    bookingId: booking?.bookingId ?? booking?.id ?? bookingCode,
    ticketCode: bookingCode || 'Lịch hẹn',
    customerName: customerName || 'Khách hàng',
    licensePlate: [time, customerPhone].filter(Boolean).join(' • ') || 'Lịch hẹn hôm nay',
    ticketStatus: booking?.status || booking?.bookingStatus || 'CONFIRMED',
    route: bookingCode
      ? `/booking-management/${encodeURIComponent(bookingCode)}`
      : '/booking-management',
  };
};

const mergeTasksByCode = (...lists) => {
  const seen = new Set();
  return lists.flatMap((list) => (Array.isArray(list) ? list : [])).filter((item, index) => {
    const key = String(
      item?.bookingId
        ?? item?.serviceTicketId
        ?? item?.ticketCode
        ?? item?.serviceTicketCode
        ?? index,
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function Icon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z" />
        <path d="M13 5v14" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-7" />
      </>
    ),
    user: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    check: (
      <>
        <path d="M20 6 9 17l-5-5" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
        <path d="M3 21v-5h5" />
        <path d="M3 12A9 9 0 0 1 18.5 5.8L21 8" />
        <path d="M21 3v5h-5" />
      </>
    ),
    arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  };

  return <svg {...common}>{paths[name] || paths.chart}</svg>;
}

const DEFAULT_STATS = [
  { id: 'statPendingToday', label: 'Booking chưa xử lý hôm nay', hint: 'Yêu cầu chờ duyệt hôm nay', icon: 'clock', tone: 'Red', visible: true },
  { id: 'statPendingTotal', label: 'Booking chưa xác nhận', hint: 'Tổng yêu cầu đặt lịch chờ duyệt', icon: 'ticket', tone: 'Yellow', visible: true },
  { id: 'statShift', label: 'Ca hôm nay', hint: '', icon: 'clock', tone: 'Blue', visible: true },
  { id: 'statHours', label: 'Giờ làm', hint: '', icon: 'chart', tone: 'Green', visible: true },
  { id: 'statTickets', label: 'Phiếu hoàn tất', hint: '', icon: 'ticket', tone: 'Yellow', visible: true },
  { id: 'statDays', label: 'Ngày đi làm', hint: '', icon: 'calendar', tone: 'Cyan', visible: true },
  { id: 'statNotifications', label: 'Thông báo chưa đọc', hint: '', icon: 'bell', tone: 'Red', visible: true },
  { id: 'statTasks', label: 'Công việc hôm nay', hint: '', icon: 'check', tone: 'Violet', visible: true }
];

const DEFAULT_PANELS = [
  { id: 'schedule', title: 'Lịch làm việc', eyebrow: 'Lịch làm việc', size: 'half', visible: true },
  { id: 'tasks', title: 'Công việc hôm nay', eyebrow: 'Công việc', size: 'half', visible: true },
  { id: 'attendanceChart', title: 'Giờ làm 7 ngày gần nhất', eyebrow: 'Chấm công', size: 'half', visible: true },
  { id: 'attendancePie', title: 'Trạng thái tháng này', eyebrow: 'Tỷ lệ', size: 'half', visible: true },
  { id: 'notifications', title: 'Thông báo gần đây', eyebrow: 'Thông báo', size: 'full', visible: true },
  { id: 'attendanceHistory', title: 'Lịch sử tháng', eyebrow: 'Chấm công', size: 'full', visible: true },
  { id: 'quickActions', title: 'Lối tắt thao tác nhanh', eyebrow: 'Thao tác nhanh', size: 'full', visible: true }
];

export default function StaffDashboard() {
  useScrollToTop();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const monthKey = `${currentYear}-${pad2(currentMonth)}`;
  const scheduleFrom = toIsoDate(today);
  const scheduleTo = toIsoDate(addDays(today, 6));
  const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
  const primaryRole = useMemo(() => resolvePrimaryRole(staffRoles), [staffRoles]);
  const taskConfig = useMemo(() => roleTaskConfig(primaryRole), [primaryRole]);
  const quickActions = useMemo(() => quickActionsByRole(primaryRole), [primaryRole]);
  const ticketStatConfig = useMemo(() => roleTicketStatConfig(primaryRole), [primaryRole]);
  const roleNames = staffRoles.length > 0
    ? staffRoles.map(roleLabel).join(', ')
    : 'Nhân viên';

  const hasBookingPermission = useMemo(() => {
    return staffRoles.some((role) => ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(role));
  }, [staffRoles]);

  const [dashboard, setDashboard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [accountantPaidCount, setAccountantPaidCount] = useState(0);
  const [pendingTodayCount, setPendingTodayCount] = useState(0);
  const [pendingTotalCount, setPendingTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState(null);

  // Layout configurations states
  const [configs, setConfigs] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [activeConfigId, setActiveConfigId] = useState(null);
  const [statsList, setStatsList] = useState([]);
  const [panelsList, setPanelsList] = useState([]);

  // Drag states
  const [draggedStatIndex, setDraggedStatIndex] = useState(null);
  const [draggedPanelIndex, setDraggedPanelIndex] = useState(null);

  // Widget manager & Modals states
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');

  // 1. Fetch layouts from DB
  const loadDashboardConfigs = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetchStaffDashboardConfigs(token);
      const list = Array.isArray(res?.data) ? res.data : [];
      setConfigs(list);

      // Find active config
      const active = list.find((c) => c.isActive);
      if (active) {
        setActiveConfig(active);
        setActiveConfigId(active.id);
        applyLayout(active.layoutConfig);
      } else if (list.length > 0) {
        // No active but configs exist, activate first
        const first = list[0];
        await handleActivateConfig(first.id);
      } else {
        // No configs in DB, init default
        await initDefaultConfig(token);
      }
    } catch (err) {
      console.error('Không tải được cấu hình dashboard:', err);
    }
  }, []);

  const initDefaultConfig = async (token) => {
    const initialLayout = {
      stats: DEFAULT_STATS.map((s) => ({ id: s.id, visible: true })),
      panels: DEFAULT_PANELS.map((p) => ({ id: p.id, size: p.size, visible: true })),
    };

    const payload = {
      dashboardName: 'Mặc định',
      layoutConfig: JSON.stringify(initialLayout),
      isActive: true,
    };

    try {
      const res = await createStaffDashboardConfig(payload, token);
      if (res?.data) {
        setConfigs([res.data]);
        setActiveConfig(res.data);
        setActiveConfigId(res.data.id);
        applyLayout(res.data.layoutConfig);
      }
    } catch (err) {
      console.error('Không thể khởi tạo cấu hình mặc định:', err);
    }
  };

  const applyLayout = (layoutConfigStr) => {
    try {
      const layout = JSON.parse(layoutConfigStr);
      
      // Merge stats config
      const dbStats = Array.isArray(layout?.stats) ? layout.stats : [];
      const dbStatIds = dbStats.map((s) => s.id);
      const mergedStats = [];
      dbStats.forEach((dbS) => {
        const found = DEFAULT_STATS.find((s) => s.id === dbS.id);
        if (found) {
          mergedStats.push({ ...found, visible: dbS.visible !== false });
        }
      });
      DEFAULT_STATS.forEach((defS) => {
        if (!dbStatIds.includes(defS.id)) {
          mergedStats.push(defS);
        }
      });
      setStatsList(mergedStats);

      // Merge panels config
      const dbPanels = Array.isArray(layout?.panels) ? layout.panels : [];
      const dbPanelIds = dbPanels.map((p) => p.id);
      const mergedPanels = [];
      dbPanels.forEach((dbP) => {
        const found = DEFAULT_PANELS.find((p) => p.id === dbP.id);
        if (found) {
          mergedPanels.push({
            ...found,
            size: dbP.size || 'half',
            visible: dbP.visible !== false,
          });
        }
      });
      DEFAULT_PANELS.forEach((defP) => {
        if (!dbPanelIds.includes(defP.id)) {
          mergedPanels.push(defP);
        }
      });
      setPanelsList(mergedPanels);
    } catch (e) {
      console.error('Lỗi khi áp dụng layout:', e);
      setStatsList(DEFAULT_STATS);
      setPanelsList(DEFAULT_PANELS);
    }
  };

  const saveLayoutToDb = async (updatedStats = statsList, updatedPanels = panelsList) => {
    if (!activeConfig || !activeConfig.id) return;
    const token = getAuthToken();
    if (!token) return;

    const layout = {
      stats: updatedStats.map((s) => ({ id: s.id, visible: s.visible })),
      panels: updatedPanels.map((p) => ({ id: p.id, size: p.size, visible: p.visible })),
    };

    const payload = {
      dashboardName: activeConfig.dashboardName,
      layoutConfig: JSON.stringify(layout),
      isActive: true,
    };

    try {
      const res = await updateStaffDashboardConfig(activeConfig.id, payload, token);
      if (res?.data) {
        setActiveConfig(res.data);
        setConfigs((prev) => prev.map((c) => (c.id === res.data.id ? res.data : c)));
      }
    } catch (err) {
      console.error('Lỗi lưu bố cục lên database:', err);
    }
  };

  // 2. Load dashboard general data
  const loadDashboard = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để xem dashboard.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [
      overviewResult,
      statsResult,
      attendanceResult,
      scheduleResult,
      notificationsResult,
      tasksResult,
      paidTicketsResult,
      receptionistBookingsResult,
      pendingTodayResult,
      pendingTotalResult,
    ] = await Promise.allSettled([
      fetchStaffDashboard(token),
      fetchStaffStatistics(currentMonth, currentYear, token),
      fetchStaffAttendanceHistory(currentMonth, currentYear, token),
      fetchStaffSchedule(scheduleFrom, scheduleTo, token),
      fetchStaffNotifications(token),
      fetchStaffTodayTasks(token),
      primaryRole === STAFF_ROLE.ACCOUNTANT
        ? fetchServiceTicketsPaged({ page: 0, size: 1, status: 'PAID' }, token)
        : Promise.resolve(null),
      primaryRole === STAFF_ROLE.RECEPTIONIST
        ? fetchManagedBookingsPaged({ page: 0, size: 10, date: scheduleFrom }, token)
        : Promise.resolve(null),
      hasBookingPermission
        ? fetchBookingRequests({ date: scheduleFrom, status: 'PENDING', page: 0, size: 1 }, token)
        : Promise.resolve(null),
      hasBookingPermission
        ? fetchBookingRequests({ status: 'PENDING', page: 0, size: 1 }, token)
        : Promise.resolve(null),
    ]);

    const overview = overviewResult.status === 'fulfilled'
      ? unwrapObject(overviewResult.value)
      : null;

    setDashboard(overview);
    setStatistics(statsResult.status === 'fulfilled' ? unwrapObject(statsResult.value) : null);
    setAttendance(
      attendanceResult.status === 'fulfilled'
        ? unwrapList(attendanceResult.value, overview?.recentAttendance || [])
        : overview?.recentAttendance || [],
    );
    setSchedule(
      scheduleResult.status === 'fulfilled'
        ? unwrapList(scheduleResult.value, overview?.upcomingSchedule || [])
        : overview?.upcomingSchedule || [],
    );
    setNotifications(
      notificationsResult.status === 'fulfilled'
        ? unwrapList(notificationsResult.value, overview?.notifications || [])
        : overview?.notifications || [],
    );
    const apiTasks = tasksResult.status === 'fulfilled'
      ? unwrapList(tasksResult.value, overview?.todayTasks || [])
      : overview?.todayTasks || [];
    const receptionistBookingTasks = primaryRole === STAFF_ROLE.RECEPTIONIST && receptionistBookingsResult.status === 'fulfilled'
      ? unwrapPageContent(receptionistBookingsResult.value).map(mapBookingToReceptionistTask)
      : [];
    setTasks(primaryRole === STAFF_ROLE.RECEPTIONIST
      ? mergeTasksByCode(receptionistBookingTasks, apiTasks)
      : apiTasks);
    setAccountantPaidCount(
      paidTicketsResult.status === 'fulfilled' && paidTicketsResult.value
        ? unwrapPageTotal(paidTicketsResult.value)
        : 0
    );
    setPendingTodayCount(
      pendingTodayResult.status === 'fulfilled' && pendingTodayResult.value
        ? unwrapPageTotal(pendingTodayResult.value)
        : 0
    );
    setPendingTotalCount(
      pendingTotalResult.status === 'fulfilled' && pendingTotalResult.value
        ? unwrapPageTotal(pendingTotalResult.value)
        : 0
    );

    const criticalFailed = [
      overviewResult,
      statsResult,
      attendanceResult,
      scheduleResult,
      notificationsResult,
      tasksResult,
    ].filter((result) => result.status === 'rejected').length;

    if (criticalFailed > 0) {
      setError(`Có ${criticalFailed} nguồn dữ liệu chính chưa tải được. Các phần khác vẫn hiển thị.`);
    }

    setLoading(false);
  }, [currentMonth, currentYear, primaryRole, scheduleFrom, scheduleTo, hasBookingPermission]);

  useEffect(() => {
    loadDashboardConfigs();
    loadDashboard();
  }, [loadDashboardConfigs, loadDashboard]);

  // General values
  const staff = dashboard?.staff || {};
  const todayShift = dashboard?.todayShift || {};
  const totalHours = statistics?.totalHours ?? dashboard?.monthlyHours?.totalHours ?? 0;
  const completedTickets = statistics?.completedTickets ?? dashboard?.completedServices?.count ?? 0;
  const roleTicketCount = primaryRole === STAFF_ROLE.ACCOUNTANT ? accountantPaidCount : completedTickets;
  const unreadCount = notifications.filter((item) => item && !item.isRead).length;
  const presentDays = attendance.filter((item) => ['PRESENT', 'LATE'].includes(item?.status)).length;
  const recentAttendance = attendance.length > 0
    ? [...attendance].slice(-7)
    : dashboard?.recentAttendance || [];

  const attendanceSummary = {
    present: attendance.filter((item) => item?.status === 'PRESENT').length,
    late: attendance.filter((item) => item?.status === 'LATE').length,
    early: attendance.filter((item) => item?.status === 'EARLY_LEAVE').length,
    absent: attendance.filter((item) => item?.status === 'ABSENT').length,
  };

  const getStatValue = (id) => {
    if (id === 'statPendingToday') return loading ? '...' : (hasBookingPermission ? pendingTodayCount : 'N/A');
    if (id === 'statPendingTotal') return loading ? '...' : (hasBookingPermission ? pendingTotalCount : 'N/A');
    if (id === 'statShift') return loading ? '...' : todayShift.shiftName || 'Chưa có ca';
    if (id === 'statHours') return loading ? '...' : `${Number(totalHours || 0).toFixed(1)}h`;
    if (id === 'statTickets') return loading ? '...' : roleTicketCount;
    if (id === 'statDays') return loading ? '...' : `${presentDays}/${attendance.length}`;
    if (id === 'statNotifications') return loading ? '...' : unreadCount;
    if (id === 'statTasks') return loading ? '...' : tasks.length;
    return '—';
  };

  const getStatHint = (id) => {
    if (id === 'statPendingToday') return 'Yêu cầu chờ duyệt hôm nay';
    if (id === 'statPendingTotal') return 'Tổng yêu cầu đặt lịch chờ duyệt';
    if (id === 'statShift') return todayShift.startTime && todayShift.endTime
      ? `${todayShift.startTime} - ${todayShift.endTime}`
      : statusText(todayShift.status);
    if (id === 'statHours') return statistics?.month || dashboard?.monthlyHours?.month || monthKey;
    if (id === 'statTickets') return primaryRole === STAFF_ROLE.ACCOUNTANT
      ? ticketStatConfig.hint
      : `${ticketStatConfig.hint} ${statistics?.month || dashboard?.completedServices?.month || monthKey}`;
    if (id === 'statDays') return `Tháng ${currentMonth}/${currentYear}`;
    if (id === 'statNotifications') return `Tổng ${notifications.length} thông báo`;
    if (id === 'statTasks') return taskConfig.hint;
    return '';
  };

  const handleMarkRead = async (notificationId) => {
    const token = getAuthToken();
    if (!token || !notificationId) return;

    setMarkingId(notificationId);
    try {
      await markStaffNotificationAsRead(notificationId, token);
      setNotifications((items) =>
        items.map((item) =>
          item?.notificationId === notificationId ? { ...item, isRead: true } : item,
        ),
      );
    } catch (err) {
      setError(err?.message || 'Không đánh dấu được thông báo đã đọc.');
    } finally {
      setMarkingId(null);
    }
  };

  // 3. Multi-dashboard management operations
  const handleActivateConfig = async (id) => {
    const token = getAuthToken();
    if (!token || !id) return;
    try {
      const res = await activateStaffDashboardConfig(id, token);
      if (res?.data) {
        setActiveConfig(res.data);
        setActiveConfigId(res.data.id);
        applyLayout(res.data.layoutConfig);
        setConfigs((prev) =>
          prev.map((c) => ({ ...c, isActive: c.id === res.data.id }))
        );
      }
    } catch (err) {
      console.error('Không hoạt động được layout:', err);
    }
  };

  const handleCreateConfig = async () => {
    const token = getAuthToken();
    const name = newDashboardName.trim();
    if (!token || !name) return;

    const initialLayout = {
      stats: DEFAULT_STATS.map((s) => ({ id: s.id, visible: true })),
      panels: DEFAULT_PANELS.map((p) => ({ id: p.id, size: p.size, visible: true })),
    };

    const payload = {
      dashboardName: name,
      layoutConfig: JSON.stringify(initialLayout),
      isActive: true,
    };

    try {
      const res = await createStaffDashboardConfig(payload, token);
      if (res?.data) {
        setConfigs((prev) => [...prev.map((c) => ({ ...c, isActive: false })), res.data]);
        setActiveConfig(res.data);
        setActiveConfigId(res.data.id);
        applyLayout(res.data.layoutConfig);
        setShowCreateModal(false);
        setNewDashboardName('');
      }
    } catch (err) {
      console.error('Không thể tạo dashboard mới:', err);
    }
  };

  const handleRenameConfig = async () => {
    const token = getAuthToken();
    const name = newDashboardName.trim();
    if (!token || !name || !activeConfig) return;

    const payload = {
      dashboardName: name,
      layoutConfig: activeConfig.layoutConfig,
      isActive: true,
    };

    try {
      const res = await updateStaffDashboardConfig(activeConfig.id, payload, token);
      if (res?.data) {
        setConfigs((prev) =>
          prev.map((c) => (c.id === res.data.id ? res.data : c))
        );
        setActiveConfig(res.data);
        setShowRenameModal(false);
        setNewDashboardName('');
      }
    } catch (err) {
      console.error('Không thể đổi tên dashboard:', err);
    }
  };

  const handleDeleteConfig = async () => {
    const token = getAuthToken();
    if (!token || !activeConfig) return;

    if (window.confirm(`Bạn có chắc chắn muốn xóa dashboard "${activeConfig.dashboardName}"?`)) {
      try {
        await deleteStaffDashboardConfig(activeConfig.id, token);
        const remaining = configs.filter((c) => c.id !== activeConfig.id);
        setConfigs(remaining);

        if (remaining.length > 0) {
          const first = remaining[0];
          handleActivateConfig(first.id);
        } else {
          // If all deleted, reinitialize Default
          initDefaultConfig(token);
        }
      } catch (err) {
        console.error('Không thể xóa dashboard:', err);
      }
    }
  };

  const handleResetLayout = () => {
    if (window.confirm('Khôi phục bố cục và kích thước mặc định cho dashboard hiện tại?')) {
      const resetStats = DEFAULT_STATS.map((s) => ({ ...s, visible: true }));
      const resetPanels = DEFAULT_PANELS.map((p) => ({ ...p, size: p.size, visible: true }));
      setStatsList(resetStats);
      setPanelsList(resetPanels);
      saveLayoutToDb(resetStats, resetPanels);
    }
  };

  // 4. Widget customizers
  const toggleWidgetSize = (id) => {
    const next = panelsList.map((p) =>
      p.id === id ? { ...p, size: p.size === 'full' ? 'half' : 'full' } : p
    );
    setPanelsList(next);
    saveLayoutToDb(statsList, next);
  };

  const toggleWidgetVisibility = (id) => {
    const isPanel = panelsList.some((p) => p.id === id);
    if (isPanel) {
      const next = panelsList.map((p) =>
        p.id === id ? { ...p, visible: !p.visible } : p
      );
      setPanelsList(next);
      saveLayoutToDb(statsList, next);
    } else {
      const next = statsList.map((s) =>
        s.id === id ? { ...s, visible: !s.visible } : s
      );
      setStatsList(next);
      saveLayoutToDb(next, panelsList);
    }
  };

  // Drag & drop handlers
  const handleStatDragStart = (e, index) => {
    setDraggedStatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStatDragOver = (e, index) => {
    e.preventDefault();
    if (draggedStatIndex === null || draggedStatIndex === index) return;
    setStatsList((prev) => {
      const next = [...prev];
      const temp = next[draggedStatIndex];
      next[draggedStatIndex] = next[index];
      next[index] = temp;
      return next;
    });
    setDraggedStatIndex(index);
  };

  const handleStatDragEnd = () => {
    setDraggedStatIndex(null);
    saveLayoutToDb();
  };

  const handlePanelDragStart = (e, index) => {
    setDraggedPanelIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePanelDragOver = (e, index) => {
    e.preventDefault();
    if (draggedPanelIndex === null || draggedPanelIndex === index) return;
    setPanelsList((prev) => {
      const next = [...prev];
      const temp = next[draggedPanelIndex];
      next[draggedPanelIndex] = next[index];
      next[index] = temp;
      return next;
    });
    setDraggedPanelIndex(index);
  };

  const handlePanelDragEnd = () => {
    setDraggedPanelIndex(null);
    saveLayoutToDb();
  };

  return (
    <div className={styles.container}>
      {/* 1. HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.avatar}>
            <img
              src={getAvatarSrc(staff.avatar || staff.avatarUrl)}
              alt={staff.fullName || 'Avatar'}
              onError={handleAvatarError}
            />
          </div>
          <div>
            <p className={styles.eyebrow}>Staff dashboard</p>
            <h1>Xin chào, {staff.fullName || 'Nhân viên'}</h1>
            <p className={styles.heroText}>
              Bố cục tùy biến kéo thả dành cho {roleLabel(primaryRole).toLowerCase()}. Di chuyển vị trí hoặc phóng to/thu nhỏ các widget theo nhu cầu của bạn.
            </p>
            <div className={styles.roleChips}>
              {staffRoles.length === 0 ? (
                <span>{roleNames}</span>
              ) : staffRoles.map((role) => (
                <span key={role}>{roleLabel(role)}</span>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.heroAside}>
          <div className={styles.todayChip}>
            <Icon name="calendar" /> {today.toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
          <button type="button" className={styles.refreshButton} onClick={loadDashboard}>
            <Icon name="refresh" /> Tải lại dữ liệu
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* 2. DASHBOARD SELECTIONS & WIDGET CONFIG */}
      <div className={styles.configControlsRow}>
        <div className={styles.configControlsGroup}>
          <span className={styles.configControlsLabel}>Chọn Dashboard:</span>
          <select
            value={activeConfigId || ''}
            onChange={(e) => handleActivateConfig(Number(e.target.value))}
            className={styles.dashboardSelect}
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.dashboardName} {c.isActive ? '★' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => {
              setNewDashboardName('');
              setShowCreateModal(true);
            }}
          >
            + Tạo mới
          </button>

          {activeConfig && activeConfig.dashboardName !== 'Mặc định' && (
            <>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => {
                  setNewDashboardName(activeConfig.dashboardName);
                  setShowRenameModal(true);
                }}
              >
                Đổi tên
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                onClick={handleDeleteConfig}
              >
                Xóa
              </button>
            </>
          )}
        </div>

        <div className={styles.configControlsActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setShowWidgetManager(!showWidgetManager)}
          >
            ⚙ Quản lý Widget ({statsList.filter(s => s.visible).length + panelsList.filter(p => p.visible).length} đang hiện)
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.neutralBtn}`}
            onClick={handleResetLayout}
          >
            Đặt lại bố cục
          </button>
        </div>
      </div>

      {/* Widget Manager List */}
      {showWidgetManager && (
        <div className={styles.widgetManagerPanel}>
          <h3>Bật/Tắt Widget hiển thị</h3>
          <div className={styles.managerSection}>
            <h4>Thẻ chỉ số (Stat Cards)</h4>
            <div className={styles.managerList}>
              {statsList.map((s) => (
                <label key={s.id} className={styles.managerItem}>
                  <input
                    type="checkbox"
                    checked={s.visible}
                    onChange={() => toggleWidgetVisibility(s.id)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.managerSection}>
            <h4>Bảng dữ liệu (Panels)</h4>
            <div className={styles.managerList}>
              {panelsList.map((p) => (
                <label key={p.id} className={styles.managerItem}>
                  <input
                    type="checkbox"
                    checked={p.visible}
                    onChange={() => toggleWidgetVisibility(p.id)}
                  />
                  <span>{p.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. STAT CARDS DRAGGABLE GRID */}
      <section className={styles.statGrid} aria-label="Tổng quan chỉ số">
        {statsList
          .filter((s) => s.visible)
          .map((s, index) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => handleStatDragStart(e, index)}
              onDragOver={(e) => handleStatDragOver(e, index)}
              onDragEnd={handleStatDragEnd}
              className={`${styles.statCardWrapper} ${
                draggedStatIndex === index ? styles.isDragging : ''
              }`}
            >
              <div className={styles.dragGripIconStat}>⠿</div>
              <button
                type="button"
                className={styles.hideWidgetBtnStat}
                onClick={() => toggleWidgetVisibility(s.id)}
                title="Ẩn chỉ số"
              >
                ×
              </button>
              <div className={`${styles.statCard} ${styles[`tone${s.tone}`]}`}>
                <div className={styles.statIcon}>
                  <Icon name={s.icon} />
                </div>
                <div>
                  <div className={styles.statValue}>{getStatValue(s.id)}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                  <div className={styles.statHint}>{getStatHint(s.id)}</div>
                </div>
              </div>
            </div>
          ))}
      </section>

      {/* 4. DRAGGABLE PANELS FLEX/GRID CONTAINER */}
      <section className={styles.widgetsContainer}>
        {panelsList
          .filter((p) => p.visible)
          .map((p, index) => {
            const isFull = p.size === 'full';
            const itemClass = `${styles.panelWrapper} ${
              isFull ? styles.widgetFullWidth : styles.widgetHalfWidth
            } ${draggedPanelIndex === index ? styles.isDragging : ''}`;

            return (
              <div
                key={p.id}
                draggable
                onDragOver={(e) => handlePanelDragOver(e, index)}
                onDragEnd={handlePanelDragEnd}
                className={itemClass}
              >
                <div className={styles.panelHeaderBar}>
                  <div
                    className={styles.dragGripHeader}
                    draggable
                    onDragStart={(e) => handlePanelDragStart(e, index)}
                  >
                    ⠿ Kéo để di chuyển
                  </div>
                  <div className={styles.panelControls}>
                    <button
                      type="button"
                      className={styles.controlBtn}
                      onClick={() => toggleWidgetSize(p.id)}
                      title={isFull ? 'Thu nhỏ còn 1/2' : 'Phóng to toàn màn hình'}
                    >
                      {isFull ? '⛶ Thu nhỏ' : '⛶ Phóng to'}
                    </button>
                    <button
                      type="button"
                      className={styles.controlBtn}
                      onClick={() => toggleWidgetVisibility(p.id)}
                      title="Ẩn bảng này"
                    >
                      ✕ Ẩn
                    </button>
                  </div>
                </div>

                <div className={styles.panel}>
                  {/* --- Panel Header Content --- */}
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.eyebrow}>{p.eyebrow}</p>
                      <h2>{p.title}</h2>
                    </div>
                    {p.id === 'schedule' && (
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => navigate('/daily-schedule')}
                      >
                        Xem tất cả <Icon name="arrow" />
                      </button>
                    )}
                    {p.id === 'tasks' && (
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => navigate(taskConfig.route)}
                      >
                        {taskConfig.button} <Icon name="arrow" />
                      </button>
                    )}
                    {p.id === 'attendanceHistory' && (
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => navigate('/staff-attendance')}
                      >
                        Xem tất cả <Icon name="arrow" />
                      </button>
                    )}
                  </div>

                  {/* --- Panel Body Content --- */}
                  {p.id === 'schedule' && (
                    <div className={styles.scheduleList}>
                      {loading ? (
                        <div className={styles.emptyState}>Đang tải lịch làm việc...</div>
                      ) : schedule.length === 0 ? (
                        <div className={styles.emptyState}>Chưa có lịch làm việc trong 7 ngày tới.</div>
                      ) : (
                        schedule.slice(0, 7).map((item) => (
                          <div key={item.date} className={styles.scheduleItem}>
                            <div className={styles.scheduleDate}>
                              <strong>{formatDateVi(item.date)}</strong>
                              <span>{dayOfWeekVi(item.dayOfWeek)}</span>
                            </div>
                            <div className={styles.scheduleBody}>
                              <strong>{item.shiftName || 'Chưa có ca'}</strong>
                              <span>
                                {item.startTime && item.endTime
                                  ? `${item.startTime} - ${item.endTime}`
                                  : '—'}
                              </span>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {p.id === 'tasks' && (
                    <div className={styles.taskList}>
                      {loading ? (
                        <div className={styles.emptyState}>Đang tải công việc...</div>
                      ) : tasks.length === 0 ? (
                        <div className={styles.emptyState}>{taskConfig.empty}</div>
                      ) : (
                        tasks.slice(0, 5).map((task) => (
                          <button
                            type="button"
                            key={task.bookingId || task.serviceTicketId || task.ticketCode}
                            className={styles.taskItem}
                            onClick={() => navigate(task.route || taskConfig.route)}
                          >
                            <span className={styles.taskCode}>
                              {task.ticketCode || task.serviceTicketCode || 'Phiếu'}
                            </span>
                            <span className={styles.taskInfo}>
                              <strong>{task.customerName || 'Khách hàng'}</strong>
                              <small>
                                {task.licensePlate ||
                                  task.vehicleBrand ||
                                  task.vehicleModel ||
                                  'Chưa có thông tin xe'}
                              </small>
                            </span>
                            <StatusBadge status={task.ticketStatus || task.status} />
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {p.id === 'attendanceChart' && (
                    <div className={styles.barChart}>
                      {recentAttendance.length === 0 ? (
                        <div className={styles.emptyState}>Chưa có dữ liệu chấm công.</div>
                      ) : (
                        recentAttendance.map((item) => {
                          const hours = calcHours(item.checkInTime, item.checkOutTime);
                          return (
                            <div key={item.date} className={styles.barColumn}>
                              <span>{hours.toFixed(1)}h</span>
                              <div className={styles.barTrack}>
                                <div
                                  className={styles.barFill}
                                  style={{ height: `${Math.min(100, (hours / 10) * 100)}%` }}
                                />
                              </div>
                              <strong>{dayOfWeekVi(item.dayOfWeek)}</strong>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {p.id === 'attendancePie' && (
                    <AttendancePieChart summary={attendanceSummary} />
                  )}

                  {p.id === 'notifications' && (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Tiêu đề</th>
                            <th>Nội dung</th>
                            <th>Thời gian</th>
                            <th>Trạng thái</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.length === 0 ? (
                            <tr>
                              <td colSpan="5" className={styles.tableEmpty}>
                                Không có thông báo.
                              </td>
                            </tr>
                          ) : (
                            notifications.map((item) => (
                              <tr key={item.notificationId}>
                                <td>
                                  <strong>{item.title || 'Thông báo'}</strong>
                                </td>
                                <td>{item.message || '—'}</td>
                                <td>{formatDateTimeVi(item.sentAt)}</td>
                                <td>
                                  <span
                                    className={`${styles.statusBadge} ${
                                      item.isRead ? styles.statussuccess : styles.statuswarning
                                    }`}
                                  >
                                    {item.isRead ? 'Đã đọc' : 'Chưa đọc'}
                                  </span>
                                </td>
                                <td className={styles.actionCell}>
                                  {!item.isRead && (
                                    <button
                                      type="button"
                                      className={styles.smallButton}
                                      disabled={markingId === item.notificationId}
                                      onClick={() => handleMarkRead(item.notificationId)}
                                    >
                                      {markingId === item.notificationId ? 'Đang lưu' : 'Đã đọc'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {p.id === 'attendanceHistory' && (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Ngày</th>
                            <th>Thứ</th>
                            <th>Ca làm</th>
                            <th>Giờ vào</th>
                            <th>Giờ ra</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.length === 0 ? (
                            <tr>
                              <td colSpan="6" className={styles.tableEmpty}>
                                Chưa có dữ liệu chấm công.
                              </td>
                            </tr>
                          ) : (
                            attendance.map((item) => (
                              <tr key={`${item.date}-${item.shiftType || ''}`}>
                                <td>
                                  <strong>{item.date}</strong>
                                </td>
                                <td>{dayOfWeekVi(item.dayOfWeek)}</td>
                                <td>{item.shiftType || '—'}</td>
                                <td>{item.checkInTime || '—'}</td>
                                <td>{item.checkOutTime || '—'}</td>
                                <td>
                                  <StatusBadge status={item.status} />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {p.id === 'quickActions' && (
                    <section className={styles.quickActions}>
                      {quickActions.map(([label, path, icon]) => (
                        <button
                          type="button"
                          key={path}
                          className={styles.quickAction}
                          onClick={() => navigate(path)}
                        >
                          <span>
                            <Icon name={icon} />
                          </span>
                          <strong>{label}</strong>
                        </button>
                      ))}
                    </section>
                  )}
                </div>
              </div>
            );
          })}
      </section>

      {/* 5. OVERLAY MODALS FOR MULTI-DASHBOARD MANAGEMENT */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Tạo Dashboard mới</h3>
            <p>Nhập tên cấu hình để lưu trữ bố cục kéo thả của bạn.</p>
            <input
              type="text"
              placeholder="VD: Lễ tân, Việc cá nhân..."
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              className={styles.modalInput}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowCreateModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                disabled={!newDashboardName.trim()}
                onClick={handleCreateConfig}
              >
                Tạo Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Đổi tên Dashboard</h3>
            <input
              type="text"
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              className={styles.modalInput}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowRenameModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                disabled={!newDashboardName.trim()}
                onClick={handleRenameConfig}
              >
                Đổi tên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${statusTone(status)}`]}`}>
      {statusText(status)}
    </span>
  );
}

function AttendancePieChart({ summary }) {
  const pie = useMemo(() => buildAttendancePie(summary), [summary]);

  return (
    <div className={styles.pieWrap}>
      <div className={styles.pieChart} style={{ background: `conic-gradient(${pie.gradient})` }}>
        <div className={styles.pieCenter}>
          <strong>{pie.total}</strong>
          <span>ngày</span>
        </div>
      </div>
      <div className={styles.pieLegend}>
        {pie.segments.map((item) => {
          const percent = pie.total > 0 ? Math.round((item.value / pie.total) * 100) : 0;
          return (
            <div key={item.label} className={styles.pieLegendItem}>
              <span className={`${styles.pieDot} ${styles[`pie${item.tone}`]}`} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <em>{percent}%</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}
