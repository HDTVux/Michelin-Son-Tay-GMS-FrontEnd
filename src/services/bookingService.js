import { request } from './apiClient';

export const createCustomerBooking = (payload, token) =>
  request('/api/booking/customer/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

export const createGuestBooking = (payload) =>
  request('/api/booking/guest/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchAvailableSlots = (date, token, durationMinutes = 60) =>
  request(`/api/booking/slots/available?date=${encodeURIComponent(date)}&durationMinutes=${durationMinutes}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });