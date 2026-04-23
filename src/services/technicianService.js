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
 * Service for Technician API - ServiceTicketTechnicianController
 * Backend: /api/service-ticket/technician
 */

// Lấy danh sách phiếu dịch vụ của kỹ thuật viên (có phân trang)
// Params: page, size, date, status, search
export const fetchTechnicianTickets = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách công việc.');
    error.status = 401;
    return Promise.reject(error);
  }

  const searchParams = new URLSearchParams();

  const page = toSafePage(params?.page);
  const size = toSafeSize(params?.size);
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  if (params?.date) searchParams.set('date', params.date);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs ? `/api/service-ticket/technician/tickets?${qs}` : '/api/service-ticket/technician/tickets';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy chi tiết phiếu dịch vụ theo ticketCode
export const fetchTechnicianTicketDetail = (ticketCode, token) => {
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

  return request(`/api/service-ticket/technician/tickets/${code}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Cập nhật ghi chú kỹ thuật viên
export const updateTechnicianNotes = (ticketCode, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật ghi chú.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/technician/tickets/${code}/notes`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
};

// Kỹ thuật viên bắt đầu kiểm tra an toàn - DRAFT → INSPECTION
// Backend: POST /api/service-ticket/technician/tickets/{ticketCode}/start-inspection
export const startInspection = (ticketCode, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để bắt đầu kiểm tra.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/technician/tickets/${code}/start-inspection`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Kỹ thuật viên báo hoàn thành - IN_PROGRESS → COMPLETED
// Backend: POST /api/service-ticket/technician/tickets/{ticketCode}/finish
export const finishWork = (ticketCode, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để báo hoàn thành.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/technician/tickets/${code}/finish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};
