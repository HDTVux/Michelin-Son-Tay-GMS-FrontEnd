import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  createWorkShift,
  deactivateWorkShift,
  reactivateWorkShift,
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
const SHIFT_RUNTIME_STORAGE_KEY = 'shiftManagement.runtime.v1';

const toTimeMinutes = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

const minutesToHHMM = (minutes) => {
  const normalized = ((Number(minutes) % 1440) + 1440) % 1440;
  const hour = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minute = String(normalized % 60).padStart(2, '0');
  return `${hour}:${minute}`;
};

const addMinutesToTime = (timeValue, delta) => {
  const minutes = toTimeMinutes(timeValue);
  if (minutes == null) return '';
  return minutesToHHMM(minutes + Number(delta || 0));
};

const getNowLocalHHMM = () => {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
};

const buildShiftTimeOptions = (startTime, endTime, stepMinutes = 5) => {
  const start = toTimeMinutes(startTime);
  const end = toTimeMinutes(endTime);
  if (start == null || end == null) return [];

  const safeStep = Math.max(1, Number(stepMinutes) || 5);
  const slots = [];
  const seen = new Set();
  const pushSlot = (minutes) => {
    const time = minutesToHHMM(minutes);
    if (!seen.has(time)) {
      seen.add(time);
      slots.push(time);
    }
  };

  if (start <= end) {
    for (let m = start; m <= end; m += safeStep) pushSlot(m);
  } else {
    for (let m = start; m < 1440; m += safeStep) pushSlot(m);
    for (let m = 0; m <= end; m += safeStep) pushSlot(m);
  }

  pushSlot(start);
  pushSlot(end);
  return slots;
};

