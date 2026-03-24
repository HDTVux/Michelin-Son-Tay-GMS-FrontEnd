import { request } from './apiClient';

// ============================================================
// SERVICE TICKET MANAGEMENT APIs
// Base: /api/service-ticket/manage
// ============================================================

/**
 * Lấy danh sách phiếu dịch vụ (có phân trang / tìm kiếm / lọc)
 * Backend: GET /api/service-ticket/manage/tickets?page=&size=&date=&status=&search=
 * Response: Page<ServiceTicketListResponse>
 */
export const fetchServiceTicketsPaged = (params) => {
  const searchParams = new URLSearchParams();
  const page = Number.isFinite(params?.page) ? params.page : 0;
  const size = Number.isFinite(params?.size) ? params.size : 10;
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));
  if (params?.date)    searchParams.set('date', params.date);
  if (params?.status)  searchParams.set('status', params.status);
  if (params?.search)  searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs ? `/api/service-ticket/manage/tickets?${qs}` : '/api/service-ticket/manage/tickets';
  // apiClient.js tự lấy authToken từ localStorage
  return request(path, { method: 'GET' });
};

/**
 * Lấy chi tiết phiếu dịch vụ theo ticketCode
 * Backend: GET /api/service-ticket/manage/tickets/{ticketCode}
 */
export const fetchServiceTicketDetail = (ticketCode) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/manage/tickets/${code}`, { method: 'GET' });
};

/**
 * Chỉnh sửa phiếu dịch vụ
 * Backend: PUT /api/service-ticket/manage/tickets/{ticketCode}
 */
export const updateServiceTicket = (ticketCode, payload) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/manage/tickets/${code}`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });
};

// ============================================================
// TICKET ASSIGNMENT APIs
// Base: /api/service-ticket/assignment
// ============================================================

/**
 * Lấy danh sách nhân viên có thể assign vào ticket
 * Backend: GET /api/service-ticket/assignment/{ticketId}/available-staff?role=TECHNICIAN
 * Response: List<AvailableStaffDto>
 * Fields: staffId, fullName, phone, avatar, roles[]
 */
export const fetchAvailableStaff = (ticketId, role) => {
  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/service-ticket/assignment/${idNum}/available-staff?role=${encodeURIComponent(role)}`, { method: 'GET' });
};

/**
 * Giao ticket cho nhân viên (KTV chính hoặc KTV phụ)
 * Backend: POST /api/service-ticket/assignment/{ticketId}/assign
 * Payload: { staffId, roleInTicket, isPrimary, note }
 * Response: AssignStaffDto
 * NOTE: Backend tự động đổi trạng thái CREATED → IN_PROGRESS khi gán technician đầu tiên
 */
export const assignStaff = (ticketId, payload) => {
  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/service-ticket/assignment/${idNum}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Cập nhật thông tin phân công
 * Backend: PUT /api/service-ticket/assignment/{ticketId}/assign/{assignmentId}
 */
export const updateAssignment = (ticketId, assignmentId, payload) => {
  const ticketNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  const assignmentNum = typeof assignmentId === 'number' ? assignmentId : Number(assignmentId);

  if (!Number.isFinite(ticketNum) || ticketNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  if (!Number.isFinite(assignmentNum) || assignmentNum <= 0) {
    const error = new Error('Thiếu assignmentId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/service-ticket/assignment/${ticketNum}/assign/${assignmentNum}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Lấy danh sách assignments của một ticket
 * Backend: GET /api/service-ticket/assignment/{ticketId}/assignments
 */
export const fetchTicketAssignments = (ticketId) => {
  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/service-ticket/assignment/${idNum}/assignments`, {
    method: 'GET',
  });
};

// ============================================================
// ESTIMATE APIs
// Base: /api/service-ticket/estimate
// ============================================================

export const fetchServiceTicketEstimate = (serviceTicketId) => {
  const idRaw = String(serviceTicketId ?? '').trim();
  if (!idRaw) {
    const error = new Error('Thiếu serviceTicketId.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/estimate/${encodeURIComponent(idRaw)}`, { method: 'GET' });
};

export const createServiceTicketEstimate = (payload) => {
  const serviceTicketId = payload?.serviceTicketId;
  const idNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu serviceTicketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    const error = new Error('Báo giá cần có ít nhất 1 dòng items.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request('/api/service-ticket/estimate/', {
    method: 'POST',
    body: JSON.stringify({ ...payload, serviceTicketId: idNum }),
  });
};

export const updateServiceTicketEstimate = (estimateId, payload) => {
  const idNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu estimateId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/estimate/${encodeURIComponent(String(idNum))}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const updateServiceTicketEstimateItem = (estimateItemId, payload) => {
  const idNum = typeof estimateItemId === 'number' ? estimateItemId : Number(estimateItemId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu estimateItemId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/estimate/${encodeURIComponent(String(idNum))}/item`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });
};

// ============================================================
// TAX RULES
// Base: /api/service-ticket/tax-rule
// ============================================================

export const fetchTaxRulesAll = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/service-ticket/tax-rule/all', { method: 'GET' });
};
