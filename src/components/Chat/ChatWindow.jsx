import { useEffect, useState } from 'react';
import { Minus, X, Settings, Wifi, WifiOff } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import MessageList from './MessageList.jsx';
import ChatComposer from './ChatComposer.jsx';
import './chatWidget.css';

const EmailSettingsPopover = ({ onClose }) => (
  <div className="chat-widget__emailPopover" onClick={(e) => e.stopPropagation()}>
    <p className="chat-widget__emailPopoverTitle">Thông báo qua email</p>
    <label className="chat-widget__emailToggle is-disabled">
      <input type="checkbox" disabled />
      <span>Gửi email khi có tin nhắn chưa đọc</span>
    </label>
    <span className="chat-widget__comingSoonBadge">Sắp ra mắt</span>
    <button type="button" className="chat-widget__emailPopoverClose" onClick={onClose}>Đóng</button>
  </div>
);

const ChatWindow = ({ window: win, chatState }) => {
  const { conversationId, minimized } = win;
  const conversation = chatState.conversations.find((c) => c.conversationId === conversationId);
  const messages = chatState.messagesByConversation[conversationId] || [];
  const [showEmailSettings, setShowEmailSettings] = useState(false);

  // Mỗi khi cửa sổ hiển thị (mở mới HOẶC mở lại từ trạng thái thu nhỏ), luôn tải lại
  // trang tin nhắn mới nhất từ server (reset:true) thay vì dùng cache cũ — tránh bug
  // chỉ thấy tin nhắn cũ/không đồng bộ khi mở lại hội thoại.
  // QUAN TRỌNG: phải CHỜ loadMoreMessages xong rồi mới gọi markRead với đúng
  // messageId mới nhất vừa tải — gọi markRead trước (không có tin nhắn nào trong tay)
  // sẽ gửi upToMessageId=null lên BE, BE bỏ qua không lưu, khiến reload trang lại
  // thấy "chưa đọc" dù badge trên UI đã tắt tạm thời.
  useEffect(() => {
    if (minimized) return undefined;
    let cancelled = false;
    chatState.loadMoreMessages(conversationId, { reset: true }).then((messages) => {
      if (cancelled) return;
      const last = messages?.[messages.length - 1];
      chatState.markRead(conversationId, last?.messageId);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimized, conversationId, chatState.markRead, chatState.loadMoreMessages]);

  // Khi cửa sổ đang mở mà có tin nhắn mới đến (qua WS), badge trên UI đã tắt ngay
  // (optimistic, xem applyIncomingMessage trong useChat.js) nhưng last_read_message_id
  // dưới DB chưa được cập nhật cho tin mới đó — nếu không lưu, reload trang sẽ lại
  // thấy tin này là "chưa đọc". Đồng bộ lại mỗi khi có tin mới trong lúc đang mở.
  useEffect(() => {
    if (minimized) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    chatState.markRead(conversationId, last.messageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimized, conversationId, messages, chatState.markRead]);

  if (!conversation) return null;

  const title = conversation.title || 'Cuộc trò chuyện';
  const avatar = conversation.avatarUrl || conversation.participants?.[0]?.avatarUrl;
  const isOnline = conversation.participants?.some((p) => p.online);

  return (
    <div className={`chat-widget__window ${minimized ? 'is-minimized' : ''}`}>
      <header
        className="chat-widget__windowHeader"
        onClick={() => minimized && chatState.toggleMinimize(conversationId)}
      >
        <div className="chat-widget__windowHeaderInfo">
          <div className="chat-widget__windowAvatar">
            <img src={getAvatarSrc(avatar)} alt={title} onError={handleAvatarError} />
            {isOnline && <span className="chat-widget__onlineDot" />}
          </div>
          {!minimized && <span className="chat-widget__windowTitle">{title}</span>}
        </div>

        <div className="chat-widget__windowHeaderActions">
          {!minimized && (
            <button
              type="button"
              title={chatState.connected ? 'Đã kết nối realtime' : 'Mất kết nối realtime'}
              className="chat-widget__windowIconBtn is-status"
            >
              {chatState.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            </button>
          )}
          {!minimized && (
            <button
              type="button"
              className="chat-widget__windowIconBtn"
              onClick={(e) => { e.stopPropagation(); setShowEmailSettings((v) => !v); }}
              aria-label="Cài đặt email"
            >
              <Settings size={14} />
            </button>
          )}
          <button
            type="button"
            className="chat-widget__windowIconBtn"
            onClick={(e) => { e.stopPropagation(); chatState.toggleMinimize(conversationId); }}
            aria-label={minimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="chat-widget__windowIconBtn"
            onClick={(e) => { e.stopPropagation(); chatState.closeWindow(conversationId); }}
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>

        {showEmailSettings && !minimized && (
          <EmailSettingsPopover onClose={() => setShowEmailSettings(false)} />
        )}
      </header>

      {!minimized && (
        <>
          <MessageList
            messages={messages}
            currentStaffId={chatState.currentStaffId}
            hasMore={Boolean(chatState.messagesHasMore[conversationId])}
            isLoading={Boolean(chatState.messagesLoading[conversationId]) && messages.length === 0}
            onLoadMore={() => chatState.loadMoreMessages(conversationId)}
          />
          <ChatComposer
            mock={chatState.mock}
            onSend={(payload) => chatState.sendMessage(conversationId, payload)}
          />
        </>
      )}
    </div>
  );
};

export default ChatWindow;
