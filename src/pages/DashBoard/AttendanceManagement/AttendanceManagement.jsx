import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchManagerAttendance,
  fetchManagerEmployees,
  fetchWorkShifts,
  managerCheckIn,
  managerCheckOut,
  managerDeleteCheckin,
} from '../../../services/managerService.js';
import styles from './AttendanceManagement.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('adminToken')
  || localStorage.getItem('staffToken')
  || '';

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const pad2 = (n) => String(n).padStart(2, '0');

const toISODate = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const addDays = (date, delta) => {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
};

const getMonday = (date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
};

const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const getMonthRange = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return { from: toISODate(first), to: toISODate(last) };
};

const addMonths = (date, delta) => {
  const next = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  return next;
};

const calcHoursBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = String(checkIn).split(':').map(Number);
  const [outH, outM] = String(checkOut).split(':').map(Number);
  if ([inH, inM, outH, outM].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
};

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const normalizeShiftRecord = (record) => ({
  shiftId: record?.shiftId ?? record?.shift_id ?? null,
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  startTime: record?.startTime ?? record?.start_time ?? '',
  endTime: record?.endTime ?? record?.end_time ?? '',
  isActive: record?.isActive ?? record?.is_active ?? true,
});

const normalizeStaffRecord = (record) => ({
  staffId: record?.staffId ?? record?.staff_id ?? null,
  fullName: record?.fullName ?? record?.full_name ?? record?.name ?? record?.staffName ?? 'Không tên',
  isActive: record?.isActive ?? record?.is_active ?? true,
});

const normalizeAttendanceRecord = (record) => ({
  checkinId: record?.checkinId ?? record?.checkin_id ?? null,
  staffId: record?.staffId ?? record?.staff_id ?? null,
  staffName: record?.staffName ?? record?.staff_name ?? record?.fullName ?? record?.full_name ?? '',
  shiftId: record?.shiftId ?? record?.shift_id ?? null,
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  attendanceDate: String(record?.attendanceDate ?? record?.attendance_date ?? '').slice(0, 10),
  checkInTime: record?.checkInTime ?? record?.check_in_time ?? '',
  checkOutTime: record?.checkOutTime ?? record?.check_out_time ?? '',
  status: record?.status ?? record?.attendanceStatus ?? record?.attendance_status ?? '',
  notes: record?.notes ?? record?.note ?? '',
});

const statusMeta = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'PRESENT') return { label: 'Có mặt', cls: 'badgePresent' };
  if (key === 'LATE') return { label: 'Muộn', cls: 'badgeLate' };
  if (key === 'ABSENT') return { label: 'Vắng', cls: 'badgeAbsent' };
  if (key === 'OFF') return { label: 'Nghỉ', cls: 'badgeOff' };
  return { label: 'Đã vào', cls: 'badgeNeutral' };
};

