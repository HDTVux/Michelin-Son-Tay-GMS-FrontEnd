// Helper định dạng dùng chung giữa ChatLauncher (popover desktop) và trang
// MessagesList (mobile) — tránh định nghĩa trùng ở 2 nơi.

export const formatRelativeTime = (value) => {
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

export const lastMessagePreview = (lastMessage) => {
  if (!lastMessage) return 'Chưa có tin nhắn';
  switch (lastMessage.type) {
    case 'image': return '📷 Đã gửi ảnh';
    case 'video': return '🎬 Đã gửi video';
    case 'file': return '📎 Đã gửi tệp';
    case 'sticker': return 'Đã gửi nhãn dán';
    default: return lastMessage.text || '';
  }
};
