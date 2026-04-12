import { useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

import { staffCreateBooking } from '../../../services/bookingService.js';
import {
	formatLocalDateYYYYMMDD,
	formatTimeHHmm,
	normalizeBackendTime,
	toLocalDateTime,
} from '../../../components/timeUtils.js';
import { validateTextInput } from '../../../components/inputValidation.js';

export const normalizePeriodLabel = (raw) => {
	if (!raw) return '';
	const v = String(raw).trim().toLowerCase();
	if (v === 'morning' || v === 'am' || v === 'sang' || v === 'sáng') return 'Sáng';
	if (v === 'afternoon' || v === 'pm' || v === 'chieu' || v === 'chiều') return 'Chiều';
	if (v === 'evening' || v === 'night' || v === 'toi' || v === 'tối') return 'Tối';
	return raw;
};

export const timeKey = (t) => formatTimeHHmm(t || '');

const pickNextSlotFromBaseSlots = (baseSlots, now) => {
	const list = Array.isArray(baseSlots) ? baseSlots : [];
	if (!list.length) return null;

	const today = formatLocalDateYYYYMMDD(now);
	const nowTs = now.getTime();

	for (const slot of list) {
		const slotStart = toLocalDateTime(today, slot?.startTime);
		if (!slotStart) continue;
		if (slotStart.getTime() > nowTs) {
			return { date: today, time: formatTimeHHmm(slot?.startTime) };
		}
	}

	// Nếu hôm nay đã hết slot thì lấy slot đầu tiên của ngày mai.
	const tomorrow = new Date(now);
	tomorrow.setDate(now.getDate() + 1);
	const tomorrowStr = formatLocalDateYYYYMMDD(tomorrow);
	const first = list[0];
	if (!first?.startTime) return null;
	return { date: tomorrowStr, time: formatTimeHHmm(first.startTime) };
};

const pickNextSlotByRounding30m = (now) => {
	// Fallback: làm tròn lên theo block 30 phút, có tính cả seconds/millis.
	const date = formatLocalDateYYYYMMDD(now);
	const seconds = now.getSeconds();
	const millis = now.getMilliseconds();
	let minutes = now.getHours() * 60 + now.getMinutes();
	if (seconds > 0 || millis > 0) minutes += 1;
	const rounded = Math.ceil(minutes / 30) * 30;

	if (rounded >= 24 * 60) {
		const nextDay = new Date(now);
		nextDay.setDate(now.getDate() + 1);
		return { date: formatLocalDateYYYYMMDD(nextDay), time: '00:00' };
	}

	const hh = String(Math.floor(rounded / 60)).padStart(2, '0');
	const mm = String(rounded % 60).padStart(2, '0');
	return { date, time: `${hh}:${mm}` };
};

export function useCreateBookingHandlers({
	baseSlots,
	selectedIds,
	schedule,
	scheduleMode,
	info,
	canSubmit,
	submitLocked,
	slotsLoading,
	slotsError,
	createdBookingForCheckIn,
	navigate,

	setSelectedIds,
	setSearch,
	setFilter,
	setSchedule,
	setScheduleMode,
	setShowSchedulePicker,
	setInfo,
	setAvailableSlots,
	setSlotsLoading,
	setSlotsError,
	setSubmitting,
	setSubmitError,
	setSubmitSuccess,
	setCreatedBookingForCheckIn,
	setSubmitLocked,
}) {
	const submitInFlightRef = useRef(false);
	const toggle = useCallback(
		(id) => {
			setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
		},
		[setSelectedIds],
	);

	const handleUseNow = useCallback(() => {
		const now = new Date();
		const picked = pickNextSlotFromBaseSlots(baseSlots, now) ?? pickNextSlotByRounding30m(now);
		const date = picked?.date || formatLocalDateYYYYMMDD(now);
		const time =
			picked?.time ||
			`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

		setScheduleMode('now');
		setShowSchedulePicker(false);
		setSchedule({ date, time });
		setAvailableSlots([]);
		setSlotsError('');
		setSlotsLoading(false);
	}, [baseSlots, setAvailableSlots, setSchedule, setScheduleMode, setShowSchedulePicker, setSlotsError, setSlotsLoading]);

	const handleShowManualSchedule = useCallback(() => {
		setScheduleMode('manual');
		setShowSchedulePicker(true);
	}, [setScheduleMode, setShowSchedulePicker]);

	const handlePickSlot = useCallback(
		(rawTime) => {
			if (scheduleMode !== 'manual') return;
			if (!schedule?.date) return;
			if (slotsLoading || slotsError) return;
			const hhmm = formatTimeHHmm(rawTime);
			setSchedule((prev) => ({ ...prev, time: hhmm }));
		},
		[schedule?.date, scheduleMode, setSchedule, slotsError, slotsLoading],
	);

	const handleSubmit = useCallback(async () => {
		// Guard: block spamming submits.
		if (submitLocked) {
			setSubmitError('Vui lòng bấm Làm mới để tạo lịch mới.');
			return;
		}
		if (submitInFlightRef.current) return;
		if (!canSubmit) return;

		submitInFlightRef.current = true;

		setSubmitError('');
		setSubmitSuccess('');
		setCreatedBookingForCheckIn(null);
		setSubmitting(true);

		const { value: trimmedNote, error: noteError } = validateTextInput(info?.note, {
			fieldLabel: 'Ghi chú',
			required: false,
			maxLength: 255,
			trim: true,
		});
		if (noteError) {
			setSubmitError(noteError);
			setSubmitting(false);
			return;
		}

		const catalogItemIds = (Array.isArray(selectedIds) ? selectedIds : [])
			.map(Number)
			.filter((n) => Number.isFinite(n) && n >= 0);

		try {
			const res = await staffCreateBooking({
				appointmentDate: schedule?.date,
				appointmentTime: normalizeBackendTime(schedule?.time),
				userNote: trimmedNote,
				selectedServiceIds: catalogItemIds,
				fullName: String(info?.name ?? '').trim(),
				phone: String(info?.phone ?? '').trim(),
			});

			const data = res?.data;
			const bookingCodeRaw = data?.bookingCode ?? data?.requestId ?? data?.code;
			const bookingCode = String(bookingCodeRaw ?? '').trim();
			const msg = bookingCode ? `Tạo booking thành công. Mã: ${bookingCode}` : 'Tạo booking thành công.';

			// Chỉ truyền ID (bookingCode) sang Check-in để phiếu tự lookup thông tin khách/booking từ backend.
			setCreatedBookingForCheckIn(bookingCode ? { bookingCode } : null);

			setSubmitSuccess(msg);
			setSubmitLocked(true);
			toast(msg, { containerId: 'app-toast' });
		} catch (err) {
			setSubmitError(err?.message || 'Không thể tạo lịch hẹn.');
		} finally {
			setSubmitting(false);
			submitInFlightRef.current = false;
		}
	}, [
		canSubmit,
		info?.name,
		info?.note,
		info?.phone,
		schedule?.date,
		schedule?.time,
		selectedIds,
		submitLocked,
		setCreatedBookingForCheckIn,
		setSubmitError,
		setSubmitSuccess,
		setSubmitLocked,
		setSubmitting,
	]);

	const handleGoToCheckIn = useCallback(() => {
		const code = String(createdBookingForCheckIn?.bookingCode ?? '').trim();
		if (code) {
			navigate('/check-in', { state: { bookingCode: code } });
			return;
		}
		navigate('/check-in');
	}, [createdBookingForCheckIn?.bookingCode, navigate]);

	const handleReset = useCallback(() => {
		submitInFlightRef.current = false;
		setSelectedIds([]);
		setSearch('');
		setFilter('all');
		setSchedule({ date: '', time: '' });
		setScheduleMode('manual');
		setShowSchedulePicker(false);
		setInfo({ name: '', phone: '', note: '' });
		setAvailableSlots([]);
		setSlotsError('');
		setSlotsLoading(false);
		setSubmitting(false);
		setSubmitError('');
		setSubmitSuccess('');
		setCreatedBookingForCheckIn(null);
		setSubmitLocked(false);
	}, [
		setAvailableSlots,
		setCreatedBookingForCheckIn,
		setFilter,
		setInfo,
		setSchedule,
		setScheduleMode,
		setSearch,
		setSelectedIds,
		setShowSchedulePicker,
		setSlotsError,
		setSlotsLoading,
		setSubmitError,
		setSubmitSuccess,
		setSubmitLocked,
		setSubmitting,
	]);

	return {
		toggle,
		handleUseNow,
		handleShowManualSchedule,
		handlePickSlot,
		handleSubmit,
		handleGoToCheckIn,
		handleReset,
	};
}
