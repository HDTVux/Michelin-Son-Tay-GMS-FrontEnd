import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './ShiftManagement.module.css';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SHIFTS = [
  {
    shiftId: 1,
    shiftName: 'Ca sáng',
    startTime: '07:00',
    endTime: '12:00',
    workingDays: 'T2, T3, T4, T5, T6',
    staffCount: 8,
    status: 'ACTIVE',
    description: 'Ca làm việc buổi sáng, tiếp nhận xe từ 7h00',
  },
  {
    shiftId: 2,
    shiftName: 'Ca chiều',
    startTime: '13:00',
    endTime: '18:00',
    workingDays: 'T2, T3, T4, T5, T6',
    staffCount: 6,
    status: 'ACTIVE',
    description: 'Ca làm việc buổi chiều, tiếp tục các công việc còn lại',
  },
  {
    shiftId: 3,
    shiftName: 'Ca tối',
    startTime: '18:00',
    endTime: '22:00',
    workingDays: 'T2, T3, T4, T5, T6',
    staffCount: 4,
    status: 'ACTIVE',
    description: 'Ca làm việc buổi tối, hoàn thiện công việc trong ngày',
  },
  {
    shiftId: 4,
    shiftName: 'Ca cuối tuần',
    startTime: '08:00',
    endTime: '17:00',
    workingDays: 'T7, CN',
    staffCount: 5,
    status: 'INACTIVE',
    description: 'Ca làm việc cuối tuần phục vụ khách hàng',
  },
  {
    shiftId: 5,
    shiftName: 'Ca đêm',
    startTime: '22:00',
    endTime: '06:00',
    workingDays: 'T2, T3, T4, T5, T6',
    staffCount: 2,
    status: 'LOCKED',
    description: 'Ca trực đêm, xử lý sự cố kỹ thuật',
  },
];

// ─── Status helpers ────────────────────────────────────────────────────────────

const getStatusMeta = (status) => {
  switch (status) {
    case 'ACTIVE':   return { cls: 'statusActive',   label: 'Hoạt động' };
    case 'INACTIVE': return { cls: 'statusInactive', label: 'Ngưng hoạt động' };
    case 'LOCKED':   return { cls: 'statusLocked',   label: 'Đã khóa' };
    default:         return { cls: 'statusInactive', label: status || '-' };
  }
};

// ─── Create/Edit Modal ─────────────────────────────────────────────────────────

