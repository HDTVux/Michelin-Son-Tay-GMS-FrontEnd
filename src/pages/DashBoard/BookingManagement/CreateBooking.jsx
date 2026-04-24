import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCustomerByPhone } from '../../../services/customerService.js';
import { useBeforeUnload, useLocation, useNavigate } from 'react-router-dom';
import bookingStyles from '../../Booking/Booking.module.css';
import scheduleStyles from '../BookingRequestManagement/BookingRequestEdit.module.css';
import styles from './CreateBooking.module.css';
import infoStyles from '../../Booking/steps/StepInfo.module.css';
import { fetchAllSlots, fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import { buildDateOptions, formatLocalDateYYYYMMDD, formatTimeHHmm, isPastSlot } from '../../../components/timeUtils.js';
import { normalizePeriodLabel, timeKey, useCreateBookingHandlers } from './useCreateBookingHandlers.js';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import AdvisorItemsTable from '../ServiceTicketManagement/AdvisorItemsTable.jsx';
import { manageServiceTicketEstimateStatus } from '../../../services/serviceTicketService.js';

const DURATION_MINUTES = 60;
const DATE_RANGE_DAYS = 10;
const NOTE_MAX_LENGTH = 255;

const normalizeReminderStatus = (value) => String(value ?? '').trim().toUpperCase();
const CREATE_BOOKING_ESTIMATE_STORAGE_KEY = 'create-booking:draft-estimate';

function hasStoredEstimateDraft() {
	try {
		return Boolean(localStorage.getItem(CREATE_BOOKING_ESTIMATE_STORAGE_KEY));
	} catch {
		return false;
	}
}


export default function CreateBooking() {
	useScrollToTop();
	const noop = () => {};
	const navigate = useNavigate();
	const location = useLocation();
	const sourceReminder = location.state?.maintenanceReminder || null;
	const sourceReminderId = location.state?.reminderId ?? sourceReminder?.reminderId ?? null;
	const sourceReminderStatus = normalizeReminderStatus(sourceReminder?.status);
	const sourceReminderBlocksBooking = Boolean(sourceReminderId && sourceReminderStatus && sourceReminderStatus !== 'CONFIRMED');
	const didApplyReminderRef = useRef(false);

	// Trạng thái kiểm tra khách hàng
	const [checkingCustomer, setCheckingCustomer] = useState(false);
	const [customerChecked, setCustomerChecked] = useState(null); // null | { exists, fullName, ... }
	const [customerCheckError, setCustomerCheckError] = useState('');
	const [info, setInfo] = useState({ name: '', phone: '', note: '' });
	const [selectedEstimate, setSelectedEstimate] = useState(null);
	const [, setIsEstimateEditing] = useState(false);
	const noteLength = useMemo(() => String(info.note || '').length, [info.note]);
	const noteRemaining = useMemo(() => Math.max(0, NOTE_MAX_LENGTH - noteLength), [noteLength]);


	// Hàm kiểm tra khách hàng theo số điện thoại
	const handleCheckCustomer = async () => {
		setCheckingCustomer(true);
		setCustomerCheckError('');
		setCustomerChecked(null);
		const phone = info.phone.trim();
		if (!phone) {
			setCustomerCheckError('Vui lòng nhập số điện thoại.');
			setCheckingCustomer(false);
			return;
		}
		try {
			const token = localStorage.getItem('authToken');
			const res = await fetchCustomerByPhone(phone, token);
			if (res?.data?.exists) {
				setInfo((prev) => ({ ...prev, name: res.data.fullName || '' }));
				setCustomerChecked(res.data);
			} else {
				setCustomerChecked({ exists: false });
			}
		} catch (err) {
			setCustomerCheckError(err?.message || 'Không thể kiểm tra khách hàng.');
		} finally {
			setCheckingCustomer(false);
		}
	};

	const estimateId = useMemo(() => {
		const raw = selectedEstimate?.estimateId ?? selectedEstimate?.id ?? null;
		const num = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(num) && num > 0 ? num : null;
	}, [selectedEstimate]);
	const selectedEstimateItems = useMemo(() => {
		const items = Array.isArray(selectedEstimate?.items) ? selectedEstimate.items : [];
		return items.filter((item) => !item?.isRemoved);
	}, [selectedEstimate]);

	const [schedule, setSchedule] = useState({ date: '', time: '' });
	const [scheduleMode, setScheduleMode] = useState('manual'); // 'manual' | 'now'
	const [showSchedulePicker, setShowSchedulePicker] = useState(false);

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
	const [submitLocked, setSubmitLocked] = useState(false);
	const [cancellingEstimate, setCancellingEstimate] = useState(false);
	const [estimateTableKey, setEstimateTableKey] = useState(0);
	const navigationGuardRef = useRef(false);

	useEffect(() => {
		if (!sourceReminderBlocksBooking) return;
		setSubmitError('Chỉ có thể tạo lịch từ lời nhắc đã xác nhận.');
	}, [sourceReminderBlocksBooking]);

	useEffect(() => {
		if (!submitSuccess) return;
		try {
			localStorage.removeItem(CREATE_BOOKING_ESTIMATE_STORAGE_KEY);
		} catch {
			// ignore storage failures
		}
		setSelectedEstimate(null);
		setIsEstimateEditing(false);
		setEstimateTableKey((prev) => prev + 1);
	}, [submitSuccess]);

	useEffect(() => {
		if (didApplyReminderRef.current || !sourceReminderId) return;
		didApplyReminderRef.current = true;

		const reminderDate = String(sourceReminder?.reminderDate || '').slice(0, 10);
		const reminderTime = formatTimeHHmm(sourceReminder?.reminderTime || '');
		setInfo((prev) => ({
			...prev,
			name: String(sourceReminder?.customerName || prev.name || '').trim(),
			phone: String(sourceReminder?.customerPhone || prev.phone || '').trim(),
			note: String(sourceReminder?.note || prev.note || '').trim(),
		}));
		if (reminderDate || reminderTime) {
			setSchedule((prev) => ({
				date: reminderDate || prev.date,
				time: reminderTime || prev.time,
			}));
			setScheduleMode('manual');
			setShowSchedulePicker(true);
		}
	}, [sourceReminder, sourceReminderId]);

	const canSubmit = useMemo(() => {
		return (
			info.name.trim() &&
			info.phone.trim() &&
			schedule.date &&
			schedule.time &&
			(!schedule.date || (!slotsLoading && !slotsError)) &&
			!submitting &&
			!submitLocked &&
			!sourceReminderBlocksBooking
		);
	}, [info.name, info.phone, schedule.date, schedule.time, slotsLoading, slotsError, submitting, submitLocked, sourceReminderBlocksBooking]);

	const hasActiveEstimateDraft = useMemo(() => {
		return Boolean(estimateId || selectedEstimateItems.length > 0 || hasStoredEstimateDraft());
	}, [estimateId, selectedEstimateItems.length]);

	    const { handleUseNow, handleShowManualSchedule, handlePickSlot, handleSubmit, handleGoToCheckIn, handleReset: resetForm } =
        useCreateBookingHandlers({
            baseSlots,
			selectedItems: selectedEstimateItems,
            selectedIds: [],
			estimateId,
            schedule,
            scheduleMode,
            info,
            canSubmit,
            submitLocked,
            slotsLoading,
            slotsError,
            createdBookingForCheckIn,
			sourceReminderId,
            navigate,


            setSelectedIds: noop,
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
        });

	const clearEstimateDraftLocalState = useCallback(() => {
		setSelectedEstimate(null);
		setIsEstimateEditing(false);
		setEstimateTableKey((prev) => prev + 1);
		try {
			localStorage.removeItem(CREATE_BOOKING_ESTIMATE_STORAGE_KEY);
		} catch {
			// ignore storage failures
		}
	}, []);

	const cancelEstimateDraft = useCallback(async () => {
		if (cancellingEstimate) return false;
		setSubmitError('');
		setSubmitSuccess('');
		setCancellingEstimate(true);
		try {
			if (estimateId) {
				const token = localStorage.getItem('authToken');
				if (!token) {
					setSubmitError('Vui lòng đăng nhập để hủy báo giá.');
					return false;
				}
				await manageServiceTicketEstimateStatus(estimateId, 'CANCELLED', token);
			}
			clearEstimateDraftLocalState();
			return true;
		} catch (err) {
			setSubmitError(err?.message || 'Không thể hủy báo giá.');
			return false;
		} finally {
			setCancellingEstimate(false);
		}
	}, [cancellingEstimate, clearEstimateDraftLocalState, estimateId]);

    const handleReset = async () => {
		if (hasActiveEstimateDraft) {
			const confirmed = globalThis.confirm(
				'Thao tác này sẽ hủy báo giá hiện tại và xóa dữ liệu nháp liên quan. Bạn có muốn tiếp tục không?',
			);
			if (!confirmed) return;
			const cancelled = await cancelEstimateDraft();
			if (!cancelled) return;
		}
        setCheckingCustomer(false);
        setCustomerChecked(null);
        setCustomerCheckError('');
        resetForm();
    };

	const handleCancelEstimate = useCallback(async () => {
		if (!hasActiveEstimateDraft) return;
		const confirmed = globalThis.confirm('Bạn có chắc chắn muốn hủy báo giá dự kiến này không?');
		if (!confirmed) return;
		await cancelEstimateDraft();
	}, [cancelEstimateDraft, hasActiveEstimateDraft]);

	useBeforeUnload(
		useCallback((event) => {
			if (!hasActiveEstimateDraft || cancellingEstimate) return;
			event.preventDefault();
			event.returnValue = '';
		}, [cancellingEstimate, hasActiveEstimateDraft]),
	);

	useEffect(() => {
		if (!hasActiveEstimateDraft || cancellingEstimate || submitSuccess) return undefined;

		const handleDocumentClick = (event) => {
			if (navigationGuardRef.current) return;
			const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
			if (!target) return;
			if (target.target && target.target !== '_self') return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

			const href = target.getAttribute('href');
			if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

			const nextUrl = new URL(target.href, window.location.href);
			const currentUrl = new URL(window.location.href);
			if (nextUrl.origin !== currentUrl.origin) return;
			if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search && nextUrl.hash === currentUrl.hash) return;

			event.preventDefault();
			navigationGuardRef.current = true;

			(async () => {
				const shouldDiscard = globalThis.confirm(
					'Bạn đang có báo giá dự kiến chưa hoàn tất. Chọn OK để hủy báo giá và rời trang, hoặc Cancel để ở lại hoàn tất tạo booking.',
				);
				if (!shouldDiscard) return;

				const cancelled = await cancelEstimateDraft();
				if (!cancelled) return;
				navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
			})().finally(() => {
				navigationGuardRef.current = false;
			});
		};

		document.addEventListener('click', handleDocumentClick, true);
		return () => {
			document.removeEventListener('click', handleDocumentClick, true);
		};
	}, [cancelEstimateDraft, cancellingEstimate, hasActiveEstimateDraft, navigate, submitSuccess]);

	const dateOptions = useMemo(() => buildDateOptions(DATE_RANGE_DAYS), []);
	const allowedDateSet = useMemo(() => new Set(dateOptions.map((o) => o.value)), [dateOptions]);
	const isDateOutOfRange = !!schedule.date && !allowedDateSet.has(schedule.date);
	const todayISO = useMemo(() => formatLocalDateYYYYMMDD(new Date()), []);
	const createdBookingDateISO = String(
		createdBookingForCheckIn?.booking?.scheduledDate || schedule.date || '',
	).slice(0, 10);
	const canGoToCheckIn = Boolean(createdBookingForCheckIn?.bookingCode && createdBookingDateISO === todayISO);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			Promise.resolve().then(() => {
				setBaseSlots([]);
				setBaseSlotsError('Vui lòng đăng nhập để xem khung giờ.');
			});
			return;
		}

		let active = true;
		Promise.resolve().then(() => {
			if (!active) return;
			setBaseSlotsLoading(true);
			setBaseSlotsError('');
		});

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
		if (scheduleMode === 'now') {
			Promise.resolve().then(() => {
				setAvailableSlots([]);
				setSlotsError('');
				setSlotsLoading(false);
			});
			return;
		}
		if (!schedule.date) {
			Promise.resolve().then(() => {
				setAvailableSlots([]);
				setSlotsError('');
				setSlotsLoading(false);
			});
			return;
		}

		if (!token) {
			Promise.resolve().then(() => {
				setAvailableSlots([]);
				setSlotsError('Vui lòng đăng nhập để xem trạng thái chỗ trống.');
				setSlotsLoading(false);
			});
			return;
		}

		let active = true;
		Promise.resolve().then(() => {
			if (!active) return;
			setSlotsLoading(true);
			setSlotsError('');
		});

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
	}, [schedule.date, scheduleMode]);

	useEffect(() => {
		if (scheduleMode !== 'manual') return;
		if (!schedule.date || !schedule.time) return;
		if (slotsLoading || slotsError) return;
		if (!Array.isArray(availableSlots) || availableSlots.length === 0) return;

		const pickedKey = timeKey(schedule.time);
		const match = availableSlots.find((s) => timeKey(s.startTime) === pickedKey);
		if (!match) return;
	}, [availableSlots, schedule.date, schedule.time, scheduleMode, slotsError, slotsLoading]);

	const displaySlots = useMemo(() => {
		if (scheduleMode !== 'manual') return baseSlots;
		if (!schedule.date) return baseSlots;
		const slots = !slotsLoading && !slotsError ? availableSlots : baseSlots;
		return slots.filter((s) => !isPastSlot(schedule.date, s?.startTime));
	}, [availableSlots, baseSlots, schedule.date, scheduleMode, slotsError, slotsLoading]);

	const selectedSlotStatus = useMemo(() => {
		if (!schedule.date || !schedule.time) return null;
		const sourceSlots = scheduleMode === 'manual' && !slotsLoading && !slotsError ? availableSlots : baseSlots;
		const match = (Array.isArray(sourceSlots) ? sourceSlots : []).find(
			(slot) => timeKey(slot?.startTime) === timeKey(schedule.time),
		);
		if (!match) return null;

		const currentBookingCount = Number(match?.currentBookingCount);
		const capacity = Number(match?.capacity);
		const hasCapacity = Number.isFinite(capacity) && capacity > 0;
		const hasCurrentCount = Number.isFinite(currentBookingCount) && currentBookingCount >= 0;
		const occupancyText =
			hasCapacity && hasCurrentCount
				? `${currentBookingCount}/${capacity} slot`
				: '';

		return {
			isOverCapacity: Boolean(match?.isOverCapacity),
			isUnavailable: match?.isAvailable === false,
			status: String(match?.status || '').trim(),
			occupancyText,
		};
	}, [availableSlots, baseSlots, schedule.date, schedule.time, scheduleMode, slotsError, slotsLoading]);

	return (
		<div className={`${bookingStyles['booking-page']} ${styles.page}`}>
			<h2 className={`${bookingStyles['section-title']} ${styles.title}`}>Tạo lịch cho khách hàng</h2>
			{sourceReminderId && (
				<div className={styles.reminderSource}>
					Đang tạo lịch từ lời nhắc #{sourceReminderId}
				</div>
			)}
			{sourceReminderBlocksBooking && (
				<div className={`${scheduleStyles.serviceStatus} ${scheduleStyles.serviceStatusError}`}>
					Chỉ có thể tạo lịch khi lời nhắc đã xác nhận.
				</div>
			)}
			<AdvisorItemsTable
				key={estimateTableKey}
				serviceTicketId={null}
				ticketStatus=""
				ticketPhotos={[]}
				estimatedTimeDisplay=""
				title="Bảng báo giá dự kiến"
				draftStorageKey={CREATE_BOOKING_ESTIMATE_STORAGE_KEY}
				hideVehiclePhotos
				hideRecommendation
				hideEstimateSummary
				onEstimateStatusChange={setSelectedEstimate}
				onEstimateEditingChange={setIsEstimateEditing}
			/>
			{hasActiveEstimateDraft ? (
				<div className={bookingStyles['booking-actions']} style={{ padding: 0, marginTop: 8 }}>
					<button
						type="button"
						className={bookingStyles.btn}
						onClick={handleCancelEstimate}
						disabled={cancellingEstimate || submitting}
					>
						{cancellingEstimate ? 'Đang hủy báo giá...' : 'Hủy báo giá'}
					</button>
				</div>
			) : null}

			<div style={{ height: 16 }} />

			<section className={scheduleStyles.section}>
				<h3 className={scheduleStyles.sectionTitle}>Chọn lịch</h3>
				<div className={bookingStyles['booking-actions']} style={{ padding: 0, marginTop: 8 }}>
					<button
						type="button"
						className={bookingStyles.btn}
						onClick={handleShowManualSchedule}
						disabled={submitting || sourceReminderBlocksBooking}
					>
						Chọn lịch
					</button>
					<button
						type="button"
						className={`${bookingStyles.btn} ${bookingStyles.primary}`}
						onClick={handleUseNow}
						disabled={submitting || sourceReminderBlocksBooking}
					>
						Dùng ngày giờ hiện tại
					</button>
				</div>

				{scheduleMode === 'now' && schedule.date && schedule.time && (
					<div className={scheduleStyles.helperText} style={{ marginTop: 8 }}>
						Đang đặt cho slot: {schedule.date} {schedule.time}
					</div>
				)}

				{showSchedulePicker && scheduleMode === 'manual' && (
					<>
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
							{!!selectedSlotStatus?.status && (
								<div
									className={`${scheduleStyles.serviceStatus} ${selectedSlotStatus.isOverCapacity || selectedSlotStatus.isUnavailable ? scheduleStyles.serviceStatusError : ''}`}
									style={{ marginTop: 8 }}
								>
									{selectedSlotStatus.occupancyText ? ` (${selectedSlotStatus.occupancyText})` : ''}
									{selectedSlotStatus.isOverCapacity ? ' — Đã vượt quá sức chứa! Nhân viên cần xem xét trước khi tạo lịch.' : ''}
								</div>
							)}

							<div className={scheduleStyles.slotGrid}>
								{displaySlots.map((slot) => {
									const rawTime = slot?.startTime;
									const displayTime = formatTimeHHmm(rawTime);

									const remaining = Number(slot?.remainingCapacity);
									const hasRemaining = Number.isFinite(remaining);
									const capacity = Number(slot?.capacity);
									const currentBookingCount = Number(slot?.currentBookingCount);
									const hasCapacity = Number.isFinite(capacity) && capacity > 0;
									const hasCurrentCount = Number.isFinite(currentBookingCount) && currentBookingCount >= 0;


									const hasCapacityInfo = !!schedule.date && !slotsError && !slotsLoading;
									const isDisabled = hasCapacityInfo ? slot?.isActive === false : false;
									const blockPicking = !schedule.date || slotsLoading || !!slotsError;
									const active = timeKey(schedule.time) === timeKey(rawTime);

									let capacityText = '';
									if (hasCapacityInfo) {
										if (hasCapacity && hasCurrentCount) capacityText = ` · ${currentBookingCount}/${capacity}`;
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
					</>
				)}
			</section>

			<div style={{ height: 16 }} />

			<h3 className={bookingStyles['section-title']}>Thông tin khách hàng</h3>
			<p className={infoStyles['info-note']}>Vui lòng nhập thông tin để tiếp tục.</p>

			<div className={infoStyles['info-card']}>

						<div className={infoStyles.field}>
							<label htmlFor="create-booking-phone" >Số điện thoại (<span className={styles.required}>*</span>)</label>
							<div className={infoStyles['inline-input']}>
								<input
									id="create-booking-phone"
									type="tel"
									placeholder="Nhập số điện thoại"
									value={info.phone}
									onChange={(e) => {
										setInfo((prev) => ({ ...prev, phone: e.target.value }));
										setCustomerChecked(null);
										setCustomerCheckError('');
									}}
									required
								/>
								<button
									type="button"
									className={bookingStyles.btn}
									onClick={handleCheckCustomer}
									disabled={checkingCustomer || !info.phone.trim()}
								>
									{checkingCustomer ? 'Đang kiểm tra...' : 'Kiểm tra KH'}
								</button>
							</div>
							{customerCheckError && <div style={{ color: '#e53935', fontSize: 13 }}>{customerCheckError}</div>}
							{customerChecked?.exists === true && (
								<div style={{ color: '#059669', fontSize: 13 }}>Khách hàng đã tồn tại: {customerChecked.fullName}</div>
							)}
							{customerChecked?.exists === false && (
								<div style={{ color: '#f59e42', fontSize: 13 }}>Chưa có khách hàng này trong hệ thống.</div>
							)}
						</div>

						<div className={infoStyles.field}>
							<label htmlFor="create-booking-fullname">Họ và tên (<span className={styles.required}>*</span>)</label>
							<input
								id="create-booking-fullname"
								type="text"
								placeholder="Nhập họ và tên của khách"
								value={info.name}
								onChange={(e) => setInfo((prev) => ({ ...prev, name: e.target.value }))}
								required
								style={customerChecked?.exists === true ? { background: '#f3f4f6', color: '#888' } : {}}
							/>
						</div>

			</div>

			{submitError && <div className={infoStyles.error}>{submitError}</div>}

			<div className={infoStyles['section-block']}>
				<div className={infoStyles['section-title-row']}>
					<h4 className={bookingStyles['section-title']}>
						Yêu cầu đặc biệt (không bắt buộc)
					</h4>
				</div>
				<div className={infoStyles.field}>
					<label htmlFor="create-booking-note" className={infoStyles.srOnly}>Ghi chú</label>
					<textarea
						id="create-booking-note"
						rows="6"
						placeholder="VD: Kiểm tra thêm tiếng kêu ở bánh trước, cần lấy xe trước 17h, ..."
						value={info.note}
						onChange={(e) => setInfo((prev) => ({ ...prev, note: e.target.value }))}
						maxLength={NOTE_MAX_LENGTH}
					/>
					<div className={infoStyles['char-count']}>{noteRemaining} ký tự còn lại</div>
				</div>
			</div>
			{submitSuccess && (
				<div className={styles.successRow}>
					<div className={`${scheduleStyles.serviceStatus} ${styles.successMessage}`}>{submitSuccess}</div>
					{createdBookingForCheckIn?.bookingCode && (
						<button
							type="button"
							className={`${bookingStyles.btn} ${bookingStyles.primary} ${styles.successBtn}`}
							onClick={handleGoToCheckIn}
							disabled={!canGoToCheckIn}
							title={canGoToCheckIn ? 'Chuyển sang Check-in' : 'Chỉ có thể check-in lịch hẹn trong ngày hôm nay'}
						>
							Chuyển sang Check-in
						</button>
					)}
				</div>
			)}

			<div className={bookingStyles['booking-actions']}>
				<button
					type="button"
					className={bookingStyles.btn}
					onClick={handleReset}
					disabled={submitting || cancellingEstimate}
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
					{submitting ? 'Đang xử lý...' : 'Tạo lịch'}
				</button>
			</div>
		</div>
	);
}
