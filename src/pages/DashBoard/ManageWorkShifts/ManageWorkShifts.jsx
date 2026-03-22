import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import styles from './ManageWorkShifts.module.css';
import {
  fetchAllWorkShifts,
  createWorkShift,
  updateWorkShift,
  deleteWorkShift,
} from '../../../services/workShiftService';

// ─── Format time from LocalTime string ───────────────────────────────────────
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  // timeStr can be "08:00" or "08:00:00"
  return timeStr.substring(0, 5);
};

// ─── Format date ──────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Shift Form Modal ─────────────────────────────────────────────────────────
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
    if (!form.shiftName.trim()) {
      errs.shiftName = 'Vui lòng nhập tên ca làm việc';
    }
    if (!form.startTime) {
      errs.startTime = 'Vui lòng chọn giờ bắt đầu';
    }
    if (!form.endTime) {
      errs.endTime = 'Vui lòng chọn giờ kết thúc';
    }
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      errs.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu';
    }
    return errs;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

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
            <h3 className={styles.modalTitle}>
              {isEdit ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc mới'}
            </h3>
            <p className={styles.modalSubtitle}>
              {isEdit ? `Mã ca: #${shift.shiftId}` : 'Điền thông tin ca làm việc'}
            </p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Tên ca làm việc <span className={styles.requiredMark}>*</span>
              </label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: Ca Sáng, Ca Chiều, Ca Đêm"
                value={form.shiftName}
                onChange={(e) => handleChange('shiftName', e.target.value)}
                maxLength={100}
                autoFocus
              />
              {errors.shiftName && (
                <span className={styles.formError}>{errors.shiftName}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Thời gian làm việc <span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.timeInputs}>
                <input
                  type="time"
                  className={styles.formInput}
                  value={form.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                />
                <span className={styles.timeSep}>→</span>
                <input
                  type="time"
                  className={styles.formInput}
                  value={form.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                />
              </div>
              {(errors.startTime || errors.endTime) && (
                <span className={styles.formError}>
                  {errors.startTime || errors.endTime}
                </span>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting
                ? isEdit
                  ? 'Đang cập nhật...'
                  : 'Đang tạo...'
                : isEdit
                ? 'Cập nhật'
                : 'Tạo ca làm việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ shift, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm(shift.shiftId);
      toast.success(`Đã vô hiệu hóa ca "${shift.shiftName}"`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Không thể vô hiệu hóa ca làm việc.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader} style={{ background: '#ef4444' }}>
          <div>
            <h3 className={styles.modalTitle}>Xác nhận vô hiệu hóa</h3>
            <p className={styles.modalSubtitle}>Hành động này không thể hoàn tác</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.confirmBody}>
          <div className={styles.confirmIcon}>⚠️</div>
          <h4 className={styles.confirmTitle}>Bạn có chắc chắn muốn vô hiệu hóa ca làm việc này?</h4>
          <p className={styles.confirmMessage}>
            Ca làm việc{' '}
            <span className={styles.confirmName}>"{shift.shiftName}"</span>{' '}
            ({formatTime(shift.startTime)} → {formatTime(shift.endTime)}) sẽ bị vô hiệu hóa
            và không thể sử dụng nữa.
          </p>
        </div>
        <div className={styles.confirmFooter}>
          <button
            className={styles.confirmCancelBtn}
            onClick={onClose}
            disabled={deleting}
          >
            Hủy bỏ
          </button>
          <button
            className={styles.confirmDeleteBtn}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Đang xử lý...' : 'Vô hiệu hóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const ManageWorkShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [deleteShift, setDeleteShift] = useState(null);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAllWorkShifts();
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setShifts(data);
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách ca làm việc.');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const handleAdd = () => {
    setEditShift(null);
    setShowFormModal(true);
  };

  const handleEdit = (shift) => {
    setEditShift(shift);
    setShowFormModal(true);
  };

  const handleDeleteClick = (shift) => {
    setDeleteShift(shift);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (shiftId) => {
    await deleteWorkShift(shiftId);
    await loadShifts();
  };

  const handleFormSuccess = () => {
    loadShifts();
  };

  // Stats
  const totalShifts   = shifts.length;
  const activeShifts  = shifts.filter((s) => s.isActive === true).length;
  const inactiveShifts = shifts.filter((s) => s.isActive === false).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Quản lý ca làm việc</h1>
          <p className={styles.subtitle}>Tạo, chỉnh sửa và quản lý các ca làm việc trong hệ thống</p>
        </div>
        <button className={styles.addBtn} onClick={handleAdd}>
          <span>＋</span> Thêm ca làm việc
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{totalShifts}</div>
          <div className={styles.statLabel}>Tổng ca làm việc</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{activeShifts}</div>
          <div className={styles.statLabel}>Đang hoạt động</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <div className={styles.statValue}>{inactiveShifts}</div>
          <div className={styles.statLabel}>Đã vô hiệu hóa</div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner} />
          </div>
        ) : shifts.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyText}>Chưa có ca làm việc nào</p>
            <p className={styles.emptySubtext}>
              Nhấn "Thêm ca làm việc" để tạo ca đầu tiên
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên ca</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift, index) => (
                  <tr key={shift.shiftId}>
                    <td className={styles.tdStt}>{index + 1}</td>
                    <td className={styles.tdName}>{shift.shiftName}</td>
                    <td className={styles.tdTime}>
                      <span className={styles.timeLabel}>{formatTime(shift.startTime)}</span>
                    </td>
                    <td className={styles.tdTime}>
                      <span className={styles.timeLabel}>{formatTime(shift.endTime)}</span>
                    </td>
                    <td className={styles.tdStatus}>
                      <span
                        className={`${styles.statusBadge} ${
                          shift.isActive ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot} />
                        {shift.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </span>
                    </td>
                    <td className={styles.tdTime}>
                      <span className={styles.timeValue}>{formatDate(shift.createdAt)}</span>
                    </td>
                    <td className={styles.tdActions}>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleEdit(shift)}
                          title="Chỉnh sửa"
                        >
                          ✏️
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteClick(shift)}
                          title="Vô hiệu hóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showFormModal && (
        <ShiftFormModal
          shift={editShift}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDeleteModal && deleteShift && (
        <DeleteConfirmModal
          shift={deleteShift}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default ManageWorkShifts;
