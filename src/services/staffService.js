import { request } from './apiClient';

// ============ STAFF DASHBOARD APIs ============

/**
 * Lấy dashboard tổng quan cho nhân viên (KPI, biểu đồ, lịch hẹn gần đây)
 * Endpoint: GET /api/staff/dashboard
 * Backend trả về: { todayBookings, pendingBookings, completedBookings, totalCustomers,
 *                    revenue, avgRating, monthlyBookings[], serviceDistribution[], recentBookings[] }
 */
export const fetchStaffDashboard = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff/dashboard', { method: 'GET' });
};

/**
 * Lấy lịch làm việc của nhân viên theo khoảng ngày
 * Endpoint: GET /api/staff/schedule?from=yyyy-MM-dd&to=yyyy-MM-dd
 * Backend trả về: [{ date, startTime, endTime, service, customerName, status, bookingCode }]
 * @param {string} from - Ngày bắt đầu (yyyy-MM-dd)
 * @param {string} to   - Ngày kết thúc (yyyy-MM-dd)
 */
export const fetchStaffSchedule = (from, to) => {
  // apiClient.js tự lấy authToken từ localStorage
  const params = new URLSearchParams({ from, to });
  return request(`/api/staff/schedule?${params}`, { method: 'GET' });
};

// ============ STAFF ATTENDANCE APIs ============

/**
 * Lấy lịch sử chấm công của nhân viên theo tháng
 * Endpoint: GET /api/staff/attendance/history?month=&year=
 * Backend trả về: ApiResponse<List<AttendanceRecordDto>>
 * DTO fields: date, dayOfWeek, shiftType, checkInTime, checkOutTime, status
 * @param {number} month - Tháng (1-12)
 * @param {number} year  - Năm
 */
export const fetchStaffAttendance = (month, year) => {
  // apiClient.js tự lấy authToken từ localStorage
  const params = new URLSearchParams({ month: String(month), year: String(year) });
  return request(`/api/staff/attendance/history?${params}`, { method: 'GET' });
};

// ============ STAFF PROFILE APIs ============

/**
 * Lấy thông tin profile của staff
 * Endpoint: GET /api/staff-profile
 */
export const fetchStaffProfile = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff-profile', { method: 'GET' });
};

/**
 * Cập nhật thông tin profile của staff
 * Endpoint: PUT /api/staff-profile
 * @param {object} payload - Dữ liệu cập nhật
 */
export const updateStaffProfile = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff-profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Upload avatar cho staff
 * Endpoint: PUT /api/staff-profile/avatar
 * @param {File} file - File ảnh avatar
 */
/**
 * Đổi mật khẩu nhân viên
 * Endpoint: PUT /api/staff-profile/password
 * @param {object} payload - { currentPassword, newPassword }
 */
export const changePassword = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff-profile/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const uploadStaffAvatar = (file) => {
  // apiClient.js tự lấy authToken từ localStorage
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('staffToken') || '';
  const formData = new FormData();
  formData.append('avatar', file);

  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/staff-profile/avatar`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Upload failed');
    }
    return data;
  });
};
