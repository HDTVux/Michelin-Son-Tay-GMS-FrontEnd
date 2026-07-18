import { useEffect, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { loadStickerManifest } from '../../utils/stickerManifest.js';
import './chatWidget.css';

/**
 * Popover 2 tab: Emoji (emoji-picker-react) và Sticker (bộ tĩnh offline tại public/stickers/).
 */
const StickerEmojiPicker = ({ onSelectEmoji, onSelectSticker, onClose }) => {
  const [tab, setTab] = useState('emoji');
  const [stickers, setStickers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (tab === 'sticker' && stickers.length === 0) {
      loadStickerManifest().then(setStickers);
    }
  }, [tab, stickers.length]);

  const filteredStickers = search.trim()
    ? stickers.filter((s) =>
        s.id.includes(search.toLowerCase()) ||
        (s.keywords || []).some((k) => k.toLowerCase().includes(search.toLowerCase())),
      )
    : stickers;

  return (
    <div className="chat-widget__pickerPopover" onClick={(e) => e.stopPropagation()}>
      <div className="chat-widget__pickerTabs">
        <button type="button" className={tab === 'emoji' ? 'is-active' : ''} onClick={() => setTab('emoji')}>
          Emoji
        </button>
        <button type="button" className={tab === 'sticker' ? 'is-active' : ''} onClick={() => setTab('sticker')}>
          Nhãn dán
        </button>
      </div>

      {tab === 'emoji' ? (
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onSelectEmoji?.(emojiData.emoji);
          }}
          width="100%"
          height={340}
          searchDisabled={false}
          previewConfig={{ showPreview: false }}
        />
      ) : (
        <div className="chat-widget__stickerTab">
          <input
            type="text"
            className="chat-widget__stickerSearch"
            placeholder="Tìm nhãn dán..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="chat-widget__stickerGrid">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                className="chat-widget__stickerItem"
                title={sticker.id}
                onClick={() => {
                  onSelectSticker?.({ stickerId: sticker.id, stickerUrl: `/stickers/${sticker.file}` });
                  onClose?.();
                }}
              >
                <img src={`/stickers/${sticker.file}`} alt={sticker.id} loading="lazy" />
              </button>
            ))}
            {filteredStickers.length === 0 && (
              <p className="chat-widget__stickerEmpty">Không tìm thấy nhãn dán phù hợp.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerEmojiPicker;
