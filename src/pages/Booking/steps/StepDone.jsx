import React, { useMemo } from 'react'
import './StepDone.css'

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function StepDone({ schedule, info, services, selectedIds, onReschedule, onCancel, onHome }) {
  const selectedServices = useMemo(
    () => services.filter((s) => selectedIds.includes(s.id)),
    [services, selectedIds]
  )

  return (
    <div className="done-card">
      <div className="done-header">
        <div className="done-icon">✅</div>
        <h2 className="done-title">Đặt lịch giữ chỗ thành công!</h2>
        <p className="done-sub">Chúng tôi sẽ liên hệ xác nhận lại nếu cần.</p>
      </div>

      <div className="done-section">
        <div className="row-icon">📅</div>
        <div className="row-content">
          <div className="row-title">{formatDate(schedule.date)}</div>
          <div className="row-desc">Khung giờ: {schedule.time || '--:--'} (Buổi Sáng)</div>
        </div>
      </div>

      <hr className="done-sep" />

      <div className="done-section">
        <div className="row-icon">🔧</div>
        <div className="row-content">
          <div className="row-title">Dịch vụ:</div>
          <ul className="bullet-list">
            {selectedServices.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <hr className="done-sep" />

      <div className="done-section">
        <div className="row-icon">📍</div>
        <div className="row-content">
          <div className="row-title">Michelin Sơn Tây – 123 Đường A, Phường B, Quận C, Hà Nội</div>
          <button className="link-btn" onClick={() => window.open('https://maps.google.com', '_blank')}>Xem trên bản đồ</button>
        </div>
      </div>

      <div className="done-actions">
        <button className="btn" onClick={onReschedule}>Đổi lịch</button>
        <button className="btn danger" onClick={onCancel}>Hủy lịch</button>
        <button className="btn primary" onClick={onHome}>Về trang chủ</button>
      </div>
    </div>
  )
}
