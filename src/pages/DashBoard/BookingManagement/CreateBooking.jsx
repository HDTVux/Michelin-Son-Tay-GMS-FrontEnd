import { useEffect, useMemo, useState } from 'react';
import { fetchCustomerByPhone } from '../../../services/customerService.js';
import { useNavigate } from 'react-router-dom';
import bookingStyles from '../../Booking/Booking.module.css';
import scheduleStyles from '../BookingRequestManagement/BookingRequestEdit.module.css';
import styles from './CreateBooking.module.css';
import StepService from '../../Booking/steps/StepService.jsx';
import infoStyles from '../../Booking/steps/StepInfo.module.css';
import { fetchHomeServices } from '../../../services/homeService.js';
import { fetchAllSlots, fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import { buildDateOptions, formatTimeHHmm, isPastSlot } from '../../../components/timeUtils.js';
import { normalizePeriodLabel, timeKey, useCreateBookingHandlers } from './useCreateBookingHandlers.js';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';

const DURATION_MINUTES = 60;
const DATE_RANGE_DAYS = 10;
const NOTE_MAX_LENGTH = 255;


export default function CreateBooking() {
	useScrollToTop();
	const navigate = useNavigate();

	// Trạng thái kiểm tra khách hàng
	const [checkingCustomer, setCheckingCustomer] = useState(false);
	const [customerChecked, setCustomerChecked] = useState(null); // null | { exists, fullName, ... }
	const [customerCheckError, setCustomerCheckError] = useState('');
	const [info, setInfo] = useState({ name: '', phone: '', note: '' });
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

	const [services, setServices] = useState([]);
	const [servicesLoading, setServicesLoading] = useState(false);
	const [servicesError, setServicesError] = useState('');

	const [selectedIds, setSelectedIds] = useState([]);
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState('all');

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

	useEffect(() => {
		let active = true;
		Promise.resolve().then(() => {
			if (!active) return;
			setServicesLoading(true);
			setServicesError('');
		});

		fetchHomeServices()
			.then((res) => {
				if (!active) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				const mapped = list
					.map((item) => {
						const catalogItemId = Number(item?.catalogItemId);
						if (!Number.isFinite(catalogItemId) || catalogItemId < 0) return null;
						return {
							id: String(catalogItemId),
							serviceId: Number(item?.serviceId),
							name: item.title || 'Dịch vụ',
							desc: item.shortDescription || 'Hiện chưa có mô tả ngắn.',
							category: 'all',
							thumbnail: item.thumbnailUrl || item.imageUrl || item.mediaThumbnail || '',
						};
					})
					.filter(Boolean);
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

	const { toggle, handleUseNow, handleShowManualSchedule, handlePickSlot, handleSubmit, handleGoToCheckIn, handleReset } =
		useCreateBookingHandlers({
			baseSlots,
			selectedIds,
			schedule,
			scheduleMode,
			info,
			canSubmit,
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
		});

	const dateOptions = useMemo(() => buildDateOptions(DATE_RANGE_DAYS), []);
	const allowedDateSet = useMemo(() => new Set(dateOptions.map((o) => o.value)), [dateOptions]);
	const isDateOutOfRange = !!schedule.date && !allowedDateSet.has(schedule.date);

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

		const remaining = Number(match?.remainingCapacity);
		const hasRemaining = Number.isFinite(remaining);
		const isFull = hasRemaining && remaining <= 0;
		if (!match.isAvailable || isFull) {
			Promise.resolve().then(() => {
				setSchedule((prev) => ({ ...prev, time: '' }));
			});
		}
	}, [availableSlots, schedule.date, schedule.time, scheduleMode, slotsError, slotsLoading]);

	const displaySlots = useMemo(() => {
		if (scheduleMode !== 'manual') return baseSlots;
		if (!schedule.date) return baseSlots;
		const slots = !slotsLoading && !slotsError ? availableSlots : baseSlots;
		return slots.filter((s) => !isPastSlot(schedule.date, s?.startTime));
	}, [availableSlots, baseSlots, schedule.date, scheduleMode, slotsError, slotsLoading]);

	return (
		<div className={`${bookingStyles['booking-page']} ${styles.page}`}>
			<h2 className={`${bookingStyles['section-title']} ${styles.title}`}>Tạo lịch cho khách hàng</h2>
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
				<div className={bookingStyles['booking-actions']} style={{ padding: 0, marginTop: 8 }}>
					<button
						type="button"
						className={bookingStyles.btn}
						onClick={handleShowManualSchedule}
						disabled={submitting}
					>
						Chọn lịch
					</button>
					<button
						type="button"
						className={`${bookingStyles.btn} ${bookingStyles.primary}`}
						onClick={handleUseNow}
						disabled={submitting}
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
					{submitting ? 'Đang xử lý...' : 'Tạo lịch'}
				</button>
			</div>
		</div>
	);
}
