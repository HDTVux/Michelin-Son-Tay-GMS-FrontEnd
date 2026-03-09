import { request } from './apiClient';

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
 * @param {string} payload.phone - Số điện thoại (required)
 * @param {string} payload.fullName - Họ tên đầy đủ (required)
 * @param {string} payload.email - Email (optional)
 * @param {string} payload.dateOfBirth - Ngày sinh (yyyy-MM-dd) (optional)
 * @param {string} payload.address - Địa chỉ (optional)
 * @param {string} token - JWT token
 * @returns {Promise} Response chứa thông tin customer đã tạo
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     customerId: number,
 *     phone: string,
 *     fullName: string,
 *     email: string,
 *     dateOfBirth: string,
 *     address: string,
 *     createdAt: string
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

  const page = Number.isFinite(params?.page) ? params.page : 0;
  const size = Number.isFinite(params?.size) ? params.size : 10;
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  if (params?.date) searchParams.set('date', params.date);
  if (typeof params?.isGuest === 'boolean') searchParams.set('isGuest', String(params.isGuest));
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs ? `/api/admin/customer/getAllCustomer?${qs}` : '/api/admin/customer/getAllCustomer';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Lấy chi tiết một customer theo customerId
 * TODO: Backend cần implement endpoint này
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
 * TODO: Backend cần implement endpoint này
 * 
 * @param {number} customerId - ID của customer
 * @param {object} payload - Thông tin cập nhật
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const updateCustomer = (customerId, payload, token) => {
  const id = Number(customerId) || 0;
  return request(`/api/admin/customer/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
};

/**
 * Xóa customer (Admin)
 * TODO: Backend cần implement endpoint này
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
