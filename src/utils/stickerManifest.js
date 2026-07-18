// Manifest sticker dùng chung giữa StickerEmojiPicker (chọn sticker) và MessageBubble
// (hiển thị sticker đã nhận). Chỉ stickerId được gửi qua BE/WS (xem chatService.js),
// nên phía nhận phải tự tra manifest để suy ra URL ảnh — không thể dựa vào field
// stickerUrl vì nó chỉ tồn tại tạm thời phía người gửi lúc chọn sticker.

let manifestCache = null;
let inflightPromise = null;

export const loadStickerManifest = async () => {
  if (manifestCache) return manifestCache;
  if (!inflightPromise) {
    inflightPromise = fetch('/stickers/manifest.json')
      .then((res) => res.json())
      .then((data) => {
        manifestCache = Array.isArray(data) ? data : [];
        return manifestCache;
      })
      .catch(() => {
        manifestCache = [];
        return manifestCache;
      });
  }
  return inflightPromise;
};

export const getStickerUrlSync = (stickerId) => {
  if (!stickerId || !manifestCache) return null;
  const item = manifestCache.find((s) => s.id === stickerId);
  return item ? `/stickers/${item.file}` : null;
};
