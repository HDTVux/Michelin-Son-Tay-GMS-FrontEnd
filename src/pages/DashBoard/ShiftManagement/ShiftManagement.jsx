import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createWorkShift,
  deactivateWorkShift,
  fetchManagerAttendance,
  fetchWorkShifts,
  updateWorkShift,
} from '../../../services/managerService.js';
import styles from './ShiftManagement.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('adminToken')
  || localStorage.getItem('staffToken')
  || '';

const SHIFT_FILTER_STORAGE_KEY = 'shiftManagement.filters.v1';

const toDateKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10);
};

const readPersistedFilters = () => {
  try {
    if (typeof window === 'undefined') return { search: '', statusFilter: '', createdDateFilter: '' };
    const raw = sessionStorage.getItem(SHIFT_FILTER_STORAGE_KEY);
    if (!raw) return { search: '', statusFilter: '', createdDateFilter: '' };
    const parsed = JSON.parse(raw);
    return {
      search: String(parsed?.search || ''),
      statusFilter: String(parsed?.statusFilter || ''),
      createdDateFilter: String(parsed?.createdDateFilter || ''),
    };
  } catch {
    return { search: '', statusFilter: '', createdDateFilter: '' };
  }
};

const persistFilters = (filters) => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SHIFT_FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore storage write failures
  }
};

const clearPersistedFilters = () => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SHIFT_FILTER_STORAGE_KEY);
  } catch {
    // ignore storage cleanup failures
  }
};

const defaultForm = {
  shiftName: '',
  startTime: '',
  endTime: '',
  isActive: true,
};

