import { request, API_BASE_URL } from './apiClient.js';

export async function loginCustomer(phone, pin) {
  const payload = JSON.stringify({ phone, pin });
  return request('/api/auth/customer/login', {
    method: 'POST',
    body: payload,
  });
}

export async function loginStaff({ phone, pin }) {
  const payload = JSON.stringify({ phone, pin });
  return request('/api/auth/staff-auth/login', {
    method: 'POST',
    body: payload,
  });
}

// URL OAuth Google cho staff; backend yêu cầu tài khoản được tạo sẵn
export function getStaffGoogleOAuthUrl() {
  return `http://localhost:8080/oauth2/authorization/google`;
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
