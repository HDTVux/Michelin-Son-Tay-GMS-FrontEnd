import { useMemo } from 'react';
import styles from './BookingRequestDetail.module.css';
import { buildAllSlots } from './scheduleUtils.js';


export default function SchedulePanel({
  dateLabel,        // Ngày đang hiển thị (vd: 2026-02-13)
  pickedTime,       // Khung giờ khách hàng mong muốn
  slotData,         // Dữ liệu khách hàng đã đặt từ Server
  startHour = 7,    // Giờ mở cửa garage
  endHour = 20,     // Giờ đóng cửa garage
  defaultCapacity = 3, // Sức chứa xe tối đa mỗi slot
  title = 'Lịch ngày',
  subtitlePrefix = 'Khung giờ khách chọn:',
}) {
  /**
   * useMemo (dateOptions): Tạo danh sách 10 ngày tới cho ô chọn Select.
   * Để nhân viên có thể nhanh chóng kiểm tra lịch của những ngày lân cận mà không cần tải lại trang.
   */
  const dateOptions = useMemo(() => buildDateOptions(10), []);

  /**
   * useMemo (slots): Xử lý danh sách khung giờ để hiển thị.
   * Kết hợp dữ liệu thô từ API (buildAllSlots) và trạng thái "đang chọn" (selected).
   * Nếu giờ của slot trùng với pickedTime, nó sẽ nổi bật lên để nhân viên dễ đối chiếu.
   */
  const slots = useMemo(() => {
    const built = buildAllSlots({ slotData: slotData || {}, startHour, endHour, defaultCapacity });
    return built.map((slot) => ({
      ...slot,
      // Đánh dấu 'selected' cho giờ mà khách hàng đang yêu cầu trong đơn đặt lịch
      state: slot.time === pickedTime ? 'selected' : slot.state,
    }));
  }, [slotData, startHour, endHour, defaultCapacity, pickedTime]);

  return (
    <aside className={styles.schedulePanel}>
      <div className={styles.scheduleHeader}>
        <div className={styles.scheduleDateRow}>
          <div className={styles.scheduleTitle}>{title} {dateLabel}</div>
          {/* Ô chọn ngày: Cho phép xem lịch của các ngày khác */}
          <select className={styles.scheduleDateSelect} defaultValue={dateLabel}>
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Nhắc lại khung giờ khách đang yêu cầu để nhân viên không bị quên khi cuộn danh sách */}
        <div className={styles.scheduleSub}>{subtitlePrefix} {pickedTime}</div>
      </div>

      <div className={styles.slotList}>
        {slots.map((slot) => (
          /* Mỗi slotItem sẽ có class màu sắc dựa trên state (ok, full, selected) */
          <div key={slot.time} className={`${styles.slotItem} ${styles['slotItem--' + slot.state]}`}>
            <div className={styles.slotTime}>{slot.time}</div>
            
            <div className={styles.slotCustomers}>
              {slot.customers.length === 0 ? (
                <span className={styles.slotEmpty}>Trống</span>
              ) : (
                /* Hiển thị danh sách biển số xe hoặc tên khách đã đặt chỗ này */
                slot.customers.map((c) => <span key={c} className={styles.slotBadge}>{c}</span>)
              )}
            </div>

            <div className={styles.slotMeta}>
              {/* Hiển thị tỉ lệ lấp đầy (vd: 1/3) */}
              <span className={styles.slotQuota}>{slot.quota}</span>
              {/* Nếu là giờ khách chọn, hiển thị thêm nhãn "Muốn đặt" để nhấn mạnh */}
              {slot.state === 'selected' && <span className={styles.slotTag}>Muốn đặt</span>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

/**
 * Hàm buildDateOptions: Tạo mảng các đối tượng ngày.
 * Chuyển đổi đối tượng Date thuần của JS sang định dạng dễ đọc cho người Việt (vd: T6 13/02/2026).
 */
function buildDateOptions(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() + idx);
    const value = d.toISOString().split('T')[0]; // Định dạng YYYY-MM-DD để gửi lên Server
    const label = formatDateLabel(d);           // Định dạng hiển thị cho người dùng
    return { value, label };
  });
}

/**
 * Hàm formatDateLabel: Định dạng ngày theo kiểu Việt Nam.
 * Ví dụ: "T6 13/02/2026"
 */
function formatDateLabel(date) {
  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const wd = weekdays[date.getDay()];
  return `${wd} ${dd}/${mm}/${yyyy}`;
}