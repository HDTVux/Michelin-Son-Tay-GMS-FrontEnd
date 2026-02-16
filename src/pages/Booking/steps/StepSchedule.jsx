import React, { useEffect, useMemo, useState } from 'react';
import styles from './StepSchedule.module.css';
import bookingStyles from '../Booking.module.css';
import { fetchAvailableSlots } from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';

// --- CẤU HÌNH HẰNG SỐ ---
const DATE_RANGE_DAYS = 10;       // Cho phép đặt lịch trong vòng 10 ngày tới
const START_HOUR = 7;             // Giờ bắt đầu làm việc (7h sáng)
const END_HOUR = 19;              // Giờ kết thúc (19h tối)
const SLOT_INTERVAL_MINUTES = 30; // Khoảng cách giữa các khung giờ (30 phút)
const DURATION_MINUTES = 60;      // Thời lượng dự kiến của một dịch vụ (60 phút)

/**
 * Hàm tạo danh sách 10 ngày tới để người dùng chọn
 */
const buildDateOptions = () => {
  const today = new Date();
  const options = [];
  for (let i = 0; i < DATE_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10); // Định dạng YYYY-MM-DD để gửi API
    const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }); // Hiển thị: Thứ... dd/mm
    options.push({ value, label });
  }
  return options;
};

/**
 * Hàm tạo danh sách tất cả khung giờ trong một ngày
 */
const buildTimeSlots = () => {
  const slots = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const hh = hour.toString().padStart(2, '0');
      const mm = minute.toString().padStart(2, '0');
      slots.push(`${hh}:${mm}:00`); // Định dạng HH:mm:ss
    }
  }
  return slots;
};

/**
 * Hàm phân loại khung giờ theo buổi trong ngày
 */
const getPeriod = (timeStr) => {
  const [hh] = timeStr.split(':');
  const h = Number(hh);
  if (h < 12) return 'Sáng';
  if (h < 18) return 'Chiều';
  return 'Tối';
};

export default function StepSchedule({ value, onChange, onBack, onNext, token, isAuthed }) {
  const [availableSlots, setAvailableSlots] = useState([]); // Lưu khung giờ lấy từ API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Điều kiện để nhấn nút "Tiếp tục"
  const canNext = value.date && value.time;

  // Ghi nhớ danh sách ngày và khung giờ để không phải tính toán lại mỗi lần render
  const dateOptions = useMemo(buildDateOptions, []);
  const timeSlots = useMemo(buildTimeSlots, []);

  /**
   * 1. Nếu đã đăng nhập: Dùng dữ liệu từ API (có trạng thái trống/đầy).
   * 2. Nếu chưa đăng nhập: Hiển thị tất cả khung giờ như mặc định (không check trống).
   */
  const displaySlots = useMemo(() => {
    if (isAuthed && availableSlots.length > 0) return availableSlots;
    return timeSlots.map((t) => ({ 
      startTime: t, 
      isAvailable: true, 
      remainingCapacity: null, 
      period: getPeriod(t) 
    }));
  }, [isAuthed, availableSlots, timeSlots]);

  // Xử lý khi người dùng chọn ngày
  const handleDate = (e) => {
    const date = e.target.value;
    onChange({ date, time: '' }); // Reset lại giờ khi đổi ngày
  };

  // Xử lý khi chọn giờ
  const handleTime = (time) => onChange({ time });

  /**
   * SIDE EFFECT: Gọi API lấy khung giờ trống khi người dùng chọn ngày
   * (Chỉ thực hiện cho khách hàng đã đăng nhập)
   */
  useEffect(() => {
    let active = true; // Biến cờ để tránh cập nhật state khi component đã unmount

    if (!isAuthed || !token || !value.date) {
      setAvailableSlots([]);
      setError('');
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError('');

    fetchAvailableSlots(value.date, token, DURATION_MINUTES)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data?.slots) ? res.data.slots : [];
        setAvailableSlots(list);

        // Kiểm tra nếu giờ đang chọn hiện tại đột ngột bị đầy (do người khác đặt hoặc API cập nhật)
        if (value.time && list.length > 0) {
          const match = list.find((s) => s.startTime === value.time);
          if (match && (!match.isAvailable || match.remainingCapacity <= 0)) {
            onChange({ time: '' }); // Reset giờ đã chọn nếu khung đó không còn trống
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Không thể tải khung giờ.');
        setAvailableSlots([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [value.date, token, isAuthed, onChange, value.time]);

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
          <div className={styles['slot-sub']}>
            {isAuthed 
              ? 'Các khung đã đầy sẽ bị khóa, chỉ hiển thị trạng thái cho khách đã đăng nhập.' 
              : 'Bạn chưa đăng nhập, có thể chọn bất kỳ khung giờ nào.'}
          </div>

          {/* Trạng thái Loading và Error */}
          {isAuthed && loading && <div className={styles['service-status']}>Đang tải khung giờ...</div>}
          {isAuthed && !loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}

          {/* Grid hiển thị các Button khung giờ */}
          <div className={styles['slot-grid']}>
            {displaySlots.map((slot) => {
              const time = formatTimeHHmm(slot.startTime); 
              
              // Điều kiện vô hiệu hóa nút: Đã đăng nhập + Đã chọn ngày + (Hết chỗ hoặc không khả dụng)
              const isDisabled = isAuthed && value.date && (!slot.isAvailable || slot.remainingCapacity <= 0);
              const active = value.time === time;

              return (
                <button
                  key={time}
                  type="button"
                  // Render class động: active (xanh), disabled (mờ/khóa)
                  className={[
                    styles['slot-btn'], 
                    active ? styles.active : '', 
                    isDisabled ? styles.disabled : ''
                  ].filter(Boolean).join(' ')}
                  // Chỉ cho phép click nếu không bị disable và đã chọn ngày
                  onClick={() => !isDisabled && value.date && handleTime(time)}
                  disabled={isDisabled || !value.date}
                >
                  <div className={styles['slot-time']}>{time}</div>
                  <div className={styles['slot-sub']}>
                    {slot.period || getPeriod(time)}
                    {/* Hiển thị số chỗ còn lại nếu là khách đã đăng nhập */}
                    {isAuthed && value.date && (
                      isDisabled ? ' · Hết chỗ' : (Number.isFinite(slot.remainingCapacity) ? ` · Còn ${slot.remainingCapacity}` : '')
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- NÚT ĐIỀU HƯỚNG --- */}
        <div className={bookingStyles['booking-actions']}>
          <button className={bookingStyles.btn} onClick={onBack}>Quay lại</button>
          <button 
            className={`${bookingStyles.btn} ${bookingStyles.primary}`} 
            onClick={onNext} 
            disabled={!canNext} // Chỉ cho tiếp tục khi đã chọn cả ngày và giờ
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </>
  );
}