import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createWorkShift,
  deactivateWorkShift,
  fetchWorkShifts,
  fetchManagerAttendance,
  updateWorkShift,
} from '../../../services/managerService.js';
import styles from './ShiftManagement.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

const defaultForm = {
  shiftName: '',
  startTime: '',
  endTime: '',
  isActive: true,
};

export default function ShiftManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState('');

  const [openModal, setOpenModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const [viewShiftModal, setViewShiftModal] = useState(null); // shift being viewed
  const [shiftAttendances, setShiftAttendances] = useState([]);
  const [loadingShiftAttendances, setLoadingShiftAttendances] = useState(false);

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để quản lý ca làm việc.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchWorkShifts(token);
      setShifts(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setShifts([]);
      setError(err?.message || 'Không tải được danh sách ca làm việc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter((s) =>
      `${s?.shiftId ?? ''} ${s?.shiftName ?? ''} ${s?.startTime ?? ''} ${s?.endTime ?? ''}`.toLowerCase().includes(q),
    );
  }, [shifts, search]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter((s) => s?.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [shifts]);

  const resetModal = () => {
    setOpenModal(false);
    setEditingShift(null);
    setForm(defaultForm);
  };

  const openCreate = () => {
    setEditingShift(null);
    setForm(defaultForm);
    setOpenModal(true);
  };

  const openEdit = (shift) => {
    setEditingShift(shift);
    setForm({
      shiftName: shift?.shiftName || '',
      startTime: String(shift?.startTime || '').slice(0, 5),
      endTime: String(shift?.endTime || '').slice(0, 5),
      isActive: shift?.isActive !== false,
    });
    setOpenModal(true);
  };

  const handleSave = async () => {
    const token = getAuthToken();
    if (!token) return;

    if (!form.shiftName || !form.startTime || !form.endTime) {
      toast.error('Vui lòng nhập đầy đủ tên ca, giờ bắt đầu và giờ kết thúc.');
      return;
    }

    try {
      if (editingShift?.shiftId) {
        await updateWorkShift(editingShift.shiftId, form, token);
        toast.success('Cập nhật ca làm việc thành công.');
      } else {
        await createWorkShift(form, token);
        toast.success('Tạo ca làm việc thành công.');
      }
      resetModal();
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Lưu ca làm việc thất bại.');
    }
  };

  const handleDeactivate = async (shiftId) => {
    if (!window.confirm('Bạn chắc chắn muốn vô hiệu hóa ca làm việc này?')) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await deactivateWorkShift(shiftId, token);
      toast.success('Đã vô hiệu hóa ca làm việc.');
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Thao tác thất bại.');
    }
  };

  // Xem danh sách nhân viên theo ca
  const handleViewShift = async (shift) => {
    setViewShiftModal(shift);
    setShiftAttendances([]);
    setLoadingShiftAttendances(true);

    const token = getAuthToken();
    if (!token) {
      setLoadingShiftAttendances(false);
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const response = await fetchManagerAttendance({ from: firstDay, to: today }, token);
      const allRecords = Array.isArray(response?.data) ? response.data : [];

      // Lọc theo shiftId
      const matched = allRecords.filter(r => r.shiftId === shift.shiftId);
      setShiftAttendances(matched);
    } catch {
      setShiftAttendances([]);
    } finally {
      setLoadingShiftAttendances(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PRESENT': return styles.statusPresent;
      case 'LATE': return styles.statusLate;
      case 'ABSENT': return styles.statusAbsent;
      case 'OFF': return styles.statusOff;
      default: return styles.statusNotYet;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PRESENT': return 'Có mặt';
      case 'LATE': return 'Muộn';
      case 'ABSENT': return 'Vắng';
      case 'OFF': return 'Nghỉ';
      default: return status || '-';
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý ca làm việc</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={loadData}>↻ Làm mới</button>
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>+ Thêm ca</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <p className={styles.statLabel}>Tổng ca</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <p className={styles.statLabel}>Đang hoạt động</p>
          <p className={styles.statValue}>{stats.active}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <p className={styles.statLabel}>Đã vô hiệu</p>
          <p className={styles.statValue}>{stats.inactive}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên ca, thời gian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải ca làm việc...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠</div>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🕐</div>
          <p className={styles.emptyTitle}>Không có ca làm việc phù hợp</p>
          <p className={styles.emptyMessage}>Thử thay đổi từ khóa tìm kiếm.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên ca</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Trạng thái</th>
                <th>Tạo lúc</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((shift) => (
                <tr key={shift.shiftId}>
                  <td>#{shift.shiftId}</td>
                  <td className={styles.shiftName}>{shift.shiftName || '-'}</td>
                  <td>{String(shift.startTime || '').slice(0, 5)}</td>
                  <td>{String(shift.endTime || '').slice(0, 5)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${shift.isActive !== false ? styles.statusActive : styles.statusInactive}`}>
                      {shift.isActive !== false ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td>{shift.createdAt ? new Date(shift.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button type="button" className={styles.viewBtn} onClick={() => handleViewShift(shift)}>
                        Xem
                      </button>
                      <button type="button" className={styles.editBtn} onClick={() => openEdit(shift)}>
                        Sửa
                      </button>
                      {shift.isActive !== false && (
                        <button type="button" className={styles.deactivateBtn} onClick={() => handleDeactivate(shift.shiftId)}>
                          Vô hiệu hóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tạo / sửa ca */}
      {openModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  {editingShift ? 'Cập nhật ca làm việc' : 'Tạo ca làm việc mới'}
                </h3>
                <p className={styles.modalSubtitle}>
                  {editingShift ? `Chỉnh sửa ca #${editingShift.shiftId}` : 'Thêm một ca làm việc mới cho hệ thống'}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={resetModal}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên ca <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    placeholder="Ví dụ: Ca sáng, Ca chiều"
                    value={form.shiftName}
                    onChange={(e) => setForm((p) => ({ ...p, shiftName: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Trạng thái</label>
                  <select
                    className={styles.select}
                    value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'ACTIVE' }))}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Vô hiệu</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giờ bắt đầu <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giờ kết thúc <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={resetModal}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={handleSave}>
                {editingShift ? 'Lưu thay đổi' : 'Tạo ca mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem danh sách nhân viên theo ca */}
      {viewShiftModal && (
        <div className={styles.modalOverlay} onClick={() => setViewShiftModal(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Danh sách nhân viên ca {viewShiftModal.shiftName}</h3>
                <p className={styles.modalSubtitle}>
                  Ca làm: {String(viewShiftModal.startTime || '').slice(0, 5)} — {String(viewShiftModal.endTime || '').slice(0, 5)} · {shiftAttendances.length} bản ghi
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setViewShiftModal(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {loadingShiftAttendances ? (
                <div className={styles.loadingContainer} style={{ minHeight: '200px' }}>
                  <div className={styles.spinner}></div>
                  <p>Đang tải dữ liệu chấm công...</p>
                </div>
              ) : shiftAttendances.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📋</div>
                  <p className={styles.emptyTitle}>Chưa có ai điểm danh ca này</p>
                  <p className={styles.emptyMessage}>Không có bản ghi chấm công nào cho ca {viewShiftModal.shiftName} trong tháng này.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Nhân viên</th>
                        <th>Ngày</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftAttendances.map((r, idx) => (
                        <tr key={r.checkinId || idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left' }}>{r.staffName || `ID ${r.staffId}`}</td>
                          <td>{r.attendanceDate || '-'}</td>
                          <td>{r.checkInTime || '-'}</td>
                          <td>{r.checkOutTime || '-'}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(r.status)}`}>
                              {getStatusLabel(r.status)}
                            </span>
                          </td>
                          <td>{r.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setViewShiftModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
