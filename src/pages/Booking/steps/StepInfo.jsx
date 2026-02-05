import React from 'react'
import './StepInfo.css'

export default function StepInfo({ value, onChange, onBack, onSubmit }) {
  const handleChange = (key) => (e) => onChange({ [key]: e.target.value })
  const canSubmit =
    value.name.trim() &&
    value.phone.trim()

  return (
    <>
      <h3 className="section-title">Thông tin cá nhân</h3>
      <p className="info-note">Vui lòng nhập thông tin để tiếp tục.</p>

      <div className="info-card">
        <div className="field">
          <label>Họ và tên</label>
          <input
            type="text"
            placeholder="Nhập họ và tên của bạn"
            value={value.name}
            onChange={handleChange('name')}
          />
        </div>

        <div className="field">
          <label>Số điện thoại</label>
          <div className="inline-input">
            <input
              type="tel"
              placeholder="Nhập số điện thoại"
              value={value.phone}
              onChange={handleChange('phone')}
            />
            <button type="button" className="link-btn">Thay đổi</button>
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-title-row">
          <h4 className="section-title">
            Yêu cầu đặc biệt (không bắt buộc)
          </h4>
        </div>
        <div className="field">
          <textarea
            rows="6"
            placeholder="VD: Kiểm tra thêm tiếng kêu ở bánh trước, cần lấy xe trước 17h, ..."
            value={value.note}
            onChange={handleChange('note')}
          />
        </div>
      </div>

      <div className="booking-actions">
        <button className="btn" onClick={onBack}>Quay lại</button>
        <button className="btn primary" onClick={onSubmit} disabled={!canSubmit}>
          Hoàn tất
        </button>
      </div>
    </>
  )
}
