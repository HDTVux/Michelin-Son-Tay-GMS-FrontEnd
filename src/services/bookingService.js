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

export const fetchAvailableSlotStaff = (date, token, durationMinutes = 60) =>
  request(`/api/booking/slots/available-for-staff?date=${encodeURIComponent(date)}&durationMinutes=${durationMinutes}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

// Lấy danh sách booking request cho màn quản lý (có phân trang / tìm kiếm / lọc)
// Params backend: page, size, date (yyyy-mm-dd), isGuest (boolean), status, search
export const fetchBookingRequests = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách yêu cầu.');
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
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs ? `/api/booking/manage/booking-request?${qs}` : '/api/booking/manage/booking-request';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
// Lấy chi tiết một yêu cầu booking theo requestCode
export const fetchBookingRequestDetail = (requestCode, token) =>
  request(`/api/booking/manage/booking-request/${encodeURIComponent(String(requestCode))}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// Duyệt yêu cầu booking từ PENDING sang CONFIRM
export const confirmBookingRequest = (requestIdentifier, token) =>
  request(`/api/booking/manage/booking-request/${encodeURIComponent(String(requestIdentifier))}/confirm`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// Cập nhật/chỉnh sửa một yêu cầu booking (màn quản lý) theo requestCode
export const updateBookingRequest = (requestCode, payload, token) =>
  request(`/api/booking/manage/booking-request/${encodeURIComponent(String(requestCode))}/update`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });

// Hủy yêu cầu booking (màn quản lý)
export const cancelBookingRequest = (requestIdentifier, payload, token) =>
  request(`/api/booking/manage/booking-request/${encodeURIComponent(String(requestIdentifier))}/cancel`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });

// Đánh dấu spam yêu cầu booking (màn quản lý)
export const spamBookingRequest = (requestIdentifier, payload, token) =>
  request(`/api/booking/manage/booking-request/${encodeURIComponent(String(requestIdentifier))}/spam`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });

// Đánh dấu đã liên hệ khách hàng (màn quản lý)
export const contactedBookingRequest = (requestIdentifier, payload, token) =>
  request(`/api/booking/manage/booking-request/${encodeURIComponent(String(requestIdentifier))}/contacted`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });


// Lấy danh sách booking đã được quản lý (có phân trang / tìm kiếm / lọc)
// Params backend: page, size, date (yyyy-mm-dd), isGuest (boolean), status, search
export const fetchManagedBookingsPaged = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách booking.');
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
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs ? `/api/booking/manage/booking?${qs}` : '/api/booking/manage/booking';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy chi tiết một booking đã được quản lý/đã confirm theo bookingCode
export const fetchManagedBookingDetail = (bookingCode, token) =>
  request(`/api/booking/manage/booking/${encodeURIComponent(String(bookingCode))}`, {
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