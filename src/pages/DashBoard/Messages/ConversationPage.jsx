import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import ConversationThread from '../../../components/Chat/ConversationThread.jsx';
import './Messages.css';

/**
 * Trang tin nhắn full-page cho 1 hội thoại (mobile) — thay cho box nổi
 * `ChatWindow.jsx` chỉ hợp với desktop. Dùng lại đúng logic dữ liệu qua
 * `ConversationThread` (tải tin nhắn, đánh dấu đã đọc, gửi tin/ảnh/sticker...).
 */
const ConversationPage = () => {
  const { conversationId } = useParams();
  const { chatState } = useOutletContext();
  const navigate = useNavigate();

  const conversation = chatState.conversations.find(
    (c) => String(c.conversationId) === String(conversationId),
  );

  if (!conversation) {
    return (
      <div className="conversation-page">
        <header className="conversation-page__header">
          <button type="button" className="conversation-page__backBtn" onClick={() => navigate('/messages')}>
            <ArrowLeft size={18} />
          </button>
          <span className="conversation-page__title">Đang tải...</span>
        </header>
      </div>
    );
  }

  const title = conversation.title || 'Cuộc trò chuyện';
  const avatar = conversation.avatarUrl || conversation.participants?.[0]?.avatarUrl;
  const isOnline = conversation.participants?.some((p) => p.online);

  return (
    <div className="conversation-page">
      <header className="conversation-page__header">
        <button type="button" className="conversation-page__backBtn" onClick={() => navigate('/messages')} aria-label="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div className="conversation-page__avatar">
          <img src={getAvatarSrc(avatar)} alt={title} onError={handleAvatarError} />
          {isOnline && <span className="conversation-page__onlineDot" />}
        </div>
        <span className="conversation-page__title">{title}</span>
        <span
          className="conversation-page__connectionIcon"
          title={chatState.connected ? 'Đã kết nối realtime' : 'Mất kết nối realtime'}
        >
          {chatState.connected ? <Wifi size={16} /> : <WifiOff size={16} />}
        </span>
      </header>

      <div className="conversation-page__body">
        <ConversationThread conversationId={conversation.conversationId} chatState={chatState} />
      </div>
    </div>
  );
};

export default ConversationPage;
