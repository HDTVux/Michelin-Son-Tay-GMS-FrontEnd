
import { request } from './apiClient';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const toNumberOrNull = (value) => {
  if (value === '' || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizePromotionPayload = (payload = {}) => ({
  promotionId: toNumberOrNull(payload.promotionId),
  code: payload.code?.trim() || '',
  name: payload.name?.trim() || '',
  type: payload.type?.trim() || '',
  discountPercent: toNumberOrNull(payload.discountPercent),
  isActive: Boolean(payload.isActive),
  applyTo: payload.applyTo?.trim() || null,
  buyItemId: toNumberOrNull(payload.buyItemId),
  buyQuantity: toNumberOrNull(payload.buyQuantity),
  getItemId: toNumberOrNull(payload.getItemId),
  getQuantity: toNumberOrNull(payload.getQuantity),
  targetType: payload.targetType?.trim() || null,
  minOrderValue: toNumberOrNull(payload.minOrderValue),
  startDate: payload.startDate || null,
  endDate: payload.endDate || null,
  usageLimit: toNumberOrNull(payload.usageLimit),
});

export const fetchAllPromotions = (token) => {
  return request('/api/promotion/admin/all', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchAvailablePromotions = (token) => {
  return request('/api/promotion/available', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const fetchPromotionByCode = (code, token) => {
  return request(`/api/promotion/?code=${encodeURIComponent(String(code || '').trim())}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const createPromotion = (payload, token) => {
  return request('/api/promotion/admin/create', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(normalizePromotionPayload(payload)),
  });
};

export const updatePromotion = (payload, token) => {
  return request('/api/promotion/admin/update', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(normalizePromotionPayload(payload)),
  });
};
