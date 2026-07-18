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

/**
 * Trên iOS Safari, `position: fixed; height: 100dvh` không tự co theo bàn phím ảo —
 * trang vẫn giữ chiều cao trước khi mở bàn phím trong khi phần nhìn thấy thực tế (visual
 * viewport) đã bị bàn phím che mất phần dưới, khiến ô soạn tin/nút gửi bị đẩy khuất phía
 * dưới màn hình. Đồng bộ 1 biến CSS theo `window.visualViewport.height` (biến này CÓ co
 * lại khi bàn phím mở) để trang luôn khớp đúng phần thực sự hiển thị.
 *
 * ĐÃ THỬ dịch `top` theo `offsetTop`, rồi thử chủ động `scrollTo(0,0)` để chặn Safari tự
 * cuộn — cả 2 đều gây hiệu ứng "trôi" khó chịu khi mở bàn phím: nguyên nhân THẬT SỰ là
 * `document.body` vẫn cuộn được (dù bị `.conversation-page` fixed che kín phía trên), nên
 * lúc focus vào ô nhập, Safari vẫn cố tự cuộn body ở phía dưới để "đưa ô đang gõ vào tầm
 * nhìn" — hành vi tự cuộn đó chạy SONG SONG và giằng co với `height` đang co lại theo
 * bàn phím, tạo ra cảm giác trôi/giật. Cách dứt điểm: KHOÁ HẲN cuộn của body trong lúc
 * trang full-screen này đang mở — Safari không còn gì để tự cuộn nữa, chỉ còn `height`
 * co theo bàn phím là đủ, không cần theo dõi/bù `scroll` hay `top` gì thêm.
 */
const useVisualViewportHeight = () => {
  useEffect(() => {
    const { style } = document.body;
    const prevOverflow = style.overflow;
    style.overflow = 'hidden';

    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const vv = window.visualViewport;
    const syncHeight = () => {
      if (!vv) return;
      document.documentElement.style.setProperty('--conversation-page-vh', `${vv.height}px`);
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    if (vv) {
      syncHeight();
      vv.addEventListener('resize', syncHeight);
      vv.addEventListener('scroll', syncHeight);
    }

    window.addEventListener('scroll', handleScroll);

    return () => {
      style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (vv) {
        vv.removeEventListener('resize', syncHeight);
        vv.removeEventListener('scroll', syncHeight);
      }
      window.removeEventListener('scroll', handleScroll);
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
  const isMobile = useIsMobileViewport();
  useVisualViewportHeight();

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
