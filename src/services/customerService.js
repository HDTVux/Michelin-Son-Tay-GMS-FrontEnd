import { API_BASE_URL, request } from './apiClient.js';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const appendCustomerSearchParam = (params, key, value) => {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text) return;
  params.append(key, text);
};

// Customer lookup by phone for staff
export const fetchCustomerByPhone = (phone, token) =>
  request(`/api/booking/staff/customer-lookup?phone=${encodeURIComponent(phone)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

export const searchAdminCustomers = (params = {}, token) => {
  const qp = new URLSearchParams();
  qp.append('page', String(Math.max(0, Number(params.page) || 0)));
  qp.append('size', String(Math.max(1, Number(params.size) || 10)));
  appendCustomerSearchParam(qp, 'date', params.date);
  appendCustomerSearchParam(qp, 'isGuest', params.isGuest);
  appendCustomerSearchParam(qp, 'search', params.search);
  appendCustomerSearchParam(qp, 'status', params.status);

  return request(`/api/admin/customer/getAllCustomer?${qp.toString()}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

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
