/**
 * Order Service - Đơn hàng bán online cho khách (giỏ hàng -> checkout).
 * Backend Controller: (chưa triển khai, repo BE riêng) - contract dưới đây là spec cho đội BE.
 * Base Path: /api/public/orders
 *
 * Contract:
 *  POST /api/public/orders  body CreateOrderPayload -> { success, data: Order }
 *  GET  /api/public/orders/{orderCode}?phone=       -> { success, data: Order }
 *
 * CreateOrderPayload = {
 *   fulfillmentType: 'SHIP' | 'PICKUP',        // SHIP: giao tận nơi; PICKUP: nhận tại xưởng (kèm đặt lịch)
 *   paymentMethod: 'BANK_QR' | 'COD',          // PICKUP bắt buộc BANK_QR (đặt cọc)
 *   customerName, phone, address?, note?,
 *   items: [{ catalogItemId, itemType, itemName, unitPrice|null, quantity }],
 *   totalAmount,                                // tổng các mục có giá; mục "liên hệ" báo giá sau
 *   depositAmount,                              // PICKUP: tiền cọc đã chuyển; SHIP trả đủ: = totalAmount; COD: 0
 * }
 * Order = CreateOrderPayload & { orderCode, status: 'PENDING_CONFIRM', createdAt }
 *
 * MOCK=true: chưa có BE nên lưu đơn vào localStorage 'gms_orders_v1' và trả về như API thật.
 */
import { request } from './apiClient.js';

const MOCK = true;
const MOCK_STORAGE_KEY = 'gms_orders_v1';

const readMockOrders = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const generateOrderCode = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear() % 100}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MST${datePart}${randomPart}`;
};

export const createOrder = (payload) => {
  if (MOCK) {
    const order = {
      ...payload,
      orderCode: generateOrderCode(),
      status: 'PENDING_CONFIRM',
      createdAt: new Date().toISOString(),
    };
    const orders = readMockOrders();
    orders.unshift(order);
    try {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(orders.slice(0, 50)));
    } catch {
      // đầy localStorage: vẫn trả về đơn để luồng thanh toán tiếp tục
    }
    return Promise.resolve({ success: true, data: order });
  }

  return request('/api/public/orders', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};

export const fetchOrderByCode = (orderCode, phone) => {
  if (MOCK) {
    const order = readMockOrders().find((o) => o.orderCode === orderCode && (!phone || o.phone === phone));
    return order
      ? Promise.resolve({ success: true, data: order })
      : Promise.reject(new Error('Không tìm thấy đơn hàng.'));
  }

  const qs = phone ? `?phone=${encodeURIComponent(phone)}` : '';
  return request(`/api/public/orders/${encodeURIComponent(orderCode)}${qs}`, { method: 'GET' });
};
