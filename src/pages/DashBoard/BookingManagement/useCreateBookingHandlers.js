import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { staffCreateBooking } from '../../../services/bookingService.js';
import { fetchCustomerByPhone } from '../../../services/customerService.js';
import { manageServiceTicketEstimateStatus } from '../../../services/serviceTicketService.js';
import { sendEstimateNotificationZalo } from '../../../services/zaloService.js';
import {
	formatLocalDateYYYYMMDD,
	formatTimeHHmm,
	normalizeBackendTime,
	toLocalDateTime,
} from '../../../components/timeUtils.js';
import { validateTextInput } from '../../../components/inputValidation.js';

//Chuẩn hóa nhãn các buổi trong ngày (Sáng, Chiều, Tối) từ dữ liệu Backend
export const normalizePeriodLabel = (raw) => {
	if (!raw) return '';
	const v = String(raw).trim().toLowerCase();
	if (v === 'morning' || v === 'am' || v === 'sang' || v === 'sáng') return 'Sáng';
	if (v === 'afternoon' || v === 'pm' || v === 'chieu' || v === 'chiều') return 'Chiều';
	if (v === 'evening' || v === 'night' || v === 'toi' || v === 'tối') return 'Tối';
	return raw;
};

// Tạo key định dạng HH:mm để so sánh thời gian, loại bỏ sự khác biệt về định dạng thời gian khi so sánh các khung giờ.
export const timeKey = (t) => formatTimeHHmm(t || '');

