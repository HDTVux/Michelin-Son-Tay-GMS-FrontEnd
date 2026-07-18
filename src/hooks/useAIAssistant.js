import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sendAiMessage } from '../services/aiAssistantService.js';

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
 * @param {boolean} options.enabled - Gate theo hasStaffToken.
 * @param {boolean} options.mock - Khi true (mặc định), trả lời giả lập vì backend/API key
 *   chưa sẵn sàng. Đặt false khi backend đã triển khai /api/ai-assistant/chat.
 */
const STORAGE_KEY = 'gmsAIAssistantMessages';

export const useAIAssistant = ({ enabled = true, mock = true } = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load AI assistant messages:', e);
      return [];
    }
  });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef([]);
  messagesRef.current = messages;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save AI assistant messages:', e);
    }
  }, [messages]);

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
        if (mock) {
          replyText = MOCK_REPLY;
        } else {
          const history = messagesRef.current.slice(-MAX_HISTORY_TURNS).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            text: m.text,
          }));
          const data = await sendAiMessage({ message: trimmed, history });
          replyText = data?.reply || 'Trợ lý AI không trả về nội dung.';
        }

        const aiMessage = {
          id: genMessageId(),
          role: 'ai',
          text: replyText,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        const aiErrorMessage = {
          id: genMessageId(),
          role: 'ai',
          text: 'Xin lỗi, Trợ lý AI đang gặp sự cố. Vui lòng thử lại sau.',
          createdAt: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, aiErrorMessage]);
        setError(err?.message || 'Không gửi được tin nhắn tới Trợ lý AI.');
      } finally {
        setIsSending(false);
      }
    },
    [enabled, mock],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return useMemo(
    () => ({
      isOpen,
      messages,
      isSending,
      error,
      mock,
      openPanel,
      closePanel,
      togglePanel,
      sendMessage,
      clearMessages,
    }),
    [isOpen, messages, isSending, error, mock, openPanel, closePanel, togglePanel, sendMessage, clearMessages],
  );
};

export default useAIAssistant;
