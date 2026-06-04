import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import bookingStyles from '../../Booking/Booking.module.css';
import scheduleStyles from '../BookingRequestManagement/BookingRequestEdit.module.css';
import styles from './CreateBooking.module.css';
import infoStyles from '../../Booking/steps/StepInfo.module.css';
import { fetchAllSlots, fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import { buildDateOptions, formatLocalDateYYYYMMDD, formatTimeHHmm, isPastSlot } from '../../../components/timeUtils.js';
import { normalizePeriodLabel, timeKey, useCreateBookingHandlers } from './useCreateBookingHandlers.js';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import AdvisorItemsTable from '../ServiceTicketManagement/AdvisorItemsTable.jsx';

const DURATION_MINUTES = 60;	// Thời lượng mặc định cho 1 slot
const DATE_RANGE_DAYS = 10;		// Giới hạn chọn lịch trong vòng 10 ngày tới
const NOTE_MAX_LENGTH = 255;	// Độ dài tối đa của ghi chú

//Chuẩn hóa trạng thái nhắc nhở bảo trì
const normalizeReminderStatus = (value) => String(value ?? '').trim().toUpperCase();
const CREATE_BOOKING_ESTIMATE_STORAGE_KEY = 'create-booking:draft-estimate';

/**
 * Helper: Kiểm tra xem có bản nháp báo giá nào đang lưu trong LocalStorage không
 */
function hasStoredEstimateDraft() {
	try {
		return Boolean(localStorage.getItem(CREATE_BOOKING_ESTIMATE_STORAGE_KEY));
	} catch {
		return false;
	}
}


const STEPS = [
	{ id: 'estimate', label: 'Bảng báo giá dự kiến' },
	{ id: 'schedule', label: 'Chọn lịch' },
	{ id: 'info', label: 'Thông tin & Yêu cầu đặc biệt' },
];


export default function CreateBooking() {
	const [stepIndex, setStepIndex] = useState(0);
	useScrollToTop([stepIndex], 'smooth');
	const noop = () => {};
	const navigate = useNavigate();
	const location = useLocation();

	// Xử lý dữ liệu từ Reminder (Nếu có điều hướng từ trang nhắc nhở sang)
	const sourceReminder = location.state?.maintenanceReminder || null;
	const sourceReminderId = location.state?.reminderId ?? sourceReminder?.reminderId ?? null;
	const sourceReminderStatus = normalizeReminderStatus(sourceReminder?.status);

	// Chặn tạo lịch nếu nhắc nhở chưa được khách xác nhận (CONFIRMED)
	const sourceReminderBlocksBooking = Boolean(sourceReminderId && sourceReminderStatus && sourceReminderStatus !== 'CONFIRMED');
	const initialReminderDate = String(sourceReminder?.reminderDate || '').slice(0, 10);
	const initialReminderTime = formatTimeHHmm(sourceReminder?.reminderTime || '');
	const shouldShowInitialSchedulePicker = Boolean(initialReminderDate || initialReminderTime);

	// Trạng thái kiểm tra khách hàng
	const [checkingCustomer, setCheckingCustomer] = useState(false);
	const [customerChecked, setCustomerChecked] = useState(null); // null | { exists, fullName, ... }
	const [customerCheckError, setCustomerCheckError] = useState('');
	const [info, setInfo] = useState({
		name: String(sourceReminder?.customerName || '').trim(),
		phone: String(sourceReminder?.customerPhone || '').trim(),
		note: String(sourceReminder?.note || '').trim(),
	});

	// Quản lý trạng thái báo giá dự kiến
	const [selectedEstimate, setSelectedEstimate] = useState(null);
	const [, setIsEstimateEditing] = useState(false);
	const noteLength = useMemo(() => String(info.note || '').length, [info.note]);
	const noteRemaining = useMemo(() => Math.max(0, NOTE_MAX_LENGTH - noteLength), [noteLength]);

	// Lấy ID báo giá từ selectedEstimate, ưu tiên trường estimateId, fallback sang id nếu estimateId không tồn tại hoặc không hợp lệ
	const estimateId = useMemo(() => {
		const raw = selectedEstimate?.estimateId ?? selectedEstimate?.id ?? null;
		const num = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(num) && num > 0 ? num : null;
	}, [selectedEstimate]);

	// Lọc danh sách item trong báo giá (bỏ các item đã đánh dấu xóa)
	const selectedEstimateItems = useMemo(() => {
		const items = Array.isArray(selectedEstimate?.items) ? selectedEstimate.items : [];
		return items.filter((item) => !item?.isRemoved);
	}, [selectedEstimate]);

	// Trạng thái lịch hẹn
	const [schedule, setSchedule] = useState({ date: initialReminderDate, time: initialReminderTime });
	const [scheduleMode, setScheduleMode] = useState('manual'); // 'manual' | 'now'
	const [showSchedulePicker, setShowSchedulePicker] = useState(true);

	// Trạng thái khung giờ
	const [baseSlots, setBaseSlots] = useState([]);
	const [baseSlotsLoading, setBaseSlotsLoading] = useState(false);
	const [baseSlotsError, setBaseSlotsError] = useState('');

	// State cho danh sách khung giờ trống thực tế theo ngày (Available Slots)
	const [availableSlots, setAvailableSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState('');

	// Trạng thái submit form
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [submitSuccess, setSubmitSuccess] = useState('');
	const [createdBookingForCheckIn, setCreatedBookingForCheckIn] = useState(null);
	const [submitLocked, setSubmitLocked] = useState(false);
	const [cancellingEstimate, setCancellingEstimate] = useState(false);
	const [estimateTableKey, setEstimateTableKey] = useState(0);

	// Logic kiểm tra điều kiện để cho phép bấm nút "Tạo lịch" 
	// - Lịch hẹn phải có ngày và giờ hợp lệ
	// - Nếu chọn lịch thủ công, phải có dữ liệu khung giờ (dù là danh sách khung giờ chung hay trạng thái chỗ trống theo ngày) và không có lỗi khi tải dữ liệu
	// - Không đang trong quá trình submit hoặc bị khóa submit
	// - Nếu nguồn tạo lịch từ lời nhắc, phải đảm bảo lời nhắc đó không chặn việc tạo lịch (chưa được xác nhận)
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

	// Kiểm tra xem có tồn tại một bản nháp báo giá nào đang hoạt động hay không (bao gồm cả bản nháp hiện tại trong state và bản nháp đã lưu trong LocalStorage)
	const hasActiveEstimateDraft = useMemo(() => {
		return Boolean(estimateId || selectedEstimateItems.length > 0 || hasStoredEstimateDraft());
	}, [estimateId, selectedEstimateItems.length]);

	const displaySubmitError = submitError || (sourceReminderBlocksBooking ? 'Chỉ có thể tạo lịch từ lời nhắc đã xác nhận.' : '');

	// Các handler chính được sử dụng trong component, được tách ra và quản lý trong useCreateBookingHandlers 
    const { handleCheckCustomer, handleUseNow, handleShowManualSchedule, handlePickSlot, handleSubmit, handleGoToCheckIn, handleReset, handleCancelEstimate } =
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
			hasActiveEstimateDraft,
			cancellingEstimate,
			submitSuccess,
			estimateStorageKey: CREATE_BOOKING_ESTIMATE_STORAGE_KEY,
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
			setCheckingCustomer,
			setCustomerChecked,
			setCustomerCheckError,
			setSelectedEstimate,
			setIsEstimateEditing,
			setEstimateTableKey,
			setCancellingEstimate,
			setStepIndex,
        });
	
	// Xây dựng các options cho dropdown chọn ngày, giới hạn trong vòng 10 ngày tới
	const dateOptions = useMemo(() => buildDateOptions(DATE_RANGE_DAYS), []);
	const allowedDateSet = useMemo(() => new Set(dateOptions.map((o) => o.value)), [dateOptions]);
	const isDateOutOfRange = !!schedule.date && !allowedDateSet.has(schedule.date);
	const todayISO = useMemo(() => formatLocalDateYYYYMMDD(new Date()), []);
	const createdBookingDateISO = String(
		createdBookingForCheckIn?.booking?.scheduledDate || schedule.date || '',
	).slice(0, 10);
	const canGoToCheckIn = Boolean(createdBookingForCheckIn?.bookingCode && createdBookingDateISO === todayISO);

	// Lấy tất cả khung giờ gốc khi component mount
	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			Promise.resolve().then(() => {
				setBaseSlots([]);
				setBaseSlotsError('Vui lòng đăng nhập để xem khung giờ.');
			});
			return;
		}

		// Sử dụng biến "active" để tránh cập nhật state sau khi component đã unmount (trường hợp response trả về chậm)
		let active = true;
		// Đặt trạng thái loading trước khi gọi API
		Promise.resolve().then(() => {
			if (!active) return;
			setBaseSlotsLoading(true);
			setBaseSlotsError('');
		});

		// Gọi API để lấy tất cả khung giờ
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

	// Lấy trạng thái chỗ trống (Availability) khi người dùng chọn Ngày
	useEffect(() => {
		const token = localStorage.getItem('authToken');
		// Nếu đang ở chế độ "dùng ngày giờ hiện tại" thì không cần tải trạng thái chỗ trống
		if (scheduleMode === 'now') {
			Promise.resolve().then(() => {
				setAvailableSlots([]);
				setSlotsError('');
				setSlotsLoading(false);
			});
			return;
		}
		// Nếu chưa chọn ngày thì không cần tải trạng thái chỗ trống, đồng thời reset các state liên quan về trạng thái chỗ trống
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

		// Gọi API để lấy trạng thái chỗ trống theo ngày đã chọn
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

	// Logic hiển thị và đồng bộ khung giờ đã chọn với trạng thái chỗ trống khi người dùng chọn thời gian
	useEffect(() => {
		// Nếu không ở chế độ chọn lịch thủ công thì không cần đồng bộ với trạng thái chỗ trống
		if (scheduleMode !== 'manual') return;
		// Nếu chưa chọn ngày hoặc giờ thì không cần đồng bộ với trạng thái chỗ trống
		if (!schedule.date || !schedule.time) return;
		if (slotsLoading || slotsError) return;
		// Nếu không có dữ liệu trạng thái chỗ trống thì không thể đồng bộ, nhưng vẫn giữ nguyên khung giờ đã chọn 
		if (!Array.isArray(availableSlots) || availableSlots.length === 0) return;

		// Tìm khung giờ đã chọn trong danh sách trạng thái chỗ trống
		const pickedKey = timeKey(schedule.time);
		const match = availableSlots.find((s) => timeKey(s.startTime) === pickedKey);
		if (!match) return;
	}, [availableSlots, schedule.date, schedule.time, scheduleMode, slotsError, slotsLoading]);

	// Xây dựng danh sách khung giờ hiển thị dựa trên chế độ chọn lịch và trạng thái chỗ trống
	const displaySlots = useMemo(() => {
		if (scheduleMode !== 'manual') return baseSlots;
		if (!schedule.date) return baseSlots;
		const slots = !slotsLoading && !slotsError ? availableSlots : baseSlots;
		// Lọc bỏ các khung giờ đã qua so với thời điểm hiện tại (chỉ áp dụng khi chọn ngày là ngày hôm nay)
		return slots.filter((s) => !isPastSlot(schedule.date, s?.startTime));
	}, [availableSlots, baseSlots, schedule.date, scheduleMode, slotsError, slotsLoading]);

	// Tính toán trạng thái của khung giờ đã chọn để hiển thị thông tin về tình trạng chỗ trống và cảnh báo nếu đã vượt quá sức chứa
	const selectedSlotStatus = useMemo(() => {
		if (!schedule.date || !schedule.time) return null;
		const sourceSlots = scheduleMode === 'manual' && !slotsLoading && !slotsError ? availableSlots : baseSlots;
		// Tìm khung giờ đã chọn trong danh sách khung giờ nguồn 
		const match = (Array.isArray(sourceSlots) ? sourceSlots : []).find(
			(slot) => timeKey(slot?.startTime) === timeKey(schedule.time),
		);
		if (!match) return null;

		const currentBookingCount = Number(match?.currentBookingCount);
		const capacity = Number(match?.capacity);
		const hasCapacity = Number.isFinite(capacity) && capacity > 0;
		const hasCurrentCount = Number.isFinite(currentBookingCount) && currentBookingCount >= 0;
		// Nếu có cả thông tin sức chứa và số lượng đặt chỗ hiện tại, hiển thị dạng "x/y slot"; nếu chỉ có thông tin còn lại, hiển thị dạng "Còn x"
		const occupancyText =
			hasCapacity && hasCurrentCount
				? `${currentBookingCount}/${capacity} slot`
				: '';
		// Xác định đã vượt quá sức chứa nếu có thông tin về sức chứa và số lượng đặt chỗ hiện tại, và số lượng đặt chỗ hiện tại đã đạt hoặc vượt quá sức chứa
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

			<div className={bookingStyles['stepper-wrapper']}>
				<div className={bookingStyles['progress-track']}>
					<div className={bookingStyles['progress-fill']} style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
				</div>
				<div className={bookingStyles.stepper}>
					{STEPS.map((step, idx) => {
						const isCompleted = idx < stepIndex || (submitLocked && idx === 2);
						const isActive = idx === stepIndex;
						const stepClass = [
							bookingStyles.step,
							isCompleted ? bookingStyles.completed : '',
							isActive ? bookingStyles.active : ''
						].filter(Boolean).join(' ');
						return (
							<div key={step.id} className={stepClass}>
								<div className={bookingStyles.dot}>{isCompleted ? '✓' : idx + 1}</div>
								<div className={bookingStyles.label}>{step.label}</div>
							</div>
						);
					})}
				</div>
			</div>

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

			{/* BƯỚC 1: BẢNG BÁO GIÁ DỰ KIẾN */}
			{stepIndex === 0 && (
				<>
					<AdvisorItemsTable
						key={estimateTableKey}
						className={styles.estimatePanel}
						serviceTicketId={null}
						ticketStatus=""
						ticketPhotos={[]}
						estimatedTimeDisplay=""
						title="Bảng báo giá dự kiến"
						draftStorageKey={CREATE_BOOKING_ESTIMATE_STORAGE_KEY}
						hideVehiclePhotos
						hideRecommendation
						hideEstimateSummary
						autoStartCreate
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

					<div className={bookingStyles['booking-actions']} style={{ marginTop: 24 }}>
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
							onClick={() => setStepIndex(1)}
						>
							Tiếp tục
						</button>
					</div>
				</>
			)}

			{/* BƯỚC 2: CHỌN LỊCH */}
			{stepIndex === 1 && (
				<>
					<section className={`${scheduleStyles.section} ${styles.fullWidthSection}`}>
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
						
						{/* Giao diện chọn ngày & giờ thủ công */}
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

					<div className={bookingStyles['booking-actions']} style={{ marginTop: 24 }}>
						<button
							type="button"
							className={bookingStyles.btn}
							onClick={() => setStepIndex(0)}
						>
							Quay lại
						</button>
						<button
							type="button"
							className={`${bookingStyles.btn} ${bookingStyles.primary}`}
							onClick={() => setStepIndex(2)}
							disabled={!schedule.date || !schedule.time}
						>
							Tiếp tục
						</button>
					</div>
				</>
			)}

			{/* BƯỚC 3: THÔNG TIN KHÁCH HÀNG VÀ YÊU CẦU ĐẶC BIỆT */}
			{stepIndex === 2 && (
				<>
					<h3 className={bookingStyles['section-title']}>Thông tin khách hàng</h3>
					<p className={infoStyles['info-note']}>Vui lòng nhập thông tin để tiếp tục.</p>

					<div className={`${infoStyles['info-card']} ${styles.fullWidthCard}`}>
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
									disabled={submitLocked}
								/>
								<button
									type="button"
									className={bookingStyles.btn}
									onClick={handleCheckCustomer}
									disabled={checkingCustomer || !info.phone.trim() || submitLocked}
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
								disabled={submitLocked || customerChecked?.exists === true}
								style={customerChecked?.exists === true ? { background: '#f3f4f6', color: '#888' } : {}}
							/>
						</div>
					</div>

					{displaySubmitError && <div className={infoStyles.error}>{displaySubmitError}</div>}

					<div className={`${infoStyles['section-block']} ${styles.fullWidthNoteBlock}`}>
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
								disabled={submitLocked}
							/>
							<div className={infoStyles['char-count']}>{noteRemaining} ký tự còn lại</div>
						</div>
					</div>

					{submitSuccess && (
						<div className={styles.successRow}>
							<div className={`${scheduleStyles.serviceStatus} ${styles.successMessage}`}>{submitSuccess}</div>
						</div>
					)}

					<div className={bookingStyles['booking-actions']} style={{ marginTop: 24 }}>
						{submitSuccess ? (
							<>
								<button
									type="button"
									className={bookingStyles.btn}
									onClick={handleReset}
								>
									Tạo lịch mới
								</button>
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
							</>
						) : (
							<>
								<button
									type="button"
									className={bookingStyles.btn}
									onClick={() => setStepIndex(1)}
									disabled={submitting}
								>
									Quay lại
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
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}
