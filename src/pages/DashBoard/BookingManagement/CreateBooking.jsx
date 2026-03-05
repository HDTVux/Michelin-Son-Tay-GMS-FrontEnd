import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bookingStyles from '../../Booking/Booking.module.css';
import scheduleStyles from '../BookingRequestManagement/BookingRequestEdit.module.css';
import styles from './CreateBooking.module.css';
import StepService from '../../Booking/steps/StepService.jsx';
import StepInfo from '../../Booking/steps/StepInfo.jsx';
import { fetchHomeServices } from '../../../services/homeService.js';
import { createGuestBooking, fetchAllSlots, fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { toast } from 'react-toastify';

const DURATION_MINUTES = 60;
const DATE_RANGE_DAYS = 10;

function normalizeBackendTime(value) {
	const raw = String(value || '').trim();
	if (!raw) return '';
	if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
	return raw;
}

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
		const value = formatLocalDateYYYYMMDD(d);
		const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
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

const sanitizeNote = (value) => {
	const raw = String(value ?? '');
	const hasForbiddenChars = /[<>{}]/.test(raw);
	const trimmed = raw.trim();
	return { raw, trimmed, hasForbiddenChars };
};


export default function CreateBooking() {
	useScrollToTop();
	const navigate = useNavigate();

	const [services, setServices] = useState([]);
	const [servicesLoading, setServicesLoading] = useState(false);
	const [servicesError, setServicesError] = useState('');

	const [selectedIds, setSelectedIds] = useState([]);
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState('all');

	const [schedule, setSchedule] = useState({ date: '', time: '' });
	const [info, setInfo] = useState({ name: '', phone: '', note: '' });

	const [baseSlots, setBaseSlots] = useState([]);
	const [baseSlotsLoading, setBaseSlotsLoading] = useState(false);
	const [baseSlotsError, setBaseSlotsError] = useState('');

	const [availableSlots, setAvailableSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState('');

	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [submitSuccess, setSubmitSuccess] = useState('');
	const [createdBookingForCheckIn, setCreatedBookingForCheckIn] = useState(null);

	useEffect(() => {
		let active = true;
		setServicesLoading(true);
		setServicesError('');

		fetchHomeServices()
			.then((res) => {
				if (!active) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				const mapped = list.map((item) => ({
					id: String(item.serviceId),
					name: item.title || 'Dịch vụ',
					desc: item.shortDescription || 'Hiện chưa có mô tả ngắn.',
					category: 'all',
					thumbnail: item.mediaThumbnail || '',
				}));
				setServices(mapped);
			})
			.catch((err) => {
				if (!active) return;
				setServicesError(err?.message || 'Không thể tải danh sách dịch vụ.');
				setServices([]);
			})
			.finally(() => {
				if (active) setServicesLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const toggle = (id) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	};

	const canSubmit = useMemo(() => {
		return (
			info.name.trim() &&
			info.phone.trim() &&
			schedule.date &&
			schedule.time &&
			(!schedule.date || (!slotsLoading && !slotsError)) &&
			!submitting
		);
	}, [info.name, info.phone, schedule.date, schedule.time, slotsLoading, slotsError, submitting]);



	const handleSubmit = async () => {
		if (!canSubmit) return;

		setSubmitError('');
		setSubmitSuccess('');
		setCreatedBookingForCheckIn(null);
		setSubmitting(true);

		const { trimmed, hasForbiddenChars } = sanitizeNote(info.note);

		if (hasForbiddenChars) {
			setSubmitError('Ghi chú không được chứa ký tự <, >, {, }.');
			setSubmitting(false);
			return;
		}

		if (trimmed.length > 500) {
			setSubmitError('Ghi chú tối đa 500 ký tự.');
			setSubmitting(false);
			return;
		}

		const serviceIds = selectedIds
			.map(Number)
			.filter((n) => Number.isFinite(n));

		try {
			const res = await createGuestBooking({
				appointmentDate: schedule.date,
				appointmentTime: normalizeBackendTime(schedule.time),
				userNote: trimmed,
				selectedServiceIds: serviceIds,
				fullName: info.name.trim(),
				phone: info.phone.trim(),
			});

			const data = res?.data;
			const code = data?.bookingCode ?? data?.requestId ?? data?.code;
			const msg = code ? `Tạo booking thành công. Mã: ${String(code)}` : 'Tạo booking thành công.';

			const firstServiceId = selectedIds?.[0];
			const serviceName = firstServiceId
				? services.find((s) => String(s?.id) === String(firstServiceId))?.name
				: '';
			const appointmentAt = toLocalDateTime(schedule.date, schedule.time);
			setCreatedBookingForCheckIn({
				customerName: info.name.trim(),
				serviceName: serviceName || undefined,
				appointmentAt: appointmentAt || undefined,
			});

			setSubmitSuccess(msg);
			toast(msg, { containerId: 'app-toast' });
		} catch (err) {
			setSubmitError(err?.message || 'Không thể tạo lịch hẹn.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleGoToCheckIn = () => {
		if (createdBookingForCheckIn) {
			navigate('/check-in', { state: { booking: createdBookingForCheckIn } });
			return;
		}
		navigate('/check-in');
	};

	const dateOptions = useMemo(() => buildDateOptions(), []);
	const allowedDateSet = useMemo(() => new Set(dateOptions.map((o) => o.value)), [dateOptions]);
	const isDateOutOfRange = !!schedule.date && !allowedDateSet.has(schedule.date);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setBaseSlots([]);
			setBaseSlotsError('Vui lòng đăng nhập để xem khung giờ.');
			return;
		}

		let active = true;
		setBaseSlotsLoading(true);
		setBaseSlotsError('');

		fetchAllSlots(token)
			.then((res) => {
				if (!active) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				const filtered = list.filter((s) => s && (s.isActive ?? true));
				filtered.sort((a, b) => timeKey(a?.startTime).localeCompare(timeKey(b?.startTime)));
				setBaseSlots(filtered);
			})
			.catch((err) => {
				if (!active) return;
				setBaseSlotsError(err?.message || 'Không thể tải khung giờ.');
				setBaseSlots([]);
			})
			.finally(() => {
				if (active) setBaseSlotsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!schedule.date) {
			setAvailableSlots([]);
			setSlotsError('');
			setSlotsLoading(false);
			return;
		}

		if (!token) {
			setAvailableSlots([]);
			setSlotsError('Vui lòng đăng nhập để xem trạng thái chỗ trống.');
			setSlotsLoading(false);
			return;
		}

		let active = true;
		setSlotsLoading(true);
		setSlotsError('');

		fetchAvailableSlotStaff(schedule.date, token, DURATION_MINUTES)
			.then((res) => {
				if (!active) return;
				const list = Array.isArray(res?.data?.slots) ? res.data.slots : [];
				setAvailableSlots(list);
			})
			.catch((err) => {
				if (!active) return;
				setSlotsError(err?.message || 'Không thể tải trạng thái chỗ trống.');
				setAvailableSlots([]);
			})
			.finally(() => {
				if (active) setSlotsLoading(false);
			});

		return () => {
			active = false;
		};
	}, [schedule.date]);

	useEffect(() => {
		if (!schedule.date || !schedule.time) return;
		if (slotsLoading || slotsError) return;
		if (!Array.isArray(availableSlots) || availableSlots.length === 0) return;

		const pickedKey = timeKey(schedule.time);
		const match = availableSlots.find((s) => timeKey(s.startTime) === pickedKey);
		if (!match) return;

		const remaining = Number(match?.remainingCapacity);
		const hasRemaining = Number.isFinite(remaining);
		const isFull = hasRemaining && remaining <= 0;
		if (!match.isAvailable || isFull) {
			setSchedule((prev) => ({ ...prev, time: '' }));
		}
	}, [availableSlots, schedule.date, schedule.time, slotsError, slotsLoading]);

	const displaySlots = useMemo(() => {
		if (!schedule.date) return baseSlots;
		const slots = !slotsLoading && !slotsError ? availableSlots : baseSlots;
		return slots.filter((s) => !isPastSlot(schedule.date, s?.startTime));
	}, [availableSlots, baseSlots, schedule.date, slotsError, slotsLoading]);

	const handlePickSlot = (rawTime) => {
		if (!schedule.date) return;
		if (slotsLoading || slotsError) return;
		const hhmm = formatTimeHHmm(rawTime);
		setSchedule((prev) => ({ ...prev, time: hhmm }));
	};

	const handleReset = () => {
		setSelectedIds([]);
		setSearch('');
		setFilter('all');
		setSchedule({ date: '', time: '' });
		setInfo({ name: '', phone: '', note: '' });
		setAvailableSlots([]);
		setSlotsError('');
		setSlotsLoading(false);
		setSubmitting(false);
		setSubmitError('');
		setSubmitSuccess('');
		setCreatedBookingForCheckIn(null);
	};

	return (
		<div className={`${bookingStyles['booking-page']} ${styles.page}`}>
			<h2 className={`${bookingStyles['section-title']} ${styles.title}`}>Tạo booking cho khách hàng</h2>
			<StepService
				services={services}
				selectedIds={selectedIds}
				onToggle={toggle}
				search={search}
				onSearch={setSearch}
				filter={filter}
				onFilter={setFilter}
				loading={servicesLoading}
				error={servicesError}
				showActions={false}
			/>

			<div style={{ height: 16 }} />

			<section className={scheduleStyles.section}>
				<h3 className={scheduleStyles.sectionTitle}>Chọn lịch</h3>
				<div className={scheduleStyles.formRow}>
					<div className={scheduleStyles.formField}>
						<label className={scheduleStyles.label} htmlFor="desiredDate">Ngày mong muốn</label>
						<div className={scheduleStyles.dateInput}>
							<span className={scheduleStyles.dateIcon}>📅</span>
							<select
								id="desiredDate"
								value={schedule.date}
								onChange={(e) => setSchedule((prev) => ({ ...prev, date: e.target.value, time: '' }))}
							>
								<option value="">Chọn ngày</option>
								{isDateOutOfRange && (
									<option value={schedule.date} disabled>
										{schedule.date}
									</option>
								)}
								{dateOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>{opt.label}</option>
								))}
							</select>
						</div>
						{isDateOutOfRange && (
							<div className={scheduleStyles.helperText}>
								Chỉ cho phép chọn trong 10 ngày tới.
							</div>
						)}
					</div>
					<div className={scheduleStyles.formField}>
						<label className={scheduleStyles.label} htmlFor="desiredTime">Khung giờ</label>
						<input
							id="desiredTime"
							type="time"
							value={schedule.time}
							onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
							disabled={!schedule.date || slotsLoading || !!slotsError}
						/>
					</div>
				</div>

				<div className={scheduleStyles.slotSection}>
					<div className={scheduleStyles.slotTitle}>Chọn khung giờ theo danh sách</div>
					<div className={scheduleStyles.slotSub}>
						Hiển thị các khung giờ theo ngày đã chọn; các khung đã đầy sẽ bị khóa.
					</div>

					{baseSlotsLoading && <div className={scheduleStyles.serviceStatus}>Đang tải khung giờ...</div>}
					{!baseSlotsLoading && baseSlotsError && <div className={`${scheduleStyles.serviceStatus} ${scheduleStyles.serviceStatusError}`}>{baseSlotsError}</div>}

					{!!schedule.date && slotsLoading && <div className={scheduleStyles.serviceStatus}>Đang tải trạng thái chỗ trống...</div>}
					{!!schedule.date && !slotsLoading && slotsError && <div className={`${scheduleStyles.serviceStatus} ${scheduleStyles.serviceStatusError}`}>{slotsError}</div>}

					<div className={scheduleStyles.slotGrid}>
						{displaySlots.map((slot) => {
							const rawTime = slot?.startTime;
							const displayTime = formatTimeHHmm(rawTime);

							const remaining = Number(slot?.remainingCapacity);
							const hasRemaining = Number.isFinite(remaining);
							const isFull = hasRemaining && remaining <= 0;

							const hasCapacityInfo = !!schedule.date && !slotsError && !slotsLoading;
							const isDisabled = hasCapacityInfo ? (!slot?.isAvailable || isFull) : false;
							const blockPicking = !schedule.date || slotsLoading || !!slotsError;
							const active = timeKey(schedule.time) === timeKey(rawTime);

							let capacityText = '';
							if (hasCapacityInfo) {
								if (isDisabled) capacityText = ' · Hết chỗ';
								else if (hasRemaining) capacityText = ` · Còn ${remaining}`;
							}

							return (
								<button
									key={slot?.slotId ?? timeKey(rawTime) ?? rawTime}
									type="button"
									className={[
										scheduleStyles.slotBtn,
										active ? scheduleStyles.slotBtnActive : '',
										isDisabled ? scheduleStyles.slotBtnDisabled : '',
									].filter(Boolean).join(' ')}
									onClick={() => !isDisabled && !blockPicking && handlePickSlot(rawTime)}
									disabled={blockPicking || isDisabled}
								>
									<div className={scheduleStyles.slotTime}>{displayTime}</div>
									<div className={scheduleStyles.slotMeta}>
										{normalizePeriodLabel(slot?.period)}
										{capacityText}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			</section>

			<div style={{ height: 16 }} />

			<StepInfo
				value={info}
				onChange={(patch) => setInfo((prev) => ({ ...prev, ...patch }))}
				isAuthed={false}
				loading={submitting}
				error={submitError}
				showActions={false}
			/>
			{submitSuccess && (
				<div className={styles.successRow}>
					<div className={`${scheduleStyles.serviceStatus} ${styles.successMessage}`}>{submitSuccess}</div>
					<button
						type="button"
						className={`${bookingStyles.btn} ${bookingStyles.primary} ${styles.successBtn}`}
						onClick={handleGoToCheckIn}
					>
						Chuyển sang Check-in
					</button>
				</div>
			)}

			<div className={bookingStyles['booking-actions']}>
				<button
					type="button"
					className={bookingStyles.btn}
					onClick={handleReset}
					disabled={submitting}
				>
					Làm mới
				</button>
				<button
					type="button"
					className={`${bookingStyles.btn} ${bookingStyles.primary}`}
					onClick={handleSubmit}
					disabled={!canSubmit}
					aria-busy={submitting}
				>
					{submitting ? 'Đang xử lý...' : 'Tạo booking'}
				</button>
			</div>
		</div>
	);
}
