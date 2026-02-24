// Lấy URL cơ sở từ biến môi trường (Environment Variable)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

import { cleanupExpiredTokens } from './tokenUtils.js';

/**
 * @param {string} path - Đường dẫn API (ví dụ: /api/bookings)
 * @param {object} options - Cấu hình thêm: method, headers, body
 */
async function request(path, options = {}) {
  // Dọn token hết hạn trước khi gửi request (JWT exp)
  cleanupExpiredTokens();

  // Giải nén các thuộc tính từ options, mặc định method là GET
  const { method = 'GET', headers = {}, body } = options;
  let response;

	// Lấy token từ localStorage và tự động đính kèm nếu có
	const authToken = localStorage.getItem('authToken');
	const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  try {
    // 1. Thực hiện gọi API bằng Fetch API
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json', // Mặc định gửi/nhận dữ liệu dạng JSON
        ...authHeaders,                     // Đính kèm token nếu có
        ...headers,                         // Gộp các headers bổ sung (như Authorization token)
      },
      body, // Dữ liệu gửi đi (phải được stringify trước nếu là object)
    });
  } catch (err) {
    // Lỗi này xảy ra khi có vấn đề về mạng hoặc máy chủ không phản hồi (Network Error)
    throw new Error('Không thể kết nối tới máy chủ');
  }

  // 2. Kiểm tra kiểu nội dung trả về từ Server (JSON hay Text)
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json(); // Giải mã JSON
  } else {
    data = await response.text(); // Đọc dạng chuỗi thuần túy
  }

  // 3. Kiểm tra mã trạng thái HTTP (Status Code)
  // Nếu status không nằm trong khoảng 200-299
  if (!response.ok) {
		// Token hết hạn hoặc không hợp lệ: xóa token
		if (response.status === 401 || response.status === 403) {
      ['authToken', 'customerToken', 'staffToken', 'adminToken'].forEach((key) => localStorage.removeItem(key));
		}
    // Lấy thông báo lỗi từ dữ liệu trả về hoặc dùng thông báo mặc định
    const message = typeof data === 'string' ? data : data?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status; // Gắn mã lỗi vào đối tượng Error
    throw error;
  }

  // 4. Kiểm tra logic nghiệp vụ (Business Logic Error)
  // Một số API trả về status 200 nhưng kèm field success: false
  if (data?.success === false) {
    const error = new Error(data?.message || data?.data?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  // Nếu mọi thứ ổn thỏa, trả về dữ liệu đã xử lý
  return data;
}

export { API_BASE_URL, request };