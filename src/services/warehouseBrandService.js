import { request } from './apiClient.js';

// Warehouse brand APIs
// GET: /api/warehouse/brand/all
export const fetchWarehouseBrands = (token) => {
  return request('/api/warehouse/brand/all', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/brand/create
// Request: { brandId: null, brandName: string, logoUrl: null, isActive: '0'|'1' }
export const createWarehouseBrand = (payload, token) => {
  return request('/api/warehouse/brand/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};
