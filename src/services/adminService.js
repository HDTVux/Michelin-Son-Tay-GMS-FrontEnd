import { request } from './apiClient';

// ============================================================
// MANAGER: QUẢN LÝ NHÂN VIÊN
// Base: /api/manager/employees
// ============================================================

/**
 * Lấy danh sách tất cả nhân viên
 * Backend: GET /api/manager/employees
 * Response: List<EmployeeResponse>
 * Fields: staffId, fullName, phone, position, gender, dob, avatar
 */
export const fetchAllStaff = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/manager/employees', { method: 'GET' });
};

/**
 * Lấy chi tiết nhân viên (kèm performance & attendance gần đây)
 * Backend: GET /api/manager/employees/{staffId}
 * Response: EmployeeDetailResponse
 * Fields: staffId, fullName, phone, position, gender, dob, avatar,
 *         performance: { totalWorkDays, totalTicketsHandled },
 *         recentAttendance: [{ checkinId, attendanceDate, shiftId, shiftName,
 *                            checkInTime, checkOutTime, status }]
 */
export const fetchStaffDetail = (staffId) => {
  const id = Number(staffId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Staff ID không hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/manager/employees/${id}`, { method: 'GET' });
};

// ============================================================
// MANAGER: QUẢN LÝ CHẤM CÔNG
// Base: /api/manager/attendance
// ============================================================

/**
 * Lấy danh sách chấm công theo khoảng ngày
 * Backend: GET /api/manager/attendance?staffId=&from=&to=
 * Response: List<AttendanceCheckinResponse>
 * Fields: checkinId, staffId, staffName, attendanceDate, shiftId, shiftName,
 *         checkInTime, checkOutTime, status, notes, createdAt
 */
export const fetchAttendanceRecords = (params) => {
  const searchParams = new URLSearchParams();
  if (params?.staffId) searchParams.set('staffId', String(params.staffId));
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);

  const qs = searchParams.toString();
  const path = `/api/manager/attendance${qs ? `?${qs}` : ''}`;
  // apiClient.js tự lấy authToken từ localStorage
  return request(path, { method: 'GET' });
};

/**
 * Lấy danh sách chấm công hôm nay
 * Backend: GET /api/manager/attendance/today?date=yyyy-MM-dd
 */
export const fetchTodayAttendance = (date) => {
  const params = date ? `?date=${date}` : '';
  return request(`/api/manager/attendance/today${params}`, { method: 'GET' });
};

/**
 * Lấy tổng hợp chấm công hôm nay
 * Backend: GET /api/manager/attendance/today-summary?date=yyyy-MM-dd
 * Response: TodaySummaryResponse
 * Fields: date, totalStaff, checkedIn, notCheckedIn, staffList[]
 */
export const fetchTodayAttendanceSummary = (date) => {
  const params = date ? `?date=${date}` : '';
  return request(`/api/manager/attendance/today-summary${params}`, { method: 'GET' });
};

/**
 * Check-in nhân viên
 * Backend: POST /api/manager/attendance/check-in
 * Payload: { staffId, shiftId, attendanceDate, checkInTime, notes }
 */
export const checkInStaff = (payload) => {
  return request('/api/manager/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Check-out nhân viên
 * Backend: PUT /api/manager/attendance/{checkinId}/check-out
 * Payload: { checkOutTime, notes }
 */
export const checkOutStaff = (checkinId, payload) => {
  return request(`/api/manager/attendance/${checkinId}/check-out`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Xóa bản ghi chấm công
 * Backend: DELETE /api/manager/attendance/{checkinId}
 */
export const deleteAttendanceRecord = (checkinId) => {
  return request(`/api/manager/attendance/${checkinId}`, { method: 'DELETE' });
};

// ============================================================
// ADMIN: CRUD STAFF PROFILES
// Base: /api/admin/staff
// ============================================================

/**
 * Lấy danh sách tất cả staff profiles (phân trang)
 * Backend: GET /api/admin/staff/all-staff
 */
export const fetchAllStaffProfiles = (params) => {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set('page', String(params.page));
  if (params?.size != null) searchParams.set('size', String(params.size));
  if (params?.isActive != null) searchParams.set('isActive', String(params.isActive));
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = `/api/admin/staff/all-staff${qs ? `?${qs}` : ''}`;
  return request(path, { method: 'GET' });
};

/**
 * Lấy chi tiết staff profile
 * Backend: GET /api/admin/staff/{staffId}
 */
export const fetchStaffProfile = (staffId) => {
  return request(`/api/admin/staff/${staffId}`, { method: 'GET' });
};

/**
 * Lấy danh sách roles
 * Backend: GET /api/admin/staff/all-roles
 */
export const fetchAllStaffRoles = () => {
  return request('/api/admin/staff/all-roles', { method: 'GET' });
};

/**
 * Tạo staff mới
 * Backend: POST /api/admin/staff/create
 * Payload: { fullName, phone, position, password, email, status, dob, roles[] }
 */
export const createStaff = (payload) => {
  return request('/api/admin/staff/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Cập nhật staff profile
 * Backend: PUT /api/admin/staff/{staffId}/update
 */
export const updateStaff = (staffId, payload) => {
  return request(`/api/admin/staff/${staffId}/update`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Khóa tài khoản staff
 * Backend: PUT /api/admin/staff/{staffId}/lock
 */
export const lockStaffAccount = (staffId) => {
  return request(`/api/admin/staff/${staffId}/lock`, { method: 'PUT' });
};

/**
 * Xóa (soft-delete) staff
 * Backend: PUT /api/admin/staff/{staffId}/delete
 */
export const deleteStaffAccount = (staffId) => {
  return request(`/api/admin/staff/${staffId}/delete`, { method: 'PUT' });
};

// ============================================================
// ADMIN: CRUD CUSTOMERS
// ============================================================

export const createCustomer = (payload) => {
  return request('/api/admin/customer/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchAllCustomers = (params) => {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set('page', String(params.page));
  if (params?.size != null) searchParams.set('size', String(params.size));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  const path = `/api/admin/customer/getAllCustomer${qs ? `?${qs}` : ''}`;
  return request(path, { method: 'GET' });
};

export const fetchCustomerDetail = (customerId) => {
  return request(`/api/admin/customer/${customerId}`, { method: 'GET' });
};

export const updateCustomer = (customerId, payload) => {
  return request(`/api/admin/customer/${customerId}/update`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const lockCustomerAccount = (customerId) => {
  return request(`/api/admin/customer/${customerId}/locked`, { method: 'PUT' });
};

export const deleteCustomerAccount = (customerId) => {
  return request(`/api/admin/customer/${customerId}/delete`, { method: 'PUT' });
};
