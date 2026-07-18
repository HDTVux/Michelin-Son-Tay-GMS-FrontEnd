import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../services/apiClient.js';
import {
  fetchContacts,
  fetchConversations,
  createConversation,
  fetchMessages,
  markConversationRead,
} from '../services/chatService.js';
import {
  MOCK_CURRENT_STAFF_ID,
  MOCK_CONTACTS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
} from '../components/Chat/chatMocks.js';

const MAX_OPEN_WINDOWS = 3;

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') ||
  '';

const getCurrentStaffId = () => {
  try {
    const raw = localStorage.getItem('staffProfile');
    const profile = raw ? JSON.parse(raw) : null;
    return profile?.staffId != null ? String(profile.staffId) : '';
  } catch {
    return '';
  }
};

const genClientMsgId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sortConversationsByRecency = (items) =>
  [...items].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

const mergeMessageIntoList = (messages, incoming) => {
  const idx = messages.findIndex(
    (m) => m.clientMsgId && incoming.clientMsgId && m.clientMsgId === incoming.clientMsgId,
  );
  if (idx >= 0) {
    const next = messages.slice();
    next[idx] = { ...messages[idx], ...incoming };
    return next;
  }
  if (incoming.messageId && messages.some((m) => m.messageId === incoming.messageId)) {
    return messages.map((m) => (m.messageId === incoming.messageId ? { ...m, ...incoming } : m));
  }
  return [...messages, incoming];
};

/**
 * useChat - Hook trung tâm cho chat nội bộ nhân viên.
 * Cấu trúc phỏng theo useNotifications.js: 1 STOMP client, instantiate 1 lần ở StaffLayout, prop-drill xuống.
 *
 * @param {object} options
 * @param {boolean} options.enabled - Gate theo hasStaffToken.
 * @param {boolean} options.mock - Khi true (mặc định), dùng dữ liệu giả lập vì backend chat chưa tồn tại.
 *   Đặt false khi backend đã triển khai contract trong src/services/chatService.js để chuyển sang API/WS thật.
 */
