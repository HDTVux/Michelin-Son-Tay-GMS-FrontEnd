import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import bookingStyles from '../../Booking/Booking.module.css';
import psStyles from '../PartsSales/PartsSales.module.css';
import styles from './CreateBooking.module.css';
import { fetchAllSlots, fetchAvailableSlotStaff } from '../../../services/bookingService.js';
import { buildDateOptions, formatLocalDateYYYYMMDD, formatTimeHHmm, isPastSlot } from '../../../components/timeUtils.js';
import { normalizePeriodLabel, timeKey, useCreateBookingHandlers } from './useCreateBookingHandlers.js';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import AdvisorItemsTable from '../ServiceTicketManagement/AdvisorItemsTable.jsx';
import Receipt from '../Receipt/Receipt.jsx';
import { getDefaultSafetyInspectionCategories } from '../../../services/safetyInspectionService.js';
import { fetchAllCustomers } from '../../../services/adminService.js';
import { fetchFallbackPricingConfigs } from '../../../services/warehouseService.js';
import { Contact, Search, X } from 'lucide-react';
import RankBadge from '../../../components/RankBadge/RankBadge.jsx';

const DURATION_MINUTES = 60;	// Thời lượng mặc định cho 1 slot
const DATE_RANGE_DAYS = 10;		// Giới hạn chọn lịch trong vòng 10 ngày tới
const NOTE_MAX_LENGTH = 255;	// Độ dài tối đa của ghi chú

//Chuẩn hóa trạng thái nhắc nhở bảo trì
const normalizeReminderStatus = (value) => String(value ?? '').trim().toUpperCase();
const CREATE_BOOKING_ESTIMATE_STORAGE_KEY = 'create-booking:draft-estimate';

const getInitials = (name) => {
	if (!name) return 'KH';
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
};

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

/**
 * Màn tạo lịch hẹn cho khách hàng — gộp thành phiếu 1 trang giống /parts-sales:
 * khách hàng (trái trên) + box thông tin khách (phải trên) + thông tin hẹn lịch +
 * bảng báo giá dự kiến + [Làm mới / In phiếu / Tạo lịch]. Không có mã giảm giá.
 */
