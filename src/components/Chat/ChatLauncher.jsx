import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Search, Pencil, ArrowLeft } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import './chatWidget.css';

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const lastMessagePreview = (lastMessage) => {
  if (!lastMessage) return 'Chưa có tin nhắn';
  switch (lastMessage.type) {
    case 'image': return '📷 Đã gửi ảnh';
    case 'video': return '🎬 Đã gửi video';
    case 'file': return '📎 Đã gửi tệp';
    case 'sticker': return 'Đã gửi nhãn dán';
    default: return lastMessage.text || '';
  }
};

const ChatLauncher = ({ chatState }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'new'
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (view === 'new') {
      chatState.searchContacts(search).then(setContacts);
    }
  }, [view, search, chatState]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || view === 'new') return chatState.conversations;
    return chatState.conversations.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [chatState.conversations, search, view]);

  const handleOpenConversation = (conversationId) => {
    chatState.openConversation(conversationId);
    setOpen(false);
    setView('list');
    setSearch('');
  };

  const handleStartConversation = async (staffId) => {
    await chatState.startConversation(staffId);
    setOpen(false);
    setView('list');
    setSearch('');
  };

  return (
    <div className="chat-widget__launcher" ref={containerRef}>
      <button
        type="button"
        className={`chat-widget__launcherBtn ${chatState.unreadTotal > 0 ? 'hasUnread' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Tin nhắn nội bộ"
        title="Tin nhắn nội bộ"
      >
        <MessageCircle size={20} />
        {chatState.unreadTotal > 0 && (
          <span className="chat-widget__launcherBadge">{chatState.unreadTotal}</span>
        )}
      </button>

      {open && (
        <div className="chat-widget__popover">
          <header className="chat-widget__popoverHeader">
            {view === 'new' ? (
              <>
                <button type="button" className="chat-widget__popoverBack" onClick={() => { setView('list'); setSearch(''); }}>
                  <ArrowLeft size={16} />
                </button>
                <strong>Tin nhắn mới</strong>
              </>
            ) : (
              <>
                <strong>Đoạn chat</strong>
                <button type="button" className="chat-widget__popoverNewBtn" onClick={() => setView('new')} title="Tin nhắn mới">
                  <Pencil size={15} />
                </button>
              </>
            )}
          </header>

          <div className="chat-widget__popoverSearch">
            <Search size={14} />
            <input
              type="text"
              placeholder={view === 'new' ? 'Tìm nhân viên...' : 'Tìm cuộc trò chuyện...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="chat-widget__popoverList">
            {view === 'new'
              ? contacts.map((contact) => (
                  <button
                    key={contact.staffId}
                    type="button"
                    className="chat-widget__popoverItem"
                    onClick={() => handleStartConversation(contact.staffId)}
                  >
                    <div className="chat-widget__popoverAvatar">
                      <img src={getAvatarSrc(contact.avatarUrl)} alt={contact.fullName} onError={handleAvatarError} />
                      {contact.online && <span className="chat-widget__onlineDot" />}
                    </div>
                    <div className="chat-widget__popoverItemInfo">
                      <span className="chat-widget__popoverItemTitle">{contact.fullName}</span>
                      <span className="chat-widget__popoverItemSubtitle">
                        {Array.isArray(contact.role) ? contact.role.join(', ') : contact.role}
                      </span>
                    </div>
                  </button>
                ))
              : filteredConversations.length === 0 ? (
                  <p className="chat-widget__popoverEmpty">Chưa có cuộc trò chuyện nào.</p>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.conversationId}
                      type="button"
                      className="chat-widget__popoverItem"
                      onClick={() => handleOpenConversation(conv.conversationId)}
                    >
                      <div className="chat-widget__popoverAvatar">
                        <img
                          src={getAvatarSrc(conv.avatarUrl || conv.participants?.[0]?.avatarUrl)}
                          alt={conv.title}
                          onError={handleAvatarError}
                        />
                        {conv.participants?.some((p) => p.online) && <span className="chat-widget__onlineDot" />}
                      </div>
                      <div className="chat-widget__popoverItemInfo">
                        <span className="chat-widget__popoverItemTitle">{conv.title}</span>
                        <span className="chat-widget__popoverItemSubtitle">{lastMessagePreview(conv.lastMessage)}</span>
                      </div>
                      <div className="chat-widget__popoverItemMeta">
                        <span className="chat-widget__popoverItemTime">{formatRelativeTime(conv.updatedAt)}</span>
                        {conv.unreadCount > 0 && <span className="chat-widget__popoverUnreadDot" />}
                      </div>
                    </button>
                  ))
                )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatLauncher;
