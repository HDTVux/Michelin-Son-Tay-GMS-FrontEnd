import { request } from './apiClient';

/**
 * Service for Work History API - WorkHistoryController
 * Backend: GET /api/work-history
 * Auth: JWT tự động từ apiClient
 *
 * Response: Page<WorkHistoryResponse>
 * Fields: serviceTicketId, ticketCode, completedDate, licensePlate,
 *         vehicleBrand, vehicleModel, vehicleYear,
 *         customerName, customerPhone, serviceType,
 *         customerRequest, technicianNotes
 */

/**
 * Lấy lịch sử công việc của kỹ thuật viên (vé đã hoàn thành)
 * @param {object} params
 * @param {string} params.startDate   - Ngày bắt đầu (yyyy-MM-dd) [REQUIRED]
 * @param {string} params.endDate     - Ngày kết thúc (yyyy-MM-dd) [REQUIRED]
 * @param {string} params.licensePlate - Lọc theo biển số xe (optional)
 * @param {number} params.page       - Số trang (default 0)
 * @param {number} params.size       - Kích thước trang (default 20)
 */
export const fetchTechnicianWorkHistory = (params) => {
  const {
    startDate,
    endDate,
    licensePlate,
    page = 0,
    size = 20,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('startDate', startDate);
  searchParams.set('endDate', endDate);
  if (licensePlate) searchParams.set('licensePlate', licensePlate);
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  const path = `/api/work-history?${searchParams.toString()}`;
  // apiClient.js tự lấy authToken từ localStorage
  return request(path, { method: 'GET' });
};
