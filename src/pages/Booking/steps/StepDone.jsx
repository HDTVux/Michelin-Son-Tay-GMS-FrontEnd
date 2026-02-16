import React, { useMemo } from 'react'
import styles from './StepDone.module.css'
import bookingStyles from '../Booking.module.css'
import { formatTimeHHmm } from '../../../components/timeUtils.js';

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function StepDone({ schedule, info, bookingData, services, selectedIds, onReschedule, onCancel, onHome }) {
  const serviceIds = useMemo(() => {
    const ids = Array.isArray(bookingData?.serviceIds) && bookingData.serviceIds.length > 0
      ? bookingData.serviceIds
      : selectedIds
    return ids.map((id) => String(id)).filter(Boolean)
  }, [bookingData?.serviceIds, selectedIds])

  const selectedServices = useMemo(
    () => services.filter((s) => serviceIds.includes(String(s.id))),
    [services, serviceIds]
  )

  // Dùng mã trả về từ backend (customer: bookingId, guest: requestId/code)
  const bookingCode = bookingData?.bookingId
    ? `${bookingData.bookingId}`
    : bookingData?.requestId
      ? `${bookingData.requestId}`
      : bookingData?.code || ''

  const confirmedDate = bookingData?.scheduledDate || schedule.date
  const confirmedTime = bookingData?.scheduledTime || schedule.time
  const confirmedNote = bookingData?.description || info.note

  return (
    <div className={styles['done-card']}>
      <div className={styles['done-header']}>
        <div className={styles['done-icon']}>✅</div>
        <h2 className={styles['done-title']}>Đặt lịch giữ chỗ thành công!</h2>
        <p className={styles['done-sub']}>Chúng tôi sẽ liên hệ xác nhận lại nếu cần.</p>
      </div>

      <div className={styles['done-section']}>
        <div className={styles['row-icon']}>📋</div>
        <div className={styles['row-content']}>
          <div className={styles['row-title']}>Mã lịch hẹn:</div>
          <div className={`${styles['row-desc']} ${styles['booking-code']}`}>{bookingCode}</div>
        </div>
      </div>

      <hr className={styles['done-sep']} />

      <div className={styles['done-section']}>
        <div className={styles['row-icon']}>👤</div>
        <div className={styles['row-content']}>
          <div className={styles['row-title']}>Thông tin khách hàng:</div>
          <div className={styles['row-desc']}>{info.name || 'Chưa có tên'}</div>
          <div className={`${styles['row-desc']} ${styles['phone-info']}`}>📞 {info.phone || 'Chưa có số điện thoại'}</div>
        </div>
      </div>

      <hr className={styles['done-sep']} />

      <div className={styles['done-section']}>
        <div className={styles['row-icon']}>📅</div>
        <div className={styles['row-content']}>
          <div className={styles['row-title']}>{formatDate(confirmedDate)}</div>
          <div className={styles['row-desc']}>Khung giờ: {formatTimeHHmm(confirmedTime)}</div>
        </div>
      </div>

    { serviceIds.length > 0 &&(
      <>
      <hr className={styles['done-sep']} />

      <div className={styles['done-section']}>
        <div className={styles['row-icon']}>🔧</div>
        <div className={styles['row-content']}>
          <div className={styles['row-title']}>Dịch vụ:</div>
          <ul className={styles['bullet-list']}>
            {selectedServices.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
      </div>
      </>
      )}

      <hr className={styles['done-sep']} />

      {confirmedNote && (
        <>
          <div className={styles['done-section']}>
            <div className={styles['row-icon']}>📝</div>
            <div className={styles['row-content']}>
              <div className={styles['row-title']}>Ghi chú thêm:</div>
              <div className={styles['row-desc']}>{confirmedNote}</div>
            </div>
          </div>

          <hr className={styles['done-sep']} />
        </>
      )}

      <div className={styles['done-section']}>
        <div className={styles['row-icon']}>📍</div>
        <div className={styles['row-content']}>
          <div className={styles['row-title']}>Michelin Sơn Tây – 123 Đường A, Phường B, Quận C, Hà Nội</div>
          <button className={bookingStyles['link-btn']} onClick={() => window.open('https://maps.google.com', '_blank')}>Xem trên bản đồ</button>
        </div>
      </div>

      <div className={styles['done-actions']}>
        <button className={bookingStyles.btn} onClick={onReschedule}>Đổi lịch</button>
        <button className={`${bookingStyles.btn} ${styles.danger}`} onClick={onCancel}>Hủy lịch</button>
        <button className={`${bookingStyles.btn} ${bookingStyles.primary}`} onClick={onHome}>Về trang chủ</button>
      </div>
    </div>
  )
}
