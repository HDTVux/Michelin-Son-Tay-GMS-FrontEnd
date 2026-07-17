import { request } from './apiClient';

// ============ STAFF DASHBOARD APIs ============

/**
 * GET /api/staff/dashboard
 * Lấy toàn bộ thông tin dashboard cho kỹ thuật viên đang đăng nhập.
 * @param {string} token - JWT token
 * @returns {Promise<{data: DashboardOverviewResponse}>}
 */
export const fetchStaffDashboard = (token) =>
  request('/api/staff/dashboard', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * GET /api/staff/statistics?month=&year=
 * Lấy thống kê cá nhân theo tháng.
 * @param {number} month - Tháng (1-12)
 * @param {number} year - Năm (VD: 2026)
 * @param {string} token - JWT token
 */
export const fetchStaffStatistics = (month, year, token) => {
  const path = `/api/staff/statistics?month=${month}&year=${year}`;
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * GET /api/staff/attendance/history?month=&year=
 * Lấy lịch sử chấm công theo tháng.
 * @param {number} month - Tháng (1-12)
 * @param {number} year - Năm
 * @param {string} token - JWT token
 */
export const fetchStaffAttendanceHistory = (month, year, token) => {
  const path = `/api/staff/attendance/history?month=${month}&year=${year}`;
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ============ ATTENDANCE QR + GPS APIs ============
// Xem docs/migration_attendance_qr_location.sql cho schema + API contract đề xuất.

/**
 * GET /api/staff/attendance/qr-status?token=
 * Tra cứu vị trí theo mã QR đã quét + trạng thái chấm công hôm nay của bản thân.
 * @param {string} qrToken - Token lấy được từ mã QR
 * @param {string} token - JWT token
 */
export const fetchQrAttendanceStatus = (qrToken, token) =>
  request(`/api/staff/attendance/qr-status?token=${encodeURIComponent(qrToken)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * POST /api/staff/attendance/qr-check-in
 * Tự chấm công vào bằng mã QR + tọa độ GPS.
 */
export const submitQrCheckIn = (payload, token) =>
  request('/api/staff/attendance/qr-check-in', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      qrToken: payload?.qrToken,
      latitude: payload?.latitude,
      longitude: payload?.longitude,
    }),
  });

/**
 * POST /api/staff/attendance/qr-check-out
 * Tự chấm công ra bằng mã QR + tọa độ GPS.
 */
export const submitQrCheckOut = (payload, token) =>
  request('/api/staff/attendance/qr-check-out', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      qrToken: payload?.qrToken,
      latitude: payload?.latitude,
      longitude: payload?.longitude,
    }),
  });

/**
 * GET /api/staff/tasks/today
 * Lấy danh sách công việc hôm nay.
 */
export const fetchStaffTodayTasks = (token) =>
  request('/api/staff/tasks/today', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * GET /api/staff/schedule?from=&to=
 * Lấy lịch làm việc theo khoảng ngày.
 */
export const fetchStaffSchedule = (from, to, token) => {
  const path = `/api/staff/schedule?from=${from}&to=${to}`;
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * GET /api/staff/notifications?page=&size=
 * Lấy danh sách thông báo có phân trang.
 */
export const fetchStaffNotifications = (token) =>
  request('/api/staff-notification', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * PUT /api/staff/notifications/{notificationId}/read
 * Đánh dấu một thông báo đã đọc.
 */
export const markStaffNotificationAsRead = (notificationId, token) =>
  request(`/api/staff-notification/${encodeURIComponent(notificationId)}/isReaded`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

// ============ STAFF DASHBOARD CONFIG APIs ============

export const fetchStaffDashboardConfigs = (token) =>
  request('/api/staff/dashboard/configs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchActiveStaffDashboardConfig = (token) =>
  request('/api/staff/dashboard/configs/active', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

export const createStaffDashboardConfig = (payload, token) =>
  request('/api/staff/dashboard/configs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

export const updateStaffDashboardConfig = (id, payload, token) =>
  request(`/api/staff/dashboard/configs/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

export const deleteStaffDashboardConfig = (id, token) =>
  request(`/api/staff/dashboard/configs/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

export const activateStaffDashboardConfig = (id, token) =>
  request(`/api/staff/dashboard/configs/${id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

