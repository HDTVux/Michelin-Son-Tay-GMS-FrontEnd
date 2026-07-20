import { toast } from 'react-toastify';
import { BellRing, BellOff, Share, Ban } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import styles from './PushNotificationToggle.module.css';

/**
 * Nút bật/tắt thông báo đẩy (Web Push) cho thiết bị hiện tại.
 * Dùng trong dropdown hồ sơ ở StaffHeader.
 */
const PushNotificationToggle = ({ enabled = true }) => {
  const {
    isSupported,
    hasVapidKey,
    needsInstall,
    permission,
    isSubscribed,
    busy,
    enable,
    disable,
  } = usePushNotifications({ enabled });

  if (!isSupported || !hasVapidKey) return null;

  // iOS chưa cài PWA: hướng dẫn Add to Home Screen.
  if (needsInstall) {
    return (
      <div className={`${styles.hint} ${styles.info}`}>
        <Share size={16} className={styles.hintIcon} />
        <span>
          <strong>Chia sẻ</strong> → <strong>Thêm vào MH chính</strong> để bật thông báo.
        </span>
      </div>
    );
  }

  // Người dùng đã chặn quyền: không thể prompt lại bằng JS.
  if (permission === 'denied') {
    return (
      <div className={`${styles.hint} ${styles.warn}`}>
        <Ban size={16} className={styles.hintIcon} />
        <span>
          Thông báo đang bị chặn. Bật lại trong cài đặt trình duyệt.
        </span>
      </div>
    );
  }

  const handleClick = async (event) => {
    event.stopPropagation();
    if (busy) return;

    if (isSubscribed) {
      const ok = await disable();
      if (ok) {
        toast.info('Đã tắt thông báo đẩy trên thiết bị này.', { containerId: 'app-toast' });
      }
      return;
    }

    const ok = await enable();
    if (ok) {
      toast.success('Đã bật thông báo đẩy. Bạn sẽ nhận thông báo cả khi tắt web.', {
        containerId: 'app-toast',
      });
    }
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isSubscribed ? styles.on : ''}`}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={isSubscribed}
    >
      <span className={styles.toggleIcon}>
        {isSubscribed ? <BellRing size={18} /> : <BellOff size={18} />}
      </span>
      <span className={styles.toggleLabel}>
        {busy
          ? 'Đang xử lý...'
          : isSubscribed
            ? 'Tắt thông báo trên thiết bị này'
            : 'Bật thông báo trên thiết bị này'}
      </span>
      <span className={`${styles.dot} ${isSubscribed ? styles.dotOn : ''}`} />
    </button>
  );
};

export default PushNotificationToggle;
