import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  fetchStaffAttendanceHistory,
  fetchStaffDashboard,
  fetchStaffNotifications,
  fetchStaffSchedule,
  fetchStaffStatistics,
  fetchStaffTodayTasks,
  markStaffNotificationAsRead,
} from '../../../services/staffDashboardService.js';
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
      route: '/booking-request-management',
      button: 'Mở yêu cầu',
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

function StatCard({ icon, label, value, hint, tone }) {
  return (
    <div className={`${styles.statCard} ${styles[`tone${tone || 'Blue'}`]}`}>
      <div className={styles.statIcon}><Icon name={icon} /></div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statHint}>{hint}</div>
      </div>
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

  const [dashboard, setDashboard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [accountantPaidCount, setAccountantPaidCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState(null);

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
    ] = await Promise.allSettled([
      fetchStaffDashboard(token),
      fetchStaffStatistics(currentMonth, currentYear, token),
      fetchStaffAttendanceHistory(currentMonth, currentYear, token),
      fetchStaffSchedule(scheduleFrom, scheduleTo, token),
      fetchStaffNotifications(0, 10, token),
      fetchStaffTodayTasks(token),
      primaryRole === STAFF_ROLE.ACCOUNTANT
        ? fetchServiceTicketsPaged({ page: 0, size: 1, status: 'PAID' }, token)
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
    setTasks(
      tasksResult.status === 'fulfilled'
        ? unwrapList(tasksResult.value, overview?.todayTasks || [])
        : overview?.todayTasks || [],
    );
    setAccountantPaidCount(
      paidTicketsResult.status === 'fulfilled' && paidTicketsResult.value
        ? unwrapPageTotal(paidTicketsResult.value)
        : 0,
    );

    const failedCount = [
      overviewResult,
      statsResult,
      attendanceResult,
      scheduleResult,
      notificationsResult,
      tasksResult,
      paidTicketsResult,
    ].filter((result) => result.status === 'rejected').length;

    if (failedCount > 0) {
      setError(`Có ${failedCount} nguồn dữ liệu chưa tải được. Các phần còn lại vẫn đang hiển thị.`);
    }

    setLoading(false);
  }, [currentMonth, currentYear, primaryRole, scheduleFrom, scheduleTo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.avatar}>
            {String(staff.fullName || 'NV').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className={styles.eyebrow}>Staff dashboard</p>
            <h1>Xin chào, {staff.fullName || 'Nhân viên'}</h1>
            <p className={styles.heroText}>
              Dashboard cá nhân cho {roleLabel(primaryRole).toLowerCase()}: chấm công, lịch làm, task, thông báo và {ticketStatConfig.label.toLowerCase()}.
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
          <div className={styles.todayChip}><Icon name="calendar" /> {today.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}</div>
          <button type="button" className={styles.refreshButton} onClick={loadDashboard}>
            <Icon name="refresh" /> Tải lại
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.statGrid} aria-label="Tổng quan">
        <StatCard
          icon="clock"
          tone="Blue"
          value={loading ? '...' : todayShift.shiftName || 'Chưa có ca'}
          label="Ca hôm nay"
          hint={todayShift.startTime && todayShift.endTime
            ? `${todayShift.startTime} - ${todayShift.endTime}`
            : statusText(todayShift.status)}
        />
        <StatCard
          icon="chart"
          tone="Green"
          value={loading ? '...' : `${Number(totalHours || 0).toFixed(1)}h`}
          label={`Giờ làm tháng ${currentMonth}`}
          hint={statistics?.month || dashboard?.monthlyHours?.month || monthKey}
        />
        <StatCard
          icon="ticket"
          tone="Yellow"
          value={loading ? '...' : roleTicketCount}
          label={ticketStatConfig.label}
          hint={primaryRole === STAFF_ROLE.ACCOUNTANT
            ? ticketStatConfig.hint
            : `${ticketStatConfig.hint} ${statistics?.month || dashboard?.completedServices?.month || monthKey}`}
        />
        <StatCard
          icon="calendar"
          tone="Cyan"
          value={loading ? '...' : `${presentDays}/${attendance.length}`}
          label="Ngày đi làm"
          hint={`Tháng ${currentMonth}/${currentYear}`}
        />
        <StatCard
          icon="bell"
          tone="Red"
          value={loading ? '...' : unreadCount}
          label="Thông báo chưa đọc"
          hint={`Tổng ${notifications.length} thông báo`}
        />
        <StatCard
          icon="check"
          tone="Violet"
          value={loading ? '...' : tasks.length}
          label={taskConfig.title}
          hint={taskConfig.hint}
        />
      </section>

      <section className={styles.workGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Lịch làm việc</p>
              <h2>7 ngày tới</h2>
            </div>
            <button type="button" className={styles.textButton} onClick={() => navigate('/daily-schedule')}>
              Xem lịch <Icon name="arrow" />
            </button>
          </div>
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
                    <span>{item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : '—'}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>{taskConfig.eyebrow}</p>
              <h2>{taskConfig.title}</h2>
            </div>
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
              tasks.slice(0, 5).map((task) => (
                <button
                  type="button"
                  key={task.serviceTicketId || task.ticketCode}
                  className={styles.taskItem}
                  onClick={() => navigate(taskConfig.route)}
                >
                  <span className={styles.taskCode}>{task.ticketCode || task.serviceTicketCode || 'Phiếu'}</span>
                  <span className={styles.taskInfo}>
                    <strong>{task.customerName || 'Khách hàng'}</strong>
                    <small>{task.licensePlate || task.vehicleBrand || task.vehicleModel || 'Chưa có thông tin xe'}</small>
                  </span>
                  <StatusBadge status={task.ticketStatus || task.status} />
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className={styles.analyticsGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Chấm công</p>
              <h2>Giờ làm 7 ngày gần nhất</h2>
            </div>
            <span className={styles.panelMeta}>{recentAttendance.length} bản ghi</span>
          </div>
          <div className={styles.barChart}>
            {recentAttendance.length === 0 ? (
              <div className={styles.emptyState}>Chưa có dữ liệu chấm công.</div>
            ) : recentAttendance.map((item) => {
              const hours = calcHours(item.checkInTime, item.checkOutTime);
              return (
                <div key={item.date} className={styles.barColumn}>
                  <span>{hours.toFixed(1)}h</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ height: `${Math.min(100, (hours / 10) * 100)}%` }} />
                  </div>
                  <strong>{dayOfWeekVi(item.dayOfWeek)}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Tỷ lệ</p>
              <h2>Trạng thái tháng này</h2>
            </div>
            <span className={styles.panelMeta}>{attendance.length} ngày</span>
          </div>
          <AttendancePieChart summary={attendanceSummary} />
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Thông báo</p>
            <h2>Thông báo gần đây</h2>
          </div>
          <span className={styles.panelMeta}>/api/staff/notifications</span>
        </div>
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
                  <td colSpan="5" className={styles.tableEmpty}>Không có thông báo.</td>
                </tr>
              ) : notifications.map((item) => (
                <tr key={item.notificationId}>
                  <td><strong>{item.title || 'Thông báo'}</strong></td>
                  <td>{item.message || '—'}</td>
                  <td>{formatDateTimeVi(item.sentAt)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${item.isRead ? styles.statussuccess : styles.statuswarning}`}>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Chấm công</p>
            <h2>Lịch sử tháng {currentMonth}/{currentYear}</h2>
          </div>
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
                  <td colSpan="6" className={styles.tableEmpty}>Chưa có dữ liệu chấm công.</td>
                </tr>
              ) : attendance.map((item) => (
                <tr key={`${item.date}-${item.shiftType || ''}`}>
                  <td><strong>{item.date}</strong></td>
                  <td>{dayOfWeekVi(item.dayOfWeek)}</td>
                  <td>{item.shiftType || '—'}</td>
                  <td>{item.checkInTime || '—'}</td>
                  <td>{item.checkOutTime || '—'}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.quickActions}>
        {quickActions.map(([label, path, icon]) => (
          <button type="button" key={path} className={styles.quickAction} onClick={() => navigate(path)}>
            <span><Icon name={icon} /></span>
            <strong>{label}</strong>
          </button>
        ))}
      </section>
    </div>
  );
}
