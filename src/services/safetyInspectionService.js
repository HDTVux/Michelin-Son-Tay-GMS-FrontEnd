import { request } from './apiClient';

/**
 * Service for Safety Inspection API - SafetyInspectionController
 * Backend: /api/safety-inspections
 * Auth: JWT tự động từ apiClient
 */

/**
 * Kích hoạt kiểm tra an toàn cho phiếu dịch vụ
 * Backend: POST /api/safety-inspections/{ticketCode}/enable
 * @param {string} ticketCode
 */
export const enableSafetyInspection = (ticketCode) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/${code}/enable`, {
    method: 'POST',
  });
};

/**
 * Bỏ qua kiểm tra an toàn cho phiếu dịch vụ
 * Backend: POST /api/safety-inspections/{ticketCode}/skip
 * @param {string} ticketCode
 * @param {string} reason - Lý do bỏ qua
 */
export const skipSafetyInspection = (ticketCode, reason = '') => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/${code}/skip${params}`, {
    method: 'POST',
  });
};

/**
 * Lấy chi tiết kiểm tra an toàn theo inspectionId
 * Backend: GET /api/safety-inspections/{inspectionId}
 * @param {number} inspectionId
 */
export const getSafetyInspectionById = (inspectionId) => {
  const id = Number(inspectionId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Thiếu inspectionId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/${id}`, {
    method: 'GET',
  });
};

/**
 * Lưu dữ liệu kiểm tra an toàn (tạo mới hoặc cập nhật)
 * Backend: POST /api/safety-inspections
 * @param {object} payload
 */
export const saveSafetyInspectionData = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/safety-inspections', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};

/**
 * Lấy kiểm tra an toàn theo mã phiếu dịch vụ
 * Backend: GET /api/safety-inspections/service-ticket/{ticketCode}
 * @param {string} ticketCode
 */
export const getSafetyInspectionByTicketCode = (ticketCode) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/service-ticket/${code}`, {
    method: 'GET',
  });
};

/**
 * Cập nhật dữ liệu kiểm tra an toàn
 * Backend: PUT /api/safety-inspections/{inspectionId}
 * @param {number} inspectionId
 * @param {object} payload
 */
export const updateSafetyInspectionData = (inspectionId, payload) => {
  const id = Number(inspectionId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Thiếu inspectionId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });
};

/**
 * Lấy danh sách 13 hạng mục kiểm tra an toàn mặc định
 * Backend: GET /api/safety-inspections/categories/default
 * @deprecated Sử dụng getDefaultSafetyInspectionCategories thay thế
 */
export const getSafetyInspectionCategories = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/safety-inspections/categories/default', {
    method: 'GET',
  });
};

/**
 * Lấy danh sách 13 hạng mục kiểm tra an toàn mặc định
 * Backend: GET /api/safety-inspections/categories/default
 */
export const getDefaultSafetyInspectionCategories = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/safety-inspections/categories/default', {
    method: 'GET',
  });
};

/**
 * Thêm hạng mục tùy chỉnh vào phiếu kiểm tra an toàn
 * Backend: POST /api/safety-inspections/{inspectionId}/custom-categories
 * @param {number} inspectionId
 * @param {object} payload - { categoryName, displayOrder }
 */
export const addCustomCategory = (inspectionId, payload) => {
  const id = Number(inspectionId);
  if (!Number.isFinite(id) || id <= 0) {
    const error = new Error('Thiếu inspectionId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/${id}/custom-categories`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};

/**
 * Cập nhật advisor notes cho một hạng mục
 * Backend: PATCH /api/safety-inspections/{inspectionId}/advisor-notes
 * @param {number} inspectionId
 * @param {number} itemId
 * @param {string} advisorNote
 */
export const updateAdvisorNote = (inspectionId, itemId, advisorNote) => {
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
    advisorNote: advisorNote || '',
  };

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/safety-inspections/${id}/advisor-notes`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};
