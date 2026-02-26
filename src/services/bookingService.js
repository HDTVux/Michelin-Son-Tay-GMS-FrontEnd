import { request } from './apiClient';

//Tạo booking mới cho khách hàng đã đăng nhập
export const createCustomerBooking = (payload, token) =>
  request('/api/booking/customer/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  //Tạo booking mới cho khách hàng chưa đăng nhập (guest)
export const createGuestBooking = (payload) =>
  request('/api/booking/guest/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Chỉnh sửa booking đã tạo (chỉ cho phép chỉnh sửa khi booking còn ở trạng thái PENDING)
export const modifyCustomerBooking = (bookingId, payload, token) =>
  request(`/api/booking/customer/${bookingId}/modify`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  // Hủy booking đã tạo (chỉ cho phép hủy khi booking còn ở trạng thái PENDING hoặc CONFIRM)
export const cancelCustomerBooking = (bookingId, token) =>
  request(`/api/booking/customer/${bookingId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

//Lấy danh sách tất cả slot có thể đặt, có thể lọc theo ngày
export const fetchAvailableSlots = (date, token, durationMinutes = 60) =>
  request(`/api/booking/slots/available?date=${encodeURIComponent(date)}&durationMinutes=${durationMinutes}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  // Lấy danh sách tất cả slot, bao gồm cả đã đầy và chưa đầy 
export const fetchAllSlots = (token) =>
  request('/api/booking/slots/all', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

// Lấy danh sách booking đã được quản lý/đã confirm cho màn quản lý
export const fetchManagedBookings = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách booking.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/booking/manage/booking', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy chi tiết một booking đã được quản lý/đã confirm theo bookingId
export const fetchManagedBookingDetail = (bookingId, token) =>
  request(`/api/booking/manage/booking/${bookingId}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// Lấy danh sách booking của customer đã đăng nhập
export const fetchMyBookings = (token) =>
  request('/api/booking/customer/my-bookings', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

// Lấy chi tiết một booking theo ID hoặc code
export const fetchBookingDetail = (identifier, token) =>
  request(`/api/booking/customer/${identifier}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });