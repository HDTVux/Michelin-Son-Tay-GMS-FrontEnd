import React, { useEffect, useMemo, useState } from 'react';
import styles from './StepSchedule.module.css';
import bookingStyles from '../Booking.module.css';
import { fetchAvailableSlots } from '../../../services/bookingService.js';

const DATE_RANGE_DAYS = 10;
const START_HOUR = 7;
const END_HOUR = 19;
const SLOT_INTERVAL_MINUTES = 30;
const DURATION_MINUTES = 60;

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

const buildTimeSlots = () => {
  const slots = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const hh = hour.toString().padStart(2, '0');
      const mm = minute.toString().padStart(2, '0');
      slots.push(`${hh}:${mm}:00`);
    }
  }
  return slots;
};

const getPeriod = (timeStr) => {
  const [hh] = timeStr.split(':');
  const h = Number(hh);
  if (h < 12) return 'Sáng';
  if (h < 18) return 'Chiều';
  return 'Tối';
};

export default function StepSchedule({ value, onChange, onBack, onNext, token, isAuthed }) {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canNext = value.date && value.time;
  const dateOptions = useMemo(buildDateOptions, []);
  const timeSlots = useMemo(buildTimeSlots, []);

  const displaySlots = useMemo(() => {
    if (isAuthed && availableSlots.length > 0) return availableSlots;
    return timeSlots.map((t) => ({ startTime: t, isAvailable: true, remainingCapacity: null, period: getPeriod(t) }));
  }, [isAuthed, availableSlots, timeSlots]);

  const handleDate = (e) => {
    const date = e.target.value;
    onChange({ date, time: '' });
  };

  const handleTime = (time) => onChange({ time });

  // Fetch availability only for logged-in users
  useEffect(() => {
    let active = true;
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
        if (value.time && list.length > 0) {
          const match = list.find((s) => s.startTime === value.time);
          if (match && (!match.isAvailable || match.remainingCapacity <= 0)) {
            onChange({ time: '' });
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

    return () => {
      active = false;
    };
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
            {isAuthed ? 'Các khung đã đầy sẽ bị khóa, chỉ hiển thị trạng thái cho khách đã đăng nhập.' : 'Bạn chưa đăng nhập, có thể chọn bất kỳ khung giờ nào.'}
          </div>

          {isAuthed && loading && <div className={styles['service-status']}>Đang tải khung giờ...</div>}
          {isAuthed && !loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}

          <div className={styles['slot-grid']}>
            {displaySlots.map((slot) => {
              const time = slot.startTime;
              const isDisabled = isAuthed && value.date && (!slot.isAvailable || slot.remainingCapacity <= 0);
              const active = value.time === time;
              return (
                <button
                  key={time}
                  type="button"
                  className={[styles['slot-btn'], active ? styles.active : '', isDisabled ? styles.disabled : ''].filter(Boolean).join(' ')}
                  onClick={() => !isDisabled && value.date && handleTime(time)}
                  disabled={isDisabled || !value.date}
                >
                  <div className={styles['slot-time']}>{time}</div>
                  <div className={styles['slot-sub']}>
                    {slot.period || getPeriod(time)}
                    {isAuthed && value.date && (
                      isDisabled ? ' · Hết chỗ' : (Number.isFinite(slot.remainingCapacity) ? ` · Còn ${slot.remainingCapacity}` : '')
                    )}
                  </div>
                </button>
              );
            })}
          </div>
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
