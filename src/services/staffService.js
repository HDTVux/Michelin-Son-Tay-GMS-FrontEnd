import { request } from './apiClient';

// ============================================================
// STAFF DASHBOARD APIs
// Base: /api/staff
// ============================================================

/**
 * Lấy dashboard tổng quan cho nhân viên
 * Backend: GET /api/staff/dashboard
 * Response: DashboardOverviewResponse
 * Fields: staff, todayShift, monthlyHours, completedServices,
 *         todayTasks[], upcomingSchedule[], recentAttendance[], notifications[]
 */
export const fetchStaffDashboard = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff/dashboard', { method: 'GET' });
};

/**
 * Lấy lịch làm việc của nhân viên theo khoảng ngày
 * Backend: GET /api/staff/schedule?from=yyyy-MM-dd&to=yyyy-MM-dd
 * Response: List<ScheduleDayDto>
 * Fields: date, dayOfWeek, shiftName, startTime, endTime, status
 * Status values: SCHEDULED, CONFIRMED, CANCELLED, OFF
 */
export const fetchStaffSchedule = (from, to) => {
  // apiClient.js tự lấy authToken từ localStorage
  const params = new URLSearchParams({ from, to });
  return request(`/api/staff/schedule?${params}`, { method: 'GET' });
};

/**
 * Lấy công việc hôm nay của nhân viên
 * Backend: GET /api/staff/tasks/today
 * Response: List<TaskSummaryDto>
 * Fields: serviceTicketId, ticketCode, licensePlate, vehicleBrand,
 *         vehicleModel, customerName, ticketStatus, receivedAt
 */
export const fetchTodayTasks = () => {
  return request('/api/staff/tasks/today', { method: 'GET' });
};

/**
 * Lấy thống kê cá nhân theo tháng
 * Backend: GET /api/staff/statistics?month=&year=
 * Response: Map<String, Object> with totalHours, month, completedServices count
 */
export const fetchStaffStatistics = (month, year) => {
  const params = new URLSearchParams({ month: String(month), year: String(year) });
  return request(`/api/staff/statistics?${params}`, { method: 'GET' });
};

// ============================================================
// STAFF ATTENDANCE APIs (Personal)
// ============================================================

/**
 * Lấy lịch sử chấm công của nhân viên theo tháng
 * Backend: GET /api/staff/attendance/history?month=&year=
 * Response: List<AttendanceRecordDto>
 * Fields: date, dayOfWeek, shiftType, checkInTime, checkOutTime, status
 * Status values: PRESENT, LATE, EARLY_LEAVE, ABSENT
 */
export const fetchStaffAttendance = (month, year) => {
  // apiClient.js tự lấy authToken từ localStorage
  const params = new URLSearchParams({ month: String(month), year: String(year) });
  return request(`/api/staff/attendance/history?${params}`, { method: 'GET' });
};

// ============================================================
// STAFF PROFILE APIs
// ============================================================

/**
 * Lấy thông tin profile của staff đang login
 * Backend: GET /api/staff-profile
 */
export const fetchStaffProfile = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff-profile', { method: 'GET' });
};

/**
 * Cập nhật thông tin profile của staff
 * Backend: PUT /api/staff-profile
 */
export const updateStaffProfile = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff-profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Đổi mật khẩu nhân viên
 * Backend: PUT /api/staff-profile/password
 * Payload: { currentPassword, newPassword }
 */
export const changePassword = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/staff-profile/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Upload avatar cho staff
 * Backend: PUT /api/staff-profile/avatar
 * @param {File} file - File ảnh avatar
 */
export const uploadStaffAvatar = (file) => {
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

