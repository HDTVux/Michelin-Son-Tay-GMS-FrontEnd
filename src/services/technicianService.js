import { request } from './apiClient';

// ============================================================
// SERVICE TICKET TECHNICIANS APIs
// Base: /api/service-ticket/technician
// ============================================================

/**
 * Lấy danh sách phiếu dịch vụ của kỹ thuật viên (có phân trang)
 * Backend: GET /api/service-ticket/technician/tickets
 * @param {object} params
 * @param {number} params.page    - Số trang (default 0)
 * @param {number} params.size    - Kích thước trang (default 10)
 * @param {string} params.date    - Lọc theo ngày nhận xe (yyyy-MM-dd)
 * @param {string} params.status  - Lọc theo trạng thái (DRAFT/CREATED/IN_PROGRESS/COMPLETED/CANCELLED)
 * @param {string} params.search  - Tìm kiếm (ticketCode/customerName/phone/licensePlate)
 * Response: Page<TechnicianTicketListResponse>
 * Fields: serviceTicketId, ticketCode, ticketStatus, vehicleId, licensePlate,
 *         vehicleMake, vehicleModel, customerId, customerName, customerPhone,
 *         bookingId, bookingCode, scheduledDate, scheduledTime,
 *         customerRequest, technicianNotes, receivedAt, createdAt
 */
export const fetchTechnicianTickets = (params) => {
  const searchParams = new URLSearchParams();

  const page = Number.isFinite(params?.page) ? params.page : 0;
  const size = Number.isFinite(params?.size) ? params.size : 10;
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));

  if (params?.date)   searchParams.set('date', params.date);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = qs
    ? `/api/service-ticket/technician/tickets?${qs}`
    : '/api/service-ticket/technician/tickets';

  // apiClient.js tự lấy authToken từ localStorage
  return request(path, { method: 'GET' });
};

/**
 * Lấy chi tiết phiếu dịch vụ theo ticketCode
 * Backend: GET /api/service-ticket/technician/tickets/{ticketCode}
 * Response: TechnicianTicketDetailResponse
 * Fields: serviceTicketId, ticketCode, customer{}, vehicle{}, booking{},
 *         serviceCategory, customerRequest, services[], checkInNotes,
 *         odometerReading, photos[], technicianNotes, ticketStatus,
 *         receivedAt, deliveredAt, createdAt, updatedAt, createdBy, createdByName
 */
export const fetchTechnicianTicketDetail = (ticketCode) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/service-ticket/technician/tickets/${code}`, {
    method: 'GET',
  });
};

/**
 * Cập nhật ghi chú kỹ thuật viên
 * Backend: PUT /api/service-ticket/technician/tickets/{ticketCode}/notes
 * Payload: { technicianNotes: string }
 */
export const updateTechnicianNotes = (ticketCode, payload) => {
  const code = encodeURIComponent(String(ticketCode ?? '').trim());
  if (!code) {
    const error = new Error('Thiếu ticketCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/service-ticket/technician/tickets/${code}/notes`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });
};
