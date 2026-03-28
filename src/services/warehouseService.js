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
  try {
    return await request('/api/warehouse/item-categoy/all', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    // Fallback for older typo endpoint
    return request('/api/warehouse/item-categoy/all', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
};

// POST: /api/warehouse/itemCategory/create
// Request: { itemCategoryId: null|number, categoryCode: string, categoryName: string, categoryType: string, isActive: string }
export const createWarehouseItemCategory = (payload, token) => {
  return request('/api/warehouse/itemCategory/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
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
  return request('/api/warehouse/catalog-item/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
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
