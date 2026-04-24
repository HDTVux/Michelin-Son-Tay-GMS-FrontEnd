import { API_BASE_URL, request } from './apiClient.js';

// Customer lookup by phone for staff
export const fetchCustomerByPhone = (phone, token) =>
  request(`/api/booking/staff/customer-lookup?phone=${encodeURIComponent(phone)}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// Fetch customer profile
export const fetchCustomerProfile = (token) =>
  request('/api/customer/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

// Update customer profile
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

  return fetch(`${API_BASE_URL}/api/customer/profile/avatar`, {
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
