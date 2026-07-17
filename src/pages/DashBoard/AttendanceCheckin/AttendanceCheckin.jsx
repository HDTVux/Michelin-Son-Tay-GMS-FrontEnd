import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import {
  fetchQrAttendanceStatus,
  submitQrCheckIn,
  submitQrCheckOut,
} from '../../../services/staffDashboardService.js';
import styles from './AttendanceCheckin.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || '';

const extractTokenFromScannedText = (text) => {
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('token');
    if (fromQuery) return fromQuery;
  } catch {
    // Không phải URL hợp lệ -> coi cả chuỗi quét được là token thô.
  }
  return String(text || '').trim();
};

const VIDEO_ELEMENT_ID = 'attendance-qr-scanner-video';

export default function AttendanceCheckin() {
  const [searchParams] = useSearchParams();

  const [qrToken, setQrToken] = useState(searchParams.get('token') || '');
  const [scanning, setScanning] = useState(false);
  const codeReaderRef = useRef(null);
  const videoTrackRef = useRef(null);

  const [statusInfo, setStatusInfo] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', text }

  const stopScanning = useCallback(() => {
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
    setScanning(false);
  }, []);

  const loadStatus = useCallback(async (token) => {
    const authToken = getAuthToken();
    if (!authToken) {
      setStatusError('Vui lòng đăng nhập để chấm công.');
      return;
    }
    setLoadingStatus(true);
    setStatusError('');
    setResult(null);
    try {
      const response = await fetchQrAttendanceStatus(token, authToken);
      setStatusInfo(response?.data || null);
    } catch (err) {
      setStatusInfo(null);
      setStatusError(err?.message || 'Mã QR không hợp lệ hoặc vị trí đã bị vô hiệu hóa.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (qrToken) {
      void loadStatus(qrToken);
    }
  }, [qrToken, loadStatus]);

  useEffect(() => {
    if (!scanning) return undefined;

    let localStream = null;
    const timer = setTimeout(async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
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
          setScanning(false);
          return;
        }

        videoTrackRef.current = stream.getVideoTracks()[0] || null;

        codeReader.decodeFromStream(stream, videoElement, (decodeResult) => {
          if (decodeResult) {
            const decodedText = decodeResult.getText();
            const token = extractTokenFromScannedText(decodedText);
            if (token) {
              setQrToken(token);
              stopScanning();
            }
          }
        }).catch(() => {
          // Lỗi decode từng frame, bỏ qua và tiếp tục quét.
        });
      } catch {
        toast.error('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
        setScanning(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scanning, stopScanning]);

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

  const handleAction = async (action) => {
    const authToken = getAuthToken();
    if (!authToken || !qrToken) return;
    setResult(null);
    try {
      const { latitude, longitude } = await requestGeolocation();
      setSubmitting(true);
      const submit = action === 'checkin' ? submitQrCheckIn : submitQrCheckOut;
      const response = await submit({ qrToken, latitude, longitude }, authToken);
      setResult({
        type: 'success',
        text: response?.message || (action === 'checkin' ? 'Check-in thành công!' : 'Check-out thành công!'),
      });
      await loadStatus(qrToken);
    } catch (err) {
      setResult({ type: 'error', text: err?.message || 'Thao tác thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRescan = () => {
    setQrToken('');
    setStatusInfo(null);
    setStatusError('');
    setResult(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Chấm công QR</h1>
        <p className={styles.subtitle}>Quét mã QR dán tại vị trí làm việc và chia sẻ vị trí (GPS) để chấm công.</p>

        {!qrToken && (
          <div className={styles.scanSection}>
            {!scanning ? (
              <button type="button" className={styles.scanBtn} onClick={() => setScanning(true)}>
                📷 Quét mã QR
              </button>
            ) : (
              <div className={styles.videoWrapper}>
                <video id={VIDEO_ELEMENT_ID} className={styles.video} muted playsInline />
                <button type="button" className={styles.cancelScanBtn} onClick={stopScanning}>Hủy quét</button>
              </div>
            )}
          </div>
        )}

        {qrToken && loadingStatus && (
          <div className={styles.loadingBlock}>
            <div className={styles.spinner} />
            <p>Đang kiểm tra vị trí...</p>
          </div>
        )}

        {qrToken && !loadingStatus && statusError && (
          <div className={styles.errorBlock}>
            <p>{statusError}</p>
            <button type="button" className={styles.secondaryBtn} onClick={handleRescan}>Quét lại</button>
          </div>
        )}

        {qrToken && !loadingStatus && !statusError && statusInfo && (
          <div className={styles.statusBlock}>
            <p className={styles.locationName}>📍 {statusInfo.locationName || 'Vị trí chấm công'}</p>
            {statusInfo.address && <p className={styles.locationAddress}>{statusInfo.address}</p>}

            {statusInfo.alreadyCheckedIn && statusInfo.alreadyCheckedOut ? (
              <p className={styles.doneMessage}>✅ Bạn đã hoàn tất chấm công hôm nay.</p>
            ) : (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={gettingLocation || submitting}
                onClick={() => handleAction(statusInfo.alreadyCheckedIn ? 'checkout' : 'checkin')}
              >
                {gettingLocation ? 'Đang lấy vị trí GPS...' : submitting ? 'Đang xử lý...' : statusInfo.alreadyCheckedIn ? 'Check-out ngay' : 'Check-in ngay'}
              </button>
            )}

            <button type="button" className={styles.secondaryBtn} onClick={handleRescan}>Quét mã khác</button>
          </div>
        )}

        {result && (
          <div className={result.type === 'success' ? styles.resultSuccess : styles.resultError}>
            {result.text}
          </div>
        )}
      </div>
    </div>
  );
}
