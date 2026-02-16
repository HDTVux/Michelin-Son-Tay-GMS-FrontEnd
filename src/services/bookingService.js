import { request } from './apiClient';

export const createCustomerBooking = (payload, token) =>
  request('/api/booking/customer/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

export const createGuestBooking = (payload) =>
  request('/api/booking/guest/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchAvailableSlots = (date, token, durationMinutes = 60) =>
  request(`/api/booking/slots/available?date=${encodeURIComponent(date)}&durationMinutes=${durationMinutes}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

// Lấy danh sách yêu cầu booking chưa duyệt cho màn quản lý
export const fetchPendingBookingRequests = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách yêu cầu.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/booking/manage/booking-request', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
// Lấy chi tiết một yêu cầu booking theo id
export const fetchBookingRequestDetail = (bookingId, token) =>
  request(`/api/booking/manage/booking-request/${bookingId}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// Duyệt yêu cầu booking từ PENDING sang CONFIRM
export const confirmBookingRequest = (bookingId, token) =>
  request(`/api/booking/manage/booking-request/${bookingId}/confirm`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });