import { request } from './apiClient';

/**
 * Service for Safety Inspection API - SafetyInspectionController
 * Backend: /api/safety-inspections
 */

// Kích hoạt kiểm tra an toàn cho phiếu dịch vụ
// POST /api/safety-inspections/{ticketCode}/enable
export const enableSafetyInspection = (ticketCode, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để kích hoạt kiểm tra an toàn.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/${code}/enable`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Bỏ qua kiểm tra an toàn cho phiếu dịch vụ
// POST /api/safety-inspections/{ticketCode}/skip
export const skipSafetyInspection = (ticketCode, reason = '', token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return request(`/api/safety-inspections/${code}/skip${params}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy chi tiết kiểm tra an toàn theo inspectionId
// GET /api/safety-inspections/{inspectionId}
export const getSafetyInspectionById = (inspectionId, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem chi tiết kiểm tra.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(inspectionId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Thiếu inspectionId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lưu dữ liệu kiểm tra an toàn (tạo mới hoặc cập nhật)
// POST /api/safety-inspections
export const saveSafetyInspectionData = (payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để lưu dữ liệu kiểm tra.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/safety-inspections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
};

// Lấy kiểm tra an toàn theo mã phiếu dịch vụ
// GET /api/safety-inspections/service-ticket/{ticketCode}
export const getSafetyInspectionByTicketCode = (ticketCode, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem kiểm tra an toàn.');
    error.status = 401;
    return Promise.reject(error);
  }

  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/service-ticket/${code}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Cập nhật dữ liệu kiểm tra an toàn
// PUT /api/safety-inspections/{inspectionId}
export const updateSafetyInspectionData = (inspectionId, payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật kiểm tra.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(inspectionId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Thiếu inspectionId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  return request(`/api/safety-inspections/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
};

// Lấy danh sách hạng mục kiểm tra an toàn
// GET /api/safety-inspections/categories
export const getSafetyInspectionCategories = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để lấy danh mục.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/safety-inspections/categories', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách 13 hạng mục kiểm tra an toàn mặc định
// GET /api/safety-inspections/categories/default
export const getDefaultSafetyInspectionCategories = (token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để lấy danh mục mặc định.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/safety-inspections/categories/default', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Tạo mới hạng mục kiểm tra an toàn
// POST /api/safety-inspections/categories
export const createWorkCategory = (payload, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để tạo hạng mục mới.');
    error.status = 401;
    return Promise.reject(error);
  }

  return request('/api/safety-inspections/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload ?? {}),
  });
};

// Cập nhật advisor notes cho một hạng mục
// PATCH /api/safety-inspections/{inspectionId}/advisor-notes
export const updateAdvisorNote = (inspectionId, itemId, advisorNote, token) => {
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để cập nhật ghi chú.');
    error.status = 401;
    return Promise.reject(error);
  }

  const id = Number(inspectionId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Thiếu inspectionId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  const itemIdNum = Number(itemId);
  if (!Number.isFinite(itemIdNum) || itemIdNum <= 0) {
    const error = new Error('Thiếu itemId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  const payload = {
    itemId: itemIdNum,
    advisorNote: advisorNote || ''
  };

  return request(`/api/safety-inspections/${id}/advisor-notes`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
};
