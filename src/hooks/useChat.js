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
import { playMessageSound } from '../utils/notificationSound.js';

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
  const [messagesLoading, setMessagesLoading] = useState({});
  const [messagesHasMore, setMessagesHasMore] = useState({});
  const clientRef = useRef(null);

  // Ref mirror của state hay đổi liên tục (tin nhắn mới, cửa sổ mở) để các callback
  // (markRead, loadMoreMessages, applyIncomingMessage...) đọc giá trị mới nhất mà
  // KHÔNG cần đưa chúng vào dependency array của useCallback — tránh callback bị tạo
  // lại mỗi khi có tin nhắn mới, vốn làm useEffect ở component con (phụ thuộc callback
  // đó) chạy lại liên tục mỗi lần nhận/gửi tin (nhìn giống vòng lặp vô hạn trong log BE).
  const messagesByConversationRef = useRef({});
  const openWindowsRef = useRef([]);
  const conversationsRef = useRef([]);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  useEffect(() => {
    openWindowsRef.current = openWindows;
  }, [openWindows]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

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

  const sortContactsOnlineFirst = (list) =>
    [...list].sort((a, b) => {
      if (Boolean(a.online) !== Boolean(b.online)) return a.online ? -1 : 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

  const searchContacts = useCallback(
    async (search) => {
      if (mock) {
        const q = (search || '').trim().toLowerCase();
        const filtered = q ? MOCK_CONTACTS.filter((c) => c.fullName.toLowerCase().includes(q)) : MOCK_CONTACTS;
        return sortContactsOnlineFirst(filtered);
      }
      try {
        return await fetchContacts(search);
      } catch {
        return [];
      }
    },
    [mock],
  );

  /**
   * Tải tin nhắn cho 1 hội thoại — phân trang theo cursor (message_id).
   * @param {string|number} conversationId
   * @param {object} [options]
   * @param {boolean} [options.reset] - true: tải lại trang mới nhất từ đầu (khi mở hội
   *   thoại), THAY TOÀN BỘ danh sách hiện có. false (mặc định): tải thêm tin CŨ HƠN khi
   *   người dùng lăn lên trên, gắn vào ĐẦU danh sách hiện có.
   */
  const loadMoreMessages = useCallback(
    async (conversationId, options = {}) => {
      const { reset = false } = options;

      if (mock) {
        const nextList = reset
          ? (MOCK_MESSAGES[conversationId] || [])
          : (messagesByConversationRef.current[conversationId] || MOCK_MESSAGES[conversationId] || []);
        messagesByConversationRef.current = { ...messagesByConversationRef.current, [conversationId]: nextList };
        setMessagesByConversation((prev) => ({ ...prev, [conversationId]: nextList }));
        setMessagesHasMore((prev) => ({ ...prev, [conversationId]: false }));
        return nextList;
      }

      const existing = reset ? [] : (messagesByConversationRef.current[conversationId] || []);
      const oldest = existing[0];
      // Loading cục bộ cho từng hội thoại (hiển thị bên trong message box),
      // KHÔNG dùng loading toàn trang cho việc này.
      setMessagesLoading((prev) => ({ ...prev, [conversationId]: true }));
      try {
        const { messages, hasMore } = await fetchMessages(conversationId, { before: oldest?.messageId });
        const incoming = [...(messages || [])].reverse();
        const nextList = reset ? incoming : [...incoming, ...(messagesByConversationRef.current[conversationId] || [])];
        // Cập nhật ref NGAY (đồng bộ) thay vì chờ effect đồng bộ ref chạy sau khi React
        // commit — tránh race condition khi caller cần đọc tin nhắn mới nhất ngay sau
        // khi promise này resolve (ví dụ markRead cần lấy đúng messageId mới nhất).
        messagesByConversationRef.current = { ...messagesByConversationRef.current, [conversationId]: nextList };
        setMessagesByConversation((prev) => ({ ...prev, [conversationId]: nextList }));
        setMessagesHasMore((prev) => ({ ...prev, [conversationId]: Boolean(hasMore) }));
        return nextList;
      } catch (err) {
        setError(err?.message || 'Không tải được tin nhắn.');
        return messagesByConversationRef.current[conversationId] || [];
      } finally {
        setMessagesLoading((prev) => ({ ...prev, [conversationId]: false }));
      }
    },
    [mock],
  );

  // Không fetch tin nhắn ở đây nữa — ChatWindow tự gọi loadMoreMessages({reset:true})
  // mỗi khi cửa sổ hiển thị (mở mới HOẶC mở lại từ trạng thái thu nhỏ), đảm bảo luôn
  // lấy dữ liệu mới nhất thay vì dùng cache cũ.
  const openConversation = useCallback((conversationId) => {
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
  }, []);

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
        const existing = conversationsRef.current.find(
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
    [mock, openConversation],
  );

  const applyIncomingMessage = useCallback(
    (message) => {
      if (!message?.conversationId) return;
      setMessagesByConversation((prev) => ({
        ...prev,
        [message.conversationId]: mergeMessageIntoList(prev[message.conversationId] || [], message),
      }));
      setConversations((prev) => {
        // Ép về String vì currentStaffId là string còn senderId từ BE là number.
        const isOwn = String(message.senderId) === String(currentStaffId);
        const isWindowOpenAndFocused = openWindowsRef.current.some(
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

      if (String(message.senderId) !== String(currentStaffId)) {
        const isWindowOpenAndFocused = openWindowsRef.current.some(
          (w) => w.conversationId === message.conversationId && !w.minimized,
        );
        if (!isWindowOpenAndFocused) {
          toast.info(`${message.senderName || 'Tin nhắn mới'}: ${message.text || 'Đã gửi tệp đính kèm'}`, {
            containerId: 'app-toast',
          });
          playMessageSound();
        }
      }
    },
    [currentStaffId],
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
    async (conversationId, upToMessageIdOverride) => {
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
      if (mock) return;
      // Ưu tiên upToMessageIdOverride (truyền trực tiếp từ nơi gọi, ví dụ ChatWindow
      // sau khi loadMoreMessages resolve) — tránh đọc ref có thể còn rỗng/cũ nếu
      // markRead được gọi trước khi tin nhắn kịp tải xong (bug: luôn gửi upToMessageId
      // = null lên BE, khiến BE bỏ qua không cập nhật last_read_message_id, dẫn đến
      // reload trang lại thấy "chưa đọc" dù UI đã tắt badge tạm thời).
      const messages = messagesByConversationRef.current[conversationId] || [];
      const last = messages[messages.length - 1];
      const upToMessageId = upToMessageIdOverride ?? last?.messageId;
      if (!upToMessageId) return;
      try {
        await markConversationRead(conversationId, upToMessageId);
        clientRef.current?.connected &&
          clientRef.current.publish({
            destination: '/app/chat.read',
            body: JSON.stringify({ conversationId, upToMessageId }),
          });
      } catch {
        // Non-fatal: local unread state đã được cập nhật lạc quan.
      }
    },
    [mock],
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

  // Memoize object trả về để giữ nguyên reference giữa các lần render khi dữ liệu
  // không đổi — tránh các useEffect ở component con (nhận cả object này làm dep)
  // bị kích hoạt lại vô hạn (mỗi lần gọi 1 action lại setState -> re-render -> object mới -> effect chạy lại...).
  return useMemo(
    () => ({
      currentStaffId,
      mock,
      conversations,
      messagesByConversation,
      messagesLoading,
      messagesHasMore,
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
    }),
    [
      currentStaffId,
      mock,
      conversations,
      messagesByConversation,
      messagesLoading,
      messagesHasMore,
      openWindows,
      unreadTotal,
      loading,
      error,
      connected,
      loadConversations,
      searchContacts,
      loadMoreMessages,
      openConversation,
      closeWindow,
      toggleMinimize,
      startConversation,
      sendMessage,
      markRead,
    ],
  );
};

export default useChat;
