import React, { useEffect, useMemo, useState } from 'react';
import styles from './StepSchedule.module.css';
import bookingStyles from '../Booking.module.css';
import { fetchAllSlots, fetchAvailableSlots } from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';

// --- CẤU HÌNH HẰNG SỐ ---
const DATE_RANGE_DAYS = 10;       // Cho phép đặt lịch trong vòng 10 ngày tới
const DURATION_MINUTES = 60;      // Thời lượng dự kiến của một dịch vụ (60 phút)

/**
 * Hàm tạo danh sách 10 ngày tới để người dùng chọn
 */
const formatLocalDateYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildDateOptions = () => {
  const today = new Date();
  const options = [];
  for (let i = 0; i < DATE_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatLocalDateYYYYMMDD(d); // Định dạng YYYY-MM-DD theo local time để gửi API
    const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }); // Hiển thị: Thứ... dd/mm
    options.push({ value, label });
  }
  return options;
};

const normalizePeriodLabel = (raw) => {
  if (!raw) return '';
  const v = String(raw).trim().toLowerCase();
  if (v === 'morning' || v === 'am' || v === 'sang' || v === 'sáng') return 'Sáng';
  if (v === 'afternoon' || v === 'pm' || v === 'chieu' || v === 'chiều') return 'Chiều';
  if (v === 'evening' || v === 'night' || v === 'toi' || v === 'tối') return 'Tối';
  return raw;
};

const timeKey = (t) => formatTimeHHmm(t || '');

const defer = (fn) => Promise.resolve().then(fn);

const toLocalDateTime = (dateYYYYMMDD, timeRaw) => {
  if (!dateYYYYMMDD || !timeRaw) return null;
  const [yStr, mStr, dStr] = String(dateYYYYMMDD).split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  const parts = String(timeRaw).split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? 0);
  const ss = Number(parts[2] ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;

  return new Date(y, m - 1, d, hh, mm, ss, 0);
};

const isPastSlot = (dateYYYYMMDD, timeRaw) => {
  const slotStart = toLocalDateTime(dateYYYYMMDD, timeRaw);
  if (!slotStart) return false;
  return slotStart.getTime() <= Date.now();
};

const isTooSoonSlot = (dateYYYYMMDD, timeRaw, leadMinutes) => {
  const slotStart = toLocalDateTime(dateYYYYMMDD, timeRaw);
  if (!slotStart) return false;
  const leadMs = Number(leadMinutes) * 60 * 1000;
  return slotStart.getTime() < (Date.now() + leadMs);
};

