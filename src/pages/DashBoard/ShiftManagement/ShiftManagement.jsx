import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import styles from './ShiftManagement.module.css';
import {
  fetchAllWorkShifts,
  createWorkShift,
  updateWorkShift,
  deleteWorkShift,
} from '../../../services/workShiftService';
import {
  fetchAttendance,
  createCheckin,
  createCheckout,
  deleteCheckin,
} from '../../../services/attendanceService';
import { fetchAllStaff } from '../../../services/adminService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  return String(timeStr).substring(0, 5);
};

const toDateStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toDateKey = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') return dateVal.substring(0, 10);
  if (dateVal instanceof Date) return toDateStr(dateVal);
  return null;
};

const isWeekend = (d) => d && (d.getDay() === 0 || d.getDay() === 6);
const isToday = (d) => d && d.toDateString() === new Date().toDateString();

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
};

// ─── Shift Form Modal ────────────────────────────────────────────────────────
function ShiftFormModal({ shift, onClose, onSuccess }) {
  const isEdit = Boolean(shift);
  const [form, setForm] = useState({
    shiftName: shift?.shiftName || '',
    startTime: shift?.startTime ? formatTime(shift.startTime) : '',
    endTime: shift?.endTime ? formatTime(shift.endTime) : '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.shiftName.trim()) errs.shiftName = 'Vui lòng nhập tên ca làm việc';
    if (!form.startTime) errs.startTime = 'Vui lòng chọn giờ bắt đầu';
    if (!form.endTime) errs.endTime = 'Vui lòng chọn giờ kết thúc';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      errs.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu';
    }
    return errs;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload = {
        shiftName: form.shiftName.trim(),
        startTime: form.startTime + ':00',
        endTime: form.endTime + ':00',
      };
      if (isEdit) {
        await updateWorkShift(shift.shiftId, payload);
        toast.success(`Đã cập nhật ca "${form.shiftName.trim()}" thành công!`);
      } else {
        await createWorkShift(payload);
        toast.success(`Đã tạo ca "${form.shiftName.trim()}" thành công!`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>{isEdit ? 'Chỉnh sửa ca' : 'Thêm ca làm việc mới'}</h3>
            <p className={styles.modalSubtitle}>
              {isEdit ? `Mã ca: #${shift.shiftId}` : 'Điền thông tin ca làm việc'}
            </p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên ca làm việc <span className={styles.requiredMark}>*</span></label>
              <input type="text" className={styles.formInput} placeholder="VD: Ca Sáng, Ca Chiều"
                value={form.shiftName} onChange={(e) => handleChange('shiftName', e.target.value)} maxLength={100} autoFocus />
              {errors.shiftName && <span className={styles.formError}>{errors.shiftName}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thời gian làm việc <span className={styles.requiredMark}>*</span></label>
              <div className={styles.timeInputs}>
                <input type="time" className={styles.formInput} value={form.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)} />
                <span className={styles.timeSep}>→</span>
                <input type="time" className={styles.formInput} value={form.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)} />
              </div>
              {(errors.startTime || errors.endTime) && (
                <span className={styles.formError}>{errors.startTime || errors.endTime}</span>
              )}
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>Hủy</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo ca làm việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ────────────────────────────────────────────────────
function DeleteConfirmModal({ shift, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm(shift.shiftId);
      toast.success(`Đã xóa ca "${shift.shiftName}"`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Không thể xóa ca làm việc.');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader} style={{ background: '#ef4444' }}>
          <div>
            <h3 className={styles.modalTitle}>Xác nhận xóa</h3>
            <p className={styles.modalSubtitle}>Hành động này không thể hoàn tác</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.confirmBody}>
          <div className={styles.confirmIcon}>⚠️</div>
          <h4 className={styles.confirmTitle}>Bạn có chắc chắn muốn xóa ca làm việc này?</h4>
          <p className={styles.confirmMessage}>
            Ca <span className={styles.confirmName}>"{shift.shiftName}"</span> ({formatTime(shift.startTime)} → {formatTime(shift.endTime)}) sẽ bị xóa.
          </p>
        </div>
        <div className={styles.confirmFooter}>
          <button className={styles.confirmCancelBtn} onClick={onClose} disabled={deleting}>Hủy bỏ</button>
          <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Đang xử lý...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Modal ────────────────────────────────────────────────────────
function AttendanceModal({ date, shifts, staffList, existingCheckins, onClose, onRefresh }) {
  const dateStr = toDateKey(date) || toDateStr(date);
  const fmtDate = (d) => {
    if (!d) return '';
    const dd = new Date(d);
    return dd.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Lấy checkin của ngày này từ existingCheckins
  const dayCheckins = existingCheckins.filter(c => toDateKey(c.attendanceDate) === dateStr);

  const [rows, setRows] = useState(() =>
    staffList.map((staff) => {
      const staffCheckins = dayCheckins.filter(c => c.staffId === staff.staffId || c.staffId === staff.id);
      return {
        staffId: staff.staffId || staff.id,
        fullName: staff.fullName || staff.name || '',
        phone: staff.phone || '',
        role: staff.position || staff.role || 'KTV',
        // Tất cả checkins của nhân viên trong ngày này
        checkins: staffCheckins.map(c => ({
          checkinId: c.checkinId,
          shiftId: c.shiftId,
          shiftName: c.shiftName,
          checkIn: formatTime(c.checkInTime),
          checkOut: formatTime(c.checkOutTime),
          status: c.status,
          isCheckedOut: !!c.checkOutTime,
        })),
      };
    })
  );

  const toggleShift = async (staffId, shiftId, isCheckedInForThisShift) => {
    if (isCheckedInForThisShift) {
      // Hủy check-in cho shift cụ thể
      const checkin = rows.find(r => r.staffId === staffId)?.checkins.find(c => c.shiftId === shiftId);
      if (checkin?.checkinId) {
        try {
          await deleteCheckin(checkin.checkinId);
          setRows(prev => prev.map(r => {
            if (r.staffId !== staffId) return r;
            return { ...r, checkins: r.checkins.filter(c => c.shiftId !== shiftId) };
          }));
          toast.success('Đã hủy điểm danh');
        } catch {
          toast.error('Không thể hủy điểm danh');
        }
      }
    } else {
      // Check-in cho shift
      try {
        const res = await createCheckin({
          staffId,
          shiftId,
          attendanceDate: dateStr,
          checkInTime: new Date().toTimeString().substring(0, 5),
        });
        const newCheckin = res?.data || res;
        const shift = shifts.find(s => s.shiftId === shiftId);
        setRows(prev => prev.map(r => {
          if (r.staffId !== staffId) return r;
          const exists = r.checkins.find(c => c.shiftId === shiftId);
          if (exists) return r;
          return {
            ...r,
            checkins: [...r.checkins, {
              checkinId: newCheckin.checkinId,
              shiftId,
              shiftName: shift?.shiftName || '',
              checkIn: formatTime(newCheckin.checkInTime),
              checkOut: '',
              status: 'PRESENT',
              isCheckedOut: false,
            }]
          };
        }));
        toast.success(`Đã check-in thành công`);
      } catch (err) {
        toast.error(err.message || 'Không thể check-in');
      }
    }
  };

  const handleCheckout = async (staffId, shiftId) => {
    const checkin = rows.find(r => r.staffId === staffId)?.checkins.find(c => c.shiftId === shiftId);
    if (!checkin?.checkinId) return;
    try {
      const res = await createCheckout(checkin.checkinId, {
        checkOutTime: new Date().toTimeString().substring(0, 5),
      });
      const updated = res?.data || res;
      setRows(prev => prev.map(r => {
        if (r.staffId !== staffId) return r;
        return {
          ...r,
          checkins: r.checkins.map(c =>
            c.shiftId === shiftId
              ? { ...c, checkOut: formatTime(updated.checkOutTime), isCheckedOut: true }
              : c
          )
        };
      }));
      toast.success('Đã check-out thành công');
    } catch (err) {
      toast.error(err.message || 'Không thể check-out');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Điểm danh</h3>
            <p className={styles.modalSubtitle}>{fmtDate(date)}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Header: ca làm việc */}
        <div style={{ padding: '0 24px 12px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            {shifts.map(shift => (
              <div key={shift.shiftId} style={{ textAlign: 'center', padding: '8px', background: '#f0f4ff', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e40af' }}>{shift.shiftName}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(shift.startTime)} → {formatTime(shift.endTime)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, position: 'sticky', top: 0, background: '#f8fafc' }}>Nhân viên</th>
                {shifts.map(shift => (
                  <th key={shift.shiftId} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 700, position: 'sticky', top: 0, background: '#f8fafc' }}>
                    {shift.shiftName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staffId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{row.fullName}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.phone}</div>
                  </td>
                  {shifts.map(shift => {
                    const checkin = row.checkins.find(c => c.shiftId === shift.shiftId);
                    const isChecked = !!checkin;
                    return (
                      <td key={shift.shiftId} style={{ padding: '8px', textAlign: 'center' }}>
                        {isChecked ? (
                          <div>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '2px' }}>
                              ✓ {checkin.checkIn}
                              {checkin.isCheckedOut && ` → ${checkin.checkOut}`}
                            </div>
                            {!checkin.isCheckedOut && (
                              <button
                                onClick={() => handleCheckout(row.staffId, shift.shiftId)}
                                style={{
                                  fontSize: '11px',
                                  background: '#f59e0b',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  cursor: 'pointer',
                                }}
                              >
                                Check-out
                              </button>
                            )}
                            <div>
                              <button
                                onClick={() => toggleShift(row.staffId, shift.shiftId, true)}
                                style={{
                                  fontSize: '10px',
                                  background: 'none',
                                  color: '#ef4444',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  marginTop: '2px',
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleShift(row.staffId, shift.shiftId, false)}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            Check-in
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={() => { if (onRefresh) onRefresh(); onClose(); }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [deleteShift, setDeleteShift] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // ── Load Shifts ─────────────────────────────────────────────────────────────
  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const res = await fetchAllWorkShifts();
      const data = Array.isArray(res?.data) ? res.data : [];
      setShifts(data.filter(s => s.isActive !== false));
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách ca');
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  // ── Load Staff ──────────────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    try {
      const res = await fetchAllStaff();
      const data = Array.isArray(res?.data) ? res.data : [];
      setStaffList(data);
    } catch (err) {
      setStaffList([]);
    }
  }, []);

  // ── Load Attendance ─────────────────────────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    try {
      const res = await fetchAttendance({
        from: toDateStr(firstDay),
        to: toDateStr(lastDay),
      });
      const data = Array.isArray(res?.data) ? res.data : [];
      setAttendanceData(data);
    } catch {
      setAttendanceData([]);
    }
  }, [currentMonth]);

  useEffect(() => { loadShifts(); loadStaff(); }, [loadShifts, loadStaff]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAdd = () => { setEditShift(null); setShowFormModal(true); };
  const handleEdit = (shift) => { setEditShift(shift); setShowFormModal(true); };
  const handleDeleteClick = (shift) => { setDeleteShift(shift); setShowDeleteModal(true); };
  const handleDeleteConfirm = async (shiftId) => {
    await deleteWorkShift(shiftId);
    await loadShifts();
  };
  const handleFormSuccess = () => { loadShifts(); loadAttendance(); };

  const goPrev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goNext = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToday = () => setCurrentMonth(new Date());
  const openModal = (day) => setActiveModal({ date: day });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const monthLabel = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);
  const todayStr = toDateStr(new Date());
  const todayCheckins = attendanceData.filter(a => toDateKey(a.attendanceDate) === todayStr);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ca & Điểm danh</h1>
          <p className={styles.subtitle}>Quản lý ca làm việc và điểm danh nhân viên</p>
        </div>
        <button className={styles.addBtn} onClick={handleAdd}>＋ Thêm ca làm việc</button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{shifts.length}</div>
          <div className={styles.statLabel}>Tổng ca làm việc</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{staffList.length}</div>
          <div className={styles.statLabel}>Tổng nhân viên</div>
        </div>
        <div className={`${styles.statCard} ${styles.statLate}`}>
          <div className={styles.statValue}>{todayCheckins.length}</div>
          <div className={styles.statLabel}>Đã điểm danh hôm nay</div>
        </div>
      </div>

      {/* ── PHẦN 1: DANH SÁCH CA ─────────────────────────────────────────────── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Danh sách ca làm việc</h2>
        </div>
        <div className={styles.tableWrapper}>
          {loadingShifts ? (
            <div className={styles.loadingWrapper}><div className={styles.spinner} /></div>
          ) : shifts.length === 0 ? (
            <div className={styles.emptyWrapper}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyText}>Chưa có ca làm việc nào.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên ca</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift, idx) => (
                  <tr key={shift.shiftId}>
                    <td className={styles.tdStt}>{idx + 1}</td>
                    <td className={styles.tdShiftName}>{shift.shiftName}</td>
                    <td className={styles.tdTime}>{formatTime(shift.startTime)}</td>
                    <td className={styles.tdTime}>{formatTime(shift.endTime)}</td>
                    <td className={styles.tdStatus}>
                      <span className={`${styles.statusBadge} ${shift.isActive ? styles.statusActive : styles.statusInactive}`}>
                        <span className={styles.statusDot} />
                        {shift.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </span>
                    </td>
                    <td className={styles.tdActions}>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleEdit(shift)}>Sửa</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteClick(shift)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── PHẦN 2: LỊCH ĐIỂM DANH ──────────────────────────────────────────── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Lịch điểm danh</h2>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={goPrev}>◀</button>
            <button className={styles.currentMonth} onClick={goToday}>{monthLabel}</button>
            <button className={styles.navBtn} onClick={goNext}>▶</button>
          </div>
        </div>

        <div className={styles.calendarCard}>
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                <div key={i} className={styles.weekDay}>{d}</div>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className={styles.emptyCell} />;
                const dateStr = toDateStr(day);
                const today = isToday(day);
                const weekend = isWeekend(day);
                const dayCheckins = attendanceData.filter(a => toDateKey(a.attendanceDate) === dateStr);

                return (
                  <div key={dateStr} className={`${styles.dayCell} ${today ? styles.today : ''} ${weekend ? styles.weekend : ''}`}>
                    <div className={`${styles.dayNumber} ${today ? styles.dayNumberToday : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className={styles.shiftButtons}>
                      {shifts.map((shift) => {
                        const shiftCheckins = dayCheckins.filter(c => c.shiftId === shift.shiftId);
                        const hasData = shiftCheckins.length > 0;

                        return (
                          <button key={shift.shiftId}
                            className={`${styles.shiftBtn} ${hasData ? styles.shiftBtnActive : ''}`}
                            onClick={() => openModal(day)}>
                            <span className={styles.shiftBtnLabel}>{shift.shiftName}</span>
                            <span className={styles.shiftBtnTime}>{formatTime(shift.startTime)} → {formatTime(shift.endTime)}</span>
                            {hasData ? (
                              <div className={styles.shiftBtnStats}>
                                <span className={styles.statPresent}>{shiftCheckins.length}/{staffList.length}</span>
                              </div>
                            ) : (
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

        <div className={styles.legend}>
          <div className={styles.legendTitle}>Chú thích:</div>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#10b981' }} />
              <span>Đã điểm danh</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#9ca3af' }} />
              <span>Chưa điểm danh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFormModal && (
        <ShiftFormModal shift={editShift} onClose={() => setShowFormModal(false)} onSuccess={handleFormSuccess} />
      )}
      {showDeleteModal && deleteShift && (
        <DeleteConfirmModal shift={deleteShift} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteConfirm} />
      )}
      {activeModal && (
        <AttendanceModal
          date={activeModal.date}
          shifts={shifts}
          staffList={staffList}
          existingCheckins={attendanceData}
          onClose={() => setActiveModal(null)}
          onRefresh={loadAttendance}
        />
      )}
    </div>
  );
};

export default ShiftManagement;
