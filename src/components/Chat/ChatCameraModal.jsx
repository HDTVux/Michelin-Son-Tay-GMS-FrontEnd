import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Circle, Square, RotateCcw } from 'lucide-react';
import './chatWidget.css';

const VIDEO_ELEMENT_ID = 'chat-camera-video';

/**
 * Modal chụp ảnh / quay video trực tiếp từ camera thiết bị.
 * Tái sử dụng đúng pattern navigator.mediaDevices.getUserMedia + cleanup track
 * đã dùng ở src/components/UniversalScanner/UniversalScannerModal.jsx.
 */
const ChatCameraModal = ({ open, onClose, onCapture }) => {
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [facingMode, setFacingMode] = useState('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    let localStream = null;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: mode === 'video',
        });
        localStream = stream;
        streamRef.current = stream;
        const videoElement = document.getElementById(VIDEO_ELEMENT_ID);
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      } catch {
        toast.error('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
        onClose?.();
      }
    })();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, facingMode]);

  const handleClose = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    }
    onClose?.();
  };

  const capturePhoto = () => {
    const videoElement = document.getElementById(VIDEO_ELEMENT_ID);
    if (!videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `chup-anh-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture?.(file, 'image');
      onClose?.();
    }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `quay-video-${Date.now()}.webm`, { type: 'video/webm' });
      onCapture?.(file, 'video');
      onClose?.();
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordSeconds(0);
    timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  if (!open) return null;

  const formatDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="chat-widget__cameraOverlay" onClick={handleClose}>
      <div className="chat-widget__cameraModal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-widget__cameraHeader">
          <h3>{mode === 'photo' ? 'Chụp ảnh trực tiếp' : 'Quay video trực tiếp'}</h3>
          <button type="button" onClick={handleClose} aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="chat-widget__cameraBody">
          <video id={VIDEO_ELEMENT_ID} autoPlay muted playsInline className="chat-widget__cameraVideo" />
          {isRecording && (
            <div className="chat-widget__recordBadge">
              <span className="chat-widget__recordDot" /> {formatDuration(recordSeconds)}
            </div>
          )}
        </div>

        <div className="chat-widget__cameraTabs">
          <button
            type="button"
            className={mode === 'photo' ? 'is-active' : ''}
            disabled={isRecording}
            onClick={() => setMode('photo')}
          >
            Ảnh
          </button>
          <button
            type="button"
            className={mode === 'video' ? 'is-active' : ''}
            disabled={isRecording}
            onClick={() => setMode('video')}
          >
            Video
          </button>
        </div>

        <div className="chat-widget__cameraActions">
          {mode === 'photo' ? (
            <button type="button" className="chat-widget__captureBtn" onClick={capturePhoto}>
              <Circle size={28} />
            </button>
          ) : isRecording ? (
            <button type="button" className="chat-widget__captureBtn is-recording" onClick={stopRecording}>
              <Square size={22} />
            </button>
          ) : (
            <button type="button" className="chat-widget__captureBtn" onClick={startRecording}>
              <Circle size={28} />
            </button>
          )}
          <button
            type="button"
            className="chat-widget__cameraFlip"
            disabled={isRecording}
            title="Đổi camera trước/sau"
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatCameraModal;
