import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchStaffDetail } from '../../../services/adminService.js';
import { fetchStaffAttendance } from '../../../services/staffService.js';
import { fetchStaffStatistics } from '../../../services/staffStatisticsService.js';
import { fetchTechnicianWorkHistory } from '../../../services/workHistoryService.js';
import styles from './EmployeeManager.module.css';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';


const getInitials = (name) => {
  if (!name) return 'NV';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts.at(-1)?.[0] : parts[0]?.[1] || '';
  return (first + last).toUpperCase() || 'NV';
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':   return { cls: 'statusActive',   label: 'Hoạt động' };
    case 'INACTIVE': return { cls: 'statusInactive', label: 'Ngưng hoạt động' };
    case 'LOCKED':   return { cls: 'statusLocked',   label: 'Đã khóa' };
    case 'DELETED':  return { cls: 'statusInactive', label: 'Đã xóa' };
    case null:       return { cls: 'statusInactive', label: 'Chưa kích hoạt' };
    default:         return { cls: 'statusInactive', label: status || '-' };
  }
};

// ─── Attendance tab ───────────────────────────────────────────────────────────

const ATTENDANCE_STATUS = {
  PRESENT:  { label: 'Có mặt',    cls: 'statusActive' },
  LATE:     { label: 'Muộn',       cls: 'statusLocked' },
  ABSENT:   { label: 'Vắng',       cls: 'statusInactive' },
  OFF:      { label: 'Nghỉ',       cls: 'statusLocked' },
  NOT_YET:  { label: 'Chưa điểm', cls: 'statusInactive' },
};

