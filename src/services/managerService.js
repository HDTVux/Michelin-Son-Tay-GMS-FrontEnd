import { request } from './apiClient';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const toIsoDate = (value) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const toIsoTime = (value) => {
  if (!value) return null;
  return String(value).slice(0, 8);
};

export const fetchManagerAttendance = async ({ staffId, from, to }, token) => {
  const params = new URLSearchParams();
  if (staffId != null && String(staffId).trim() !== '') params.set('staffId', String(staffId));
  if (from) params.set('from', toIsoDate(from));
  if (to) params.set('to', toIsoDate(to));

  return request(`/api/manager/attendance?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchManagerTodayAttendance = ({ date } = {}, token) => {
  const q = date ? `?date=${encodeURIComponent(toIsoDate(date))}` : '';
  return request(`/api/manager/attendance/today${q}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchManagerTodaySummary = ({ date } = {}, token) => {
  const q = date ? `?date=${encodeURIComponent(toIsoDate(date))}` : '';
  return request(`/api/manager/attendance/today-summary${q}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const managerCheckIn = (payload, token) => {
  const body = {
    staffId: Number(payload?.staffId),
    shiftId: Number(payload?.shiftId),
    attendanceDate: payload?.attendanceDate ? toIsoDate(payload.attendanceDate) : null,
    checkInTime: payload?.checkInTime ? toIsoTime(payload.checkInTime) : null,
    notes: payload?.notes || null,
  };

  return request('/api/manager/attendance/check-in', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
};

export const managerCheckOut = (checkinId, payload = {}, token) => {
  return request(`/api/manager/attendance/${encodeURIComponent(String(checkinId))}/check-out`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      checkOutTime: payload?.checkOutTime ? toIsoTime(payload.checkOutTime) : null,
      notes: payload?.notes || null,
    }),
  });
};

export const managerDeleteCheckin = (checkinId, token) => {
  return request(`/api/manager/attendance/${encodeURIComponent(String(checkinId))}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
};

export const fetchManagerEmployees = (token) => {
  return request('/api/manager/employees', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchManagerEmployeeDetail = (staffId, token) => {
  return request(`/api/manager/employees/${encodeURIComponent(String(staffId))}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchWorkShifts = (token) => {
  return request('/api/manager/work-shifts', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchWorkShiftById = (shiftId, token) => {
  return request(`/api/manager/work-shifts/${encodeURIComponent(String(shiftId))}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const createWorkShift = (payload, token) => {
  return request('/api/manager/work-shifts', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      shiftName: payload?.shiftName || '',
      startTime: toIsoTime(payload?.startTime),
      endTime: toIsoTime(payload?.endTime),
      isActive: payload?.isActive !== false,
    }),
  });
};

export const updateWorkShift = (shiftId, payload, token) => {
  return request(`/api/manager/work-shifts/${encodeURIComponent(String(shiftId))}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      shiftName: payload?.shiftName || '',
      startTime: toIsoTime(payload?.startTime),
      endTime: toIsoTime(payload?.endTime),
      isActive: payload?.isActive !== false,
    }),
  });
};

export const deactivateWorkShift = (shiftId, token) => {
  return request(`/api/manager/work-shifts/${encodeURIComponent(String(shiftId))}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
};

export const reactivateWorkShift = (shiftId, token) => {
  return request(`/api/manager/work-shifts/${encodeURIComponent(String(shiftId))}/reactivate`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
};
