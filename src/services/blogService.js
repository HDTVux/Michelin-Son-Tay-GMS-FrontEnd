import { request } from './apiClient.js';

// Fetch catalog list with filters
// GET /api/warehouse/search/catalog-items
export const fetchCatalogItems = (params, token) => {
  const qp = new URLSearchParams();
  const safeParams = params || {};
  Object.entries(safeParams).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (s === '') return;
    qp.append(k, s);
  });
  const qs = qp.toString();
  const path = '/api/warehouse/search/catalog-items' + (qs ? '?' + qs : '');
  return request(path, {
    method: 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
};

// Fetch one catalog detail
// GET /api/warehouse/search/catalog-items/detail/{catalogItemId}
export const fetchCatalogItemDetail = (catalogItemId, token) => {
  const idNum = typeof catalogItemId === 'number' ? catalogItemId : Number(catalogItemId);
  const safeId = Number.isFinite(idNum) ? idNum : 0;
  return request('/api/warehouse/search/catalog-items/detail/' + encodeURIComponent(String(safeId)), {
    method: 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
};

// Fallback basic endpoint
// GET /api/catalog/items/{itemId}
export const fetchCatalogBasicItemById = (itemId, token) => {
  const idNum = typeof itemId === 'number' ? itemId : Number(itemId);
  const safeId = Number.isFinite(idNum) ? idNum : 0;
  return request('/api/catalog/items/' + encodeURIComponent(String(safeId)), {
    method: 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
};

// Create blog/service by catalog id
// POST /api/service/create/{catalogId}
export const createServiceForCatalog = async (catalogId, formData, token) => {
  const id = typeof catalogId === 'number' ? catalogId : Number(catalogId) || 0;
  return fetch(
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/api/service/create/' + encodeURIComponent(String(id)),
    {
      method: 'POST',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      body: formData,
    }
  ).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'HTTP ' + res.status);
    return data;
  });
};

// Update blog/service by serviceId
// PUT /api/service/update/{serviceId}
export const updateServiceById = async (serviceId, formData, token) => {
  const id = typeof serviceId === 'number' ? serviceId : Number(serviceId) || 0;
  return fetch(
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/api/service/update/' + encodeURIComponent(String(id)),
    {
      method: 'PUT',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      body: formData,
    }
  ).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'HTTP ' + res.status);
    return data;
  });
};
