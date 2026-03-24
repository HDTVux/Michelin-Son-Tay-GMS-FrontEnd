import { API_BASE_URL, request } from './apiClient.js';

/**
 * Service for Check-In API - CheckInController
 * Backend: /api/receptionist/check-in
 * Auth: JWT tự động từ apiClient
 */

/**
 * Lookup booking + customer info by bookingCode
 * Backend: POST /api/receptionist/check-in/lookup
 * @param {string} bookingCode
 */
export const lookupCheckInByBookingCode = (bookingCode) => {
  const code = String(bookingCode || '').trim();
  if (!code) {
    const error = new Error('Thiếu bookingCode.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/receptionist/check-in/lookup', {
    method: 'POST',
    body: JSON.stringify({ bookingCode: code }),
  });
};

/**
 * Complete receptionist check-in using multipart/form-data
 * Backend: POST /api/receptionist/check-in/complete-all
 * @param {object} payload - CompleteCheckInAllRequest fields
 * @param {File[]} photoFiles - { licensePlatePhoto, conditionPhotos[] }
 */
export const completeAllCheckInMultipart = async (payload, photoFiles) => {
  const formData = new FormData();

  const files = photoFiles && typeof photoFiles === 'object' ? photoFiles : {};
  const fileKeys = new Set(Object.keys(files));

  Object.entries(payload ?? {}).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'object') return;
    if (fileKeys.has(key)) return;
    formData.append(key, String(value));
  });

  Object.entries(files).forEach(([key, file]) => {
    if (!file) return;
    const isFile = typeof File !== 'undefined' && file instanceof File;
    if (!isFile) return;
    formData.append(key, file, file.name);
  });

  // Lấy token tự động
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('staffToken') || '';
  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const response = await fetch(`${API_BASE_URL}/api/receptionist/check-in/complete-all`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (data?.success === false) {
    const error = new Error(data?.message || data?.data?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

/**
 * Get customer's vehicles
 * Backend: GET /api/receptionist/check-in/customers/{customerId}/vehicles
 * @param {number} customerId
 */
export const fetchCheckInCustomerVehicles = (customerId) => {
  const id = Number(customerId) || 0;
  if (id <= 0) {
    const error = new Error('Thiếu customerId hợp lệ.');
    error.status = 400;
    return Promise.reject(error);
  }

  // apiClient.js tự lấy authToken từ localStorage
  return request(`/api/receptionist/check-in/customers/${id}/vehicles`, {
    method: 'GET',
  });
};

/**
 * Create a new vehicle for a customer during check-in
 * Backend: POST /api/receptionist/check-in/vehicles/create
 * @param {object} payload
 */
export const createCheckInVehicle = (payload) => {
  // apiClient.js tự lấy authToken từ localStorage
  return request('/api/receptionist/check-in/vehicles/create', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};