export default function StepSchedule({ value, onChange, onBack, onNext, token, isAuthed }) {
  const [baseSlots, setBaseSlots] = useState([]); // Danh sách khung giờ lấy từ API /slots/all
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseError, setBaseError] = useState('');

  const [availableSlots, setAvailableSlots] = useState([]); // Lưu khung giờ lấy từ API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Điều kiện để nhấn nút "Tiếp tục"
  const canNext = value.date && value.time;

  // Ghi nhớ danh sách ngày và khung giờ để không phải tính toán lại mỗi lần render
  const dateOptions = useMemo(() => buildDateOptions(), []);

  /**
   * SIDE EFFECT: Lấy danh sách khung giờ nền từ backend 
   */
  useEffect(() => {
    let active = true;
    defer(() => {
      if (!active) return;
      setBaseLoading(true);
      setBaseError('');
    });

    fetchAllSlots(isAuthed ? token : undefined)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        const filtered = list.filter((s) => s && (s.isActive ?? true));
        filtered.sort((a, b) => timeKey(a?.startTime).localeCompare(timeKey(b?.startTime)));
        setBaseSlots(filtered);
      })
      .catch((err) => {
        if (!active) return;
        setBaseError(err?.message || 'Không thể tải khung giờ.');
        setBaseSlots([]);
      })
      .finally(() => {
        if (active) setBaseLoading(false);
      });

    return () => { active = false; };
  }, [isAuthed, token]);

  /**
   * 1. Nếu đã đăng nhập: Dùng dữ liệu từ API (có trạng thái trống/đầy).
   * 2. Nếu chưa đăng nhập: Không hiển thị số lượng/còn chỗ, nhưng sẽ ẩn các slot đã qua.
   */
  const displaySlots = useMemo(() => {
    let source = baseSlots;
    if (isAuthed && value.date) {
      source = loading ? baseSlots : availableSlots;
    }

    if (!value.date) return source;

    const todayKey = formatLocalDateYYYYMMDD(new Date());
    const isToday = value.date === todayKey;

    if (!isAuthed) {
      if (!isToday) return source;
      return source.filter((s) => !isTooSoonSlot(value.date, s?.startTime, 120));
    }

    // Khách đã login: vẫn ẩn các slot đã qua
    return source.filter((s) => !isPastSlot(value.date, s?.startTime));
  }, [isAuthed, value.date, loading, availableSlots, baseSlots]);

  // Xử lý khi người dùng chọn ngày
  const handleDate = (e) => {
    const date = e.target.value;
    onChange({ date, time: '' }); // Reset lại giờ khi đổi ngày
  };

  // Xử lý khi chọn giờ (lưu dạng raw HH:mm:ss để gửi backend)
  const handleTime = (time) => onChange({ time });

  /**
   * SIDE EFFECT: Gọi API lấy khung giờ trống khi người dùng chọn ngày
   * (Chỉ thực hiện cho khách hàng đã đăng nhập)
   */
  useEffect(() => {
    let active = true; // Biến cờ để tránh cập nhật state khi component đã unmount

    if (!isAuthed || !token || !value.date) {
      defer(() => {
        if (!active) return;
        setAvailableSlots([]);
        setError('');
        setLoading(false);
      });
      return () => { active = false; };
    }

    defer(() => {
      if (!active) return;
      setLoading(true);
      setError('');
    });

    fetchAvailableSlots(value.date, token, DURATION_MINUTES)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data?.slots) ? res.data.slots : [];
        setAvailableSlots(list);

        // Kiểm tra nếu giờ đang chọn hiện tại đột ngột bị đầy (do người khác đặt hoặc API cập nhật)
        if (value.time && list.length > 0) {
          const pickedKey = timeKey(value.time);
          const match = list.find((s) => timeKey(s.startTime) === pickedKey);
          const matchRemaining = Number(match?.remainingCapacity);
          const matchIsFull = Number.isFinite(matchRemaining) && matchRemaining <= 0;
		  if (match && (!match.isAvailable || matchIsFull)) {
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
          <label className={styles['slot-title']} htmlFor="booking-date">Chọn ngày đặt lịch</label>
          <div className={styles['date-input']}>
            <span className={styles['date-icon']}>📅</span>
            <select id="booking-date" value={value.date} onChange={handleDate}>
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
              : 'Bạn chưa đăng nhập, nếu đặt lịch trong ngày hôm nay thì cần đặt trước tối thiểu 2 tiếng.'}
          </div>

          {/* Trạng thái Loading và Error */}
          {baseLoading && <div className={styles['service-status']}>Đang tải khung giờ...</div>}
          {!baseLoading && baseError && <div className={`${styles['service-status']} ${styles.error}`}>{baseError}</div>}
          {isAuthed && loading && <div className={styles['service-status']}>Đang tải trạng thái chỗ trống...</div>}
          {isAuthed && !loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}

          {/* Grid hiển thị các Button khung giờ */}
          <div className={styles['slot-grid']}>
            {displaySlots.map((slot) => {
              const rawTime = slot.startTime;
              const displayTime = formatTimeHHmm(rawTime);
			  const remaining = Number(slot.remainingCapacity);
			  const hasRemaining = Number.isFinite(remaining);
			  const isFull = hasRemaining && remaining <= 0;
              
              // Điều kiện vô hiệu hóa nút: Đã đăng nhập + Đã chọn ngày + (Hết chỗ hoặc không khả dụng)
			  const isDisabled = isAuthed && value.date && (!slot.isAvailable || isFull);
              const active = timeKey(value.time) === timeKey(rawTime);

			  let capacityText = '';
			  if (isAuthed && value.date) {
				if (isDisabled) capacityText = ' · Hết chỗ';
				else if (hasRemaining) capacityText = ` · Còn ${remaining}`;
			  }

              return (
                <button
                  key={slot.slotId ?? timeKey(rawTime) ?? rawTime}
                  type="button"
                  // Render class động: active (xanh), disabled (mờ/khóa)
                  className={[
                    styles['slot-btn'], 
                    active ? styles.active : '', 
                    isDisabled ? styles.disabled : ''
                  ].filter(Boolean).join(' ')}
                  // Chỉ cho phép click nếu không bị disable và đã chọn ngày
                  onClick={() => !isDisabled && value.date && handleTime(rawTime)}
                  disabled={isDisabled || !value.date}
                >
                  <div className={styles['slot-time']}>{displayTime}</div>
                  <div className={styles['slot-sub']}>
                    {normalizePeriodLabel(slot.period)}
                    {/* Hiển thị số chỗ còn lại nếu là khách đã đăng nhập */}
					{capacityText}
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