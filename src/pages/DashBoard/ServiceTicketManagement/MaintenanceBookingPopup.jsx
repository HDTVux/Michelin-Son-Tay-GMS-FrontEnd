import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import styles from './ServiceTicketDetail.module.css';

function splitDateTimeLocal(value) {
    const raw = String(value || '').trim();
    if (!raw) return { date: '', time: '' };

    // Accept formats like YYYY-MM-DDTHH:mm
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

function normalizeSlotLabel(rawTime) {
    const hhmm = formatTimeHHmm(rawTime);
    return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : String(rawTime || '').trim();
}

function normalizeAvailableSlots(payload) {
    const list = Array.isArray(payload?.data?.slots) ? payload.data.slots : [];
    return list
        .map((it) => {
            const label = normalizeSlotLabel(it?.startTime ?? it?.slot ?? it?.time ?? '');
            if (!label) return null;

            const remaining = Number(it?.remainingCapacity);
            const hasRemaining = Number.isFinite(remaining);
            const isAvailableFlag = it?.isAvailable !== false;
            const isAvailable = isAvailableFlag && (!hasRemaining || remaining > 0);

            return {
                value: label,
                label: hasRemaining ? `${label} (${Math.max(remaining, 0)} chỗ)` : label,
                isAvailable,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.value.localeCompare(b.value));
}

export default function MaintenanceBookingPopup({
    open,
    initialDateTime,
    initialNote,
    durationMinutes,
    onClose,
    onSubmit,
}) {
    const [date, setDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    const [note, setNote] = useState('');
    const [slotOptions, setSlotOptions] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState('');

    useEffect(() => {
        if (!open) return;
        const parts = splitDateTimeLocal(initialDateTime);
        setDate(parts.date);
        setTimeSlot(parts.time);
        setNote(String(initialNote || ''));
    }, [open, initialDateTime, initialNote]);

    useEffect(() => {
        if (!open || !date) {
            setSlotOptions([]);
            setSlotsError('');
            setSlotsLoading(false);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            setSlotOptions([]);
            setSlotsError('Vui lòng đăng nhập để xem slot khả dụng.');
            setSlotsLoading(false);
            return;
        }

        let active = true;
        setSlotsLoading(true);
        setSlotsError('');

        fetchAvailableSlotStaff(date, token, durationMinutes)
            .then((res) => {
                if (!active) return;
                const slots = normalizeAvailableSlots(res);
                setSlotOptions(slots);
            })
            .catch((err) => {
                if (!active) return;
                setSlotsError(err?.message || 'Không thể tải slot khả dụng.');
                setSlotOptions([]);
            })
            .finally(() => {
                if (active) setSlotsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [date, durationMinutes, open]);

    useEffect(() => {
        if (!timeSlot) return;
        if (!Array.isArray(slotOptions) || slotOptions.length === 0) return;
        const matched = slotOptions.find((s) => s.value === timeSlot);
        if (!matched?.isAvailable) {
            setTimeSlot('');
        }
    }, [slotOptions, timeSlot]);

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
            aria-label="Đặt lịch bảo dưỡng"
        >
            <div className={styles.maintenanceModalContent}>
                <div className={styles.maintenanceModalHeader}>
                    <div className={styles.maintenanceModalTitle}>Đặt lịch bảo dưỡng</div>
                    <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                        Đóng
                    </button>
                </div>

                <div className={styles.maintenanceModalBody}>
                    <div className="ui-field">
                        <label htmlFor="maintenance-next-date">Ngày hẹn lần sau</label>
                        <input
                            id="maintenance-next-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div className="ui-field">
                        <label htmlFor="maintenance-next-slot">Giờ hẹn (theo slot cửa hàng)</label>
                        <select
                            id="maintenance-next-slot"
                            value={timeSlot}
                            onChange={(e) => setTimeSlot(e.target.value)}
                            disabled={!date || slotsLoading || Boolean(slotsError)}
                        >
                            <option value="">-- Chọn slot giờ --</option>
                            {slotOptions.map((s) => (
                                <option key={s.value} value={s.value} disabled={!s.isAvailable}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        {slotsLoading ? (
                            <div className={styles.maintenanceSlotHint}>Đang tải slot khả dụng...</div>
                        ) : null}
                        {!slotsLoading && slotsError ? (
                            <div className={styles.maintenanceSlotError}>{slotsError}</div>
                        ) : null}
                        {!slotsLoading && !slotsError && date && slotOptions.length === 0 ? (
                            <div className={styles.maintenanceSlotHint}>Không có slot khả dụng cho ngày đã chọn.</div>
                        ) : null}
                    </div>

                    <div className="ui-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="maintenance-note">Ghi chú</label>
                        <textarea
                            id="maintenance-note"
                            placeholder="Nhập ghi chú..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <div className="ui-actions ui-actions--end" style={{ marginTop: 12 }}>
                        <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            onClick={() => onSubmit?.({ scheduledAt: joinDateAndTime(date, timeSlot), note })}
                            disabled={!date || !timeSlot || slotsLoading || Boolean(slotsError)}
                        >
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}

MaintenanceBookingPopup.propTypes = {
    open: PropTypes.bool,
    initialDateTime: PropTypes.string,
    initialNote: PropTypes.string,
    durationMinutes: PropTypes.number,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func,
};

MaintenanceBookingPopup.defaultProps = {
    durationMinutes: 60,
};
