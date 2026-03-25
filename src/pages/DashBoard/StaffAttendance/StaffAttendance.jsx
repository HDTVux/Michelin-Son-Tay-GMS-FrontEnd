import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  fetchManagerAttendance,
  fetchManagerTodaySummary,
  fetchWorkShifts,
  managerCheckIn,
  managerCheckOut,
  managerDeleteCheckin,
} from '../../../services/managerService.js';
import styles from './StaffAttendance.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

const today = new Date().toISOString().slice(0, 10);
const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

const statusMeta = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'PRESENT') return { label: 'Có mặt', cls: styles.statusPresent };
  if (key === 'LATE') return { label: 'Muộn', cls: styles.statusLate };
  if (key === 'ABSENT') return { label: 'Vắng', cls: styles.statusAbsent };
  if (key === 'OFF') return { label: 'Nghỉ', cls: styles.statusOff };
  return { label: key || '-', cls: styles.statusNotYet };
};

export default function StaffAttendance() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [staffIdFilter, setStaffIdFilter] = useState('');

  const [shifts, setShifts] = useState([]);
  const [checkInForm, setCheckInForm] = useState({
    staffId: '',
    shiftId: '',
    attendanceDate: today,
    checkInTime: '',
    notes: '',
  });

  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ checkOutTime: '', notes: '' });

  const loadShifts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const response = await fetchWorkShifts(token);
      const list = Array.isArray(response?.data) ? response.data : [];
      setShifts(list.filter((s) => s?.isActive !== false));
    } catch {
      setShifts([]);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const response = await fetchManagerTodaySummary({ date: toDate || today }, token);
      setSummary(response?.data || null);
    } catch {
      setSummary(null);
    }
  }, [toDate]);

  const loadAttendance = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để sử dụng màn chấm công.');
      return;
    }

    if (!fromDate || !toDate) {
      setError('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchManagerAttendance(
        {
          staffId: staffIdFilter ? Number(staffIdFilter) : undefined,
          from: fromDate,
          to: toDate,
        },
        token,
      );

      const list = Array.isArray(response?.data) ? response.data : [];
      setRecords(list);
      await loadSummary();
    } catch (err) {
      setRecords([]);
      setError(err?.message || 'Không tải được dữ liệu chấm công.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, staffIdFilter, loadSummary]);

  useEffect(() => {
    loadShifts();
    loadAttendance();
  }, [loadShifts, loadAttendance]);

  const stats = useMemo(() => {
    const total = records.length;
    const checkedOut = records.filter((r) => r?.checkOutTime).length;
    const present = records.filter((r) => String(r?.status || '').toUpperCase() === 'PRESENT').length;
    return { total, checkedOut, present };
  }, [records]);

  const handleCheckIn = async () => {
    const token = getAuthToken();
    if (!token) return;

    if (!checkInForm.staffId || !checkInForm.shiftId) {
      toast.error('Vui lòng chọn nhân viên và ca làm.');
      return;
    }

    try {
      await managerCheckIn(checkInForm, token);
      toast.success('Check-in thành công.');
      setCheckInForm((prev) => ({ ...prev, notes: '', checkInTime: '' }));
      await loadAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-in thất bại.');
    }
  };

  const handleCheckOut = async () => {
    if (!checkoutTarget) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await managerCheckOut(checkoutTarget.checkinId, checkoutForm, token);
      toast.success('Check-out thành công.');
      setCheckoutTarget(null);
      setCheckoutForm({ checkOutTime: '', notes: '' });
      await loadAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-out thất bại.');
    }
  };

  const handleDelete = async (checkinId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bản ghi chấm công này?')) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await managerDeleteCheckin(checkinId, token);
      toast.success('Đã xóa bản ghi.');
      await loadAttendance();
    } catch (err) {
      toast.error(err?.message || 'Xóa thất bại.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffAvatar}>📋</div>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Quản lý chấm công nhân viên</h1>
            <p className={styles.subtitle}>Theo dõi và quản lý điểm danh hàng ngày</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <p className={styles.statLabel}>Tổng bản ghi</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statPresent}`}>
          <p className={styles.statLabel}>Đã check-out</p>
          <p className={styles.statValue}>{stats.checkedOut}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statPresent}`}>
          <p className={styles.statLabel}>Trạng thái Có mặt</p>
          <p className={styles.statValue}>{stats.present}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <p className={styles.statLabel}>Tổng nhân sự hôm nay</p>
          <p className={styles.statValue}>{summary?.totalStaff ?? 0}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarField}>
          <label className={styles.toolbarLabel}>Từ ngày</label>
          <input
            className={styles.toolbarInput}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className={styles.toolbarField}>
          <label className={styles.toolbarLabel}>Đến ngày</label>
          <input
            className={styles.toolbarInput}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className={styles.toolbarField}>
          <label className={styles.toolbarLabel}>Lọc theo Staff ID</label>
          <input
            className={styles.toolbarInput}
            type="number"
            value={staffIdFilter}
            onChange={(e) => setStaffIdFilter(e.target.value)}
            placeholder="Ví dụ: 12"
          />
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.primaryBtn} onClick={loadAttendance}>
            Tải dữ liệu
          </button>
          <button type="button" className={styles.ghostBtn} onClick={loadSummary}>
            Tải tổng hợp hôm nay
          </button>
        </div>
      </div>

      {/* Check-in Panel */}
      <div className={styles.checkinPanel}>
        <div className={styles.checkinPanelHeader}>
          <h3 className={styles.checkinPanelTitle}>📌 Check-in nhanh</h3>
        </div>
        <div className={styles.checkinForm}>
          <div className={styles.checkinField}>
            <label className={styles.checkinLabel}>Staff ID</label>
            <input
              className={styles.checkinInput}
              type="number"
              value={checkInForm.staffId}
              onChange={(e) => setCheckInForm((p) => ({ ...p, staffId: e.target.value }))}
              placeholder="Nhập ID nhân viên"
            />
          </div>
          <div className={styles.checkinField}>
            <label className={styles.checkinLabel}>Ca làm</label>
            <select
              className={styles.checkinSelect}
              value={checkInForm.shiftId}
              onChange={(e) => setCheckInForm((p) => ({ ...p, shiftId: e.target.value }))}
            >
              <option value="">Chọn ca</option>
              {shifts.map((shift) => (
                <option key={shift.shiftId} value={shift.shiftId}>
                  {shift.shiftName} ({String(shift.startTime || '').slice(0, 5)}-{String(shift.endTime || '').slice(0, 5)})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.checkinField}>
            <label className={styles.checkinLabel}>Ngày chấm công</label>
            <input
              className={styles.checkinInput}
              type="date"
              value={checkInForm.attendanceDate}
              onChange={(e) => setCheckInForm((p) => ({ ...p, attendanceDate: e.target.value }))}
            />
          </div>
          <div className={styles.checkinField}>
            <label className={styles.checkinLabel}>Giờ vào (tùy chọn)</label>
            <input
              className={styles.checkinInput}
              type="time"
              value={checkInForm.checkInTime}
              onChange={(e) => setCheckInForm((p) => ({ ...p, checkInTime: e.target.value }))}
            />
          </div>
          <div className={styles.checkinField}>
            <label className={styles.checkinLabel}>Ghi chú</label>
            <input
              className={styles.checkinInput}
              value={checkInForm.notes}
              onChange={(e) => setCheckInForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ghi chú nếu có"
            />
          </div>
          <div className={styles.checkinField}>
            <label className={styles.checkinLabel}>&nbsp;</label>
            <button type="button" className={styles.checkinBtn} onClick={handleCheckIn}>
              ✓ Check-in
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠</div>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu chấm công...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && records.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyTitle}>Không có bản ghi nào</p>
          <p className={styles.emptyMessage}>Không có dữ liệu trong khoảng ngày đã chọn.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && records.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nhân viên</th>
                <th>Ngày</th>
                <th>Ca</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => {
                const meta = statusMeta(row?.status);
                return (
                  <tr key={row.checkinId}>
                    <td>#{row.checkinId}</td>
                    <td className={styles.staffCell}>
                      <div className={styles.staffAvatar2}>{row.staffName ? row.staffName[0]?.toUpperCase() : '?'}</div>
                      <div>
                        <div className={styles.staffCellName}>{row.staffName || `ID ${row.staffId}`}</div>
                        <div className={styles.staffCellSub}>#{row.staffId}</div>
                      </div>
                    </td>
                    <td>{row.attendanceDate || '-'}</td>
                    <td className={styles.shiftCell}>{row.shiftName || `Shift ${row.shiftId || '-'}`}</td>
                    <td>{row.checkInTime || '-'}</td>
                    <td>{row.checkOutTime || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td className={styles.noteCell}>{row.notes || '-'}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        {!row.checkOutTime && (
                          <button
                            type="button"
                            className={styles.checkoutBtn}
                            onClick={() => {
                              setCheckoutTarget(row);
                              setCheckoutForm({ checkOutTime: '', notes: row.notes || '' });
                            }}
                          >
                            Check-out
                          </button>
                        )}
                        <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(row.checkinId)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Check-out #{checkoutTarget.checkinId}</h3>
                <p className={styles.modalSubtitle}>
                  Nhân viên: {checkoutTarget.staffName || `ID ${checkoutTarget.staffId}`} — Ca: {checkoutTarget.shiftName || '-'}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setCheckoutTarget(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giờ ra (tùy chọn)</label>
                  <input
                    className={styles.input}
                    type="time"
                    value={checkoutForm.checkOutTime}
                    onChange={(e) => setCheckoutForm((p) => ({ ...p, checkOutTime: e.target.value }))}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Ghi chú</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={checkoutForm.notes}
                    onChange={(e) => setCheckoutForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Nhập ghi chú nếu có..."
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setCheckoutTarget(null)}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={handleCheckOut}>Xác nhận check-out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
