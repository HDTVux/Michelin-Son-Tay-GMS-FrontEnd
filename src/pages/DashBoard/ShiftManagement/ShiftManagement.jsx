import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createWorkShift,
  deactivateWorkShift,
  reactivateWorkShift,
  fetchManagerAttendance,
  fetchManagerEmployees,
  fetchWorkShifts,
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

const shiftLocalISODate = (dateIso, days) => {
  const raw = String(dateIso || '').trim();
  const baseDate = raw ? new Date(`${raw}T00:00:00`) : new Date();
  if (Number.isNaN(baseDate.getTime())) return getTodayLocalISO();
  baseDate.setDate(baseDate.getDate() + Number(days || 0));
  const offsetMs = baseDate.getTimezoneOffset() * 60000;
  return new Date(baseDate.getTime() - offsetMs).toISOString().slice(0, 10);
};

const formatCalendarDisplay = (dateIso) => {
  const raw = String(dateIso || '').trim();
  if (!raw) return 'Chọn ngày';
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

const normalizeStatusKey = (value) => {
  const raw = String(value || '').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (!raw) return '';
  if (raw === 'LATE' || raw === 'MUON' || raw.includes('LATE')) return 'LATE';
  if (raw === 'PRESENT' || raw === 'CO_MAT' || raw === 'CHECKED_IN' || raw.includes('PRESENT')) return 'PRESENT';
  if (raw === 'ABSENT' || raw === 'VANG' || raw.includes('ABSENT')) return 'ABSENT';
  if (raw === 'OFF' || raw === 'NGHI' || raw.includes('OFF')) return 'OFF';
  if (raw === 'NOT_YET' || raw === 'PENDING' || raw.includes('PENDING') || raw.includes('NOT_YET')) return 'NOT_YET';
  return raw;
};

const resolveAttendanceStatus = (record, shift) => {
  const directStatus = normalizeStatusKey(record?.status);
  const hasCheckIn = Boolean(String(record?.checkInTime || '').trim());
  const checkInMinutes = toTimeMinutes(record?.checkInTime);
  const shiftStart = record?.shiftStartTime || shift?.startTime || '';
  const shiftStartMinutes = toTimeMinutes(shiftStart);
  const isLateByTime = (
    hasCheckIn
    && checkInMinutes != null
    && shiftStartMinutes != null
    && checkInMinutes > shiftStartMinutes
  );

  if (directStatus === 'ABSENT' || directStatus === 'OFF') return directStatus;
  if (record?.isLate === true || isLateByTime) return 'LATE';
  if (directStatus) return directStatus;
  if (!hasCheckIn) return 'NOT_YET';

  if (checkInMinutes != null && shiftStartMinutes != null) {
    return 'PRESENT';
  }

  return 'PRESENT';
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
  const dayPickerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState(initialFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter || '');
  const [createdDateFilter, setCreatedDateFilter] = useState(
    initialFilters.createdDateFilter || getTodayLocalISO(),
  );

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
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState(null);
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
  const attendanceMaxDate = getTodayLocalISO();
  const attendanceMinDate = shiftLocalISODate(attendanceMaxDate, -3);
  const isAttendanceActionDateAllowed = useCallback(
    (date) => {
      const key = toDateKey(date);
      if (!key) return false;
      return key >= attendanceMinDate && key <= attendanceMaxDate;
    },
    [attendanceMinDate, attendanceMaxDate],
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
      createdDateFilter,
    });
  }, [search, statusFilter, createdDateFilter]);

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
      const createdDate = toDateKey(shift?.createdAt);
      const matchesCreatedDate = !createdDateFilter || createdDate === createdDateFilter;

      return matchesSearch && matchesStatus && matchesCreatedDate;
    });
  }, [shifts, deferredSearch, statusFilter, createdDateFilter]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter((shift) => shift?.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [shifts]);

  const checkedInStaffIds = useMemo(() => {
    const set = new Set();
    shiftAttendances.forEach((record) => {
      const staffId = Number(record?.staffId);
      if (Number.isFinite(staffId) && staffId > 0) set.add(staffId);
    });
    return set;
  }, [shiftAttendances]);

  const normalizedAttendanceSearch = attendanceSearch.trim().toLowerCase();

  const filteredEmployeesForAttendance = useMemo(() => {
    if (!normalizedAttendanceSearch) return employees;
    return employees.filter((employee) => {
      const idText = String(employee?.staffId ?? '');
      const nameText = String(employee?.fullName || employee?.name || '');
      return `${idText} ${nameText}`.toLowerCase().includes(normalizedAttendanceSearch);
    });
  }, [employees, normalizedAttendanceSearch]);

  const visibleShiftAttendances = useMemo(() => {
    if (!normalizedAttendanceSearch) return shiftAttendances;
    return shiftAttendances.filter((record) => {
      const checkinIdText = String(record?.checkinId ?? '');
      const staffIdText = String(record?.staffId ?? '');
      const nameText = String(record?.staffName || '');
      return `${checkinIdText} ${staffIdText} ${nameText}`.toLowerCase().includes(normalizedAttendanceSearch);
    });
  }, [shiftAttendances, normalizedAttendanceSearch]);

  const viewShiftStart = String(viewShiftModal?.startTime || '').slice(0, 5);
  const viewShiftEnd = String(viewShiftModal?.endTime || '').slice(0, 5);
  const shiftTimeOptions = useMemo(
    () => buildShiftTimeOptions(viewShiftStart, viewShiftEnd, 5),
    [viewShiftStart, viewShiftEnd],
  );
  const fullDayTimeOptions = useMemo(() => buildShiftTimeOptions('00:00', '23:55', 5), []);
  const modalShiftSuggestions = useMemo(() => {
    const query = modalShiftSearch.trim().toLowerCase();
    if (!query) return [];
    return shifts
      .filter((shift) => `${shift?.shiftId ?? ''} ${shift?.shiftName ?? ''}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [modalShiftSearch, shifts]);

  const handlePickDay = (nextDate) => {
    const value = String(nextDate || '').trim();
    if (!value) return;
    setCreatedDateFilter(value);
  };

  const handlePreviousDay = () => {
    setCreatedDateFilter((prev) => shiftLocalISODate(prev || getTodayLocalISO(), -1));
  };

  const handleNextDay = () => {
    setCreatedDateFilter((prev) => shiftLocalISODate(prev || getTodayLocalISO(), 1));
  };

  const handleOpenCalendar = () => {
    const picker = dayPickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
    picker.focus();
  };

  const handleBackToToday = () => {
    setCreatedDateFilter(getTodayLocalISO());
  };

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

  const handleDeleteCheckin = async (record) => {
    const checkinId = Number(record?.checkinId);
    if (!Number.isFinite(checkinId) || checkinId <= 0) return;
    if (!window.confirm('Bạn chắc chắn muốn xóa bản ghi điểm danh này?')) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await managerDeleteCheckin(checkinId, token);
      toast.success('Đã xóa bản ghi điểm danh.');
      await loadShiftAttendances(viewShiftModal, viewAttendanceDate);
    } catch (err) {
      toast.error(err?.message || 'Xóa thất bại.');
    }
  };

  const closeViewShiftModal = () => {
    setViewShiftModal(null);
    setShiftAttendances([]);
    setEmployees([]);
    setAttendanceSearch('');
    setCheckingOutId(null);
    setSubmittingCheckIn(false);
    setAttendanceForm({
      staffId: '',
      attendanceDate: getTodayLocalISO(),
      checkInTime: '',
      notes: '',
    });
  };

  const loadModalEmployees = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoadingEmployees(true);
    try {
      const response = await fetchManagerEmployees(token);
      const list = Array.isArray(response?.data) ? response.data : [];
      setEmployees(list);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

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
    } catch {
      setShiftAttendances([]);
    } finally {
      setLoadingShiftAttendances(false);
    }
  }, [shifts]);

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
        void Promise.all([
          loadShiftAttendances(matchedViewShift, restoredDate),
          loadModalEmployees(),
        ]);
      }
    }
  }, [loading, shifts, loadShiftAttendances, loadModalEmployees]);

  const handleViewShift = async (shift) => {
    const today = getTodayLocalISO();
    const pickedDate = toDateKey(createdDateFilter) || today;
    const defaultCheckInTime = String(shift?.startTime || '').slice(0, 5);
    setViewShiftModal(shift);
    setAttendanceSearch('');
    setViewAttendanceDate(pickedDate);
    setAttendanceForm({
      staffId: '',
      attendanceDate: pickedDate,
      checkInTime: defaultCheckInTime,
      notes: '',
    });
    setShiftAttendances([]);

    await Promise.all([
      loadShiftAttendances(shift, pickedDate),
      loadModalEmployees(),
    ]);
  };

  const handleModalDateChange = async (nextDate) => {
    const date = String(nextDate || '').trim();
    if (!date || !viewShiftModal?.shiftId) return;
    setViewAttendanceDate(date);
    setAttendanceForm((prev) => ({ ...prev, attendanceDate: date }));
    await loadShiftAttendances(viewShiftModal, date);
  };

  const handleModalCheckIn = async () => {
    if (!viewShiftModal?.shiftId) return;
    const token = getAuthToken();
    if (!token) return;

    const staffId = Number(attendanceForm.staffId);
    if (!Number.isFinite(staffId) || staffId <= 0) {
      toast.error('Vui lòng chọn nhân viên để điểm danh.');
      return;
    }
    if (checkedInStaffIds.has(staffId)) {
      toast.error('Nhân viên này đã được điểm danh trong ca.');
      return;
    }

    const attendanceDate = attendanceForm.attendanceDate || viewAttendanceDate || getTodayLocalISO();
    if (!isAttendanceActionDateAllowed(attendanceDate)) {
      toast.error(`Chỉ được điểm danh từ ${attendanceMinDate} đến ${attendanceMaxDate}.`);
      return;
    }
    const selectedCheckInTime = String(attendanceForm.checkInTime || '').slice(0, 5);
    if (!selectedCheckInTime) {
      toast.error('Vui lòng chọn giờ vào.');
      return;
    }
    if (!isTimeInsideShift(selectedCheckInTime, viewShiftModal?.startTime, viewShiftModal?.endTime)) {
      toast.error(`Chỉ được điểm danh trong khung giờ ca ${viewShiftStart} - ${viewShiftEnd}.`);
      return;
    }

    setSubmittingCheckIn(true);
    try {
      await managerCheckIn(
        {
          staffId,
          shiftId: Number(viewShiftModal.shiftId),
          attendanceDate,
          checkInTime: selectedCheckInTime,
          notes: attendanceForm.notes || '',
        },
        token,
      );
      toast.success('Điểm danh vào ca thành công.');
      setAttendanceForm((prev) => ({
        ...prev,
        staffId: '',
        notes: '',
      }));
      setViewAttendanceDate(attendanceDate);
      await loadShiftAttendances(viewShiftModal, attendanceDate);
    } catch (err) {
      toast.error(err?.message || 'Điểm danh thất bại.');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleUseNowCheckInTime = () => {
    if (!viewShiftModal) return;
    const now = getNowLocalHHMM();
    if (isTimeInsideShift(now, viewShiftModal?.startTime, viewShiftModal?.endTime)) {
      setAttendanceForm((prev) => ({ ...prev, checkInTime: now }));
      return;
    }
    const fallback = String(viewShiftModal?.startTime || '').slice(0, 5);
    setAttendanceForm((prev) => ({ ...prev, checkInTime: fallback }));
    toast.info(`Giờ hiện tại ngoài ca, đã chuyển về giờ bắt đầu ca ${fallback}.`);
  };

  const handleUseShiftBoundaryTime = (value) => {
    const normalized = String(value || '').slice(0, 5);
    if (!normalized) return;
    setAttendanceForm((prev) => ({ ...prev, checkInTime: normalized }));
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

  const handleModalCheckOut = async (record) => {
    const checkinId = Number(record?.checkinId);
    if (!Number.isFinite(checkinId) || checkinId <= 0) return;
    const token = getAuthToken();
    if (!token || !viewShiftModal?.shiftId) return;
    const recordDate = toDateKey(record?.attendanceDate) || viewAttendanceDate;
    if (!isAttendanceActionDateAllowed(recordDate)) {
      toast.error(`Chỉ được điểm danh từ ${attendanceMinDate} đến ${attendanceMaxDate}.`);
      return;
    }

    setCheckingOutId(checkinId);
    try {
      await managerCheckOut(checkinId, {}, token);
      toast.success('Chấm công ra thành công.');
      await loadShiftAttendances(viewShiftModal, viewAttendanceDate);
    } catch (err) {
      toast.error(err?.message || 'Chấm công ra thất bại.');
    } finally {
      setCheckingOutId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    const key = normalizeStatusKey(status);
    switch (key) {
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
    const key = normalizeStatusKey(status);
    switch (key) {
      case 'PRESENT':
        return 'Có mặt';
      case 'LATE':
        return 'Muộn';
      case 'ABSENT':
        return 'Vắng';
      case 'OFF':
        return 'Nghỉ';
      case 'NOT_YET':
        return 'Chưa vào ca';
      default:
        return key ? 'Khác' : '-';
    }
  };

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
          <span>Lịch ngày</span>
          <span>Trạng thái</span>
        </div>

        <div className={`${styles.filterCardControls} ${styles.filterCardControlsTwo}`}>
          <div className={styles.dayNavigator}>
            <button type="button" className={styles.dayNavBtn} onClick={handlePreviousDay}>
              Trước
            </button>
            <button type="button" className={styles.dayCenterBtn} onClick={handleOpenCalendar}>
              {formatCalendarDisplay(createdDateFilter)}
            </button>
            <button type="button" className={styles.dayNavBtn} onClick={handleNextDay}>
              Sau
            </button>
            <input
              ref={dayPickerRef}
              type="date"
              value={createdDateFilter}
              onChange={(e) => handlePickDay(e.target.value)}
              className={styles.hiddenDateInput}
              aria-label="Chọn ngày tạo ca"
            />
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

        <div className={styles.filterCardActions}>
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
          <button type="button" className={styles.filterGhostBtn} onClick={handleBackToToday}>
            Về hôm nay
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
        <div className={styles.modalOverlay} onClick={closeViewShiftModal}>
          <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Chấm công ca {viewShiftModal.shiftName}</h3>
                <p className={styles.modalSubtitle}>
                  Ca làm: {String(viewShiftModal.startTime || '').slice(0, 5)} -{' '}
                  {String(viewShiftModal.endTime || '').slice(0, 5)} - Ngày {formatCalendarDisplay(viewAttendanceDate)}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeViewShiftModal}>
                x
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalPanel}>
                <h4 className={styles.modalPanelTitle}>Điểm danh nhân viên trong ca</h4>

                <div className={styles.modalFilterRow}>
                  <div className={styles.modalFilterField}>
                    <label className={styles.modalFilterLabel}>Ngày chấm công</label>
                    <input
                      type="date"
                      className={styles.modalFilterInput}
                      value={viewAttendanceDate}
                      onChange={(e) => handleModalDateChange(e.target.value)}
                    />
                  </div>

                  <div className={styles.modalFilterField}>
                    <label className={styles.modalFilterLabel}>Tìm ID/Tên</label>
                    <input
                      className={styles.modalFilterInput}
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      placeholder="Tìm theo mã, tên nhân viên..."
                    />
                  </div>

                  <div className={styles.modalFilterField}>
                    <label className={styles.modalFilterLabel}>Nhân viên</label>
                    <select
                      className={styles.modalFilterInput}
                      value={attendanceForm.staffId}
                      onChange={(e) => setAttendanceForm((prev) => ({ ...prev, staffId: e.target.value }))}
                      disabled={loadingEmployees || submittingCheckIn}
                    >
                      <option value="">
                        {loadingEmployees ? 'Đang tải nhân viên...' : 'Chọn nhân viên'}
                      </option>
                      {filteredEmployeesForAttendance.map((employee) => {
                        const employeeId = Number(employee?.staffId);
                        const alreadyChecked = checkedInStaffIds.has(employeeId);
                        return (
                          <option key={employee.staffId} value={employee.staffId} disabled={alreadyChecked}>
                            #{employee.staffId} - {employee.fullName || employee.name || 'Không tên'} ({employee.position || 'N/A'}) {alreadyChecked ? '- Đã điểm danh' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className={styles.modalFilterField}>
                    <label className={styles.modalFilterLabel}>Giờ vào</label>
                    <select
                      className={styles.modalFilterInput}
                      value={attendanceForm.checkInTime}
                      onChange={(e) => setAttendanceForm((prev) => ({ ...prev, checkInTime: e.target.value }))}
                    >
                      <option value="">Chọn giờ vào</option>
                      {shiftTimeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <div className={styles.timeQuickActions}>
                      <button
                        type="button"
                        className={styles.timeQuickBtn}
                        onClick={() => handleUseShiftBoundaryTime(viewShiftStart)}
                      >
                        Đầu ca {viewShiftStart}
                      </button>
                      <button
                        type="button"
                        className={styles.timeQuickBtn}
                        onClick={handleUseNowCheckInTime}
                      >
                        Giờ hiện tại
                      </button>
                      <button
                        type="button"
                        className={styles.timeQuickBtn}
                        onClick={() => handleUseShiftBoundaryTime(viewShiftEnd)}
                      >
                        Cuối ca {viewShiftEnd}
                      </button>
                    </div>
                    <p className={styles.timeHint}>
                      Chỉ được điểm danh trong khung giờ {viewShiftStart} - {viewShiftEnd}.
                    </p>
                  </div>
                </div>

                <div className={styles.modalFilterRow}>
                  <div className={`${styles.modalFilterField} ${styles.modalFilterFieldGrow}`}>
                    <label className={styles.modalFilterLabel}>Ghi chú</label>
                    <input
                      className={styles.modalFilterInput}
                      value={attendanceForm.notes}
                      onChange={(e) => setAttendanceForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Nhập ghi chú nếu có"
                    />
                  </div>
                  <div className={styles.modalFilterActions}>
                    <button
                      type="button"
                      className={styles.filterPrimaryBtn}
                      onClick={handleModalCheckIn}
                      disabled={
                        submittingCheckIn
                        || viewShiftModal?.isActive === false
                        || !attendanceForm.staffId
                        || !attendanceForm.checkInTime
                        || !isTimeInsideShift(attendanceForm.checkInTime, viewShiftModal?.startTime, viewShiftModal?.endTime)
                        || !isAttendanceActionDateAllowed(viewAttendanceDate)
                      }
                    >
                      {viewShiftModal?.isActive === false
                        ? 'Ca đã vô hiệu'
                        : submittingCheckIn
                        ? 'Đang điểm danh...'
                        : 'Điểm danh'}
                    </button>
                  </div>
                </div>
              </div>

              {loadingShiftAttendances ? (
                <div className={styles.loadingContainer} style={{ minHeight: '200px' }}>
                  <div className={styles.spinner}></div>
                  <p>Đang tải dữ liệu chấm công...</p>
                </div>
              ) : shiftAttendances.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>i</div>
                  <p className={styles.emptyTitle}>Chưa có bản ghi trong ngày này</p>
                  <p className={styles.emptyMessage}>
                    Chưa có nhân viên điểm danh vào/ra ca {viewShiftModal.shiftName} vào ngày {formatCalendarDisplay(viewAttendanceDate)}.
                  </p>
                </div>
              ) : visibleShiftAttendances.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>i</div>
                  <p className={styles.emptyTitle}>Không có kết quả phù hợp</p>
                  <p className={styles.emptyMessage}>
                    Không tìm thấy nhân viên theo từ khóa "{attendanceSearch.trim()}".
                  </p>
                </div>
              ) : (
                <div className={styles.tableCardInner}>
                  <table className={`${styles.table} ${styles.attendanceTable}`}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã chấm công</th>
                        <th>Mã nhân viên</th>
                        <th>Nhân viên</th>
                        <th>Mã ca</th>
                        <th>Tên ca</th>
                        <th>Ngày</th>
                        <th>Giờ vào</th>
                        <th>Giờ ra</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleShiftAttendances.map((record, idx) => {
                        const checkinId = Number(record?.checkinId);
                        const recordDate = toDateKey(record?.attendanceDate) || viewAttendanceDate;
                        const canActionDate = isAttendanceActionDateAllowed(recordDate);
                        const canCheckOut = !record?.checkOutTime && Number.isFinite(checkinId) && checkinId > 0 && canActionDate;
                        const resolvedStatus = resolveAttendanceStatus(record, viewShiftModal);
                        return (
                          <tr key={record.checkinId || idx}>
                            <td>{idx + 1}</td>
                            <td>{record.checkinId ?? '-'}</td>
                            <td>{record.staffId ?? '-'}</td>
                            <td>{record.staffName || '-'}</td>
                            <td>{record.shiftId ?? '-'}</td>
                            <td>{record.shiftName || viewShiftModal.shiftName || '-'}</td>
                            <td>{recordDate || '-'}</td>
                            <td>{record.checkInTime || '-'}</td>
                            <td>{record.checkOutTime || '-'}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${getStatusBadgeClass(resolvedStatus)}`}>
                                {getStatusLabel(resolvedStatus)}
                              </span>
                            </td>
                            <td>{record.notes || '-'}</td>
                            <td>
                              <div className={styles.actionGroup}>
                                {canCheckOut && (
                                  <button
                                    type="button"
                                    className={styles.checkoutBtn}
                                    onClick={() => handleModalCheckOut(record)}
                                    disabled={checkingOutId === checkinId}
                                  >
                                    {checkingOutId === checkinId ? 'Đang xử lý...' : 'Chấm công ra'}
                                  </button>
                                )}
                                {!canActionDate && (
                                  <span className={styles.blockedLabel}>Ngoài hạn</span>
                                )}
                                {record.checkInTime && (
                                  <button
                                    type="button"
                                    className={styles.deactivateBtn}
                                    onClick={() => handleDeleteCheckin(record)}
                                    disabled={checkingOutId === checkinId}
                                    title="Xóa bản ghi điểm danh"
                                  >
                                    Xóa
                                  </button>
                                )}
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

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={closeViewShiftModal}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

