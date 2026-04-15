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

export const payBill = (payload, token) => {
	if (!token) {
		const error = new Error('Vui lòng đăng nhập để thanh toán.');
		error.status = 401;
		return Promise.reject(error);
	}

	return request('/api/payment/create/payment', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload ?? {}),
	});
};

export const fetchPaymentByServiceTicketId = (serviceTicketId, token) => {
	if (!token) {
		const error = new Error('Vui lòng đăng nhập để xem thông tin thanh toán.');
		error.status = 401;
		return Promise.reject(error);
	}

	const id = typeof serviceTicketId === 'number' ? serviceTicketId : Number(String(serviceTicketId ?? '').trim());
	if (!Number.isFinite(id) || id <= 0) {
		const error = new Error('ServiceTicketId không hợp lệ.');
		error.status = 400;
		return Promise.reject(error);
	}

	return request(`/api/payment/${id}`, {
		method: 'GET',
		headers: { Authorization: `Bearer ${token}` },
	});
};