function AttendanceTab({ attendanceData }) {
  if (!attendanceData || attendanceData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📅</div>
        <div className={styles.emptyTitle}>Không có dữ liệu chấm công</div>
        <div className={styles.emptyMessage}>Chưa có bản ghi chấm công cho nhân viên này</div>
      </div>
    );
  }

  const total = attendanceData.length;
  const present = attendanceData.filter(
    (r) => r.morningStatus === 'PRESENT' || r.afternoonStatus === 'PRESENT'
  ).length;
  const late = attendanceData.filter(
    (r) => r.morningStatus === 'LATE' || r.afternoonStatus === 'LATE'
  ).length;
  const absent = attendanceData.filter(
    (r) => r.morningStatus === 'ABSENT' && r.afternoonStatus === 'ABSENT'
  ).length;

  return (
    <div>
      {/* Summary cards */}
      <div className={styles.statsGrid} style={{ marginBottom: '20px' }}>
        {[
          { label: 'Tổng ngày', value: total, cls: 'statTotal' },
          { label: 'Có mặt', value: present, cls: 'statActive' },
          { label: 'Đi muộn', value: late, cls: 'statLocked' },
          { label: 'Vắng', value: absent, cls: 'statInactive' },
          {
            label: 'Tỷ lệ đi làm',
            value: total > 0 ? `${Math.round((present / total) * 100)}%` : '-',
            cls: 'statActive'
          },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`${styles.statCard} ${styles[cls]}`}>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['STT', 'Ngày', 'Buổi sáng', 'Buổi chiều'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendanceData.slice(0, 30).map((record, idx) => {
              const mor = ATTENDANCE_STATUS[record.morningStatus] || ATTENDANCE_STATUS.NOT_YET;
              const aft = ATTENDANCE_STATUS[record.afternoonStatus] || ATTENDANCE_STATUS.NOT_YET;
              const date = record.attendanceDate
                ? new Date(record.attendanceDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
                : '-';

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#1268d3', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>{date}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className={`${styles.statusBadge} ${styles[mor.cls]}`}>{mor.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className={`${styles.statusBadge} ${styles[aft.cls]}`}>{aft.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
AttendanceTab.propTypes = { attendanceData: PropTypes.array };

// ─── Detail Section (reusable) ─────────────────────────────────────────────────

function DetailSection({ icon, title, count, sumLabel, sumValue, countClass, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.detailSection} ${open ? styles.open : ''}`}>
      <div className={styles.detailSectionHeader} onClick={() => setOpen((v) => !v)}>
        <div className={styles.detailSectionTitle}>
          <span className={styles.icon}>{icon}</span>
          <span>{title}</span>
          <span className={`${styles.sectionCount} ${styles[countClass]}`}>{count}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.sectionSum}>
            {sumLabel}: <strong>{sumValue}</strong>
          </div>
          <div className={styles.chevron}>▼</div>
        </div>
      </div>
      <div className={styles.detailSectionBody}>
        <div className={styles.sectionSummaryRow}>
          <span className={styles.sectionSummaryLabel}>{sumLabel}</span>
          <span className={styles.sectionSummaryValue}>{sumValue}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
DetailSection.propTypes = {
  id: PropTypes.string,
  icon: PropTypes.string,
  title: PropTypes.string,
  count: PropTypes.number,
  sumLabel: PropTypes.string,
  sumValue: PropTypes.string,
  countClass: PropTypes.string,
  children: PropTypes.node,
};

// ─── Performance tab ───────────────────────────────────────────────────────────

const BOOKING_STATUS_META = {
  COMPLETED:   { label: 'Hoàn thành',  cls: 'statusActive' },
  CONFIRMED:   { label: 'Đã xác nhận', cls: 'statusLocked' },
  PENDING:     { label: 'Chờ xử lý',   cls: 'statusInactive' },
  CANCELLED:   { label: 'Đã hủy',      cls: 'statusInactive' },
  IN_PROGRESS: { label: 'Đang xử lý', cls: 'statusLocked' },
};

function PerformanceTab({ stats, workHistory, attendanceData }) {

  // ── Derive ticket-level items from work history ────────────────────────────
  const tickets = useMemo(() => {
    if (!workHistory || workHistory.length === 0) return [];
    return workHistory.map((item, idx) => {
      const status = item.status
        ? BOOKING_STATUS_META[item.status.toUpperCase()] || { label: item.status, cls: 'statusInactive' }
        : BOOKING_STATUS_META.COMPLETED;
      const date = item.completedAt || item.workDate || item.createdAt;
      return {
        idx: idx + 1,
        code: item.ticketCode || item.bookingCode || `#${item.id || idx + 1}`,
        plate: item.licensePlate || '-',
        service: item.serviceName || item.service || '-',
        date: date ? new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
        status,
        amount: item.price || item.amount || item.totalAmount || 0,
      };
    });
  }, [workHistory]);

  const totalTicketAmount = useMemo(
    () => tickets.reduce((s, t) => s + (t.amount || 0), 0),
    [tickets]
  );

  // ── Derive service-level aggregation from work history ──────────────────────
  const services = useMemo(() => {
    if (!workHistory || workHistory.length === 0) return [];
    const map = {};
    workHistory.forEach((item) => {
      const key = item.serviceName || item.service || 'Khác';
      if (!map[key]) {
        map[key] = { name: key, count: 0, totalAmount: 0, status: item.status || 'COMPLETED' };
      }
      map[key].count += 1;
      map[key].totalAmount += item.price || item.amount || item.totalAmount || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [workHistory]);

  const totalServiceAmount = useMemo(
    () => services.reduce((s, sv) => s + sv.totalAmount, 0),
    [services]
  );

  // ── Derive work hours from attendance + work history ─────────────────────────
  const workHours = useMemo(() => {
    const entries = [];
    // From work history entries
    if (workHistory && workHistory.length > 0) {
      workHistory.forEach((item) => {
        const date = item.completedAt || item.workDate;
        if (!date) return;
        entries.push({
          idx: entries.length + 1,
          date: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          hours: item.hoursWorked || item.duration || item.workingHours || 0,
          type: 'Công việc',
          service: item.serviceName || item.service || '-',
        });
      });
    }
    // From attendance — full-day attendance ≈ 8h
    if (attendanceData && attendanceData.length > 0) {
      attendanceData.forEach((att) => {
        const present = att.morningStatus === 'PRESENT' || att.afternoonStatus === 'PRESENT';
        if (!present) return;
        const dateStr = att.attendanceDate
          ? new Date(att.attendanceDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '-';
        const hasAttEntry = entries.some((e) => e.date === dateStr && e.type === 'Công việc');
        if (hasAttEntry) return;
        entries.push({
          idx: entries.length + 1,
          date: dateStr,
          hours: 8,
          type: 'Chấm công',
          service: '-',
        });
      });
    }
    return entries.sort((a, b) => {
      const [ya, ma, da] = a.date.split('/').reverse();
      const [yb, mb, db] = b.date.split('/').reverse();
      return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
    });
  }, [workHistory, attendanceData]);

  const totalHoursValue = useMemo(
    () => workHours.reduce((s, h) => s + (h.hours || 0), 0),
    [workHours]
  );

  // ── Derive rating items ─────────────────────────────────────────────────────
  const ratings = useMemo(() => {
    if (!stats) return [];
    if (Array.isArray(stats.ratingDetails)) {
      return stats.ratingDetails.map((r, idx) => ({
        idx: idx + 1,
        score: r.rating || r.score || 0,
        reviewer: r.reviewerName || r.customerName || 'Khách hàng',
        comment: r.comment || r.feedback || '-',
        date: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '-',
      }));
    }
    return [];
  }, [stats]);

  // ── KPI cards ───────────────────────────────────────────────────────────────
  const {
    totalBookings = 0,
    completedBookings = 0,
    rating = 0,
    totalRevenue = 0,
  } = stats || {};

  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  if (!stats) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📊</div>
        <div className={styles.emptyTitle}>Chưa có dữ liệu hiệu suất</div>
        <div className={styles.emptyMessage}>Nhân viên chưa có booking nào trong tháng này</div>
      </div>
    );
  }

  return (
    <div>
      {/* KPI summary cards */}
      <div className={styles.statsGrid} style={{ marginBottom: '16px' }}>
        {[
          { label: 'Tổng Ticket',    value: tickets.length,             cls: 'statTotal' },
          { label: 'Tổng Dịch Vụ',  value: services.length,            cls: 'statActive' },
          { label: 'Tổng Giờ Làm',  value: totalHoursValue > 0 ? `${totalHoursValue} giờ` : 0, cls: 'statLocked' },
          { label: 'Đánh Giá TB',   value: rating > 0 ? rating.toFixed(1) : '-', cls: 'statRating' },
          { label: 'Doanh Thu',     value: totalRevenue > 0 ? `${Math.round(totalRevenue / 1000000)}M` : '-', cls: 'statTotal' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`${styles.statCard} ${styles[cls]}`}>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Section 1: Tổng Ticket ────────────────────────────────────────── */}
      <DetailSection
        icon="🎫"
        title="Chi tiết Ticket"
        count={tickets.length}
        sumLabel="Tổng tiền"
        sumValue={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(totalTicketAmount)}
        countClass="countTicket"
      >
        {tickets.length === 0 ? (
          <div className={styles.emptyInner}>Chưa có ticket nào.</div>
        ) : (
          <table className={styles.innerTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>MÃ TICKET</th>
                <th>BIỂN SỐ</th>
                <th>DỊCH VỤ</th>
                <th>NGÀY</th>
                <th>TRẠNG THÁI</th>
                <th>SỐ TIỀN</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.idx}>
                  <td className={styles.cellSTT}>{t.idx}</td>
                  <td className={styles.cellTicketCode}>{t.code}</td>
                  <td className={styles.cellPlate}>{t.plate}</td>
                  <td className={styles.cellPlate}>{t.service}</td>
                  <td className={styles.cellDate}>{t.date}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`${styles.statusBadge} ${styles[t.status.cls]}`}>{t.status.label}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {t.amount > 0
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(t.amount)
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DetailSection>

      {/* ── Section 2: Tổng Dịch Vụ ────────────────────────────────────────── */}
      <DetailSection
        icon="🔧"
        title="Chi tiết Dịch Vụ"
        count={services.length}
        sumLabel="Tổng tiền"
        sumValue={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(totalServiceAmount)}
        countClass="countService"
      >
        {services.length === 0 ? (
          <div className={styles.emptyInner}>Chưa có dịch vụ nào.</div>
        ) : (
          <table className={styles.innerTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>TÊN DỊCH VỤ</th>
                <th>SỐ LẦN</th>
                <th>TỔNG TIỀN</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={i}>
                  <td className={styles.cellSTT}>{i + 1}</td>
                  <td className={styles.cellPlate}>{s.name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.count}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                    {s.totalAmount > 0
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(s.totalAmount)
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DetailSection>

      {/* ── Section 3: Tổng Giờ Làm ──────────────────────────────────────── */}
      <DetailSection
        icon="⏱️"
        title="Chi tiết Giờ Làm"
        count={workHours.length}
        sumLabel="Tổng giờ"
        sumValue={`${totalHoursValue} giờ`}
        countClass="countHours"
      >
        {workHours.length === 0 ? (
          <div className={styles.emptyInner}>Chưa có bản ghi giờ làm.</div>
        ) : (
          <table className={styles.innerTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>NGÀY</th>
                <th>SỐ GIỜ</th>
                <th>LOẠI</th>
                <th>DỊCH VỤ</th>
              </tr>
            </thead>
            <tbody>
              {workHours.map((h) => (
                <tr key={h.idx}>
                  <td className={styles.cellSTT}>{h.idx}</td>
                  <td className={styles.cellDateCol}>{h.date}</td>
                  <td className={styles.cellHours}>{h.hours} giờ</td>
                  <td style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>{h.type}</td>
                  <td style={{ textAlign: 'left', fontSize: '13px', color: '#374151' }}>{h.service}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DetailSection>

      {/* ── Section 4: Đánh Giá ───────────────────────────────────────────── */}
      <DetailSection
        icon="⭐"
        title="Chi tiết Đánh Giá"
        count={ratings.length || (rating > 0 ? 1 : 0)}
        sumLabel="Điểm TB"
        sumValue={rating > 0 ? rating.toFixed(1) : '-'}
        countClass="countRating"
      >
        {rating > 0 ? (
          <table className={styles.innerTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>ĐIỂM</th>
                <th>NGƯỜI ĐÁNH GIÁ</th>
                <th>BÌNH LUẬN</th>
                <th>NGÀY</th>
              </tr>
            </thead>
            <tbody>
              {ratings.length > 0 ? ratings.map((r) => (
                <tr key={r.idx}>
                  <td className={styles.cellSTT}>{r.idx}</td>
                  <td className={styles.cellRating}>
                    {r.score.toFixed(1)} <span className={styles.starIcon}>★</span>
                  </td>
                  <td className={styles.cellReviewer}>{r.reviewer}</td>
                  <td style={{ textAlign: 'left', fontSize: '13px', color: '#374151', maxWidth: '200px' }}>{r.comment}</td>
                  <td className={styles.cellDateCol}>{r.date}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', padding: '20px' }}>
                    Điểm trung bình: <strong style={{ color: '#f59e0b', fontSize: '16px' }}>{rating.toFixed(1)} ★</strong> — chưa có đánh giá chi tiết
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyInner}>Chưa có đánh giá nào.</div>
        )}
      </DetailSection>

      {/* Completion bar */}
      {totalBookings > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px', padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            Tỷ lệ hoàn thành công việc
          </div>
          <div style={{ width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              width: `${completionRate}%`, height: '100%',
              background: completionRate >= 75 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#ef4444',
              borderRadius: '6px', transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', textAlign: 'right' }}>
            {completedBookings}/{totalBookings} ticket ({completionRate}%)
          </div>
        </div>
      )}
    </div>
  );
}
PerformanceTab.propTypes = {
  stats: PropTypes.object,
  workHistory: PropTypes.array,
  attendanceData: PropTypes.array,
  profile: PropTypes.object,
};

// ─── Work history tab ──────────────────────────────────────────────────────────

function WorkHistoryTab({ workHistory }) {
  if (!workHistory || workHistory.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📜</div>
        <div className={styles.emptyTitle}>Không có lịch sử công việc</div>
        <div className={styles.emptyMessage}>Nhân viên chưa có lịch sử làm việc nào</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['STT', 'Biển số xe', 'Dịch vụ', 'Ngày', 'Số tiền', 'Trạng thái'].map((h) => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workHistory.slice(0, 30).map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#1268d3', fontWeight: 600 }}>{idx + 1}</td>
              <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{item.licensePlate || '-'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.serviceName || item.service || '-'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                {item.completedAt ? new Date(item.completedAt).toLocaleDateString('vi-VN')
                  : item.workDate ? new Date(item.workDate).toLocaleDateString('vi-VN')
                  : '-'}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                {item.price || item.amount || item.totalAmount
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.price || item.amount || item.totalAmount)
                  : '-'}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <span className={`${styles.statusBadge} ${styles.statusActive}`}>{item.status || 'Hoàn thành'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
WorkHistoryTab.propTypes = { workHistory: PropTypes.array };

// ─── Info tab ─────────────────────────────────────────────────────────────────

function InfoTab({ data }) {
  if (!data) return null;

  const statusMeta = getStatusBadge(data.status);
  const roleLabels = Array.isArray(data.roles)
    ? data.roles.map((r) => r?.roleName || r?.roleCode || '').filter(Boolean)
    : [];

  return (
    <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {[
            { label: 'Mã nhân viên', value: `#${data.staffId}` },
            { label: 'Họ và tên', value: data.fullName || '-' },
            { label: 'Số điện thoại', value: data.phone || '-' },
            { label: 'Email', value: data.email || '-' },
            { label: 'Ngày sinh', value: data.dob ? new Date(data.dob).toLocaleDateString('vi-VN') : '-' },
            { label: 'Chức vụ', value: data.position || '-' },
            { label: 'Trạng thái', value: statusMeta.label, statusCls: statusMeta.cls },
          ].map(({ label, value, statusCls }) => (
            <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ width: '180px', padding: '14px 20px', fontWeight: 600, color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>
                {label}
              </td>
              <td style={{ padding: '14px 20px', fontSize: '14px', color: '#1a1a1a', fontWeight: 500 }}>
                {statusCls ? (
                  <span className={`${styles.statusBadge} ${styles[statusCls]}`}>{value}</span>
                ) : (
                  value
                )}
              </td>
            </tr>
          ))}
          {/* Roles row */}
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ width: '180px', padding: '14px 20px', fontWeight: 600, color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>
              Vai trò
            </td>
            <td style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {roleLabels.length > 0 ? roleLabels.map((r) => (
                  <span key={r} className={styles.roleBadge}>{r}</span>
                )) : '-'}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
InfoTab.propTypes = { data: PropTypes.object };

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'info',        label: 'Thông tin' },
  { id: 'performance', label: 'Hiệu suất' },
  { id: 'attendance',  label: 'Chấm công' },
  { id: 'history',     label: 'Lịch sử' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  useScrollToTop();
  const navigate = useNavigate();
  const { staffId } = useParams();

  const [profile, setProfile]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  // All tab data — loaded in parallel at page load
  const [attendanceData, setAttendanceData] = useState([]);
  const [perfStats, setPerfStats]           = useState(null);
  const [workHistory, setWorkHistory]       = useState([]);

  // Track which tabs have been loaded
  const [tabLoading, setTabLoading] = useState({ performance: false, attendance: false, history: false });

  const [activeTab, setActiveTab] = useState('info');
  const reqSeq = useRef(0);

  // ── Load profile ───────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { setError('Vui lòng đăng nhập'); return; }
    if (!staffId) { setError('Không tìm thấy ID nhân viên'); return; }

    const seq = ++reqSeq.current;
    try {
      setIsLoading(true);
      setError('');
      const response = await fetchStaffDetail(staffId, token);
      if (seq !== reqSeq.current) return;
      setProfile(response?.data || null);
    } catch (err) {
      if (seq !== reqSeq.current) return;
      setError(err?.message || 'Không tải được thông tin nhân viên');
    } finally {
      if (seq === reqSeq.current) setIsLoading(false);
    }
  }, [staffId]);

  // ── Load all tab data in parallel (fast — one API call per tab) ───────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token || !staffId) return;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    // Performance
    setTabLoading((p) => ({ ...p, performance: true }));
    fetchStaffStatistics(now.getMonth() + 1, now.getFullYear(), token)
      .then((res) => setPerfStats(res?.data || null))
      .catch(() => setPerfStats(null))
      .finally(() => {
        setTabLoading((p) => ({ ...p, performance: false }));
      });

    // Attendance
    setTabLoading((p) => ({ ...p, attendance: true }));
    fetchStaffAttendance(staffId, token)
      .then((res) => setAttendanceData(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setAttendanceData([]))
      .finally(() => {
        setTabLoading((p) => ({ ...p, attendance: false }));
      });

    // Work history
    setTabLoading((p) => ({ ...p, history: true }));
    fetchTechnicianWorkHistory({ startDate: start, endDate: end }, token)
      .then((res) => {
        const list = Array.isArray(res?.data?.content) ? res.data.content
          : Array.isArray(res?.data) ? res.data : [];
        setWorkHistory(list);
      })
      .catch(() => setWorkHistory([]))
      .finally(() => {
        setTabLoading((p) => ({ ...p, history: false }));
      });
  }, [staffId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const statusMeta = profile ? getStatusBadge(profile.status) : {};

  // ─── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Đang tải thông tin nhân viên...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.viewDetailBtn} onClick={() => navigate('/employee-manager')} style={{ fontSize: '14px', padding: '10px 16px' }}>
            ← Quay lại
          </button>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠️</div>
          <div className={styles.emptyTitle}>Lỗi tải dữ liệu</div>
          <div className={styles.emptyMessage}>{error || 'Không tìm thấy nhân viên'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button className={styles.viewDetailBtn} onClick={() => navigate('/employee-manager')} style={{ fontSize: '14px', padding: '10px 16px' }}>
            ← Quay lại
          </button>
          <h1 className={styles.title}>Hồ sơ nhân viên</h1>
        </div>
      </div>

      {/* Profile hero card */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px'
      }}>
        {/* Top row: avatar + name + badges */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: 'white', flexShrink: 0,
            overflow: 'hidden'
          }}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(profile?.fullName)
            )}
          </div>

          {/* Name + role + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
              {profile?.fullName || '-'}
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
              Mã NV: #{profile?.staffId} • {profile?.position || '-'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {Array.isArray(profile?.roles) && profile.roles.map((r) => (
                <span key={r.roleId} className={styles.roleBadge}>{r.roleName || r.roleCode}</span>
              ))}
              <span className={`${styles.statusBadge} ${styles[statusMeta.cls]}`}>{statusMeta.label}</span>
            </div>
          </div>
        </div>

        {/* Bottom row: contact info */}
        <div style={{
          display: 'flex', gap: '0', marginTop: '20px',
          borderTop: '1px solid #f3f4f6', paddingTop: '16px',
          flexWrap: 'wrap'
        }}>
          {[
            { label: 'ĐIỆN THOẠI', value: profile?.phone || '—' },
            { label: 'EMAIL', value: profile?.email || '—' },
            { label: 'NGÀY SINH', value: profile?.dob ? new Date(profile.dob).toLocaleDateString('vi-VN') : '—' },
          ].map(({ label, value }, idx) => (
            <div key={label} style={{
              flex: 1, minWidth: '140px',
              borderRight: idx < 2 ? '1px solid #f3f4f6' : 'none',
              paddingRight: idx < 2 ? '20px' : '0',
              paddingLeft: idx > 0 ? '20px' : '0',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.5px' }}>
                {label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', wordBreak: 'break-word' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab buttons */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: 'white', borderRadius: '12px', padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexWrap: 'wrap'
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#1E90FF' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <InfoTab data={profile} />}

      {activeTab === 'performance' && (
        tabLoading.performance ? (
          <div className={styles.loadingContainer}><div className={styles.spinner} /><p>Đang tải hiệu suất...</p></div>
        ) : (
          <PerformanceTab stats={perfStats} workHistory={workHistory} attendanceData={attendanceData} />
        )
      )}

      {activeTab === 'attendance' && (
        tabLoading.attendance ? (
          <div className={styles.loadingContainer}><div className={styles.spinner} /><p>Đang tải chấm công...</p></div>
        ) : (
          <AttendanceTab attendanceData={attendanceData} />
        )
      )}

      {activeTab === 'history' && (
        tabLoading.history ? (
          <div className={styles.loadingContainer}><div className={styles.spinner} /><p>Đang tải lịch sử...</p></div>
        ) : (
          <WorkHistoryTab workHistory={workHistory} />
        )
      )}
    </div>
  );
}
