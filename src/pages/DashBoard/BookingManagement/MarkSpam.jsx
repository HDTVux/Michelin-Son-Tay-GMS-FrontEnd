import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MarkSpam.module.css';

const defaultReasons = [
  'Số điện thoại không hợp lệ',
  'Thông tin trùng lặp',
  'Nội dung spam / quảng cáo',
  'Khác',
];

export default function MarkSpam({ open, onClose, onConfirm, reasons }) {
  const [reason, setReason] = useState(defaultReasons[0]);
  const [detail, setDetail] = useState('');
  const maxLen = 200;

  if (!open) return null;

  const modal = (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="markSpamTitle">
        <h3 id="markSpamTitle" className={styles.title}>Đánh dấu nghi ngờ spam</h3>
        <p className={styles.alert}>Yêu cầu sẽ bị ẩn khỏi danh sách chính</p>

        <label className={styles.label} htmlFor="spamReason">Lý do đánh dấu spam</label>
        <select
          id="spamReason"
          className={styles.select}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {(reasons || defaultReasons).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <textarea
          className={styles.textarea}
          placeholder="Nhập lý do chi tiết..."
          value={detail}
          maxLength={maxLen}
          onChange={(e) => setDetail(e.target.value)}
        />

        <div className={styles.footer}>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => onClose?.()}>Hủy</button>
          <button
            type="button"
            className={`${styles.btn} ${styles.primary}`}
            onClick={() => onConfirm?.({ reason, detail: detail.trim() })}
          >
            Xác nhận đánh dấu spam
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
