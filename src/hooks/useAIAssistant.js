import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sendAiMessage, sendPublicAiMessage, getAiQuota, getAiModels, getPublicAiModels } from '../services/aiAssistantService.js';

const MAX_HISTORY_TURNS = 10;

const genMessageId = () =>
  `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const MOCK_REPLY =
  'Đây là phản hồi giả lập từ Trợ lý AI (chưa kết nối backend thật). Khi backend sẵn sàng, câu trả lời sẽ đến từ Google Gemini.';

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
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const messagesRef = useRef([]);
  messagesRef.current = messages;

  const refreshQuota = useCallback(async () => {
    if (mock || isPublic) return;
    try {
      const data = await getAiQuota();
      if (data) setQuota(data);
    } catch {
      // Quota chỉ mang tính hiển thị tham khảo
    }
  }, [mock, isPublic]);

  const refreshModels = useCallback(async () => {
    if (mock) return;
    try {
      const fetchModels = isPublic ? getPublicAiModels : getAiModels;
      const models = await fetchModels();
      if (Array.isArray(models) && models.length > 0) {
        setAvailableModels(models);
      }
    } catch {
      // Bỏ qua lỗi nếu không lấy được danh sách model
    }
  }, [mock, isPublic]);

  useEffect(() => {
    if (enabled && !mock) {
      if (!isPublic) refreshQuota();
      refreshModels();
    }
  }, [enabled, mock, isPublic, refreshQuota, refreshModels]);

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
        let usedModel = null;
        if (mock) {
          replyText = MOCK_REPLY;
        } else {
          const history = messagesRef.current.slice(-MAX_HISTORY_TURNS).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            text: m.text,
          }));
          const send = isPublic ? sendPublicAiMessage : sendAiMessage;
          const data = await send({ message: trimmed, history, model: selectedModel || null });
          replyText = data?.reply || 'Trợ lý AI không trả về nội dung.';
          usedModel = data?.usedModel || selectedModel || null;
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
          usedModel,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
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
    [enabled, mock, isPublic, selectedModel],
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
      availableModels,
      selectedModel,
      setSelectedModel,
      refreshQuota,
      refreshModels,
      openPanel,
      closePanel,
      togglePanel,
      sendMessage,
      clearMessages,
    }),
    [isOpen, messages, isSending, error, mock, quota, availableModels, selectedModel, setSelectedModel, refreshQuota, refreshModels, openPanel, closePanel, togglePanel, sendMessage, clearMessages],
  );
};

export default useAIAssistant;
