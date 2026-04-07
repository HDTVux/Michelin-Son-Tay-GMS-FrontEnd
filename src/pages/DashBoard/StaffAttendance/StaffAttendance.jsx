import { useCallback, useEffect, useState } from 'react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchStaffAttendanceHistory, fetchStaffStatistics } from '../../../services/staffDashboardService.js';
import styles from './StaffAttendance.module.css';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const getAuthToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || '';

const getLoggedStaff = () => {
  try {
    const raw = localStorage.getItem('staff') || localStorage.getItem('staffInfo');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const statusMeta = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'PRESENT')       return { label: 'Có mặt', cls: 'success' };
  if (key === 'LATE')           return { label: 'Đi muộn', cls: 'warning' };
  if (key === 'EARLY_LEAVE')    return { label: 'Về sớm',  cls: 'info'    };
  if (key === 'ABSENT')         return { label: 'Vắng',    cls: 'danger' };
  if (key === 'NOT_CHECKED_IN') return { label: 'Chưa chấm', cls: 'neutral' };
  if (key === 'ON_LEAVE')       return { label: 'Nghỉ phép', cls: 'info' };
  return { label: status || '—', cls: 'neutral' };
};

const getDayOfWeekVi = (dow) => {
  const map = {
    MONDAY: 'T2', TUESDAY: 'T3', WEDNESDAY: 'T4',
    THURSDAY: 'T5', FRIDAY: 'T6', SATURDAY: 'T7', SUNDAY: 'CN',
  };
  return map[dow] || dow || '—';
};

const calcHours = (record) => {
  if (!record?.checkInTime || !record?.checkOutTime) return '—';
  try {
    const [inH, inM]  = (record.checkInTime  || '').split(':').map(Number);
    const [outH, outM] = (record.checkOutTime || '').split(':').map(Number);
    if (isNaN(inH) || isNaN(outH)) return '—';
    const h = Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
    return h.toFixed(1) + 'h';
  } catch { return '—'; }
};

/* ── SVG Icon Components ─────────────────────────────────────────────────── */
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="15" y2="16" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function LoadingSpinner() {
  return (
    <div className={styles['loading-container']}>
      <div className={styles['loading-spinner']} />
      <p className={styles['loading-text']}>Đang tải dữ liệu chấm công…</p>
    </div>
  );
}

function EmptyState({ month, year }) {
  return (
    <div className={styles['empty-state']}>
      <div className={styles['empty-icon-wrap']}>
        <CalendarIcon />
      </div>
      <h3 className={styles['empty-title']}>Chưa có dữ liệu chấm công</h3>
      <p className={styles['empty-message']}>
        Không có bản ghi nào trong {MONTHS_VI[month - 1]} năm {year}.
      </p>
    </div>
  );
}

function StatCard({ icon, value, label, tone }) {
  return (
    <div className={`${styles['stat-card']} ${tone ? styles[`stat-card--${tone}`] : ''}`}>
      <div className={styles['stat-icon']}>{icon}</div>
      <div className={styles['stat-info']}>
        <div className={styles['stat-value']}>{value}</div>
        <div className={styles['stat-label']}>{label}</div>
      </div>
    </div>
  );
}

