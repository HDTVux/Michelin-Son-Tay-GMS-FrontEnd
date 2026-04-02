import { request } from './apiClient.js';

// ── Lấy danh sách blog/catalog theo bộ lọc
// GET /api/warehouse/search/catalog-items
// params: { page, size, search, itemType, isActive, brand, productLine, categoryCode, minPrice, maxPrice, sortBy }
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

// ── Lấy chi tiết 1 catalog item
// GET /api/warehouse/search/catalog-items/detail/{catalogItemId}
export const fetchCatalogItemDetail = (catalogItemId, token) => {
  const idNum = typeof catalogItemId === 'number' ? catalogItemId : Number(catalogItemId);
  const safeId = Number.isFinite(idNum) ? idNum : 0;
  return request('/api/warehouse/search/catalog-items/detail/' + encodeURIComponent(String(safeId)), {
    method: 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
};

// ── Tạo blog mới (multipart/form-data)
// POST /api/service/create
export const createBlog = async (formData, token) => {
  return fetch(
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/api/service/create',
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

// ── Cập nhật blog/catalog item (multipart/form-data)
// PUT /api/service/update/{catalogItemId}
export const updateBlog = async (catalogItemId, formData, token) => {
  const id = typeof catalogItemId === 'number' ? catalogItemId : Number(catalogItemId) || 0;
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
