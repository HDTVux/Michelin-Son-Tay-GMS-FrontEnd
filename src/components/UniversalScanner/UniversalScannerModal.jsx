import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import {
  fetchQrAttendanceStatus,
  submitQrCheckIn,
  submitQrCheckOut,
} from '../../services/staffDashboardService.js';
import styles from './UniversalScannerModal.module.css';

const SCAN_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
];

const VIDEO_ELEMENT_ID = 'universal-scanner-video';

const getAuthToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || '';

const tryParseUrl = (text) => {
  try {
    return new URL(text);
  } catch {
    return null;
  }
};

const isAttendanceCheckinUrl = (parsedUrl) =>
  Boolean(parsedUrl)
  && parsedUrl.pathname === '/attendance-checkin'
  && parsedUrl.searchParams.has('token');

export default function UniversalScannerModal({ open, onClose }) {
  const navigate = useNavigate();
  const codeReaderRef = useRef(null);
  const videoTrackRef = useRef(null);
  const [textResult, setTextResult] = useState('');
  const [copied, setCopied] = useState(false);

  // Chấm công QR ngay trong máy quét, không điều hướng rời khỏi modal.
  const [attendanceToken, setAttendanceToken] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null); // { type: 'success' | 'error', text }

  const isScanningPaused = Boolean(textResult) || Boolean(attendanceToken);

  const stopScanning = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {
        // ignore
      }
      codeReaderRef.current = null;
    }
    if (videoTrackRef.current) {
      try {
        videoTrackRef.current.stop();
      } catch {
        // ignore
      }
      videoTrackRef.current = null;
    }
  };

  const resetAttendanceState = () => {
    setAttendanceToken('');
    setAttendanceStatus(null);
    setStatusError('');
    setAttendanceResult(null);
  };

  const handleClose = () => {
    stopScanning();
    setTextResult('');
    setCopied(false);
    resetAttendanceState();
    onClose();
  };

  const loadAttendanceStatus = async (token) => {
    const authToken = getAuthToken();
    if (!authToken) {
      setStatusError('Vui lòng đăng nhập để chấm công.');
      return;
    }
    setLoadingStatus(true);
    setStatusError('');
    setAttendanceResult(null);
    try {
      const response = await fetchQrAttendanceStatus(token, authToken);
      setAttendanceStatus(response?.data || null);
    } catch (err) {
      setAttendanceStatus(null);
      setStatusError(err?.message || 'Mã QR không hợp lệ hoặc vị trí đã bị vô hiệu hóa.');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDecoded = (rawText) => {
    const text = String(rawText || '').trim();
    // codeReaderRef đã null nghĩa là frame trước đó đã xử lý xong -> bỏ qua để tránh xử lý trùng.
    if (!text || !codeReaderRef.current) return;
    stopScanning();

    const parsedUrl = tryParseUrl(text);

    if (isAttendanceCheckinUrl(parsedUrl)) {
      const token = parsedUrl.searchParams.get('token');
      setAttendanceToken(token);
      void loadAttendanceStatus(token);
      return;
    }

    if (parsedUrl && (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
      if (parsedUrl.origin === window.location.origin) {
        const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        handleClose();
        navigate(path);
      } else {
        window.open(text, '_blank', 'noopener,noreferrer');
        handleClose();
      }
      return;
    }

    // Không phải URL -> có thể là mã vạch sản phẩm hoặc văn bản thuần, hiển thị nội dung.
    setTextResult(text);
  };

  useEffect(() => {
    if (!open || isScanningPaused) return undefined;

    let localStream = null;
    const timer = setTimeout(async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, SCAN_FORMATS);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        codeReaderRef.current = codeReader;

        const constraints = {
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream = stream;

        const videoElement = document.getElementById(VIDEO_ELEMENT_ID);
        if (!videoElement) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        videoTrackRef.current = stream.getVideoTracks()[0] || null;

        codeReader.decodeFromStream(stream, videoElement, (result) => {
          if (result) {
            handleDecoded(result.getText());
          }
        }).catch(() => {
          // Lỗi decode từng frame, bỏ qua và tiếp tục quét.
        });
      } catch {
        toast.error('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanning();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isScanningPaused]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không sao chép được nội dung.');
    }
  };

  const handleRescan = () => {
    setTextResult('');
    setCopied(false);
  };

  const requestGeolocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGettingLocation(false);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (err) => {
        setGettingLocation(false);
        if (err?.code === 1) {
          reject(new Error('Bạn cần cho phép quyền truy cập vị trí để chấm công.'));
        } else if (err?.code === 3) {
          reject(new Error('Lấy vị trí quá lâu. Vui lòng thử lại ở nơi có tín hiệu GPS tốt hơn.'));
        } else {
          reject(new Error('Không lấy được vị trí hiện tại. Vui lòng thử lại.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

  const handleAttendanceAction = async (action) => {
    const authToken = getAuthToken();
    if (!authToken || !attendanceToken) return;
    setAttendanceResult(null);
    try {
      const { latitude, longitude } = await requestGeolocation();
      setSubmittingAttendance(true);
      const submit = action === 'checkin' ? submitQrCheckIn : submitQrCheckOut;
      const response = await submit({ qrToken: attendanceToken, latitude, longitude }, authToken);
      setAttendanceResult({
        type: 'success',
        text: response?.message || (action === 'checkin' ? 'Check-in thành công!' : 'Check-out thành công!'),
      });
      await loadAttendanceStatus(attendanceToken);
    } catch (err) {
      setAttendanceResult({ type: 'error', text: err?.message || 'Thao tác thất bại.' });
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const handleAttendanceRescan = () => {
    resetAttendanceState();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Quét mã QR / Barcode</h3>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Đóng">✕</button>
        </div>

        {attendanceToken ? (
          <div className={styles.body}>
            {loadingStatus && (
              <div className={styles.loadingBlock}>
                <div className={styles.spinner} />
                <p>Đang kiểm tra vị trí...</p>
              </div>
            )}

            {!loadingStatus && statusError && (
              <div className={styles.errorBlock}>
                <p>{statusError}</p>
                <button type="button" className={styles.primaryBtn} onClick={handleAttendanceRescan}>Quét lại</button>
              </div>
            )}

            {!loadingStatus && !statusError && attendanceStatus && (
              <div className={styles.attendanceBlock}>
                <p className={styles.locationName}>📍 {attendanceStatus.locationName || 'Vị trí chấm công'}</p>
                {attendanceStatus.address && <p className={styles.locationAddress}>{attendanceStatus.address}</p>}

                {attendanceStatus.alreadyCheckedIn && attendanceStatus.alreadyCheckedOut ? (
                  <p className={styles.doneMessage}>✅ Bạn đã hoàn tất chấm công hôm nay.</p>
                ) : (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={gettingLocation || submittingAttendance}
                    onClick={() => handleAttendanceAction(attendanceStatus.alreadyCheckedIn ? 'checkout' : 'checkin')}
                  >
                    {gettingLocation
                      ? 'Đang lấy vị trí GPS...'
                      : submittingAttendance
                        ? 'Đang xử lý...'
                        : attendanceStatus.alreadyCheckedIn ? 'Check-out ngay' : 'Check-in ngay'}
                  </button>
                )}

                {attendanceResult && (
                  <div className={attendanceResult.type === 'success' ? styles.resultSuccess : styles.resultError}>
                    {attendanceResult.text}
                  </div>
                )}

                <button type="button" className={styles.secondaryBtn} onClick={handleAttendanceRescan}>Quét mã khác</button>
              </div>
            )}
          </div>
        ) : !textResult ? (
          <div className={styles.body}>
            <div className={styles.videoWrapper}>
              <video id={VIDEO_ELEMENT_ID} className={styles.video} muted playsInline />
              <div className={styles.scanFrame} />
            </div>
            <p className={styles.hint}>
              Đưa mã QR chấm công, mã QR liên kết, hoặc mã vạch sản phẩm vào khung hình để quét.
            </p>
          </div>
        ) : (
          <div className={styles.body}>
            <p className={styles.resultLabel}>Nội dung quét được:</p>
            <div className={styles.resultBox}>{textResult}</div>
            <div className={styles.resultActions}>
              <button type="button" className={styles.secondaryBtn} onClick={handleCopy}>
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleRescan}>Quét lại</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
