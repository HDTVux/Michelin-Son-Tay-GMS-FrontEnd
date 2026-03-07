import { request } from './apiClient';

/**
 * Catalog Service - Kết nối với Catalog Item APIs
 * Backend Controller: CatalogItemController.java
 * Base Path: /api/catalog
 */

/**
 * Lấy tất cả catalog items đang active
 * Backend: GET /api/catalog/items
 * 
 * @param {string} token - JWT token (optional)
 * @returns {Promise} Response chứa danh sách catalog items
 * 
 * Response format:
 * {
 *   success: true,
 *   data: [
 *     {
 *       itemId: number,
 *       itemName: string,
 *       itemCode: string,
 *       category: string,
 *       description: string,
 *       unitPrice: number,
 *       unit: string,
 *       stockQuantity: number,
 *       isActive: boolean
 *     }
 *   ]
 * }
 */
export const fetchAllCatalogItems = (token) => {
  return request('/api/catalog/items', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

/**
 * Lấy chi tiết một catalog item theo itemId
 * Backend: GET /api/catalog/items/{itemId}
 * 
 * @param {number} itemId - ID của catalog item
 * @param {string} token - JWT token (optional)
 * @returns {Promise} Response chứa chi tiết catalog item
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     itemId: number,
 *     itemName: string,
 *     itemCode: string,
 *     category: string,
 *     description: string,
 *     unitPrice: number,
 *     unit: string,
 *     stockQuantity: number,
 *     isActive: boolean,
 *     supplier: string,
 *     notes: string
 *   }
 * }
 */
export const fetchCatalogItemDetail = (itemId, token) => {
  const id = Number(itemId) || 0;
  return request(`/api/catalog/items/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
