import { Image, Film, File, Camera } from 'lucide-react';
import './chatWidget.css';

const AttachMenu = ({ onPickImage, onPickVideo, onPickFile, onOpenCamera, onClose }) => (
  <div className="chat-widget__attachMenu" onClick={(e) => e.stopPropagation()}>
    <button type="button" onClick={() => { onPickImage?.(); onClose?.(); }}>
      <Image size={16} /> Ảnh
    </button>
    <button type="button" onClick={() => { onPickVideo?.(); onClose?.(); }}>
      <Film size={16} /> Video
    </button>
    <button type="button" onClick={() => { onPickFile?.(); onClose?.(); }}>
      <File size={16} /> Tệp
    </button>
    <button type="button" onClick={() => { onOpenCamera?.(); onClose?.(); }}>
      <Camera size={16} /> Chụp trực tiếp
    </button>
  </div>
);

export default AttachMenu;