function RateBar({ present, late, absent, total, rate }) {
  const pPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const lPct = total > 0 ? Math.round((late / total) * 100) : 0;
  const aPct = total > 0 ? Math.round((absent / total) * 100) : 0;

  return (
    <div className={styles['rate-card']}>
      <div className={styles['rate-card__header']}>
        <span className={styles['rate-card__title']}>Tỷ lệ đi làm trong tháng</span>
        <span className={styles['rate-card__percent']}>{rate}%</span>
      </div>
      <div className={styles['rate-bar-track']}>
        <div className={styles['rate-bar-fill']}   style={{ width: `${pPct}%` }} />
        <div className={styles['rate-bar-fill-late']} style={{ width: `${lPct}%` }} />
        <div className={styles['rate-bar-fill-absent']} style={{ width: `${aPct}%` }} />
      </div>
      <div className={styles['rate-legend']}>
        <span className={styles['legend-dot']} style={{ background: '#10b981' }} />
        <span>Có mặt: {present}</span>
        <span className={styles['legend-dot']} style={{ background: '#f59e0b' }} />
        <span>Muộn: {late}</span>
        <span className={styles['legend-dot']} style={{ background: '#ef4444' }} />
        <span>Vắng: {absent}</span>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function StaffAttendance() {
  useScrollToTop();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(today.getFullYear());

  const [records, setRecords] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');

  const staff = getLoggedStaff();
  const staffName = staff?.fullName || staff?.name || staff?.staffName || 'Nhân viên';
  const initials = staffName
    .split(' ')
    .slice(0, 2)
    .map((w) => w?.[0] || '')
    .join('')
    .toUpperCase();

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  /* load được wrap trong useCallback + deps để tránh stale closure */
  const load = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để xem lịch sử chấm công.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [attRes, statsRes] = await Promise.all([
        fetchStaffAttendanceHistory(selectedMonth, selectedYear, token),
        fetchStaffStatistics(selectedMonth, selectedYear, token),
      ]);
      setRecords(Array.isArray(attRes?.data) ? attRes.data : []);
      setStats(statsRes?.data || null);
    } catch (err) {
      setRecords([]);
      setStats(null);
      setError(err?.message || 'Không tải được dữ liệu chấm công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { load(); }, [load]);

  /* ── Derived ── */
  const total        = records.length;
  const present      = records.filter((r) => r?.status === 'PRESENT' || r?.status === 'LATE').length;
  const late         = records.filter((r) => r?.status === 'LATE').length;
  const earlyLeave   = records.filter((r) => r?.status === 'EARLY_LEAVE').length;
  const absent       = records.filter((r) => r?.status === 'ABSENT').length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const recordMap = {};
  records.forEach((r) => {
    if (!r?.date) return;
    const day = parseInt(r.date.slice(-2), 10);
    if (!isNaN(day)) recordMap[day] = r;
  });

  const recentRecords = [...records]
    .sort((a, b) => (b?.date || '').localeCompare(a?.date || ''))
    .slice(0, 10);

  const navMonth = (delta) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const isFutureMonth =
    selectedYear > today.getFullYear() ||
    (selectedYear === today.getFullYear() && selectedMonth > today.getMonth() + 1);

  const firstDay    = new Date(selectedYear, selectedMonth - 1, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const todayStr = today.toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className={styles['booking-page']}>
      <div className={styles['booking-layout']}>

        {/* ── Header Card ── */}
        <div className={styles['booking-card']}>
          <div className={styles['booking-card__header']}>
            <div className={styles['booking-card__title']}>
              <ClockIcon />
              Lịch sử chấm công
            </div>
            <div className={styles['header-meta']}>
              <span className={styles['today-chip']}>{todayStr}</span>
            </div>
          </div>

          <div className={styles['staff-welcome']}>
            <div className={styles['staff-avatar']}>{initials || 'NV'}</div>
            <div>
              <div className={styles['welcome-name']}>Xin chào, <strong>{staffName}</strong></div>
              <div className={styles['welcome-sub']}>Theo dõi lịch sử điểm danh cá nhân của bạn</div>
            </div>
          </div>
        </div>

        {/* ── Filter Card ── */}
        <div className={styles['filter-card']}>
          <div className={styles['filter-card__header']}>
            <div className={styles['filter-card__title']}>
              <CalendarIcon />
              Chọn tháng / năm
            </div>
          </div>

          <div className={styles['month-nav']}>
            <button className={styles['ghost-button']} onClick={() => navMonth(-1)}>
              <ChevronLeftIcon /> Tháng trước
            </button>

            <div className={styles['month-selects']}>
              <select
                className={styles['filter-select']}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {MONTHS_VI.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className={styles['filter-select']}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button className={styles['ghost-button']} onClick={() => navMonth(1)} disabled={isFutureMonth}>
              Tháng sau <ChevronRightIcon />
            </button>

            <button
              className={styles['primary-button']}
              onClick={() => { setSelectedMonth(today.getMonth() + 1); setSelectedYear(today.getFullYear()); }}
            >
              <RefreshIcon /> Về hôm nay
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className={styles['error-banner']}>
            <div className={styles['error-content']}>
              <AlertCircleIcon />
              {error}
            </div>
            <button className={styles['ghost-button']} onClick={load}>Thử lại</button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <LoadingSpinner />}

        {/* ── Empty ── */}
        {!loading && !error && records.length === 0 && (
          <EmptyState month={selectedMonth} year={selectedYear} />
        )}

        {/* ── Stats Grid ── */}
        {!loading && !error && records.length > 0 && (
          <>
            <div className={styles['filter-card']}>
              <div className={styles['filter-card__header']}>
                <div className={styles['filter-card__title']}>
                  <BarChartIcon />
                  Thống kê tháng
                </div>
                <button className={styles['ghost-button']}>
                  {MONTHS_VI[selectedMonth - 1]} / {selectedYear}
                </button>
              </div>

              <div className={styles['stat-grid']}>
                <StatCard icon={<CalendarIcon />} value={total}          label="Ngày trong tháng" tone="primary" />
                <StatCard icon={<CheckCircleIcon />} value={present}      label="Có mặt"          tone="success" />
                <StatCard icon={<AlertCircleIcon />} value={late}         label="Đi muộn"          tone="warning" />
                <StatCard icon={<LogOutIcon />}     value={earlyLeave}    label="Về sớm"          tone="info"    />
                <StatCard icon={<AlertCircleIcon />} value={absent}        label="Vắng"             tone="danger"  />
                <StatCard icon={<BarChartIcon />}   value={`${attendanceRate}%`} label="Tỷ lệ đi làm" tone="neutral" />
              </div>
            </div>

            {/* ── Rate Bar ── */}
            <RateBar
              present={present}
              late={late}
              absent={absent}
              total={total}
              rate={attendanceRate}
            />

            {/* ── Calendar Grid ── */}
            <div className={styles['filter-card']}>
              <div className={styles['filter-card__header']}>
                <div className={styles['filter-card__title']}>
                  <CalendarIcon />
                  Lịch chấm công — {MONTHS_VI[selectedMonth - 1]} {selectedYear}
                </div>
              </div>

              <div className={styles['calendar-grid']}>
                {DOW_LABELS.map((d) => (
                  <div key={d} className={styles['cal-header']}>{d}</div>
                ))}
                {Array.from({ length: startOffset }, (_, i) => (
                  <div key={`empty-${i}`} className={styles['cal-empty']} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day    = i + 1;
                  const record = recordMap[day];
                  const meta   = record ? statusMeta(record?.status) : null;
                  const dow    = new Date(selectedYear, selectedMonth - 1, day).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const isToday   =
                    today.getDate() === day &&
                    today.getMonth() + 1 === selectedMonth &&
                    today.getFullYear() === selectedYear;
                  const isFuture =
                    new Date(selectedYear, selectedMonth - 1, day) > today;

                  return (
                    <div
                      key={day}
                      className={[
                        styles['cal-cell'],
                        record ? styles['cal-cell--has']  : '',
                        isWeekend ? styles['cal-cell--weekend'] : '',
                        isToday   ? styles['cal-cell--today']   : '',
                        isFuture  ? styles['cal-cell--future']  : '',
                      ].join(' ')}
                    >
                      <div className={styles['cal-day-num']}>{day}</div>
                      {record && (
                        <>
                          <div className={`${styles['cal-badge']} ${styles[`status-badge--${meta.cls}`]}`}>
                            {record?.status === 'ABSENT'
                              ? 'Vắng'
                              : record?.checkInTime
                                ? record.checkInTime.slice(0, 5)
                                : '—'}
                          </div>
                          {record?.checkOutTime && (
                            <div className={styles['cal-checkout']}>
                              ↩ {record.checkOutTime.slice(0, 5)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recent Records Table ── */}
            <div className={styles['booking-card']}>
              <div className={styles['booking-card__header']}>
                <div className={styles['booking-card__title']}>
                  <ClockIcon />
                  Bản ghi chi tiết
                </div>
                <button className={styles['ghost-button']}>{recentRecords.length} bản ghi</button>
              </div>

              <div className={styles['booking-table__wrapper']}>
                <table className={styles['booking-table']}>
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Thứ</th>
                      <th>Ca làm</th>
                      <th>Giờ vào</th>
                      <th>Giờ ra</th>
                      <th>Tổng giờ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record, idx) => {
                      const meta = statusMeta(record?.status);
                      return (
                        <tr key={idx} className={record?.status === 'ABSENT' ? styles['row-danger'] : ''}>
                          <td className={styles['date-cell']}>{record?.date || '—'}</td>
                          <td className={styles['dow-cell']}>{getDayOfWeekVi(record?.dayOfWeek)}</td>
                          <td className={styles['shift-cell']}>{record?.shiftType || '—'}</td>
                          <td className={`${styles['time-cell']} ${record?.status === 'LATE' ? styles['time-cell--late'] : ''}`}>
                            {record?.checkInTime || '—'}
                          </td>
                          <td className={styles['time-cell']}>{record?.checkOutTime || '—'}</td>
                          <td className={styles['hours-cell']}>{calcHours(record)}</td>
                          <td>
                            <span className={`${styles['status-badge']} ${styles[`status-badge--${meta.cls}`]}`}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Monthly Summary ── */}
            <div className={styles['filter-card']}>
              <div className={styles['filter-card__header']}>
                <div className={styles['filter-card__title']}>
                  <TicketIcon />
                  Tổng kết tháng
                </div>
              </div>
              <div className={styles['summary-grid']}>
                <div className={styles['summary-card']}>
                  <div className={styles['summary-icon']}><ClockIcon /></div>
                  <div className={styles['summary-info']}>
                    <div className={styles['summary-value']}>
                      {typeof stats?.totalHours === 'number' ? stats.totalHours.toFixed(1) + 'h' : '—'}
                    </div>
                    <div className={styles['summary-label']}>Tổng giờ làm</div>
                  </div>
                </div>
                <div className={styles['summary-card']}>
                  <div className={styles['summary-icon']}><CheckCircleIcon /></div>
                  <div className={styles['summary-info']}>
                    <div className={styles['summary-value']}>{stats?.completedTickets ?? 0}</div>
                    <div className={styles['summary-label']}>Phiếu hoàn tất</div>
                  </div>
                </div>
                <div className={styles['summary-card']}>
                  <div className={styles['summary-icon']}><CalendarIcon /></div>
                  <div className={styles['summary-info']}>
                    <div className={styles['summary-value']}>{MONTHS_VI[selectedMonth - 1]}</div>
                    <div className={styles['summary-label']}>{selectedYear}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
