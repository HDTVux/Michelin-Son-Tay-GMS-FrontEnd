import { useEffect, useRef } from 'react';
import MessageList from './MessageList.jsx';
import ChatComposer from './ChatComposer.jsx';
import './chatWidget.css';

/**
 * Phần "thân" dùng chung của 1 hội thoại: danh sách tin nhắn + ô soạn tin, cùng logic
 * tải/đánh dấu đã đọc. Dùng lại ở cả `ChatWindow.jsx` (box nổi desktop, khung 320x440)
 * và `ConversationPage.jsx` (trang full-page mobile) — chỉ khác phần khung/header bọc
 * ngoài, KHÔNG khác logic dữ liệu.
 */
const ConversationThread = ({ conversationId, chatState }) => {
  const messages = chatState.messagesByConversation[conversationId] || [];

  // Chỉ gọi markRead khi messageId CUỐI CÙNG thực sự đổi (tin nhắn mới thật), KHÔNG
  // phải mỗi khi mảng `messages` đổi reference. `messages` cũng đổi reference khi 1
  // receipt WS (trạng thái đã gửi/đã đọc) cập nhật field `status` của tin nhắn cuối —
  // nếu markRead chạy lại ở đây, nó publish `/app/chat.read` lên server, server phát
  // receipt về phía kia, phía kia lại markRead, lại phát receipt ngược lại... tạo vòng
  // lặp vô hạn giữa 2 client khi cả hai cùng mở hội thoại (bug đã gặp).
  const lastMarkedMessageIdRef = useRef(null);

  // Mỗi khi thread hiển thị (mở mới HOẶC mở lại), luôn tải lại trang tin nhắn mới nhất
  // từ server (reset:true) thay vì dùng cache cũ — tránh bug chỉ thấy tin nhắn cũ/không
  // đồng bộ khi mở lại hội thoại.
  // QUAN TRỌNG: phải CHỜ loadMoreMessages xong rồi mới gọi markRead với đúng messageId
  // mới nhất vừa tải — gọi markRead trước (không có tin nhắn nào trong tay) sẽ gửi
  // upToMessageId=null lên BE, BE bỏ qua không lưu, khiến reload trang lại thấy "chưa
  // đọc" dù badge trên UI đã tắt tạm thời.
  useEffect(() => {
    let cancelled = false;
    lastMarkedMessageIdRef.current = null;
    chatState.loadMoreMessages(conversationId, { reset: true }).then((loaded) => {
      if (cancelled) return;
      const last = loaded?.[loaded.length - 1];
      if (!last?.messageId) return;
      lastMarkedMessageIdRef.current = last.messageId;
      chatState.markRead(conversationId, last.messageId);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, chatState.markRead, chatState.loadMoreMessages]);

  // Khi thread đang mở mà có tin nhắn mới đến (qua WS), badge trên UI đã tắt ngay
  // (optimistic, xem applyIncomingMessage trong useChat.js) nhưng last_read_message_id
  // dưới DB chưa được cập nhật cho tin mới đó — đồng bộ lại mỗi khi có tin thật sự mới.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.messageId) return;
    if (lastMarkedMessageIdRef.current === last.messageId) return;
    lastMarkedMessageIdRef.current = last.messageId;
    chatState.markRead(conversationId, last.messageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages, chatState.markRead]);

  return (
    <>
      <MessageList
        messages={messages}
        currentStaffId={chatState.currentStaffId}
        hasMore={Boolean(chatState.messagesHasMore[conversationId])}
        isLoading={Boolean(chatState.messagesLoading[conversationId]) && messages.length === 0}
        onLoadMore={() => chatState.loadMoreMessages(conversationId)}
      />
      <ChatComposer
        mock={chatState.mock}
        onSend={(payload) => chatState.sendMessage(conversationId, payload)}
      />
    </>
  );
};

export default ConversationThread;
