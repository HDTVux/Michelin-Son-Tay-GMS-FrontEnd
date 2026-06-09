import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import { validateTextInput } from '../../../components/inputValidation.js';
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
    submitting,
    onClose,
    onSubmit,
}) {
    const initialParts = splitDateTimeLocal(initialDateTime);
    const [date, setDate] = useState(() => initialParts.date);
    const [timeSlot, setTimeSlot] = useState(() => initialParts.time);
    const [note, setNote] = useState(() => String(initialNote || ''));
    const [slotOptions, setSlotOptions] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState('');

    const NOTE_MAX_LENGTH = 255;
    const noteValidation = useMemo(() => {
        return validateTextInput(note, {
            fieldLabel: 'Ghi chú',
            required: false,
            trim: false,
            maxLength: NOTE_MAX_LENGTH,
        });
    }, [note]);
    const noteHasError = Boolean(noteValidation?.error);
    const NoteRemaining = NOTE_MAX_LENGTH - String(note ?? '').length;

    const effectiveTimeSlot = useMemo(() => {
        if (!timeSlot) return '';
        if (!Array.isArray(slotOptions) || slotOptions.length === 0) return timeSlot;
        const matched = slotOptions.find((s) => s.value === timeSlot);
        return matched?.isAvailable ? timeSlot : '';
    }, [slotOptions, timeSlot]);

    useEffect(() => {
        let active = true;
        if (!date) return () => {
            active = false;
        };

        const token = localStorage.getItem('authToken');
        if (!token) {
            Promise.resolve().then(() => {
                if (!active) return;
                setSlotOptions([]);
                setSlotsError('Vui lòng đăng nhập để xem slot khả dụng.');
                setSlotsLoading(false);
            });
            return () => {
                active = false;
            };
        }

        Promise.resolve().then(() => {
            if (!active) return;
            setSlotsLoading(true);
            setSlotsError('');
            setSlotOptions([]);
        });

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
    }, [date, durationMinutes]);

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const isPastDate = Boolean(date) && date < today;

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
            aria-label="Hẹn lịch bảo dưỡng"
        >
            <div className={styles.maintenanceModalContent}>
                <div className={styles.maintenanceModalHeader}>
                    <div className={styles.maintenanceModalTitle}>Hẹn lịch bảo dưỡng</div>
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
                            min={today}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={submitting}
                        />
                        {isPastDate ? (
                            <div className={styles.maintenanceSlotError}>Không được chọn ngày trong quá khứ.</div>
                        ) : null}
                    </div>

                    <div className="ui-field">
                        <label htmlFor="maintenance-next-slot">Giờ hẹn (theo slot cửa hàng)</label>
                        <select
                            id="maintenance-next-slot"
                            value={effectiveTimeSlot}
                            onChange={(e) => setTimeSlot(e.target.value)}
                            disabled={!date || slotsLoading || Boolean(slotsError) || submitting}
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
                            disabled={submitting}
                        />
                        {noteHasError ? (
                            <div className={styles.maintenanceSlotError}>{noteValidation.error}</div>
                        ) : null}
                    <span>
                        {NoteRemaining >= 0
                            ? `Còn ${NoteRemaining} ký tự`
                            : `Vượt ${Math.abs(NoteRemaining)} ký tự`}
                    </span>
                    </div>


                    <div className="ui-actions ui-actions--end" style={{ marginTop: 12 }}>
                        <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            onClick={() => onSubmit?.({ scheduledAt: joinDateAndTime(date, effectiveTimeSlot), note })}
                            disabled={!date || !effectiveTimeSlot || slotsLoading || Boolean(slotsError) || submitting || noteHasError}
                        >
                            {submitting ? 'Đang lưu...' : 'Xác nhận'}
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
    submitting: PropTypes.bool,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func,
};

MaintenanceBookingPopup.defaultProps = {
    durationMinutes: 60,
    submitting: false,
};
