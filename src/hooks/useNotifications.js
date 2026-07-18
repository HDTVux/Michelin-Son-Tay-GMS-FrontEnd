import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../services/apiClient.js';
import {
  fetchStaffNotifications,
  markStaffNotificationRead,
} from '../services/staffNotificationService.js';
import { playNotificationSound } from '../utils/notificationSound.js';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') ||
  '';

const getNotificationKey = (notification) => {
  if (notification?.notificationId != null) return `id:${notification.notificationId}`;
  return [
    'tmp',
    notification?.staffId ?? '',
    notification?.title ?? '',
    notification?.message ?? '',
    notification?.sentAt ?? '',
  ].join(':');
};

const mergeNotification = (items, notification) => {
  if (!notification || typeof notification !== 'object') return items;

  const nextKey = getNotificationKey(notification);
  const exists = items.some((item) => getNotificationKey(item) === nextKey);
  if (exists) {
    return items.map((item) =>
      getNotificationKey(item) === nextKey ? { ...item, ...notification } : item,
    );
  }

  return [notification, ...items];
};

const parseMessageBody = (message) => {
  try {
    return JSON.parse(message.body);
  } catch {
    return null;
  }
};

export const useNotifications = ({
  enabled = true,
  notifyOnReceive = true,
  reconnectDelay = 5000,
} = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item && !item.isRead).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!enabled) return [];

    setLoading(true);
    setError('');

    try {
      const data = await fetchStaffNotifications();
      const items = Array.isArray(data) ? data : [];
      setNotifications(items);
      return items;
    } catch (err) {
      setError(err?.message || 'Không tải được thông báo.');
      setNotifications([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const addNotification = useCallback(
    (notification) => {
      setNotifications((items) => mergeNotification(items, notification));

      if (notifyOnReceive && notification?.title) {
        toast.info(notification.message || notification.title, {
          containerId: 'app-toast',
        });
        playNotificationSound();
      }
    },
    [notifyOnReceive],
  );

  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    setNotifications((items) =>
      items.map((item) =>
        item?.notificationId === notificationId ? { ...item, isRead: true } : item,
      ),
    );

    try {
      await markStaffNotificationRead(notificationId);
    } catch (err) {
      setError(err?.message || 'Không đánh dấu được thông báo đã đọc.');
      setNotifications((items) =>
        items.map((item) =>
          item?.notificationId === notificationId ? { ...item, isRead: false } : item,
        ),
      );
      toast.error(err?.message || 'Không đánh dấu được thông báo đã đọc.', {
        containerId: 'app-toast',
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    loadNotifications();
    const token = getAuthToken();

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-notifications`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay,
      debug: () => {},
      onConnect: () => {
        setConnected(true);

        const onMessage = (message) => {
          const notification = parseMessageBody(message);
          addNotification(notification);
        };

        client.subscribe('/topic/public-notifications', onMessage);
        client.subscribe('/user/queue/private-notifications', onMessage);
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        setError(frame?.headers?.message || 'Kết nối thông báo bị lỗi.');
      },
      onWebSocketClose: () => setConnected(false),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      setConnected(false);
      clientRef.current = null;
      client.deactivate();
    };
  }, [addNotification, enabled, loadNotifications, reconnectDelay]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    connected,
    reload: loadNotifications,
    markAsRead,
  };
};

export default useNotifications;
