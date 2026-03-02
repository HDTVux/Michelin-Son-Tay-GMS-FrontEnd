import { request, API_BASE_URL } from './apiClient.js';

// ============ CUSTOMER AUTH APIs ============

export async function loginCustomer(phone, pin) {
  const payload = JSON.stringify({ phone, pin });
  return request('/api/auth/customer/login', {
    method: 'POST',
    body: payload,
  });
}

// ============ STAFF AUTH APIs ============

export async function loginStaff({ phone, pin }) {
  const payload = JSON.stringify({ phone, pin });
  return request('/api/auth/staff-auth/login', {
    method: 'POST',
    body: payload,
  });
}

// ============ OAUTH2 APIs ============

/**
 * Lấy URL để redirect đến Google OAuth2 login cho staff
 * Backend yêu cầu tài khoản staff được tạo sẵn bởi admin
 * 
 * Flow:
 * 1. Frontend redirect user đến URL này
 * 2. User đăng nhập với Google
 * 3. Backend validate staff provisioning
 * 4. Backend redirect về frontend với token trong URL params hoặc cookie
 * 
 * @returns {string} OAuth2 authorization URL
 */
export function getStaffGoogleOAuthUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  return `${baseUrl}/oauth2/authorization/google`;
}

/**
 * Xử lý OAuth2 callback và lấy token từ URL params
 * Sau khi Google redirect về, token có thể được truyền qua:
 * - URL params: ?token=xxx
 * - URL hash: #token=xxx
 * - Cookie (tự động set bởi backend)
 * 
 * @returns {string|null} JWT token nếu có
 */
export function handleOAuth2Callback() {
  // Kiểm tra token trong URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromParams = urlParams.get('token');
  
  if (tokenFromParams) {
    return tokenFromParams;
  }
  
  // Kiểm tra token trong hash
  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const tokenFromHash = hashParams.get('token');
  
  if (tokenFromHash) {
    return tokenFromHash;
  }
  
  // Token có thể được set trong cookie bởi backend
  // Frontend có thể đọc từ cookie nếu cần
  return null;
}

/**
 * Redirect user đến Google OAuth2 login page
 * Sử dụng cho staff login
 */
export function redirectToGoogleLogin() {
  window.location.href = getStaffGoogleOAuthUrl();
}

// Kiểm tra trạng thái tài khoản (ACTIVE/INACTIVE/UNVERIFIED...) và flag hasPin nếu backend có trả
export async function checkCustomerStatus(phone) {
  const payload = JSON.stringify({ phone });
  return request('/api/auth/customer/check-status', {
    method: 'POST',
    body: payload,
  });
}

// Gửi OTP tới số điện thoại
export async function requestCustomerOtp(phone) {
  const payload = JSON.stringify({ phone });
  return request('/api/auth/customer/request-otp', {
    method: 'POST',
    body: payload,
  });
}

// Xác thực OTP đăng nhập, trả về AuthResponse chứa token
export async function verifyCustomerOtp(phone, otp) {
  const payload = JSON.stringify({ phone, otp });
  return request('/api/auth/customer/verify-otp', {
    method: 'POST',
    body: payload,
  });
}

// Thiết lập / đặt lại PIN (backend yêu cầu phone, pin, confirmPin)
export async function setupCustomerPin({ phone, pin, confirmPin }) {
  const payload = JSON.stringify({ phone, pin, confirmPin });
  return request('/api/auth/customer/setup-pin', {
    method: 'POST',
    body: payload,
  });
}

// Đăng xuất customer
export async function logoutCustomer() {
  return request('/api/auth/customer/logout', {
    method: 'POST',
  });
}