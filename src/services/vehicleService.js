import { request } from './apiClient';

/**
 * Vehicle Service - Kết nối với Vehicle APIs
 * Backend Controller: VehicleController.java
 * Base Path: /api/vehicles
 */

/**
 * Lấy tất cả xe của một customer
 * Backend: GET /api/vehicles/customer/{customerId}
 * 
 * @param {number} customerId - ID của customer
 * @param {string} token - JWT token (optional, tự động lấy từ localStorage)
 * @returns {Promise} Response chứa danh sách vehicles với odometer và last service date
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     customerId: number,
 *     customerName: string,
 *     vehicles: [
 *       {
 *         vehicleId: number,
 *         licensePlate: string,
 *         brand: string,
 *         model: string,
 *         color: string,
 *         year: number,
 *         lastOdometerReading: number,
 *         lastServiceDate: string (ISO date)
 *       }
 *     ]
 *   }
 * }
 */
export const fetchCustomerVehicles = (customerId, token) => {
  const id = Number(customerId) || 0;
  return request(`/api/vehicles/customer/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

/**
 * Lấy chi tiết một vehicle theo vehicleId
 * TODO: Backend cần implement endpoint này
 * 
 * @param {number} vehicleId - ID của vehicle
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const fetchVehicleDetail = (vehicleId, token) => {
  const id = Number(vehicleId) || 0;
  return request(`/api/vehicles/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
