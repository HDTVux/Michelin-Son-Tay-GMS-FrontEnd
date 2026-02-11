import React from 'react'
import styles from './StepInfo.module.css'
import bookingStyles from '../Booking.module.css'

export default function StepInfo({ value, onChange, onBack, onSubmit }) {
  const handleChange = (key) => (e) => onChange({ [key]: e.target.value })
  const canSubmit =
    value.name.trim() &&
    value.phone.trim()

  return (
    <>
      <h3 className={bookingStyles['section-title']}>Thông tin cá nhân</h3>
      <p className={styles['info-note']}>Vui lòng nhập thông tin để tiếp tục.</p>

      <div className={styles['info-card']}>
        <div className={styles.field}>
          <label>Họ và tên</label>
          <input
            type="text"
            placeholder="Nhập họ và tên của bạn"
            value={value.name}
            onChange={handleChange('name')}
          />
        </div>

        <div className={styles.field}>
          <label>Số điện thoại</label>
          <div className={styles['inline-input']}>
            <input
              type="tel"
              placeholder="Nhập số điện thoại"
              value={value.phone}
              onChange={handleChange('phone')}
            />
            <button type="button" className={bookingStyles['link-btn']}>Thay đổi</button>
          </div>
        </div>
      </div>

      <div className={styles['section-block']}>
        <div className={styles['section-title-row']}>
          <h4 className={bookingStyles['section-title']}>
            Yêu cầu đặc biệt (không bắt buộc)
          </h4>
        </div>
        <div className={styles.field}>
          <textarea
            rows="6"
            placeholder="VD: Kiểm tra thêm tiếng kêu ở bánh trước, cần lấy xe trước 17h, ..."
            value={value.note}
            onChange={handleChange('note')}
          />
        </div>
      </div>

      <div className={bookingStyles['booking-actions']}>
        <button className={bookingStyles.btn} onClick={onBack}>Quay lại</button>
        <button className={`${bookingStyles.btn} ${bookingStyles.primary}`} onClick={onSubmit} disabled={!canSubmit}>
          Hoàn tất
        </button>
      </div>
    </>
  )
}
