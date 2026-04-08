import { API_BASE_URL, request } from './apiClient.js';

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

// Service ticket tax rule APIs
// GET: /api/service-ticket/tax-rule/all
export const fetchTaxRules = (token) => {
  return request('/api/service-ticket/tax-rule/all', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/service-ticket/tax-rule/create
// Request: { taxName: string, taxRate: number }
export const createTaxRule = (payload, token) => {
  return request('/api/service-ticket/tax-rule/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};

// Warehouse item category APIs
// GET: /api/warehouse/item-category/all (some envs may expose /item-categpry/all)
export const fetchWarehouseItemCategories = async (token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  // Prefer the correct endpoint
  try {
    return await request('/api/warehouse/item-category/all', {
      method: 'GET',
      headers,
    });
  } catch {
    // Fallbacks for older/typo endpoints in some envs
    try {
      return await request('/api/warehouse/item-categoy/all', {
        method: 'GET',
        headers,
      });
    } catch {
      return request('/api/warehouse/item-categpry/all', {
        method: 'GET',
        headers,
      });
    }
  }
};

// POST: /api/warehouse/item-category/create (newer)
// POST: /api/warehouse/itemCategory/create (older)
// Request: { itemCategoryId: null|number, categoryCode: string, categoryName: string, categoryType: string, isActive: string }
export const createWarehouseItemCategory = async (payload, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    return await request('/api/warehouse/item-category/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload ?? {}),
    });
  } catch {
    return request('/api/warehouse/itemCategory/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload ?? {}),
    });
  }
};

// Warehouse product line APIs

export const fetchWarehouseProductLines = (token) => {
  return request('/api/warehouse/product-line/all', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/product-line/create
// Request: { productLineId: null|number, brandId: number, lineName: string, isActive: string }
export const createWarehouseProductLine = (payload, token) => {
  return request('/api/warehouse/product-line/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};

// Warehouse catalog item APIs
// POST: /api/warehouse/catalog-item/create
export const createWarehouseCatalogItem = (payload, token) => {
  // Strip both null and undefined values to avoid backend crash on findById(null)
  const clean = (payload ?? {});
  const stripped = {};
  Object.entries(clean).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    stripped[k] = v;
  });
  return request('/api/warehouse/catalog-item/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(stripped),
  });
};

// Warehouse spec attribute APIs
// GET: /api/warehouse/spec-attribute/all
export const fetchWarehouseSpecAttributes = (token) => {
  return request('/api/warehouse/spec-attribute/all', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/specs-attribute/create
// Request: { attributeId: null|number, attributeCode: string, displayName: string, unit: string }
export const createWarehouseSpecAttribute = (payload, token) => {
  return request('/api/warehouse/specs-attribute/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};

// Warehouse specification/specs APIs
// GET: /api/warehouse/specification/all
export const fetchWarehouseSpecificationsAll = (token) => {
  return request('/api/warehouse/specification/all', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET: /api/warehouse/specification/all/{CatalogItemId}
export const fetchWarehouseSpecificationsByCatalogItemId = (catalogItemId, token) => {
  const idNum = typeof catalogItemId === 'number' ? catalogItemId : Number(catalogItemId);
  const safeId = Number.isFinite(idNum) ? idNum : 0;
  return request(`/api/warehouse/specification/all/${encodeURIComponent(String(safeId))}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/specs/create
// Request: { specId: null|number, itemId: number, attributeId: number, specValue: string }
export const createWarehouseSpecificationValue = (payload, token) => {
  return request('/api/warehouse/specs/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};

// Search catalog items (supports pagination and filters)
// GET: /api/warehouse/search/catalog-items
// params: { page, size, search, itemType, isActive, brand, productLine, categoryCode, minPrice, maxPrice, sortBy }
export const searchWarehouseCatalogItems = (params, token) => {
  const qp = new URLSearchParams();
  const safeParams = params || {};
  Object.entries(safeParams).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (s === '') return;
    qp.append(k, s);
  });
  const qs = qp.toString();
  const path = '/api/warehouse/search/catalog-items' + (qs ? `?${qs}` : '');
  return request(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET: /api/warehouse/search/catalog-items/detail/{catalogItemId}
export const fetchWarehouseCatalogItemDetail = (catalogItemId, token) => {
  const idNum = typeof catalogItemId === 'number' ? catalogItemId : Number(catalogItemId);
  const safeId = Number.isFinite(idNum) ? idNum : 0;
  return request(`/api/warehouse/search/catalog-items/detail/${encodeURIComponent(String(safeId))}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET: /api/warehouse/catalog/search?keyword=...
export const searchWarehouseCatalog = (keyword, token) => {
  const value = String(keyword ?? '').trim();
  const qs = value ? `?keyword=${encodeURIComponent(value)}` : '';
  return request(`/api/warehouse/catalog/search${qs}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/stock-entries/with-attachment
export const createWarehouseStockEntryWithAttachment = async (payload, file, token) => {
  const formData = new FormData();
  const safePayload = payload && typeof payload === 'object' ? payload : {};

  Object.entries(safePayload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'items') {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      return;
    }
    if (typeof value === 'object') return;
    formData.append(key, String(value));
  });

  const uploadFile = file ?? safePayload.file ?? null;
  if (uploadFile && typeof File !== 'undefined' && uploadFile instanceof File) {
    formData.append('file', uploadFile, uploadFile.name);
  }

  const response = await fetch(`${API_BASE_URL}/api/warehouse/stock-entries/with-attachment`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (data?.success === false) {
    const error = new Error(data?.message || data?.data?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

// GET: /api/warehouse/stock-entries?warehouseId=...&status=...
export const fetchWarehouseStockEntries = (params, token) => {
  const qp = new URLSearchParams();
  const safeParams = params && typeof params === 'object' ? params : {};

  Object.entries(safeParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    qp.append(key, text);
  });

  const qs = qp.toString();
  const path = '/api/warehouse/stock-entries' + (qs ? `?${qs}` : '');

  return request(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET: /api/warehouse/stock-entries/{id}
export const fetchWarehouseStockEntryDetail = (id, token) => {
  const idNum = typeof id === 'number' ? id : Number(id);
  const safeId = Number.isFinite(idNum) ? idNum : 0;

  return request(`/api/warehouse/stock-entries/${encodeURIComponent(String(safeId))}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/stock-entries/{id}/confirm
export const confirmWarehouseStockEntry = (id, token) => {
  const idNum = typeof id === 'number' ? id : Number(id);
  const safeId = Number.isFinite(idNum) ? idNum : 0;

  return request(`/api/warehouse/stock-entries/${encodeURIComponent(String(safeId))}/confirm`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/return-entries/with-attachments
// multipart fields: warehouseId, returnReason, returnType, items(JSON), exchangeItems(JSON optional for EXCHANGE), file_0..file_n
export const createWarehouseReturnEntryWithAttachments = async (payload, files, token) => {
  const formData = new FormData();
  const safePayload = payload && typeof payload === 'object' ? payload : {};

  const appendText = (key, value) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    formData.append(key, text);
  };

  appendText('warehouseId', safePayload.warehouseId);
  appendText('returnReason', safePayload.returnReason);
  appendText('returnType', safePayload.returnType);

  const items = Array.isArray(safePayload.items) ? safePayload.items : [];
  formData.append('items', JSON.stringify(items));

  const hasCustomerReturnType = String(safePayload.returnType || '').toUpperCase() === 'EXCHANGE';
  if (hasCustomerReturnType) {
    const exchangeItems = Array.isArray(safePayload.exchangeItems) ? safePayload.exchangeItems : [];
    formData.append('exchangeItems', JSON.stringify(exchangeItems));
  }

  const uploadFiles = Array.isArray(files) ? files : [];
  uploadFiles.forEach((file, idx) => {
    const isFile = typeof File !== 'undefined' && file instanceof File;
    if (!isFile) return;
    formData.append(`file_${idx}`, file, file.name);
  });

  const response = await fetch(`${API_BASE_URL}/api/warehouse/return-entries/with-attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (data?.success === false) {
    const error = new Error(data?.message || data?.data?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

// GET: /api/warehouse/return-entries
// Params: { warehouseId: number, status?: string, ... }
export const fetchWarehouseReturnEntries = (params, token) => {
  const query = new URLSearchParams();
  const safeParams = params && typeof params === 'object' ? params : {};
  
  Object.entries(safeParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (text) query.append(key, text);
  });

  const queryString = query.toString();
  const url = queryString ? `/api/warehouse/return-entries?${queryString}` : '/api/warehouse/return-entries';

  return request(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET: /api/warehouse/return-entries/{id}
export const fetchWarehouseReturnEntryDetail = (id, token) => {
  const idNum = typeof id === 'number' ? id : Number(id);
  const safeId = Number.isFinite(idNum) ? idNum : 0;

  return request(`/api/warehouse/return-entries/${encodeURIComponent(String(safeId))}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// POST: /api/warehouse/return-entries/{id}/confirm
export const confirmWarehouseReturnEntry = (id, token) => {
  const idNum = typeof id === 'number' ? id : Number(id);
  const safeId = Number.isFinite(idNum) ? idNum : 0;

  return request(`/api/warehouse/return-entries/${encodeURIComponent(String(safeId))}/confirm`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
