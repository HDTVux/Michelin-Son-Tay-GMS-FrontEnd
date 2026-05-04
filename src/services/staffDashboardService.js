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
