import { useState } from 'react';
import { Download, FileText, Check, CheckCheck } from 'lucide-react';
import './chatWidget.css';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatusIcon = ({ status }) => {
  if (status === 'read') return <CheckCheck size={13} className="chat-widget__status is-read" />;
  if (status === 'delivered') return <CheckCheck size={13} className="chat-widget__status" />;
  return <Check size={13} className="chat-widget__status" />;
};

const AttachmentGrid = ({ attachments, onPreview }) => {
  const images = attachments.filter((a) => a.kind === 'image');
  const videos = attachments.filter((a) => a.kind === 'video');
  const files = attachments.filter((a) => a.kind === 'file');

  return (
    <div className="chat-widget__attachments">
      {images.length > 0 && (
        <div className={`chat-widget__imageGrid count-${Math.min(images.length, 4)}`}>
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img.url}
              alt={img.name || 'Ảnh đính kèm'}
              onClick={() => onPreview?.(img)}
            />
          ))}
        </div>
      )}
      {videos.map((video, idx) => (
        <video key={idx} src={video.url} controls className="chat-widget__video" />
      ))}
      {files.map((file, idx) => (
        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="chat-widget__fileCard">
          <FileText size={20} />
          <div className="chat-widget__fileCardInfo">
            <span className="chat-widget__fileCardName">{file.name || 'Tệp đính kèm'}</span>
            <span className="chat-widget__fileCardSize">{formatSize(file.size)}</span>
          </div>
          <Download size={16} />
        </a>
      ))}
    </div>
  );
};

const MessageBubble = ({ message, isOwn, showSenderName }) => {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  return (
    <div className={`chat-widget__bubbleRow ${isOwn ? 'is-own' : ''}`}>
      <div className="chat-widget__bubbleCol">
        {showSenderName && !isOwn && (
          <span className="chat-widget__senderName">{message.senderName}</span>
        )}

        <div className={`chat-widget__bubble type-${message.type}`}>
          {message.type === 'sticker' ? (
            <img className="chat-widget__stickerImg" src={message.stickerUrl} alt="sticker" />
          ) : (
            <>
              {message.text && <p className="chat-widget__bubbleText">{message.text}</p>}
              {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                <AttachmentGrid attachments={message.attachments} onPreview={(img) => setLightboxSrc(img.url)} />
              )}
            </>
          )}
        </div>

        <div className={`chat-widget__meta ${isOwn ? 'is-own' : ''}`}>
          <time>{formatTime(message.createdAt)}</time>
          {isOwn && <StatusIcon status={message.status} />}
        </div>
      </div>

      {lightboxSrc && (
        <div className="chat-widget__lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="preview" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
