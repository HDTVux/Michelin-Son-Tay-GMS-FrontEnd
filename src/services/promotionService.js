import { request } from './apiClient';

/**
 * Service for Promotion API - PromotionController
 * Backend: POST /api/promotion/admin/create
 * Auth: JWT tự động từ apiClient
 */

/**
 * Tạo mới khuyến mãi
 * Backend: POST /api/promotion/admin/create
 * @param {object} payload - PromotionCreateDto
 * Fields: promotionId, code, name, type, discountPercent, isActive,
 *         applyTo, buyItemId, buyQuantity, getItemId, getQuantity,
 *         targetType, minOrderValue, startDate, endDate, usageLimit
 */
export const createPromotion = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/promotion/admin/create', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};
