/* Service Worker cho Web Push (thông báo cấp hệ điều hành, chạy cả khi đã tắt web).
 * Đặt ở public/ nên được phục vụ tại "/sw.js" với scope "/".
 * KHÔNG import module — file này chạy trong ngữ cảnh Service Worker thuần.
 */

const DEFAULT_ICON = '/Copy of Logo.png';
const DEFAULT_BADGE = '/favicon.png';
const DEFAULT_URL = '/dashboard';

// Kích hoạt ngay, không chờ tab cũ đóng.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const parsePushData = (event) => {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
};

// Có tab nào đang hiển thị & focus không? Nếu có thì để in-app toast lo,
// tránh hiện trùng notification cấp hệ điều hành.
const hasVisibleClient = async () => {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  return clientList.some(
    (client) => client.visibilityState === 'visible' && client.focused,
  );
};

self.addEventListener('push', (event) => {
  const payload = parsePushData(event);
  const title = payload.title || 'Thông báo mới';
  const options = {
    body: payload.body || payload.message || '',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || (payload.notificationId ? `noti-${payload.notificationId}` : undefined),
    renotify: Boolean(payload.tag || payload.notificationId),
    requireInteraction: String(payload.type || '').toUpperCase() === 'URGENT',
    data: {
      url: payload.url || DEFAULT_URL,
      notificationId: payload.notificationId ?? null,
      type: payload.type || 'INFO',
    },
  };

  event.waitUntil(
    (async () => {
      // Nếu app đang mở & focus, bỏ qua notification hệ điều hành để không trùng
      // với toast in-app (do STOMP xử lý). Vẫn ping client để cập nhật danh sách.
      if (await hasVisibleClient()) {
        const clientList = await self.clients.matchAll({ type: 'window' });
        clientList.forEach((client) =>
          client.postMessage({ type: 'PUSH_RECEIVED', payload }),
        );
        return;
      }
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || DEFAULT_URL;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Ưu tiên focus tab đang mở cùng origin, rồi điều hướng.
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* điều hướng chéo-origin bị chặn — bỏ qua */
            }
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Khi push service xoay endpoint, tự đăng ký lại và báo cho các tab đang mở
// để chúng gửi subscription mới lên backend.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clientList.forEach((client) =>
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGE' }),
      );
    })(),
  );
});