export default function CreateBooking() {
	useScrollToTop([], 'smooth');
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

	// Trạng thái kiểm tra khách hàng
	const [checkingCustomer, setCheckingCustomer] = useState(false);
	const [customerChecked, setCustomerChecked] = useState(null); // null | { exists, fullName, ... }
	const [customerCheckError, setCustomerCheckError] = useState('');
	const [info, setInfo] = useState({
		name: String(sourceReminder?.customerName || '').trim(),
		phone: String(sourceReminder?.customerPhone || '').trim(),
		note: String(sourceReminder?.note || '').trim(),
	});

	// State cho modal danh bạ chọn khách hàng
	const [showDirectoryModal, setShowDirectoryModal] = useState(false);
	const [directorySearch, setDirectorySearch] = useState('');
	const [directoryCustomers, setDirectoryCustomers] = useState([]);
	const [directoryLoading, setDirectoryLoading] = useState(false);

	const loadDirectoryCustomers = useCallback(async (searchVal = '') => {
		setDirectoryLoading(true);
		try {
			const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
			if (!token) return;
			const params = {
				page: 0,
				size: 10000, // Load all customers at once
				search: searchVal || undefined
			};
			const res = await fetchAllCustomers(params, token);
			if (res?.success && res?.data) {
				setDirectoryCustomers(res.data.content || []);
			}
		} catch (error) {
			console.error('Error loading directory customers:', error);
		} finally {
			setDirectoryLoading(false);
		}
	}, []);

	useEffect(() => {
		if (showDirectoryModal) {
			loadDirectoryCustomers(directorySearch);
		}
	}, [showDirectoryModal, directorySearch, loadDirectoryCustomers]);

	const handleSelectCustomerFromDirectory = (customer) => {
		setInfo((prev) => ({
			...prev,
			phone: customer.phone,
			name: customer.fullName || ''
		}));
		setCustomerChecked({
			exists: true,
			fullName: customer.fullName,
			customerId: customer.customerId || customer.id,
			serviceUsageCount: customer.totalBookings || 0,
			currentRank: customer.currentRank || null
		});
		setCustomerCheckError('');
		setShowDirectoryModal(false);
		setDirectorySearch('');
	};

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
	const [defaultSafetyCategories, setDefaultSafetyCategories] = useState([]);
	const [fallbackConfigs, setFallbackConfigs] = useState([]); // Cấu hình Markup toàn phiếu cho bảng báo giá

	// Tải danh sách cấu hình markup (fallback pricing) đang hoạt động — giống ServiceTicketDetail
	useEffect(() => {
		const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
		if (!token) return;
		let active = true;
		fetchFallbackPricingConfigs({ size: 100 }, token)
			.then((res) => {
				if (!active) return;
				if (res?.data?.content) {
					setFallbackConfigs(res.data.content.filter((cfg) => cfg.isActive));
				}
			})
			.catch((err) => {
				console.error('Failed to load fallback pricing configs:', err);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
		if (!token) return;
		let active = true;
		getDefaultSafetyInspectionCategories(token)
			.then((res) => {
				if (active) setDefaultSafetyCategories(Array.isArray(res?.data) ? res.data : []);
			})
			.catch(() => {
				if (active) setDefaultSafetyCategories([]);
			});
		return () => {
			active = false;
		};
	}, []);

	// Logic kiểm tra điều kiện để cho phép bấm nút "Tạo lịch"
	// - Lịch hẹn phải có ngày và giờ hợp lệ
	// - Nếu chọn lịch thủ công, phải có dữ liệu khung giờ (dù là danh sách khung giờ chung hay trạng thái chỗ trống theo ngày) và không có lỗi khi tải dữ liệu
	// - Không đang trong quá trình submit hoặc bị khóa submit
	// - Nếu nguồn tạo lịch từ lời nhắc, phải đảm bảo lời nhắc đó không chặn việc tạo lịch (chưa được xác nhận)
	const canSubmit = useMemo(() => {
		return (
			info.name.trim() &&
			info.phone.trim() &&
			!customerCheckError &&
			schedule.date &&
			schedule.time &&
			(!schedule.date || (!slotsLoading && !slotsError)) &&
			!submitting &&
			!submitLocked &&
			!sourceReminderBlocksBooking
		);
	}, [info.name, info.phone, customerCheckError, schedule.date, schedule.time, slotsLoading, slotsError, submitting, submitLocked, sourceReminderBlocksBooking]);

	// Kiểm tra xem có tồn tại một bản nháp báo giá nào đang hoạt động hay không (bao gồm cả bản nháp hiện tại trong state và bản nháp đã lưu trong LocalStorage)
	const hasActiveEstimateDraft = useMemo(() => {
		return Boolean(estimateId || selectedEstimateItems.length > 0 || hasStoredEstimateDraft());
	}, [estimateId, selectedEstimateItems.length]);

	// Dữ liệu cho hóa đơn/phiếu dịch vụ in ấn
	const printTicket = useMemo(() => {
		const toNumberOrZero = (val) => {
			const n = typeof val === 'number' ? val : Number(String(val ?? '').trim());
			return Number.isFinite(n) ? n : 0;
		};

		const pickMoneyDisplayValue = (withVatValue, baseValue) => {
			const withVatNum = toNumberOrZero(withVatValue);
			if (withVatNum > 0) return withVatNum;
			const baseNum = toNumberOrZero(baseValue);
			return baseNum > 0 ? baseNum : 0;
		};

		const getFinalPriceDisplay = (item, fallbackValue) => {
			const rawFinalPrice = item?.finalPrice ?? item?.final_price;
			if (rawFinalPrice == null || String(rawFinalPrice).trim() === '') return fallbackValue;
			const finalPrice = toNumberOrZero(rawFinalPrice);
			return finalPrice > 0 ? finalPrice : fallbackValue;
		};

		const items = selectedEstimateItems.map((item) => {
			const qty = Number(item.quantity || 1);
			const price = Number(item.unitPrice || item.price || 0);
			const discount = toNumberOrZero(item.discountAmount || item.discount_amount || 0);

			// Tính toán subTotal hiển thị (ưu tiên sau thuế)
			const rawSubTotal = item.subTotal ?? item.sub_total ?? Math.max(0, qty * price - discount);
			const rawSubTotalWithVat = item.subTotalWithVat ?? item.subTotalWithVAT ?? 0;
			const subTotalDisplay = pickMoneyDisplayValue(rawSubTotalWithVat, rawSubTotal);

			// finalPrice là giá cuối cùng đã áp dụng KM & thuế nếu có
			const finalPriceDisplay = getFinalPriceDisplay(item, subTotalDisplay);

			return {
				...item,
				categoryName: item.categoryName || item.newCategoryName || '',
				itemName: item.itemName || item.productName || item.serviceName || item.name || '',
				quantity: qty,
				unitPrice: price,
				discountAmount: discount,
				subTotal: finalPriceDisplay,
				_subTotalDisplay: subTotalDisplay,
				_finalPriceDisplay: finalPriceDisplay,
			};
		});

		const subtotal = items.reduce((acc, it) => acc + (it._subTotalDisplay || 0), 0);
		const discountAmount = items.reduce((acc, it) => {
			const lineSubtotal = it._subTotalDisplay || 0;
			const lineFinal = it._finalPriceDisplay || 0;
			const backendDiscount = it.discountAmount || 0;
			return acc + Math.max(backendDiscount, lineSubtotal - lineFinal, 0);
		}, 0);
		const total = Math.max(0, subtotal - discountAmount);

		return {
			customer: {
				name: info.name || '-',
				phone: info.phone || '-',
				email: '-',
			},
			vehicle: {
				model: '-',
				licensePlate: '-',
				odometerKm: '',
			},
			ticketCode: selectedEstimate?.serviceTicketCode || selectedEstimate?.ticketCode || 'BÁO GIÁ NHÁP',
			receivedAtDisplay: schedule.date ? `${schedule.date} ${schedule.time}` : 'Chưa chọn',
			handoverAtDisplay: '',
			safetyInspectionEnabled: true,
			defaultCategories: defaultSafetyCategories,
			recommendation: '',
			requestNote: info.note || '',
			invoice: {
				items,
				subtotal,
				discountAmount,
				vatAmount: 0,
				total,
			},
		};
	}, [info.name, info.phone, info.note, schedule.date, schedule.time, selectedEstimate, selectedEstimateItems, defaultSafetyCategories]);

	const handlePrintReceipt = () => {
		globalThis.setTimeout?.(() => {
			globalThis.requestAnimationFrame?.(() => globalThis.window?.print?.());
		}, 120);
	};

	const displaySubmitError = submitError || (sourceReminderBlocksBooking ? 'Chỉ có thể tạo lịch từ lời nhắc đã xác nhận.' : '');

	// Các handler chính được sử dụng trong component, được tách ra và quản lý trong useCreateBookingHandlers
	const { handleUseNow, handleShowManualSchedule, handlePickSlot, handleSubmit, handleGoToCheckIn, handleReset, handleCancelEstimate } =
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

			setSelectedIds: () => {},
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

	const hasItems = selectedEstimateItems.length > 0;

	return (
		<div className={`${bookingStyles['booking-page']} ${styles.page}`}>
			<div className={styles.screenOnly}>
				<h2 className={`${bookingStyles['section-title']} ${styles.title}`}>Tạo lịch cho khách hàng</h2>

				{sourceReminderId && (
					<div className={styles.reminderSource}>
						Đang tạo lịch từ lời nhắc #{sourceReminderId}
					</div>
				)}
				{sourceReminderBlocksBooking && (
					<div className={`${psStyles.slotStatus} ${psStyles.slotStatusError}`}>
						Chỉ có thể tạo lịch khi lời nhắc đã xác nhận.
					</div>
				)}

				{/* ===== Hàng trên: form khách (trái) + box thông tin khách (phải) ===== */}
				<div className={psStyles.topGrid}>
					<section className={`ui-card ${psStyles.customerFormCard}`}>
						<div className={psStyles.cardTitleRow}>
							<h3 className={psStyles.cardTitle}>Thông tin khách hàng</h3>
							<div className={psStyles.cardTitleActions}>
								<button
									type="button"
									className={styles.selectDirectoryBtn}
									onClick={() => {
										setShowDirectoryModal(true);
										loadDirectoryCustomers('');
									}}
									disabled={submitLocked}
									title="Chọn khách hàng từ danh bạ"
								>
									<Contact size={14} style={{ marginRight: 4 }} />
									Chọn từ danh bạ
								</button>
							</div>
						</div>

						<div className="ui-field">
							<label htmlFor="create-booking-phone">
								Số điện thoại (<span className={psStyles.required}>*</span>)
							</label>
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
							{checkingCustomer && <div className={psStyles.hintText}>Đang kiểm tra...</div>}
							{customerCheckError && <div className={psStyles.errorText}>{customerCheckError}</div>}
							{customerChecked?.exists === true && (
								<div className={psStyles.okText} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
									<span>
										Khách hàng đã tồn tại: {customerChecked.fullName}
										{customerChecked.serviceUsageCount !== undefined && customerChecked.serviceUsageCount !== null && (
											<span> (Số lần sử dụng dịch vụ: <strong>{customerChecked.serviceUsageCount}</strong> lần)</span>
										)}
									</span>
								</div>
							)}
							{customerChecked?.exists === false && (
								<div className={psStyles.warnText}>Chưa có khách hàng này trong hệ thống.</div>
							)}
						</div>

						<div className="ui-field">
							<label htmlFor="create-booking-fullname">
								Họ và tên (<span className={psStyles.required}>*</span>)
							</label>
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

						<div className="ui-field">
							<label htmlFor="create-booking-note">Yêu cầu đặc biệt (không bắt buộc)</label>
							<textarea
								id="create-booking-note"
								rows="3"
								placeholder="VD: Kiểm tra thêm tiếng kêu ở bánh trước, cần lấy xe trước 17h, ..."
								value={info.note}
								onChange={(e) => setInfo((prev) => ({ ...prev, note: e.target.value }))}
								maxLength={NOTE_MAX_LENGTH}
								disabled={submitLocked}
							/>
							<div className={psStyles.hintText}>{noteRemaining} ký tự còn lại</div>
						</div>
					</section>

					<section className={`ui-card ${psStyles.customerInfoCard}`}>
						<h3 className={psStyles.cardTitle}>Khách hàng</h3>
						{customerChecked?.exists ? (
							<div className={psStyles.customerInfoBody}>
								<div className={psStyles.customerAvatar}>{getInitials(customerChecked.fullName || info.name)}</div>
								<div className={psStyles.customerInfoRows}>
									<div className={psStyles.customerInfoRow}>
										<span className={psStyles.customerInfoLabel}>Họ tên:</span>
										<span className={psStyles.customerInfoValue}>{customerChecked.fullName || info.name || '-'}</span>
									</div>
									<div className={psStyles.customerInfoRow}>
										<span className={psStyles.customerInfoLabel}>Điện thoại:</span>
										<span className={psStyles.customerInfoValue}>{info.phone || '-'}</span>
									</div>
									<div className={psStyles.customerInfoRow}>
										<span className={psStyles.customerInfoLabel}>Hạng khách:</span>
										<span className={psStyles.customerInfoValue}>
											<RankBadge rank={customerChecked.currentRank || 'BRONZE'} size="sm" />
										</span>
									</div>
									{customerChecked.serviceUsageCount != null && (
										<div className={psStyles.customerInfoRow}>
											<span className={psStyles.customerInfoLabel}>Số lần dùng dịch vụ:</span>
											<span className={psStyles.customerInfoValue}>{customerChecked.serviceUsageCount}</span>
										</div>
									)}
								</div>
							</div>
						) : (
							<div className={psStyles.customerInfoEmpty}>
								Nhập số điện thoại hoặc chọn từ danh bạ để hiển thị thông tin khách.
							</div>
						)}
					</section>
				</div>

				{/* ===== Thông tin hẹn lịch ===== */}
				<section className={`ui-card ${psStyles.scheduleCard}`}>
					<h3 className={psStyles.cardTitle}>Thông tin hẹn lịch</h3>
					<div className={bookingStyles['booking-actions']} style={{ padding: 0, marginTop: 0, marginBottom: 16 }}>
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
						<div className={psStyles.hintText} style={{ marginBottom: 8 }}>
							Đang đặt cho slot: {schedule.date} {schedule.time}
						</div>
					)}

					{/* Giao diện chọn ngày & giờ thủ công */}
					{showSchedulePicker && scheduleMode === 'manual' && (
						<>
							<div className={psStyles.scheduleRow}>
								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label htmlFor="desiredDate">Ngày mong muốn</label>
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
									{isDateOutOfRange && (
										<div className={psStyles.hintText}>Chỉ cho phép chọn trong 10 ngày tới.</div>
									)}
								</div>
								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label htmlFor="desiredTime">Khung giờ</label>
									<input
										id="desiredTime"
										type="time"
										value={schedule.time}
										onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
										disabled={!schedule.date || slotsLoading || !!slotsError}
									/>
								</div>
							</div>

							<div className={psStyles.slotContainer}>
								<div className={psStyles.slotTitle}>Chọn khung giờ theo danh sách</div>

								{baseSlotsLoading && <div className={psStyles.slotStatus}>Đang tải khung giờ...</div>}
								{!baseSlotsLoading && baseSlotsError && (
									<div className={`${psStyles.slotStatus} ${psStyles.slotStatusError}`}>{baseSlotsError}</div>
								)}

								{!!schedule.date && slotsLoading && <div className={psStyles.slotStatus}>Đang tải trạng thái chỗ trống...</div>}
								{!!schedule.date && !slotsLoading && slotsError && (
									<div className={`${psStyles.slotStatus} ${psStyles.slotStatusError}`}>{slotsError}</div>
								)}
								{!!selectedSlotStatus?.status && (
									<div
										className={`${psStyles.slotStatus} ${selectedSlotStatus.isOverCapacity || selectedSlotStatus.isUnavailable ? psStyles.slotStatusError : ''}`}
									>
										{selectedSlotStatus.occupancyText ? ` (${selectedSlotStatus.occupancyText})` : ''}
										{selectedSlotStatus.isOverCapacity ? ' — Đã vượt quá sức chứa! Nhân viên cần xem xét trước khi tạo lịch.' : ''}
									</div>
								)}

								<div className={psStyles.slotGrid}>
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
													psStyles.slotBtn,
													active ? psStyles.slotBtnActive : '',
													isDisabled ? psStyles.slotBtnDisabled : '',
												].filter(Boolean).join(' ')}
												onClick={() => !isDisabled && !blockPicking && handlePickSlot(rawTime)}
												disabled={blockPicking || isDisabled}
											>
												<div className={psStyles.slotTimeText}>{displayTime}</div>
												<div className={psStyles.slotMetaText}>
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

				{/* ===== Bảng báo giá ===== */}
				<AdvisorItemsTable
					key={estimateTableKey}
					className={`${styles.estimatePanel} ${psStyles.estimatePanel}`}
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
					fallbackConfigs={fallbackConfigs}
					onEstimateStatusChange={setSelectedEstimate}
					onEstimateEditingChange={setIsEstimateEditing}
				/>
				{hasActiveEstimateDraft && (
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
				)}

				{displaySubmitError && <div className={psStyles.errorBanner}>{displaySubmitError}</div>}

				{submitSuccess && (
					<div className={styles.successRow}>
						<div className={`${psStyles.slotStatus} ${styles.successMessage}`}>{submitSuccess}</div>
					</div>
				)}

				{/* ===== Hàng nút hành động ===== */}
				<div className={`${bookingStyles['booking-actions']} ${psStyles.actions}`}>
					{submitSuccess ? (
						<>
							<button type="button" className={bookingStyles.btn} onClick={handleReset}>
								Tạo lịch mới
							</button>
							<button
								type="button"
								className={`${bookingStyles.btn} ${bookingStyles.primary} ${styles.successBtn}`}
								onClick={() => navigate('/booking-management')}
							>
								Quản lý lịch hẹn
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
								onClick={handleReset}
								disabled={submitting || cancellingEstimate}
							>
								Làm mới
							</button>
							{hasActiveEstimateDraft && (
								<button
									type="button"
									className={bookingStyles.btn}
									onClick={handlePrintReceipt}
									disabled={submitting || cancellingEstimate}
								>
									In phiếu dịch vụ
								</button>
							)}
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
			</div>

			{hasActiveEstimateDraft && hasItems && (
				<div className={styles.printOnly}>
					<Receipt ticket={printTicket} />
				</div>
			)}

			{/* Modal danh bạ để chọn khách hàng nhanh */}
			{showDirectoryModal && (
				<div className={styles.directoryModalOverlay}>
					<div className={styles.directoryModalBackdrop} onClick={() => setShowDirectoryModal(false)} />
					<div className={styles.directoryModalContent}>
						<div className={styles.directoryModalHeader}>
							<h3>Danh bạ khách hàng</h3>
							<button type="button" className={styles.directoryModalCloseBtn} onClick={() => setShowDirectoryModal(false)}>
								<X size={18} />
							</button>
						</div>
						<div className={styles.directoryModalBody}>
							<div className={styles.directoryModalSearch}>
								<Search size={16} className={styles.directoryModalSearchIcon} />
								<input
									type="text"
									placeholder="Tìm theo tên hoặc số điện thoại..."
									value={directorySearch}
									onChange={(e) => {
										setDirectorySearch(e.target.value);
									}}
								/>
							</div>

							{directoryLoading ? (
								<div className={styles.directoryModalLoading}>
									<div className={styles.directorySpinner} />
									<p>Đang tải dữ liệu...</p>
								</div>
							) : directoryCustomers.length === 0 ? (
								<div className={styles.directoryModalEmpty}>
									<p>Không tìm thấy khách hàng nào</p>
								</div>
							) : (
								<div className={styles.directoryModalList}>
									{directoryCustomers.map((customer) => (
										<div
											key={customer.customerId || customer.id}
											className={styles.directoryModalItem}
											onClick={() => handleSelectCustomerFromDirectory(customer)}
										>
											<div className={styles.directoryModalAvatar}>
												{getInitials(customer.fullName)}
											</div>
											<div className={styles.directoryModalInfo}>
												<div className={styles.directoryModalName}>{customer.fullName}</div>
												<div className={styles.directoryModalPhone}>{customer.phone}</div>
											</div>
											<div className={styles.directoryModalEmail}>
												{customer.email || 'Chưa có email'}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
