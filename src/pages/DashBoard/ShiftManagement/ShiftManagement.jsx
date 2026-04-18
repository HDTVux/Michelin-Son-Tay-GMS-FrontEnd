import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createWorkShift,
  deactivateWorkShift,
  reactivateWorkShift,
  fetchManagerAttendance,
  fetchWorkShifts,
  fetchManagerTodaySummary,
  managerCheckIn,
  managerCheckOut,
  managerDeleteCheckin,
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

const getTodayLocalISO = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const toDateKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const isTimeInsideShift = (timeValue, shiftStart, shiftEnd) => {
  const t = toTimeMinutes(timeValue);
  const start = toTimeMinutes(shiftStart);
  const end = toTimeMinutes(shiftEnd);
  if (t == null || start == null || end == null) return false;
  if (start <= end) return t >= start && t <= end;
  return t >= start || t <= end;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeShiftRecord = (record) => ({
  ...record,
  shiftId: record?.shiftId ?? record?.shift_id ?? null,
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  startTime: record?.startTime ?? record?.start_time ?? '',
  endTime: record?.endTime ?? record?.end_time ?? '',
  isActive: record?.isActive ?? record?.is_active ?? true,
});

const isShiftActive = (shift) => shift?.isActive !== false;

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const buildEquivalentShiftIdSet = (selectedShift, allShifts) => {
  const selectedId = Number(selectedShift?.shiftId);
  const selectedName = normalizeText(selectedShift?.shiftName);
  const selectedStart = String(selectedShift?.startTime || '').slice(0, 5);
  const selectedEnd = String(selectedShift?.endTime || '').slice(0, 5);
  const ids = new Set();
  if (Number.isFinite(selectedId) && selectedId > 0) ids.add(selectedId);

  allShifts.forEach((raw) => {
    const shift = normalizeShiftRecord(raw);
    const id = Number(shift?.shiftId);
    if (!Number.isFinite(id) || id <= 0) return;
    const sameName = normalizeText(shift?.shiftName) === selectedName;
    const sameStart = String(shift?.startTime || '').slice(0, 5) === selectedStart;
    const sameEnd = String(shift?.endTime || '').slice(0, 5) === selectedEnd;
    if ((selectedName && sameName && sameStart && sameEnd) || (!selectedName && sameStart && sameEnd)) {
      ids.add(id);
    }
  });

  return ids;
};

const normalizeAttendanceRecord = (record) => ({
  ...record,
  checkinId: record?.checkinId ?? record?.checkin_id ?? null,
  staffId: record?.staffId ?? record?.staff_id ?? null,
  staffName: record?.staffName ?? record?.staff_name ?? record?.fullName ?? record?.full_name ?? '',
  shiftId: record?.shiftId ?? record?.shift_id ?? null,
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  attendanceDate: record?.attendanceDate ?? record?.attendance_date ?? '',
  checkInTime: record?.checkInTime ?? record?.check_in_time ?? '',
  checkOutTime: record?.checkOutTime ?? record?.check_out_time ?? '',
  shiftStartTime: record?.shiftStartTime ?? record?.shift_start_time ?? record?.startTime ?? record?.start_time ?? '',
  status: record?.status ?? record?.attendanceStatus ?? record?.attendance_status ?? '',
  isLate: record?.isLate ?? record?.is_late ?? false,
  notes: record?.notes ?? record?.note ?? '',
});

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
  const initialFilters = useMemo(() => readPersistedFilters(), []);
  const initialRuntimeState = useMemo(() => readPersistedRuntimeState(), []);
  const runtimeSnapshotRef = useRef(initialRuntimeState);
  const hasRestoredRuntimeRef = useRef(false);
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

  const [viewShiftModal, setViewShiftModal] = useState(null);
  const [viewAttendanceDate, setViewAttendanceDate] = useState(
    String(initialRuntimeState?.viewAttendanceDate || getTodayLocalISO()),
  );
  const [shiftAttendances, setShiftAttendances] = useState([]);
  const [loadingShiftAttendances, setLoadingShiftAttendances] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState(
    String(initialRuntimeState?.attendanceSearch || ''),
  );
  const [modalShiftSearch, setModalShiftSearch] = useState(
    String(initialRuntimeState?.modalShiftSearch || ''),
  );
  const [attendanceForm, setAttendanceForm] = useState({
    staffId: String(initialRuntimeState?.attendanceForm?.staffId || ''),
    attendanceDate: String(initialRuntimeState?.attendanceForm?.attendanceDate || getTodayLocalISO()),
    checkInTime: String(initialRuntimeState?.attendanceForm?.checkInTime || ''),
    notes: String(initialRuntimeState?.attendanceForm?.notes || ''),
  });
  // Chấm công state
  const todayInit = new Date().toISOString().slice(0, 10);
  const [viewFromDate, setViewFromDate] = useState(todayInit);
  const [viewToDate, setViewToDate] = useState(todayInit);
  const [viewStaffIdFilter, setViewStaffIdFilter] = useState('');
  const [viewSummary, setViewSummary] = useState(null);
  const [checkInForm, setCheckInForm] = useState({ staffId: '', shiftId: '', attendanceDate: todayInit, checkInTime: '', notes: '' });
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ checkOutTime: '', notes: '' });

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
    if (!hasRestoredRuntimeRef.current && runtimeSnapshotRef.current) return;
    persistRuntimeState({
      openModal,
      editingShiftId: editingShift?.shiftId ?? null,
      form,
      modalShiftSearch,
      viewShiftId: viewShiftModal?.shiftId ?? null,
      viewAttendanceDate,
      attendanceSearch,
      attendanceForm,
    });
  }, [
    openModal,
    editingShift,
    form,
    modalShiftSearch,
    viewShiftModal,
    viewAttendanceDate,
    attendanceSearch,
    attendanceForm,
  ]);

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

  const handleViewShift = async (shift) => {
    const today = new Date().toISOString().slice(0, 10);
    const shiftActive = isShiftActive(shift);
    setViewShiftModal(shift);
    setShiftAttendances([]);
    setLoadingShiftAttendances(true);
    setViewFromDate(today);
    setViewToDate(today);
    setViewStaffIdFilter('');
    setCheckoutTarget(null);
    setCheckInForm({ staffId: '', shiftId: shiftActive ? shift?.shiftId || '' : '', attendanceDate: today, checkInTime: '', notes: '' });

    const token = getAuthToken();
    if (!token) return;

    try {
      const [attendanceRes, summaryRes] = await Promise.all([
        fetchManagerAttendance({ from: today, to: today, shiftId: shift?.shiftId }, token),
        fetchManagerTodaySummary({ date: today, shiftId: shift?.shiftId }, token),
      ]);

      const allRecords = Array.isArray(attendanceRes?.data) ? attendanceRes.data : [];
      const matchedRecords = allRecords.filter(
        (record) => Number(record?.shiftId) === Number(shift?.shiftId),
      );
      setShiftAttendances(matchedRecords);
      setViewSummary(summaryRes?.data || null);
    } catch {
      setShiftAttendances([]);
      setViewSummary(null);
    } finally {
      setLoadingShiftAttendances(false);
    }
  };


  const loadShiftAttendances = useCallback(async (shift, attendanceDate) => {
    if (!shift?.shiftId) return;
    const token = getAuthToken();
    if (!token) return;

    const date = String(attendanceDate || getTodayLocalISO()).trim();
    if (!date) return;

    setLoadingShiftAttendances(true);
    try {
      const response = await fetchManagerAttendance({ from: date, to: date }, token);
      const allRecords = extractArrayPayload(response);
      const normalized = allRecords.map(normalizeAttendanceRecord);
      const targetShiftId = Number(shift?.shiftId);
      const equivalentShiftIds = buildEquivalentShiftIdSet(shift, shifts);
      const targetShiftName = normalizeText(shift?.shiftName);
      const matchedRecords = normalized.filter((record) => {
        const recordDate = toDateKey(record?.attendanceDate);
        if (recordDate !== date) return false;

        const recordShiftId = Number(record?.shiftId);
        if (Number.isFinite(recordShiftId) && recordShiftId > 0) {
          if (equivalentShiftIds.has(recordShiftId) || recordShiftId === targetShiftId) {
            return true;
          }
        }

        const recordShiftName = normalizeText(record?.shiftName);
        if (recordShiftName && targetShiftName && recordShiftName === targetShiftName) {
          return true;
        }

        // Fallback for legacy rows without shift_id: infer from check-in/check-out time window.
        const anchorTime = record?.checkInTime || record?.checkOutTime;
        return isTimeInsideShift(anchorTime, shift?.startTime, shift?.endTime);
      });
      setShiftAttendances(matchedRecords);
      setViewSummary(null);
    } catch {
      setShiftAttendances([]);
      setViewSummary(null);
    } finally {
      setLoadingShiftAttendances(false);
    }
  }, [shifts]);

  const loadViewAttendance = async () => {
    if (!viewShiftModal) return;
    const token = getAuthToken();
    if (!token) return;
    setLoadingShiftAttendances(true);
    try {
      const allRecords = await fetchManagerAttendance({
        from: viewFromDate,
        to: viewToDate,
        shiftId: viewShiftModal?.shiftId,
        staffId: viewStaffIdFilter ? Number(viewStaffIdFilter) : undefined,
      }, token);
      const list = Array.isArray(allRecords?.data) ? allRecords.data : [];
      const filtered2 = list.filter(
        (r) => Number(r?.shiftId) === Number(viewShiftModal?.shiftId),
      );
      setShiftAttendances(filtered2);
    } catch {
      setShiftAttendances([]);
    } finally {
      setLoadingShiftAttendances(false);
    }
  };

  useEffect(() => {
    if (loading || hasRestoredRuntimeRef.current) return;
    hasRestoredRuntimeRef.current = true;
    const snapshot = runtimeSnapshotRef.current;
    if (!snapshot || typeof snapshot !== 'object') return;

    if (typeof snapshot?.attendanceSearch === 'string') {
      setAttendanceSearch(snapshot.attendanceSearch);
    }
    if (typeof snapshot?.modalShiftSearch === 'string') {
      setModalShiftSearch(snapshot.modalShiftSearch);
    }

    const persistedEditShiftId = Number(snapshot?.editingShiftId);
    if (snapshot?.openModal === true) {
      if (Number.isFinite(persistedEditShiftId) && persistedEditShiftId > 0) {
        const matchedEditShift = shifts.find((item) => Number(item?.shiftId) === persistedEditShiftId);
        if (matchedEditShift) {
          setEditingShift(matchedEditShift);
          setForm((prev) => ({
            ...prev,
            ...defaultForm,
            ...(snapshot?.form && typeof snapshot.form === 'object' ? snapshot.form : {}),
          }));
          setOpenModal(true);
        }
      } else {
        setEditingShift(null);
        setForm((prev) => ({
          ...prev,
          ...defaultForm,
          ...(snapshot?.form && typeof snapshot.form === 'object' ? snapshot.form : {}),
        }));
        setOpenModal(true);
      }
    }

    const persistedViewShiftId = Number(snapshot?.viewShiftId);
    if (Number.isFinite(persistedViewShiftId) && persistedViewShiftId > 0) {
      const matchedViewShift = shifts.find((item) => Number(item?.shiftId) === persistedViewShiftId);
      if (matchedViewShift) {
        const restoredDate = toDateKey(snapshot?.viewAttendanceDate) || getTodayLocalISO();
        const restoredAttendanceForm = snapshot?.attendanceForm && typeof snapshot.attendanceForm === 'object'
          ? snapshot.attendanceForm
          : {};
        setViewShiftModal(matchedViewShift);
        setViewAttendanceDate(restoredDate);
        setAttendanceForm((prev) => ({
          ...prev,
          staffId: String(restoredAttendanceForm?.staffId || ''),
          attendanceDate: String(restoredAttendanceForm?.attendanceDate || restoredDate),
          checkInTime: String(restoredAttendanceForm?.checkInTime || String(matchedViewShift?.startTime || '').slice(0, 5)),
          notes: String(restoredAttendanceForm?.notes || ''),
        }));
        void loadShiftAttendances(matchedViewShift, restoredDate);
      }
    }
  }, [loading, shifts, loadShiftAttendances]);

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


  const loadViewSummary = async () => {
    if (!viewShiftModal) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetchManagerTodaySummary({ date: viewToDate, shiftId: viewShiftModal?.shiftId }, token);
      setViewSummary(res?.data || null);
    } catch {
      setViewSummary(null);
    }
  };

  const handleViewCheckIn = async () => {
    const token = getAuthToken();
    if (!token) return;
    if (!checkInForm.staffId || !checkInForm.shiftId) {
      toast.error('Vui lòng nhập Staff ID và chọn ca làm.');
      return;
    }
    const selectedShift = shifts.find((shift) => Number(shift?.shiftId) === Number(checkInForm.shiftId));
    if (!selectedShift || !isShiftActive(selectedShift)) {
      toast.error('Ca làm đã vô hiệu hóa, không thể điểm danh.');
      return;
    }
    try {
      await managerCheckIn(checkInForm, token);
      toast.success('Check-in thành công.');
      setCheckInForm((prev) => ({ ...prev, notes: '', checkInTime: '' }));
      await loadViewAttendance();
      await loadViewSummary();
    } catch (err) {
      toast.error(err?.message || 'Check-in thất bại.');
    }
  };

  const handleViewCheckOut = async () => {
    if (!checkoutTarget) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await managerCheckOut(checkoutTarget.checkinId, checkoutForm, token);
      toast.success('Check-out thành công.');
      setCheckoutTarget(null);
      setCheckoutForm({ checkOutTime: '', notes: '' });
      await loadViewAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-out thất bại.');
    }
  };

  const handleViewDelete = async (checkinId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bản ghi chấm công này?')) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await managerDeleteCheckin(checkinId, token);
      toast.success('Đã xóa bản ghi.');
      await loadViewAttendance();
    } catch (err) {
      toast.error(err?.message || 'Xóa thất bại.');
    }
  };

  const statusMeta = (status) => {
    const key = String(status || '').toUpperCase();
    if (key === 'PRESENT') return { label: 'Có mặt', cls: styles.statusPresent };
    if (key === 'LATE') return { label: 'Muộn', cls: styles.statusLate };
    if (key === 'ABSENT') return { label: 'Vắng', cls: styles.statusAbsent };
    if (key === 'OFF') return { label: 'Nghỉ', cls: styles.statusOff };
    return { label: key || '-', cls: styles.statusNotYet };
  };

  const viewStats = useMemo(() => {
    const total = shiftAttendances.length;
    const checkedOut = shiftAttendances.filter((r) => r?.checkOutTime).length;
    const present = shiftAttendances.filter((r) => String(r?.status || '').toUpperCase() === 'PRESENT').length;
    return { total, checkedOut, present };
  }, [shiftAttendances]);

  const activeShifts = useMemo(() => shifts.filter(isShiftActive), [shifts]);
  const isViewingInactiveShift = Boolean(viewShiftModal && !isShiftActive(viewShiftModal));


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý ca làm việc</h1>
        <div className={styles.headerActions}>
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
                      <button
                        type="button"
                        className={styles.viewBtn}
                        onClick={() => handleViewShift(shift)}
                      >
                        Xem
                      </button>
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

      {viewShiftModal && (
        <div className={styles.modalOverlay} onClick={() => setViewShiftModal(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '1100px', width: '95vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.attendanceModalHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 4 }}>
                <div>
                  <h3 className={styles.attendanceModalTitle}>Chấm công ca {viewShiftModal.shiftName}</h3>
                  <p className={styles.attendanceModalSubtitle}>
                    Ca làm: {String(viewShiftModal.startTime || '').slice(0, 5)} — {String(viewShiftModal.endTime || '').slice(0, 5)}
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    width: 32, height: 32, border: 'none', borderRadius: 8,
                    background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 16,
                    fontWeight: 700, cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                  }}
                  onClick={() => setViewShiftModal(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.attendanceModalBody}>
              {/* Stats */}
              <div className={styles.attendanceStats}>
                <div className={styles.attendanceStatItem}>
                  <div className={`${styles.attendanceStatIcon} ${styles.attendanceStatIconBlue}`}>📋</div>
                  <div className={styles.attendanceStatContent}>
                    <span className={styles.attendanceStatValue}>{viewStats.total}</span>
                    <span className={styles.attendanceStatLabel}>Tổng bản ghi</span>
                  </div>
                </div>
                <div className={styles.attendanceStatItem}>
                  <div className={`${styles.attendanceStatIcon} ${styles.attendanceStatIconGreen}`}>✓</div>
                  <div className={styles.attendanceStatContent}>
                    <span className={styles.attendanceStatValue}>{viewStats.checkedOut}</span>
                    <span className={styles.attendanceStatLabel}>Đã check-out</span>
                  </div>
                </div>
                <div className={styles.attendanceStatItem}>
                  <div className={`${styles.attendanceStatIcon} ${styles.attendanceStatIconYellow}`}>👤</div>
                  <div className={styles.attendanceStatContent}>
                    <span className={styles.attendanceStatValue}>{viewStats.present}</span>
                    <span className={styles.attendanceStatLabel}>Có mặt</span>
                  </div>
                </div>
                <div className={styles.attendanceStatItem}>
                  <div className={`${styles.attendanceStatIcon} ${styles.attendanceStatIconPurple}`}>👥</div>
                  <div className={styles.attendanceStatContent}>
                    <span className={styles.attendanceStatValue}>{viewSummary?.totalStaff ?? 0}</span>
                    <span className={styles.attendanceStatLabel}>Tổng nhân sự hôm nay</span>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className={styles.attendanceToolbar}>
                <div className={styles.attendanceToolbarField}>
                  <label className={styles.attendanceToolbarLabel}>Từ ngày</label>
                  <input className={styles.attendanceToolbarInput} type="date" value={viewFromDate} onChange={(e) => setViewFromDate(e.target.value)} />
                </div>
                <div className={styles.attendanceToolbarField}>
                  <label className={styles.attendanceToolbarLabel}>Đến ngày</label>
                  <input className={styles.attendanceToolbarInput} type="date" value={viewToDate} onChange={(e) => setViewToDate(e.target.value)} />
                </div>
                <div className={styles.attendanceToolbarField}>
                  <label className={styles.attendanceToolbarLabel}>Staff ID</label>
                  <input className={styles.attendanceToolbarInput} type="number" value={viewStaffIdFilter} onChange={(e) => setViewStaffIdFilter(e.target.value)} placeholder="Lọc theo ID" />
                </div>
                <div className={styles.attendanceToolbarActions}>
                  <button type="button" className={styles.attendanceLoadBtn} onClick={loadViewAttendance}>🔍 Tải dữ liệu</button>
                  <button type="button" className={styles.attendanceLoadBtnGhost} onClick={loadViewSummary}>📊 Tải tổng hợp</button>
                </div>
              </div>

              {/* Check-in nhanh */}
              <div className={styles.attendanceCheckin}>
                <div className={styles.attendanceCheckinHeader}>
                  <h4 className={styles.attendanceCheckinTitle}>📌 Check-in nhanh</h4>
                  {isViewingInactiveShift && (
                    <span className={styles.attendanceCheckinNotice}>
                      Ca này đã vô hiệu hóa nên không thể điểm danh thêm.
                    </span>
                  )}
                </div>
                <div className={styles.attendanceCheckinForm}>
                  <div className={styles.attendanceCheckinField}>
                    <label className={styles.attendanceCheckinLabel}>Staff ID</label>
                    <input className={styles.attendanceCheckinInput} type="number" value={checkInForm.staffId} onChange={(e) => setCheckInForm((p) => ({ ...p, staffId: e.target.value }))} placeholder="Nhập ID nhân viên" disabled={isViewingInactiveShift} />
                  </div>
                  <div className={styles.attendanceCheckinField}>
                    <label className={styles.attendanceCheckinLabel}>Ca làm</label>
                    <select className={styles.attendanceCheckinSelect} value={checkInForm.shiftId} onChange={(e) => setCheckInForm((p) => ({ ...p, shiftId: e.target.value }))} disabled={isViewingInactiveShift}>
                      <option value="">Chọn ca</option>
                      {activeShifts.map((s) => (
                        <option key={s.shiftId} value={s.shiftId}>{s.shiftName} ({String(s.startTime || '').slice(0, 5)}-{String(s.endTime || '').slice(0, 5)})</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.attendanceCheckinField}>
                    <label className={styles.attendanceCheckinLabel}>Ngày chấm công</label>
                    <input className={styles.attendanceCheckinInput} type="date" value={checkInForm.attendanceDate} onChange={(e) => setCheckInForm((p) => ({ ...p, attendanceDate: e.target.value }))} disabled={isViewingInactiveShift} />
                  </div>
                  <div className={styles.attendanceCheckinField}>
                    <label className={styles.attendanceCheckinLabel}>Giờ vào (tùy chọn)</label>
                    <input className={styles.attendanceCheckinInput} type="time" value={checkInForm.checkInTime} onChange={(e) => setCheckInForm((p) => ({ ...p, checkInTime: e.target.value }))} disabled={isViewingInactiveShift} />
                  </div>
                  <div className={styles.attendanceCheckinField}>
                    <label className={styles.attendanceCheckinLabel}>Ghi chú</label>
                    <input className={styles.attendanceCheckinInput} value={checkInForm.notes} onChange={(e) => setCheckInForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Ghi chú nếu có" disabled={isViewingInactiveShift} />
                  </div>
                  <button type="button" className={styles.attendanceCheckinBtn} onClick={handleViewCheckIn} disabled={isViewingInactiveShift}>✓ Check-in</button>
                </div>
              </div>

              {/* Bảng danh sách */}
              <div className={styles.attendanceTableWrapper}>
                {loadingShiftAttendances ? (
                  <div className={styles.loadingContainer} style={{ minHeight: '150px' }}>
                    <div className={styles.spinner}></div>
                    <p>Đang tải dữ liệu chấm công...</p>
                  </div>
                ) : shiftAttendances.length === 0 ? (
                  <div className={styles.attendanceEmptyState}>
                    <div className={styles.attendanceEmptyIcon}>📋</div>
                    <p className={styles.attendanceEmptyTitle}>Chưa có ai điểm danh</p>
                    <p className={styles.attendanceEmptyMessage}>Không có bản ghi chấm công nào cho ca này trong khoảng thời gian đã chọn.</p>
                  </div>
                ) : (
                  <div className={styles.attendanceTableCard}>
                    <table className={styles.attendanceTable}>
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Nhân viên</th>
                          <th>Ngày</th>
                          <th>Check-in</th>
                          <th>Check-out</th>
                          <th>Trạng thái</th>
                          <th>Ghi chú</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftAttendances.map((record, idx) => {
                          const meta = statusMeta(record?.status);
                          const statusCls =
                            meta.label === 'Có mặt' ? styles.attendanceStatusPresent :
                            meta.label === 'Muộn' ? styles.attendanceStatusLate :
                            meta.label === 'Vắng' ? styles.attendanceStatusAbsent :
                            meta.label === 'Nghỉ' ? styles.attendanceStatusOff :
                            styles.attendanceStatusNotYet;
                          return (
                            <tr key={record.checkinId || idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <div className={styles.attendanceStaffCell}>
                                  <div className={styles.attendanceStaffAvatar}>
                                    {(record.staffName || '?')[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className={styles.attendanceStaffName}>{record.staffName || `ID ${record.staffId}`}</div>
                                    <div className={styles.attendanceStaffId}>#{record.staffId}</div>
                                  </div>
                                </div>
                              </td>
                              <td>{record.attendanceDate || '-'}</td>
                              <td>{record.checkInTime || '-'}</td>
                              <td>{record.checkOutTime || '-'}</td>
                              <td>
                                <span className={`${styles.attendanceStatusBadge} ${statusCls}`}>{meta.label}</span>
                              </td>
                              <td>{record.notes || '-'}</td>
                              <td>
                                <div className={styles.attendanceActionGroup}>
                                  {!record.checkOutTime && (
                                    <button type="button" className={styles.attendanceCheckoutBtn} onClick={() => { setCheckoutTarget(record); setCheckoutForm({ checkOutTime: '', notes: record.notes || '' }); }}>Check-out</button>
                                  )}
                                  <button type="button" className={styles.attendanceDeleteBtn} onClick={() => handleViewDelete(record.checkinId)}>Xóa</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={styles.attendanceModalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setViewShiftModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutTarget && (
        <div className={styles.modalOverlay} onClick={() => setCheckoutTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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
                  <input className={styles.input} type="time" value={checkoutForm.checkOutTime} onChange={(e) => setCheckoutForm((p) => ({ ...p, checkOutTime: e.target.value }))} />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Ghi chú</label>
                  <textarea className={styles.textarea} rows={3} value={checkoutForm.notes} onChange={(e) => setCheckoutForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Nhập ghi chú nếu có..." />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setCheckoutTarget(null)}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={handleViewCheckOut}>Xác nhận check-out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