//Tìm khung giờ trống tiếp theo khả thi từ danh sách có sẵn, dùng cho tính năng "Đặt ngay" để tự động chọn khung giờ gần nhất sau thời điểm hiện tại, ưu tiên các khung giờ có dữ liệu sức chứa nếu có.
const pickNextSlotFromBaseSlots = (baseSlots, now) => {
	const list = Array.isArray(baseSlots) ? baseSlots : [];
	if (!list.length) return null;

	const today = formatLocalDateYYYYMMDD(now);
	const nowTs = now.getTime();

	// Duyệt qua các slot của hôm nay để tìm slot tiếp theo có thời gian bắt đầu sau thời điểm hiện tại. Nếu tìm thấy, trả về ngày hôm nay và thời gian của slot đó.
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

// Fallback: nếu không có slot nào phù hợp trong baseSlots, làm tròn thời gian hiện tại lên block 30 phút gần nhất để chọn slot. Ví dụ: nếu bây giờ là 10:10 thì sẽ chọn 10:30; nếu bây giờ là 10:40 thì sẽ chọn 11:00.
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

// Xóa dữ liệu nháp liên quan đến báo giá dự kiến khỏi localStorage để tránh xung đột với các báo giá mới trong tương lai, đồng thời giải phóng bộ nhớ.
function clearEstimateDraftStorage(storageKey) {
	if (!storageKey) return;
	try {
		localStorage.removeItem(storageKey);
	} catch {
		// ignore storage failures
	}
}

// Custom hook để quản lý các handler liên quan đến việc tạo booking, bao gồm kiểm tra khách hàng, chọn lịch hẹn, gửi yêu cầu tạo booking, và xử lý các trạng thái liên quan đến báo giá dự kiến.
export function useCreateBookingHandlers({
	baseSlots,
	selectedIds,
	selectedItems,
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
	estimateStorageKey,
	navigate,

	setSelectedIds,
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
}) {
	const submitInFlightRef = useRef(false);	// Ref chống spam click submit

	//Hàm reset các trạng thái liên quan đến báo giá nháp
	const clearEstimateDraftLocalState = useCallback(() => {
		setSelectedEstimate(null);
		setIsEstimateEditing(false);
		setEstimateTableKey((prev) => prev + 1);
		clearEstimateDraftStorage(estimateStorageKey);
	}, [estimateStorageKey, setEstimateTableKey, setIsEstimateEditing, setSelectedEstimate]);

	// Khi submit thành công, tự động xóa dữ liệu nháp liên quan đến báo giá dự kiến để tránh xung đột với các báo giá mới trong tương lai, đồng thời giải phóng bộ nhớ.
	useEffect(() => {
		if (!submitSuccess) return;
		clearEstimateDraftLocalState();
	}, [clearEstimateDraftLocalState, submitSuccess]);

	// Khi rời trang tạo booking, tự động xóa localStorage của báo giá nháp thay vì chặn điều hướng.
	useEffect(() => {
		const handleClearDraftStorage = () => {
			clearEstimateDraftStorage(estimateStorageKey);
		};

		window.addEventListener('pagehide', handleClearDraftStorage);
		window.addEventListener('beforeunload', handleClearDraftStorage);

		return () => {
			window.removeEventListener('pagehide', handleClearDraftStorage);
			window.removeEventListener('beforeunload', handleClearDraftStorage);
			handleClearDraftStorage();
		};
	}, [estimateStorageKey]);

	// Kiểm tra số điện thoại khách hàng xem đã có trong DB chưa
	const handleCheckCustomer = useCallback(async () => {
		setCheckingCustomer(true);
		setCustomerCheckError('');
		setCustomerChecked(null);
		const phone = String(info?.phone ?? '').trim();
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
	}, [info?.phone, setCheckingCustomer, setCustomerCheckError, setCustomerChecked, setInfo]);

	// Handler khi chọn "Đặt ngay" 
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

	// Handler khi chọn "Chọn ngày giờ" để hiển thị giao diện chọn lịch hẹn thủ công
	const handleShowManualSchedule = useCallback(() => {
		setScheduleMode('manual');
		setShowSchedulePicker(true);
	}, [setScheduleMode, setShowSchedulePicker]);

	// Handler khi chọn một slot thời gian cụ thể từ Grid
	const handlePickSlot = useCallback(
		(rawTime) => {
			if (scheduleMode !== 'manual') return;
			if (!schedule?.date) return;
			if (slotsLoading || slotsError) return;
			const hhmm = formatTimeHHmm(rawTime);
			// Khi người dùng chọn một slot, cập nhật thời gian trong schedule nhưng giữ nguyên ngày đã chọn, đồng thời đảm bảo định dạng thời gian được chuẩn hóa để tránh lỗi khi gửi lên backend.
			setSchedule((prev) => ({ ...prev, time: hhmm }));
		},
		[schedule?.date, scheduleMode, setSchedule, slotsError, slotsLoading],
	);

	// Handler khi bấm nút "Tạo booking" để gửi yêu cầu tạo booking lên backend, bao gồm các bước validate dữ liệu, chuẩn hóa dữ liệu, gọi API, và xử lý kết quả trả về.
	const handleSubmit = useCallback(async () => {
		// CHẶN SUBMIT TRÙNG LẶP: nếu đang trong quá trình submit hoặc đã submit thành công và chưa reset form sẽ không cho phép submit tiếp và hiển thị thông báo yêu cầu làm mới form để tạo lịch mới.
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

		// VALIDATE GHI CHÚ
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

		// Chuẩn bị Payload gửi lên Server
		const catalogItemIds = (Array.isArray(selectedIds) ? selectedIds : [])
			.map(Number)
			.filter((n) => Number.isFinite(n) && n >= 0);
		// Nếu có báo giá thì gửi estimateId
		const estimateIdNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);

		try {
			const payload = {
				reminderId: sourceReminderId ? Number(sourceReminderId) : undefined,
				appointmentDate: schedule?.date,
				appointmentTime: normalizeBackendTime(schedule?.time),
				userNote: trimmedNote,
				fullName: String(info?.name ?? '').trim(),
				phone: String(info?.phone ?? '').trim(),
			};
			if (Number.isFinite(estimateIdNum) && estimateIdNum > 0) {
				payload.estimateId = estimateIdNum;
			} else if (catalogItemIds.length > 0) {
				payload.selectedServiceIds = catalogItemIds;
			}

			const res = await staffCreateBooking(payload);

			const data = res?.data;
			const bookingCodeRaw = data?.bookingCode ?? data?.requestId ?? data?.code;
			const bookingCode = String(bookingCodeRaw ?? '').trim();
			const msg = bookingCode ? `Tạo booking thành công. Mã: ${bookingCode}` : 'Tạo booking thành công.';

			// Lưu thông tin lịch đã tạo để phục vụ tính năng "Chuyển sang Check-in"
			setCreatedBookingForCheckIn(bookingCode ? {
				bookingCode,
				booking: {
					bookingCode,
					scheduledDate: schedule?.date || '',
					scheduledTime: schedule?.time || '',
					customerName: String(info?.name ?? '').trim(),
					customerPhone: String(info?.phone ?? '').trim(),

				},
			} : null);

			setSubmitSuccess(msg);
			setSubmitLocked(true);
			toast(msg, { containerId: 'app-toast' });

			// ===== GỬI THÔNG BÁO ZALO SAU KHI TẠO BOOKING THÀNH CÔNG =====
			// Xây dựng danh sách tên sản phẩm từ estimate items
			const productNames = (Array.isArray(selectedItems) ? selectedItems : [])
				.filter(item => item && !item.isRemoved)
				.map(item => String(item?.productName ?? item?.serviceName ?? item?.name ?? '').trim())
				.filter(name => name.length > 0);

			// Tính tổng giá tiền từ estimate items
			const totalPrice = (Array.isArray(selectedItems) ? selectedItems : [])
				.filter(item => item && !item.isRemoved)
				.reduce((sum, item) => {
					const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0);
					const quantity = Number(item?.quantity ?? 1);
					const itemPrice = Number.isFinite(unitPrice) && Number.isFinite(quantity) ? unitPrice * quantity : 0;
					return sum + itemPrice;
				}, 0);

			const zaloPayload = {
				number: String(info?.phone ?? '').trim(),
				customerName: String(info?.name ?? '').trim(),
				productName: productNames.length > 0 ? productNames : ['Dịch vụ bảo trì'],
				orderCode: bookingCode,
				garageLocation: 'Michelin Sơn Tây',
				totalPrice: String(totalPrice),
			};

			const token = localStorage.getItem('authToken');
			if (token && bookingCode) {
				try {
					await sendEstimateNotificationZalo(zaloPayload, token);
					toast('Đã gửi thông báo cho khách hàng qua Zalo.', { containerId: 'app-toast' });
				} catch (zaloErr) {
					// Log lỗi nhưng không block luồng tạo booking
					console.warn('Gửi thông báo Zalo thất bại:', zaloErr?.message);
					// Có thể thêm toast warning tùy chọn
					// toast(`Cảnh báo: Gửi Zalo thất bại (${zaloErr?.message})`, { containerId: 'app-toast' });
				}
			}
		} catch (err) {
			setSubmitError(err?.message || 'Không thể tạo lịch hẹn.');
		} finally {
			setSubmitting(false);
			submitInFlightRef.current = false;
		}
	}, [
		canSubmit,
		estimateId,
		info?.name,
		info?.note,
		info?.phone,
		schedule?.date,
		schedule?.time,
		selectedIds,
		selectedItems,
		sourceReminderId,
		submitLocked,
		setCreatedBookingForCheckIn,
		setSubmitError,
		setSubmitSuccess,
		setSubmitLocked,
		setSubmitting,
	]);
	
	// Handler khi bấm nút "Chuyển sang Check-in" sau khi tạo booking thành công, sẽ điều hướng sang trang Check-in với thông tin booking đã tạo để tiếp tục quy trình check-in
	const handleGoToCheckIn = useCallback(() => {
		const code = String(createdBookingForCheckIn?.bookingCode ?? '').trim();
		const bookingDate = String(createdBookingForCheckIn?.booking?.scheduledDate || schedule?.date || '').slice(0, 10);
		const today = formatLocalDateYYYYMMDD(new Date());
		if (bookingDate !== today) {
			toast('Chỉ có thể chuyển sang Check-in với lịch hẹn trong ngày hôm nay.', { containerId: 'app-toast' });
			return;
		}
		if (code) {
			navigate('/check-in', { state: { bookingCode: code, booking: createdBookingForCheckIn?.booking || null } });
			return;
		}
		navigate('/check-in');
	}, [createdBookingForCheckIn?.booking, createdBookingForCheckIn?.bookingCode, navigate, schedule?.date]);

	// Handler khi bấm nút "Làm mới" để reset toàn bộ form về trạng thái ban đầu, bao gồm cả các trạng thái liên quan đến báo giá dự kiến, đồng thời nếu có báo giá dự kiến đang tồn tại sẽ hiển thị cảnh báo xác nhận trước khi reset để tránh mất dữ liệu
	const resetForm = useCallback(() => {
		submitInFlightRef.current = false;
		setSelectedIds([]);
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
		setInfo,
		setSchedule,
		setScheduleMode,
		setSelectedIds,
		setShowSchedulePicker,
		setSlotsError,
		setSlotsLoading,
		setSubmitError,
		setSubmitSuccess,
		setSubmitLocked,
		setSubmitting,
	]);

	// Hàm hủy báo giá dự kiến
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
	}, [
		cancellingEstimate,
		clearEstimateDraftLocalState,
		estimateId,
		setCancellingEstimate,
		setSubmitError,
		setSubmitSuccess,
	]);

	// Handler khi bấm nút "Làm mới" để reset form, nếu có báo giá dự kiến đang tồn tại sẽ hiển thị cảnh báo 
	const handleReset = useCallback(async () => {
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
	}, [
		cancelEstimateDraft,
		hasActiveEstimateDraft,
		resetForm,
		setCheckingCustomer,
		setCustomerCheckError,
		setCustomerChecked,
	]);

	// Handler khi bấm nút "Hủy báo giá dự kiến" để hủy báo giá hiện tại, sẽ hiển thị cảnh báo xác nhận trước khi hủy để tránh mất dữ liệu, nếu xác nhận sẽ gọi API hủy báo giá và reset form về trạng thái ban đầu.
	const handleCancelEstimate = useCallback(async () => {
		if (!hasActiveEstimateDraft) return;
		const confirmed = globalThis.confirm('Bạn có chắc chắn muốn hủy báo giá dự kiến này không?');
		if (!confirmed) return;
		await cancelEstimateDraft();
	}, [cancelEstimateDraft, hasActiveEstimateDraft]);

	return {
		handleCheckCustomer,
		handleUseNow,
		handleShowManualSchedule,
		handlePickSlot,
		handleSubmit,
		handleGoToCheckIn,
		handleReset,
		handleCancelEstimate,
	};
}
