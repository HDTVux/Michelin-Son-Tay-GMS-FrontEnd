import { request } from './apiClient';

export const fetchAvailablePromotions = (token, promotionType = '', customerId = null) => {
	const type = String(promotionType ?? '').trim();
	const params = new URLSearchParams();
	if (type) params.set('promotionType', type);
	const customerIdText = String(customerId ?? '').trim();
	if (customerIdText) params.set('customerId', customerIdText);
	const qs = params.toString() ? `?${params.toString()}` : '';
	return request(`/api/promotion/available${qs}`, {
		method: 'GET',
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
};

export const fetchPromotionByCode = async (promotionCode, token) => {
	const raw = String(promotionCode ?? '').trim();
	if (!raw) {
		const error = new Error('Vui lòng nhập mã khuyến mãi.');
		error.status = 400;
		throw error;
	}

	const encoded = encodeURIComponent(raw);

	const headers = token ? { Authorization: `Bearer ${token}` } : {};

	try {
		// Common REST style: /api/promotion/{code}
		return await request(`/api/promotion/?code=${encoded}`, {
			method: 'GET',
			headers,
		});
	} catch (err) {
		// Alternative style: /api/promotion?code={code}
		if (err?.status !== 404) throw err;
		return request(`/api/promotion?code=${encoded}`, {
			method: 'GET',
			headers,
		});
	}
};

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
