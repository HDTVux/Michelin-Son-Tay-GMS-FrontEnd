import { request } from './apiClient';

// ─── Get Attendance List ───────────────────────────────────────────────────
export const fetchAttendance = (params) => {
  const { staffId, from, to } = params || {};
  const queryParams = new URLSearchParams();
  if (staffId) queryParams.append('staffId', staffId);
  if (from) queryParams.append('from', from);
  if (to) queryParams.append('to', to);
  const query = queryParams.toString();
  return request(`/api/manager/attendance${query ? `?${query}` : ''}`);
};

// ─── Get Attendance by Date ──────────────────────────────────────────────────
export const fetchAttendanceByDate = (date) => {
  return request(`/api/manager/attendance/today${date ? `?date=${date}` : ''}`);
};

// ─── Get Today Summary ───────────────────────────────────────────────────────
export const fetchTodaySummary = (date) => {
  return request(`/api/manager/attendance/today-summary${date ? `?date=${date}` : ''}`);
};

// ─── Check-in Staff ──────────────────────────────────────────────────────────
export const createCheckin = (payload) => {
  const { staffId, shiftId, attendanceDate, checkInTime, notes } = payload;
  const body = {
    staffId: Number(staffId),
    shiftId: Number(shiftId),
  };
  if (attendanceDate) body.attendanceDate = attendanceDate;
  if (checkInTime) body.checkInTime = checkInTime;
  if (notes) body.notes = notes;
  return request('/api/manager/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// ─── Check-out Staff ─────────────────────────────────────────────────────────
export const createCheckout = (checkinId, payload) => {
  const { checkOutTime, notes } = payload || {};
  const body = {};
  if (checkOutTime) body.checkOutTime = checkOutTime;
  if (notes) body.notes = notes;
  return request(`/api/manager/attendance/${checkinId}/check-out`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

// ─── Delete Checkin Record ───────────────────────────────────────────────────
export const deleteCheckin = (checkinId) => {
  return request(`/api/manager/attendance/${checkinId}`, {
    method: 'DELETE',
  });
};
