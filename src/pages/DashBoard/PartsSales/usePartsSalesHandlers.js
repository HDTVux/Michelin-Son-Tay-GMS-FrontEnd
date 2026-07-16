import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { fetchCustomerByPhone } from '../../../services/customerService.js';
import { fetchAllCustomers } from '../../../services/adminService.js';
import {
	createPartsSale,
	manageServiceTicketEstimateStatus,
	applyPromotionToEstimate,
	unapplyPromotionFromEstimate,
} from '../../../services/serviceTicketService.js';
import { fetchAvailablePromotions, fetchPromotionByCode } from '../../../services/promotionService.js';
import { fetchFallbackPricingConfigs } from '../../../services/warehouseService.js';
import { fetchAllSlots, fetchAvailableSlotStaff, staffCreateBooking } from '../../../services/bookingService.js';
import { sendEstimateNotificationZalo } from '../../../services/zaloService.js';
import {
	buildDateOptions,
	formatTimeHHmm,
	isPastSlot,
	normalizeBackendTime,
} from '../../../components/timeUtils.js';

// Chuẩn hóa nhãn các buổi trong ngày (Sáng, Chiều, Tối) từ dữ liệu Backend
const normalizePeriodLabel = (raw) => {
	if (!raw) return '';
	const v = String(raw).trim().toLowerCase();
	if (v === 'morning' || v === 'am' || v === 'sang' || v === 'sáng') return 'Sáng';
	if (v === 'afternoon' || v === 'pm' || v === 'chieu' || v === 'chiều') return 'Chiều';
	if (v === 'evening' || v === 'night' || v === 'toi' || v === 'tối') return 'Tối';
	return raw;
};

const timeKey = (t) => formatTimeHHmm(t || '');

export const PARTS_SALES_ESTIMATE_STORAGE_KEY = 'parts-sales:draft-estimate';

const notify = (msg) => toast(msg, { containerId: 'app-toast' });

const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('staffToken');

const toNumberOrNull = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) && n > 0 ? n : null;
};

// Trích xuất promotionId/code/type từ nhiều shape response khác nhau (giống ServiceTicketDetail)
const getPromotionId = (promo) =>
	toNumberOrNull(promo?.promotionId ?? promo?.id ?? promo?.promotion_id);
const getPromotionCode = (promo) =>
	String(promo?.promotionCode ?? promo?.code ?? promo?.promotion_code ?? '').trim();
const getPromotionType = (promo) =>
	String(promo?.promotionType ?? promo?.type ?? '').trim().toUpperCase();

const buildPromotionLabel = (promo) => {
	if (!promo) return '';
	const code = getPromotionCode(promo);
	const name = String(promo?.name ?? '').trim();
	const type = getPromotionType(promo);
	const percent = Number(promo?.discountPercent ?? promo?.discountValue ?? 0);
	const percentText = type === 'PERCENT' && Number.isFinite(percent) && percent > 0 ? ` (-${percent}%)` : '';
	return [code, name].filter(Boolean).join(' - ') + percentText;
};

/**
 * Hook quản lý toàn bộ logic màn Bán linh kiện (parts sales):
 * khách hàng (lookup SĐT + danh bạ), khuyến mãi trên báo giá,
 * lưu nháp / hủy / thanh toán (tạo phiếu PARTS_SALE 1 bước + điều hướng thu ngân).
 */
