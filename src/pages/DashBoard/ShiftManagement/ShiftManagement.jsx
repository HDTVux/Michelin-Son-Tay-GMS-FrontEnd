import { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ShiftManagement.module.css';

// ─── Ca definitions ────────────────────────────────────────────────────────
const SHIFTS = [
  { id: 'MORNING',   label: 'Ca sáng',    time: '7h → 12h' },
  { id: 'AFTERNOON', label: 'Ca chiều',   time: '12h30 → 18h30' },
];

// ─── Mock staff for attendance ───────────────────────────────────────────────
const MOCK_STAFF = [
  { staffId: 1, fullName: 'Nguyễn Văn A',  phone: '0901234561', role: 'KTV',      avatar: null },
  { staffId: 2, fullName: 'Trần Thị B',    phone: '0901234562', role: 'KTV',      avatar: null },
  { staffId: 3, fullName: 'Lê Văn C',      phone: '0901234563', role: 'KTV',      avatar: null },
  { staffId: 4, fullName: 'Phạm Thị D',   phone: '0901234564', role: 'KTV',      avatar: null },
  { staffId: 5, fullName: 'Hoàng Văn E',   phone: '0901234565', role: 'KTV',      avatar: null },
  { staffId: 6, fullName: 'Vũ Thị F',     phone: '0901234566', role: 'KTV',      avatar: null },
  { staffId: 7, fullName: 'Đặng Văn G',   phone: '0901234567', role: 'KTV',      avatar: null },
];

// ─── Mock schedule: date → { MORNING: [...], AFTERNOON: [...] } ─────────────
const MOCK_SCHEDULE = {
  '2026-03-02': {
    MORNING:   [{ staffId: 1, checkIn: '06:58', checkOut: '12:05', attendance: 'present'  },
                { staffId: 2, checkIn: '07:02', checkOut: '12:00', attendance: 'present'  },
                { staffId: 3, checkIn: null,    checkOut: null,    attendance: 'absent'   }],
    AFTERNOON: [{ staffId: 4, checkIn: '12:25', checkOut: '18:35', attendance: 'present'  },
                { staffId: 5, checkIn: null,    checkOut: null,    attendance: 'absent'   }],
  },
  '2026-03-03': {
    MORNING:   [{ staffId: 1, checkIn: '07:00', checkOut: '12:02', attendance: 'present' },
                { staffId: 4, checkIn: '07:10', checkOut: null,     attendance: 'late'    }],
    AFTERNOON: [{ staffId: 2, checkIn: '12:30', checkOut: '18:28', attendance: 'present' },
                { staffId: 6, checkIn: null,    checkOut: null,    attendance: 'absent'  }],
  },
  '2026-03-05': {
    MORNING:   [{ staffId: 3, checkIn: '06:55', checkOut: '12:00', attendance: 'present' },
                { staffId: 7, checkIn: '07:05', checkOut: '12:00', attendance: 'present' }],
    AFTERNOON: [{ staffId: 1, checkIn: '12:28', checkOut: '18:30', attendance: 'present' },
                { staffId: 5, checkIn: '12:35', checkOut: null,     attendance: 'late'    }],
  },
};

// ─── Attendance Modal ────────────────────────────────────────────────────────
function AttendanceModal({ date, shift, onClose }) {
  const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

  // Init staff rows from MOCK_STAFF
  const saved = MOCK_SCHEDULE[dateStr]?.[shift.id] || [];
  const [rows, setRows] = useState(() =>
    MOCK_STAFF.map((staff) => {
      const found = saved.find((r) => r.staffId === staff.staffId);
      return {
        staffId:    staff.staffId,
        fullName:   staff.fullName,
        phone:      staff.phone,
        role:       staff.role,
        attendance: found?.attendance || 'absent',   // default vắng
        checkIn:    found?.checkIn    || '',
        checkOut:   found?.checkOut   || '',
      };
    })
  );
  const [saving, setSaving] = useState(false);

  const fmtDate = (d) =>
    d ? d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const toggleAttendance = (staffId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.staffId === staffId
          ? { ...r, attendance: r.attendance === 'present' ? 'absent' : 'present',
              checkIn: r.attendance === 'present' ? '' : r.checkIn,
              checkOut: r.attendance === 'present' ? '' : r.checkOut }
          : r
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const present = rows.filter((r) => r.attendance === 'present').length;
    const absent  = rows.filter((r) => r.attendance === 'absent').length;
    setSaving(false);
    toast.success(
      `Đã lưu điểm danh ca ${shift.label} ngày ${fmtDate(date)} — Có mặt: ${present}, Vắng: ${absent}`,
      { toastId: 'attendance-saved' }
    );
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>
              Điểm danh — {shift.label}
            </h3>
            <p className={styles.modalSubtitle}>{fmtDate(date)} · {shift.time}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Summary chips */}
        <div className={styles.modalSummary}>
          <span className={styles.chipPresent}>
            <span className={styles.chipDot} style={{ background: '#10b981' }} />
            Có mặt: {rows.filter((r) => r.attendance === 'present').length}
          </span>
          <span className={styles.chipAbsent}>
            <span className={styles.chipDot} style={{ background: '#ef4444' }} />
            Vắng: {rows.filter((r) => r.attendance === 'absent').length}
          </span>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.attendTable}>
            <thead>
              <tr>
                <th className={styles.thStt}>STT</th>
                <th className={styles.thName}>Nhân viên</th>
                <th className={styles.thRole}>Vai trò</th>
                <th className={styles.thAttend}>Có mặt</th>
                <th className={styles.thAttend}>Vắng</th>
                <th className={styles.thTime}>Check-in</th>
                <th className={styles.thTime}>Check-out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.staffId} className={row.attendance === 'absent' ? styles.rowAbsent : ''}>
                  <td className={styles.tdStt}>{idx + 1}</td>
                  <td className={styles.tdName}>
                    <div className={styles.staffAvatar}>
                      {row.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.staffName}>{row.fullName}</div>
                      <div className={styles.staffPhone}>{row.phone}</div>
                    </div>
                  </td>
                  <td className={styles.tdRole}>
                    <span className={styles.roleBadge}>{row.role}</span>
                  </td>
                  {/* Present toggle */}
                  <td className={styles.tdToggle}>
                    <button
                      className={`${styles.toggleBtn} ${row.attendance === 'present' ? styles.toggleActive : ''}`}
                      onClick={() => toggleAttendance(row.staffId)}
                      disabled={row.attendance === 'present'}
                    >
                      {row.attendance === 'present' ? '✓' : ''}
                    </button>
                  </td>
                  {/* Absent toggle */}
                  <td className={styles.tdToggle}>
                    <button
                      className={`${styles.toggleBtn} ${styles.toggleAbsent} ${row.attendance === 'absent' ? styles.toggleActiveAbs : ''}`}
                      onClick={() => toggleAttendance(row.staffId)}
                      disabled={row.attendance === 'absent'}
                    >
                      {row.attendance === 'absent' ? '✕' : ''}
                    </button>
                  </td>
                  {/* Check-in */}
                  <td className={styles.tdTime}>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={row.checkIn}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) => r.staffId === row.staffId ? { ...r, checkIn: e.target.value } : r)
                        )
                      }
                      disabled={row.attendance === 'absent'}
                    />
                  </td>
                  {/* Check-out */}
                  <td className={styles.tdTime}>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={row.checkOut}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) => r.staffId === row.staffId ? { ...r, checkOut: e.target.value } : r)
                        )
                      }
                      disabled={row.attendance === 'absent'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Hủy</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const getDaysInMonth = (date) => {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
  return days;
};

const toDateStr = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isWeekend = (date) => date && (date.getDay() === 0 || date.getDay() === 6);
const isToday   = (date) => date && date.toDateString() === new Date().toDateString();

// ─── Main Component ──────────────────────────────────────────────────────────
const ShiftManagement = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeModal, setActiveModal]    = useState(null); // { date, shift }

  const scheduleMap = MOCK_SCHEDULE;

  const goPrev  = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goNext  = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToday = () => setCurrentMonth(new Date());

  const monthLabel = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);

  // Stats
  const totalDays     = Object.keys(scheduleMap).length;
  const totalPresent  = Object.values(scheduleMap).reduce((s, v) =>
    s + (v.MORNING?.filter((r) => r.attendance === 'present').length || 0) +
        (v.AFTERNOON?.filter((r) => r.attendance === 'present').length || 0), 0);
  const totalAbsent   = Object.values(scheduleMap).reduce((s, v) =>
    s + (v.MORNING?.filter((r) => r.attendance === 'absent').length || 0) +
        (v.AFTERNOON?.filter((r) => r.attendance === 'absent').length || 0), 0);
  const totalLate     = Object.values(scheduleMap).reduce((s, v) =>
    s + (v.MORNING?.filter((r) => r.attendance === 'late').length || 0) +
        (v.AFTERNOON?.filter((r) => r.attendance === 'late').length || 0), 0);
  const totalRows     = Object.values(scheduleMap).reduce((s, v) =>
    s + (v.MORNING?.length || 0) + (v.AFTERNOON?.length || 0), 0);

  const openModal = (date, shift) => {
    setActiveModal({ date, shift });
    toast.info(`Mở điểm danh: ${shift.label}`, { toastId: `open-${toDateStr(date)}-${shift.id}` });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý ca làm việc</h1>
          <p className={styles.subtitle}>Phân công và điểm danh nhân viên theo ca</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{totalDays}</div>
          <div className={styles.statLabel}>Ngày có lịch</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{totalPresent}</div>
          <div className={styles.statLabel}>Có mặt</div>
        </div>
        <div className={`${styles.statCard} ${styles.statLate}`}>
          <div className={styles.statValue}>{totalLate}</div>
          <div className={styles.statLabel}>Đi trễ</div>
        </div>
        <div className={`${styles.statCard} ${styles.statAbsent}`}>
          <div className={styles.statValue}>{totalAbsent}</div>
          <div className={styles.statLabel}>Vắng mặt</div>
        </div>
        <div className={`${styles.statCard} ${styles.statShift}`}>
          <div className={styles.statValue}>{totalRows}</div>
          <div className={styles.statLabel}>Lượt trực</div>
        </div>
      </div>

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={goPrev}>◀ Tháng trước</button>
        <button className={styles.currentMonth} onClick={goToday}>{monthLabel}</button>
        <button className={styles.navBtn} onClick={goNext}>Tháng sau ▶</button>
      </div>

      {/* Calendar */}
      <div className={styles.calendarCard}>
        <div className={styles.calendar}>
          {/* Weekday headers */}
          <div className={styles.weekDays}>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
              <div key={i} className={styles.weekDay}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className={styles.daysGrid}>
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className={styles.emptyCell} />;

              const dateStr    = toDateStr(day);
              const daySchedule = scheduleMap[dateStr] || {};
              const today      = isToday(day);
              const weekend    = isWeekend(day);

              return (
                <div
                  key={dateStr}
                  className={`${styles.dayCell} ${today ? styles.today : ''} ${weekend ? styles.weekend : ''}`}
                >
                  {/* Day number */}
                  <div className={`${styles.dayNumber} ${today ? styles.dayNumberToday : ''}`}>
                    {day.getDate()}
                  </div>

                  {/* Shift buttons */}
                  <div className={styles.shiftButtons}>
                    {SHIFTS.map((shift) => {
                      const shiftData = daySchedule[shift.id] || [];
                      const presentCnt = shiftData.filter((r) => r.attendance === 'present').length;
                      const absentCnt  = shiftData.filter((r) => r.attendance === 'absent').length;
                      const lateCnt    = shiftData.filter((r) => r.attendance === 'late').length;
                      const totalCnt   = shiftData.length;
                      const hasAny     = totalCnt > 0;

                      return (
                        <button
                          key={shift.id}
                          className={`${styles.shiftBtn} ${hasAny ? styles.shiftBtnActive : ''}`}
                          onClick={() => openModal(day, shift)}
                          title={`${shift.label} — ${shift.time}`}
                        >
                          <span className={styles.shiftBtnLabel}>{shift.label}</span>
                          <span className={styles.shiftBtnTime}>{shift.time}</span>
                          {hasAny && (
                            <div className={styles.shiftBtnStats}>
                              {presentCnt > 0 && (
                                <span className={styles.statPresent}>{presentCnt} ✔</span>
                              )}
                              {lateCnt > 0 && (
                                <span className={styles.statLate}>{lateCnt} ⚠</span>
                              )}
                              {absentCnt > 0 && (
                                <span className={styles.statAbsent}>{absentCnt} ✕</span>
                              )}
                            </div>
                          )}
                          {!hasAny && (
                            <span className={styles.shiftBtnEmpty}>Chưa điểm danh</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích trạng thái:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#10b981' }} />
            <span>Có mặt</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
            <span>Đi trễ</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#ef4444' }} />
            <span>Vắng mặt</span>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {activeModal && (
        <AttendanceModal
          date={activeModal.date}
          shift={activeModal.shift}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};

export default ShiftManagement;
