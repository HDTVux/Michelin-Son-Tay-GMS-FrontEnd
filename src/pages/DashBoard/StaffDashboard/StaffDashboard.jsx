import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  fetchStaffDashboard,
  fetchStaffStatistics,
  fetchStaffAttendanceHistory,
} from '../../../services/staffDashboardService.js';
import styles from './StaffDashboard.module.css';

const StaffDashboard = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // ── Dashboard overview ──
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // ── Personal statistics ──
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Attendance history ──
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  // ── Load all 3 APIs ──
  useEffect(() => {
    if (!token) return;

    const loadAll = async () => {
      setDashboardLoading(true);
      setStatsLoading(true);
      setAttendanceLoading(true);

      // 1. Dashboard overview
      try {
        const dashRes = await fetchStaffDashboard(token);
        setDashboardData(dashRes?.data || null);
      } finally {
        setDashboardLoading(false);
      }

      // 2. Personal statistics
      try {
        const statsRes = await fetchStaffStatistics(currentMonth, currentYear, token);
        setStatsData(statsRes?.data || null);
      } finally {
        setStatsLoading(false);
      }

      // 3. Attendance history
      try {
        const attRes = await fetchStaffAttendanceHistory(currentMonth, currentYear, token);
        setAttendanceData(Array.isArray(attRes?.data) ? attRes.data : []);
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAll();
  }, [token, currentMonth, currentYear]);

  // ── Derived data ──
  const staff = dashboardData?.staff;
  const todayShift = dashboardData?.todayShift;
  const recentAttendance = dashboardData?.recentAttendance || [];
  const notifications = dashboardData?.notifications || [];

  const totalWorkDays = attendanceData.length;
  const presentDays = attendanceData.filter(
    (a) => a?.status === 'PRESENT' || a?.status === 'LATE',
  ).length;

  // ── Helpers ──
  const formatHours = (value) =>
    typeof value === 'number' ? value.toFixed(1) + 'h' : '—';

  const getAttendanceStatusClass = (status) => {
    if (status === 'PRESENT') return styles.statusCompleted;
    if (status === 'LATE') return styles.statusPending;
    if (status === 'EARLY_LEAVE') return styles.statusWarning;
    if (status === 'ABSENT') return styles.statusDanger;
    return '';
  };

  const getAttendanceStatusText = (status) => {
    const map = {
      PRESENT: 'Có mặt',
      LATE: 'Đi muộn',
      EARLY_LEAVE: 'Về sớm',
      ABSENT: 'Vắng',
      NOT_CHECKED_IN: 'Chưa chấm',
    };
    return map[status] || status || '—';
  };

  const getDayOfWeekVi = (dow) => {
    const map = {
      MONDAY: 'T2', TUESDAY: 'T3', WEDNESDAY: 'T4',
      THURSDAY: 'T5', FRIDAY: 'T6', SATURDAY: 'T7', SUNDAY: 'CN',
    };
    return map[dow] || dow || '—';
  };

  const getNotificationIcon = (type) => {
    const map = {
      BOOKING: '📅', CHECKIN: '✅', COMPLETE: '🎉',
      REMINDER: '🔔', WARNING: '⚠️', SYSTEM: 'ℹ️',
    };
    return map[type] || '📌';
  };

  const calcHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const [inH, inM] = (checkIn || '').split(':').map(Number);
    const [outH, outM] = (checkOut || '').split(':').map(Number);
    if (inH == null || outH == null) return 0;
    return Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
  };

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            Xin chào, {staff?.fullName || 'Nhân viên'} 👋
          </h1>
          <p className={styles.subtitle}>
            Chào mừng bạn quay trở lại – Đây là tổng quan ngày làm việc hôm nay
          </p>
        </div>
        <div className={styles.headerDate}>
          <span className={styles.dateIcon}>📅</span>
          <span>{new Date().toLocaleDateString('vi-VN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}</span>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className={styles.kpiGrid}>

        {/* Ca làm hôm nay */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>🕐</div>
          </div>
          <div className={styles.kpiValue}>
            {dashboardLoading ? '…' : (todayShift?.shiftName || 'Chưa có ca')}
          </div>
          <div className={styles.kpiLabel}>Ca làm hôm nay</div>
          <div className={styles.kpiSubtext}>
            {!dashboardLoading && todayShift?.startTime && todayShift?.endTime
              ? `${todayShift.startTime} – ${todayShift.endTime}`
              : !dashboardLoading && todayShift?.status === 'NOT_CHECKED_IN'
                ? 'Chưa check-in'
                : ''}
          </div>
        </div>

        {/* Giờ làm tháng */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>⏱️</div>
          </div>
          <div className={styles.kpiValue}>
            {statsLoading ? '…' : formatHours(statsData?.totalHours ?? dashboardData?.monthlyHours?.totalHours)}
          </div>
          <div className={styles.kpiLabel}>Giờ làm tháng {currentMonth}</div>
          <div className={styles.kpiSubtext}>
            {dashboardData?.monthlyHours?.month || `${currentYear}-${String(currentMonth).padStart(2, '0')}`}
          </div>
        </div>

        {/* Phiếu hoàn tất */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>✅</div>
          </div>
          <div className={styles.kpiValue}>
            {statsLoading ? '…' : (statsData?.completedTickets ?? dashboardData?.completedServices?.count ?? 0)}
          </div>
          <div className={styles.kpiLabel}>Phiếu hoàn tất tháng</div>
          <div className={styles.kpiSubtext}>
            {dashboardData?.completedServices?.month || `${currentYear}-${String(currentMonth).padStart(2, '0')}`}
          </div>
        </div>

        {/* Ngày đi làm */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>📆</div>
          </div>
          <div className={styles.kpiValue}>
            {attendanceLoading ? '…' : `${presentDays}/${totalWorkDays}`}
          </div>
          <div className={styles.kpiLabel}>Ngày đi làm / Tổng</div>
          <div className={styles.kpiSubtext}>Tháng {currentMonth}/{currentYear}</div>
        </div>

        {/* Thông báo chưa đọc */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>🔔</div>
          </div>
          <div className={styles.kpiValue}>
            {dashboardLoading ? '…' : (notifications.filter((n) => !n.isRead)?.length ?? 0)}
          </div>
          <div className={styles.kpiLabel}>Thông báo chưa đọc</div>
          <div className={styles.kpiSubtext}>Tổng: {notifications.length} thông báo</div>
        </div>

        {/* Phiếu hôm nay */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>📋</div>
          </div>
          <div className={styles.kpiValue}>
            {dashboardLoading ? '…' : (dashboardData?.todayTasks?.length ?? 0)}
          </div>
          <div className={styles.kpiLabel}>Phiếu hôm nay</div>
          <div className={styles.kpiSubtext}>Cần xử lý</div>
        </div>

      </div>

      {/* ── Charts Grid ── */}
      <div className={styles.chartsGrid}>

        {/* Bar chart – Lịch sử chấm công 7 ngày */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Lịch sử chấm công</h3>
            <span className={styles.chartPeriod}>7 ngày gần nhất</span>
          </div>
          {attendanceLoading ? (
            <div className={styles.chartEmpty}>Đang tải…</div>
          ) : recentAttendance.length === 0 ? (
            <div className={styles.chartEmpty}>Chưa có dữ liệu chấm công.</div>
          ) : (
            <div className={styles.barChart}>
              {recentAttendance.slice(0, 7).map((record, index) => {
                const hours = calcHours(record?.checkInTime, record?.checkOutTime);
                const maxHours = 10;
                return (
                  <div key={index} className={styles.barItem}>
                    <div className={styles.barValue}>{hours.toFixed(1)}h</div>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.bar}
                        style={{ height: `${Math.min(100, (hours / maxHours) * 100)}%` }}
                      />
                    </div>
                    <div className={styles.barLabel}>{getDayOfWeekVi(record?.dayOfWeek)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie chart – Tỷ lệ chấm công tháng */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Tỷ lệ chấm công</h3>
            <span className={styles.chartPeriod}>Tháng {currentMonth}/{currentYear}</span>
          </div>
          {attendanceLoading ? (
            <div className={styles.chartEmpty}>Đang tải…</div>
          ) : attendanceData.length === 0 ? (
            <div className={styles.chartEmpty}>Chưa có dữ liệu.</div>
          ) : (() => {
            const counts = {
              PRESENT: attendanceData.filter((a) => a?.status === 'PRESENT').length,
              LATE: attendanceData.filter((a) => a?.status === 'LATE').length,
              EARLY_LEAVE: attendanceData.filter((a) => a?.status === 'EARLY_LEAVE').length,
              ABSENT: attendanceData.filter((a) => a?.status === 'ABSENT').length,
            };
            const total = attendanceData.length || 1;
            const legend = [
              { label: 'Có mặt', key: 'PRESENT', color: '#48bb78' },
              { label: 'Đi muộn', key: 'LATE', color: '#ed8936' },
              { label: 'Về sớm', key: 'EARLY_LEAVE', color: '#4299e1' },
              { label: 'Vắng', key: 'ABSENT', color: '#fc8181' },
            ];
            const pct = (key) => Math.round(((counts[key] || 0) / total) * 100);

            let gradient = '';
            let offset = 0;
            for (const item of legend) {
              const p = ((counts[item.key] || 0) / total) * 100;
              if (p > 0) {
                gradient += `${item.color} ${offset}% ${offset + p}%, `;
                offset += p;
              }
            }
            gradient += `#e2e8f0 ${offset}% 100%`;

            return (
              <div className={styles.pieChartContainer}>
                <div className={styles.pieChart}>
                  <div
                    className={styles.pieSlice}
                    style={{ background: `conic-gradient(${gradient})` }}
                  />
                  <div className={styles.pieCenter}>
                    <span className={styles.pieCenterValue}>{total}</span>
                    <span className={styles.pieCenterLabel}>Ngày</span>
                  </div>
                </div>
                <div className={styles.pieLegend}>
                  {legend.map((item) => (
                    <div key={item.key} className={styles.pieLegendItem}>
                      <span className={styles.pieLegendDot} style={{ background: item.color }} />
                      <span className={styles.pieLegendName}>{item.label}</span>
                      <span className={styles.pieLegendValue}>{pct(item.key)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Line chart – Giờ làm theo ngày */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Giờ làm theo ngày</h3>
            <span className={styles.chartPeriod}>7 ngày gần nhất</span>
          </div>
          {attendanceLoading ? (
            <div className={styles.chartEmpty}>Đang tải…</div>
          ) : recentAttendance.length === 0 ? (
            <div className={styles.chartEmpty}>Chưa có dữ liệu.</div>
          ) : (() => {
            const days = recentAttendance.slice(0, 7).map((r) =>
              calcHours(r?.checkInTime, r?.checkOutTime),
            );
            const maxH = Math.max(...days, 1);

            const points = days.map((h, i) => {
              const x = 20 + (i / Math.max(days.length - 1, 1)) * 360;
              const y = 140 - (h / maxH) * 120;
              return `${x},${y}`;
            });
            const polyline = points.join(' ');

            return (
              <div className={styles.lineChart}>
                <div className={styles.lineChartYAxis}>
                  <span>{maxH.toFixed(0)}h</span>
                  <span>{(maxH / 2).toFixed(0)}h</span>
                  <span>0</span>
                </div>
                <div className={styles.lineChartContent}>
                  <svg className={styles.lineSvg} viewBox="0 0 400 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`20,140 ${polyline} 380,140`} fill="url(#lineGrad)" />
                    <polyline points={polyline} fill="none" stroke="#667eea" strokeWidth="3" strokeLinejoin="round" />
                    {days.map((h, i) => {
                      const x = 20 + (i / Math.max(days.length - 1, 1)) * 360;
                      const y = 140 - (h / maxH) * 120;
                      return <circle key={i} cx={x} cy={y} r="4" fill="#667eea" />;
                    })}
                  </svg>
                  <div className={styles.lineChartXAxis}>
                    {recentAttendance.slice(0, 7).map((r, i) => (
                      <span key={i}>{getDayOfWeekVi(r?.dayOfWeek)}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* ── Thông báo ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Thông báo gần đây</h2>
        </div>
        <div className={styles.recentBookings}>
          {dashboardLoading ? (
            <div className={styles.emptyState}>Đang tải thông báo…</div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>Không có thông báo nào.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Tiêu đề</th>
                  <th>Nội dung</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n?.notificationId}>
                    <td>{getNotificationIcon(n?.notificationType)}</td>
                    <td><strong>{n?.title || '—'}</strong></td>
                    <td>{n?.message || '—'}</td>
                    <td>{n?.sentAt ? new Date(n.sentAt).toLocaleString('vi-VN') : '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${n?.isRead ? styles.statusCompleted : styles.statusPending}`}>
                        {n?.isRead ? 'Đã đọc' : 'Chưa đọc'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Lịch sử chấm công tháng ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Lịch sử chấm công tháng {currentMonth}/{currentYear}
          </h2>
          <button className={styles.viewAllBtn} onClick={() => navigate('/staff-attendance')}>
            Xem tất cả →
          </button>
        </div>
        <div className={styles.recentBookings}>
          {attendanceLoading ? (
            <div className={styles.emptyState}>Đang tải…</div>
          ) : attendanceData.length === 0 ? (
            <div className={styles.emptyState}>Chưa có dữ liệu chấm công.</div>
          ) : (
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
                {attendanceData.map((record, idx) => (
                  <tr key={idx}>
                    <td className={styles.sttCell}>{record?.date || '—'}</td>
                    <td>{getDayOfWeekVi(record?.dayOfWeek)}</td>
                    <td>{record?.shiftType || '—'}</td>
                    <td>{record?.checkInTime || '—'}</td>
                    <td>{record?.checkOutTime || '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getAttendanceStatusClass(record?.status)}`}>
                        {getAttendanceStatusText(record?.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Truy cập nhanh</h2>
        <div className={styles.quickActions}>
          <div className={styles.actionCard} onClick={() => navigate('/booking-request-management')}>
            <div className={styles.actionIcon}>📅</div>
            <div className={styles.actionContent}>
              <h3>Yêu cầu đặt lịch</h3>
              <p>Quản lý yêu cầu đặt lịch từ khách hàng</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/booking-management')}>
            <div className={styles.actionIcon}>📋</div>
            <div className={styles.actionContent}>
              <h3>Lịch hẹn</h3>
              <p>Xem và quản lý lịch hẹn đã xác nhận</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/check-in')}>
            <div className={styles.actionIcon}>✅</div>
            <div className={styles.actionContent}>
              <h3>Check-in</h3>
              <p>Check-in khách hàng khi đến</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/staff-attendance')}>
            <div className={styles.actionIcon}>🕐</div>
            <div className={styles.actionContent}>
              <h3>Chấm công</h3>
              <p>Theo dõi giờ làm việc hàng ngày</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/customer-manager')}>
            <div className={styles.actionIcon}>👥</div>
            <div className={styles.actionContent}>
              <h3>Khách hàng</h3>
              <p>Quản lý thông tin khách hàng</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/daily-schedule')}>
            <div className={styles.actionIcon}>📆</div>
            <div className={styles.actionContent}>
              <h3>Lịch làm việc</h3>
              <p>Xem lịch làm việc cá nhân</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StaffDashboard;
