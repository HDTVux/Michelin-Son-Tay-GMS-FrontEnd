import { useState } from 'react';
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
    const initialParts = splitDateTimeLocal(initialDateTime);
    const [date, setDate] = useState(() => initialParts.date);
    const [time, setTime] = useState(() => initialParts.time);

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
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div className="ui-field">
                        <label htmlFor="estimate-time-clock">Giờ ước tính</label>
                        <input
                            id="estimate-time-clock"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
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
                            onClick={() => onSubmit?.({ estimatedAt: joinDateAndTime(date, time) })}
                            disabled={!date || !time}
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