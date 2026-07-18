import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import ConversationThread from '../../../components/Chat/ConversationThread.jsx';
import './Messages.css';

const MOBILE_QUERY = '(max-width: 1024px)';

/**
 * `.conversation-page` (position: fixed, che toàn màn hình) được render LỒNG bên trong
 * `.staffLayout__content` (overflow: auto) — trên iOS Safari, `position: fixed` bên
 * trong 1 ancestor có `overflow: auto` đôi khi bị tính sai vị trí, không thoát ra viewport
 * thật, khiến sidebar/header mobile phía trên đè lên nút back (lỗi đặc thù WebKit, không
 * tái hiện được trên Chromium). Ở mobile, portal thẳng ra `document.body` (giống cách
 * `GlobalRequestButtonLoading` đã làm) để thoát khỏi ancestor overflow:auto đó hoàn toàn.
 * Desktop giữ nguyên render tại chỗ (trang không phải overlay full-screen ở đó).
 */
const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
};

const ConversationPage = () => {
  const { conversationId } = useParams();
  const { chatState } = useOutletContext();
  const navigate = useNavigate();
  const isMobile = useIsMobileViewport();

  const conversation = chatState.conversations.find(
    (c) => String(c.conversationId) === String(conversationId),
  );

  let content;

  if (!conversation) {
    content = (
      <div className="conversation-page" data-gms-no-global-loading="true">
        <header className="conversation-page__header">
          <button type="button" className="conversation-page__backBtn" onClick={() => navigate('/messages')}>
            <ArrowLeft size={18} />
          </button>
          <span className="conversation-page__title">Đang tải...</span>
        </header>
      </div>
    );
  } else {
    const title = conversation.title || 'Cuộc trò chuyện';
    const avatar = conversation.avatarUrl || conversation.participants?.[0]?.avatarUrl;
    const isOnline = conversation.participants?.some((p) => p.online);

    content = (
      <div className="conversation-page" data-gms-no-global-loading="true">
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
  }

  return isMobile ? createPortal(content, document.body) : content;
};

export default ConversationPage;