function ShiftModal({ shift, onClose, onSave }) {
  const [formData, setFormData] = useState({
    shiftName: shift?.shiftName || '',
    startTime: shift?.startTime || '07:00',
    endTime: shift?.endTime || '12:00',
    workingDays: shift?.workingDays || 'T2, T3, T4, T5, T6',
    description: shift?.description || '',
    status: shift?.status || 'ACTIVE',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.shiftName.trim()) errs.shiftName = 'Tên ca không được để trống';
    if (!formData.startTime) errs.startTime = 'Giờ bắt đầu không được để trống';
    if (!formData.endTime) errs.endTime = 'Giờ kết thúc không được để trống';
    if (!formData.workingDays.trim()) errs.workingDays = 'Ngày làm việc không được để trống';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errs.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
    }
    return errs;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);

    toast.success(shift ? 'Cập nhật ca làm việc thành công!' : 'Tạo ca làm việc thành công!');
    onSave({ ...formData, shiftId: shift?.shiftId || Date.now() });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{shift ? 'Chỉnh sửa ca làm việc' : 'Tạo ca làm việc mới'}</h3>
          <button className={styles.modalClose} onClick={onClose}>X</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            {/* Tên ca */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                Tên ca <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.shiftName ? styles.inputError : ''}`}
                value={formData.shiftName}
                onChange={(e) => handleChange('shiftName', e.target.value)}
                placeholder="VD: Ca sáng, Ca chiều"
              />
              {errors.shiftName && <span className={styles.errorText}>{errors.shiftName}</span>}
            </div>

            {/* Giờ bắt đầu */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Giờ bắt đầu <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                className={`${styles.input} ${errors.startTime ? styles.inputError : ''}`}
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
              {errors.startTime && <span className={styles.errorText}>{errors.startTime}</span>}
            </div>

            {/* Giờ kết thúc */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Giờ kết thúc <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                className={`${styles.input} ${errors.endTime ? styles.inputError : ''}`}
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
              {errors.endTime && <span className={styles.errorText}>{errors.endTime}</span>}
            </div>

            {/* Ngày làm việc */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                Ngày làm việc <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.workingDays ? styles.inputError : ''}`}
                value={formData.workingDays}
                onChange={(e) => handleChange('workingDays', e.target.value)}
                placeholder="VD: T2, T3, T4, T5, T6 hoặc T7, CN"
              />
              {errors.workingDays && <span className={styles.errorText}>{errors.workingDays}</span>}
            </div>

            {/* Mô tả */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Mô tả</label>
              <input
                type="text"
                className={styles.input}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Mô tả ngắn về ca làm việc"
              />
            </div>

            {/* Trạng thái */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Trạng thái</label>
              <select
                className={styles.select}
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Ngưng hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>Hủy</button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : shift ? 'Lưu thay đổi' : 'Tạo ca làm việc'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const ShiftManagement = () => {
  useScrollToTop();

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const requestSeqRef = useRef(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  // Load shifts
  const loadShifts = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      setLoading(true);
      // TODO: replace with real API call when available
      // const token = getAuthToken();
      // const response = await fetchShifts({ page: currentPage - 1, size: itemsPerPage, search: searchTerm || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter }, token);
      await new Promise((r) => setTimeout(r, 500)); // Simulate network delay

      if (seq !== requestSeqRef.current) return;

      const filtered = MOCK_SHIFTS.filter((s) => {
        const matchSearch =
          !searchTerm ||
          s.shiftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
        return matchSearch && matchStatus;
      });

      setShifts(filtered);
      setTotalItems(filtered.length);
    } catch (err) {
      console.error('Error loading shifts:', err);
      toast.error('Không tải được dữ liệu ca làm việc');
      setShifts([]);
      setTotalItems(0);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadShifts, 30000);
    return () => clearInterval(interval);
  }, [loadShifts]);

  const handleSave = (savedShift) => {
    setShifts((prev) => {
      const idx = prev.findIndex((s) => s.shiftId === savedShift.shiftId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedShift;
        return updated;
      }
      return [savedShift, ...prev];
    });
    setTotalItems((n) => n + 1);
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setShowModal(true);
  };

  const handleDelete = (shiftId, shiftName) => {
    if (!globalThis.confirm(`Bạn có chắc chắn muốn xóa ca "${shiftName}"?`)) return;
    setShifts((prev) => prev.filter((s) => s.shiftId !== shiftId));
    setTotalItems((n) => Math.max(0, n - 1));
    toast.success('Xóa ca làm việc thành công!');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingShift(null);
  };

  // Stats
  const stats = {
    total: MOCK_SHIFTS.length,
    active: MOCK_SHIFTS.filter((s) => s.status === 'ACTIVE').length,
    inactive: MOCK_SHIFTS.filter((s) => s.status === 'INACTIVE').length,
    locked: MOCK_SHIFTS.filter((s) => s.status === 'LOCKED').length,
    totalStaff: MOCK_SHIFTS.reduce((sum, s) => sum + s.staffCount, 0),
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedShifts = shifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading && shifts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý ca làm việc</h1>
        <button className={styles.addButton} onClick={() => { setEditingShift(null); setShowModal(true); }}>
          + Thêm ca làm việc
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Tổng ca</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{stats.active}</div>
          <div className={styles.statLabel}>Hoạt động</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <div className={styles.statValue}>{stats.inactive}</div>
          <div className={styles.statLabel}>Ngưng hoạt động</div>
        </div>
        <div className={`${styles.statCard} ${styles.statLocked}`}>
          <div className={styles.statValue}>{stats.locked}</div>
          <div className={styles.statLabel}>Đã khóa</div>
        </div>
        <div className={`${styles.statCard} ${styles.statRating}`}>
          <div className={styles.statValue}>{stats.totalStaff}</div>
          <div className={styles.statLabel}>Nhân viên</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên ca, mô tả..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngưng hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {paginatedShifts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Không có ca làm việc nào</div>
          <div className={styles.emptyMessage}>Thử thay đổi bộ lọc hoặc thêm ca làm việc mới</div>
        </div>
      ) : (
        <div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên ca</th>
                  <th>Giờ làm việc</th>
                  <th>Ngày làm việc</th>
                  <th>Nhân viên</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShifts.map((shift, idx) => {
                  const statusMeta = getStatusMeta(shift.status);
                  return (
                    <tr key={shift.shiftId}>
                      <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td>
                        <div className={styles.shiftCell}>
                          <span className={styles.shiftName}>{shift.shiftName}</span>
                          {shift.description && (
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{shift.description}</span>
                          )}
                        </div>
                      </td>
                      <td>{shift.startTime} - {shift.endTime}</td>
                      <td className={styles.shiftDays}>{shift.workingDays}</td>
                      <td>{shift.staffCount} người</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[statusMeta.cls]}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleEdit(shift)}
                          >
                            Sửa
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDelete(shift.shiftId, shift.shiftName)}
                          >
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

          {/* Pagination */}
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, totalItems)} trong {totalItems} ca làm việc
            </div>
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${currentPage === p ? styles.active : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ShiftModal
          shift={editingShift}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ShiftManagement;
