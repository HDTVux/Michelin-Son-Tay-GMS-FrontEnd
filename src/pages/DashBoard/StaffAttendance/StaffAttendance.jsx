
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import styles from './StaffAttendance.module.css';
import { fetchStaffAttendance, fetchStaffDashboard } from '../../../services/staffService.js';

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

// ─── Status helpers ───────────────────────────────────────────────────────────

const getStatusInfo = (status) => {
  switch (status) {
    case 'PRESENT':    return { text: 'Có mặt',  className: styles.statusPresent };
    case 'LATE':       return { text: 'Đi trễ',  className: styles.statusLate };
    case 'EARLY_LEAVE':return { text: 'Về sớm',  className: styles.statusLate };
    case 'ABSENT':     return { text: 'Vắng',    className: styles.statusAbsent };
    case 'OFF':        return { text: 'Nghỉ',    className: styles.statusOff };
    default:           return { text: status || '—', className: '' };
  }
};

// ─── Main Component ────────────────────────────────────────────────────────────

const StaffAttendance = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [viewMode,      setViewMode]      = useState('calendar');
  const [loading,       setLoading]        = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [staffInfo,     setStaffInfo]     = useState({ id: null, name: '', position: '' });

  // ── Load attendance whenever month changes ────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    const month = currentMonth.getMonth() + 1; // 1-indexed
    const year  = currentMonth.getFullYear();

    setLoading(true);

    try {
      // 1. Lấy dashboard để hiển thị staff info
      const dashResp = await fetchStaffDashboard();
      const dash     = dashResp?.data || dashResp || {};
      const staff    = dash?.staff || {};
      setStaffInfo({
        id:       staff.staffId || staff.id || null,
        name:     staff.fullName || 'Nhân viên',
        position: staff.position || '',
      });

      // 2. Lấy attendance history theo tháng
      const attResp  = await fetchStaffAttendance(month, year);
      // Backend: ApiResponse<List<AttendanceRecordDto>>
      // DTO: { date, dayOfWeek, shiftType, checkInTime, checkOutTime, status }
      const rawData = Array.isArray(attResp?.data) ? attResp.data : [];
      setAttendanceData(rawData);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      toast.error('Không thể tải dữ liệu điểm danh: ' + (err?.message || ''));
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const goPrev  = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goNext  = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToday = () => { setCurrentMonth(new Date()); };

  const monthLabel = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);

  // ── Filter by status ─────────────────────────────────────────────────────────
  const filteredByStatus = filterStatus === 'all'
    ? attendanceData
    : attendanceData.filter((a) => a.status === filterStatus);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalCount     = attendanceData.length;
  const presentCount   = attendanceData.filter((a) => a.status === 'PRESENT').length;
  const lateCount      = attendanceData.filter((a) => a.status === 'LATE' || a.status === 'EARLY_LEAVE').length;
  const absentCount    = attendanceData.filter((a) => a.status === 'ABSENT').length;
  const offCount       = attendanceData.filter((a) => a.status === 'OFF').length;

  // ── Get record for a calendar day ──────────────────────────────────────────
  const getRecord = (date) => {
    if (!date) return null;
    return filteredByStatus.find((r) => r.date === toDateStr(date));
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Điểm danh của tôi</h1>
            <p className={styles.subtitle}>
              {staffInfo.name || 'Nhân viên'}
              {staffInfo.position ? ` — ${staffInfo.position}` : ''}
              {staffInfo.id ? ` — ID: ${staffInfo.id}` : ''}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton}>Xuất báo cáo</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalCount}</div>
            <div className={styles.statLabel}>Tổng ngày</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{presentCount}</div>
            <div className={styles.statLabel}>Có mặt</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{lateCount}</div>
            <div className={styles.statLabel}>Trễ / Về sớm</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{absentCount}</div>
            <div className={styles.statLabel}>Vắng mặt</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{offCount}</div>
            <div className={styles.statLabel}>Nghỉ</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
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
            <option value="PRESENT">Có mặt</option>
            <option value="LATE">Đi trễ</option>
            <option value="ABSENT">Vắng mặt</option>
            <option value="OFF">Nghỉ</option>
          </select>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <div className={styles.calendarCard}>
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                <div key={i} className={styles.weekDay}>{d}</div>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                if (!day) return <div key={`e-${index}`} className={styles.emptyCell} />;
                const record    = getRecord(day);
                const todayDay  = isToday(day);
                const weekendDay = isWeekend(day);
                const si = record ? getStatusInfo(record.status) : null;
                return (
                  <div
                    key={toDateStr(day)}
                    className={`
                      ${styles.dayCell}
                      ${todayDay    ? styles.today    : ''}
                      ${weekendDay  ? styles.weekend  : ''}
                      ${record ? '' : ''}
                    `}
                  >
                    <div className={`${styles.dayNumber} ${todayDay ? styles.dayNumberToday : ''}`}>
                      {day.getDate()}
                    </div>
                    {record && (
                      <div className={styles.dayContent}>
                        <div className={`${styles.appointmentBadge} ${si.className}`}>
                          <div className={styles.aptTime}>
                            {record.checkInTime || '—'} {record.checkOutTime ? `– ${record.checkOutTime}` : ''}
                          </div>
                          <div className={styles.aptCustomer}>
                            {si.text}
                          </div>
                        </div>
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
            <div className={styles.listHeaderCell}>Check-in</div>
            <div className={styles.listHeaderCell}>Check-out</div>
            <div className={styles.listHeaderCell}>Trạng thái</div>
          </div>
          <div className={styles.listBody}>
            {filteredByStatus.length === 0 ? (
              <div className={styles.emptyRow}>Không có bản ghi điểm danh nào.</div>
            ) : (
              filteredByStatus.map((record, index) => {
                const si = getStatusInfo(record.status);
                const dateStr = record.date
                  ? new Date(record.date).toLocaleDateString('vi-VN')
                  : '—';
                return (
                  <div key={index} className={styles.listRow}>
                    <div className={styles.listCell}><strong>{dateStr}</strong></div>
                    <div className={styles.listCell}>{record.dayOfWeek || '—'}</div>
                    <div className={styles.listCell}>{record.shiftType || '—'}</div>
                    <div className={styles.listCell}>{record.checkInTime || '—'}</div>
                    <div className={styles.listCell}>{record.checkOutTime || '—'}</div>
                    <div className={styles.listCell}>
                      <span className={`${styles.statusBadge} ${si.className}`}>{si.text}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusPresent}`} />Có mặt</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusLate}`} />Trễ / Về sớm</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusAbsent}`} />Vắng mặt</div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusOff}`} />Nghỉ</div>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;
