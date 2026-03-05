import { request } from './apiClient.js';

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

// Complete receptionist check-in flow: create service ticket + upload vehicle photos (optional)
// Backend: POST /api/receptionist/check-in/complete-all
export const completeAllCheckIn = (payload, token) => {
  return request('/api/receptionist/check-in/complete-all', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload ?? {}),
  });
};
