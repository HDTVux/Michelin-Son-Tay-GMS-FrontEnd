import { request } from './apiClient';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

// ============ ATTENDANCE LOCATION APIs (manager/admin) ============
// Xem docs/migration_attendance_qr_location.sql cho schema + API contract đề xuất.

export const fetchAttendanceLocations = (token) =>
  request('/api/manager/attendance-locations', {
    method: 'GET',
    headers: authHeaders(token),
  });

export const createAttendanceLocation = (payload, token) => {
  const body = {
    locationName: payload?.locationName || '',
    address: payload?.address || null,
    latitude: Number(payload?.latitude),
    longitude: Number(payload?.longitude),
    radiusMeters: Number(payload?.radiusMeters) || 100,
  };

  return request('/api/manager/attendance-locations', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
};

export const updateAttendanceLocation = (locationId, payload, token) => {
  const body = {
    locationName: payload?.locationName || '',
    address: payload?.address || null,
    latitude: Number(payload?.latitude),
    longitude: Number(payload?.longitude),
    radiusMeters: Number(payload?.radiusMeters) || 100,
  };

  return request(`/api/manager/attendance-locations/${encodeURIComponent(String(locationId))}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
};

export const deactivateAttendanceLocation = (locationId, token) =>
  request(`/api/manager/attendance-locations/${encodeURIComponent(String(locationId))}/deactivate`, {
    method: 'PUT',
    headers: authHeaders(token),
  });

export const reactivateAttendanceLocation = (locationId, token) =>
  request(`/api/manager/attendance-locations/${encodeURIComponent(String(locationId))}/reactivate`, {
    method: 'PUT',
    headers: authHeaders(token),
  });

export const regenerateAttendanceLocationQr = (locationId, token) =>
  request(`/api/manager/attendance-locations/${encodeURIComponent(String(locationId))}/regenerate-qr`, {
    method: 'POST',
    headers: authHeaders(token),
  });