export function usePartsSalesHandlers({ navigate }) {
	// ===== Khách hàng =====
	const [phone, setPhone] = useState('');
	const [customer, setCustomer] = useState(null); // { customerId, fullName, phone, customerType? }
	const [checkingCustomer, setCheckingCustomer] = useState(false);
	const [customerCheckError, setCustomerCheckError] = useState('');
	const [customerNotFound, setCustomerNotFound] = useState(false);
	const [note, setNote] = useState('');

	// Modal danh bạ
	const [showDirectoryModal, setShowDirectoryModal] = useState(false);
	const [directorySearch, setDirectorySearch] = useState('');
	const [directoryCustomers, setDirectoryCustomers] = useState([]);
	const [directoryLoading, setDirectoryLoading] = useState(false);

	// Modal tạo khách mới
	const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

	// ===== Báo giá (AdvisorItemsTable quản lý; page nhận qua onEstimateStatusChange) =====
	const [selectedEstimate, setSelectedEstimate] = useState(null);
	const [estimateTableKey, setEstimateTableKey] = useState(0);
	const [cancelling, setCancelling] = useState(false);

	const estimateId = useMemo(() => {
		return toNumberOrNull(selectedEstimate?.estimateId ?? selectedEstimate?.id);
	}, [selectedEstimate]);

	const estimateStatus = String(selectedEstimate?.status ?? selectedEstimate?.estimateStatus ?? '')
		.trim()
		.toUpperCase();

	// ===== Khuyến mãi =====
	const [availablePromotions, setAvailablePromotions] = useState([]);
	const [promotionsLoading, setPromotionsLoading] = useState(false);
	const [promoCode, setPromoCode] = useState('');
	const [selectedPromotionId, setSelectedPromotionId] = useState('');
	const [appliedPromotion, setAppliedPromotion] = useState(null);
	const [promoApplying, setPromoApplying] = useState(false);
	const [promoError, setPromoError] = useState('');

	// ===== Thanh toán =====
	const [paying, setPaying] = useState(false);
	const [payError, setPayError] = useState('');
	const payInFlightRef = useRef(false);

	// ===== Đặt lịch hẹn =====
	const [isScheduling, setIsScheduling] = useState(false);
	const [scheduleDate, setScheduleDate] = useState('');
	const [scheduleTime, setScheduleTime] = useState('');
	const [baseSlots, setBaseSlots] = useState([]);
	const [baseSlotsLoading, setBaseSlotsLoading] = useState(false);
	const [baseSlotsError, setBaseSlotsError] = useState('');
	const [availableSlots, setAvailableSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState('');

	const dateOptions = useMemo(() => buildDateOptions(10), []);

	// Fetch base slots when scheduling is enabled
	useEffect(() => {
		if (!isScheduling) return;
		const token = getToken();
		if (!token) {
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
	}, [isScheduling]);

	// Fetch available slot capacities when date changes
	useEffect(() => {
		if (!isScheduling) return;
		const token = getToken();
		if (!scheduleDate) {
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

		fetchAvailableSlotStaff(scheduleDate, token, 60)
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
	}, [isScheduling, scheduleDate]);

	const displaySlots = useMemo(() => {
		if (!scheduleDate) return baseSlots;
		const slots = !slotsLoading && !slotsError ? availableSlots : baseSlots;
		return slots.filter((s) => !isPastSlot(scheduleDate, s?.startTime));
	}, [availableSlots, baseSlots, scheduleDate, slotsError, slotsLoading]);

	const handlePickSlot = useCallback(
		(rawTime) => {
			if (!scheduleDate) return;
			if (slotsLoading || slotsError) return;
			const hhmm = formatTimeHHmm(rawTime);
			setScheduleTime(hhmm);
		},
		[scheduleDate, slotsError, slotsLoading],
	);

	// ===== Cấu hình Markup toàn phiếu (fallback pricing) cho AdvisorItemsTable =====
	const [fallbackConfigs, setFallbackConfigs] = useState([]);

	useEffect(() => {
		const token = getToken();
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

	// Tự động kiểm tra SĐT khách (debounce 500ms) — cùng logic với /create-booking
	useEffect(() => {
		const value = String(phone ?? '').trim();
		if (!value) {
			setCustomer(null);
			setCustomerCheckError('');
			setCustomerNotFound(false);
			return;
		}
		if (!/^\d+$/.test(value)) {
			setCustomer(null);
			setCustomerNotFound(false);
			setCustomerCheckError('Số điện thoại chỉ được chứa các chữ số.');
			return;
		}
		setCustomerCheckError('');
		setCustomerNotFound(false);

		let active = true;
		const timer = setTimeout(async () => {
			const isValidVNPhone = /^(03|05|07|08|09)\d{8}$/.test(value);
			if (!isValidVNPhone) {
				if (active) setCustomerCheckError('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).');
				return;
			}
			setCheckingCustomer(true);
			try {
				const token = getToken();
				if (!token) {
					if (active) setCustomerCheckError('Vui lòng đăng nhập để kiểm tra khách hàng.');
					return;
				}
				const res = await fetchCustomerByPhone(value, token);
				if (!active) return;
				if (res?.data?.exists && res?.data?.customerId) {
					setCustomer({
						customerId: res.data.customerId,
						fullName: res.data.fullName || '',
						phone: value,
						customerType: res.data.customerType || null,
						serviceUsageCount: res.data.serviceUsageCount ?? null,
					});
					setCustomerNotFound(false);
				} else {
					setCustomer(null);
					setCustomerNotFound(true);
				}
			} catch (err) {
				if (!active) return;
				setCustomerCheckError(err?.message || 'Không thể kiểm tra khách hàng.');
			} finally {
				if (active) setCheckingCustomer(false);
			}
		}, 500);

		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [phone]);

	// Danh bạ khách hàng
	const loadDirectoryCustomers = useCallback(async (searchVal = '') => {
		setDirectoryLoading(true);
		try {
			const token = getToken();
			if (!token) return;
			const res = await fetchAllCustomers({ page: 0, size: 10000, search: searchVal || undefined }, token);
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

	const handleSelectCustomerFromDirectory = useCallback((c) => {
		setPhone(c.phone || '');
		setCustomer({
			customerId: c.customerId || c.id,
			fullName: c.fullName || '',
			phone: c.phone || '',
			customerType: c.customerType || null,
		});
		setCustomerNotFound(false);
		setCustomerCheckError('');
		setShowDirectoryModal(false);
		setDirectorySearch('');
	}, []);

	const handleCustomerCreated = useCallback((created) => {
		if (!created) return;
		const createdId = toNumberOrNull(created.customerId ?? created.id);
		setPhone(created.phone || '');
		if (createdId) {
			setCustomer({
				customerId: createdId,
				fullName: created.fullName || '',
				phone: created.phone || '',
				customerType: created.customerType || null,
			});
			setCustomerNotFound(false);
		}
		setShowCreateCustomerModal(false);
	}, []);

	// Tải khuyến mãi khả dụng khi đã có khách hàng
	useEffect(() => {
		const customerId = customer?.customerId;
		if (!customerId) {
			setAvailablePromotions([]);
			return;
		}
		let active = true;
		const token = getToken();
		if (!token) return;
		setPromotionsLoading(true);
		fetchAvailablePromotions(token, '', customerId)
			.then((res) => {
				if (!active) return;
				const raw = res?.data;
				// API có thể trả list phẳng hoặc group theo loại
				const list = Array.isArray(raw)
					? raw
					: [...(raw?.PERCENT ?? []), ...(raw?.BUY_X_GET_Y ?? [])];
				setAvailablePromotions(list.filter(Boolean));
			})
			.catch(() => {
				if (active) setAvailablePromotions([]);
			})
			.finally(() => {
				if (active) setPromotionsLoading(false);
			});
		return () => {
			active = false;
		};
	}, [customer?.customerId]);

	const canApplyPromotion = Boolean(estimateId && (estimateStatus === '' || estimateStatus === 'DRAFT'));

	const handleApplyPromotion = useCallback(async () => {
		if (promoApplying) return;
		setPromoError('');
		if (!estimateId) {
			notify('Vui lòng lưu báo giá trước khi áp dụng khuyến mãi.');
			return;
		}
		if (appliedPromotion) {
			setPromoError('Báo giá đã có mã giảm giá. Vui lòng hủy mã hiện tại trước.');
			return;
		}
		const token = getToken();
		if (!token) {
			notify('Vui lòng đăng nhập để áp dụng khuyến mãi.');
			return;
		}

		let picked = null;
		const code = String(promoCode || '').trim();
		try {
			setPromoApplying(true);
			if (code) {
				const res = await fetchPromotionByCode(code, token);
				picked = Array.isArray(res?.data) ? res.data[0] : res?.data;
			} else if (selectedPromotionId) {
				picked = availablePromotions.find((p) => String(getPromotionId(p)) === String(selectedPromotionId)) ?? null;
			}
			if (!picked) {
				setPromoError('Vui lòng nhập mã hoặc chọn khuyến mãi từ danh sách.');
				return;
			}
			const promotionId = getPromotionId(picked);
			const promotionCode = getPromotionCode(picked);
			if (!promotionId || !promotionCode) {
				setPromoError('Khuyến mãi thiếu promotionId hoặc promotionCode.');
				return;
			}
			const applyRes = await applyPromotionToEstimate(promotionId, estimateId, promotionCode, token);
			// Response trả về báo giá đã cập nhật (items + totalPrice sau giảm giá)
			if (applyRes?.data) {
				setSelectedEstimate((prev) => ({ ...(prev ?? {}), ...applyRes.data }));
			}
			setAppliedPromotion({ promotionId, promotionCode, label: buildPromotionLabel(picked), raw: picked });
			setPromoCode('');
			setSelectedPromotionId('');
			notify('Đã áp dụng khuyến mãi vào báo giá.');
		} catch (err) {
			setPromoError(err?.message || 'Không thể áp dụng khuyến mãi.');
		} finally {
			setPromoApplying(false);
		}
	}, [appliedPromotion, availablePromotions, estimateId, promoApplying, promoCode, selectedPromotionId]);

	const handleUnapplyPromotion = useCallback(async () => {
		if (promoApplying || !appliedPromotion || !estimateId) return;
		const token = getToken();
		if (!token) return;
		try {
			setPromoApplying(true);
			setPromoError('');
			const res = await unapplyPromotionFromEstimate(
				appliedPromotion.promotionId,
				estimateId,
				appliedPromotion.promotionCode,
				token,
			);
			if (res?.data) {
				setSelectedEstimate((prev) => ({ ...(prev ?? {}), ...res.data }));
			}
			setAppliedPromotion(null);
			notify('Đã hủy áp dụng mã giảm giá.');
		} catch (err) {
			setPromoError(err?.message || 'Không thể hủy áp dụng mã giảm giá.');
		} finally {
			setPromoApplying(false);
		}
	}, [appliedPromotion, estimateId, promoApplying]);

	// ===== Lưu nháp =====
	const handleSaveDraft = useCallback(() => {
		if (!customer?.customerId) {
			notify('Vui lòng chọn khách hàng trước khi lưu nháp.');
			return;
		}
		if (!estimateId) {
			notify('Vui lòng bấm "Lưu báo giá" trong bảng báo giá để lưu nháp báo giá.');
			return;
		}
		notify(`Đã lưu nháp báo giá #${estimateId} cho khách ${customer.fullName || customer.phone}.`);
	}, [customer, estimateId]);

	// ===== Hủy =====
	const resetAll = useCallback(() => {
		setPhone('');
		setCustomer(null);
		setCustomerCheckError('');
		setCustomerNotFound(false);
		setNote('');
		setSelectedEstimate(null);
		setAppliedPromotion(null);
		setPromoCode('');
		setSelectedPromotionId('');
		setPromoError('');
		setPayError('');
		setIsScheduling(false);
		setScheduleDate('');
		setScheduleTime('');
		setAvailableSlots([]);
		setSlotsError('');
		setSlotsLoading(false);
		try {
			localStorage.removeItem(PARTS_SALES_ESTIMATE_STORAGE_KEY);
		} catch {
			// ignore storage failures
		}
		setEstimateTableKey((prev) => prev + 1);
	}, []);

	const handleCancel = useCallback(async () => {
		const confirmed = globalThis.confirm(
			'Thao tác này sẽ hủy báo giá hiện tại và xóa dữ liệu nháp. Bạn có muốn tiếp tục không?',
		);
		if (!confirmed) return;
		setCancelling(true);
		try {
			if (estimateId) {
				const token = getToken();
				if (token) {
					await manageServiceTicketEstimateStatus(estimateId, 'CANCELLED', token);
				}
			}
			resetAll();
			notify('Đã hủy phiếu bán linh kiện.');
		} catch (err) {
			notify(err?.message || 'Không thể hủy báo giá.');
		} finally {
			setCancelling(false);
		}
	}, [estimateId, resetAll]);

	// Rời trang thì xóa localStorage nháp của bảng báo giá (giống create-booking)
	useEffect(() => {
		const clearDraft = () => {
			try {
				localStorage.removeItem(PARTS_SALES_ESTIMATE_STORAGE_KEY);
			} catch {
				// ignore storage failures
			}
		};
		window.addEventListener('pagehide', clearDraft);
		window.addEventListener('beforeunload', clearDraft);
		return () => {
			window.removeEventListener('pagehide', clearDraft);
			window.removeEventListener('beforeunload', clearDraft);
			clearDraft();
		};
	}, []);

	// ===== Thanh toán =====
	const handlePayment = useCallback(async () => {
		if (payInFlightRef.current || paying) return;
		setPayError('');
		if (!customer?.customerId) {
			notify('Vui lòng chọn khách hàng (khách phải có trong hệ thống) trước khi thanh toán.');
			return;
		}
		if (!estimateId) {
			notify('Vui lòng bấm "Lưu báo giá" trong bảng báo giá trước khi thanh toán.');
			return;
		}
		const token = getToken();
		if (!token) {
			notify('Vui lòng đăng nhập để thanh toán.');
			return;
		}

		payInFlightRef.current = true;
		setPaying(true);
		try {
			// BE làm trọn 1 transaction: tạo ticket PARTS_SALE + gán NV + giữ hàng + archive báo giá + tạo bill
			const res = await createPartsSale({ customerId: customer.customerId, estimateId, note }, token);
			const data = res?.data ?? res;
			const ticketCode = String(data?.ticketCode ?? '').trim();
			const serviceTicketId = toNumberOrNull(data?.serviceTicketId);
			if (!ticketCode || !serviceTicketId) {
				throw new Error('Tạo phiếu bán linh kiện thất bại (thiếu ticketCode/serviceTicketId).');
			}
			try {
				localStorage.removeItem(PARTS_SALES_ESTIMATE_STORAGE_KEY);
			} catch {
				// ignore storage failures
			}
			notify(`Đã tạo phiếu bán linh kiện ${ticketCode}. Chuyển sang màn thanh toán...`);
			// Điều hướng sang màn thu ngân cũ (payBill CASH/TRANSFER + VietQR)
			navigate(`/service-ticket/${encodeURIComponent(ticketCode)}/receipt-payment-method`, {
				state: { serviceTicketId, billId: toNumberOrNull(data?.billId) },
			});
		} catch (err) {
			setPayError(err?.message || 'Không thể tạo phiếu bán linh kiện.');
			notify(err?.message || 'Không thể tạo phiếu bán linh kiện.');
		} finally {
			payInFlightRef.current = false;
			setPaying(false);
		}
	}, [customer, estimateId, navigate, note, paying]);

	// ===== Hẹn lịch =====
	const handleCreateBooking = useCallback(async () => {
		if (payInFlightRef.current || paying) return;
		setPayError('');

		if (!customer?.customerId) {
			notify('Vui lòng chọn khách hàng (khách phải có trong hệ thống) trước khi hẹn lịch.');
			return;
		}
		if (!estimateId) {
			notify('Vui lòng bấm "Lưu báo giá" trong bảng báo giá trước khi hẹn lịch.');
			return;
		}
		if (!scheduleDate || !scheduleTime) {
			notify('Vui lòng chọn ngày và khung giờ hẹn.');
			return;
		}

		const token = getToken();
		if (!token) {
			notify('Vui lòng đăng nhập để hẹn lịch.');
			return;
		}

		payInFlightRef.current = true;
		setPaying(true);

		try {
			const payload = {
				appointmentDate: scheduleDate,
				appointmentTime: normalizeBackendTime(scheduleTime),
				userNote: note,
				fullName: customer.fullName || '',
				phone: customer.phone || phone,
				estimateId,
				isPartsSale: true,
			};

			const res = await staffCreateBooking(payload);
			const data = res?.data;
			const bookingCode = String(data?.bookingCode ?? data?.code ?? '').trim();
			const msg = bookingCode ? `Hẹn lịch thành công. Mã: ${bookingCode}` : 'Hẹn lịch thành công.';

			try {
				localStorage.removeItem(PARTS_SALES_ESTIMATE_STORAGE_KEY);
			} catch {
				// ignore storage failures
			}

			notify(msg);

			// Gửi thông báo Zalo giống CreateBooking
			const productNames = (Array.isArray(selectedEstimate?.items) ? selectedEstimate.items : [])
				.filter(item => item && !item.isRemoved)
				.map(item => String(item?.productName ?? item?.serviceName ?? item?.name ?? '').trim())
				.filter(name => name.length > 0);

			const totalPrice = (Array.isArray(selectedEstimate?.items) ? selectedEstimate.items : [])
				.filter(item => item && !item.isRemoved)
				.reduce((sum, item) => {
					const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0);
					const quantity = Number(item?.quantity ?? 1);
					const itemPrice = Number.isFinite(unitPrice) && Number.isFinite(quantity) ? unitPrice * quantity : 0;
					return sum + itemPrice;
				}, 0);

			const zaloPayload = {
				number: String(customer.phone || phone).trim(),
				customerName: String(customer.fullName).trim(),
				productName: productNames.length > 0 ? productNames : ['Dịch vụ bảo trì'],
				orderCode: bookingCode || 'BOOKING',
				garageLocation: 'Michelin Sơn Tây',
				totalPrice: String(totalPrice),
			};

			try {
				await sendEstimateNotificationZalo(zaloPayload, token);
			} catch (zaloErr) {
				console.warn('Gửi thông báo Zalo thất bại:', zaloErr?.message);
			}

			// Sau khi tạo lịch thành công, điều hướng về quản lý lịch hẹn
			navigate('/booking-management');
		} catch (err) {
			setPayError(err?.message || 'Không thể tạo lịch hẹn.');
			notify(err?.message || 'Không thể tạo lịch hẹn.');
		} finally {
			payInFlightRef.current = false;
			setPaying(false);
		}
	}, [customer, estimateId, scheduleDate, scheduleTime, note, phone, selectedEstimate, navigate]);

	return {
		// customer
		phone,
		setPhone,
		customer,
		checkingCustomer,
		customerCheckError,
		customerNotFound,
		note,
		setNote,
		// directory modal
		showDirectoryModal,
		setShowDirectoryModal,
		directorySearch,
		setDirectorySearch,
		directoryCustomers,
		directoryLoading,
		loadDirectoryCustomers,
		handleSelectCustomerFromDirectory,
		// create customer modal
		showCreateCustomerModal,
		setShowCreateCustomerModal,
		handleCustomerCreated,
		// estimate
		selectedEstimate,
		setSelectedEstimate,
		estimateId,
		estimateStatus,
		estimateTableKey,
		fallbackConfigs,
		// promotions
		availablePromotions,
		promotionsLoading,
		promoCode,
		setPromoCode,
		selectedPromotionId,
		setSelectedPromotionId,
		appliedPromotion,
		promoApplying,
		promoError,
		canApplyPromotion,
		handleApplyPromotion,
		handleUnapplyPromotion,
		buildPromotionLabel,
		getPromotionId,
		// actions
		handleSaveDraft,
		handleCancel,
		cancelling,
		handlePayment,
		paying,
		payError,
		// scheduling
		isScheduling,
		setIsScheduling,
		scheduleDate,
		setScheduleDate,
		scheduleTime,
		setScheduleTime,
		baseSlotsLoading,
		baseSlotsError,
		slotsLoading,
		slotsError,
		displaySlots,
		handlePickSlot,
		timeKey,
		normalizePeriodLabel,
		dateOptions,
		handleCreateBooking,
	};
}
