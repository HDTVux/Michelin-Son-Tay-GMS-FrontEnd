import { createPortal } from 'react-dom';
import './Dayslot.css';

export default function Dayslot({ slot, onClose }) {
  if (!slot) return null;

  const statusLabel = slot.state === 'full' ? 'Đã đầy' : slot.state === 'over' ? 'Quá tải' : 'Trống';
  const isFull = slot.state === 'full' || slot.state === 'over';

  return createPortal(
    <div className="dayslot-backdrop" role="dialog" aria-modal="true">
      <div className="dayslot-modal">
        <div className="dayslot-header">
          <div className="dayslot-title">
            <span>Thời gian: {slot.time}</span>
            <div className="dayslot-badges">
              <span className="dayslot-badge dayslot-badge--count">Số lượng: {slot.quota}</span>
              <span className={`dayslot-badge ${isFull ? 'dayslot-badge--danger' : 'dayslot-badge--status'}`}>{statusLabel}</span>
            </div>
          </div>
          <button type="button" className="dayslot-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="dayslot-body">
          {isFull && (
            <div className="dayslot-alert">
              <span>⚠️</span>
              <span>Cảnh báo: Slot này đã đầy ({slot.quota}).</span>
            </div>
          )}

          <p className="dayslot-listTitle">Danh sách lịch hẹn đã duyệt:</p>

          {slot.approved && slot.approved.length > 0 ? (
            slot.approved.map((item) => (
              <article key={item.id} className="dayslot-card">
                <div className="dayslot-cardHeader">
                  <a className="dayslot-code" href="#">Mã yêu cầu: {item.id}</a>
                  <span className="dayslot-pill">{item.status}</span>
                </div>

                <div className="dayslot-grid">
                  <div className="dayslot-field">
                    <span className="dayslot-fieldLabel">Tên khách hàng</span>
                    <span className="dayslot-fieldValue">{item.name}</span>
                  </div>
                  <div className="dayslot-field">
                    <span className="dayslot-fieldLabel">Số điện thoại</span>
                    <span className="dayslot-fieldValue">{item.phone}</span>
                  </div>
                  <div className="dayslot-field">
                    <span className="dayslot-fieldLabel">Dịch vụ</span>
                    <span className="dayslot-fieldValue">{item.service}</span>
                  </div>
                  <div className="dayslot-field">
                    <span className="dayslot-fieldLabel">Ghi chú</span>
                    <span className="dayslot-fieldValue dayslot-fieldValue--muted">{item.note || 'Không có ghi chú'}</span>
                  </div>
                </div>

                <div className="dayslot-actions">
                  <button type="button" className="dayslot-btn dayslot-btn--primary">Xem chi tiết</button>
                  <button type="button" className="dayslot-btn dayslot-btn--ghost">Gọi điện</button>
                  <button type="button" className="dayslot-btn dayslot-btn--danger">Hủy lịch</button>
                </div>
              </article>
            ))
          ) : (
            <div className="dayslot-alert" style={{ background: '#f6fff9', borderColor: '#c9ead8', color: '#0f8346' }}>
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
