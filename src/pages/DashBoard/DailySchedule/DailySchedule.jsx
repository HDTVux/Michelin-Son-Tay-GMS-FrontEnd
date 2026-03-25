import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchStaffSchedule } from '../../../services/staffService.js';
import styles from './DailySchedule.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toDateStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getDaysInMonth = (date) => {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay(); // 0=CN
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
};

const isWeekend = (d) => d && (d.getDay() === 0 || d.getDay() === 6);
const isToday   = (d) => d && d.toDateString() === new Date().toDateString();

const STATUS_MAP = {
  PENDING:    { text: 'Chờ xác nhận',  className: styles.statusPending    },
  CONFIRMED:  { text: 'Đã xác nhận',   className: styles.statusConfirmed  },
  IN_PROGRESS:{ text: 'Đang thực hiện', className: styles.statusPending   },
  COMPLETED:  { text: 'Hoàn thành',     className: styles.statusCompleted  },
  CANCELLED:  { text: 'Đã hủy',         className: styles.statusCancelled  },
  SCHEDULED:  { text: 'Đã lên lịch',   className: styles.statusConfirmed  },
  OFF:        { text: 'Nghỉ',           className: styles.statusCancelled  },
};
const getStatusInfo = (status) => STATUS_MAP[status] || { text: status || '—', className: '' };

// ─── DailySchedule ─────────────────────────────────────────────────────────────
const DailySchedule = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode,     setViewMode]     = useState('calendar');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const [appointments,  setAppointments] = useState([]);

  // ─── Fetch schedule when month changes ─────────────────────────────────────
  const loadSchedule = useCallback(async (monthDate) => {
    setLoading(true);
    setError(null);

    const year  = monthDate.getFullYear();
    const month = monthDate.getMonth(); // 0-indexed
    const from  = toDateStr(new Date(year, month, 1));
    const to    = toDateStr(new Date(year, month + 1, 0));

    try {
      const resp  = await fetchStaffSchedule(from, to);
      const list  = resp?.data || resp || [];
      setAppointments(list);
    } catch (err) {
      console.error('fetchStaffSchedule error:', err);
      toast.error('Không thể tải lịch làm việc: ' + (err?.message || ''));
      setError(err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchedule(currentMonth); }, [currentMonth, loadSchedule]);

  // ─── Navigate ───────────────────────────────────────────────────────────────
  const goPrev  = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goNext  = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToday = () => { setCurrentMonth(new Date()); };

  const monthLabel = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);

  // ─── Filter by month + status ──────────────────────────────────────────────
  const filteredByStatus = filterStatus === 'all'
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalCount     = appointments.length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'SCHEDULED').length;
  const pendingCount   = appointments.filter(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter(a => a.status === 'CANCELLED' || a.status === 'OFF').length;

  // ─── Appointments for a calendar day ──────────────────────────────────────
  const getAppts = (date) => {
    if (!date) return [];
    const str = toDateStr(date);
    return filteredByStatus.filter(a => a.date === str || a.appointmentDate === str);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Lịch làm việc của tôi</h1>
          <p className={styles.subtitle}>Quản lý và theo dõi lịch hẹn</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statValue}>{totalCount}</div>
          <div className={styles.statLabel}>Tổng lịch hẹn</div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statValue}>{confirmedCount}</div>
          <div className={styles.statLabel}>Đã xác nhận</div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statValue}>{pendingCount}</div>
          <div className={styles.statLabel}>Chờ xác nhận</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statValue}>{completedCount}</div>
          <div className={styles.statLabel}>Hoàn thành</div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statValue}>{cancelledCount}</div>
          <div className={styles.statLabel}>Đã hủy</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => loadSchedule(currentMonth)}>Tải lại</button>
          </div>
        )}
        <div className={styles.toolbarLeft}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'calendar' ? styles.active : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              Lịch
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </button>
          </div>
          <div className={styles.monthNavigation}>
            <button className={styles.navButton} onClick={goPrev}>◀ Tháng trước</button>
            <button className={styles.currentButton} onClick={goToday}>{monthLabel}</button>
            <button className={styles.navButton} onClick={goNext}>Tháng sau ▶</button>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="SCHEDULED">Đã lên lịch</option>
            <option value="OFF">Nghỉ</option>
          </select>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <div className={styles.calendarCard}>
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Đang tải lịch...</span>
            </div>
          )}
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                <div key={i} className={styles.weekDay}>{d}</div>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                if (!day) return <div key={`e-${index}`} className={styles.emptyCell} />;
                const dayAppts  = getAppts(day);
                const todayDay  = isToday(day);
                const weekendDay = isWeekend(day);
                return (
                  <div
                    key={toDateStr(day)}
                    className={`
                      ${styles.dayCell}
                      ${todayDay   ? styles.today    : ''}
                      ${weekendDay ? styles.weekend  : ''}
                    `}
                  >
                    <div className={`${styles.dayNumber} ${todayDay ? styles.dayNumberToday : ''}`}>
                      {day.getDate()}
                    </div>
                    {dayAppts.length > 0 && (
                      <div className={styles.dayContent}>
                        {dayAppts.slice(0, 3).map((apt) => {
                          const si = getStatusInfo(apt.status);
                          return (
                            <div
                              key={apt.date + (apt.shiftName || '')}
                              className={`${styles.appointmentBadge} ${si.className}`}
                            >
                              <div className={styles.aptTime}>
                                {apt.startTime && apt.endTime ? `${apt.startTime}–${apt.endTime}` : apt.shiftName || '—'}
                              </div>
                              <div className={styles.aptCustomer}>
                                {apt.shiftName || apt.dayOfWeek || '—'}
                              </div>
                            </div>
                          );
                        })}
                        {dayAppts.length > 3 && (
                          <div className={styles.moreCount}>+{dayAppts.length - 3} lịch hẹn</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <div className={styles.listHeaderCell}>Ngày</div>
            <div className={styles.listHeaderCell}>Thứ</div>
            <div className={styles.listHeaderCell}>Ca</div>
            <div className={styles.listHeaderCell}>Giờ bắt đầu</div>
            <div className={styles.listHeaderCell}>Giờ kết thúc</div>
            <div className={styles.listHeaderCell}>Trạng thái</div>
          </div>
          <div className={styles.listBody}>
            {loading && (
              <div className={styles.loadingRow}>
                <div className={styles.spinner} />
                <span>Đang tải dữ liệu...</span>
              </div>
            )}
            {!loading && filteredByStatus.length === 0 && (
              <div className={styles.emptyRow}>Không có lịch hẹn nào phù hợp.</div>
            )}
            {!loading && filteredByStatus.map((record) => {
              const si = getStatusInfo(record.status);
              const dateStr = record.date
                ? new Date(record.date).toLocaleDateString('vi-VN')
                : '—';
              return (
                <div key={record.date + (record.shiftName || '')} className={styles.listRow}>
                  <div className={styles.listCell}><strong>{dateStr}</strong></div>
                  <div className={styles.listCell}>{record.dayOfWeek || '—'}</div>
                  <div className={styles.listCell}>{record.shiftName || '—'}</div>
                  <div className={styles.listCell}>{record.startTime || '—'}</div>
                  <div className={styles.listCell}>{record.endTime || '—'}</div>
                  <div className={styles.listCell}>
                    <span className={`${styles.statusBadge} ${si.className}`}>{si.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusPending}`} />
            <span>Chờ xác nhận</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusConfirmed}`} />
            <span>Đã xác nhận</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusCompleted}`} />
            <span>Hoàn thành</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusCancelled}`} />
            <span>Đã hủy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySchedule;
