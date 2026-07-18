import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

/**
 * Nút mở chat cho thanh header mobile (SideBar.jsx khi co lại thành top bar).
 * Khác với ChatLauncher (desktop, mở popover + box nổi) — trên mobile chat là
 * TRANG RIÊNG, nên nút này chỉ điều hướng sang /messages, không mở gì tại chỗ.
 */
const ChatMobileNavButton = ({ chatState }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith('/messages');

  return (
    <button
      type="button"
      className={`sidebar__chat-button ${isActive ? 'is-active' : ''}`}
      onClick={() => navigate('/messages')}
      aria-label="Tin nhắn nội bộ"
      title="Tin nhắn nội bộ"
    >
      <MessageCircle size={18} />
      {chatState.unreadTotal > 0 && (
        <span className="sidebar__chat-badge">{chatState.unreadTotal}</span>
      )}
    </button>
  );
};

export default ChatMobileNavButton;
