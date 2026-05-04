import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ServiceTicketDetail.module.css';

function splitDateTimeLocal(value) {
    const raw = String(value || '').trim();
    if (!raw) return { date: '', time: '' };

    const [datePart, timePartRaw] = raw.split('T');
    const timePart = String(timePartRaw || '').slice(0, 5);
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(datePart || ''));
    const timeOk = /^\d{2}:\d{2}$/.test(timePart);

    return {
        date: dateOk ? datePart : '',
        time: timeOk ? timePart : '',
    };
}

function joinDateAndTime(date, time) {
    const d = String(date || '').trim();
    const t = String(time || '').trim();
    if (!d || !t) return '';
    return `${d}T${t}`;
}

export default function EstimateTimePopup({ open, initialDateTime, onClose, onSubmit }) {
    const initialParts = useMemo(() => splitDateTimeLocal(initialDateTime), [initialDateTime]);
    const [date, setDate] = useState(() => initialParts.date);
    const [hour, setHour] = useState(() => (initialParts.time ? String(initialParts.time).slice(0, 2) : ''));
    const [minute, setMinute] = useState(() => (initialParts.time ? String(initialParts.time).slice(3, 5) : ''));

    const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
    const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

    const timeNormalized = useMemo(() => {
        const hh = String(hour || '').trim();
        const mm = String(minute || '').trim();
        if (!/^([01]\d|2[0-3])$/.test(hh)) return '';
        if (!/^[0-5]\d$/.test(mm)) return '';
        return `${hh}:${mm}`;
    }, [hour, minute]);

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const isPastDate = Boolean(date) && date < today;

    const canConfirm = Boolean(date) && Boolean(timeNormalized) && !isPastDate;

    if (!open) return null;

    return (
        <dialog
            className={styles.maintenanceModalDialog}
            open
            onClose={onClose}
            onCancel={(e) => {
                e.preventDefault();
                onClose?.();
            }}
            aria-label="Nhập thời gian ước tính"
        >
            <div className={styles.maintenanceModalContent}>
                <div className={styles.maintenanceModalHeader}>
                    <div className={styles.maintenanceModalTitle}>Nhập thời gian ước tính</div>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                        Đóng
                    </button>
                </div>

                <div className={styles.maintenanceModalBody}>
                    <div className="ui-field">
                        <label htmlFor="estimate-time-date">Ngày ước tính</label>
                        <input
                            id="estimate-time-date"
                            type="date"
                            min={today}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        {isPastDate ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b' }}>Không được chọn ngày trong quá khứ.</div>
                        ) : null}
                    </div>

                    <div className="ui-field">
                        <label htmlFor="estimate-time-clock">Giờ ước tính</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label htmlFor="estimate-time-hour" className={styles.srOnly}>Giờ</label>
                                <select
                                    id="estimate-time-hour"
                                    value={hour}
                                    onChange={(e) => setHour(e.target.value)}
                                >
                                    <option value="">Giờ</option>
                                    {hourOptions.map((h) => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="estimate-time-minute" className={styles.srOnly}>Phút</label>
                                <select
                                    id="estimate-time-minute"
                                    value={minute}
                                    onChange={(e) => setMinute(e.target.value)}
                                >
                                    <option value="">Phút</option>
                                    {minuteOptions.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={styles.maintenanceSlotHint}>Chọn ngày và giờ dự kiến hoàn tất sửa chữa.</div>
                    </div>

                    <div className="ui-actions ui-actions--end" style={{ marginTop: 12 }}>
                        <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            onClick={() => onSubmit?.({ estimatedAt: '' })}
                        >
                            Bỏ qua
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            onClick={() => onSubmit?.({ estimatedAt: joinDateAndTime(date, timeNormalized) })}
                            disabled={!canConfirm}
                        >
                            Xác nhận báo giá
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}

EstimateTimePopup.propTypes = {
    open: PropTypes.bool,
    initialDateTime: PropTypes.string,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func,
};