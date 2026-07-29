import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from '../services/apiClient.js';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') ||
  '';

/**
 * Nhận phiếu báo lỗi mới theo thời gian thực.
 *
 * Backend gửi qua `convertAndSendToUser(staffId, "/queue/bug-reports", ...)` và
 * chỉ gửi cho tài khoản ADMIN, nên nhân viên vai trò khác dù có subscribe cũng
 * không nhận được dữ liệu.
 */
export const useBugReportStream = (onReport, { enabled = true, reconnectDelay = 5000 } = {}) => {
  const [connected, setConnected] = useState(false);
  // Giữ callback trong ref để không phải dựng lại kết nối mỗi lần re-render.
  const handlerRef = useRef(onReport);

  useEffect(() => {
    handlerRef.current = onReport;
  }, [onReport]);

  useEffect(() => {
    if (!enabled) return undefined;

    const token = getAuthToken();
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-notifications`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay,
      debug: () => {},
      onConnect: () => {
        setConnected(true);
        client.subscribe('/user/queue/bug-reports', (message) => {
          try {
            handlerRef.current?.(JSON.parse(message.body));
          } catch {
            // bỏ qua bản tin không phải JSON hợp lệ
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });

    client.activate();
    return () => {
      setConnected(false);
      client.deactivate();
    };
  }, [enabled, reconnectDelay]);

  return { connected };
};

export default useBugReportStream;
