import { request } from './apiClient.js';

/**
 * Gửi thông báo estimate (báo giá) cho khách hàng qua Zalo
 * @param {Object} payload - Dữ liệu gửi lên server
 * @param {string} payload.number - Số điện thoại khách hàng
 * @param {string} payload.customerName - Tên khách hàng
 * @param {string[]} payload.productName - Danh sách tên sản phẩm/dịch vụ
 * @param {string} payload.orderCode - Mã booking
 * @param {string} payload.garageLocation - Vị trí garage (mặc định: Michelin Sơn Tây)
 * @param {string} payload.totalPrice - Tổng giá tiền
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Response từ server
 */
export async function sendEstimateNotificationZalo(payload, token) {
	if (!token) {
		throw new Error('Auth token không tồn tại. Vui lòng đăng nhập.');
	}

	if (!payload?.number || !payload?.customerName) {
		throw new Error('Thiếu thông tin số điện thoại hoặc tên khách hàng.');
	}

	if (!payload?.orderCode) {
		throw new Error('Thiếu mã đặt lịch (orderCode).');
	}

	try {
		const response = await request('/api/webhook/zalo/estimate/sent', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		return response;
	} catch (error) {
		const errorMessage = error?.response?.data?.message || error?.message || 'Không thể gửi thông báo Zalo.';
		throw new Error(errorMessage);
	}
}
