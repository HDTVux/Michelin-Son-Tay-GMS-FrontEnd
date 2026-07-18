import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble.jsx';
import './chatWidget.css';

const formatDaySeparator = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return 'Hôm nay';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const MessageList = ({ messages, currentStaffId, hasMore, isLoading, onLoadMore }) => {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length === 0]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = async () => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop < 40) {
      setLoadingMore(true);
      prevScrollHeightRef.current = el.scrollHeight;
      await onLoadMore?.();
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeightRef.current;
        }
        setLoadingMore(false);
      });
    }
  };

  let lastDay = '';

  return (
    <div className="chat-widget__messageList" ref={scrollRef} onScroll={handleScroll}>
      {loadingMore && (
        <div className="chat-widget__loadingMore">
          <Loader2 size={16} className="chat-widget__spin" />
        </div>
      )}

      {isLoading ? (
        <div className="chat-widget__messageListLoading">
          <Loader2 size={20} className="chat-widget__spin" />
          <span>Đang tải tin nhắn...</span>
        </div>
      ) : messages.length === 0 ? (
        <p className="chat-widget__emptyMessages">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
      ) : (
        messages.map((message, idx) => {
          const dayLabel = formatDaySeparator(message.createdAt);
          const showDay = dayLabel !== lastDay;
          lastDay = dayLabel;
          // So sánh ép kiểu String vì currentStaffId là string (từ localStorage) còn
          // message.senderId trả về từ BE là number — nếu so sánh === thẳng sẽ luôn
          // false, khiến mọi tin nhắn hiển thị như của người khác (không phân biệt được).
          const isOwn = String(message.senderId) === String(currentStaffId);
          const prevMsg = messages[idx - 1];
          const showSenderName = !isOwn && (!prevMsg || prevMsg.senderId !== message.senderId);

          return (
            <div key={message.messageId || message.clientMsgId}>
              {showDay && <div className="chat-widget__daySeparator"><span>{dayLabel}</span></div>}
              <MessageBubble message={message} isOwn={isOwn} showSenderName={showSenderName} />
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
