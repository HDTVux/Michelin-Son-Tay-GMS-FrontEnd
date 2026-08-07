import { request } from './apiClient.js';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const getStaffToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken');

// ─── Địa giới hành chính ────────────────────────────────────────────────────

export const fetchProvinces = (token = getStaffToken()) =>
  request('/api/admin/locations/provinces', { method: 'GET', headers: authHeaders(token) });

export const fetchDistricts = (provinceId, token = getStaffToken()) =>
  request(`/api/admin/locations/districts?provinceId=${encodeURIComponent(provinceId)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

export const fetchWards = (districtId, token = getStaffToken()) =>
  request(`/api/admin/locations/wards?districtId=${encodeURIComponent(districtId)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

// ─── Nhóm khách hàng ────────────────────────────────────────────────────────

export const fetchCustomerGroups = (activeOnly = true, token = getStaffToken()) =>
  request(`/api/admin/customer-group?activeOnly=${activeOnly ? 'true' : 'false'}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

export const createCustomerGroup = (payload, token = getStaffToken()) =>
  request('/api/admin/customer-group', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const updateCustomerGroup = (groupId, payload, token = getStaffToken()) =>
  request(`/api/admin/customer-group/${Number(groupId) || 0}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const deactivateCustomerGroup = (groupId, token = getStaffToken()) =>
  request(`/api/admin/customer-group/${Number(groupId) || 0}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

// ─── Tra cứu mã số thuế ─────────────────────────────────────────────────────

export const lookupByTaxCode = (taxCode, token = getStaffToken()) =>
  request(`/api/admin/customer/tax-lookup?taxCode=${encodeURIComponent(taxCode)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