const normalizeShiftRecord = (record) => ({
  ...record,
  shiftId: record?.shiftId ?? record?.shift_id ?? null,
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  startTime: record?.startTime ?? record?.start_time ?? '',
  endTime: record?.endTime ?? record?.end_time ?? '',
  isActive: record?.isActive ?? record?.is_active ?? true,
});

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const readPersistedFilters = () => {
  try {
    if (typeof window === 'undefined') return { search: '', statusFilter: '' };
    const raw = sessionStorage.getItem(SHIFT_FILTER_STORAGE_KEY);
    if (!raw) return { search: '', statusFilter: '' };
    const parsed = JSON.parse(raw);
    return {
      search: String(parsed?.search || ''),
      statusFilter: String(parsed?.statusFilter || ''),
    };
  } catch {
    return { search: '', statusFilter: '' };
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

const readPersistedRuntimeState = () => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(SHIFT_RUNTIME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const persistRuntimeState = (value) => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SHIFT_RUNTIME_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage write failures
  }
};

const defaultForm = {
  shiftName: '',
  startTime: '',
  endTime: '',
  isActive: true,
};

export default function ShiftManagement() {
  const navigate = useNavigate();
  const initialFilters = useMemo(() => readPersistedFilters(), []);
  const initialRuntimeState = useMemo(() => readPersistedRuntimeState(), []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState(initialFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter || '');

  const [openModal, setOpenModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form, setForm] = useState({
    ...defaultForm,
    ...(initialRuntimeState?.form && typeof initialRuntimeState.form === 'object'
      ? initialRuntimeState.form
      : {}),
  });
  const [modalShiftSearch, setModalShiftSearch] = useState(
    String(initialRuntimeState?.modalShiftSearch || ''),
  );

  const loadData = useCallback(async ({ background = false } = {}) => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để quản lý ca làm việc.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await fetchWorkShifts(token);
      const list = extractArrayPayload(response).map(normalizeShiftRecord);
      setShifts(list);
    } catch (err) {
      const message = err?.message || 'Không tải được danh sách ca làm việc.';
      if (background) {
        toast.error(message);
      } else {
        setShifts([]);
        setError(message);
      }
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    persistFilters({
      search,
      statusFilter,
    });
  }, [search, statusFilter]);

  useEffect(() => {
    persistRuntimeState({
      openModal,
      editingShiftId: editingShift?.shiftId ?? null,
      form,
      modalShiftSearch,
    });
  }, [openModal, editingShift, form, modalShiftSearch]);

  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return shifts.filter((shift) => {
      const matchesSearch = !query || `${shift?.shiftId ?? ''} ${shift?.shiftName ?? ''} ${shift?.startTime ?? ''} ${shift?.endTime ?? ''}`
        .toLowerCase()
        .includes(query);

      const isActive = shift?.isActive !== false;
      const matchesStatus = !statusFilter
        || (statusFilter === 'ACTIVE' ? isActive : !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [shifts, deferredSearch, statusFilter]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter((shift) => shift?.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [shifts]);

  const fullDayTimeOptions = useMemo(() => buildShiftTimeOptions('00:00', '23:55', 5), []);
  const modalShiftSuggestions = useMemo(() => {
    const query = modalShiftSearch.trim().toLowerCase();
    if (!query) return [];
    return shifts
      .filter((shift) => `${shift?.shiftId ?? ''} ${shift?.shiftName ?? ''}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [modalShiftSearch, shifts]);

  const resetModal = () => {
    setOpenModal(false);
    setEditingShift(null);
    setForm(defaultForm);
    setModalShiftSearch('');
  };

  const openCreate = () => {
    setEditingShift(null);
    setForm(defaultForm);
    setModalShiftSearch('');
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
    setModalShiftSearch('');
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
      await loadData({ background: true });
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
      await loadData({ background: true });
    } catch (err) {
      toast.error(err?.message || 'Thao tác thất bại.');
    }
  };

  const handleReactivate = async (shiftId) => {
    if (!window.confirm('Bạn chắc chắn muốn khôi phục ca làm việc này?')) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await reactivateWorkShift(shiftId, token);
      toast.success('Đã khôi phục ca làm việc.');
      await loadData({ background: true });
    } catch (err) {
      toast.error(err?.message || 'Khôi phục thất bại.');
    }
  };

  const handleUseFormTimeNow = (field) => {
    const now = getNowLocalHHMM();
    if (field === 'startTime') {
      setForm((prev) => ({ ...prev, startTime: now }));
      return;
    }
    if (field === 'endTime') {
      const fallbackEnd = addMinutesToTime(form.startTime, 240) || now;
      setForm((prev) => ({ ...prev, endTime: fallbackEnd }));
    }
  };

  const handleApplyShiftSuggestion = (shift) => {
    const normalized = normalizeShiftRecord(shift);
    setForm({
      shiftName: normalized?.shiftName || '',
      startTime: String(normalized?.startTime || '').slice(0, 5),
      endTime: String(normalized?.endTime || '').slice(0, 5),
      isActive: normalized?.isActive !== false,
    });
    setModalShiftSearch('');
    if (editingShift) {
      setEditingShift(normalized);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý ca làm việc</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={() => navigate('/attendance-management')}>
            Chấm công nhân viên
          </button>
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            + Thêm ca
          </button>
        </div>
      </div>

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

      <div className={styles.pendingFilters}>
        <div className={`${styles.filterCardLabels} ${styles.filterCardLabelsTwo}`}>
          <span>Tìm kiếm</span>
          <span>Trạng thái</span>
        </div>

        <div className={`${styles.filterCardControls} ${styles.filterCardControlsTwo}`}>
          <div className={styles.searchBox}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên ca, giờ làm..."
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
            <option value="">Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Vô hiệu</option>
          </select>
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
          {refreshing && <p className={styles.refreshHint}>Đang đồng bộ dữ liệu mới...</p>}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên ca</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Trạng thái</th>
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
                    <div className={styles.actionGroup}>
                      {shift.isActive !== false ? (
                        <>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => openEdit(shift)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className={styles.deactivateBtn}
                            onClick={() => handleDeactivate(shift.shiftId)}
                          >
                            Vô hiệu hóa
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => handleReactivate(shift.shiftId)}
                        >
                          Khôi phục
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
                    ? `Chỉnh sửa ca #${editingShift.shiftId}`
                    : 'Thêm một ca làm việc mới cho hệ thống'}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={resetModal}>
                x
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalInlineSearch}>
                <label className={styles.modalFilterLabel}>Tìm ca theo mã/tên</label>
                <input
                  className={styles.modalFilterInput}
                  placeholder="Nhập mã ca hoặc tên ca để nạp nhanh"
                  value={modalShiftSearch}
                  onChange={(e) => setModalShiftSearch(e.target.value)}
                />
                {modalShiftSearch.trim() && (
                  <div className={styles.modalSuggestionList}>
                    {modalShiftSuggestions.length > 0 ? (
                      modalShiftSuggestions.map((item) => (
                        <button
                          key={item.shiftId}
                          type="button"
                          className={styles.modalSuggestionItem}
                          onClick={() => handleApplyShiftSuggestion(item)}
                        >
                          <span>#{item.shiftId} - {item.shiftName || 'Không tên'}</span>
                          <span className={styles.modalSuggestionMeta}>
                            {String(item.startTime || '').slice(0, 5)} - {String(item.endTime || '').slice(0, 5)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className={styles.modalSuggestionMeta}>Không tìm thấy ca phù hợp.</p>
                    )}
                  </div>
                )}
              </div>

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
                  <select
                    className={styles.input}
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  >
                    <option value="">Chọn giờ bắt đầu</option>
                    {fullDayTimeOptions.map((time) => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                  <div className={styles.timeQuickActions}>
                    <button type="button" className={styles.timeQuickBtn} onClick={() => setForm((prev) => ({ ...prev, startTime: '07:30' }))}>
                      Ca sáng 07:30
                    </button>
                    <button type="button" className={styles.timeQuickBtn} onClick={() => handleUseFormTimeNow('startTime')}>
                      Giờ hiện tại
                    </button>
                    <button type="button" className={styles.timeQuickBtn} onClick={() => setForm((prev) => ({ ...prev, startTime: '13:00' }))}>
                      Ca chiều 13:00
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giờ kết thúc <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  >
                    <option value="">Chọn giờ kết thúc</option>
                    {fullDayTimeOptions.map((time) => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                  <div className={styles.timeQuickActions}>
                    <button type="button" className={styles.timeQuickBtn} onClick={() => setForm((prev) => ({ ...prev, endTime: '12:00' }))}>
                      Trưa 12:00
                    </button>
                    <button type="button" className={styles.timeQuickBtn} onClick={() => setForm((prev) => ({ ...prev, endTime: addMinutesToTime(prev.startTime, 240) || '17:30' }))}>
                      +4 giờ từ đầu ca
                    </button>
                    <button type="button" className={styles.timeQuickBtn} onClick={() => handleUseFormTimeNow('endTime')}>
                      Giờ hiện tại
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={resetModal}>
                Hủy
              </button>
              <button type="button" className={styles.saveBtn} onClick={handleSave}>
                {editingShift ? 'Lưu thay đổi' : 'Tạo ca mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
