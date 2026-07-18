import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Pencil, ArrowLeft, MessageCircle } from 'lucide-react';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import { formatRelativeTime, lastMessagePreview } from '../../../utils/chatFormat.js';
import './Messages.css';

/**
 * Trang danh sách hội thoại — bản full-page dùng cho mobile (thay cho popover
 * `ChatLauncher` chỉ hợp với desktop). Cùng dữ liệu/hành động với `chatState`
 * (useChat.js), chỉ khác cách trình bày. Bấm 1 hội thoại -> điều hướng sang
 * `/messages/:conversationId` (ConversationPage.jsx), KHÔNG mở box nổi.
 */
const MessagesList = () => {
  const { chatState } = useOutletContext();
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' | 'new'
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (view === 'new') {
      chatState.searchContacts(search).then(setContacts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, chatState.searchContacts]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || view === 'new') return chatState.conversations;
    return chatState.conversations.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [chatState.conversations, search, view]);

  const handleOpenConversation = (conversationId) => {
    navigate(`/messages/${conversationId}`);
  };

  const handleStartConversation = async (staffId) => {
    const conv = await chatState.startConversation(staffId);
    if (conv?.conversationId) {
      navigate(`/messages/${conv.conversationId}`);
    }
  };

  return (
    <div className="messages-page" data-gms-no-global-loading="true">
      <header className="messages-page__header">
        {view === 'new' ? (
          <>
            <button type="button" className="messages-page__backBtn" onClick={() => { setView('list'); setSearch(''); }}>
              <ArrowLeft size={18} />
            </button>
            <h1 className="messages-page__title">Tin nhắn mới</h1>
          </>
        ) : (
          <>
            <h1 className="messages-page__title">Tin nhắn</h1>
            <button type="button" className="messages-page__newBtn" onClick={() => setView('new')} aria-label="Tin nhắn mới">
              <Pencil size={18} />
            </button>
          </>
        )}
      </header>

      <div className="messages-page__search">
        <Search size={16} />
        <input
          type="text"
          placeholder={view === 'new' ? 'Tìm nhân viên...' : 'Tìm cuộc trò chuyện...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="messages-page__list">
        {view === 'new' ? (
          contacts.length === 0 ? (
            <p className="messages-page__empty">Không tìm thấy nhân viên phù hợp.</p>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.staffId}
                type="button"
                className="messages-page__row"
                onClick={() => handleStartConversation(contact.staffId)}
              >
                <div className="messages-page__avatar">
                  <img src={getAvatarSrc(contact.avatarUrl)} alt={contact.fullName} onError={handleAvatarError} />
                  {contact.online && <span className="messages-page__onlineDot" />}
                </div>
                <div className="messages-page__rowInfo">
                  <span className="messages-page__rowTitle">{contact.fullName}</span>
                  <span className="messages-page__rowSubtitle">
                    {Array.isArray(contact.role) ? contact.role.join(', ') : contact.role}
                  </span>
                </div>
              </button>
            ))
          )
        ) : filteredConversations.length === 0 ? (
          <div className="messages-page__emptyState">
            <MessageCircle size={40} />
            <p>Chưa có cuộc trò chuyện nào.</p>
            <button type="button" className="messages-page__emptyStateBtn" onClick={() => setView('new')}>
              Bắt đầu trò chuyện mới
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.conversationId}
              type="button"
              className="messages-page__row"
              onClick={() => handleOpenConversation(conv.conversationId)}
            >
              <div className="messages-page__avatar">
                <img
                  src={getAvatarSrc(conv.avatarUrl || conv.participants?.[0]?.avatarUrl)}
                  alt={conv.title}
                  onError={handleAvatarError}
                />
                {conv.participants?.some((p) => p.online) && <span className="messages-page__onlineDot" />}
              </div>
              <div className="messages-page__rowInfo">
                <span className="messages-page__rowTitle">{conv.title}</span>
                <span className="messages-page__rowSubtitle">{lastMessagePreview(conv.lastMessage)}</span>
              </div>
              <div className="messages-page__rowMeta">
                <span className="messages-page__rowTime">{formatRelativeTime(conv.updatedAt)}</span>
                {conv.unreadCount > 0 && <span className="messages-page__unreadBadge">{conv.unreadCount}</span>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MessagesList;
