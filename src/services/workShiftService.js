import { request } from './apiClient';

// GET /api/manager/work-shifts — Lấy tất cả ca làm việc (List, không phân trang)
export const fetchAllWorkShifts = () => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/manager/work-shifts', { method: 'GET' });
};

// GET /api/manager/work-shifts/{shiftId} — Lấy chi tiết một ca
export const fetchWorkShiftById = (shiftId) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/manager/work-shifts/${shiftId}`, { method: 'GET' });
};

// POST /api/manager/work-shifts — Tạo ca làm việc mới
// Payload: { shiftName, startTime, endTime, shiftDate } — startTime/endTime là "HH:mm" hoặc "HH:mm:ss", shiftDate là "yyyy-MM-dd"
export const createWorkShift = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/manager/work-shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// PUT /api/manager/work-shifts/{shiftId} — Cập nhật ca làm việc
export const updateWorkShift = (shiftId, payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/manager/work-shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

// DELETE /api/manager/work-shifts/{shiftId} — Vô hiệu hóa ca làm việc (soft-delete)
export const deleteWorkShift = (shiftId) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/manager/work-shifts/${shiftId}`, { method: 'DELETE' });
};
