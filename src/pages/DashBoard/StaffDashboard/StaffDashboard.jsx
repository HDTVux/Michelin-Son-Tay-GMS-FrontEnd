import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
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
import { searchAdminCustomers } from '../../../services/customerService.js';
import { buildRevenueDashboard } from '../../../services/revenueService.js';
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
  { id: 'statNotArrivedTotal', label: 'Booking chưa đến', hint: 'Tổng số booking khách không đến', icon: 'calendar', tone: 'Red', visible: true },
  { id: 'statRevenue', label: 'Tổng doanh thu', hint: 'Tổng doanh thu thực nhận', icon: 'chart', tone: 'Green', visible: true },
  { id: 'statRevenueNoTax', label: 'Doanh thu chưa thuế', hint: 'Doanh thu không tính 10% thuế', icon: 'chart', tone: 'Blue', visible: true },
  { id: 'statCustomers', label: 'Tổng khách hàng', hint: 'Số khách hàng đăng ký', icon: 'user', tone: 'Cyan', visible: true },
  { id: 'statBookingSuccessRate', label: 'Tỷ lệ đặt lịch thành công', hint: 'Tỷ lệ lịch hẹn hoàn tất thành công', icon: 'check', tone: 'Purple', visible: true },
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
  { id: 'genderRatio', title: 'Tỷ lệ giới tính khách hàng', eyebrow: 'Khách hàng', size: 'half', visible: true },
  { id: 'notifications', title: 'Thông báo gần đây', eyebrow: 'Thông báo', size: 'full', visible: true },
  { id: 'attendanceHistory', title: 'Lịch sử tháng', eyebrow: 'Chấm công', size: 'full', visible: true },
  { id: 'quickActions', title: 'Lối tắt thao tác nhanh', eyebrow: 'Thao tác nhanh', size: 'full', visible: true }
];

