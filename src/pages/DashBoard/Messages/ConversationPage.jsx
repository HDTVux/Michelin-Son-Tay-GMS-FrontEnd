import { useEffect } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import ConversationThread from '../../../components/Chat/ConversationThread.jsx';
import './Messages.css';

/**
 * Trên iOS Safari, `position: fixed; height: 100dvh` không tự co theo bàn phím ảo —
 * trang vẫn giữ chiều cao trước khi mở bàn phím trong khi phần nhìn thấy thực tế (visual
 * viewport) đã bị bàn phím che mất phần dưới, khiến ô soạn tin/nút gửi bị đẩy khuất phía
 * dưới màn hình.
 *
 * Chỉ co `height` theo `visualViewport.height` là CHƯA ĐỦ: khi bàn phím mở, Safari
 * thường cuộn visual viewport xuống một chút để giữ ô đang gõ trong tầm nhìn
 * (`visualViewport.offsetTop` > 0), nhưng phần tử `position: fixed` vẫn neo theo layout
 * viewport gốc (top: 0) — kết quả là 1 khoảng trắng thừa xuất hiện giữa bàn phím và ô
 * nhập (phần tử co đúng độ cao nhưng KHÔNG dịch xuống theo phần đã cuộn). Phải đồng bộ
 * CẢ `offsetTop` lẫn `height` thì mép dưới mới luôn khớp đúng mép trên bàn phím.
 */
const useVisualViewportHeight = () => {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const syncViewport = () => {
      document.documentElement.style.setProperty('--conversation-page-top', `${vv.offsetTop}px`);
      document.documentElement.style.setProperty('--conversation-page-vh', `${vv.height}px`);
    };
    syncViewport();
    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', syncViewport);
    return () => {
      vv.removeEventListener('resize', syncViewport);
      vv.removeEventListener('scroll', syncViewport);
      document.documentElement.style.removeProperty('--conversation-page-top');
      document.documentElement.style.removeProperty('--conversation-page-vh');
    };
  }, []);
};

/**
 * Trang tin nhắn full-page cho 1 hội thoại (mobile) — thay cho box nổi
 * `ChatWindow.jsx` chỉ hợp với desktop. Dùng lại đúng logic dữ liệu qua
 * `ConversationThread` (tải tin nhắn, đánh dấu đã đọc, gửi tin/ảnh/sticker...).
 */
const ConversationPage = () => {
  const { conversationId } = useParams();
  const { chatState } = useOutletContext();
  const navigate = useNavigate();
  useVisualViewportHeight();

  const conversation = chatState.conversations.find(
    (c) => String(c.conversationId) === String(conversationId),
  );

  if (!conversation) {
    return (
      <div className="conversation-page" data-gms-no-global-loading="true">
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
};

export default ConversationPage;
