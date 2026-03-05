import React from 'react'
import PropTypes from 'prop-types'
import styles from './StepInfo.module.css'
import bookingStyles from '../Booking.module.css'

export default function StepInfo({
  value,
  onChange,
  onBack,
  onSubmit,
  loading = false,
  error = '',
  isAuthed = false,
  showActions = true,
  submitLabel = 'Hoàn tất',
}) {
  const handleChange = (key) => (e) => {
    let nextValue = e.target.value

    if (key === 'note') {
      nextValue = String(nextValue)
        .replaceAll(/[<>{}]/g, '')
        .slice(0, 500)
    }

    onChange({ [key]: nextValue })
  }
  const canSubmit =
    value.name.trim() &&
    value.phone.trim() &&
    !loading

  return (
    <>
      <h3 className={bookingStyles['section-title']}>Thông tin cá nhân</h3>
      <p className={styles['info-note']}>Vui lòng nhập thông tin để tiếp tục.</p>

      <div className={styles['info-card']}>
        <div className={styles.field}>
          <label htmlFor="booking-fullname">Họ và tên</label>
          <input
            id="booking-fullname"
            type="text"
            placeholder="Nhập họ và tên của bạn"
            value={value.name}
            onChange={handleChange('name')}
            required
            disabled={isAuthed}
            readOnly={isAuthed}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="booking-phone">Số điện thoại</label>
          <div className={styles['inline-input']}>
            <input
              id="booking-phone"
              type="tel"
              placeholder="Nhập số điện thoại"
              value={value.phone}
              onChange={handleChange('phone')}
              required
              disabled={isAuthed}
              readOnly={isAuthed}
            />
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles['section-block']}>
        <div className={styles['section-title-row']}>
          <h4 className={bookingStyles['section-title']}>
            Yêu cầu đặc biệt (không bắt buộc)
          </h4>
        </div>
        <div className={styles.field}>
          <label htmlFor="booking-note" className={styles.srOnly}>Ghi chú</label>
          <textarea
            id="booking-note"
            rows="6"
            placeholder="VD: Kiểm tra thêm tiếng kêu ở bánh trước, cần lấy xe trước 17h, ..."
            value={value.note}
            onChange={handleChange('note')}
            maxLength={500}
          />
        </div>
      </div>

      {showActions && (
        <div className={bookingStyles['booking-actions']}>
          <button className={bookingStyles.btn} onClick={onBack}>Quay lại</button>
          <button
            className={`${bookingStyles.btn} ${bookingStyles.primary}`}
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-busy={loading}
          >
            {loading ? 'Đang xử lý...' : submitLabel}
          </button>
        </div>
      )}
    </>
  )
}

StepInfo.propTypes = {
  value: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    note: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  onSubmit: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  isAuthed: PropTypes.bool,
  showActions: PropTypes.bool,
  submitLabel: PropTypes.string,
}
