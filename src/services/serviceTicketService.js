import { request } from './apiClient';

// Lấy danh sách phiếu dịch vụ (có phân trang / tìm kiếm / lọc)
// Params backend: page, size, date (yyyy-mm-dd), status, search
export const fetchServiceTicketsPaged = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách phiếu dịch vụ.');
    error.status = 401;
    return Promise.reject(error);
  }

  const searchParams = new URLSearchParams();

  const page = Number.isFinite(params?.page) ? params.page : 0;
  const size = Number.isFinite(params?.size) ? params.size : 10;
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  if (params?.date) searchParams.set('date', params.date);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs ? `/api/service-ticket/manage/tickets?${qs}` : '/api/service-ticket/manage/tickets';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy chi tiết một phiếu dịch vụ theo ticketCode
export const fetchServiceTicketDetail = (ticketCode, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem chi tiết phiếu dịch vụ.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/manage/tickets/${code}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