export default function ShiftManagement() {
  const initialFilters = useMemo(() => readPersistedFilters(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState(initialFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter || '');
  const [createdDateFilter, setCreatedDateFilter] = useState(initialFilters.createdDateFilter || '');

  const [openModal, setOpenModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const [viewShiftModal, setViewShiftModal] = useState(null);
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

  useEffect(() => {
    persistFilters({
      search,
      statusFilter,
      createdDateFilter,
    });
  }, [search, statusFilter, createdDateFilter]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shifts.filter((shift) => {
      const matchesSearch = !query || `${shift?.shiftId ?? ''} ${shift?.shiftName ?? ''} ${shift?.startTime ?? ''} ${shift?.endTime ?? ''}`
        .toLowerCase()
        .includes(query);

      const isActive = shift?.isActive !== false;
      const matchesStatus = !statusFilter
        || (statusFilter === 'ACTIVE' ? isActive : !isActive);
      const createdDate = toDateKey(shift?.createdAt);
      const matchesCreatedDate = !createdDateFilter || createdDate === createdDateFilter;

      return matchesSearch && matchesStatus && matchesCreatedDate;
    });
  }, [shifts, search, statusFilter, createdDateFilter]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter((shift) => shift?.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [shifts]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCreatedDateFilter('');
    clearPersistedFilters();
  };

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
      const firstDayOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString().slice(0, 10);

      const response = await fetchManagerAttendance(
        { from: firstDayOfMonth, to: today },
        token,
      );

      const allRecords = Array.isArray(response?.data) ? response.data : [];
      const matchedRecords = allRecords.filter(
        (record) => Number(record?.shiftId) === Number(shift?.shiftId),
      );
      setShiftAttendances(matchedRecords);
    } catch {
      setShiftAttendances([]);
    } finally {
      setLoadingShiftAttendances(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PRESENT':
        return styles.statusPresent;
      case 'LATE':
        return styles.statusLate;
      case 'ABSENT':
        return styles.statusAbsent;
      case 'OFF':
        return styles.statusOff;
      default:
        return styles.statusNotYet;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'Có mặt';
      case 'LATE':
        return 'Muá»™n';
      case 'ABSENT':
        return 'Váº¯ng';
      case 'OFF':
        return 'Nghá»‰';
      default:
        return status || '-';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý ca làm việc</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={loadData}>
            Làm mới
          </button>
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            + Thêm ca
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <p className={styles.statLabel}>Tá»•ng ca</p>
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

      <div className={styles.pendingFilters}>
        <div className={styles.filterCardLabels}>
          <span>Tìm kiếm</span>
          <span>Trạng thái</span>
          <span>Ngày tạo</span>
        </div>

        <div className={styles.filterCardControls}>
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên ca, thời gian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearch('')}
                aria-label="Xóa từ khóa tìm kiếm"
                title="Xóa từ khóa"
              >
                x
              </button>
            )}
          </div>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Vô hiệu</option>
          </select>

          <input
            type="date"
            className={styles.filterDateInput}
            value={createdDateFilter}
            onChange={(e) => setCreatedDateFilter(e.target.value)}
          />
        </div>

        <div className={styles.filterCardActions}>
          <button
            type="button"
            className={styles.filterGhostBtn}
            onClick={clearFilters}
            disabled={!search.trim() && !statusFilter && !createdDateFilter}
          >
            Xóa bộ lọc
          </button>
          <button type="button" className={styles.filterPrimaryBtn} onClick={loadData}>
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải ca làm việc...</p>
        </div>
      )}

      {!loading && error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>!</div>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>0</div>
          <p className={styles.emptyTitle}>Không có ca làm việc phù hợp</p>
          <p className={styles.emptyMessage}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      )}

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
                    <span
                      className={`${styles.statusBadge} ${
                        shift.isActive !== false ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {shift.isActive !== false ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td>
                    {shift.createdAt ? new Date(shift.createdAt).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button
                        type="button"
                        className={styles.viewBtn}
                        onClick={() => handleViewShift(shift)}
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openEdit(shift)}
                      >
                        Sá»­a
                      </button>
                      {shift.isActive !== false && (
                        <button
                          type="button"
                          className={styles.deactivateBtn}
                          onClick={() => handleDeactivate(shift.shiftId)}
                        >
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

      {openModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  {editingShift ? 'Cập nhật ca làm việc' : 'Tạo ca làm việc mới'}
                </h3>
                <p className={styles.modalSubtitle}>
                  {editingShift
                    ? `Chá»‰nh sá»­a ca #${editingShift.shiftId}`
                    : 'Thêm một ca làm việc mới cho hệ thống'}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={resetModal}>
                x
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Tên ca <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    placeholder="Ví dụ: Ca sáng, Ca chiều"
                    value={form.shiftName}
                    onChange={(e) => setForm((prev) => ({ ...prev, shiftName: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Trạng thái</label>
                  <select
                    className={styles.select}
                    value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.value === 'ACTIVE' }))
                    }
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Vô hiệu</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giờ bắt đầu <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giờ kết thúc <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={resetModal}>
                Há»§y
              </button>
              <button type="button" className={styles.saveBtn} onClick={handleSave}>
                {editingShift ? 'Lưu thay đổi' : 'Tạo ca mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewShiftModal && (
        <div className={styles.modalOverlay} onClick={() => setViewShiftModal(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '720px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Danh sách nhân viên ca {viewShiftModal.shiftName}</h3>
                <p className={styles.modalSubtitle}>
                  Ca làm: {String(viewShiftModal.startTime || '').slice(0, 5)} -{' '}
                  {String(viewShiftModal.endTime || '').slice(0, 5)} - {shiftAttendances.length} báº£n
                  ghi
                </p>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setViewShiftModal(null)}
              >
                x
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingShiftAttendances ? (
                <div className={styles.loadingContainer} style={{ minHeight: '200px' }}>
                  <div className={styles.spinner}></div>
                  <p>Đang tải dữ liệu chấm công...</p>
                </div>
              ) : shiftAttendances.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>i</div>
                  <p className={styles.emptyTitle}>Chưa có ai điểm danh ca này</p>
                  <p className={styles.emptyMessage}>
                    Không có bản ghi chấm công nào cho ca {viewShiftModal.shiftName} trong tháng này.
                  </p>
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
                      {shiftAttendances.map((record, idx) => (
                        <tr key={record.checkinId || idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left' }}>{record.staffName || `ID ${record.staffId}`}</td>
                          <td>{record.attendanceDate || '-'}</td>
                          <td>{record.checkInTime || '-'}</td>
                          <td>{record.checkOutTime || '-'}</td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${getStatusBadgeClass(record.status)}`}
                            >
                              {getStatusLabel(record.status)}
                            </span>
                          </td>
                          <td>{record.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setViewShiftModal(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
