import { API_BASE_URL, request } from './apiClient';

function parseFilenameFromContentDisposition(headerValue) {
  const raw = String(headerValue || '').trim();
  if (!raw) return null;

  // RFC 5987: filename*=UTF-8''...
  const starMatch = /filename\*=UTF-8''([^;]+)/i.exec(raw);
  if (starMatch?.[1]) {
    try {
      return decodeURIComponent(starMatch[1].trim());
    } catch {
      return starMatch[1].trim();
    }
  }

  const basicMatch = /filename="?([^";]+)"?/i.exec(raw);
  return basicMatch?.[1]?.trim() || null;
}

async function fetchBlobWithAuth(path, { method, body, token }) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
      },
      body,
    });
  } catch {
    throw new Error('Không thể kết nối tới máy chủ');
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const text = contentType?.includes('application/json')
      ? JSON.stringify(await response.json().catch(() => ({})))
      : await response.text().catch(() => '');
    const err = new Error(text || 'Request failed');
    err.status = response.status;
    throw err;
  }

  const blob = await response.blob();
  const filename = parseFilenameFromContentDisposition(response.headers.get('content-disposition'));
  return { blob, filename };
}

// Đổi trạng thái phiếu dịch vụ theo serviceTicketId
// Endpoint: PUT /api/service-ticket/manage/{serviceTicketId}/{status}
export const manageServiceTicketStatus = (serviceTicketId, status, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu serviceTicketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  const statusNorm = String(status ?? '')
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, '_');


  return request(`/api/service-ticket/manage/${encodeURIComponent(String(idNum))}/${encodeURIComponent(statusNorm)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
};

// Đổi trạng thái báo giá (estimate)
// Backend thường map: PUT /api/service-ticket/estimate/{estimateId}/{status}
export const manageServiceTicketEstimateStatus = (estimateId, status, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật trạng thái báo giá.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu estimateId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  const statusNorm = String(status ?? '')
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, '_');


  return request(
    `/api/service-ticket/estimate/${encodeURIComponent(String(idNum))}/${encodeURIComponent(statusNorm)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
};

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

// Export danh sách phiếu dịch vụ ra Excel
// Endpoint: /api/service-ticket/manage/export
// Request: startDate, endDate (yyyy-mm-dd)
export const exportServiceTicketsManage = async ({ startDate, endDate }, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để export phiếu dịch vụ.');
    error.status = 401;
    throw error;
  }

  const start = String(startDate ?? '').trim();
  const end = String(endDate ?? '').trim();
  if (!start || !end) {
    const error = new Error('Vui lòng chọn đủ startDate và endDate để export.');
    error.status = 400;
    throw error;
  }

  const basePath = '/api/service-ticket/manage/export';
  const qs = new URLSearchParams({ startDate: start, endDate: end }).toString();
  return await fetchBlobWithAuth(`${basePath}?${qs}`, { method: 'GET', body: undefined, token });
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

// Advisor: lấy khuyến nghị theo serviceTicketId
// Endpoint: GET /api/service-ticket/advisor/recommend/{serviceTicketId}
export const fetchServiceTicketAdvisorRecommend = (serviceTicketId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem khuyến nghị.');
    error.status = 401;
    return Promise.reject(error);
  }

  const idNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const error = new Error('Thiếu serviceTicketId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/service-ticket/advisor/recommend/${encodeURIComponent(String(idNum))}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Cập nhật khuyến nghị (recommend) theo serviceTicketId
// Backend đang đọc `recommend` bằng @RequestParam -> gửi qua query string.
// Endpoint: PUT /api/safety-inspections/{serviceTicketId}/update-recommend?recommend=...
export const updateSafetyInspectionRecommend = (serviceTicketId, recommend, token) => {
  const idNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
  const qs = new URLSearchParams({ recommend: String(recommend ?? '') }).toString();
  return request(`/api/safety-inspections/${idNum}/update-recommend?${qs}`, {
    method: 'PUT',
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

// Lễ tân đổi advisor cho ticket
// Endpoint: PUT /api/service-ticket/manage/tickets/{ticketCode}/change-advisor?newAdvisorId={id}&note={note}
export const changeAdvisorByReceptionist = (ticketCode, newAdvisorId, note, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để đổi advisor.');
    error.status = 401;
    return Promise.reject(error);
  }
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  const advisorId = Number(newAdvisorId);
  if (!code || !Number.isFinite(advisorId) || advisorId <= 0) {
    const error = new Error('Thiếu ticketCode hoặc newAdvisorId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  const searchParams = new URLSearchParams();
  searchParams.set('newAdvisorId', String(advisorId));
  if (note != null && String(note).trim() !== '') searchParams.set('note', String(note).trim());
  return request(`/api/service-ticket/manage/tickets/${code}/change-advisor?${searchParams.toString()}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Advisor đổi advisor phụ trách ticket
// Endpoint: PUT /api/service-ticket/advisor/tickets/{ticketCode}/change-advisor?newAdvisorId={id}&note={note}
export const changeAdvisorByAdvisor = (ticketCode, newAdvisorId, note, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để đổi advisor.');
    error.status = 401;
    return Promise.reject(error);
  }
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  const advisorId = Number(newAdvisorId);
  if (!code || !Number.isFinite(advisorId) || advisorId <= 0) {
    const error = new Error('Thiếu ticketCode hoặc newAdvisorId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  const searchParams = new URLSearchParams();
  searchParams.set('newAdvisorId', String(advisorId));
  if (note != null && String(note).trim() !== '') searchParams.set('note', String(note).trim());
  return request(`/api/service-ticket/advisor/tickets/${code}/change-advisor?${searchParams.toString()}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Advisor đổi technician khi technician cũ đang PENDING
// Endpoint: PUT /api/service-ticket/advisor/tickets/{ticketCode}/technician/{oldTechnicianId}/change/{newTechnicianId}?note={note}
export const changeTechnicianByAdvisor = (ticketCode, oldTechnicianId, newTechnicianId, note, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để đổi kỹ thuật viên.');
    error.status = 401;
    return Promise.reject(error);
  }
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  const oldId = Number(oldTechnicianId);
  const newId = Number(newTechnicianId);
  if (!code || !Number.isFinite(oldId) || oldId <= 0 || !Number.isFinite(newId) || newId <= 0) {
    const error = new Error('Thiếu ticketCode hoặc technicianId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  const qs = note != null && String(note).trim() !== ''
    ? `?note=${encodeURIComponent(String(note).trim())}`
    : '';
  return request(`/api/service-ticket/advisor/tickets/${code}/technician/${oldId}/change/${newId}${qs}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
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

// Lấy danh sách phân công của một phiếu
// Backend trả về: ApiResponse<List<AssignStaffDto>> → response.data là array thuần
// Fields: assignmentId, serviceTicketId, staffId, roleInTicket, assignedAt, isPrimary, status, note
// Endpoint: GET /api/service-ticket/assignment/{ticketId}/assignments
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
  return request(`/api/service-ticket/assignment/${idNum}/assignments`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách nhân viên available để assign vào ticket
// Backend trả về: ApiResponse<List<AvailableStaffDto>> → response.data là array
// Fields: staffId, fullName, phone, avatar, roles (KHÔNG có workload/isBusy)
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
  const roleQs = encodeURIComponent(role);
  return request(`/api/service-ticket/assignment/${idNum}/available-staff?role=${roleQs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy workload của tất cả KTV để hiển thị trạng thái bận/rảnh
// Backend hiện tại: GET /api/staff-workload?role=TECHNICIAN
// Chuẩn hóa response về shape cũ: { staffId, fullName, phone, roles, currentTicketCount, isBusy }
export const fetchTechniciansWorkload = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập.');
    error.status = 401;
    return Promise.reject(error);
  }
  return request('/api/staff-workload?role=TECHNICIAN', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    const rows = Array.isArray(res?.data) ? res.data : [];
    const normalized = rows.map((row) => ({
      staffId: row?.staffId,
      fullName: row?.fullName || '',
      phone: row?.phone || '',
      roles: Array.isArray(row?.roles) ? row.roles : [],
      currentTicketCount: Number.isFinite(row?.totalWorkload)
        ? row.totalWorkload
        : Number(row?.activeAssignments || 0) + Number(row?.pendingAssignments || 0),
      isBusy: row?.isAvailable === false,
    }));
    return { ...res, data: normalized };
  });
};

// Giao ticket cho nhân viên (KTV chính hoặc KTV phụ)
// Backend trả về: ApiResponse<AssignStaffDto> → response.data là object đơn
// Assignment mới luôn có status: PENDING
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

// Cập nhật thông tin assign (đổi nhân viên / đổi isPrimary / đổi note)
// Backend trả về: ApiResponse<AssignStaffDto>
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

// Hủy technician assignment từ màn advisor
// Endpoint: DELETE /api/service-ticket/advisor/tickets/{ticketCode}/technician/{technicianId}
export const cancelAssignment = (ticketCode, technicianId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để hủy phân công.');
    error.status = 401;
    return Promise.reject(error);
  }
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  const techIdNum = typeof technicianId === 'number' ? technicianId : Number(technicianId);
  if (!code || !Number.isFinite(techIdNum) || techIdNum <= 0) {
    const error = new Error('Thiếu ticketCode hoặc technicianId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/advisor/tickets/${code}/technician/${techIdNum}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Hủy technician assignment bằng ticketId (dùng cho AdvisorInspection modal)
// Endpoint: DELETE /api/service-ticket/assignment/{ticketId}/assignments/{assignmentId}
export const cancelAssignmentById = (ticketId, assignmentId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để hủy phân công.');
    error.status = 401;
    return Promise.reject(error);
  }
  const idNum = typeof ticketId === 'number' ? ticketId : Number(ticketId);
  const assignNum = typeof assignmentId === 'number' ? assignmentId : Number(assignmentId);
  if (!Number.isFinite(idNum) || idNum <= 0 || !Number.isFinite(assignNum) || assignNum <= 0) {
    const error = new Error('Thiếu ticketId hoặc assignmentId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }
  return request(`/api/service-ticket/assignment/${idNum}/assignments/${assignNum}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách phiếu cho advisor
// Endpoint: GET /api/service-ticket/advisor/tickets?page=0&size=10&date=yyyy-mm-dd&status=DRAFT&search=...&technicianSearch=...&ticketCode=...
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
  if (params?.date) searchParams.set('date', params.date);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.technicianSearch) searchParams.set('technicianSearch', params.technicianSearch);
  if (params?.ticketCode) searchParams.set('ticketCode', params.ticketCode);

  const qs = searchParams.toString();
  const path = qs ? `/api/service-ticket/advisor/tickets?${qs}` : '/api/service-ticket/advisor/tickets';

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Đổi vị trí 2 service ticket trong hàng đợi
// Endpoint: PUT /api/service-ticket/manage/swap?serviceTicketId1={id1}&serviceTicketId2={id2}
export const swapServiceTicketQueue = (serviceTicketId1, serviceTicketId2, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để đổi thứ tự phiếu.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id1 = Number(serviceTicketId1);
  const id2 = Number(serviceTicketId2);
  if (!Number.isFinite(id1) || id1 <= 0 || !Number.isFinite(id2) || id2 <= 0) {
    const error = new Error('Thiếu serviceTicketId hợp lệ để đổi thứ tự.');
    error.status = 400;
    return Promise.reject(error);
  }

  const searchParams = new URLSearchParams();
  searchParams.set('serviceTicketId1', String(id1));
  searchParams.set('serviceTicketId2', String(id2));

  return request(`/api/service-ticket/manage/swap?${searchParams.toString()}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách tất cả KTV (dù đang bận hay rảnh) kèm số ticket đang làm
// Backend hiện tại: GET /api/staff-workload?role=TECHNICIAN
export const fetchTechniciansWithWorkload = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập.');
    error.status = 401;
    return Promise.reject(error);
  }
  return request('/api/staff-workload?role=TECHNICIAN', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    const rows = Array.isArray(res?.data) ? res.data : [];
    const normalized = rows.map((row) => ({
      staffId: row?.staffId,
      fullName: row?.fullName || '',
      phone: row?.phone || '',
      roles: Array.isArray(row?.roles) ? row.roles : [],
      currentTicketCount: Number.isFinite(row?.totalWorkload)
        ? row.totalWorkload
        : Number(row?.activeAssignments || 0) + Number(row?.pendingAssignments || 0),
      isBusy: row?.isAvailable === false,
    }));
    return { ...res, data: normalized };
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

// Lấy danh sách hạng mục công việc (work categories) dùng cho báo giá
// Backend trả về: ApiResponse<List<WorkCategoryDto>>
// Endpoint: GET /api/service-ticket/estimate/work-category/all
export const fetchWorkCategoriesAll = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh sách hạng mục.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/service-ticket/estimate/work-category/all', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
