import { request } from './apiClient.js';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const getStaffToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken');

/** Danh mục hãng xe (kèm dòng xe) — thay cho danh sách hard-code trước đây. */
export const fetchVehicleBrands = ({ activeOnly = true, withModels = true } = {}, token = getStaffToken()) =>
  request(`/api/vehicles/brands?activeOnly=${activeOnly}&withModels=${withModels}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

export const fetchVehicleModels = (brandId, token = getStaffToken()) =>
  request(`/api/vehicles/brands/${Number(brandId) || 0}/models`, {
    method: 'GET',
    headers: authHeaders(token),
  });

export const createVehicleBrand = (payload, token = getStaffToken()) =>
  request('/api/admin/vehicle-brands', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const updateVehicleBrand = (brandId, payload, token = getStaffToken()) =>
  request(`/api/admin/vehicle-brands/${Number(brandId) || 0}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const deactivateVehicleBrand = (brandId, token = getStaffToken()) =>
  request(`/api/admin/vehicle-brands/${Number(brandId) || 0}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

export const createVehicleModel = (brandId, name, token = getStaffToken()) =>
  request(`/api/admin/vehicle-brands/${Number(brandId) || 0}/models`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });

/** Nạp bổ sung dòng xe của hãng từ API công khai NHTSA vPIC. */
export const importVehicleModels = (brandId, token = getStaffToken()) =>
  request(`/api/admin/vehicle-brands/${Number(brandId) || 0}/models/import`, {
    method: 'POST',
    headers: authHeaders(token),
  });
