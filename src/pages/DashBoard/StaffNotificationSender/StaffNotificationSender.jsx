import { useState } from 'react';
import { toast } from 'react-toastify';
import { createStaffNotification } from '../../../services/staffNotificationService.js';
import styles from './StaffNotificationSender.module.css';

const readCurrentStaffId = () => {
  try {
    const raw = localStorage.getItem('staffProfile');
    const profile = raw ? JSON.parse(raw) : null;
    const id = Number(profile?.staffId ?? profile?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

export default function StaffNotificationSender() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('INFO');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) {
      toast.error('Vui lòng nhập tiêu đề thông báo.');
      return;
    }

    if (!cleanMessage) {
      toast.error('Vui lòng nhập nội dung thông báo.');
      return;
    }

    setSending(true);
    try {
      await createStaffNotification({
        staffId: null,
        title: cleanTitle,
        message: cleanMessage,
        notificationType,
        isRead: false,
        sentBy: readCurrentStaffId(),
      });

      toast.success('Đã gửi thông báo chung.');
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(err?.message || 'Không gửi được thông báo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Thông báo nội bộ</p>
          <h1>Thông báo cho nhân viên</h1>
        </div>
      </header>

      <main className={styles.grid}>
        <form className={styles.panel} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <h2>Người nhận</h2>
            <div className={styles.recipientBox}>Tất cả nhân viên</div>
          </section>

          <section className={styles.section}>
            <h2>Nội dung</h2>
            <label>
              Loại thông báo
              <select value={notificationType} onChange={(event) => setNotificationType(event.target.value)}>
                <option value="INFO">Thông tin</option>
                <option value="WARNING">Cảnh báo</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </label>
            <label>
              Tiêu đề
              <input
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Lịch họp đầu ca"
              />
            </label>
            <label>
              Nội dung thông báo
              <textarea
                value={message}
                rows={7}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Nhập nội dung cần gửi đến nhân viên..."
              />
            </label>
          </section>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => {
              setTitle('');
              setMessage('');
              setNotificationType('INFO');
            }}>
              Làm mới
            </button>
            <button type="submit" className={styles.primaryButton} disabled={sending}>
              {sending ? 'Đang gửi...' : 'Gửi thông báo'}
            </button>
          </div>
        </form>

        <aside className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={`${styles.typeBadge} ${styles[notificationType.toLowerCase()]}`}>
              {notificationType}
            </span>
            <span>Thông báo chung</span>
          </div>
          <h2>{title.trim() || 'Tiêu đề thông báo'}</h2>
          <p>{message.trim() || 'Nội dung thông báo sẽ hiển thị ở đây trước khi gửi.'}</p>
        </aside>
      </main>
    </div>
  );
}
