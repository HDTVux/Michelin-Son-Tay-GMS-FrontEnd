import { useRef, useState } from 'react';
import { Send, Paperclip, Smile, X, Loader2, FileText } from 'lucide-react';
import { compressImage, maybeCompressVideo } from '../../utils/chatMedia.js';
import { uploadChatImage, uploadChatVideo, uploadChatFile } from '../../services/chatUploadService.js';
import AttachMenu from './AttachMenu.jsx';
import StickerEmojiPicker from './StickerEmojiPicker.jsx';
import ChatCameraModal from './ChatCameraModal.jsx';
import './chatWidget.css';

const getStaffToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';

const kindFromMime = (mime = '') => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
};

let pendingIdCounter = 0;
const nextPendingId = () => `pending-${Date.now()}-${pendingIdCounter++}`;

const ChatComposer = ({ mock, onSend }) => {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]); // { id, file, kind, previewUrl, progress, status, error }
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const updatePending = (id, patch) => {
    setPendingAttachments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const processFile = async (file, kindHint) => {
    const id = nextPendingId();
    const kind = kindHint || kindFromMime(file.type);
    const previewUrl = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : null;

    setPendingAttachments((prev) => [
      ...prev,
      { id, file, kind, previewUrl, progress: 0, status: 'compressing', error: '' },
    ]);

    try {
      let processedFile = file;
      if (kind === 'image') {
        processedFile = await compressImage(file, (p) => updatePending(id, { progress: p * 0.5 }));
      } else if (kind === 'video') {
        processedFile = await maybeCompressVideo(file, (p) => updatePending(id, { progress: p * 0.5 }));
      }

      // File HEIC/HEIF (ảnh) hay .mov (video) gốc của iPhone không tự render được qua
      // <img>/<video> trên trình duyệt không phải Safari — nếu vẫn dùng previewUrl tạo từ
      // file GỐC ở trên, khung xem trước lúc soạn tin sẽ trống/vỡ. compressImage/
      // maybeCompressVideo đã convert file này sang JPEG/MP4 (xem chatMedia.js), nên phải
      // tạo lại previewUrl từ file ĐÃ CONVERT.
      if (processedFile !== file && (kind === 'image' || kind === 'video')) {
        const nextPreviewUrl = URL.createObjectURL(processedFile);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        updatePending(id, { file: processedFile, previewUrl: nextPreviewUrl, status: 'ready', progress: 0.5 });
      } else {
        updatePending(id, { file: processedFile, status: 'ready', progress: 0.5 });
      }
    } catch {
      updatePending(id, { status: 'ready', progress: 0.5 });
    }
  };

  const handleFileInputChange = (event, kindHint) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => processFile(file, kindHint));
    event.target.value = '';
  };

  const handleCameraCapture = (file, kind) => {
    processFile(file, kind);
  };

  const removePending = (id) => {
    setPendingAttachments((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const uploadPendingAttachments = async () => {
    const token = getStaffToken();
    const results = [];

    for (const pending of pendingAttachments) {
      updatePending(pending.id, { status: 'uploading', progress: 0.6 });

      if (mock) {
        // Không có backend upload thật: dùng luôn blob URL cục bộ để demo UI.
        results.push({
          url: pending.previewUrl || '',
          kind: pending.kind,
          name: pending.file.name,
          size: pending.file.size,
          mimeType: pending.file.type,
        });
        updatePending(pending.id, { status: 'done', progress: 1 });
        continue;
      }

      try {
        let response;
        if (pending.kind === 'image') {
          response = await uploadChatImage(pending.file, token);
          results.push({
            url: response?.data?.imageUrl,
            kind: 'image',
            name: pending.file.name,
            size: pending.file.size,
            mimeType: pending.file.type,
            width: response?.data?.width,
            height: response?.data?.height,
          });
        } else if (pending.kind === 'video') {
          response = await uploadChatVideo(pending.file, token);
          results.push({
            url: response?.data?.videoUrl,
            kind: 'video',
            name: pending.file.name,
            size: pending.file.size,
            mimeType: pending.file.type,
            durationSec: response?.data?.durationSec,
            thumbnailUrl: response?.data?.thumbnailUrl,
          });
        } else {
          response = await uploadChatFile(pending.file, token);
          results.push({
            url: response?.data?.fileUrl,
            kind: 'file',
            name: pending.file.name,
            size: pending.file.size,
            mimeType: pending.file.type,
          });
        }
        updatePending(pending.id, { status: 'done', progress: 1 });
      } catch (err) {
        updatePending(pending.id, { status: 'error', error: err?.message || 'Upload thất bại' });
        throw err;
      }
    }

    return results;
  };

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    if (sending) return;

    setSending(true);
    try {
      let attachments = [];
      if (pendingAttachments.length > 0) {
        attachments = await uploadPendingAttachments();
      }

      onSend?.({
        type: attachments.length > 0 ? (pendingAttachments[0].kind === 'image' ? 'image' : pendingAttachments[0].kind === 'video' ? 'video' : 'file') : 'text',
        text: trimmed || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setText('');
      pendingAttachments.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setPendingAttachments([]);
    } catch {
      // Lỗi upload đã hiển thị qua trạng thái từng attachment (status: 'error').
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendText();
    }
  };

  const handleSelectSticker = ({ stickerId, stickerUrl }) => {
    onSend?.({ type: 'sticker', stickerId, stickerUrl });
    setShowPicker(false);
  };

  const handleSelectEmoji = (emoji) => {
    setText((prev) => prev + emoji);
  };

  return (
    <div className="chat-widget__composer">
      {pendingAttachments.length > 0 && (
        <div className="chat-widget__pendingList">
          {pendingAttachments.map((p) => (
            <div key={p.id} className="chat-widget__pendingItem">
              {p.kind === 'image' && p.previewUrl ? (
                <img src={p.previewUrl} alt={p.file.name} />
              ) : p.kind === 'video' && p.previewUrl ? (
                <video src={p.previewUrl} muted />
              ) : (
                <div className="chat-widget__pendingFileIcon"><FileText size={18} /></div>
              )}
              {(p.status === 'compressing' || p.status === 'uploading') && (
                <div className="chat-widget__pendingProgress">
                  <Loader2 size={14} className="chat-widget__spin" />
                </div>
              )}
              {p.status === 'error' && <div className="chat-widget__pendingError" title={p.error}>!</div>}
              <button type="button" className="chat-widget__pendingRemove" onClick={() => removePending(p.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-widget__composerRow">
        <div className="chat-widget__composerAttachWrap">
          <button
            type="button"
            className="chat-widget__composerIconBtn"
            onClick={() => setShowAttachMenu((v) => !v)}
            aria-label="Đính kèm"
          >
            <Paperclip size={18} />
          </button>
        </div>

        <textarea
          className="chat-widget__textarea"
          placeholder="Nhập tin nhắn..."
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="chat-widget__composerAttachWrap">
          <button
            type="button"
            className="chat-widget__composerIconBtn"
            onClick={() => setShowPicker((v) => !v)}
            aria-label="Emoji & nhãn dán"
          >
            <Smile size={18} />
          </button>
        </div>

        <button
          type="button"
          className="chat-widget__sendBtn"
          onClick={handleSendText}
          disabled={sending || (!text.trim() && pendingAttachments.length === 0)}
          aria-label="Gửi"
        >
          {sending ? <Loader2 size={16} className="chat-widget__spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Neo theo chiều rộng khung soạn tin (không theo nút nhỏ) để không tràn ra ngoài box */}
      {showAttachMenu && (
        <div className="chat-widget__popupSpan chat-widget__popupSpan--bottomLeft">
          <AttachMenu
            onClose={() => setShowAttachMenu(false)}
            onPickImage={() => imageInputRef.current?.click()}
            onPickVideo={() => videoInputRef.current?.click()}
            onPickFile={() => fileInputRef.current?.click()}
            onOpenCamera={() => setShowCamera(true)}
          />
        </div>
      )}
      {showPicker && (
        <div className="chat-widget__popupSpan">
          <StickerEmojiPicker
            onSelectEmoji={handleSelectEmoji}
            onSelectSticker={handleSelectSticker}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFileInputChange(e, 'image')} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => handleFileInputChange(e, 'video')} />
      <input ref={fileInputRef} type="file" hidden onChange={(e) => handleFileInputChange(e, 'file')} />

      <ChatCameraModal open={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
    </div>
  );
};

export default ChatComposer;
