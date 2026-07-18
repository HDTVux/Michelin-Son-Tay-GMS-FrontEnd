import { useState } from 'react';
import { Minus, X, Settings, Wifi, WifiOff } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import ConversationThread from './ConversationThread.jsx';
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
  const [showEmailSettings, setShowEmailSettings] = useState(false);

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

      {!minimized && <ConversationThread conversationId={conversationId} chatState={chatState} />}
    </div>
  );
};

export default ChatWindow;
