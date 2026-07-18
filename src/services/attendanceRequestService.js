import { request } from './apiClient';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const toIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const toIsoTime = (value) => {
  if (!value) return null;
  return String(value).slice(0, 8);
};

const buildRequestBody = (payload) => ({
  requestType: payload?.requestType,
  startDate: toIsoDate(payload?.startDate),
  endDate: toIsoDate(payload?.endDate || payload?.startDate),
  shiftId: payload?.shiftId ? Number(payload.shiftId) : null,
  checkInTime: payload?.checkInTime ? toIsoTime(payload.checkInTime) : null,
  checkOutTime: payload?.checkOutTime ? toIsoTime(payload.checkOutTime) : null,
  reason: payload?.reason || '',
});

export const fetchShiftsForRequest = (token) => {
  return request('/api/staff/attendance-requests/shifts', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchMyAttendanceRequests = (token) => {
  return request('/api/staff/attendance-requests', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const createAttendanceRequest = (payload, token) => {
  return request('/api/staff/attendance-requests', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(buildRequestBody(payload)),
  });
};

export const cancelAttendanceRequest = (requestId, token) => {
  return request(`/api/staff/attendance-requests/${encodeURIComponent(String(requestId))}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
};

export const fetchAttendanceRequestsForManager = ({ status, type } = {}, token) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);

  return request(`/api/manager/attendance-requests?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const approveAttendanceRequest = (requestId, payload = {}, token) => {
  return request(`/api/manager/attendance-requests/${encodeURIComponent(String(requestId))}/approve`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ reviewNote: payload?.reviewNote || null }),
  });
};

export const rejectAttendanceRequest = (requestId, payload = {}, token) => {
  return request(`/api/manager/attendance-requests/${encodeURIComponent(String(requestId))}/reject`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ reviewNote: payload?.reviewNote || '' }),
  });
};
