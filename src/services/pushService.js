import { request } from './apiClient.js';

// Đăng ký / huỷ đăng ký Web Push subscription cho nhân viên hiện tại.
// Dùng chung pattern token + unwrap như staffNotificationService.js.

const unwrapData = (response, fallback = null) =>
  response?.data !== undefined ? response.data : fallback;

const getStaffToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') ||
  '';

const authHeaders = () => {
  const token = getStaffToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Chuẩn hoá PushSubscription (Web API) -> payload gửi backend.
const toSubscriptionPayload = (subscription, extra = {}) => {
  const json = typeof subscription?.toJSON === 'function' ? subscription.toJSON() : subscription;
  return {
    endpoint: json?.endpoint,
    keys: {
      p256dh: json?.keys?.p256dh,
      auth: json?.keys?.auth,
    },
    expirationTime: json?.expirationTime ?? null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    deviceLabel: extra.deviceLabel || '',
  };
};

export const savePushSubscription = (subscription, extra = {}) =>
  request('/api/push/subscriptions', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(toSubscriptionPayload(subscription, extra)),
  }).then((response) => unwrapData(response, true));

export const deletePushSubscription = (endpoint) =>
  request('/api/push/subscriptions', {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ endpoint }),
  }).then((response) => unwrapData(response, true));

export const listPushSubscriptions = () =>
  request('/api/push/subscriptions', {
    method: 'GET',
    headers: authHeaders(),
  }).then((response) => unwrapData(response, []));
