import React from 'react';
import './StepSchedule.css';

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

export default function StepSchedule({ value, onChange, onBack, onNext }) {
  const canNext = value.date && value.time;

  const handleDate = (e) => onChange({ date: e.target.value });
  const handleTime = (time, available) => {
    if (!available) return;
    onChange({ time });
  };

  return (
    <>
    <h3 className="section-title">Chọn ngày & giờ</h3>
    <div className="schedule-step">
      <div className="field">
        <label className="slot-title">Chọn ngày đặt lịch</label>
        <div className="date-input">
          <span className="date-icon">📅</span>
          <input type="date" value={value.date} onChange={handleDate} />
        </div>
      </div>

      <div className="slot-section">
        <div className="slot-title">Chọn khung giờ</div>
        <div className="slot-sub">Khung giờ phục vụ từ 06h đến 24h. Chọn theo buổi Sáng / Chiều / Tối.</div>

        {SLOT_GROUPS.map((group) => (
          <div key={group.label} className="slot-group">
            <div className="slot-group-label">{group.label}</div>
            <div className="slot-grid">
              {group.items.map((item) => {
                const active = value.time === item.time;
                return (
                  <button
                    key={item.time}
                    type="button"
                    className={`slot-btn ${active ? 'active' : ''} ${!item.available ? 'disabled' : ''}`}
                    onClick={() => handleTime(item.time, item.available)}
                    disabled={!item.available}
                  >
                    <div className="slot-time">{item.time}</div>
                    <div className="slot-status">{item.available ? 'Còn trống' : 'Đã đầy'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="booking-actions">
        <button className="btn" onClick={onBack}>Quay lại</button>
        <button className="btn primary" onClick={onNext} disabled={!canNext}>
          Tiếp tục
        </button>
      </div>
    </div>
    </>
  );
}
