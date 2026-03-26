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

// Chỉnh sửa phiếu dịch vụ theo ticketCode
export const updateServiceTicket = (ticketCode, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để chỉnh sửa phiếu dịch vụ.');
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
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
};

// Lấy thông tin ước tính cho phiếu dịch vụ theo serviceTicketId
// Endpoint: GET /api/service-ticket/estimate/{serviceTicketId}
export const fetchServiceTicketEstimate = (serviceTicketId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem ước tính.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idRaw = String(serviceTicketId ?? '').trim();
  if (!idRaw) {
    const error = new Error('Thiếu serviceTicketId.');
    error.status = 400;
    return Promise.reject(error);
  }

  const idEncoded = encodeURIComponent(idRaw);
  return request(`/api/service-ticket/estimate/${idEncoded}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Xác nhận bảng báo giá trước khi thanh toán
// Endpoint: PUT /api/service-ticket/estimate/{estimateId}/approve
export const approveServiceTicketEstimate = (estimateId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xác nhận báo giá.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu estimateId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/estimate/${encodeURIComponent(String(idNum))}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Tạo mới bảng báo giá cho phiếu dịch vụ
// Endpoint: POST /api/service-ticket/estimate/
// Payload: { serviceTicketId, estimateType, items: [{ workCategoryId, newCategoryName, itemId, itemName, quantity, unitPrice }] }
export const createServiceTicketEstimate = (payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để tạo báo giá.');
    error.status = 401;
    return Promise.reject(error);
  }

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
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...payload,
      serviceTicketId: idNum,
    }),
  });
};

// Cập nhật bảng báo giá theo estimateId (thêm/sửa/xóa items bằng cách gửi lại toàn bộ danh sách)
// Endpoint: PUT /api/service-ticket/estimate/{estimateId}
// Payload: { serviceTicketId, estimateType, items: [{ workCategoryId, newCategoryName, itemId, itemName, quantity, unitPrice }] }
export const updateServiceTicketEstimate = (estimateId, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật báo giá.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu estimateId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  const serviceTicketId = payload?.serviceTicketId;
  const ticketNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
  if (!Number.isFinite(ticketNum) || ticketNum <= 0) {
    const error = new Error('Thiếu serviceTicketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    const error = new Error('Báo giá cần có ít nhất 1 dòng.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/estimate/${encodeURIComponent(String(idNum))}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...payload,
      serviceTicketId: ticketNum,
    }),
  });
};

// Cập nhật 1 dòng item trong bảng báo giá theo estimateItemId (bao gồm xóa mềm)
// Endpoint: PUT /api/service-ticket/estimate/{estimateItemId}/item
// Payload: { workCategoryId, newCategoryName, itemId, itemName, quantity, unitPrice, taxRuleId, isChecked, isRemoved }
export const updateServiceTicketEstimateItem = (estimateItemId, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật hạng mục báo giá.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof estimateItemId === 'number' ? estimateItemId : Number(estimateItemId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu estimateItemId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/estimate/${encodeURIComponent(String(idNum))}/item`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
};


// Lấy danh sách nhân viên available kèm workload (sắp xếp workload thấp → cao)
// Endpoint: GET /api/service-ticket/assignment/available-staff?role=ADVISOR
export const fetchAvailableStaffWithWorkload = (role, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập.');
    error.status = 401;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/assignment/available-staff?role=${encodeURIComponent(role)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách phân công của một phiếu
// Endpoint: GET /api/service-ticket/assignment/{ticketId}
export const fetchTicketAssignments = (ticketId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập.');
    error.status = 401;
    return Promise.reject(error);
  }
  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/assignment/${idNum}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách nhân viên available để assign vào ticket (không có workload)
// Endpoint: GET /api/service-ticket/assignment/{ticketId}/available-staff?role={role}
export const fetchAvailableStaff = (ticketId, role, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách nhân viên.');
    error.status = 401;
    return Promise.reject(error);
  }
  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/assignment/${idNum}/available-staff?role=${encodeURIComponent(role)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Giao ticket cho nhân viên (KTV chính hoặc KTV phụ)
// Endpoint: POST /api/service-ticket/assignment/{ticketId}/assign
// Payload: { staffId, roleInTicket, isPrimary, note }
export const assignStaff = (ticketId, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để giao việc.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu ticketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/assignment/${idNum}/assign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
};

// Cập nhật thông tin assign (đổi nhân viên)
// Endpoint: PUT /api/service-ticket/assignment/{ticketId}/assign/{assignmentId}
export const updateAssignment = (ticketId, assignmentId, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật phân công.');
    error.status = 401;
    return Promise.reject(error);
  }
  const ticketNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  const assignNum = typeof assignmentId === 'number' ? assignmentId : Number(assignmentId);
  if (!Number.isFinite(ticketNum) || ticketNum <= 0 || !Number.isFinite(assignNum) || assignNum <= 0) {
    const error = new Error('Thiếu ticketId hoặc assignmentId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/assignment/${ticketNum}/assign/${assignNum}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
};

// Hủy phân công
// Endpoint: PUT /api/service-ticket/assignment/{ticketId}/assign/{assignmentId}
// Payload: { status: 'CANCELLED' }
export const cancelAssignment = (ticketId, assignmentId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để hủy phân công.');
    error.status = 401;
    return Promise.reject(error);
  }
  const ticketNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  const assignNum = typeof assignmentId === 'number' ? assignmentId : Number(assignmentId);
  return request(`/api/service-ticket/assignment/${ticketNum}/assign/${assignNum}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
};

// Lấy danh sách phiếu được giao cho advisor đang đăng nhập
// Endpoint: GET /api/service-ticket/advisor/my-tickets?page=0&size=10&status=INSPECTION
export const fetchAdvisorMyTickets = (params, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách phiếu.');
    error.status = 401;
    return Promise.reject(error);
  }

  const searchParams = new URLSearchParams();
  const page = Number.isFinite(params?.page) ? params.page : 0;
  const size = Number.isFinite(params?.size) ? params.size : 10;
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));
  if (params?.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  const path = qs ? `/api/service-ticket/advisor/my-tickets?${qs}` : '/api/service-ticket/advisor/my-tickets';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách tất cả KTV (dù đang bận hay rảnh) kèm số ticket đang làm
// Endpoint: GET /api/staff/technicians?withWorkload=true
// Backend trả về: [{ staffId, fullName, phone, avatar, roles, currentTicketCount, isBusy }]
export const fetchTechniciansWithWorkload = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập.');
    error.status = 401;
    return Promise.reject(error);
  }
  return request('/api/staff/technicians', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách loại thuế (tax rules)
// Endpoint: GET /api/service-ticket/tax-rule/all
export const fetchTaxRulesAll = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách loại thuế.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/service-ticket/tax-rule/all', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
/**
 * Lấy danh sách assignments của một ticket
 * Backend: GET /api/service-ticket/assignment/{ticketId}/assignments
 */


