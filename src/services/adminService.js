import { request } from './apiClient';

const toSafePage = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
};

const toSafeSize = (value, fallback = 10) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? Math.trunc(number) : fallback;
};

/**
 * Admin Service - Kết nối với Admin/Customer Management APIs
 * Backend Controller: CustomerController.java
 * Base Path: /api/admin/customer/
 */

/**
 * Tạo customer mới (Admin only)
 * Backend: POST /api/admin/customer/create
 * 
 * @param {object} payload - Thông tin customer
 * @param {string} payload.fullName - Họ tên đầy đủ (required)
 * @param {string} payload.phone - Số điện thoại (required)
 * @param {string} payload.email - Email (required)
 * @param {string} payload.pin - PIN 6 chữ số (required)
 * @param {('MALE'|'FEMALE'|'OTHER')} payload.gender - Giới tính (required)
 * @param {string} payload.dob - Ngày sinh (yyyy-MM-dd) (optional)
 * @param {string} payload.avatar - Avatar URL/base64 (optional)
 * @param {string} token - JWT token
 * @returns {Promise} Response chứa thông tin customer đã tạo
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     fullName: string,
 *     phone: string,
 *     email: string,
 *     pin: string,
 *     gender: string,
 *     dob: string,
 *     avatar: string
 *   }
 * }
 */