export const useChat = ({ enabled = true, mock = true, reconnectDelay = 5000 } = {}) => {
  // Ở chế độ mock, luôn dùng MOCK_CURRENT_STAFF_ID để khớp với senderId trong chatMocks.js
  // (tránh lệch trái/phải bong bóng chat khi nhân viên thật đã đăng nhập nhưng đang xem dữ liệu giả lập).
  const currentStaffId = useMemo(
    () => (mock ? MOCK_CURRENT_STAFF_ID : getCurrentStaffId() || MOCK_CURRENT_STAFF_ID),
    [mock],
  );

  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [openWindows, setOpenWindows] = useState([]);
  const clientRef = useRef(null);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  const loadConversations = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    setError('');
    try {
      const items = mock ? MOCK_CONVERSATIONS : await fetchConversations();
      setConversations(sortConversationsByRecency(items));
      return items;
    } catch (err) {
      setError(err?.message || 'Không tải được danh sách hội thoại.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled, mock]);

  const searchContacts = useCallback(
    async (search) => {
      if (mock) {
        const q = (search || '').trim().toLowerCase();
        if (!q) return MOCK_CONTACTS;
        return MOCK_CONTACTS.filter((c) => c.fullName.toLowerCase().includes(q));
      }
      try {
        return await fetchContacts(search);
      } catch {
        return [];
      }
    },
    [mock],
  );

  const loadMoreMessages = useCallback(
    async (conversationId) => {
      if (mock) {
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: prev[conversationId] || MOCK_MESSAGES[conversationId] || [],
        }));
        return;
      }
      const existing = messagesByConversation[conversationId] || [];
      const oldest = existing[0];
      try {
        const { messages } = await fetchMessages(conversationId, { before: oldest?.messageId });
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: [...(messages || []).reverse(), ...(prev[conversationId] || [])],
        }));
      } catch (err) {
        setError(err?.message || 'Không tải được tin nhắn.');
      }
    },
    [mock, messagesByConversation],
  );

  const ensureConversationLoaded = useCallback(
    (conversationId) => {
      if (!messagesByConversation[conversationId]) {
        loadMoreMessages(conversationId);
      }
    },
    [messagesByConversation, loadMoreMessages],
  );

  const openConversation = useCallback(
    (conversationId) => {
      ensureConversationLoaded(conversationId);
      setOpenWindows((prev) => {
        const existing = prev.find((w) => w.conversationId === conversationId);
        if (existing) {
          return prev.map((w) =>
            w.conversationId === conversationId ? { ...w, minimized: false } : w,
          );
        }
        const next = [...prev, { conversationId, minimized: false }];
        return next.length > MAX_OPEN_WINDOWS ? next.slice(next.length - MAX_OPEN_WINDOWS) : next;
      });
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    },
    [ensureConversationLoaded],
  );

  const closeWindow = useCallback((conversationId) => {
    setOpenWindows((prev) => prev.filter((w) => w.conversationId !== conversationId));
  }, []);

  const toggleMinimize = useCallback((conversationId) => {
    setOpenWindows((prev) =>
      prev.map((w) =>
        w.conversationId === conversationId ? { ...w, minimized: !w.minimized } : w,
      ),
    );
  }, []);

  const startConversation = useCallback(
    async (staffId) => {
      if (mock) {
        const existing = conversations.find(
          (c) => c.type === 'direct' && c.participants.some((p) => p.staffId === staffId),
        );
        if (existing) {
          openConversation(existing.conversationId);
          return existing;
        }
        const contact = MOCK_CONTACTS.find((c) => c.staffId === staffId);
        const newConv = {
          conversationId: `conv-${Date.now()}`,
          type: 'direct',
          title: contact?.fullName || 'Cuộc trò chuyện mới',
          avatarUrl: contact?.avatarUrl || '',
          participants: contact ? [contact] : [],
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
        };
        setConversations((prev) => sortConversationsByRecency([newConv, ...prev]));
        setMessagesByConversation((prev) => ({ ...prev, [newConv.conversationId]: [] }));
        openConversation(newConv.conversationId);
        return newConv;
      }

      try {
        const conv = await createConversation([staffId], 'direct');
        if (conv) {
          setConversations((prev) => {
            const withoutDup = prev.filter((c) => c.conversationId !== conv.conversationId);
            return sortConversationsByRecency([conv, ...withoutDup]);
          });
          openConversation(conv.conversationId);
        }
        return conv;
      } catch (err) {
        setError(err?.message || 'Không tạo được cuộc trò chuyện.');
        return null;
      }
    },
    [mock, conversations, openConversation],
  );

  const applyIncomingMessage = useCallback(
    (message) => {
      if (!message?.conversationId) return;
      setMessagesByConversation((prev) => ({
        ...prev,
        [message.conversationId]: mergeMessageIntoList(prev[message.conversationId] || [], message),
      }));
      setConversations((prev) => {
        const isOwn = message.senderId === currentStaffId;
        const isWindowOpenAndFocused = openWindows.some(
          (w) => w.conversationId === message.conversationId && !w.minimized,
        );
        const next = prev.map((c) => {
          if (c.conversationId !== message.conversationId) return c;
          return {
            ...c,
            lastMessage: message,
            updatedAt: message.createdAt || new Date().toISOString(),
            unreadCount: isOwn || isWindowOpenAndFocused ? c.unreadCount : (c.unreadCount || 0) + 1,
          };
        });
        return sortConversationsByRecency(next);
      });

      if (message.senderId !== currentStaffId) {
        const isWindowOpenAndFocused = openWindows.some(
          (w) => w.conversationId === message.conversationId && !w.minimized,
        );
        if (!isWindowOpenAndFocused) {
          toast.info(`${message.senderName || 'Tin nhắn mới'}: ${message.text || 'Đã gửi tệp đính kèm'}`, {
            containerId: 'app-toast',
          });
        }
      }
    },
    [currentStaffId, openWindows],
  );

  const sendMessage = useCallback(
    (conversationId, payload) => {
      const clientMsgId = payload.clientMsgId || genClientMsgId();
      const optimisticMessage = {
        messageId: clientMsgId,
        clientMsgId,
        conversationId,
        senderId: currentStaffId,
        senderName: 'Bạn',
        senderAvatar: '',
        type: payload.type,
        text: payload.text,
        attachments: payload.attachments,
        stickerId: payload.stickerId,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };

      applyIncomingMessage(optimisticMessage);

      if (mock) {
        return Promise.resolve(optimisticMessage);
      }

      const client = clientRef.current;
      if (client?.connected) {
        client.publish({
          destination: '/app/chat.send',
          body: JSON.stringify({ ...payload, clientMsgId, conversationId }),
        });
        return Promise.resolve(optimisticMessage);
      }

      setError('Mất kết nối realtime, tin nhắn sẽ gửi lại khi kết nối được khôi phục.');
      return Promise.resolve(optimisticMessage);
    },
    [currentStaffId, mock, applyIncomingMessage],
  );

  const markRead = useCallback(
    async (conversationId) => {
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
      if (mock) return;
      const messages = messagesByConversation[conversationId] || [];
      const last = messages[messages.length - 1];
      try {
        await markConversationRead(conversationId, last?.messageId);
        clientRef.current?.connected &&
          clientRef.current.publish({
            destination: '/app/chat.read',
            body: JSON.stringify({ conversationId, upToMessageId: last?.messageId }),
          });
      } catch {
        // Non-fatal: local unread state đã được cập nhật lạc quan.
      }
    },
    [mock, messagesByConversation],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    loadConversations();

    if (mock) {
      setConnected(true);
      return undefined;
    }

    const token = getAuthToken();
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-chat`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay,
      debug: () => {},
      onConnect: () => {
        setConnected(true);

        client.subscribe('/user/queue/chat-messages', (message) => {
          try {
            applyIncomingMessage(JSON.parse(message.body));
          } catch {
            // Ignore malformed payload.
          }
        });

        client.subscribe('/user/queue/chat-receipts', (message) => {
          try {
            const receipt = JSON.parse(message.body);
            setMessagesByConversation((prev) => {
              const list = prev[receipt.conversationId];
              if (!list) return prev;
              return {
                ...prev,
                [receipt.conversationId]: list.map((m) =>
                  m.messageId === receipt.messageId ? { ...m, status: receipt.status } : m,
                ),
              };
            });
          } catch {
            // Ignore malformed payload.
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        setError(frame?.headers?.message || 'Kết nối chat bị lỗi.');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mock, reconnectDelay]);

  return {
    currentStaffId,
    mock,
    conversations,
    messagesByConversation,
    openWindows,
    unreadTotal,
    loading,
    error,
    connected,
    reload: loadConversations,
    searchContacts,
    loadMoreMessages,
    openConversation,
    closeWindow,
    toggleMinimize,
    startConversation,
    sendMessage,
    markRead,
  };
};

export default useChat;
