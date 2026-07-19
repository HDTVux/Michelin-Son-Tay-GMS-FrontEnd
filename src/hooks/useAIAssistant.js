import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sendAiMessage, sendPublicAiMessage, getAiQuota } from '../services/aiAssistantService.js';

const MAX_HISTORY_TURNS = 10;

const genMessageId = () =>
  `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const MOCK_REPLY =
  'Đây là phản hồi giả lập từ Trợ lý AI (chưa kết nối backend thật). Khi backend sẵn sàng, câu trả lời sẽ đến từ Google Gemini.';

/**
 * useAIAssistant - Hook trạng thái cho panel Trợ lý AI (Google Gemini, qua backend proxy).
 * Đơn giản hơn useChat.js: không cần WebSocket/STOMP, chỉ là request/response thuần.
 *
 * @param {object} options
 * @param {boolean} options.enabled - Gate theo hasStaffToken (staff) / luôn true (khách).
 * @param {boolean} options.mock - Khi true (mặc định), trả lời giả lập vì backend/API key
 *   chưa sẵn sàng. Đặt false khi backend đã triển khai /api/ai-assistant/chat.
 * @param {boolean} options.isPublic - Khi true, dùng kênh công khai cho khách hàng
 *   (/home/ai-assistant/chat, không cần đăng nhập), lưu lịch sử ở key riêng, và KHÔNG
 *   theo dõi/hiển thị quota-token (số liệu vận hành nội bộ, chỉ dành cho staff xem).
 */
const STORAGE_KEY = 'gmsAIAssistantMessages';
const PUBLIC_STORAGE_KEY = 'gmsCustomerAiMessages';

export const useAIAssistant = ({ enabled = true, mock = true, isPublic = false } = {}) => {
  const storageKey = isPublic ? PUBLIC_STORAGE_KEY : STORAGE_KEY;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load AI assistant messages:', e);
      return [];
    }
  });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState(null);
  const messagesRef = useRef([]);
  messagesRef.current = messages;

  // Quota-token chỉ dành cho staff xem (theo dõi vận hành) — khách hàng không cần thấy.
  const refreshQuota = useCallback(async () => {
    if (mock || isPublic) return;
    try {
      const data = await getAiQuota();
      if (data) setQuota(data);
    } catch {
      // Quota chỉ mang tính hiển thị tham khảo — lỗi khi lấy không nên chặn luồng chat.
    }
  }, [mock, isPublic]);

  // Lấy quota ngay khi hook sẵn sàng dùng thật, để hiển thị số liệu kể cả trước khi gửi tin đầu tiên.
  useEffect(() => {
    if (enabled && !mock && !isPublic) {
      refreshQuota();
    }
  }, [enabled, mock, isPublic, refreshQuota]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save AI assistant messages:', e);
    }
  }, [messages, storageKey]);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || !enabled) return;

      const userMessage = {
        id: genMessageId(),
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setError('');
      setIsSending(true);

      try {
        let replyText;
        let usage = null;
        if (mock) {
          replyText = MOCK_REPLY;
        } else {
          const history = messagesRef.current.slice(-MAX_HISTORY_TURNS).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            text: m.text,
          }));
          const send = isPublic ? sendPublicAiMessage : sendAiMessage;
          const data = await send({ message: trimmed, history });
          replyText = data?.reply || 'Trợ lý AI không trả về nội dung.';
          if (!isPublic) {
            usage = data?.usage || null;
            if (data?.quota) setQuota(data.quota);
          }
        }

        const aiMessage = {
          id: genMessageId(),
          role: 'ai',
          text: replyText,
          createdAt: new Date().toISOString(),
          usage,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        // 429 (rate limit) và 503 (chưa cấu hình) có message tiếng Việt thân thiện từ BE — hiển thị trực tiếp.
        const friendly = (err?.status === 429 || err?.status === 503) && err?.message;
        const aiErrorMessage = {
          id: genMessageId(),
          role: 'ai',
          text: friendly || 'Xin lỗi, Trợ lý AI đang gặp sự cố. Vui lòng thử lại sau.',
          createdAt: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, aiErrorMessage]);
        setError(err?.message || 'Không gửi được tin nhắn tới Trợ lý AI.');
      } finally {
        setIsSending(false);
      }
    },
    [enabled, mock, isPublic],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return useMemo(
    () => ({
      isOpen,
      messages,
      isSending,
      error,
      mock,
      quota,
      refreshQuota,
      openPanel,
      closePanel,
      togglePanel,
      sendMessage,
      clearMessages,
    }),
    [isOpen, messages, isSending, error, mock, quota, refreshQuota, openPanel, closePanel, togglePanel, sendMessage, clearMessages],
  );
};

export default useAIAssistant;
