import { request } from './apiClient';

// Lấy thông tin profile khách hàng
export const fetchCustomerProfile = (token) =>
  request('/api/customer/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

// Cập nhật thông tin profile khách hàng
export const updateCustomerProfile = (payload, token) =>
  request('/api/customer/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

// Upload avatar
export const uploadAvatar = (file, token) => {
  const formData = new FormData();
  formData.append('avatar', file);

  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/customer/profile/avatar`, {
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