export default function AttendanceManagement() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => getMonday(new Date()));
  const [pickerViewMode, setPickerViewMode] = useState('days'); // 'days' | 'years'
  const weekPickerRef = useRef(null);
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [records, setRecords] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [error, setError] = useState('');

  const [checkInTarget, setCheckInTarget] = useState(null);
  const [checkInForm, setCheckInForm] = useState({ shiftId: '', checkInTime: '', notes: '' });

  const [detailTarget, setDetailTarget] = useState(null);
  const [checkOutForm, setCheckOutForm] = useState({ checkOutTime: '', notes: '' });

  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [monthRecords, setMonthRecords] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekStartStr = toISODate(weekDates[0]);
  const weekEndStr = toISODate(weekDates[6]);
  const todayStr = toISODate(new Date());

  const loadStaff = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const response = await fetchManagerEmployees(token);
      const list = extractArrayPayload(response)
        .map(normalizeStaffRecord)
        .filter((s) => s.isActive !== false && s.staffId != null)
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
      setStaffList(list);
    } catch (err) {
      toast.error(err?.message || 'Không tải được danh sách nhân viên.');
    }
  }, []);

  const loadShifts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const response = await fetchWorkShifts(token);
      const list = extractArrayPayload(response).map(normalizeShiftRecord).filter((s) => s.isActive !== false);
      setShifts(list);
    } catch {
      setShifts([]);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để xem điểm danh.');
      setLoadingAttendance(false);
      return;
    }
    setLoadingAttendance(true);
    setError('');
    try {
      const response = await fetchManagerAttendance({ from: weekStartStr, to: weekEndStr }, token);
      const list = extractArrayPayload(response).map(normalizeAttendanceRecord);
      setRecords(list);
    } catch (err) {
      setRecords([]);
      setError(err?.message || 'Không tải được dữ liệu điểm danh.');
    } finally {
      setLoadingAttendance(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStaff(), loadShifts()]);
      setLoading(false);
    })();
  }, [loadStaff, loadShifts]);

  useEffect(() => {
    if (!showWeekPicker) return undefined;
    const handleOutsideClick = (e) => {
      if (weekPickerRef.current && !weekPickerRef.current.contains(e.target)) {
        setShowWeekPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showWeekPicker]);

  const pickerDays = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    for (let i = 0; i < offset; i += 1) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d += 1) days.push(new Date(year, month, d));
    return days;
  }, [pickerMonth]);

  const pickerYearOptions = useMemo(() => {
    const start = pickerMonth.getFullYear() - 5;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [pickerMonth]);

  const openWeekPicker = () => {
    setPickerMonth(weekStart);
    setPickerViewMode('days');
    setShowWeekPicker((prev) => !prev);
  };

  const handlePickerHeaderNav = (delta) => {
    if (pickerViewMode === 'years') {
      setPickerMonth((prev) => new Date(prev.getFullYear() + delta * 12, prev.getMonth(), 1));
    } else {
      setPickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    }
  };

  const handleSelectPickerYear = (year) => {
    setPickerMonth((prev) => new Date(year, prev.getMonth(), 1));
    setPickerViewMode('days');
  };

  const handlePickerDayClick = (day) => {
    if (!day) return;
    setWeekStart(getMonday(day));
    setShowWeekPicker(false);
  };

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const loadMonthAttendance = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoadingMonth(true);
    try {
      const { from, to } = getMonthRange(monthDate);
      const response = await fetchManagerAttendance({ from, to }, token);
      setMonthRecords(extractArrayPayload(response).map(normalizeAttendanceRecord));
    } catch (err) {
      toast.error(err?.message || 'Không tải được thống kê tháng.');
      setMonthRecords([]);
    } finally {
      setLoadingMonth(false);
    }
  }, [monthDate]);

  useEffect(() => {
    if (viewMode !== 'month') return;
    loadMonthAttendance();
  }, [viewMode, loadMonthAttendance]);

  const recordMap = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (r.staffId == null || !r.attendanceDate) return;
      map.set(`${r.staffId}_${r.attendanceDate}`, r);
    });
    return map;
  }, [records]);

  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) return staffList;
    return staffList.filter((s) => s.fullName.toLowerCase().includes(query));
  }, [staffList, staffSearch]);

  const navWeek = (delta) => setWeekStart((prev) => addDays(prev, delta * 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  const navMonth = (delta) => setMonthDate((prev) => addMonths(prev, delta));
  const goThisMonth = () => setMonthDate(new Date());

  const monthStats = useMemo(() => {
    const map = new Map();
    filteredStaff.forEach((s) => {
      map.set(s.staffId, {
        staffId: s.staffId,
        fullName: s.fullName,
        present: 0,
        late: 0,
        absent: 0,
        off: 0,
        totalHours: 0,
      });
    });

    monthRecords.forEach((r) => {
      const entry = map.get(r.staffId);
      if (!entry) return;
      const key = String(r.status || '').toUpperCase();
      if (key === 'PRESENT') entry.present += 1;
      else if (key === 'LATE') entry.late += 1;
      else if (key === 'ABSENT') entry.absent += 1;
      else if (key === 'OFF') entry.off += 1;
      entry.totalHours += calcHoursBetween(r.checkInTime, r.checkOutTime);
    });

    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [monthRecords, filteredStaff]);

  const monthTotals = useMemo(() => monthStats.reduce((acc, s) => ({
    present: acc.present + s.present,
    late: acc.late + s.late,
    absent: acc.absent + s.absent,
    off: acc.off + s.off,
    totalHours: acc.totalHours + s.totalHours,
  }), { present: 0, late: 0, absent: 0, off: 0, totalHours: 0 }), [monthStats]);

  const openCheckIn = (staff, dateStr) => {
    setCheckInTarget({ staffId: staff.staffId, staffName: staff.fullName, date: dateStr });
    setCheckInForm({ shiftId: '', checkInTime: '', notes: '' });
  };

  const submitCheckIn = async () => {
    if (!checkInTarget) return;
    if (!checkInForm.shiftId) {
      toast.error('Vui lòng chọn ca làm.');
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    try {
      await managerCheckIn({
        staffId: checkInTarget.staffId,
        shiftId: checkInForm.shiftId,
        attendanceDate: checkInTarget.date,
        checkInTime: checkInForm.checkInTime,
        notes: checkInForm.notes,
      }, token);
      toast.success(`Đã chấm công cho ${checkInTarget.staffName}.`);
      setCheckInTarget(null);
      await loadAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-in thất bại.');
    }
  };

  const openDetail = (record) => {
    setDetailTarget(record);
    setCheckOutForm({ checkOutTime: '', notes: record.notes || '' });
  };

  const submitCheckOut = async () => {
    if (!detailTarget) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await managerCheckOut(detailTarget.checkinId, checkOutForm, token);
      toast.success('Check-out thành công.');
      setDetailTarget(null);
      await loadAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-out thất bại.');
    }
  };

  const deleteDetail = async () => {
    if (!detailTarget) return;
    if (!window.confirm('Xóa bản ghi chấm công này?')) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await managerDeleteCheckin(detailTarget.checkinId, token);
      toast.success('Đã xóa bản ghi.');
      setDetailTarget(null);
      await loadAttendance();
    } catch (err) {
      toast.error(err?.message || 'Xóa thất bại.');
    }
  };

  const weekLabel = `${pad2(weekDates[0].getDate())}/${pad2(weekDates[0].getMonth() + 1)} — ${pad2(weekDates[6].getDate())}/${pad2(weekDates[6].getMonth() + 1)}/${weekDates[6].getFullYear()}`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Chấm công nhân viên</h1>
          <p className={styles.subtitle}>Chọn nhân viên theo tên và bấm vào ô ngày để điểm danh — không cần nhớ mã số.</p>
        </div>
        <button type="button" className={styles.navBtn} onClick={() => navigate('/attendance-locations')}>
          Quản lý vị trí &amp; mã QR
        </button>
      </div>

      <div className={styles.viewTabs}>
        <button
          type="button"
          className={`${styles.viewTabBtn} ${viewMode === 'week' ? styles.viewTabBtnActive : ''}`}
          onClick={() => setViewMode('week')}
        >
          Xem theo tuần
        </button>
        <button
          type="button"
          className={`${styles.viewTabBtn} ${viewMode === 'month' ? styles.viewTabBtnActive : ''}`}
          onClick={() => setViewMode('month')}
        >
          Thống kê theo tháng
        </button>
      </div>

      <div className={styles.toolbar}>
        {viewMode === 'week' ? (
          <div className={styles.weekNav}>
            <button type="button" className={styles.navBtn} onClick={() => navWeek(-1)}>‹ Tuần trước</button>
            <div className={styles.weekPickerWrap} ref={weekPickerRef}>
              <button type="button" className={styles.weekLabelBtn} onClick={openWeekPicker} title="Chọn tuần hiển thị">
                📅 {weekLabel}
              </button>
              {showWeekPicker && (
                <div className={styles.miniCalendarPopup}>
                  <div className={styles.miniCalendarHeader}>
                    <button type="button" className={styles.miniCalendarNavBtn} onClick={() => handlePickerHeaderNav(-1)}>‹</button>
                    <button
                      type="button"
                      className={styles.miniCalendarMonthBtn}
                      onClick={() => setPickerViewMode((m) => (m === 'years' ? 'days' : 'years'))}
                      title="Bấm để chọn nhanh theo năm"
                    >
                      {pickerViewMode === 'years'
                        ? `${pickerYearOptions[0]} - ${pickerYearOptions[pickerYearOptions.length - 1]}`
                        : pickerMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                    </button>
                    <button type="button" className={styles.miniCalendarNavBtn} onClick={() => handlePickerHeaderNav(1)}>›</button>
                  </div>

                  {pickerViewMode === 'years' ? (
                    <div className={styles.miniCalendarYearGrid}>
                      {pickerYearOptions.map((year) => (
                        <button
                          type="button"
                          key={year}
                          className={[
                            styles.miniCalendarYearBtn,
                            year === pickerMonth.getFullYear() ? styles.miniCalendarDaySelected : '',
                            year === new Date().getFullYear() ? styles.miniCalendarDayToday : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => handleSelectPickerYear(year)}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className={styles.miniCalendarWeekDays}>
                        {DOW_LABELS.map((d) => <span key={d}>{d}</span>)}
                      </div>
                      <div className={styles.miniCalendarGrid}>
                        {pickerDays.map((day, index) => {
                          const isInSelectedWeek = day && day >= weekStart && day <= weekDates[6];
                          const isToday = day && day.toDateString() === new Date().toDateString();
                          return (
                            <button
                              type="button"
                              key={day ? day.toISOString() : `empty-${index}`}
                              className={[
                                styles.miniCalendarDay,
                                !day ? styles.miniCalendarDayEmpty : '',
                                isInSelectedWeek ? styles.miniCalendarDaySelected : '',
                                isToday && !isInSelectedWeek ? styles.miniCalendarDayToday : '',
                              ].filter(Boolean).join(' ')}
                              disabled={!day}
                              onClick={() => handlePickerDayClick(day)}
                            >
                              {day ? day.getDate() : ''}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <button type="button" className={styles.navBtn} onClick={() => navWeek(1)}>Tuần sau ›</button>
            <button type="button" className={styles.todayBtn} onClick={goToday}>Tuần này</button>
          </div>
        ) : (
          <div className={styles.weekNav}>
            <button type="button" className={styles.navBtn} onClick={() => navMonth(-1)}>‹ Tháng trước</button>
            <span className={styles.weekLabel}>{MONTHS_VI[monthDate.getMonth()]} {monthDate.getFullYear()}</span>
            <button type="button" className={styles.navBtn} onClick={() => navMonth(1)}>Tháng sau ›</button>
            <button type="button" className={styles.todayBtn} onClick={goThisMonth}>Tháng này</button>
          </div>
        )}
        <div className={styles.searchBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Tìm nhân viên theo tên..."
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
          />
          {staffSearch.trim() && (
            <button type="button" className={styles.searchClearBtn} onClick={() => setStaffSearch('')} aria-label="Xóa tìm kiếm">x</button>
          )}
        </div>
      </div>

      {viewMode === 'week' && (
        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.badgePresent}`} />Có mặt</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.badgeLate}`} />Muộn</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.badgeAbsent}`} />Vắng</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.badgeOff}`} />Nghỉ</span>
        </div>
      )}

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {!loading && error && (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {!loading && !error && viewMode === 'week' && (
        <div className={styles.gridWrapper}>
          {loadingAttendance && <p className={styles.refreshHint}>Đang đồng bộ điểm danh tuần này...</p>}
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={styles.staffHeaderCell}>Nhân viên</th>
                {weekDates.map((d, i) => {
                  const dateStr = toISODate(d);
                  const isToday = dateStr === todayStr;
                  return (
                    <th key={dateStr} className={`${styles.dayHeaderCell} ${isToday ? styles.todayCol : ''}`}>
                      <div className={styles.dayDow}>{DOW_LABELS[i]}</div>
                      <div className={styles.dayDate}>{pad2(d.getDate())}/{pad2(d.getMonth() + 1)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyRowCell}>Không tìm thấy nhân viên phù hợp.</td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.staffId}>
                    <td className={styles.staffCell}>
                      <div className={styles.staffAvatar}>{(staff.fullName || '?')[0]?.toUpperCase()}</div>
                      <span className={styles.staffName}>{staff.fullName}</span>
                    </td>
                    {weekDates.map((d) => {
                      const dateStr = toISODate(d);
                      const record = recordMap.get(`${staff.staffId}_${dateStr}`);
                      const isFuture = dateStr > todayStr;
                      const isToday = dateStr === todayStr;
                      const meta = record ? statusMeta(record.status) : null;
                      return (
                        <td key={dateStr} className={`${styles.dayCell} ${isToday ? styles.todayCol : ''}`}>
                          {record ? (
                            <button
                              type="button"
                              className={`${styles.recordChip} ${styles[meta.cls]}`}
                              onClick={() => openDetail(record)}
                              title={meta.label}
                            >
                              <span>{record.checkInTime ? record.checkInTime.slice(0, 5) : '—'}</span>
                              {record.checkOutTime && <span className={styles.chipCheckout}>↩ {record.checkOutTime.slice(0, 5)}</span>}
                            </button>
                          ) : isFuture ? (
                            <span className={styles.futureDash}>—</span>
                          ) : (
                            <button type="button" className={styles.addBtn} onClick={() => openCheckIn(staff, dateStr)}>
                              + Chấm công
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && viewMode === 'month' && (
        <div className={styles.gridWrapper}>
          {loadingMonth ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Đang tải thống kê tháng...</p>
            </div>
          ) : (
            <table className={styles.monthTable}>
              <thead>
                <tr>
                  <th className={styles.staffHeaderCell}>Nhân viên</th>
                  <th>Có mặt</th>
                  <th>Muộn</th>
                  <th>Vắng</th>
                  <th>Nghỉ</th>
                  <th>Tổng ngày công</th>
                  <th>Tổng giờ làm</th>
                </tr>
              </thead>
              <tbody>
                {monthStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyRowCell}>Không tìm thấy nhân viên phù hợp.</td>
                  </tr>
                ) : (
                  monthStats.map((s) => (
                    <tr key={s.staffId}>
                      <td className={styles.staffCell}>
                        <div className={styles.staffAvatar}>{(s.fullName || '?')[0]?.toUpperCase()}</div>
                        <span className={styles.staffName}>{s.fullName}</span>
                      </td>
                      <td>{s.present}</td>
                      <td>{s.late}</td>
                      <td>{s.absent}</td>
                      <td>{s.off}</td>
                      <td>{s.present + s.late}</td>
                      <td>{s.totalHours.toFixed(1)}h</td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthStats.length > 0 && (
                <tfoot>
                  <tr>
                    <td className={styles.staffCell}><strong>Tổng cộng</strong></td>
                    <td><strong>{monthTotals.present}</strong></td>
                    <td><strong>{monthTotals.late}</strong></td>
                    <td><strong>{monthTotals.absent}</strong></td>
                    <td><strong>{monthTotals.off}</strong></td>
                    <td><strong>{monthTotals.present + monthTotals.late}</strong></td>
                    <td><strong>{monthTotals.totalHours.toFixed(1)}h</strong></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}

      {checkInTarget && (
        <div className={styles.modalOverlay} onClick={() => setCheckInTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Chấm công cho {checkInTarget.staffName}</h3>
                <p className={styles.modalSubtitle}>Ngày {checkInTarget.date}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setCheckInTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ca làm <span className={styles.required}>*</span></label>
                <select
                  className={styles.select}
                  value={checkInForm.shiftId}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, shiftId: e.target.value }))}
                >
                  <option value="">Chọn ca</option>
                  {shifts.map((s) => (
                    <option key={s.shiftId} value={s.shiftId}>
                      {s.shiftName} ({String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Giờ vào (tùy chọn)</label>
                <input
                  className={styles.input}
                  type="time"
                  value={checkInForm.checkInTime}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, checkInTime: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ghi chú</label>
                <input
                  className={styles.input}
                  value={checkInForm.notes}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ghi chú nếu có"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setCheckInTarget(null)}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={submitCheckIn}>✓ Xác nhận check-in</button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className={styles.modalOverlay} onClick={() => setDetailTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{detailTarget.staffName || `NV #${detailTarget.staffId}`}</h3>
                <p className={styles.modalSubtitle}>Ngày {detailTarget.attendanceDate} — Ca {detailTarget.shiftName || '-'}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setDetailTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}><span>Giờ vào</span><strong>{detailTarget.checkInTime || '—'}</strong></div>
              <div className={styles.detailRow}><span>Giờ ra</span><strong>{detailTarget.checkOutTime || '—'}</strong></div>
              <div className={styles.detailRow}><span>Trạng thái</span><strong>{statusMeta(detailTarget.status).label || '—'}</strong></div>

              {!detailTarget.checkOutTime && (
                <div className={styles.formGroup} style={{ marginTop: 12 }}>
                  <label className={styles.label}>Giờ ra (tùy chọn)</label>
                  <input
                    className={styles.input}
                    type="time"
                    value={checkOutForm.checkOutTime}
                    onChange={(e) => setCheckOutForm((p) => ({ ...p, checkOutTime: e.target.value }))}
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>Ghi chú</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={checkOutForm.notes}
                  onChange={(e) => setCheckOutForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.deleteBtn} onClick={deleteDetail}>Xóa bản ghi</button>
              {!detailTarget.checkOutTime && (
                <button type="button" className={styles.saveBtn} onClick={submitCheckOut}>Xác nhận check-out</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
