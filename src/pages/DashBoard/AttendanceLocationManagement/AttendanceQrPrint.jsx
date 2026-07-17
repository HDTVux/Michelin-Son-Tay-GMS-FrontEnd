import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import styles from './AttendanceQrPrint.module.css';

const buildCheckInUrl = (qrToken) => `${window.location.origin}/attendance-checkin?token=${encodeURIComponent(qrToken)}`;

export default function AttendanceQrPrint() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeLocation = location?.state?.location || null;
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!routeLocation?.qrToken || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, buildCheckInUrl(routeLocation.qrToken), {
      width: 420,
      margin: 2,
    }).then(() => {
      globalThis.window?.requestAnimationFrame?.(() => {
        globalThis.window?.print?.();
      });
    }).catch(() => {
      // Nếu sinh QR lỗi, người dùng vẫn thấy trang với thông tin vị trí để thử lại thủ công.
    });
  }, [routeLocation]);

  if (!routeLocation) {
    return (
      <div className={styles.fallback}>
        <p>Không có dữ liệu vị trí để in. Vui lòng quay lại trang quản lý vị trí chấm công và bấm "In" từ đó.</p>
        <button type="button" onClick={() => navigate('/attendance-locations')}>Quay lại</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.storeName}>MICHELIN SƠN TÂY</h1>
        <h2 className={styles.locationName}>{routeLocation.locationName}</h2>
        {routeLocation.address && <p className={styles.address}>{routeLocation.address}</p>}
        <div className={styles.qrWrapper}>
          <canvas ref={canvasRef} />
        </div>
        <p className={styles.instruction}>Quét mã QR bằng camera điện thoại để chấm công vào/ra tại vị trí này.</p>
        <p className={styles.hint}>Ứng dụng sẽ yêu cầu quyền vị trí (GPS) để xác nhận bạn đang có mặt tại đây.</p>
      </div>
    </div>
  );
}
