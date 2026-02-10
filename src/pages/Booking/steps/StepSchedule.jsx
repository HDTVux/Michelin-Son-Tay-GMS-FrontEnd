import React from 'react';
import styles from './StepSchedule.module.css';
import bookingStyles from '../Booking.module.css';

const SLOT_GROUPS = [
  {
    label: 'Sáng',
    items: [
    { time: '06:00', available: true },
      { time: '07:00', available: true },
      { time: '08:00', available: true },
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '12:00', available: true }
    ]
  },
  {
    label: 'Chiều',
    items: [
      { time: '13:00', available: true },
      { time: '14:00', available: false },
      { time: '15:00', available: true },
      { time: '16:00', available: true },
      { time: '17:00', available: true }
    ]
  },
  {
    label: 'Tối',
    items: [
      { time: '18:00', available: true },
      { time: '19:00', available: true },
      { time: '20:00', available: false },
      { time: '21:00', available: true },
      { time: '22:00', available: true },
      { time: '23:00', available: true },
      { time: '24:00', available: true }
    ]
  }
];

const DATE_RANGE_DAYS = 10;

const buildDateOptions = () => {
  const today = new Date();
  const options = [];
  for (let i = 0; i < DATE_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    options.push({ value, label });
  }
  return options;
};

export default function StepSchedule({ value, onChange, onBack, onNext }) {
  const canNext = value.date && value.time;
  const dateOptions = buildDateOptions();

  const handleDate = (e) => onChange({ date: e.target.value });
  const handleTime = (time, available) => {
    if (!available) return;
    onChange({ time });
  };

  return (
    <>
    <h3 className={bookingStyles['section-title']}>Chọn ngày & giờ</h3>
    <div className={styles['schedule-step']}>
      <div className={styles.field}>
        <label className={styles['slot-title']}>Chọn ngày đặt lịch</label>
        <div className={styles['date-input']}>
          <span className={styles['date-icon']}>📅</span>
          <select value={value.date} onChange={handleDate}>
            <option value="">Chọn ngày</option>
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles['slot-section']}>
        <div className={styles['slot-title']}>Chọn khung giờ</div>
        <div className={styles['slot-sub']}>Khung giờ phục vụ từ 06h đến 24h. Chọn theo buổi Sáng / Chiều / Tối.</div>

        {SLOT_GROUPS.map((group) => (
          <div key={group.label} className={styles['slot-group']}>
            <div className={styles['slot-group-label']}>{group.label}</div>
            <div className={styles['slot-grid']}>
              {group.items.map((item) => {
                const active = value.time === item.time;
                return (
                  <button
                    key={item.time}
                    type="button"
                    className={[styles['slot-btn'], active ? styles.active : '', !item.available ? styles.disabled : ''].filter(Boolean).join(' ')}
                    onClick={() => handleTime(item.time, item.available)}
                    disabled={!item.available}
                  >
                    <div className={styles['slot-time']}>{item.time}</div>
                    <div className={styles['slot-status']}>{item.available ? 'Còn trống' : 'Đã đầy'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={bookingStyles['booking-actions']}>
        <button className={bookingStyles.btn} onClick={onBack}>Quay lại</button>
        <button className={`${bookingStyles.btn} ${bookingStyles.primary}`} onClick={onNext} disabled={!canNext}>
          Tiếp tục
        </button>
      </div>
    </div>
    </>
  );
}
