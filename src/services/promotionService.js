import { request } from './apiClient';

export const fetchAvailablePromotions = (token) =>
	request('/api/promotion/available', {
		method: 'GET',
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});

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
