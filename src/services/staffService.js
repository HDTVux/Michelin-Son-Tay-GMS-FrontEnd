import { request } from './apiClient';

// ============ STAFF ATTENDANCE APIs ============

/**
 * Lấy lịch sử chấm công của nhân viên theo staffId
 * @param {string|number} staffId - ID của nhân viên
 * @param {string} token - JWT token
 * @returns {Promise} Response chứa danh sách attendance records
 */
export const fetchStaffAttendance = (staffId, token) =>
  request(`/api/staff/attendance/${staffId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

// ============ STAFF PROFILE APIs ============

/**
 * Lấy thông tin profile của staff (hiện tại chỉ return greeting message)
 * TODO: Backend cần bổ sung endpoint đầy đủ
 * @param {string} token - JWT token
 * @returns {Promise} Response chứa thông tin staff
 */
export const fetchStaffProfile = (token) =>
  request('/api/staff-profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * Cập nhật thông tin profile của staff
 * TODO: Backend cần implement endpoint này
 * @param {object} payload - Dữ liệu cập nhật
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const updateStaffProfile = (payload, token) =>
  request('/api/staff-profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

/**
 * Upload avatar cho staff
 * TODO: Backend cần implement endpoint này
 * @param {File} file - File ảnh avatar
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const uploadStaffAvatar = (file, token) => {
  const formData = new FormData();
  formData.append('avatar', file);

  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/staff-profile/avatar`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Upload failed');
    }
    return data;
  });
};