export const createCustomer = (payload, token) => {
  return request('/api/admin/customer/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
};

/**
 * Lấy danh sách tất cả customers với phân trang và filters
 * Backend: GET /api/admin/customer/getAllCustomer
 * 
 * @param {object} params - Query parameters
 * @param {number} params.page - Số trang (default: 0)
 * @param {number} params.size - Số items per page (default: 10)
 * @param {string} params.date - Lọc theo ngày (yyyy-MM-dd) (optional)
 * @param {boolean} params.isGuest - Lọc guest/registered (optional)
 * @param {string} params.search - Tìm kiếm theo tên/phone/email (optional)
 * @param {string} params.status - Lọc theo trạng thái (optional)
 * @param {string} params.sort - Spring Pageable sort (vd: fullName,asc) (optional)
 * @param {string} params.sortBy - Backward-compatible sort field (optional)
 * @param {string} params.sortDirection - Backward-compatible sort direction (ASC|DESC) (optional)
 * @param {string} token - JWT token
 * @returns {Promise} Response chứa paginated customer list
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     content: [
 *       {
 *         customerId: number,
 *         phone: string,
 *         fullName: string,
 *         email: string,
 *         dateOfBirth: string,
 *         address: string,
 *         isGuest: boolean,
 *         createdAt: string,
 *         totalBookings: number
 *       }
 *     ],
 *     totalElements: number,
 *     totalPages: number,
 *     size: number,
 *     number: number (current page)
 *   }
 * }
 */
export const fetchAllCustomers = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách khách hàng.');
    error.status = 401;
    return Promise.reject(error);
  }

  const searchParams = new URLSearchParams();

  const page = toSafePage(params?.page);
  const size = toSafeSize(params?.size);
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  if (params?.date) searchParams.set('date', params.date);
  if (typeof params?.isGuest === 'boolean') searchParams.set('isGuest', String(params.isGuest));
  if (params?.search) searchParams.set('search', params.search);

  if (params?.status) searchParams.set('status', params.status);

  // Sorting: prefer Spring Pageable-style `sort=field,dir`
  if (params?.sort) {
    searchParams.set('sort', params.sort);
  } else if (params?.sortBy) {
    const dirRaw = params?.sortDirection || 'ASC';
    const dir = String(dirRaw).toLowerCase() === 'desc' ? 'desc' : 'asc';
    searchParams.set('sort', `${params.sortBy},${dir}`);
  }

  const qs = searchParams.toString();
  const path = qs ? `/api/admin/customer/getAllCustomer?${qs}` : '/api/admin/customer/getAllCustomer';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Lấy chi tiết một customer theo customerId
 * Ghi chú: endpoint có thể chưa được backend implement.
 * 
 * @param {number} customerId - ID của customer
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const fetchCustomerDetail = (customerId, token) => {
  const id = Number(customerId) || 0;
  return request(`/api/admin/customer/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

/**
 * Cập nhật thông tin customer (Admin)
 * Backend: PUT /api/admin/customer/{customerId}/update
 */
export const updateCustomer = (customerId, payload, token) => {
  const id = Number(customerId) || 0;
  return request(`/api/admin/customer/${id}/update`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
};

/**
 * Khóa tài khoản customer (Admin)
 * Backend: PUT /api/admin/customer/{customerId}/locked
 *
 * @param {number} customerId - ID của customer
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const lockCustomerAccount = (customerId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để thực hiện thao tác.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(customerId) || 0;
  return request(`/api/admin/customer/${id}/locked`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Xóa (soft-delete) tài khoản customer (Admin)
 * Backend: PUT /api/admin/customer/{customerId}/delete
 */
export const deleteCustomerAccount = (customerId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để thực hiện thao tác.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(customerId) || 0;
  return request(`/api/admin/customer/${id}/delete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Xóa customer (Admin)
 * Ghi chú: endpoint có thể chưa được backend implement.
 * 
 * @param {number} customerId - ID của customer
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const deleteCustomer = (customerId, token) => {
  const id = Number(customerId) || 0;
  return request(`/api/admin/customer/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

/**
 * Lấy danh sách tất cả nhân viên (staff) với phân trang và filters
 * Backend: GET /api/admin/staff/all-staff
 *
 * @param {object} params - Query parameters
 * @param {number} params.page - Số trang (default: 0)
 * @param {number} params.size - Số items per page (default: 10)
 * @param {string} params.date - Lọc theo ngày (yyyy-MM-dd) (optional)
 * @param {boolean} params.isActive - Lọc theo trạng thái hoạt động (optional)
 * @param {string} params.search - Tìm kiếm theo tên/phone/email (optional)
 * @param {number[]} params.roleIds - Lọc theo roleIds (optional)
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const fetchAllStaff = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách nhân viên.');
    error.status = 401;
    return Promise.reject(error);
  }

  const searchParams = new URLSearchParams();

  const page = toSafePage(params?.page);
  const size = toSafeSize(params?.size);
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  if (params?.date) searchParams.set('date', params.date);
  if (typeof params?.isActive === 'boolean') searchParams.set('isActive', String(params.isActive));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);

  if (Array.isArray(params?.roleIds)) {
    params.roleIds
      .map(Number)
      .filter((v) => Number.isFinite(v) && v > 0)
      .forEach((roleId) => searchParams.append('roleIds', String(roleId)));
  }

  const qs = searchParams.toString();
  const path = qs ? `/api/admin/staff/all-staff?${qs}` : '/api/admin/staff/all-staff';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Lấy danh sách tất cả roles của staff (Admin)
 * Backend: GET /api/admin/staff/all-roles
 */
export const fetchAllStaffRoles = (token) => {

  return request('/api/admin/staff/all-roles', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Tạo staff mới (Admin)
 * Backend: POST /api/admin/staff/create
 */
export const createStaff = (payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để tạo tài khoản nhân viên.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/admin/staff/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
};

/**
 * Lấy chi tiết thông tin của nhân viên
 * Backend: GET /api/admin/staff/{staffId}
 *
 * @param {number|string} staffId
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const fetchStaffDetail = (staffId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem chi tiết nhân viên.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(staffId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Staff ID không hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/admin/staff/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Cập nhật thông tin nhân viên (Admin)
 * Backend: PUT /api/admin/staff/{staffId}/update
 */
export const updateStaff = (staffId, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật nhân viên.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(staffId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Staff ID không hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/admin/staff/${id}/update`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
};

/**
 * Khóa tài khoản nhân viên (Admin)
 * Backend: PUT /api/admin/staff/{staffId}/lock
 */
export const lockStaffAccount = (staffId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để thực hiện thao tác.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(staffId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Staff ID không hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/admin/staff/${id}/lock`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Xóa (soft-delete) tài khoản nhân viên (Admin)
 * Backend: PUT /api/admin/staff/{staffId}/delete
 *
 * @param {number|string} staffId
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const deleteStaffAccount = (staffId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để thực hiện thao tác.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(staffId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Staff ID không hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/admin/staff/${id}/delete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};
