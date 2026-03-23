import { request } from './apiClient';

export const createPayment = (payload, token) => {
	if (!token) {
		const error = new Error('Vui lòng đăng nhập để thanh toán.');
		error.status = 401;
		return Promise.reject(error);
	}

	return request('/api/payment/create', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload ?? {}),
	});
};
