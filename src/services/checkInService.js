import { API_BASE_URL, request } from './apiClient.js';

// Lookup booking + customer info for receptionist check-in by bookingCode
// Backend: POST /api/receptionist/check-in/lookup
export const lookupCheckInByBookingCode = (bookingCode, token) => {
  const code = String(bookingCode || '').trim();

  return request('/api/receptionist/check-in/lookup', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ bookingCode: code }),
  });
};


// Complete receptionist check-in flow using multipart/form-data (for backends expecting @ModelAttribute/MultipartFile)
// Backend: POST /api/receptionist/check-in/complete-all
export const completeAllCheckInMultipart = async (payload, photoFiles, token) => {
  const formData = new FormData();

  const files = photoFiles && typeof photoFiles === 'object' ? photoFiles : {};
  const fileKeys = new Set(Object.keys(files));

  Object.entries(payload ?? {}).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'object') return;

    // If backend expects MultipartFile for this key, never send a string.
    // Only the real File should be appended (below). Omitting the field is OK.
    if (fileKeys.has(key)) return;

    formData.append(key, String(value));
  });

  Object.entries(files).forEach(([key, file]) => {
    if (!file) return;
    const isFile = typeof File !== 'undefined' && file instanceof File;
    if (!isFile) return;
    formData.append(key, file, file.name);
  });

  const response = await fetch(`${API_BASE_URL}/api/receptionist/check-in/complete-all`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

// Get vehicles for a customer during receptionist check-in
// Backend: GET /api/receptionist/check-in/customers/{customerId}/vehicles
export const fetchCheckInCustomerVehicles = (customerId, token) => {
  const id = Number(customerId) || 0;
  return request(`/api/receptionist/check-in/customers/${id}/vehicles`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// Create a new vehicle for a customer during receptionist check-in
// Backend: POST /api/receptionist/check-in/vehicles/create
export const createCheckInVehicle = (payload, token) => {
  return request('/api/receptionist/check-in/vehicles/create', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};
