import { request } from './apiClient';

// Lấy danh sách phiếu dịch vụ (có phân trang / tìm kiếm / lọc)
// Backend: GET /api/service-ticket/manage/tickets?page=&size=&date=&status=&search=
// Response: Page<ServiceTicketListResponse> → { content: [ServiceTicketListResponse] }
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

// Lấy chi tiết một phiếu dịch vụ theo ticketCode
// Backend: GET /api/service-ticket/manage/tickets/{ticketCode}
// Response: ServiceTicketDetailResponse
export const fetchServiceTicketDetail = (ticketCode) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/manage/tickets/${code}`, { method: 'GET' });
};

// Chỉnh sửa phiếu dịch vụ theo ticketCode
// Backend: PUT /api/service-ticket/manage/tickets/{ticketCode}
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

// Lấy thông tin ước tính cho phiếu dịch vụ
// Backend: GET /api/service-ticket/estimate/{serviceTicketId}
export const fetchServiceTicketEstimate = (serviceTicketId) => {
  const idRaw = String(serviceTicketId ?? '').trim();
  if (!idRaw) {
    const error = new Error('Thiếu serviceTicketId.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/estimate/${encodeURIComponent(idRaw)}`, { method: 'GET' });
};

// Tạo mới bảng báo giá
// Backend: POST /api/service-ticket/estimate/
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

// Cập nhật bảng báo giá
// Backend: PUT /api/service-ticket/estimate/{estimateId}
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

// Cập nhật 1 dòng item trong bảng báo giá
// Backend: PUT /api/service-ticket/estimate/{estimateItemId}/item
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


// Lấy danh sách nhân viên available để assign vào ticket
// Backend: GET /api/service-ticket/assignment/{ticketId}/available-staff?role=ROLE
// Response: ApiResponse<List<AvailableStaffDto>> → { staffId, fullName, phone, position, roleCode }
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

// Giao ticket cho nhân viên (KTV chính hoặc KTV phụ)
// Backend: POST /api/service-ticket/assignment/{ticketId}/assign
// Payload: { staffId, roleInTicket, isPrimary, note }
// Response: ApiResponse<AssignStaffDto> → { assignmentId, serviceTicketId, staffId, staffName, roleInTicket, isPrimary, status, note, assignedAt }
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

// Cập nhật thông tin assign (đổi nhân viên)
// Backend: PUT /api/service-ticket/assignment/{ticketId}/assign/{assignmentId}
// Response: ApiResponse<AssignStaffDto>
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

// Lấy danh sách assignments của một ticket (KTV đã được giao)
// Backend: GET /api/service-ticket/assignment/{ticketId}/assignments
// Response: ApiResponse<List<AssignStaffDto>> → { assignmentId, serviceTicketId, staffId, staffName, roleInTicket, isPrimary, status, note, assignedAt }
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

// Lấy danh sách loại thuế (tax rules)
// Backend: GET /api/service-ticket/tax-rule/all
export const fetchTaxRulesAll = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/service-ticket/tax-rule/all', { method: 'GET' });
};
