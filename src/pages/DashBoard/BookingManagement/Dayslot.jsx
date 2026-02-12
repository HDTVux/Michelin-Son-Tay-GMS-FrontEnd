import { createPortal } from 'react-dom';
import styles from './Dayslot.module.css';

export default function Dayslot({ slot, onClose }) {
  if (!slot) return null;

  const statusLabel = slot.state === 'full' ? 'Đã đầy' : slot.state === 'over' ? 'Quá tải' : 'Trống';
  const isFull = slot.state === 'full' || slot.state === 'over';

  return createPortal(
    <div className={styles['dayslot-backdrop']} role="dialog" aria-modal="true">
      <div className={styles['dayslot-modal']}>
        <div className={styles['dayslot-header']}>
          <div className={styles['dayslot-title']}>
            <span>Thời gian: {slot.time}</span>
            <div className={styles['dayslot-badges']}>
              <span className={`${styles['dayslot-badge']} ${styles['dayslot-badge--count']}`}>Số lượng: {slot.quota}</span>
              <span className={`${styles['dayslot-badge']} ${isFull ? styles['dayslot-badge--danger'] : styles['dayslot-badge--status']}`}>{statusLabel}</span>
            </div>
          </div>
          <button type="button" className={styles['dayslot-close']} onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className={styles['dayslot-body']}>
          {isFull && (
            <div className={styles['dayslot-alert']}>
              <span>⚠️</span>
              <span>Cảnh báo: Slot này đã đầy ({slot.quota}).</span>
            </div>
          )}

          <p className={styles['dayslot-listTitle']}>Danh sách lịch hẹn đã duyệt:</p>

          {slot.approved && slot.approved.length > 0 ? (
            slot.approved.map((item) => (
              <article key={item.id} className={styles['dayslot-card']}>
                <div className={styles['dayslot-cardHeader']}>
                  <a className={styles['dayslot-code']} href="#">Mã yêu cầu: {item.id}</a>
                  <span className={styles['dayslot-pill']}>{item.status}</span>
                </div>

                <div className={styles['dayslot-grid']}>
                  <div className={styles['dayslot-field']}>
                    <span className={styles['dayslot-fieldLabel']}>Tên khách hàng</span>
                    <span className={styles['dayslot-fieldValue']}>{item.name}</span>
                  </div>
                  <div className={styles['dayslot-field']}>
                    <span className={styles['dayslot-fieldLabel']}>Số điện thoại</span>
                    <span className={styles['dayslot-fieldValue']}>{item.phone}</span>
                  </div>
                  <div className={styles['dayslot-field']}>
                    <span className={styles['dayslot-fieldLabel']}>Dịch vụ</span>
                    <span className={styles['dayslot-fieldValue']}>{item.service}</span>
                  </div>
                  <div className={styles['dayslot-field']}>
                    <span className={styles['dayslot-fieldLabel']}>Ghi chú</span>
                    <span className={`${styles['dayslot-fieldValue']} ${styles['dayslot-fieldValue--muted']}`}>{item.note || 'Không có ghi chú'}</span>
                  </div>
                </div>

                <div className={styles['dayslot-actions']}>
                  <button type="button" className={`${styles['dayslot-btn']} ${styles['dayslot-btn--primary']}`}>Xem chi tiết</button>
                  <button type="button" className={`${styles['dayslot-btn']} ${styles['dayslot-btn--ghost']}`}>Gọi điện</button>
                  <button type="button" className={`${styles['dayslot-btn']} ${styles['dayslot-btn--danger']}`}>Hủy lịch</button>
                </div>
              </article>
            ))
          ) : (
            <div className={styles['dayslot-alert']} style={{ background: '#f6fff9', borderColor: '#c9ead8', color: '#0f8346' }}>
              <span>ℹ️</span>
              <span>Chưa có lịch hẹn nào trong khung giờ này.</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
