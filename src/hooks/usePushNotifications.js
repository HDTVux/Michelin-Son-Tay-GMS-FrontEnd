import { useCallback, useEffect, useRef, useState } from 'react';
import {
  savePushSubscription,
  deletePushSubscription,
} from '../services/pushService.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const SW_URL = '/sw.js';

// VAPID public key (base64url) -> Uint8Array cho pushManager.subscribe.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const detectSupport = () =>
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  'PushManager' in window &&
  'Notification' in window;

const isIos = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ báo là "Mac" nhưng có cảm ứng.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
};

/**
 * Quản lý vòng đời Web Push cho khu vực nhân viên:
 * - đăng ký service worker,
 * - đọc trạng thái subscription/permission,
 * - bật (enable) / tắt (disable) và đồng bộ với backend.
 */
export const usePushNotifications = ({ enabled = true } = {}) => {
  const isSupported = detectSupport();
  const hasVapidKey = Boolean(VAPID_PUBLIC_KEY);
  // iOS chỉ nhận Web Push khi đã cài PWA (Add to Home Screen).
  const needsInstall = isSupported && isIos() && !isStandalone();

  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const registrationRef = useRef(null);

  const getRegistration = useCallback(async () => {
    if (registrationRef.current) return registrationRef.current;
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
    });
    registrationRef.current = registration;
    return registration;
  }, []);

  const syncSubscription = useCallback(async () => {
    if (!enabled || !isSupported || !hasVapidKey) return;
    try {
      const registration = await getRegistration();
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(existing));
      setPermission(Notification.permission);
    } catch (err) {
      setError(err?.message || 'Không đọc được trạng thái thông báo đẩy.');
    }
  }, [enabled, isSupported, hasVapidKey, getRegistration]);

  const enable = useCallback(async () => {
    setError('');
    if (!isSupported) {
      setError('Trình duyệt không hỗ trợ thông báo đẩy.');
      return false;
    }
    if (needsInstall) {
      setError('Trên iOS, hãy Thêm vào Màn hình chính rồi mở app để bật thông báo.');
      return false;
    }
    if (!hasVapidKey) {
      setError('Thiếu cấu hình VITE_VAPID_PUBLIC_KEY.');
      return false;
    }

    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError(
          perm === 'denied'
            ? 'Bạn đã chặn quyền thông báo. Hãy bật lại trong cài đặt trình duyệt.'
            : 'Chưa cấp quyền thông báo.',
        );
        return false;
      }

      const registration = await getRegistration();
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await savePushSubscription(subscription);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      setError(err?.message || 'Không bật được thông báo đẩy.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [isSupported, needsInstall, hasVapidKey, getRegistration]);

  const disable = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe();
        try {
          await deletePushSubscription(endpoint);
        } catch {
          /* backend prune sẽ dọn nếu gọi lỗi */
        }
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(err?.message || 'Không tắt được thông báo đẩy.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [getRegistration]);

  // Đăng ký SW + đọc trạng thái ban đầu.
  useEffect(() => {
    if (!enabled || !isSupported) return;
    syncSubscription();
  }, [enabled, isSupported, syncSubscription]);

  // Khi push service xoay endpoint, SW báo lên -> đăng ký lại.
  useEffect(() => {
    if (!enabled || !isSupported) return undefined;
    const onMessage = (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGE') {
        enable();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [enabled, isSupported, enable]);

  return {
    isSupported,
    hasVapidKey,
    needsInstall,
    permission,
    isSubscribed,
    busy,
    error,
    enable,
    disable,
    refresh: syncSubscription,
  };
};

export default usePushNotifications;
