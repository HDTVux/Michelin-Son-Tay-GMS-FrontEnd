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
 * dưới màn hình. Đồng bộ 1 biến CSS theo `window.visualViewport.height` (biến này CÓ co
 * lại khi bàn phím mở) để trang luôn khớp đúng phần thực sự hiển thị.
 *
 * ĐÃ THỬ dịch cả `top` theo `visualViewport.offsetTop` (bù phần Safari tự cuộn trang để
 * giữ ô đang gõ trong tầm nhìn) nhưng cách đó gây giật khi mở bàn phím và có lúc để lộ
 * headnavbar phía trên bị che khuất bởi phần tử fixed lúc đang dịch chuyển. Vì trang này
 * đã tự pin đúng vị trí composer bằng flexbox (không cần cuộn để thấy ô nhập), cách ổn
 * định hơn là CHỦ ĐỘNG kéo trang về lại vị trí cuộn ban đầu (0) mỗi khi Safari cố cuộn nó
 * — nhờ vậy `top: 0` cố định không bao giờ cần thay đổi, chỉ `height` co lại là đủ.
 */
const useVisualViewportHeight = () => {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const syncHeight = () => {
      document.documentElement.style.setProperty('--conversation-page-vh', `${vv.height}px`);
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    syncHeight();
    vv.addEventListener('resize', syncHeight);
    vv.addEventListener('scroll', syncHeight);
    window.addEventListener('scroll', syncHeight, { passive: true });
    return () => {
      vv.removeEventListener('resize', syncHeight);
      vv.removeEventListener('scroll', syncHeight);
      window.removeEventListener('scroll', syncHeight);
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
