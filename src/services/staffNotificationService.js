import { request } from './apiClient.js';

const unwrapData = (response, fallback = null) =>
  response?.data !== undefined ? response.data : fallback;

const getStaffToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';

const authHeaders = () => {
  const token = getStaffToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchStaffNotifications = () =>
  request('/api/staff-notification', {
    method: 'GET',
    headers: authHeaders(),
  }).then((response) =>
    unwrapData(response, []),
  );

export const markStaffNotificationRead = (notificationId) =>
  request(`/api/staff-notification/${encodeURIComponent(notificationId)}/isReaded`, {
    method: 'PUT',
    headers: authHeaders(),
  }).then((response) => unwrapData(response, true));

export const createStaffNotification = (payload) =>
  request('/api/staff-notification', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then((response) => unwrapData(response, true));