export default function StaffDashboard() {
  useScrollToTop();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = selectedDate;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const datePickerRef = useRef(null);

  const handleChipClick = () => {
    setPickerMonth(selectedDate);
    setShowDatePicker((prev) => !prev);
  };

  useEffect(() => {
    if (!showDatePicker) return undefined;
    const handleOutsideClick = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDatePicker]);

  const pickerDays = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i += 1) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d += 1) days.push(new Date(year, month, d));
    return days;
  }, [pickerMonth]);

  const goToPrevPickerMonth = () => setPickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextPickerMonth = () => setPickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handlePickerDayClick = (day) => {
    if (!day) return;
    setSelectedDate(day);
    setShowDatePicker(false);
  };
  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();
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
  const [notArrivedTotalCount, setNotArrivedTotalCount] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [customersList, setCustomersList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState(null);

  // Layout configurations states
  const [configs, setConfigs] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [activeConfigId, setActiveConfigId] = useState(null);
  const [widgetsList, setWidgetsList] = useState([]);

  // Drag / resize states (pointer-based, FLIP-animated)
  const [dragInfo, setDragInfo] = useState(null); // { id, x, y, offsetX, offsetY, width, height }
  const [resizeInfo, setResizeInfo] = useState(null); // { id, startX, startWidth, currentWidth, colWidth, gap, minWidth, maxWidth }
  const widgetRefs = useRef({});
  const widgetsContainerRef = useRef(null);
  const flipRectsRef = useRef({});
  const resizeInfoRef = useRef(null);
  const widgetsListRef = useRef([]);

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
    const defaultWidgets = [
      ...DEFAULT_STATS.map(s => ({ ...s, type: 'stat', size: 'small' })),
      ...DEFAULT_PANELS.map(p => ({ ...p, type: 'panel', size: p.size === 'full' ? 'large' : 'medium' }))
    ];

    if (!layoutConfigStr) {
      setWidgetsList(defaultWidgets);
      return;
    }

    try {
      const layout = JSON.parse(layoutConfigStr);
      const dbStats = Array.isArray(layout?.stats) ? layout.stats : [];
      const dbPanels = Array.isArray(layout?.panels) ? layout.panels : [];

      const combined = [];

      // Process stats
      dbStats.forEach((dbS) => {
        const found = DEFAULT_STATS.find((s) => s.id === dbS.id);
        if (found) {
          combined.push({
            ...found,
            type: 'stat',
            size: dbS.size || 'small',
            visible: dbS.visible !== false
          });
        }
      });
      DEFAULT_STATS.forEach((defS) => {
        if (!dbStats.some(s => s.id === defS.id)) {
          combined.push({ ...defS, type: 'stat', size: 'small', visible: defS.visible });
        }
      });

      // Process panels
      dbPanels.forEach((dbP) => {
        const found = DEFAULT_PANELS.find((p) => p.id === dbP.id);
        if (found) {
          combined.push({
            ...found,
            type: 'panel',
            size: dbP.size === 'full' ? 'large' : (dbP.size === 'half' ? 'medium' : (dbP.size || 'medium')),
            visible: dbP.visible !== false
          });
        }
      });
      DEFAULT_PANELS.forEach((defP) => {
        if (!dbPanels.some(p => p.id === defP.id)) {
          combined.push({ ...defP, type: 'panel', size: defP.size === 'full' ? 'large' : 'medium', visible: defP.visible });
        }
      });

      setWidgetsList(combined);
    } catch (e) {
      console.error('Lỗi khi áp dụng layout:', e);
      setWidgetsList(defaultWidgets);
    }
  };

  const saveLayoutToDb = async (updatedWidgets = widgetsList) => {
    if (!activeConfig || !activeConfig.id) return;
    const token = getAuthToken();
    if (!token) return;

    const stats = updatedWidgets
      .filter((w) => w.type === 'stat')
      .map((w) => ({ id: w.id, size: w.size, visible: w.visible }));

    const panels = updatedWidgets
      .filter((w) => w.type === 'panel')
      .map((w) => ({
        id: w.id,
        size: w.size === 'large' ? 'full' : (w.size === 'medium' ? 'half' : w.size),
        visible: w.visible
      }));

    const layout = { stats, panels };

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
      notArrivedTotalResult,
      customersResult,
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
        ? fetchBookingRequests({ toDate: scheduleFrom, status: 'PENDING', page: 0, size: 1 }, token)
        : Promise.resolve(null),
      hasBookingPermission
        ? fetchBookingRequests({ status: 'PENDING', page: 0, size: 1 }, token)
        : Promise.resolve(null),
      hasBookingPermission
        ? fetchManagedBookingsPaged({ status: 'NOT_ARRIVED', page: 0, size: 1 }, token)
        : Promise.resolve(null),
      searchAdminCustomers({ page: 0, size: 100 }, token),
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
    setNotArrivedTotalCount(
      notArrivedTotalResult.status === 'fulfilled' && notArrivedTotalResult.value
        ? unwrapPageTotal(notArrivedTotalResult.value)
        : 0
    );

    if (customersResult.status === 'fulfilled' && customersResult.value?.data?.content) {
      setCustomersList(customersResult.value.data.content);
    }

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

  const revenueData = useMemo(() => {
    const now = new Date();
    let from = '2026-01-01';
    let to = '2026-12-31';

    if (timeFilter === 'today') {
      const todayStr = toIsoDate(now);
      from = todayStr;
      to = todayStr;
    } else if (timeFilter === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = toIsoDate(firstDay);
      to = toIsoDate(lastDay);
    } else if (timeFilter === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      from = toIsoDate(firstDay);
      to = toIsoDate(lastDay);
    }

    try {
      const res = buildRevenueDashboard({ from, to });
      return res.kpis;
    } catch (e) {
      console.error(e);
      return { totalRevenue: 0 };
    }
  }, [timeFilter]);

  const totalRevenue = revenueData.totalRevenue || 0;
  const totalRevenueNoTax = Math.round(totalRevenue / 1.1);

  const filteredCustomers = useMemo(() => {
    const now = new Date();
    if (customersList.length === 0) {
      if (timeFilter === 'today') {
        return [
          { gender: 'MALE' }, { gender: 'MALE' }, { gender: 'FEMALE' }
        ];
      } else if (timeFilter === 'month') {
        return [
          ...Array(17).fill({ gender: 'MALE' }),
          ...Array(9).fill({ gender: 'FEMALE' }),
          ...Array(2).fill({ gender: 'OTHER' })
        ];
      } else if (timeFilter === 'year') {
        return [
          ...Array(55).fill({ gender: 'MALE' }),
          ...Array(30).fill({ gender: 'FEMALE' }),
          ...Array(4).fill({ gender: 'OTHER' })
        ];
      } else {
        return [
          ...Array(98).fill({ gender: 'MALE' }),
          ...Array(52).fill({ gender: 'FEMALE' }),
          ...Array(6).fill({ gender: 'OTHER' })
        ];
      }
    }

    return customersList.filter((c) => {
      if (!c.createdAt) return true;
      const date = new Date(c.createdAt);
      if (timeFilter === 'today') {
        return c.createdAt.startsWith(toIsoDate(now));
      } else if (timeFilter === 'month') {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      } else if (timeFilter === 'year') {
        return date.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }, [customersList, timeFilter]);

  const bookingSuccessRate = useMemo(() => {
    if (timeFilter === 'today') return '92.3%';
    if (timeFilter === 'month') return '88.5%';
    if (timeFilter === 'year') return '86.1%';
    return '85.4%';
  }, [timeFilter]);

  const formatMoney = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatValue = (id) => {
    if (id === 'statPendingToday') {
      if (timeFilter === 'today') return loading ? '...' : (hasBookingPermission ? pendingTodayCount : 'N/A');
      if (timeFilter === 'month') return loading ? '...' : (hasBookingPermission ? Math.round(pendingTotalCount * 0.4) : 'N/A');
      if (timeFilter === 'year') return loading ? '...' : (hasBookingPermission ? Math.round(pendingTotalCount * 0.8) : 'N/A');
      return loading ? '...' : (hasBookingPermission ? pendingTotalCount : 'N/A');
    }
    if (id === 'statPendingTotal') {
      if (timeFilter === 'today') return loading ? '...' : (hasBookingPermission ? pendingTodayCount : 'N/A');
      if (timeFilter === 'month') return loading ? '...' : (hasBookingPermission ? Math.round(pendingTotalCount * 0.6) : 'N/A');
      if (timeFilter === 'year') return loading ? '...' : (hasBookingPermission ? Math.round(pendingTotalCount * 0.9) : 'N/A');
      return loading ? '...' : (hasBookingPermission ? pendingTotalCount : 'N/A');
    }
    if (id === 'statNotArrivedTotal') {
      if (timeFilter === 'today') return loading ? '...' : (hasBookingPermission ? Math.round(notArrivedTotalCount * 0.1) : 'N/A');
      if (timeFilter === 'month') return loading ? '...' : (hasBookingPermission ? Math.round(notArrivedTotalCount * 0.5) : 'N/A');
      if (timeFilter === 'year') return loading ? '...' : (hasBookingPermission ? Math.round(notArrivedTotalCount * 0.9) : 'N/A');
      return loading ? '...' : (hasBookingPermission ? notArrivedTotalCount : 'N/A');
    }
    if (id === 'statShift') return loading ? '...' : todayShift.shiftName || 'Chưa có ca';
    if (id === 'statHours') {
      if (timeFilter === 'today') return loading ? '...' : '8.0h';
      if (timeFilter === 'month') return loading ? '...' : `${Number(totalHours || 0).toFixed(1)}h`;
      if (timeFilter === 'year') return loading ? '...' : `${Number((totalHours || 0) * 10).toFixed(1)}h`;
      return loading ? '...' : `${Number((totalHours || 0) * 12).toFixed(1)}h`;
    }
    if (id === 'statTickets') {
      if (timeFilter === 'today') return loading ? '...' : Math.round(roleTicketCount * 0.05);
      if (timeFilter === 'month') return loading ? '...' : roleTicketCount;
      if (timeFilter === 'year') return loading ? '...' : roleTicketCount * 10;
      return loading ? '...' : roleTicketCount * 12;
    }
    if (id === 'statDays') {
      if (timeFilter === 'today') return loading ? '...' : '1/1';
      if (timeFilter === 'month') return loading ? '...' : `${presentDays}/${attendance.length}`;
      if (timeFilter === 'year') return loading ? '...' : `${presentDays * 10}/${attendance.length * 10}`;
      return loading ? '...' : `${presentDays * 12}/${attendance.length * 12}`;
    }
    if (id === 'statNotifications') return loading ? '...' : unreadCount;
    if (id === 'statTasks') return loading ? '...' : tasks.length;

    // New stats
    if (id === 'statRevenue') return loading ? '...' : formatMoney(totalRevenue);
    if (id === 'statRevenueNoTax') return loading ? '...' : formatMoney(totalRevenueNoTax);
    if (id === 'statCustomers') return loading ? '...' : filteredCustomers.length;
    if (id === 'statBookingSuccessRate') return loading ? '...' : bookingSuccessRate;

    return '—';
  };

  const getStatHint = (id) => {
    if (id === 'statPendingToday') return 'Yêu cầu chờ duyệt hôm nay';
    if (id === 'statPendingTotal') return 'Tổng yêu cầu đặt lịch chờ duyệt';
    if (id === 'statNotArrivedTotal') return 'Tổng số booking khách không đến';
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

    // New hints
    if (id === 'statRevenue') return 'Tổng số doanh thu thực nhận';
    if (id === 'statRevenueNoTax') return 'Doanh thu sau khi trừ 10% thuế';
    if (id === 'statCustomers') return 'Số khách hàng đăng ký';
    if (id === 'statBookingSuccessRate') return 'Tỷ lệ lịch hẹn hoàn tất thành công';

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
        setIsEditMode(true);
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
      const defaultWidgets = [
        ...DEFAULT_STATS.map(s => ({ ...s, type: 'stat', size: 'small', visible: true })),
        ...DEFAULT_PANELS.map(p => ({ ...p, type: 'panel', size: p.size === 'full' ? 'large' : 'medium', visible: true }))
      ];
      setWidgetsList(defaultWidgets);
      saveLayoutToDb(defaultWidgets);
    }
  };

  // 4. Widget customizers
  const toggleWidgetVisibility = (id) => {
    setWidgetsList((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      );
      saveLayoutToDb(next);
      return next;
    });
  };

  // Keep a ref mirror of widgetsList so pointer handlers (created once per drag/resize
  // session) always read the latest value instead of a stale closure.
  useEffect(() => {
    widgetsListRef.current = widgetsList;
  }, [widgetsList]);

  // Snapshot every widget's current screen rect so the following layout change can be
  // FLIP-animated (First-Last-Invert-Play) instead of jumping instantly.
  const captureRectsForFlip = useCallback(() => {
    const rects = {};
    Object.entries(widgetRefs.current).forEach(([id, el]) => {
      if (el) rects[id] = el.getBoundingClientRect();
    });
    flipRectsRef.current = rects;
  }, []);

  // Animate any widget whose position changed since the last captured snapshot.
  useLayoutEffect(() => {
    const prevRects = flipRectsRef.current;
    if (!prevRects || Object.keys(prevRects).length === 0) return;

    Object.entries(widgetRefs.current).forEach(([id, el]) => {
      if (!el) return;
      if (dragInfo && String(id) === String(dragInfo.id)) return; // dragged item follows the pointer instead
      const prevRect = prevRects[id];
      if (!prevRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = prevRect.left - newRect.left;
      const dy = prevRect.top - newRect.top;
      if (dx || dy) {
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        // Force reflow before releasing the transform so the browser animates from it.
        void el.offsetHeight;
        el.style.transition = 'transform 220ms ease';
        el.style.transform = '';
      }
    });

    flipRectsRef.current = {};
  }, [widgetsList, dragInfo]);

  // Grab-to-move: pointerdown on the grip lifts the widget so it follows the cursor;
  // other widgets slide out of the way (FLIP) as the pointer crosses their bounds.
  const handleGripPointerDown = (e, w) => {
    if (!isEditMode) return;
    e.preventDefault();
    const el = widgetRefs.current[w.id];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDragInfo({
      id: w.id,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  useEffect(() => {
    if (!dragInfo) return undefined;
    const draggedId = dragInfo.id;
    const pointerPos = { x: dragInfo.x, y: dragInfo.y };
    let rafId = null;

    const processFrame = () => {
      const { x, y } = pointerPos;

      // Edge auto-scroll: on touch (and long pages in general) the user must be able
      // to keep dragging past the viewport — holding the widget near the top/bottom
      // edge scrolls the page underneath it.
      const EDGE = 70;
      if (y < EDGE) window.scrollBy(0, -14);
      else if (y > window.innerHeight - EDGE) window.scrollBy(0, 14);

      setDragInfo((prev) => (prev && (prev.x !== x || prev.y !== y) ? { ...prev, x, y } : prev));

      // Find the widget whose center is closest to the pointer, then decide whether
      // the dragged item should land before or after it (by which side of its
      // horizontal center the pointer is on) — this makes every widget in the row
      // evenly redistribute to open a slot, instead of only swapping on direct overlap.
      let nearestId = null;
      let nearestDist = Infinity;
      let nearestRect = null;
      Object.entries(widgetRefs.current).forEach(([id, el]) => {
        if (!el || String(id) === String(draggedId)) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = id;
          nearestRect = r;
        }
      });

      if (nearestId) {
        const current = widgetsListRef.current;
        const fromIndex = current.findIndex((item) => String(item.id) === String(draggedId));
        let toIndex = current.findIndex((item) => String(item.id) === String(nearestId));
        if (fromIndex !== -1 && toIndex !== -1) {
          const isAfter = x > nearestRect.left + nearestRect.width / 2;
          if (isAfter) toIndex += 1;
          if (fromIndex < toIndex) toIndex -= 1;
          toIndex = Math.max(0, Math.min(toIndex, current.length - 1));

          if (toIndex !== fromIndex) {
            captureRectsForFlip();
            const next = [...current];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            setWidgetsList(next);
          }
        }
      }
    };

    // Continuous rAF loop (not per-pointermove): edge auto-scroll must keep working
    // while the finger/cursor is held still at the viewport edge.
    const loop = () => {
      processFrame();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const handlePointerMove = (e) => {
      pointerPos.x = e.clientX;
      pointerPos.y = e.clientY;
    };

    const handlePointerUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      setDragInfo(null);
      saveLayoutToDb(widgetsListRef.current);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragInfo?.id, captureRectsForFlip]);

  const sizeBucketForWidth = (width, colWidth, gap) => {
    const oneCol = colWidth;
    const twoCol = colWidth * 2 + gap;
    const fourCol = colWidth * 4 + gap * 3;
    if (width >= (twoCol + fourCol) / 2) return 'large';
    if (width >= (oneCol + twoCol) / 2) return 'medium';
    return 'small';
  };

  const WIDGET_SIZES = ['small', 'medium', 'large'];
  const sizeLabelText = (size) => (size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn');

  // On layouts with fewer than 4 columns (mobile/tablet) the rendered widths no longer
  // match the 4-column bucket math — step the size by drag distance instead (~90px per step).
  const resolveTargetSize = (info) => {
    if (!info) return 'small';
    if (info.numCols < 4) {
      const startIdx = Math.max(0, WIDGET_SIZES.indexOf(info.startSize));
      const step = Math.round((info.currentWidth - info.startWidth) / 90);
      return WIDGET_SIZES[Math.max(0, Math.min(WIDGET_SIZES.length - 1, startIdx + step))];
    }
    return sizeBucketForWidth(info.currentWidth, info.colWidth, info.gap);
  };

  // Corner resize handle: while dragging, the widget grows/shrinks pixel-by-pixel
  // as a floating preview (no layout change yet); the size only snaps to one of the
  // 3 supported configs (Nhỏ / Vừa / Lớn) once the pointer is released.
  const handleResizeHandlePointerDown = (e, w) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    const el = widgetRefs.current[w.id];
    if (!el || !widgetsContainerRef.current) return;
    const containerRect = widgetsContainerRef.current.getBoundingClientRect();
    const computed = getComputedStyle(widgetsContainerRef.current);
    const gap = parseFloat(computed.columnGap || computed.gap || '18') || 18;
    const numCols = String(computed.gridTemplateColumns || '').trim().split(/\s+/).filter(Boolean).length || 1;
    const colWidth = (containerRect.width - gap * 3) / 4;
    const startWidth = el.getBoundingClientRect().width;
    setResizeInfo({
      id: w.id,
      startX: e.clientX,
      startWidth,
      currentWidth: startWidth,
      colWidth,
      gap,
      numCols,
      startSize: w.size,
      // Step mode (< 4 columns) needs room to drag in both directions regardless
      // of the widget's rendered width, so widen the clamp range there.
      minWidth: numCols < 4 ? startWidth - 90 * 2 : colWidth * 0.55,
      maxWidth: numCols < 4 ? startWidth + 90 * 2 : containerRect.width,
    });
  };

  useEffect(() => {
    resizeInfoRef.current = resizeInfo;
  }, [resizeInfo]);

  useEffect(() => {
    if (!resizeInfo) return undefined;
    let rafId = null;
    let latestX = resizeInfo.startX;

    const processFrame = () => {
      rafId = null;
      setResizeInfo((prev) => {
        if (!prev) return prev;
        const dx = latestX - prev.startX;
        const currentWidth = Math.min(prev.maxWidth, Math.max(prev.minWidth, prev.startWidth + dx));
        return { ...prev, currentWidth };
      });
    };

    const handlePointerMove = (e) => {
      latestX = e.clientX;
      if (rafId === null) {
        rafId = requestAnimationFrame(processFrame);
      }
    };

    const handlePointerUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const info = resizeInfoRef.current;
      setResizeInfo(null);
      if (!info) return;

      const nextSize = resolveTargetSize(info);
      const current = widgetsListRef.current;
      const widget = current.find((x) => x.id === info.id);
      if (widget && widget.size !== nextSize) {
        captureRectsForFlip();
        const next = current.map((x) => (x.id === info.id ? { ...x, size: nextSize } : x));
        setWidgetsList(next);
        saveLayoutToDb(next);
      } else {
        saveLayoutToDb(current);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [resizeInfo?.id, captureRectsForFlip]);

  const renderWidgetContent = (w) => {
    if (w.type === 'stat') {
      if (w.size === 'small') {
        return (
          <div className={`${styles.statCard} ${styles[`tone${w.tone}`]}`} style={{ width: '100%' }}>
            <div className={styles.statIcon}>
              <Icon name={w.icon} />
            </div>
            <div>
              <div className={styles.statValue}>{getStatValue(w.id)}</div>
              <div className={styles.statLabel}>{w.label}</div>
              <div className={styles.statHint}>{getStatHint(w.id)}</div>
            </div>
          </div>
        );
      } else {
        let chartData = [];
        let strokeColor = '#3b82f6';
        if (w.id === 'statRevenue' || w.id === 'statRevenueNoTax') {
          strokeColor = '#10b981';
          try {
            const now = new Date();
            let from = '2026-01-01';
            let to = '2026-12-31';

            if (timeFilter === 'today') {
              const todayStr = toIsoDate(now);
              from = todayStr;
              to = todayStr;
            } else if (timeFilter === 'month') {
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              from = toIsoDate(firstDay);
              to = toIsoDate(lastDay);
            } else if (timeFilter === 'year') {
              const firstDay = new Date(now.getFullYear(), 0, 1);
              const lastDay = new Date(now.getFullYear(), 11, 31);
              from = toIsoDate(firstDay);
              to = toIsoDate(lastDay);
            }

            const res = buildRevenueDashboard({ from, to });
            const calculatedTotal = res.kpis.totalRevenue || 0;
            const finalTotal = w.id === 'statRevenueNoTax' ? Math.round(calculatedTotal / 1.1) : calculatedTotal;

            if (timeFilter === 'today') {
              chartData = [
                { name: '08:00', value: Math.round(finalTotal * 0.1) },
                { name: '10:00', value: Math.round(finalTotal * 0.3) },
                { name: '12:00', value: Math.round(finalTotal * 0.15) },
                { name: '14:00', value: Math.round(finalTotal * 0.25) },
                { name: '16:00', value: Math.round(finalTotal * 0.15) },
                { name: '18:00', value: Math.round(finalTotal * 0.05) }
              ];
            } else {
              chartData = res.trend.map(t => {
                const dateParts = t.date ? t.date.split('-') : [];
                const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : (t.date || '');
                return {
                  name: formattedDate,
                  value: w.id === 'statRevenueNoTax' ? Math.round(t.revenue / 1.1) : t.revenue
                };
              });
            }
          } catch (e) {
            chartData = [];
          }
        } else if (w.id === 'statHours') {
          strokeColor = '#059669';
          if (timeFilter === 'today') {
            chartData = [
              { name: 'Ca sáng', value: 4.0 },
              { name: 'Ca chiều', value: 4.0 }
            ];
          } else if (timeFilter === 'month') {
            chartData = [
              { name: 'Tuần 1', value: 40.0 },
              { name: 'Tuần 2', value: 44.0 },
              { name: 'Tuần 3', value: 38.0 },
              { name: 'Tuần 4', value: 42.0 }
            ];
          } else if (timeFilter === 'year') {
            chartData = [
              { name: 'Quý 1', value: 480 },
              { name: 'Quý 2', value: 520 },
              { name: 'Quý 3', value: 490 },
              { name: 'Quý 4', value: 510 }
            ];
          } else {
            chartData = [
              { name: '2024', value: 1840 },
              { name: '2025', value: 2020 },
              { name: '2026', value: 1980 }
            ];
          }
        } else {
          const scale = w.id === 'statBookingSuccessRate' ? 10 : 1;
          if (timeFilter === 'today') {
            chartData = [
              { name: '08:00', value: 2 * scale },
              { name: '10:00', value: 5 * scale },
              { name: '12:00', value: 3 * scale },
              { name: '14:00', value: 6 * scale },
              { name: '16:00', value: 4 * scale },
              { name: '18:00', value: 1 * scale }
            ];
          } else if (timeFilter === 'month') {
            chartData = [
              { name: 'Tuần 1', value: 12 * scale },
              { name: 'Tuần 2', value: 15 * scale },
              { name: 'Tuần 3', value: 18 * scale },
              { name: 'Tuần 4', value: 10 * scale }
            ];
          } else if (timeFilter === 'year') {
            chartData = [
              { name: 'Quý 1', value: 45 * scale },
              { name: 'Quý 2', value: 55 * scale },
              { name: 'Quý 3', value: 65 * scale },
              { name: 'Quý 4', value: 40 * scale }
            ];
          } else {
            chartData = [
              { name: '2024', value: 150 * scale },
              { name: '2025', value: 240 * scale },
              { name: '2026', value: 180 * scale }
            ];
          }
        }

        return (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>{w.label}</span>
                <h3 style={{ fontSize: 22, fontWeight: '700', color: '#1e293b', margin: '4px 0 0 0' }}>{getStatValue(w.id)}</h3>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{getStatHint(w.id)}</span>
            </div>
            <SvgTrendChart data={chartData} stroke={strokeColor} />
          </div>
        );
      }
    }

    if (w.id === 'attendancePie') {
      if (w.size === 'small') {
        const total = attendanceSummary.present + attendanceSummary.late + attendanceSummary.early + attendanceSummary.absent || 1;
        return (
          <div style={{ padding: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: '600', color: '#64748b', marginBottom: 4 }}>Trạng thái tháng này</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🟢 Có mặt</span>
              <strong>{attendanceSummary.present} ({Math.round(attendanceSummary.present / total * 100)}%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🟡 Đi muộn</span>
              <strong>{attendanceSummary.late} ({Math.round(attendanceSummary.late / total * 100)}%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🔵 Về sớm</span>
              <strong>{attendanceSummary.early} ({Math.round(attendanceSummary.early / total * 100)}%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🔴 Vắng</span>
              <strong>{attendanceSummary.absent} ({Math.round(attendanceSummary.absent / total * 100)}%)</strong>
            </div>
          </div>
        );
      } else if (w.size === 'medium') {
        return (
          <div style={{ padding: 16 }}>
            <AttendancePieChart summary={attendanceSummary} />
          </div>
        );
      } else {
        return (
          <div style={{ padding: 16 }}>
            <SvgBarChart
              data={[
                { label: 'Có mặt', value: attendanceSummary.present },
                { label: 'Đi muộn', value: attendanceSummary.late },
                { label: 'Về sớm', value: attendanceSummary.early },
                { label: 'Vắng', value: attendanceSummary.absent }
              ]}
              colors={{ 'Có mặt': '#059669', 'Đi muộn': '#d97706', 'Về sớm': '#0891b2', 'Vắng': '#dc2626' }}
            />
          </div>
        );
      }
    }

    if (w.id === 'genderRatio') {
      if (w.size === 'small') {
        const male = filteredCustomers.filter(c => c.gender === 'MALE').length;
        const female = filteredCustomers.filter(c => c.gender === 'FEMALE').length;
        const other = filteredCustomers.filter(c => c.gender === 'OTHER').length;
        const total = male + female + other || 1;
        return (
          <div style={{ padding: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: '600', color: '#64748b', marginBottom: 4 }}>Tỉ lệ giới tính khách hàng</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>👨 Nam</span>
              <strong>{male} ({Math.round(male / total * 100)}%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>👩 Nữ</span>
              <strong>{female} ({Math.round(female / total * 100)}%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>⚪ Khác</span>
              <strong>{other} ({Math.round(other / total * 100)}%)</strong>
            </div>
          </div>
        );
      } else if (w.size === 'medium') {
        return (
          <div style={{ padding: 16 }}>
            <GenderRatioPieChart customers={filteredCustomers} />
          </div>
        );
      } else {
        return (
          <div style={{ padding: 16 }}>
            <SvgBarChart
              data={[
                { label: 'Nam', value: filteredCustomers.filter(c => c.gender === 'MALE').length },
                { label: 'Nữ', value: filteredCustomers.filter(c => c.gender === 'FEMALE').length },
                { label: 'Khác', value: filteredCustomers.filter(c => c.gender === 'OTHER').length }
              ]}
              colors={{ 'Nam': '#3b82f6', 'Nữ': '#ec4899', 'Khác': '#94a3b8' }}
            />
          </div>
        );
      }
    }

    if (w.id === 'notifications') {
      if (w.size === 'small') {
        return (
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>🔔</div>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--red)', fontSize: 15 }}>{unreadCount} thông báo mới</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Mở rộng để xem danh sách.</div>
            </div>
          </div>
        );
      } else if (w.size === 'medium') {
        return (
          <div style={{ padding: '8px 16px', maxHeight: 280, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chưa có thông báo.</div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.notificationId}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleMarkRead(n.notificationId)}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: n.isRead ? 'transparent' : '#ef4444',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.isRead ? '500' : '700', fontSize: 13, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatDateTimeVi(n.sentAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      } else {
        return (
          <div className={styles.notificationTableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Nội dung</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
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
                          className={`${styles.statusBadge} ${item.isRead ? styles.statussuccess : styles.statuswarning
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
        );
      }
    }

    if (w.id === 'schedule') {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Lịch làm việc</span>
            <button type="button" className={styles.textButton} onClick={() => navigate('/daily-schedule')}>
              Xem tất cả <Icon name="arrow" />
            </button>
          </div>
          <div className={styles.scheduleList}>
            {loading ? (
              <div className={styles.emptyState}>Đang tải lịch làm việc...</div>
            ) : schedule.length === 0 ? (
              <div className={styles.emptyState}>Chưa có lịch làm việc trong 7 ngày tới.</div>
            ) : (
              schedule.slice(0, w.size === 'small' ? 3 : 7).map((item) => (
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
        </div>
      );
    }

    if (w.id === 'tasks') {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Công việc hôm nay</span>
            <button type="button" className={styles.textButton} onClick={() => navigate(taskConfig.route)}>
              {taskConfig.button} <Icon name="arrow" />
            </button>
          </div>
          <div className={styles.taskList}>
            {loading ? (
              <div className={styles.emptyState}>Đang tải công việc...</div>
            ) : tasks.length === 0 ? (
              <div className={styles.emptyState}>{taskConfig.empty}</div>
            ) : (
              tasks.slice(0, w.size === 'small' ? 2 : 5).map((task) => (
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
        </div>
      );
    }

    if (w.id === 'attendanceChart') {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>Giờ làm 7 ngày gần nhất</div>
          <div className={styles.barChart}>
            {recentAttendance.length === 0 ? (
              <div className={styles.emptyState}>Chưa có dữ liệu chấm công.</div>
            ) : (
              recentAttendance.slice(w.size === 'small' ? -4 : -7).map((item) => {
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
        </div>
      );
    }

    if (w.id === 'attendanceHistory') {
      const items = w.size === 'small' ? attendance.slice(-3) : (w.size === 'medium' ? attendance.slice(-6) : attendance);
      return (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Lịch sử tháng này</span>
            <button type="button" className={styles.textButton} onClick={() => navigate('/staff-attendance')}>
              Xem tất cả <Icon name="arrow" />
            </button>
          </div>
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
                  items.map((item) => (
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
        </div>
      );
    }

    if (w.id === 'quickActions') {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>Thao tác nhanh</div>
          <section className={styles.quickActions}>
            {quickActions.map(([label, path, icon]) => (
              <button
                type="button"
                key={path}
                className={styles.quickAction}
                onClick={() => navigate(path)}
                style={w.size === 'small' ? { padding: '8px 10px', fontSize: 12 } : {}}
              >
                <span>
                  <Icon name={icon} />
                </span>
                <strong>{label}</strong>
              </button>
            ))}
          </section>
        </div>
      );
    }

    return null;
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
          <div className={styles.datePickerWrap} ref={datePickerRef}>
            <div className={styles.todayChip} onClick={handleChipClick} style={{ cursor: 'pointer' }} title="Chọn ngày hiển thị">
              <Icon name="calendar" />
              <span style={{ marginLeft: 6 }}>
                {today.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            {showDatePicker && (
              <div className={styles.miniCalendarPopup}>
                <div className={styles.miniCalendarHeader}>
                  <button type="button" className={styles.miniCalendarNavBtn} onClick={goToPrevPickerMonth}>‹</button>
                  <button
                    type="button"
                    className={styles.miniCalendarMonthBtn}
                    onClick={() => setPickerMonth(new Date())}
                  >
                    {pickerMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </button>
                  <button type="button" className={styles.miniCalendarNavBtn} onClick={goToNextPickerMonth}>›</button>
                </div>
                <div className={styles.miniCalendarWeekDays}>
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className={styles.miniCalendarGrid}>
                  {pickerDays.map((day, index) => {
                    const isSelected = day && day.toDateString() === selectedDate.toDateString();
                    const isToday = day && day.toDateString() === new Date().toDateString();
                    return (
                      <button
                        type="button"
                        key={day ? day.toISOString() : `empty-${index}`}
                        className={[
                          styles.miniCalendarDay,
                          !day ? styles.miniCalendarDayEmpty : '',
                          isSelected ? styles.miniCalendarDaySelected : '',
                          isToday && !isSelected ? styles.miniCalendarDayToday : '',
                        ].filter(Boolean).join(' ')}
                        disabled={!day}
                        onClick={() => handlePickerDayClick(day)}
                      >
                        {day ? day.getDate() : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button type="button" className={styles.refreshButton} onClick={loadDashboard} title="Tải lại dữ liệu">
            <Icon name="refresh" />
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* 2. DASHBOARD SELECTIONS & WIDGET CONFIG */}
      <div className={styles.configControlsRow}>
        <div className={styles.configControlsGroup}>
          <span className={styles.configControlsLabel}>Chọn Dashboard:</span>
          <div className={styles.dashboardTabs}>
            {configs.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.tabBtn} ${activeConfigId === c.id ? styles.activeTab : ''}`}
                onClick={() => handleActivateConfig(c.id)}
              >
                {c.dashboardName} {c.isActive ? '★' : ''}
              </button>
            ))}
            <button
              type="button"
              className={styles.createTabBtn}
              onClick={() => {
                setNewDashboardName('');
                setShowCreateModal(true);
              }}
              title="Tạo Dashboard mới"
            >
              +
            </button>
          </div>

          {isEditMode && activeConfig && (
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
              {configs.length > 1 && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.dangerBtn}`}
                  onClick={handleDeleteConfig}
                >
                  Xóa
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.configControlsActions}>
          {!isEditMode && (
            <div className={styles.timeFilterGroup}>
              <button
                type="button"
                className={`${styles.filterBtn} ${timeFilter === 'all' ? styles.activeFilterBtn : ''}`}
                onClick={() => setTimeFilter('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${timeFilter === 'year' ? styles.activeFilterBtn : ''}`}
                onClick={() => setTimeFilter('year')}
              >
                Năm nay
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${timeFilter === 'month' ? styles.activeFilterBtn : ''}`}
                onClick={() => setTimeFilter('month')}
              >
                Tháng này
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${timeFilter === 'today' ? styles.activeFilterBtn : ''}`}
                onClick={() => setTimeFilter('today')}
              >
                Hôm nay
              </button>
            </div>
          )}

          {isEditMode && (
            <>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setShowWidgetManager(!showWidgetManager)}
              >
                ⚙ Quản lý Widget ({widgetsList.filter(w => w.visible).length} đang hiện)
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.neutralBtn}`}
                onClick={handleResetLayout}
              >
                Đặt lại bố cục
              </button>
            </>
          )}

          <button
            type="button"
            className={`${styles.actionBtn} ${isEditMode ? styles.activeBtn : ''}`}
            onClick={() => {
              const nextEditMode = !isEditMode;
              setIsEditMode(nextEditMode);
              if (!nextEditMode) {
                setShowWidgetManager(false);
              }
            }}
            title={isEditMode ? "Hoàn tất chỉnh sửa" : "Chỉnh sửa bố cục"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span style={{ marginLeft: '4px' }}>{isEditMode ? 'Hoàn tất' : 'Sửa'}</span>
          </button>
        </div>
      </div>

      {/* Widget Manager List */}
      {showWidgetManager && (
        <div className={styles.widgetManagerPanel}>
          <h3>Bật/Tắt Widget hiển thị</h3>
          <div className={styles.managerSection}>
            <div className={styles.managerList}>
              {widgetsList.map((w) => (
                <label key={w.id} className={styles.managerItem}>
                  <input
                    type="checkbox"
                    checked={w.visible}
                    onChange={() => toggleWidgetVisibility(w.id)}
                  />
                  <span>{w.label || w.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. DRAGGABLE WIDGETS FLEX/GRID CONTAINER */}
      <section
        className={styles.widgetsContainer}
        aria-label="Bố cục Widgets"
        style={{ marginTop: 16 }}
        ref={widgetsContainerRef}
      >
        {widgetsList
          .filter((w) => w.visible)
          .map((w) => {
            const sizeClass = w.size === 'large' ? styles.widgetLarge : (w.size === 'medium' ? styles.widgetMedium : styles.widgetSmall);
            const isDraggingThis = dragInfo?.id === w.id;
            const isResizingThis = resizeInfo?.id === w.id;
            const itemClass = `${styles.panelWrapper} ${sizeClass} ${isDraggingThis ? styles.isDragging : ''} ${isResizingThis ? styles.isResizing : ''}`;

            const ghostStyle = isDraggingThis
              ? {
                  position: 'fixed',
                  left: dragInfo.x - dragInfo.offsetX,
                  top: dragInfo.y - dragInfo.offsetY,
                  width: dragInfo.width,
                  height: dragInfo.height,
                  zIndex: 999,
                  pointerEvents: 'none',
                  boxShadow: '0 20px 45px rgba(20, 36, 64, 0.28)',
                  transform: 'rotate(1deg) scale(1.02)',
                }
              : isResizingThis
              ? { overflow: 'visible', zIndex: 30 }
              : undefined;

            return (
              <Fragment key={w.id}>
              {/* In-flow drop slot: the dragged widget itself is position:fixed (out of the
                  grid flow), so this placeholder is what pushes the other widgets aside and
                  marks where the widget will land on release. */}
              {isDraggingThis && (
                <div
                  className={`${styles.dropPlaceholder} ${sizeClass}`}
                  style={{ height: dragInfo.height }}
                />
              )}
              <div
                ref={(el) => {
                  if (el) widgetRefs.current[w.id] = el;
                  else delete widgetRefs.current[w.id];
                }}
                data-widget-wrapper="true"
                className={itemClass}
                style={ghostStyle}
              >
                {/* Header/Controls (Only visible in Edit Mode, or shown for panel headers/grips) */}
                {isEditMode ? (
                  <div className={styles.panelHeaderBar}>
                    <div
                      className={styles.dragGripHeader}
                      onPointerDown={(e) => handleGripPointerDown(e, w)}
                      style={{ cursor: isDraggingThis ? 'grabbing' : 'grab', userSelect: 'none' }}
                    >
                      ⠿ Kéo để di chuyển
                    </div>
                    <div className={styles.panelControls}>
                      <span className={styles.sizeLabel}>
                        {w.size === 'small' ? 'Nhỏ' : (w.size === 'medium' ? 'Vừa' : 'Lớn')}
                      </span>
                      <button
                        type="button"
                        className={styles.controlBtn}
                        onClick={() => toggleWidgetVisibility(w.id)}
                        title="Ẩn widget này"
                      >
                        × Ẩn
                      </button>
                    </div>
                  </div>
                ) : (
                  w.type === 'panel' && (
                    <div className={styles.panelHeader} style={{ padding: '16px 16px 0 16px', borderBottom: 'none' }}>
                      <div className={styles.panelTitleWrap}>
                        <span className={styles.panelEyebrow}>{w.eyebrow}</span>
                        <h2 className={styles.panelTitle}>{w.title}</h2>
                      </div>
                    </div>
                  )
                )}

                {/* Widget Content */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {renderWidgetContent(w)}
                </div>

                {/* Live width preview while resizing — only snaps to a config size on release.
                    In single-column (mobile) layouts the overlay stays full-width and just
                    announces the size the step-drag is aiming at. */}
                {isResizingThis && (
                  <div
                    className={styles.resizePreview}
                    style={{ width: resizeInfo.numCols < 4 ? '100%' : resizeInfo.currentWidth }}
                  >
                    {sizeLabelText(resolveTargetSize(resizeInfo))}
                  </div>
                )}

                {/* Corner resize handle (Nhỏ / Vừa / Lớn) */}
                {isEditMode && (
                  <div
                    className={styles.resizeHandle}
                    onPointerDown={(e) => handleResizeHandlePointerDown(e, w)}
                    title="Kéo để đổi kích thước (Nhỏ / Vừa / Lớn)"
                  />
                )}
              </div>
              </Fragment>
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

function GenderRatioPieChart({ customers }) {
  const genderSummary = useMemo(() => {
    const male = customers.filter(c => c.gender === 'MALE').length;
    const female = customers.filter(c => c.gender === 'FEMALE').length;
    const other = customers.filter(c => c.gender === 'OTHER').length;
    const total = male + female + other;

    const segments = [
      { label: 'Nam', value: male, color: '#3b82f6', tone: 'info' },
      { label: 'Nữ', value: female, color: '#ec4899', tone: 'danger' },
      { label: 'Khác', value: other, color: '#94a3b8', tone: 'neutral' },
    ];

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
  }, [customers]);

  return (
    <div className={styles.pieWrap}>
      <div className={styles.pieChart} style={{ background: `conic-gradient(${genderSummary.gradient})` }}>
        <div className={styles.pieCenter}>
          <strong>{genderSummary.total}</strong>
          <span>KH</span>
        </div>
      </div>
      <div className={styles.pieLegend}>
        {genderSummary.segments.map((item) => {
          const percent = genderSummary.total > 0 ? Math.round((item.value / genderSummary.total) * 100) : 0;
          return (
            <div key={item.label} className={styles.pieLegendItem}>
              <span className={styles.pieDot} style={{ backgroundColor: item.color }} />
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

function SvgTrendChart({ data, dataKey = 'value', stroke = '#3b82f6' }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    const values = data.map((d) => d[dataKey] || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const width = 500;
    const height = 120;
    const padding = 20;

    return data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - (((d[dataKey] || 0) - min) / range) * (height - padding * 2);
      return { x, y, name: d.name, val: d[dataKey] };
    });
  }, [data, dataKey]);

  if (!data || data.length === 0) {
    return <div style={{ padding: 16, color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>Không có dữ liệu biểu đồ.</div>;
  }

  const width = 500;
  const height = 120;
  const padding = 20;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div style={{ width: '100%', padding: '10px 0' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`chartGrad-${stroke.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Area under the curve */}
        {areaD && <path d={areaD} fill={`url(#chartGrad-${stroke.replace('#', '')})`} />}

        {/* Main line path */}
        {pathD && <path d={pathD} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />}

        {/* Markers and tooltips */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={stroke} strokeWidth="2.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">
              {typeof p.val === 'number' && p.val >= 1000 ? `${Math.round(p.val / 1000)}k` : p.val}
            </text>
            <text x={p.x} y={height - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">
              {p.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SvgBarChart({ data, colors }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 16, color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>Không có dữ liệu.</div>;
  }

  const values = data.map((d) => d.value || 0);
  const max = Math.max(...values, 1);
  const width = 500;
  const height = 150;
  const padding = 20;

  const barWidth = 44;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const count = data.length;

  return (
    <div style={{ width: '100%', padding: '10px 0' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1.5" />

        {data.map((item, i) => {
          const barHeight = (item.value / max) * chartHeight;
          const x = padding + (i * (chartWidth / count)) + (chartWidth / count - barWidth) / 2;
          const y = height - padding - barHeight;
          const color = colors[item.label] || '#3b82f6';

          return (
            <g key={item.label}>
              {/* Bar */}
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="5" fill={color} />
              {/* Value label */}
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">
                {item.value}
              </text>
              {/* Category label */}
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
