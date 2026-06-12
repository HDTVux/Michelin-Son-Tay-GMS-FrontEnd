import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	createServiceTicketEstimate,
	cancelWarehouseAllocation,
	fetchServiceTicketEstimate,
	fetchSafetyInspectionCurrentRecommend,
	fetchWorkCategoriesAll,
	fetchTaxRulesAll,
	requestWarehouseReturnEntry,
	updateServiceTicketEstimate,
	updateServiceTicketEstimateItem,
} from '../../../services/serviceTicketService.js';
import { updateSafetyInspectionRecommend } from '../../../services/safetyInspectionService.js';
import { fetchAllCatalogItems } from '../../../services/catalogService.js';
import { createTaxRule, fetchWarehouseCatalogItemDetail, cancelWarehouseReturnEntry } from '../../../services/warehouseService.js';
import {
	validateNonNegativeNumber,
	validatePositiveNumber,
	validateTaxName,
	validateTaxRatePercent,
	validateTextInput,
} from '../../../components/inputValidation.js';
const getRecommendationStorageKey = (serviceTicketId) => `serviceTicketRecommendation:${serviceTicketId}`;
const readEstimateDraftSnapshot = (storageKey) => {
	if (!storageKey || typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : null;
	} catch {
		return null;
	}
};

const writeEstimateDraftSnapshot = (storageKey, estimate) => {
	if (!storageKey || typeof localStorage === 'undefined') return;
	try {
		if (estimate) {
			localStorage.setItem(storageKey, JSON.stringify(estimate));
			return;
		}
		localStorage.removeItem(storageKey);
	} catch {
		// ignore storage failures
	}
};

const ADD_SERVICE_RESTORE_STORAGE_PREFIX = 'serviceTicketAddServicePending:';

/**
 * Chuẩn hóa text để so sánh: loại bỏ dấu tiếng Việt, chuyển thành chữ thường
 * @param {string} value - Giá trị text cần chuẩn hóa
 * @returns {string} Text đã chuẩn hóa
 * @usage Dùng khi tìm kiếm, so sánh tên hạng mục hoặc tên sản phẩm
 * @example normalizeSuggestionText('Hàng Móc Trọng') => 'hang moc trong'
 */
export function normalizeSuggestionText(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replaceAll(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

/**
 * Đọc dữ liệu pending của dịch vụ thêm từ localStorage
 * @param {number|string} serviceTicketId - ID phiếu dịch vụ
 * @returns {object|null} Dữ liệu pending hoặc null nếu không tìm thấy
 * @usage Dùng để kiểm tra xem có pending add service khi người dùng khởi tạo tạo báo giá mới
 */
export function readAddServicePendingSnapshot(serviceTicketId) {
	const id = serviceTicketId == null ? '' : String(serviceTicketId).trim();
	if (!id) return null;
	try {
		const raw = localStorage.getItem(`${ADD_SERVICE_RESTORE_STORAGE_PREFIX}${id}`);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Định dạng số tiền thành tiền VND với ký hiệu đ (đồng)
 * @param {number|string} value - Giá trị số cần định dạng
 * @returns {string} Chuỗi định dạng tiền (ví dụ: '1.000.000đ')
 * @usage Hiển thị giá tiền, tổng, đơn giá, etc. trong UI
 */
export function formatCurrencyVnd(value) {
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return '';
	return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
}

/**
 * Định dạng tỷ lệ thuế thành phần trăm
 * @param {object} rule - Đối tượng rule chứa taxRate hoặc rate
 * @returns {string} Tỷ lệ thuế dạng phần trăm (ví dụ: '10%')
 * @usage Hiển thị tỷ lệ thuế trong dropdown, label, hoặc info text
 * @note Tự động convert nếu rate > 1 (xem như đã là phần trăm: 10 -> 0.1 -> 10%)
 */
export function formatTaxRatePercent(rule) {
	const raw = rule?.taxRate ?? rule?.rate;
	const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
	if (!Number.isFinite(n)) return '';
	let rate = n;
	if (rate > 1) rate = rate / 100;
	if (rate < 0) rate = 0;
	const pct = rate * 100;
	const text = pct.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
	return `${text}%`;
}

/**
 * Tạo label cho dropdown chọn thuế: tên + tỷ lệ
 * @param {object} rule - Đối tượng tax rule
 * @returns {string} Label để hiển thị (ví dụ: 'VAT (10%)')
 * @usage Hiển thị trong option của select dropdown thuế
 */
export function getTaxRuleSelectLabel(rule) {
	if (!rule) return '';
	const name = String(rule?.taxName ?? rule?.name ?? '').trim();
	const code = String(rule?.taxCode ?? rule?.code ?? '').trim();
	const label = name || code;
	const rateText = formatTaxRatePercent(rule);
	if (label && rateText) return `${label} (${rateText})`;
	return label || rateText;
}

/**
 * Tạo label hiển thị cho tax rule (dùng khi chỉ xem, không chọn)
 * @param {object} rule - Đối tượng tax rule
 * @returns {string} Label hiển thị
 * @usage Hiển thị thuế đã chọn ở cột thuế khi trong chế độ chỉ xem
 */
export function getTaxRuleDisplayLabel(rule) {
	if (!rule) return '';
	return getTaxRuleSelectLabel(rule);
}

/**
 * Chuyển đổi trạng thái kho thành text hiển thị Tiếng Việt
 * @param {string} status - Trạng thái kho (COMMITTED, RESERVED, RELEASED)
 * @returns {string} Text Tiếng Việt (ví dụ: 'Đã xuất hàng')
 * @usage Hiển thị trạng thái hàng trong bảng dòng ước tính
 */
export function getStockAllocationDisplay(status) {
	const normalized = String(status || '').trim().toUpperCase();
	if (normalized === 'COMMITTED') return 'Đã xuất hàng';
	if (normalized === 'RESERVED') return 'Đang giữ hàng';
	if (normalized === 'RELEASED') return 'Trả hàng';
	return '-';
}

/**
 * Lấy CSS class cho trạng thái stock allocation
 * @param {string} status - Trạng thái kho
 * @param {object} styles - Import CSS modules
 * @returns {string} Tên class CSS để style hiển thị
 * @usage Áp dụng styling cho status cell trong bảng dòng ước tính
 */
export function getStockAllocationClassName(status, styles) {
	const normalized = String(status || '').trim().toUpperCase();
	if (normalized === 'COMMITTED') return styles.stockStatusCommitted;
	if (normalized === 'RESERVED') return styles.stockStatusReserved;
	if (normalized === 'RELEASED') return styles.stockStatusReleased;
	return styles.stockStatusMissing;
}

/**
 * Lấy báo giá mới nhất từ payload API
 * @param {array|object} payload - Dữ liệu trả về từ API
 * @returns {object|null} Báo giá có version cao nhất hoặc mới nhất
 * @usage Dùng khi fetch báo giá từ server, giúp lấy version mới nhất
 * @note Ưu tiên trạng thái không bị xoá (isRemoved !== true)
 */
export function pickLatestEstimateFromPayload(payload) {
	// Payload có thể là một object chứa nested list (estimates hoặc estimateList)
	const list = Array.isArray(payload)
		? payload
		: Array.isArray(payload?.estimates)
			? payload.estimates
			: Array.isArray(payload?.estimateList)
				? payload.estimateList
				: null;
	// Nếu có list, ưu tiên các báo giá không bị xoá (isRemoved !== true), sau đó lấy version cao nhất
	if (list) {
		const active = list.filter((estimate) => !estimate?.isRemoved);
		const source = active.length > 0 ? active : list;
		return source
			.slice()
			.sort((a, b) => {
				const versionA = Number(a?.version ?? a?.estimateVersion ?? 0);
				const versionB = Number(b?.version ?? b?.estimateVersion ?? 0);
				if (versionA !== versionB) return versionB - versionA;
				return Number(b?.estimateId ?? b?.id ?? 0) - Number(a?.estimateId ?? a?.id ?? 0);
			})[0] ?? null;
	}

	if (payload && typeof payload === 'object' && Array.isArray(payload.items)) return payload;
	if (payload?.estimate && typeof payload.estimate === 'object') return payload.estimate;
	return null;
}

/**
 * Lấy trạng thái stock allocation từ row dòng ước tính
 * @param {object} row - Dữ liệu dòng ước tính
 * @returns {string} Trạng thái (RESERVED, COMMITTED, RELEASED, etc.)
 * @usage Xác định xem hàng đã được giữ, xuất hay hoàn chưa
 */
export function getRowStockStatus(row) {
	return String(
		row?.stockAllocation?.status ??
		row?.allocation?.status ??
		row?.warehouseAllocation?.status ??
		row?.stockAllocationStatus ??
		row?.stock_allocation_status ??
		row?.allocationStatus ??
		'',
	).trim().toUpperCase();
}

/**
 * Tạo key duy nhất để xác định action trên kho (hủy giữ, hoàn trả, etc.)
 * @param {object} row - Dữ liệu dòng ước tính
 * @returns {string} Key combine từ estimateItemId-issueId-allocationId
 * @usage Dùng để track trạng thái busy khi đang thực hiện action trên kho
 */
export function getWarehouseActionKey(row) {
	return `${row?.estimateItemId ?? ''}-${row?.issueId ?? ''}-${row?.allocationId ?? ''}`;
}

function isWarehouseStockLockedStatus(status) {
	return ['RESERVED', 'COMMITTED', 'RELEASED'].includes(String(status || '').trim().toUpperCase());
}

/**
 * Định dạng tỷ lệ thuế đã áp dụng thành % (để hiển thị ghi chú)
 * @param {number|string} value - Tỷ lệ thuế (có thể là 0.1 hoặc 10)
 * @returns {string} Tỷ lệ dạng % (ví dụ: '10')
 * @usage Hiển thị text ghi chú 'đã bao gồm thuế 10%' ở cột amount
 */
export function formatAppliedTaxRate(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return '';
	const n = typeof value === 'number' ? value : Number(raw);
	if (!Number.isFinite(n) || n <= 0) return '';
	const percent = n > 1 ? n : n * 100;
	return percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

/**
 * Kiểm tra xem có pending add service với trạng thái APPROVED
 * @param {number|string} serviceTicketId - ID phiếu dịch vụ
 * @returns {boolean} true nếu có pending với prevEstimateStatus = 'APPROVED'
 * @usage Quyết định có nên tạo báo giá mới version hay không
 */
export function hasApprovedAddServicePendingSnapshot(serviceTicketId) {
	const snapshot = readAddServicePendingSnapshot(serviceTicketId);
	const previousEstimateStatus = String(snapshot?.prevEstimateStatus || '').trim().toUpperCase();
	return previousEstimateStatus === 'APPROVED';
}

/**
 * Fetch báo giá mới nhất từ server và sync vào state
 * @param {object} options - {serviceTicketId, syncEstimate}
 * @returns {Promise<object|null>} Báo giá mới nhất từ server
 * @usage Gọi sau khi thực hiện các action (hủy, hoàn trả, etc.) trên kho
 * @note Tự động sync vào state thông qua callback syncEstimate
 */
export async function refreshLatestAdvisorEstimate({ serviceTicketId, syncEstimate }) {
	const ticketId = toIdOrNull(serviceTicketId);
	const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
	if (!ticketId || !token) return null;
	const res = await fetchServiceTicketEstimate(ticketId, token);
	const latest = pickLatestEstimateFromPayload(extractApiPayload(res));
	if (latest) syncEstimate?.(latest);
	return latest;
}

/**
 * Hủy giữ hàng trên kho cho một dòng ước tính
 * @param {object} options - {row, notify, setWarehouseActionBusyKey, refreshLatestEstimate, markEstimateDraft}
 * @async
 * @returns {Promise<void>}
 * @usage Khi người dùng nhấn button 'Hủy sản phẩm' trên dòng có status 'RESERVED'
 * @note Cầp nhật API, sau đó refresh để hiển thị báo giá mới
 */
export async function handleCancelWarehouseAllocationAction({
	row,
	notify,
	setWarehouseActionBusyKey,
	refreshLatestEstimate,
	markEstimateDraft,
}) {
	const estimateItemId = toIdOrNull(row?.estimateItemId);
	if (!estimateItemId) {
		notify('Thiếu id báo giá để hủy giữ hàng.');
		return;
	}

	const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
	if (!token) {
		notify('Vui lòng đăng nhập để hủy giữ hàng.');
		return;
	}

	const actionKey = getWarehouseActionKey(row);
	try {
		setWarehouseActionBusyKey(actionKey);
		await cancelWarehouseAllocation(
			{
				estimateItemId,
				issueId: toIdOrNull(row?.issueId),
			},
			token,
		);
		await markEstimateDraft?.();
		await refreshLatestEstimate();
		notify('Đã hủy giữ hàng cho sản phẩm.');
	} catch (err) {
		notify(err?.message || 'Không thể hủy giữ hàng.');
	} finally {
		setWarehouseActionBusyKey('');
	}
}

/**
 * Tạo phiếu hoàn trả hàng (đố với COMMITTED items)
 * @param {object} options - {returnModalItem, returnReason, quantity, conditionNote, files, notify, setReturnSubmitting, setReturnModalItem, refreshLatestEstimate, markEstimateDraft, extraItems}
 * @async
 * @returns {Promise<void>}
 * @usage Khi người dùng nhấn button 'Hoàn trả' trên dòng COMMITTED
 * @note Hỗ trợ hoàn trả nhiều item cùng 1 lúc (extraItems)
 */
export async function handleSubmitReturnEntryAction({
	returnModalItem,
	returnReason,
	returnReasonType,
	defectCause,
	responsibleStaffId,
	quantity,
	conditionNote,
	files,
	notify,
	setReturnSubmitting,
	setReturnModalItem,
	refreshLatestEstimate,
	markEstimateDraft,
	extraItems,
}) {
	const row = returnModalItem;
	const itemId = toIdOrNull(row?.itemId);
	const allocationId = toIdOrNull(row?.allocationId);
	const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

	if (!token) {
		notify('Vui lòng đăng nhập để tạo phiếu hoàn trả.');
		return;
	}
	if (!itemId || !allocationId) {
		notify('Thiếu itemId hoặc allocationId để tạo phiếu hoàn trả.');
		return;
	}

	try {
		setReturnSubmitting(true);
		const extra = Array.isArray(extraItems) ? extraItems : [];
		const extraNormalized = extra
			.map((it) => {
				if (!it) return null;
				return {
					itemId: toIdOrNull(it.itemId),
					allocationId: toIdOrNull(it.allocationId ?? it.allocation_id),
					quantity: typeof it.quantity === 'number' ? it.quantity : (it.quantity ? Number(it.quantity) : undefined),
					conditionNote: it.conditionNote ?? '',
				};
			})
			.filter(Boolean);

		// Build main item payload — include defect fields when returnReasonType = DEFECTIVE
		const mainItem = {
			itemId,
			allocationId,
			quantity,
			conditionNote,
			returnReason: returnReasonType ?? 'WRONG_TYPE',
			...(returnReasonType === 'DEFECTIVE' && defectCause ? { defectCause } : {}),
			...(returnReasonType === 'DEFECTIVE' && responsibleStaffId ? { responsibleStaffId } : {}),
		};

		await requestWarehouseReturnEntry(
			{
				warehouseId: toIdOrNull(row?.warehouseId),
				sourceIssueId: toIdOrNull(row?.issueId),
				returnReason,
				returnType: 'CUSTOMER_RETURN',
				items: [mainItem, ...extraNormalized],
			},
			Array.isArray(files) ? files : [],
			token,
		);
		setReturnModalItem(null);
		await markEstimateDraft?.();
		await refreshLatestEstimate();
		notify('Đã tạo phiếu hoàn trả.');
	} catch (err) {
		notify(err?.message || 'Không thể tạo phiếu hoàn trả.');
	} finally {
		setReturnSubmitting(false);
	}
}

/**
 * Hủy phiếu hoàn trả đã đặt
 * @param {object} options - {row, notify, setWarehouseActionBusyKey, refreshLatestEstimate, markEstimateDraft}
 * @async
 * @returns {Promise<void>}
 * @usage Khi người dùng nhấn 'Hủy hoàn trả' trên dòng RELEASED (có phiếu hoàn)
 */
export async function handleCancelReturnEntryAction({
	row,
	notify,
	setWarehouseActionBusyKey,
	refreshLatestEstimate,
	markEstimateDraft,
}) {
	const rawReturnId = row?.stockAllocation?.returnId ?? row?.allocation?.returnId ?? row?.warehouseAllocation?.returnId ?? row?.returnId ?? 0;
	const returnId = typeof rawReturnId === 'number' ? rawReturnId : Number(String(rawReturnId ?? '').trim());
	if (!Number.isFinite(returnId) || returnId <= 0) {
		notify('Thiếu returnId để hủy phiếu hoàn.');
		return;
	}

	const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
	if (!token) {
		notify('Vui lòng đăng nhập để hủy phiếu hoàn.');
		return;
	}

	const actionKey = getWarehouseActionKey(row);
	try {
		setWarehouseActionBusyKey(actionKey);
		await cancelWarehouseReturnEntry(returnId, token);
		await markEstimateDraft?.();
		await refreshLatestEstimate();
		notify('Hủy phiếu hoàn thành công.');
	} catch (err) {
		notify(err?.message || 'Không thể hủy phiếu hoàn.');
	} finally {
		setWarehouseActionBusyKey('');
	}
}

/**
 * Bắt đầu tạo báo giá mới (v1 Đầu tiên)
 * @param {object} options - Thông số cấu hình (isStartingCreate, isReadOnly, isTicketLocked, notify, etc.)
 * @async
 * @returns {Promise<void>}
 * @usage Khi người dùng nhấn button 'Tạo báo giá mới'
 * @note Kiểm tra các điều kiện (chề độ xem, phiếu đã khóa)
 */
export async function handleStartCreateAction({
	isStartingCreate,
	isReadOnly,
	readOnlyMessage,
	isTicketLocked,
	notify,
	setRevertOnCancel,
	setRevertTicketOnCancel,
	onBeforeEstimateMutate,
	syncEstimate,
	startCreate,
}) {
	if (isStartingCreate) return;
	if (isReadOnly) {
		notify(readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.');
		return;
	}
	if (isTicketLocked) {
		notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
		return;
	}
	setRevertOnCancel(false);
	setRevertTicketOnCancel(false);
	try {
		const cleanEstimate = await onBeforeEstimateMutate?.();
		if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
		if (startCreate) startCreate(cleanEstimate !== undefined ? { estimateOverride: cleanEstimate } : undefined);
	} catch {
		// keep existing silent cancel behavior
	}
}

export async function handleStartCreateNewVersionAction({
	isStartingCreate,
	isReadOnly,
	readOnlyMessage,
	isTicketLocked,
	notify,
	setRevertOnCancel,
	setRevertTicketOnCancel,
	onBeforeEstimateMutate,
	syncEstimate,
	startCreate,
	onRestartWorkflow,
	setIsStartingCreate,
	cancelCreate,
}) {
	if (isStartingCreate) return;
	if (isReadOnly) {
		notify(readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.');
		return;
	}
	if (isTicketLocked) {
		notify('Không thể tạo báo giá khi phiếu dịch vụ đã bị khóa (PAID/CANCELLED).');
		return;
	}
	setRevertOnCancel(false);
	setRevertTicketOnCancel(true);
	try {
		const seedEstimate = await onBeforeEstimateMutate?.({
			promotionTypesToUnapply: ['PERCENT'],
			resetPromotionSelection: true,
		});
		if (seedEstimate !== undefined) syncEstimate?.(seedEstimate);
		startCreate?.(
			seedEstimate !== undefined
				? { seedFromPreviousEstimate: true, estimateOverride: seedEstimate }
				: { seedFromPreviousEstimate: true },
		);
	} catch {
		setRevertTicketOnCancel(false);
		return;
	}

	if (!onRestartWorkflow) return;

	try {
		setIsStartingCreate(true);
		// Add a small delay to ensure promotion removal notification is displayed before this one
		await new Promise((resolve) => setTimeout(resolve, 500));
		await onRestartWorkflow();
	} catch {
		setRevertTicketOnCancel(false);
		cancelCreate?.();
	} finally {
		setIsStartingCreate(false);
	}
}

export async function handleStartEditAction({
	isReadOnly,
	readOnlyMessage,
	notify,
	setRevertOnCancel,
	onBeforeEstimateMutate,
	syncEstimate,
	startEdit,
}) {
	if (isReadOnly) {
		notify(readOnlyMessage || 'Phiếu đang ở chế độ chỉ xem.');
		return;
	}
	setRevertOnCancel(false);
	try {
		const cleanEstimate = await onBeforeEstimateMutate?.({
			// Keep BUY_X_GET_Y gifts fixed while editing; only unapply percentage discounts.
			promotionTypesToUnapply: ['PERCENT'],
		});
		if (cleanEstimate !== undefined) syncEstimate?.(cleanEstimate);
		startEdit?.(cleanEstimate !== undefined ? { estimateOverride: cleanEstimate } : undefined);
	} catch {
		// keep existing silent cancel behavior
	}
}

/**
 * Xóa tất cả input (định dạng) của một dòng ước tính
 * @param {object} options - {rowIndex, showInputs, tableRows, activeRowIndex, setPickerOpen, setActiveRowIndex, setPickerInitQuery, onChange}
 * @returns {void}
 * @usage Khi người dùng nhấn button 'Xóa' để xoá định dạng dòng draft
 * @note Không xóa nếu dòng là sản phẩm quà tăng (gift) hoặc đã giữ hàng
 */
export function clearAdvisorRowInputs({
	rowIndex,
	showInputs,
	tableRows,
	activeRowIndex,
	setPickerOpen,
	setActiveRowIndex,
	setPickerInitQuery,
	onChange,
}) {
	if (!showInputs) return;
	if (rowIndex == null) return;

	const row = Array.isArray(tableRows) ? tableRows[rowIndex] : null;
	const giftRaw = row?.isGift ?? row?.is_gift;
	if (!row || row?.isLockedFromPreviousVersion || giftRaw === true || String(giftRaw ?? '').trim().toLowerCase() === 'true') return;
	if (isWarehouseStockLockedStatus(getEstimateItemStockAllocationStatus(row))) return;

	if (activeRowIndex === rowIndex) {
		setPickerOpen(false);
		setActiveRowIndex(null);
		setPickerInitQuery('');
	}

	onChange(rowIndex, 'newCategoryName', '');
	onChange(rowIndex, 'workCategoryId', '');
	onChange(rowIndex, 'workCategoryCode', '');

	onChange(rowIndex, 'itemId', '');
	onChange(rowIndex, 'itemName', '');
	onChange(rowIndex, 'unit', '');

	onChange(rowIndex, 'quantity', '');
	onChange(rowIndex, 'unitPrice', '');

	onChange(rowIndex, 'warehouseId', '');
	onChange(rowIndex, 'warehouseName', '');
	onChange(rowIndex, 'warehouseAvailableQuantity', null);
	onChange(rowIndex, 'entryItemId', null);
	onChange(rowIndex, 'entryCode', null);

	onChange(rowIndex, 'taxRuleId', '');
	onChange(rowIndex, 'itemTaxRuleId', '');
}

/**
 * Điền thông tin sản phẩm vào dòng ước tính sau khi chọn từ catalog picker
 * @param {object} options - {item, activeRowIndex, onChange, closeCatalogPicker}
 * @returns {void}
 * @usage Gọi sau khi chọn được 1 sản phẩm từ mủ catalog picker
 * @note Tự động điền đơn giá, đơn vị, kho, v.v.
 */
export function pickAdvisorCatalogItem({
	item,
	activeRowIndex,
	onChange,
	closeCatalogPicker,
}) {
	if (activeRowIndex == null) return;
	const id = item?.itemId ?? item?.id ?? null;
	const name = item?.itemName ?? item?.name ?? '';
	const price = item?.sellingPrice ?? item?.price ?? item?.unitPrice ?? item?.unit_price ?? '';
	const unit = String(item?.unit ?? '').trim();
	const warehouseId = item?.warehouseId ?? item?.selectedWarehouse?.warehouseId ?? null;
	const warehouseName = String(
		item?.warehouseName ??
		item?.selectedWarehouse?.warehouseName ??
		item?.selectedWarehouse?.name ??
		'',
	).trim();
	const availableQtyRaw =
		item?.availableQuantity ??
		item?.selectedWarehouse?.quantity ??
		item?.selectedWarehouse?.availableQuantity ??
		null;
	const availableQtyNum =
		typeof availableQtyRaw === 'number' ? availableQtyRaw : Number(String(availableQtyRaw ?? '').trim());
	const rawTaxId = item?.taxRuleId ?? item?.tax_rule_id ?? item?.taxRule?.taxRuleId ?? item?.taxRule?.id ?? '';
	const entryItemId = item?.entryItemId ?? null;
	const entryCode = item?.entryCode ?? null;

	onChange(activeRowIndex, 'itemId', id);
	onChange(activeRowIndex, 'itemName', name);
	onChange(activeRowIndex, 'unitPrice', price);
	onChange(activeRowIndex, 'unit', unit);
	if (warehouseId != null && String(warehouseId).trim() !== '') {
		onChange(activeRowIndex, 'warehouseId', warehouseId);
	} else {
		onChange(activeRowIndex, 'warehouseId', '');
	}
	onChange(activeRowIndex, 'warehouseName', warehouseName);
	if (Number.isFinite(availableQtyNum) && availableQtyNum >= 0) {
		onChange(activeRowIndex, 'warehouseAvailableQuantity', availableQtyNum);
	} else {
		onChange(activeRowIndex, 'warehouseAvailableQuantity', null);
	}
	onChange(activeRowIndex, 'entryItemId', entryItemId);
	onChange(activeRowIndex, 'entryCode', entryCode);
	onChange(activeRowIndex, 'itemTaxRuleId', rawTaxId == null ? '' : String(rawTaxId));

	const taxIdNum = toIdOrNull(rawTaxId);
	if (taxIdNum) onChange(activeRowIndex, 'taxRuleId', '');
	closeCatalogPicker();
}

function pickLatestEstimate(list) {
	const arr = Array.isArray(list) ? list : [];
	if (arr.length === 0) return null;

	return [...arr].sort((a, b) => {
		// Bao phủ mọi trường hợp tên ID (id, estimateId, serviceTicketEstimateId...)
		const idA = Number(a?.estimateId ?? a?.id ?? a?.serviceTicketEstimateId ?? 0);
		const idB = Number(b?.estimateId ?? b?.id ?? b?.serviceTicketEstimateId ?? 0);

		// Luôn sắp xếp ID giảm dần (Báo giá tạo sau sẽ có ID lớn hơn)
		if (idA > 0 && idB > 0 && idA !== idB) {
			return idB - idA;
		}

		// Fallback: Nếu không tìm thấy ID, so sánh bằng thời gian tạo
		const ta = new Date(a?.createdAt || a?.approvedAt || a?.createdDate || 0).getTime();
		const tb = new Date(b?.createdAt || b?.approvedAt || b?.createdDate || 0).getTime();
		return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
	})[0];
}

function createEmptyDraftRow() {
	return {
		estimateItemId: null,
		workCategoryId: null,
		workCategoryCode: '',
		workCategoryTaxRuleId: '',
		itemId: null,
		unit: '',
		warehouseId: '',
		warehouseName: '',
		warehouseAvailableQuantity: null,
		itemTaxRuleId: '',
		newCategoryName: '',
		itemName: '',
		quantity: '',
		unitPrice: '',
		taxRuleId: '',
		isRemoved: false,
		isLockedFromPreviousVersion: false,
		entryItemId: null,
		entryCode: null,
	};
}

function getEffectiveTaxRuleId(row) {
	// Business rule:
	// - Prefer product tax (itemTaxRuleId)
	// - Else use category tax (workCategoryTaxRuleId)
	// - Only when both null, allow manual selection (taxRuleId)
	return toIdOrNull(row?.itemTaxRuleId) || toIdOrNull(row?.workCategoryTaxRuleId) || toIdOrNull(row?.taxRuleId);
}

function getItemTaxRuleIdFromEstimateItem(it) {
	return (
		it?.item?.taxRuleId ??
		it?.catalogItem?.taxRuleId ??
		it?.serviceItem?.taxRuleId ??
		it?.product?.taxRuleId ??
		it?.service?.taxRuleId ??
		''
	);
}

function getItemUnitFromEstimateItem(it) {
	return String(
		it?.unit ??
		it?.item?.unit ??
		it?.catalogItem?.unit ??
		it?.serviceItem?.unit ??
		it?.product?.unit ??
		it?.service?.unit ??
		''
	).trim();
}

function getEstimateRowValidationError(row, rowIndex, requireItemForPredefinedCategory) {
	const rowNo = rowIndex + 1;
	const workCategoryId = toIdOrNull(row?.workCategoryId);
	const isLocked = Boolean(row?.isLockedFromPreviousVersion);
	const itemId = toIdOrNull(row?.itemId);
	const hasManualItemName = Boolean(String(row?.itemName ?? '').trim());

	if (!workCategoryId) {
		const categoryValidated = validateTextInput(row?.newCategoryName, {
			fieldLabel: 'Hạng mục',
			required: true,
			trim: true,
			maxLength: 255,
		});
		if (categoryValidated.error) return `Dòng ${rowNo}: ${categoryValidated.error}`;
	}

	if (workCategoryId && requireItemForPredefinedCategory && !isLocked && !itemId && !hasManualItemName) {
		return `Dòng ${rowNo}: Vui lòng chọn sản phẩm/dịch vụ.`;
	}

	if (!workCategoryId || (workCategoryId && !itemId)) {
		const itemNameValidated = validateTextInput(row?.itemName, {
			fieldLabel: 'Diễn giải',
			required: true,
			trim: true,
			maxLength: 255,
		});
		if (itemNameValidated.error) return `Dòng ${rowNo}: ${itemNameValidated.error}`;
	}

	const qtyValidated = validatePositiveNumber(row?.quantity, {
		fieldLabel: 'Số lượng',
		required: true,
		integer: true,
	});
	if (qtyValidated.error) return `Dòng ${rowNo}: ${qtyValidated.error}`;

	// Nếu đã chọn kho và có số lượng tồn kho của kho đó thì không cho vượt quá.
	const warehouseId = toIdOrNull(row?.warehouseId ?? row?.warehouse_id);
	const maxQtyRaw = row?.warehouseAvailableQuantity ?? row?.availableQuantity;
	let maxQty = Number.NaN;
	if (typeof maxQtyRaw === 'number') {
		maxQty = maxQtyRaw;
	} else {
		const maxQtyText = String(maxQtyRaw ?? '').trim();
		maxQty = maxQtyText ? Number(maxQtyText) : Number.NaN;
	}
	if (!isLocked && warehouseId && Number.isFinite(maxQty) && maxQty >= 0 && Number.isFinite(qtyValidated.value)) {
		if (qtyValidated.value > maxQty) {
			return `Dòng ${rowNo}: Số lượng không được vượt quá tồn kho (${maxQty}) của kho đã chọn.`;
		}
	}

	const priceValidated = validateNonNegativeNumber(row?.unitPrice, {
		fieldLabel: 'Đơn giá',
		required: true,
		integer: false,
	});
	if (priceValidated.error) return `Dòng ${rowNo}: ${priceValidated.error}`;

	return '';
}

/**
 * Có liên quan đến API payload - lấy dữ liệu thị có thể là nested
 * @param {object} response - Response từ API
 * @returns {object} Dữ liệu thỏ kỳ (data.data hoặc data)
 * @usage Dùng khi xử lý response từ service
 */
export function extractApiPayload(response) {
	return response?.data?.data ?? response?.data ?? response;
}

function getTaxRuleIdFromCatalogPayload(payload) {
	return (
		payload?.taxRuleId ??
		payload?.tax_rule_id ??
		payload?.taxRule?.taxRuleId ??
		payload?.taxRule?.id ??
		payload?.tax_rule?.tax_rule_id ??
		payload?.tax_rule?.id ??
		''
	);
}

function getEstimateItemWarehouseName(item) {
	return String(
		item?.warehouseName ?? item?.warehouse_name ?? item?.warehouse?.warehouseName ?? item?.warehouse?.name ?? '',
	).trim();
}

function getEstimateItemStockAllocationStatus(item) {
	return String(
		item?.stockAllocation?.status ??
		item?.allocation?.status ??
		item?.warehouseAllocation?.status ??
		item?.stockAllocationStatus ??
		item?.stock_allocation_status ??
		item?.allocationStatus ??
		'',
	).trim().toUpperCase();
}

function getEstimateItemWorkCategoryId(item) {
	return toIdOrNull(
		item?.workCategoryId ??
		item?.workCateId ??
		item?.workCategory?.workCategoryId ??
		item?.workCategory?.workCateId ??
		item?.workCategory?.id,
	);
}

function buildEstimateItemMatchKeys(item) {
	const keys = [];
	const estimateItemId = toIdOrNull(item?.estimateItemId ?? item?.estimateItemID ?? item?.id);
	if (estimateItemId) keys.push(`estimate:${estimateItemId}`);

	const revisedFromItemId = toIdOrNull(item?.revisedFromItemId);
	if (revisedFromItemId) keys.push(`revised:${revisedFromItemId}`);

	const itemId = toIdOrNull(item?.itemId ?? item?.catalogItemId ?? item?.serviceItemId);
	const workCategoryId = getEstimateItemWorkCategoryId(item);
	const itemName = String(item?.itemName ?? '').trim().toLowerCase();
	const warehouseId = toIdOrNull(item?.warehouseId ?? item?.warehouse_id ?? item?.warehouse?.warehouseId);
	const quantity = toNumberOrZero(item?.quantity);
	const unitPrice = toNumberOrZero(item?.unitPrice);
	if (itemId || workCategoryId || itemName || warehouseId || quantity || unitPrice) {
		keys.push(`combo:${itemId ?? ''}|${workCategoryId ?? ''}|${itemName}|${warehouseId ?? ''}|${quantity}|${unitPrice}`);
	}

	return keys;
}

function pickOwnValue(item, ...keys) {
	if (!item || typeof item !== 'object') return undefined;
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(item, key)) return item[key];
	}
	return undefined;
}

function mergeEstimateWithWarehouseDisplay(nextEstimate, ...fallbackSources) {
	if (!nextEstimate || typeof nextEstimate !== 'object') return nextEstimate;
	const nextItems = Array.isArray(nextEstimate?.items) ? nextEstimate.items : [];
	if (nextItems.length === 0) return nextEstimate;

	const fallbackByKey = new Map();
	for (const source of fallbackSources) {
		const items = Array.isArray(source?.items) ? source.items : Array.isArray(source) ? source : [];
		for (const item of items) {
			const warehouseName = getEstimateItemWarehouseName(item);
			const warehouseId = item?.warehouseId ?? item?.warehouse_id ?? item?.warehouse?.warehouseId ?? '';
			const warehouse = item?.warehouse && typeof item.warehouse === 'object' ? item.warehouse : null;
			if (!warehouseName && !warehouseId && !warehouse) continue;
			for (const key of buildEstimateItemMatchKeys(item)) {
				if (!fallbackByKey.has(key)) {
					fallbackByKey.set(key, { warehouseName, warehouseId, warehouse });
				}
			}
		}
	}

	const mergedItems = nextItems.map((item) => {
		const fallback = buildEstimateItemMatchKeys(item)
			.map((key) => fallbackByKey.get(key))
			.find(Boolean);
		if (!fallback) return item;
		const rawDiscountAmount = pickOwnValue(item, 'discountAmount', 'discount_amount');
		const rawFinalPrice = pickOwnValue(item, 'finalPrice', 'final_price');
		return {
			...item,
			warehouseId: item?.warehouseId ?? item?.warehouse_id ?? fallback.warehouseId ?? '',
			warehouseName: getEstimateItemWarehouseName(item) || fallback.warehouseName || '',
			warehouse: item?.warehouse ?? fallback.warehouse ?? undefined,
			discountAmount: rawDiscountAmount ?? null,
			finalPrice: rawFinalPrice ?? null,
		};
	});

	return { ...nextEstimate, items: mergedItems };
}

function mapEstimateItemToLockedRow(it, idx, options = {}) {
	const resetPromotionPricing = Boolean(options?.resetPromotionPricing);
	const workCategoryId =
		it?.workCategoryId ??
		it?.workCateId ??
		it?.workCategory?.workCategoryId ??
		it?.workCategory?.workCateId ??
		it?.workCategory?.id ??
		null;
	const workCategoryCode = String(it?.workCategory?.categoryCode ?? '').trim();
	const workCategoryTaxRuleId = it?.workCategory?.taxRuleId ?? '';
	const estimateItemId = it?.estimateItemId ?? it?.estimateItemID ?? it?.id ?? null;
	const itemId = it?.itemId ?? it?.catalogItemId ?? it?.serviceItemId ?? it?.id ?? null;
	const itemTaxRuleId =
		getItemTaxRuleIdFromEstimateItem(it);
	const unit = getItemUnitFromEstimateItem(it);
	const warehouseId = it?.warehouseId ?? it?.warehouse_id ?? it?.warehouse?.warehouseId ?? '';
	const warehouseName = getEstimateItemWarehouseName(it);
	const allocationId =
		it?.allocationId ??
		it?.stockAllocationId ??
		it?.stock_allocation_id ??
		it?.stockAllocation?.allocationId ??
		it?.stockAllocation?.stockAllocationId ??
		it?.allocation?.allocationId ??
		it?.allocation?.stockAllocationId ??
		it?.warehouseAllocation?.allocationId ??
		it?.warehouseAllocation?.stockAllocationId ??
		null;
	const issueId =
		it?.issueId ??
		it?.stockIssueId ??
		it?.stock_issue_id ??
		it?.stockAllocation?.issueId ??
		it?.stockAllocation?.stockIssueId ??
		it?.allocation?.issueId ??
		it?.allocation?.stockIssueId ??
		it?.warehouseAllocation?.issueId ??
		it?.warehouseAllocation?.stockIssueId ??
		null;
	const newCategoryName = String(
		it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '',
	).trim();

	return {
		key: `locked-${idx + 1}-${String(estimateItemId ?? itemId ?? it?.itemName ?? '')}`,
		estimateItemId,
		workCategoryId,
		workCategoryCode,
		workCategoryTaxRuleId,
		itemId,
		unit,
		warehouseId,
		warehouseName,
		allocationId,
		issueId,
		warehouseAvailableQuantity: null,
		itemTaxRuleId,
		categoryName: newCategoryName,
		newCategoryName,
		itemName: String(it?.itemName || '').trim(),
		quantity: it?.quantity ?? '',
		unitPrice: it?.unitPrice ?? '',
		discountAmount: resetPromotionPricing ? 0 : pickDiscountAmountValue(it),
		finalPrice: resetPromotionPricing ? '' : (it?.finalPrice ?? it?.final_price ?? ''),
		isGift: getEstimateItemGiftFlag(it),
		triggeredByItemId: pickTriggeredByItemId(it),
		promotionId: pickGiftPromotionId(it),
		promotion_id: pickGiftPromotionId(it),
		stockAllocationStatus: getEstimateItemStockAllocationStatus(it),
		// Dòng khóa (seed từ version trước): vẫn ưu tiên thuế sản phẩm nếu có.
		taxRuleId: toIdOrNull(itemTaxRuleId) ? '' : (it?.taxRuleId ?? ''),
		isRemoved: false,
		isLockedFromPreviousVersion: true,
		entryItemId: toIdOrNull(it?.entryItemId ?? it?.entry_item_id) ?? null,
	};
}

function mapEstimateItemToAppendLockedRow(it, idx) {
	const base = mapEstimateItemToLockedRow(it, idx);
	return {
		...base,
	};
}

function toNumberOrZero(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) ? n : 0;
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
	const withVatNum = toNumberOrZero(withVatValue);
	if (withVatNum > 0) return withVatNum;
	const baseNum = toNumberOrZero(baseValue);
	return baseNum > 0 ? baseNum : '';
}

function pickDiscountAmountValue(item) {
	return toNumberOrZero(item?.discountAmount ?? item?.discount_amount);
}

function getEstimateItemGiftFlag(item) {
	const raw = item?.isGift ?? item?.is_gift;
	return raw === true || String(raw ?? '').trim().toLowerCase() === 'true';
}

function pickTriggeredByItemId(item) {
	return toIdOrNull(item?.triggeredByItemId ?? item?.triggered_by_item_id);
}

function pickGiftPromotionId(item) {
	if (!getEstimateItemGiftFlag(item)) return null;
	const raw =
		item?.promotionId ??
		item?.promotionID ??
		item?.PromotionId ??
		item?.promotion_id ??
		item?.promotion?.promotionId ??
		item?.promotion?.promotionID ??
		item?.promotion?.promotion_id ??
		null;
	return toIdOrNull(raw);
}

function buildEstimateItemPromotionPayloadFields(item) {
	const isGift = getEstimateItemGiftFlag(item);
	const discountAmount = item?.discountAmount ?? item?.discount_amount;
	const finalPrice = item?.finalPrice ?? item?.final_price;
	const triggeredByItemId = pickTriggeredByItemId(item);
	const promotionId = pickGiftPromotionId(item);
	const normalizedDiscountAmount = isGift
		? 0
		: (discountAmount == null || String(discountAmount).trim() === '' ? null : toNumberOrZero(discountAmount));
	const normalizedFinalPrice = isGift
		? 0
		: (finalPrice == null || String(finalPrice).trim() === '' ? null : toNumberOrZero(finalPrice));
	return {
		isGift,
		is_gift: isGift,
		promotionId,
		promotion_id: promotionId,
		triggeredByItemId,
		triggered_by_item_id: triggeredByItemId,
		discountAmount: normalizedDiscountAmount,
		discount_amount: normalizedDiscountAmount,
		finalPrice: normalizedFinalPrice,
		final_price: normalizedFinalPrice,
	};
}

function normalizeEstimateUpdateItemForCompare(item) {
	const workCategoryId = getEstimateItemWorkCategoryId(item);
	const itemId = toIdOrNull(item?.itemId ?? item?.catalogItemId ?? item?.serviceItemId);
	const warehouseId = toIdOrNull(item?.warehouseId ?? item?.warehouse_id ?? item?.warehouse?.warehouseId);
	const itemTaxRuleId = toIdOrNull(item?.itemTaxRuleId ?? getItemTaxRuleIdFromEstimateItem(item));
	const workCategoryTaxRuleId = toIdOrNull(item?.workCategoryTaxRuleId ?? item?.workCategory?.taxRuleId);
	const taxRuleId = itemTaxRuleId || workCategoryTaxRuleId || toIdOrNull(item?.taxRuleId);
	const estimateItemId = toIdOrNull(item?.estimateItemId ?? item?.estimateItemID ?? item?.id);
	const promotionFields = buildEstimateItemPromotionPayloadFields(item);
	const entryItemId = toIdOrNull(item?.entryItemId ?? item?.entry_item_id);

	return {
		estimateItemId,
		workCategoryId,
		newCategoryName: workCategoryId
			? null
			: String(item?.newCategoryName ?? item?.workCategory?.categoryName ?? item?.workCategory?.categoryCode ?? '').trim() || null,
		itemId,
		warehouseId,
		itemName: String(item?.itemName ?? '').trim() || null,
		unit: getItemUnitFromEstimateItem(item) || null,
		quantity: toNumberOrZero(item?.quantity),
		unitPrice: toNumberOrZero(item?.unitPrice),
		taxRuleId,
		isChecked: true,
		isRemoved: Boolean(item?.isRemoved),
		revisedFromItemId: estimateItemId,
		isGift: Boolean(promotionFields.isGift),
		promotionId: promotionFields.promotionId ?? null,
		triggeredByItemId: promotionFields.triggeredByItemId ?? null,
		discountAmount: promotionFields.discountAmount ?? null,
		finalPrice: promotionFields.finalPrice ?? null,
		entryItemId,
	};
}

function areEstimateUpdateItemsEqual(nextItems, currentEstimate) {
	const normalizePayloadItem = (item) => normalizeEstimateUpdateItemForCompare(item);
	const normalizedNext = (Array.isArray(nextItems) ? nextItems : []).map(normalizePayloadItem);
	const normalizedCurrent = (Array.isArray(currentEstimate?.items) ? currentEstimate.items : [])
		.filter((item) => !item?.isRemoved && !getEstimateItemGiftFlag(item))
		.map(normalizePayloadItem);

	return JSON.stringify(normalizedNext) === JSON.stringify(normalizedCurrent);
}

function normalizeEditRowsForDirtyCheck(rows) {
	return (Array.isArray(rows) ? rows : [])
		.filter((row) => !isDraftRowEmpty(row) && !getEstimateItemGiftFlag(row))
		.map((row) => ({
			estimateItemId: toIdOrNull(row?.estimateItemId),
			workCategoryId: toIdOrNull(row?.workCategoryId),
			itemId: toIdOrNull(row?.itemId),
			warehouseId: toIdOrNull(row?.warehouseId ?? row?.warehouse_id),
			newCategoryName: String(row?.newCategoryName ?? '').trim(),
			itemName: String(row?.itemName ?? '').trim(),
			unit: String(row?.unit ?? '').trim(),
			quantity: toNumberOrZero(row?.quantity),
			unitPrice: toNumberOrZero(row?.unitPrice),
			taxRuleId: toIdOrNull(row?.taxRuleId),
			isRemoved: Boolean(row?.isRemoved),
			discountAmount: pickDiscountAmountValue(row),
			finalPrice: row?.finalPrice == null || String(row?.finalPrice).trim() === '' ? null : toNumberOrZero(row?.finalPrice),
			triggeredByItemId: pickTriggeredByItemId(row),
			promotionId: pickGiftPromotionId(row),
			entryItemId: toIdOrNull(row?.entryItemId),
		}));
}

function normalizeCreateRowsForDirtyCheck(rows) {
	return (Array.isArray(rows) ? rows : [])
		.filter((row) => !isDraftRowEmpty(row) && !getEstimateItemGiftFlag(row))
		.map((row) => ({
			estimateItemId: toIdOrNull(row?.estimateItemId),
			workCategoryId: toIdOrNull(row?.workCategoryId),
			itemId: toIdOrNull(row?.itemId),
			warehouseId: toIdOrNull(row?.warehouseId ?? row?.warehouse_id),
			newCategoryName: String(row?.newCategoryName ?? '').trim(),
			itemName: String(row?.itemName ?? '').trim(),
			unit: String(row?.unit ?? '').trim(),
			quantity: toNumberOrZero(row?.quantity),
			unitPrice: toNumberOrZero(row?.unitPrice),
			isChecked: getEstimateItemStockAllocationStatus(row) === 'RELEASED' ? false : true,
			revisedFromItemId: toIdOrNull(row?.estimateItemId),
			discountAmount: pickDiscountAmountValue(row),
			finalPrice: row?.finalPrice == null || String(row?.finalPrice).trim() === '' ? null : toNumberOrZero(row?.finalPrice),
			triggeredByItemId: pickTriggeredByItemId(row),
			promotionId: pickGiftPromotionId(row),
			entryItemId: toIdOrNull(row?.entryItemId),
		}));
}

function getEstimateItemFinalPriceDisplay(item, fallbackValue) {
	const rawFinalPrice = item?.finalPrice ?? item?.final_price;
	if (rawFinalPrice == null || String(rawFinalPrice).trim() === '') return fallbackValue;
	const finalPrice = typeof rawFinalPrice === 'number' ? rawFinalPrice : Number(String(rawFinalPrice ?? '').trim());
	return Number.isFinite(finalPrice) ? finalPrice : fallbackValue;
}

/**
 * Chuyển gá ID và không trả về ID, null nếu không hợp lệ
 * @param {any} value - Giá trị cần kiểm tra
 * @returns {number|null} Số dương hoặc null
 * @usage Dùng khi lấy ID từ dữ liệu, để đảm bảo ID hợp lệ
 */
export function toIdOrNull(value) {
	if (value == null) return null;
	const n = typeof value === 'number' ? value : Number(String(value).trim());
	return Number.isFinite(n) && n > 0 ? n : null;
}

function debugEstimateVersion(tag, payload) {
	try {
		console.log(`[estimate-version-debug] ${tag}`, payload);
	} catch {
		// ignore console failures
	}
}

/**
 * Kiểm tra xem một dòng draft có rổng (ko có dữ liệu)
 * @param {object} row - Dữ liệu dòng
 * @returns {boolean} true nếu dòng trổng (ko có hạng mục, sản phẩm, số lượng, giá)
 * @usage Dùng để lọc dữ liệu, tính tổng, vào
 */
export function isDraftRowEmpty(row) {
	const newCategoryName = String(row?.newCategoryName || '').trim();
	const itemName = String(row?.itemName || '').trim();
	const quantityText = String(row?.quantity ?? '').trim();
	const unitPriceText = String(row?.unitPrice ?? '').trim();

	const qtyNumber = quantityText ? Number(quantityText) : Number.NaN;
	const priceNumber = unitPriceText ? Number(unitPriceText) : Number.NaN;
	const hasMeaningfulQty = Number.isFinite(qtyNumber) ? qtyNumber > 0 : Boolean(quantityText);
	const hasMeaningfulPrice = Number.isFinite(priceNumber) ? priceNumber > 0 : Boolean(unitPriceText);
	const taxRuleId = String(row?.taxRuleId ?? '').trim();
	return !newCategoryName && !itemName && !hasMeaningfulQty && !hasMeaningfulPrice && !taxRuleId;
}

function normalizeDraftRows(rows) {
	let next = Array.isArray(rows) ? rows : [];
	if (next.length === 0) return [createEmptyDraftRow()];

	if (next.every((r) => isDraftRowEmpty(r))) return [createEmptyDraftRow()];

	while (next.length > 1 && isDraftRowEmpty(next.at(-1)) && isDraftRowEmpty(next.at(-2))) {
		next = next.slice(0, -1);
	}

	if (!isDraftRowEmpty(next.at(-1))) {
		next = [...next, createEmptyDraftRow()];
	}

	return next;
}

function normalizeText(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

function mapTaxRuleItem(item) {
	if (!item) return null;
	return {
		taxRuleId: item.taxRuleId ?? item.id ?? 0,
		taxCode: item.taxCode ?? item.code ?? '',
		taxName: item.taxName ?? item.name ?? '',
		taxRate: item.taxRate ?? item.rate ?? 0,
	};
}

function matchesQuery(item, rawQuery) {
	const q = normalizeText(rawQuery).trim();
	if (!q) return true;

	const name = normalizeText(item?.itemName);
	const code = normalizeText(item?.itemCode);
	const category = normalizeText(item?.category);
	return name.includes(q) || code.includes(q) || category.includes(q);
}

export function useInventoryCheckHandlers() {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [catalogItems, setCatalogItems] = useState([]);
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const hasFetchedRef = useRef(false);

	const toggleOpen = useCallback(() => {
		setIsOpen((prev) => !prev);
		setError('');
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setError('');
	}, []);

	const onQueryChange = useCallback((e) => {
		setQuery(e.target.value);
		setError('');
	}, []);

	const ensureCatalogFetched = useCallback(async () => {
		if (hasFetchedRef.current) return catalogItems;

		const res = await fetchAllCatalogItems();
		const items = Array.isArray(res?.data) ? res.data : [];
		hasFetchedRef.current = true;
		setCatalogItems(items);
		return items;
	}, [catalogItems]);

	const runSearch = useCallback(async () => {
		if (loading) return;
		const q = String(query ?? '').trim();

		if (!q) {
			setResults([]);
			setError('Vui lòng nhập tên/mã phụ tùng để tìm.');
			return;
		}

		try {
			setLoading(true);
			setError('');
			const items = await ensureCatalogFetched();
			const filtered = (Array.isArray(items) ? items : []).filter((it) => matchesQuery(it, q));
			setResults(filtered);
			if (filtered.length === 0) setError('Không tìm thấy phụ tùng phù hợp trong kho.');
		} catch (err) {
			setResults([]);
			setError(err?.message || 'Không thể kiểm tra tồn kho.');
		} finally {
			setLoading(false);
		}
	}, [ensureCatalogFetched, loading, query]);

	const onSubmit = useCallback(
		(e) => {
			e?.preventDefault?.();
			runSearch();
		},
		[runSearch],
	);

	const showResults = useMemo(() => {
		return isOpen && !loading && Array.isArray(results) && results.length > 0;
	}, [isOpen, loading, results]);

	return {
		isOpen,
		query,
		results,
		loading,
		error,
		showResults,
		toggleOpen,
		close,
		onQueryChange,
		runSearch,
		onSubmit,
	};
}

export function useAdvisorItemsTableHandlers(serviceTicketId, options = {}) {
	const { onEstimateStatusChange, refreshToken, draftStorageKey, autoStartCreate = false } = options || {};
	const standaloneDraftMode = Boolean(draftStorageKey);
	const onEstimateStatusChangeRef = useRef(onEstimateStatusChange);

	const activeTicketId = serviceTicketId || 'new_booking';
	const backupKey = `gms_advisor_table_backup_${activeTicketId}`;

	const getBackupState = () => {
		if (typeof sessionStorage === 'undefined') return null;
		try {
			const raw = sessionStorage.getItem(backupKey);
			if (raw) {
				return JSON.parse(raw);
			}
		} catch (e) {
			console.error(e);
		}
		return null;
	};

	const backup = getBackupState();

	const [estimate, setEstimate] = useState(() => backup?.estimate ?? readEstimateDraftSnapshot(draftStorageKey));
	const estimateRef = useRef(estimate);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [fetched, setFetched] = useState(false);
	const [taxRules, setTaxRules] = useState([]);
	const [taxRulesLoading, setTaxRulesLoading] = useState(false);
	const [taxRulesError, setTaxRulesError] = useState('');
	const [workCategories, setWorkCategories] = useState([]);
	const [workCategoriesLoading, setWorkCategoriesLoading] = useState(false);
	const [workCategoriesError, setWorkCategoriesError] = useState('');
	const [isAddingNewTaxRule, setIsAddingNewTaxRule] = useState(false);
	const [taxName, setTaxName] = useState('');
	const [taxRate, setTaxRate] = useState('');
	const [isCreatingTaxRule, setIsCreatingTaxRule] = useState(false);
	const [recommendation, setRecommendation] = useState('');
	const [recommendationLoading, setRecommendationLoading] = useState(false);
	const [recommendationSaving, setRecommendationSaving] = useState(false);

	const [isCreating, setIsCreating] = useState(() => backup?.isCreating ?? false);
	const [isEditing, setIsEditing] = useState(() => backup?.isEditing ?? false);
	const [isAppendOnlyEdit, setIsAppendOnlyEdit] = useState(() => backup?.isAppendOnlyEdit ?? false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [draftRows, setDraftRows] = useState(() => backup?.draftRows ?? [createEmptyDraftRow()]);
	const [editRows, setEditRows] = useState(() => backup?.editRows ?? [createEmptyDraftRow()]);
	const initialEditRowsSnapshotRef = useRef('');
	const initialCreateRowsSnapshotRef = useRef('');
	const lastValidServiceTicketIdRef = useRef(
		serviceTicketId != null && String(serviceTicketId).trim() !== '' ? serviceTicketId : null,
	);

	const inventory = useInventoryCheckHandlers();
	const draftStorageKeyRef = useRef(draftStorageKey);

	useEffect(() => {
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.removeItem(backupKey);
		}
	}, [backupKey]);

	const itemTaxRuleCacheRef = useRef(new Map());
	const resolveItemTaxRuleId = useCallback(async (itemId) => {
		const idNum = toIdOrNull(itemId);
		if (!idNum) return '';
		const cache = itemTaxRuleCacheRef.current;
		if (cache.has(idNum)) return cache.get(idNum);

		const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
		if (!token) return '';
		try {
			const res = await fetchWarehouseCatalogItemDetail(idNum, token);
			const payload = extractApiPayload(res);
			const rawTaxId = getTaxRuleIdFromCatalogPayload(payload);
			const normalized = rawTaxId == null ? '' : String(rawTaxId);
			cache.set(idNum, normalized);
			return normalized;
		} catch {
			cache.set(idNum, '');
			return '';
		}
	}, []);

	const enrichRowsWithItemTaxes = useCallback(
		async (rowsSnapshot, setRows) => {
			const base = Array.isArray(rowsSnapshot) ? rowsSnapshot : [];
			const missingItemIds = [
				...new Set(
					base
						.map((r) => toIdOrNull(r?.itemId))
						.filter((id) => id && !toIdOrNull(base.find((x) => toIdOrNull(x?.itemId) === id)?.itemTaxRuleId)),
				),
			];
			if (missingItemIds.length === 0) return;

			const pairs = await Promise.all(
				missingItemIds.map(async (id) => {
					const taxId = await resolveItemTaxRuleId(id);
					return [id, taxId];
				}),
			);
			const taxByItemId = new Map(pairs.filter(([, taxId]) => toIdOrNull(taxId)));
			if (taxByItemId.size === 0) return;

			setRows((prev) => {
				const current = Array.isArray(prev) ? prev : [];
				let changed = false;
				const next = current.map((r) => {
					const id = toIdOrNull(r?.itemId);
					if (!id) return r;
					if (toIdOrNull(r?.itemTaxRuleId)) return r;
					const taxId = taxByItemId.get(id);
					if (!taxId) return r;
					changed = true;
					return {
						...r,
						itemTaxRuleId: String(taxId),
						// Item có thuế -> không cho dùng manual tax.
						taxRuleId: '',
					};
				});
				return changed ? next : current;
			});
		},
		[resolveItemTaxRuleId],
	);

	const refetchLatestEstimate = useCallback(
		async (serviceTicketIdValue, token, ...fallbackSources) => {
			const ticketIdNum = toIdOrNull(serviceTicketIdValue);
			if (!ticketIdNum || !token) return null;
			const latestRes = await fetchServiceTicketEstimate(ticketIdNum, token);
			return mergeEstimateWithWarehouseDisplay(
				pickLatestEstimate(extractApiPayload(latestRes)),
				...fallbackSources,
			);
		},
		[],
	);

	const syncEstimate = useCallback((nextEstimate) => {
		const next = nextEstimate ?? null;
		setEstimate(next);
		estimateRef.current = next;
		onEstimateStatusChangeRef.current?.(next);
	}, []);

	useEffect(() => {
		onEstimateStatusChangeRef.current = onEstimateStatusChange;
	}, [onEstimateStatusChange]);

	useEffect(() => {
		estimateRef.current = estimate;
	}, [estimate]);

	useEffect(() => {
		draftStorageKeyRef.current = draftStorageKey;
	}, [draftStorageKey]);

	useEffect(() => {
		if (!standaloneDraftMode) return;
		setEstimate(readEstimateDraftSnapshot(draftStorageKey));
	}, [draftStorageKey, standaloneDraftMode]);

	useEffect(() => {
		if (!standaloneDraftMode) return;
		writeEstimateDraftSnapshot(draftStorageKeyRef.current, estimate);
	}, [estimate, standaloneDraftMode]);

	const recommendationLastSavedRef = useRef('');

	// DO NOT reset recommendation state here — the fetch effect below handles loading fresh data
	// recommendationLastSavedRef tracks what was last confirmed from backend

	const extractRecommendValue = useCallback((res) => {
		const normalizeRecommendationString = (value) => {
			const raw = String(value ?? '').trim();
			const apiStatusValues = new Set(['SUCCESS', 'OK', 'FAILED', 'FAILURE', 'ERROR', 'TRUE', 'FALSE']);
			return apiStatusValues.has(raw.toUpperCase()) ? '' : raw;
		};

		const payload = res?.data?.data ?? res?.data ?? res;
		if (payload == null) return '';

		if (typeof payload === 'string') {
			const raw = payload.trim();
			if (raw.startsWith('{') || raw.startsWith('[')) {
				try {
					const parsed = JSON.parse(raw);
					return extractRecommendValue({ data: parsed });
				} catch {
					// fall back to raw
				}
			}
			return normalizeRecommendationString(raw);
		}
		if (typeof payload === 'object') {
			if (typeof payload?.recommend === 'string') return normalizeRecommendationString(payload.recommend);
			if (typeof payload?.recommendation === 'string') return normalizeRecommendationString(payload.recommendation);
			if (typeof payload?.recommendationText === 'string') return normalizeRecommendationString(payload.recommendationText);
			if (typeof payload?.currentRecommend === 'string') return normalizeRecommendationString(payload.currentRecommend);

			if (typeof payload?.data === 'string') return normalizeRecommendationString(payload.data);

			if (typeof payload?.data === 'object' && payload?.data != null) {
				const nested = payload.data;
				if (typeof nested?.recommend === 'string') return normalizeRecommendationString(nested.recommend);
				if (typeof nested?.recommendation === 'string') return normalizeRecommendationString(nested.recommendation);
				if (typeof nested?.recommendationText === 'string') return normalizeRecommendationString(nested.recommendationText);
				if (typeof nested?.currentRecommend === 'string') return normalizeRecommendationString(nested.currentRecommend);
			}
		}
		return '';
	}, []);

	// Load recommendation from backend when serviceTicketId is available.
	// Use ref to track which id the current fetch is for — avoid stale results.
	useEffect(() => {
		const token = localStorage.getItem('authToken');
		const idNum = toIdOrNull(serviceTicketId);
		if (!token || !idNum) return;

		let cancelled = false;
		const run = async () => {
			try {
				setRecommendationLoading(true);
				const res = await fetchSafetyInspectionCurrentRecommend(idNum, token);
				if (cancelled) return;
				const value = extractRecommendValue(res) || localStorage.getItem(getRecommendationStorageKey(idNum)) || '';
				recommendationLastSavedRef.current = value;
				setRecommendation(value);
			} catch {
				// load failed — keep current state
			} finally {
				if (!cancelled) setRecommendationLoading(false);
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [serviceTicketId, refreshToken, extractRecommendValue]);

	const saveRecommendation = useCallback(
		async (valueOverride) => {
			if (recommendationSaving) return false;
			const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
			if (!token) {
				const error = new Error('Vui lòng đăng nhập để cập nhật khuyến nghị.');
				error.status = 401;
				throw error;
			}

			const idNum = toIdOrNull(serviceTicketId);
			if (!idNum) {
				const error = new Error('Thiếu serviceTicketId hợp lệ để cập nhật khuyến nghị.');
				error.status = 400;
				throw error;
			}

			const nextValue = valueOverride == null ? String(recommendation ?? '') : String(valueOverride);
			if (nextValue === recommendationLastSavedRef.current) return false;

			try {
				setRecommendationSaving(true);
				const savedValue = nextValue;
				await updateSafetyInspectionRecommend(idNum, savedValue, token);
				if (String(savedValue).trim()) {
					localStorage.setItem(getRecommendationStorageKey(idNum), savedValue);
				} else {
					localStorage.removeItem(getRecommendationStorageKey(idNum));
				}
				recommendationLastSavedRef.current = savedValue;
				setRecommendation(savedValue);
				try {
					const refreshed = await fetchSafetyInspectionCurrentRecommend(idNum, token);
					const confirmed = extractRecommendValue(refreshed);
					if (String(confirmed).trim() !== '') {
						localStorage.setItem(getRecommendationStorageKey(idNum), confirmed);
						recommendationLastSavedRef.current = confirmed;
						setRecommendation(confirmed);
					}
				} catch {
					// Save succeeded — re-fetch failure is non-critical
				}
				return true;
			} finally {
				setRecommendationSaving(false);
			}
		},
		[serviceTicketId, recommendation, recommendationSaving, extractRecommendValue],
	);

	useEffect(() => {
		if (serviceTicketId == null) return;
		const s = String(serviceTicketId).trim();
		if (!s) return;
		lastValidServiceTicketIdRef.current = serviceTicketId;
	}, [serviceTicketId]);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setTaxRules([]);
			setTaxRulesError('');
			setTaxRulesLoading(false);
			setIsAddingNewTaxRule(false);
			setTaxName('');
			setTaxRate('');
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setTaxRulesLoading(true);
				setTaxRulesError('');
				const res = await fetchTaxRulesAll(token);
				if (ignore) return;
				setTaxRules(Array.isArray(res?.data) ? res.data : []);
			} catch (err) {
				if (ignore) return;
				setTaxRules([]);
				setTaxRulesError(err?.message || 'Không thể tải danh sách loại thuế.');
			} finally {
				if (!ignore) setTaxRulesLoading(false);
			}
		};
		run();
		return () => {
			ignore = true;
		};
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setWorkCategories([]);
			setWorkCategoriesError('');
			setWorkCategoriesLoading(false);
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setWorkCategoriesLoading(true);
				setWorkCategoriesError('');
				const res = await fetchWorkCategoriesAll(token);
				if (ignore) return;
				setWorkCategories(Array.isArray(res?.data) ? res.data : []);
			} catch (err) {
				if (ignore) return;
				setWorkCategories([]);
				setWorkCategoriesError(err?.message || 'Không thể tải danh sách hạng mục.');
			} finally {
				if (!ignore) setWorkCategoriesLoading(false);
			}
		};
		run();
		return () => {
			ignore = true;
		};
	}, []);

	const startAddNewTaxRule = useCallback(() => {
		if (taxRulesLoading) return;
		setIsAddingNewTaxRule(true);
		setTaxName('');
		setTaxRate('');
		setSaveError('');
	}, [taxRulesLoading]);

	const stopAddNewTaxRule = useCallback(() => {
		if (isCreatingTaxRule) return;
		setIsAddingNewTaxRule(false);
		setTaxName('');
		setTaxRate('');
	}, [isCreatingTaxRule]);

	const handleCreateTaxRule = useCallback(async () => {
		if (isCreatingTaxRule) return null;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để tạo loại thuế.');
			return null;
		}

		const nameValidated = validateTaxName(taxName, { required: true });
		if (nameValidated.error) {
			setSaveError(nameValidated.error);
			return null;
		}
		const rateValidated = validateTaxRatePercent(taxRate, { required: true });
		if (rateValidated.error) {
			setSaveError(rateValidated.error);
			return null;
		}
		const name = nameValidated.value;
		const rateNumber = rateValidated.value;

		try {
			setIsCreatingTaxRule(true);
			setSaveError('');
			const res = await createTaxRule(
				{
					taxName: name,
					taxRate: rateNumber,
				},
				token,
			);
			const payload = res?.data?.data ?? res?.data ?? res;
			const created = mapTaxRuleItem(payload);
			const createdId = toIdOrNull(created?.taxRuleId);
			if (!createdId) {
				setSaveError('Tạo thuế thất bại (không nhận được taxRuleId).');
				return null;
			}

			setTaxRules((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((t) => toIdOrNull(t?.taxRuleId) !== createdId);
				return [created, ...withoutDup];
			});

			setIsAddingNewTaxRule(false);
			setTaxName('');
			setTaxRate('');
			return createdId;
		} catch (err) {
			setSaveError(err?.message || 'Không thể tạo thuế.');
			return null;
		} finally {
			setIsCreatingTaxRule(false);
		}
	}, [isCreatingTaxRule, taxName, taxRate]);

	const validateDraftOrEditRows = useCallback((rows, requireItemForPredefinedCategory = true) => {
		const base = Array.isArray(rows) ? rows : [];
		const active = base.map((r, index) => ({ r, index })).filter(({ r }) => !isDraftRowEmpty(r));
		if (active.length === 0) return { ok: false, error: 'Vui lòng nhập ít nhất 1 dòng (hạng mục, số lượng).' };

		for (const { r, index } of active) {
			const error = getEstimateRowValidationError(r, index, requireItemForPredefinedCategory);
			if (error) return { ok: false, error };
		}

		return { ok: true, error: '' };
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		const hasValidServiceTicketId = serviceTicketId != null && String(serviceTicketId).trim() !== '';
		if (standaloneDraftMode && !hasValidServiceTicketId) {
			setLoading(false);
			setLoadError('');
			setFetched(true);
			onEstimateStatusChangeRef.current?.(estimateRef.current);
			return;
		}
		if (!token || !hasValidServiceTicketId) {
			setEstimate(null);
			setFetched(false);
			onEstimateStatusChangeRef.current?.(null);
			// Nếu mất token thì chắc chắn phải reset trạng thái.
			// Nếu serviceTicketId rỗng nhưng trước đó đã có ID hợp lệ,
			// coi như trạng thái tạm trong lúc reload (onRestartWorkflow) và không wipe draft.
			if (!token || lastValidServiceTicketIdRef.current == null) {
				setIsCreating(false);
				setIsEditing(false);
			}
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setLoading(true);
				setLoadError('');
				setFetched(false);
				const res = await fetchServiceTicketEstimate(serviceTicketId, token);
				if (ignore) return;
				const picked = mergeEstimateWithWarehouseDisplay(
					pickLatestEstimate(extractApiPayload(res)),
					estimateRef.current,
				);
				setEstimate(picked);
				onEstimateStatusChangeRef.current?.(picked);
				setFetched(true);
			} catch (err) {
				if (ignore) return;
				setEstimate(null);
				onEstimateStatusChangeRef.current?.(null);
				setLoadError(err?.message || 'Không thể tải ước tính.');
				setFetched(true);
			} finally {
				if (!ignore) setLoading(false);
			}
		};

		run();
		return () => {
			ignore = true;
		};
	}, [refreshToken, serviceTicketId, standaloneDraftMode]);

	useEffect(() => {
		if (!standaloneDraftMode || !autoStartCreate) return;
		if (!fetched || loading) return;
		if (estimate || isCreating || isEditing || isSaving) return;
		setIsCreating(true);
		setDraftRows([createEmptyDraftRow()]);
		setSaveError('');
	}, [autoStartCreate, estimate, fetched, isCreating, isEditing, isSaving, loading, standaloneDraftMode]);

	function isValidTicketId(value) {
		return value != null && String(value).trim() !== '';
	}

	const prevCreateServiceTicketIdRef = useRef(
		isValidTicketId(serviceTicketId) ? serviceTicketId : lastValidServiceTicketIdRef.current,
	);
	useEffect(() => {
		if (!isCreating) return;
		if (!isValidTicketId(serviceTicketId)) return;
		const prev = prevCreateServiceTicketIdRef.current;
		prevCreateServiceTicketIdRef.current = serviceTicketId;
		if (prev === serviceTicketId) return;
		setDraftRows([createEmptyDraftRow()]);
		setSaveError('');
	}, [serviceTicketId, isCreating]);

	const prevEditServiceTicketIdRef = useRef(
		isValidTicketId(serviceTicketId) ? serviceTicketId : lastValidServiceTicketIdRef.current,
	);
	useEffect(() => {
		if (!isEditing) return;
		if (!isValidTicketId(serviceTicketId)) return;
		const prevValid = prevEditServiceTicketIdRef.current;
		prevEditServiceTicketIdRef.current = serviceTicketId;
		if (prevValid === serviceTicketId) return;
		setEditRows([createEmptyDraftRow()]);
		setSaveError('');
	}, [serviceTicketId, isEditing]);

	const rows = useMemo(() => {
		const items = Array.isArray(estimate?.items) ? estimate.items : [];
		return items
			.map((it, idx) => ({ it, idx }))
			.filter(({ it }) => !it?.isRemoved)
			.map(({ it, idx }) => {
				const quantity = it?.quantity ?? '';
				const unitPrice = it?.unitPrice ?? '';
				const subTotal = it?.subTotal ?? '';
				const unitPriceWithVat = it?.unitPriceWithVat ?? it?.unitPriceWithVAT ?? '';
				const subTotalWithVat = it?.subTotalWithVat ?? it?.subTotalWithVAT ?? '';
				const subTotalDisplay = pickMoneyDisplayValue(subTotalWithVat, subTotal);
				const unit = getItemUnitFromEstimateItem(it);
				const categoryName =
					it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '';
				const estimateItemId = it?.estimateItemId ?? it?.estimateItemID ?? it?.id ?? null;
				const workCategoryId =
					it?.workCategoryId ??
					it?.workCateId ??
					it?.workCategory?.workCategoryId ??
					it?.workCategory?.workCateId ??
					it?.workCategory?.id ??
					null;
				const workCategoryCode = String(it?.workCategory?.categoryCode ?? '').trim();
				const workCategoryTaxRuleId = it?.workCategory?.taxRuleId ?? '';
				const itemId = it?.itemId ?? it?.catalogItemId ?? it?.serviceItemId ?? it?.id ?? null;
				const itemTaxRuleId = getItemTaxRuleIdFromEstimateItem(it);
				const warehouseId =
					it?.warehouseId ??
					it?.warehouse_id ??
					it?.warehouse?.warehouseId ??
					it?.stockAllocation?.warehouseId ??
					it?.allocation?.warehouseId ??
					it?.warehouseAllocation?.warehouseId ??
					'';
				const warehouseName = getEstimateItemWarehouseName(it);
				const allocationId =
					it?.allocationId ??
					it?.stockAllocationId ??
					it?.stock_allocation_id ??
					it?.stockAllocation?.allocationId ??
					it?.stockAllocation?.stockAllocationId ??
					it?.allocation?.allocationId ??
					it?.allocation?.stockAllocationId ??
					it?.warehouseAllocation?.allocationId ??
					it?.warehouseAllocation?.stockAllocationId ??
					null;
				const issueId =
					it?.issueId ??
					it?.stockIssueId ??
					it?.stock_issue_id ??
					it?.stockAllocation?.issueId ??
					it?.stockAllocation?.stockIssueId ??
					it?.allocation?.issueId ??
					it?.allocation?.stockIssueId ??
					it?.warehouseAllocation?.issueId ??
					it?.warehouseAllocation?.stockIssueId ??
					null;
				// Nếu sản phẩm có thuế, luôn ưu tiên thuế sản phẩm -> clear chọn thuế thủ công để UI hiển thị đúng.
				const taxRuleId = toIdOrNull(itemTaxRuleId) ? '' : (it?.taxRuleId ?? '');
				return {
					key: String(it?.estimateItemId ?? it?.itemId ?? it?.itemName ?? `item-${idx}`),
					sourceIndex: idx,
					estimateItemId,
					workCategoryId,
					workCategoryCode,
					workCategoryTaxRuleId,
					itemId,
					unit,
					warehouseId,
					warehouseName,
					allocationId,
					issueId,
					itemTaxRuleId,
					categoryName,
					itemName: it?.itemName || '',
					quantity,
					unitPrice,
					subTotal,
					unitPriceDisplay: pickMoneyDisplayValue(unitPriceWithVat, unitPrice),
					subTotalDisplay,
					discountAmount: pickDiscountAmountValue(it),
					finalPrice: it?.finalPrice ?? it?.final_price ?? '',
					finalPriceDisplay: getEstimateItemFinalPriceDisplay(it, subTotalDisplay),
					appliedTaxRate: it?.appliedTaxRate ?? it?.applied_tax_rate ?? '',
					isGift: getEstimateItemGiftFlag(it),
					triggeredByItemId: pickTriggeredByItemId(it),
					stockAllocationStatus: getEstimateItemStockAllocationStatus(it),
					stockAllocation: it?.stockAllocation ?? it?.allocation ?? it?.warehouseAllocation ?? null,
					returnStatus:
						it?.stockAllocation?.returnStatus ?? it?.allocation?.returnStatus ?? it?.warehouseAllocation?.returnStatus ?? it?.returnStatus ?? null,
					returnId:
						it?.stockAllocation?.returnId ?? it?.allocation?.returnId ?? it?.warehouseAllocation?.returnId ?? it?.returnId ?? null,
					taxRuleId,
					isRemoved: Boolean(it?.isRemoved),
				};
			});
	}, [estimate]);

	const taxRuleById = useMemo(() => {
		const map = new Map();
		for (const rule of Array.isArray(taxRules) ? taxRules : []) {
			const id = toIdOrNull(rule?.taxRuleId);
			if (id) map.set(id, rule);
		}
		return map;
	}, [taxRules]);

	// Danh sách hạng mục được index theo tên và mã (đã chuẩn hóa) để lookup nhanh khi chọn hạng mục cho dòng ước tính
	const workCategoryByNormalizedName = useMemo(() => {
		const map = new Map();
		for (const c of Array.isArray(workCategories) ? workCategories : []) {
			const name = String(c?.categoryName ?? '').trim();
			const code = String(c?.categoryCode ?? '').trim();
			const id = toIdOrNull(c?.workCateId ?? c?.workCategoryId ?? c?.id);
			if (!id) continue;
			if (name) map.set(normalizeText(name), c);
			if (code) map.set(normalizeText(code), c);
		}
		return map;
	}, [workCategories]);

	// Danh sách tên hạng mục để hiển thị trong dropdown khi chọn hạng mục cho dòng ước tính
	const categorySuggestions = useMemo(() => {
		return (Array.isArray(workCategories) ? workCategories : [])
			.map((c) => String(c?.categoryName || c?.categoryCode || '').trim())
			.filter(Boolean);
	}, [workCategories]);

	// tự động điền workCategoryId và taxRuleId khi chọn hạng mục, dựa trên tên hạng mục đã chọn
	const applyCategorySelection = useCallback(
		(row, nextCategoryLabel) => {
			const label = String(nextCategoryLabel ?? '').trim();
			const found = label ? workCategoryByNormalizedName.get(normalizeText(label)) : null;
			if (!found) {
				return {
					...row,
					workCategoryId: null,
					workCategoryCode: '',
					workCategoryTaxRuleId: '',
					itemTaxRuleId: '',
					newCategoryName: nextCategoryLabel,
				};
			}

			const workCategoryId =
				found?.workCateId ??
				found?.workCategoryId ??
				found?.id ??
				null;
			const workCategoryCode = String(found?.categoryCode ?? '').trim();
			const taxRuleId = found?.taxRuleId ?? '';
			const nextWorkCategoryTaxRuleId = taxRuleId == null ? '' : String(taxRuleId);
			return {
				...row,
				workCategoryId,
				workCategoryCode,
				workCategoryTaxRuleId: nextWorkCategoryTaxRuleId,
				itemId: null,
				unit: '',
				itemName: '',
				itemTaxRuleId: '',
				newCategoryName: found?.categoryName || found?.categoryCode || label,
				// Chỉ cho chọn thuế thủ công khi cả sản phẩm & hạng mục đều không có thuế.
				taxRuleId: nextWorkCategoryTaxRuleId ? '' : String(row?.taxRuleId ?? ''),
			};
		},
		[workCategoryByNormalizedName],
	);

	const canEdit = useMemo(() => {
		return fetched && !loading && !loadError && !!estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	// Tính toán lại các cột phụ thuộc (subTotal, subTotalWithVat) mỗi khi có thay đổi ở quantity, unitPrice hoặc taxRuleId của dòng ước tính đang tạo hoặc đang edit
	const draftComputed = useMemo(() => {
		return draftRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;

			const taxId = getEffectiveTaxRuleId(r);
			const taxRateRaw = taxId ? taxRuleById.get(taxId)?.taxRate : 0;
			let rate = toNumberOrZero(taxRateRaw);
			if (rate > 1) rate = rate / 100;
			if (rate < 0) rate = 0;
			const subTotalWithVat = subTotal * (1 + rate);

			return {
				key: `draft-${idx + 1}`,
				...r,
				subTotal,
				subTotalWithVat,
			};
		});
	}, [draftRows, taxRuleById]);

	// Tương tự như trên nhưng cho các dòng đang edit (ko chỉ có thể edit một vài trường chứ không phải tất cả như trên)
	const editComputed = useMemo(() => {
		return editRows.map((r, idx) => {
			if (getEstimateItemGiftFlag(r)) {
				return {
					key: `edit-${idx + 1}`,
					...r,
					subTotal: 0,
					subTotalWithVat: 0,
					finalPriceDisplay: 0,
				};
			}

			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;

			const taxId = getEffectiveTaxRuleId(r);
			const taxRateRaw = taxId ? taxRuleById.get(taxId)?.taxRate : 0;
			let rate = toNumberOrZero(taxRateRaw);
			if (rate > 1) rate = rate / 100;
			if (rate < 0) rate = 0;
			// Nếu có taxRuleId và tìm được thuế suất tương ứng thì mới tính subTotalWithVat, nếu không thì coi như chưa bao gồm VAT
			const subTotalWithVat = subTotal * (1 + rate);

			return {
				key: `edit-${idx + 1}`,
				...r,
				subTotal,
				subTotalWithVat,
			};
		});
	}, [editRows, taxRuleById]);

	// Tổng tiền của các dòng ước tính đang tạo hoặc đang edit, được dùng để hiển thị ở dòng status và footer của table
	const draftTotal = useMemo(() => {
		return draftComputed.reduce((acc, r) => {
			if (getEstimateItemStockAllocationStatus(r) === 'RELEASED') return acc;
			if (getEstimateItemGiftFlag(r)) return acc + toNumberOrZero(r?.finalPrice ?? r?.finalPriceDisplay ?? 0);
			const discountAmount = pickDiscountAmountValue(r);
			const rawFinalPrice = r?.finalPrice ?? r?.final_price;
			if (discountAmount > 0 && rawFinalPrice != null && String(rawFinalPrice).trim() !== '') {
				return acc + toNumberOrZero(rawFinalPrice);
			}
			const taxId = getEffectiveTaxRuleId(r);
			const raw = taxId ? r?.subTotalWithVat : r?.subTotal;
			return acc + toNumberOrZero(raw);
		}, 0);
	}, [draftComputed]);

	const editTotal = useMemo(() => {
		return editComputed.reduce((acc, r) => {
			if (getEstimateItemStockAllocationStatus(r) === 'RELEASED') return acc;
			if (getEstimateItemGiftFlag(r)) return acc + toNumberOrZero(r?.finalPrice ?? r?.finalPriceDisplay ?? 0);
			const discountAmount = pickDiscountAmountValue(r);
			const rawFinalPrice = r?.finalPrice ?? r?.final_price;
			if (discountAmount > 0 && rawFinalPrice != null && String(rawFinalPrice).trim() !== '') {
				return acc + toNumberOrZero(rawFinalPrice);
			}
			const taxId = getEffectiveTaxRuleId(r);
			const raw = taxId ? r?.subTotalWithVat : r?.subTotal;
			return acc + toNumberOrZero(raw);
		}, 0);
	}, [editComputed]);

	const total = useMemo(() => {
		const raw = estimate?.totalPrice;
		const n = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(n) ? n : 0;
	}, [estimate]);

	//Quyết định hiển thị tổng tiền nào ở dòng status và footer của table: nếu đang tạo thì hiển thị draftTotal, nếu đang edit thì hiển thị editTotal, nếu đang load thì hiển thị "Đang tải...", nếu có lỗi hoặc chưa có estimate thì hiển thị "-", còn bình thường thì hiển thị total từ backend
	const estimateCostText = useMemo(() => {
		if (isCreating) return formatCurrencyVnd(draftTotal) || '-';
		if (isEditing) return formatCurrencyVnd(editTotal) || '-';
		if (loading) return 'Đang tải...';
		if (!estimate) return '-';
		return formatCurrencyVnd(total) || '-';
	}, [isCreating, draftTotal, isEditing, editTotal, loading, estimate, total]);

	const showAddEstimate = useMemo(() => {
		return fetched && !loading && !loadError && !estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	const statusLine = useMemo(() => {
		if (saveError || loadError || taxRulesError || workCategoriesError) return saveError || loadError || taxRulesError || workCategoriesError;
		if (isCreating || isEditing) {
			const activeRows = isCreating ? draftRows : editRows;
			const hasAny = activeRows.some((r) => !isDraftRowEmpty(r));
			const allHaveTax = activeRows
				.filter((r) => !isDraftRowEmpty(r))
				.every((r) => Boolean(getEffectiveTaxRuleId(r)));
			if (!hasAny) return 'Chưa bao gồm thuế';
			return allHaveTax ? 'Đã bao gồm thuế (ước tính)' : 'Chưa bao gồm thuế';
		}
		return 'Đã bao gồm thuế(Nếu có)';
	}, [saveError, loadError, taxRulesError, workCategoriesError, isCreating, isEditing, draftRows, editRows]);

	const footerTotalText = useMemo(() => {
		if (isCreating) return formatCurrencyVnd(draftTotal);
		if (isEditing) return formatCurrencyVnd(editTotal);
		if (!estimate) return '';
		return formatCurrencyVnd(total);
	}, [isCreating, draftTotal, isEditing, editTotal, estimate, total]);

	const tableRows = useMemo(() => {
		if (isCreating) return draftComputed;
		if (isEditing) return editComputed;
		return rows;
	}, [isCreating, isEditing, draftComputed, editComputed, rows]);

	const currentCreateRowsSnapshot = useMemo(
		() => JSON.stringify(normalizeCreateRowsForDirtyCheck(draftRows)),
		[draftRows],
	);
	const hasCreateChanges = useMemo(() => {
		if (!isCreating) return false;
		if (!initialCreateRowsSnapshotRef.current) return currentCreateRowsSnapshot !== '[]';
		return initialCreateRowsSnapshotRef.current !== currentCreateRowsSnapshot;
	}, [currentCreateRowsSnapshot, isCreating]);

	const currentEditRowsSnapshot = useMemo(
		() => JSON.stringify(normalizeEditRowsForDirtyCheck(editRows)),
		[editRows],
	);
	const hasEditChanges = useMemo(() => {
		if (!isEditing) return false;
		if (!initialEditRowsSnapshotRef.current) return currentEditRowsSnapshot !== '[]';
		return initialEditRowsSnapshotRef.current !== currentEditRowsSnapshot;
	}, [currentEditRowsSnapshot, isEditing]);

	const showInputs = useMemo(() => {
		return isCreating || isEditing;
	}, [isCreating, isEditing]);

	const handleDraftChange = useCallback((index, field, value) => {
		setDraftRows((prev) => {
			const base = Array.isArray(prev) ? prev : [];
			if (
				base[index]?.isLockedFromPreviousVersion ||
				getEstimateItemGiftFlag(base[index]) ||
				isWarehouseStockLockedStatus(getEstimateItemStockAllocationStatus(base[index]))
			) return base;
			const next = base.map((r, idx) => {
				if (idx !== index) return r;
				if (field === 'newCategoryName') return applyCategorySelection(r, value);
				// Convert quantity to Number (positive integer only)
				if (field === 'quantity') {
					const normalized = String(value || '').trim();
					const num = normalized ? Number(normalized) : 0;
					return { ...r, [field]: num };
				}
				// Convert unitPrice to Number (positive decimal allowed)
				if (field === 'unitPrice') {
					const normalized = String(value || '').trim();
					const num = normalized ? Number(normalized) : 0;
					return { ...r, [field]: num };
				}
				return { ...r, [field]: value };
			});
			return normalizeDraftRows(next);
		});
	}, [applyCategorySelection]);

	const handleEditChange = useCallback((index, field, value) => {
		setEditRows((prev) => {
			const base = Array.isArray(prev) ? prev : [];
			if (
				base[index]?.isLockedFromPreviousVersion ||
				getEstimateItemGiftFlag(base[index]) ||
				isWarehouseStockLockedStatus(getEstimateItemStockAllocationStatus(base[index]))
			) return base;
			const next = base.map((r, idx) => {
				if (idx !== index) return r;
				if (field === 'newCategoryName') return applyCategorySelection(r, value);
				// Convert quantity to Number (positive integer only)
				if (field === 'quantity') {
					const normalized = String(value || '').trim();
					const num = normalized ? Number(normalized) : 0;
					return { ...r, [field]: num };
				}
				// Convert unitPrice to Number (positive decimal allowed)
				if (field === 'unitPrice') {
					const normalized = String(value || '').trim();
					const num = normalized ? Number(normalized) : 0;
					return { ...r, [field]: num };
				}
				return { ...r, [field]: value };
			});
			return normalizeDraftRows(next);
		});
	}, [applyCategorySelection]);

	const onChange = useMemo(() => {
		return isCreating ? handleDraftChange : handleEditChange;
	}, [isCreating, handleDraftChange, handleEditChange]);

	const startCreate = useCallback((options) => {
		if (isEditing) return;
		const seedFromPreviousEstimate = Boolean(options?.seedFromPreviousEstimate);
		const hasEstimateOverride = Object.prototype.hasOwnProperty.call(options || {}, 'estimateOverride');
		const sourceEstimate = hasEstimateOverride ? options.estimateOverride : estimate;
		setIsCreating(true);
		setSaveError('');
		if (seedFromPreviousEstimate) {
			const items = Array.isArray(sourceEstimate?.items) ? sourceEstimate.items : [];
			const locked = items
				.filter((it) => !it?.isRemoved)
				.map((it, idx) => mapEstimateItemToLockedRow(it, idx, { resetPromotionPricing: true }));
			const seeded = normalizeDraftRows([...locked, createEmptyDraftRow()]);
			initialCreateRowsSnapshotRef.current = JSON.stringify(normalizeCreateRowsForDirtyCheck(seeded));
			setDraftRows(seeded);
			// Enrich tax for seeded locked rows if estimate API didn't embed item tax.
			enrichRowsWithItemTaxes(seeded, setDraftRows);
			return;
		}
		initialCreateRowsSnapshotRef.current = '';
		setDraftRows([createEmptyDraftRow()]);
	}, [estimate, enrichRowsWithItemTaxes, isEditing]);

	const cancelCreate = useCallback(() => {
		if (isSaving) return;
		setIsCreating(false);
		setIsAppendOnlyEdit(false);
		setSaveError('');
		initialCreateRowsSnapshotRef.current = '';
	}, [isSaving]);

	const startEdit = useCallback((options) => {
		const hasEstimateOverride = Object.prototype.hasOwnProperty.call(options || {}, 'estimateOverride');
		const sourceEstimate = hasEstimateOverride ? options.estimateOverride : estimate;
		if (!sourceEstimate || isCreating || isSaving) return;
		const appendOnly = Boolean(options?.appendOnly);
		const items = Array.isArray(sourceEstimate?.items) ? sourceEstimate.items : [];

		if (appendOnly) {
			// Append-only: keep current estimate version, lock existing rows and allow only adding new rows.
			const locked = items.filter((it) => !it?.isRemoved).map(mapEstimateItemToAppendLockedRow);
			const seeded = normalizeDraftRows([...locked, createEmptyDraftRow()]);
			initialEditRowsSnapshotRef.current = JSON.stringify(normalizeEditRowsForDirtyCheck(seeded));
			setEditRows(seeded);
			setIsEditing(true);
			setIsAppendOnlyEdit(true);
			setSaveError('');
			enrichRowsWithItemTaxes(seeded, setEditRows);
			return;
		}

		setIsAppendOnlyEdit(false);

		const mapped = items
			.filter((it) => !it?.isRemoved)
			.map((it) => {
				const workCategoryTaxRuleId = it?.workCategory?.taxRuleId ?? '';
				const itemTaxRuleId = getItemTaxRuleIdFromEstimateItem(it);
				const warehouseId = it?.warehouseId ?? it?.warehouse_id ?? it?.warehouse?.warehouseId ?? '';
				const warehouseName = getEstimateItemWarehouseName(it);
				const allocationId =
					it?.allocationId ??
					it?.stockAllocationId ??
					it?.stock_allocation_id ??
					it?.stockAllocation?.allocationId ??
					it?.stockAllocation?.stockAllocationId ??
					it?.allocation?.allocationId ??
					it?.allocation?.stockAllocationId ??
					it?.warehouseAllocation?.allocationId ??
					it?.warehouseAllocation?.stockAllocationId ??
					null;
				const issueId =
					it?.issueId ??
					it?.stockIssueId ??
					it?.stock_issue_id ??
					it?.stockAllocation?.issueId ??
					it?.stockAllocation?.stockIssueId ??
					it?.allocation?.issueId ??
					it?.allocation?.stockIssueId ??
					it?.warehouseAllocation?.issueId ??
					it?.warehouseAllocation?.stockIssueId ??
					null;
				const warehouseAvailableQuantity =
					it?.warehouseAvailableQuantity ??
					it?.availableQuantity ??
					it?.warehouse?.availableQuantity ??
					it?.warehouse?.quantity ??
					null;
				// Nếu sản phẩm có thuế thì luôn ưu tiên sản phẩm -> clear chọn thuế thủ công.
				const taxRuleId = toIdOrNull(itemTaxRuleId) ? '' : (it?.taxRuleId ?? '');
				return {
					estimateItemId: it?.estimateItemId ?? it?.estimateItemID ?? it?.id ?? null,
					workCategoryId:
						it?.workCategoryId ??
						it?.workCateId ??
						it?.workCategory?.workCategoryId ??
						it?.workCategory?.workCateId ??
						it?.workCategory?.id ??
						null,
					workCategoryCode: String(it?.workCategory?.categoryCode ?? '').trim(),
					workCategoryTaxRuleId,
					itemId: it?.itemId ?? it?.catalogItemId ?? it?.serviceItemId ?? it?.id ?? null,
					unit: getItemUnitFromEstimateItem(it),
					warehouseId,
					warehouseName,
					allocationId,
					issueId,
					warehouseAvailableQuantity,
					itemTaxRuleId,
					newCategoryName: String(
						it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '',
					).trim(),
					itemName: String(it?.itemName || '').trim(),
					quantity: it?.quantity ?? '',
					unitPrice: it?.unitPrice ?? '',
					taxRuleId,
					isRemoved: Boolean(it?.isRemoved),
					discountAmount: pickDiscountAmountValue(it),
					finalPrice: it?.finalPrice ?? it?.final_price ?? '',
					isGift: getEstimateItemGiftFlag(it),
					triggeredByItemId: pickTriggeredByItemId(it),
					stockAllocationStatus: getEstimateItemStockAllocationStatus(it),
					entryItemId: toIdOrNull(it?.entryItemId ?? it?.entry_item_id) ?? null,
				};
			});
		const normalized = normalizeDraftRows(mapped);
		initialEditRowsSnapshotRef.current = JSON.stringify(normalizeEditRowsForDirtyCheck(normalized));
		setEditRows(normalized);
		setIsEditing(true);
		setSaveError('');
		// Enrich itemTaxRuleId by itemId if backend doesn't embed it in estimate.
		enrichRowsWithItemTaxes(normalized, setEditRows);
	}, [estimate, enrichRowsWithItemTaxes, isCreating, isSaving]);

	const cancelEdit = useCallback(() => {
		if (isSaving) return;
		setIsEditing(false);
		setIsAppendOnlyEdit(false);
		initialEditRowsSnapshotRef.current = '';
		setSaveError('');
	}, [isSaving]);

	const saveEstimate = useCallback(async () => {
		if (isSaving) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để tạo báo giá.');
			return;
		}

		const idNum = toIdOrNull(serviceTicketId);
		if (!standaloneDraftMode && !idNum) {
			setSaveError('Thiếu serviceTicketId hợp lệ.');
			return;
		}

		const validation = validateDraftOrEditRows(draftRows);
		if (!validation.ok) {
			setSaveError(validation.error);
			return;
		}

		const currentCreateRowsSnapshot = JSON.stringify(normalizeCreateRowsForDirtyCheck(draftRows));
		if (initialCreateRowsSnapshotRef.current && initialCreateRowsSnapshotRef.current === currentCreateRowsSnapshot) {
			setSaveError('');
			setIsCreating(false);
			initialCreateRowsSnapshotRef.current = '';
			return;
		}

		const items = (Array.isArray(draftRows) ? draftRows : [])
			.filter((r) => !isDraftRowEmpty(r))
			.map((r) => {
				const workCategoryId = toIdOrNull(r?.workCategoryId);
				const itemId = toIdOrNull(r?.itemId);
				const warehouseId = toIdOrNull(r?.warehouseId ?? r?.warehouse_id);
				const taxRuleId = toIdOrNull(getEffectiveTaxRuleId(r));
				const categoryNameValidated = validateTextInput(r?.newCategoryName, {
					fieldLabel: 'Hạng mục',
					required: !workCategoryId,
					trim: true,
					maxLength: 255,
				});
				const itemNameValidated = validateTextInput(r?.itemName, {
					fieldLabel: 'Diễn giải',
					required: !workCategoryId,
					trim: true,
					maxLength: 255,
				});
				const qtyValidated = validatePositiveNumber(r?.quantity, {
					fieldLabel: 'Số lượng',
					required: true,
					integer: true,
				});
				const priceValidated = validateNonNegativeNumber(r?.unitPrice, {
					fieldLabel: 'Đơn giá',
					required: true,
					integer: false,
				});

				const payload = {
					workCategoryId: workCategoryId ?? null,
					newCategoryName: workCategoryId ? null : categoryNameValidated.value || null,
					itemId: itemId ?? null,
					warehouseId: warehouseId ?? null,
					itemName: itemNameValidated.value || null,
					unit: String(r?.unit ?? '').trim() || null,
					quantity: qtyValidated.value ?? 0,
					unitPrice: priceValidated.value ?? 0,
					taxRuleId: taxRuleId ?? null,
					isChecked: getEstimateItemStockAllocationStatus(r) === 'RELEASED' ? false : true,
					isRemoved: false,
					revisedFromItemId: null,
					entryItemId: toIdOrNull(r?.entryItemId) ?? null,
					...buildEstimateItemPromotionPayloadFields(r),
				};
				if (r?.isLockedFromPreviousVersion) {
					const revisedFromItemId = toIdOrNull(r?.estimateItemId);
					if (revisedFromItemId) {
						payload.revisedFromItemId = revisedFromItemId;
					}
				}
				return payload;
			});

		try {
			setIsSaving(true);
			setSaveError('');
			debugEstimateVersion('create-version-request', {
				serviceTicketId: standaloneDraftMode ? null : idNum,
				estimateType: 'INITIAL',
				status: 'DRAFT',
				estimateStatus: 'DRAFT',
				items,
			});


			const res = await createServiceTicketEstimate(
				{
					serviceTicketId: standaloneDraftMode ? null : idNum,
					estimateType: 'INITIAL',
					status: 'DRAFT',         // <-- Bổ sung dòng này
					estimateStatus: 'DRAFT', // <-- (Thêm cả dòng này cho chắc ăn, tuỳ BE của bạn dùng field nào)
					items,
				},
				token,
			);
			let nextEstimate = mergeEstimateWithWarehouseDisplay(
				extractApiPayload(res),
				estimateRef.current,
				draftRows,
			);
			if (!standaloneDraftMode && idNum) {
				nextEstimate = (await refetchLatestEstimate(idNum, token, nextEstimate, estimateRef.current, draftRows)) ?? nextEstimate;
			}
			debugEstimateVersion('create-version-response', nextEstimate ?? null);
			setEstimate(nextEstimate ?? null);
			onEstimateStatusChangeRef.current?.(nextEstimate ?? null);
			setIsCreating(false);
			initialCreateRowsSnapshotRef.current = '';
		} catch (err) {
			setSaveError(err?.message || 'Không thể lưu báo giá.');
		} finally {
			setIsSaving(false);
		}
	}, [draftRows, isSaving, refetchLatestEstimate, serviceTicketId, standaloneDraftMode, validateDraftOrEditRows]);

	const saveEdit = useCallback(async () => {
		if (isSaving) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để cập nhật báo giá.');
			return;
		}

		const estimateId = estimate?.estimateId ?? estimate?.id;
		const estimateIdNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
		if (!Number.isFinite(estimateIdNum) || estimateIdNum <= 0) {
			setSaveError('Thiếu estimateId hợp lệ.');
			return;
		}

		const serviceTicketIdNum = toIdOrNull(estimate?.serviceTicketId ?? serviceTicketId);
		if (!standaloneDraftMode && !serviceTicketIdNum) {
			setSaveError('Thiếu serviceTicketId hợp lệ.');
			return;
		}

		if (isAppendOnlyEdit) {
			const newRows = (Array.isArray(editRows) ? editRows : []).filter(
				(r) => !r?.isLockedFromPreviousVersion && !getEstimateItemGiftFlag(r) && !isDraftRowEmpty(r),
			);
			if (newRows.length === 0) {
				setSaveError('Bạn chưa thêm hạng mục mới nào. Vui lòng thêm ít nhất 1 dòng mới trước khi lưu.');
				return;
			}
		}

		const validation = validateDraftOrEditRows(editRows);
		if (!validation.ok) {
			setSaveError(validation.error);
			return;
		}

		const items = (Array.isArray(editRows) ? editRows : [])
			.filter((r) => !isDraftRowEmpty(r))
			.map((r) => {
				const estimateItemId = toIdOrNull(r?.estimateItemId);
				const originalItem = (Array.isArray(estimate?.items) ? estimate.items : []).find((it) => {
					const id = toIdOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
					return id && estimateItemId && id === estimateItemId;
				}) ?? null;
				const sourceRow = originalItem && getEstimateItemGiftFlag(originalItem)
					? { ...r, ...originalItem }
					: (originalItem ? { ...originalItem, ...r } : r);
				const isGiftRow = getEstimateItemGiftFlag(sourceRow);
				const workCategoryId = toIdOrNull(sourceRow?.workCategoryId);
				const itemId = toIdOrNull(sourceRow?.itemId);
				const warehouseId = toIdOrNull(sourceRow?.warehouseId ?? sourceRow?.warehouse_id);
				const taxRuleId = toIdOrNull(getEffectiveTaxRuleId(sourceRow));
				const categoryNameValidated = validateTextInput(sourceRow?.newCategoryName, {
					fieldLabel: 'Hạng mục',
					required: !workCategoryId,
					trim: true,
					maxLength: 255,
				});
				const itemNameValidated = validateTextInput(sourceRow?.itemName, {
					fieldLabel: 'Diễn giải',
					required: !workCategoryId,
					trim: true,
					maxLength: 255,
				});
				const qtyValidated = validatePositiveNumber(sourceRow?.quantity,
					{
						fieldLabel: 'Số lượng',
						required: true,
						integer: true,
					});
				const priceValidated = validateNonNegativeNumber(sourceRow?.unitPrice, {
					fieldLabel: 'Đơn giá',
					required: true,
					integer: false,
				});

				const payload = {
					workCategoryId: workCategoryId ?? null,
					newCategoryName: workCategoryId ? null : categoryNameValidated.value || null,
					itemId: itemId ?? null,
					warehouseId: warehouseId ?? null,
					itemName: itemNameValidated.value || null,
					unit: String(sourceRow?.unit ?? '').trim() || null,
					quantity: qtyValidated.value ?? 0,
					unitPrice: priceValidated.value ?? 0,
					taxRuleId: taxRuleId ?? null,
					isChecked: getEstimateItemStockAllocationStatus(sourceRow) === 'RELEASED' ? false : true,
					isRemoved: false,
					revisedFromItemId: null,
					entryItemId: toIdOrNull(sourceRow?.entryItemId) ?? null,
					...buildEstimateItemPromotionPayloadFields(sourceRow),
				};

				if (estimateItemId) {
					payload.estimateItemId = estimateItemId;
					payload.revisedFromItemId = isGiftRow
						? (toIdOrNull(sourceRow?.revisedFromItemId) ?? null)
						: estimateItemId;
				}

				return payload;
			});

		const currentEditRowsSnapshot = JSON.stringify(normalizeEditRowsForDirtyCheck(editRows));
		if (
			!isAppendOnlyEdit &&
			(initialEditRowsSnapshotRef.current === currentEditRowsSnapshot || areEstimateUpdateItemsEqual(items, estimate))
		) {
			setSaveError('');
			setIsEditing(false);
			setIsAppendOnlyEdit(false);
			initialEditRowsSnapshotRef.current = '';
			return;
		}

		try {
			setIsSaving(true);
			setSaveError('');
			const res = await updateServiceTicketEstimate(
				estimateIdNum,
				{
					serviceTicketId: standaloneDraftMode ? null : serviceTicketIdNum,
					estimateType: estimate?.estimateType || 'INITIAL',
					items,
				},
				token,
			);
			let nextEstimate = mergeEstimateWithWarehouseDisplay(
				extractApiPayload(res),
			);
			if (!standaloneDraftMode && serviceTicketIdNum) {
				nextEstimate = (await refetchLatestEstimate(serviceTicketIdNum, token, nextEstimate)) ?? nextEstimate;
			}
			setEstimate(nextEstimate ?? null);
			onEstimateStatusChangeRef.current?.(nextEstimate ?? null);
			setIsEditing(false);
			setIsAppendOnlyEdit(false);
			initialEditRowsSnapshotRef.current = '';
		} catch (err) {
			setSaveError(err?.message || 'Không thể cập nhật báo giá.');
		} finally {
			setIsSaving(false);
		}
	}, [editRows, estimate, isAppendOnlyEdit, isSaving, refetchLatestEstimate, serviceTicketId, standaloneDraftMode, validateDraftOrEditRows]);

	const softDeleteEditRow = useCallback(
		async (rowIndex) => {
			if (!isEditing || isSaving) return;
			const token = localStorage.getItem('authToken');
			if (!token) {
				setSaveError('Vui lòng đăng nhập để xóa hạng mục.');
				return;
			}

			const row = editComputed[rowIndex];
			if (getEstimateItemGiftFlag(row)) return;
			if (isWarehouseStockLockedStatus(getEstimateItemStockAllocationStatus(row))) {
				setSaveError('Không thể xóa sản phẩm đã giữ/xuất/hoàn hàng.');
				return;
			}
			const estimateItemId = toIdOrNull(row?.estimateItemId);
			if (!estimateItemId) {
				setSaveError('Không tìm thấy estimateItemId để xóa.');
				return;
			}

			try {
				setIsSaving(true);
				setSaveError('');
				await updateServiceTicketEstimateItem(
					estimateItemId,
					{
						workCategoryId: toIdOrNull(row?.workCategoryId),
						newCategoryName: toIdOrNull(row?.workCategoryId)
							? null
							: String(row?.newCategoryName ?? '').trim() || null,
						itemId: toIdOrNull(row?.itemId),
						warehouseId: toIdOrNull(row?.warehouseId ?? row?.warehouse_id),
						itemName: String(row?.itemName ?? '').trim() || null,
						unit: String(row?.unit ?? '').trim() || null,
						quantity: toNumberOrZero(row?.quantity),
						unitPrice: toNumberOrZero(row?.unitPrice),
						taxRuleId: toIdOrNull(row?.taxRuleId),
						isChecked: true,
						isRemoved: true,
						revisedFromItemId: toIdOrNull(row?.estimateItemId),
						...buildEstimateItemPromotionPayloadFields(row),
					},
					token,
				);

				setEditRows((prev) => {
					const base = Array.isArray(prev) ? prev : [];
					const next = base.filter((_, idx) => idx !== rowIndex);
					return normalizeDraftRows(next);
				});

				setEstimate((prev) => {
					const current = prev && typeof prev === 'object' ? prev : null;
					const items = Array.isArray(current?.items) ? current.items : [];
					if (!items.length) return current;
					const next = {
						...current,
						items: items.map((it) => {
							const itId = toIdOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
							if (itId === estimateItemId) return { ...it, isRemoved: true };
							return it;
						}),
					};
					onEstimateStatusChangeRef.current?.(next);
					return next;
				});
			} catch (err) {
				setSaveError(err?.message || 'Không thể xóa hạng mục.');
			} finally {
				setIsSaving(false);
			}
		},
		[editComputed, isEditing, isSaving],
	);

	// Xóa mềm dòng đang tạo mới (chỉ cần xóa khỏi draftRows, chưa có estimateItemId nên không cần gọi API)
	const softDeleteDraftRow = useCallback(
		(rowIndex) => {
			if (!isCreating || isSaving) return;
			setDraftRows((prev) => {
				const base = Array.isArray(prev) ? prev : [];
				const next = base.filter((_, idx) => idx !== rowIndex);
				return normalizeDraftRows(next);
			});
		},
		[isCreating, isSaving],
	);

	return {
		estimate,
		loading,
		loadError,
		fetched,
		taxRules,
		taxRulesLoading,
		taxRulesError,
		workCategories,
		workCategoriesLoading,
		workCategoriesError,
		categorySuggestions,
		isAddingNewTaxRule,
		taxName,
		setTaxName,
		taxRate,
		setTaxRate,
		isCreatingTaxRule,
		startAddNewTaxRule,
		stopAddNewTaxRule,
		handleCreateTaxRule,
		recommendation,
		setRecommendation,
		recommendationLoading,
		recommendationSaving,
		saveRecommendation,
		isCreating,
		isEditing,
		isAppendOnlyEdit,
		isSaving,
		saveError,
		setSaveError,
		draftRows,
		editRows,
		taxRuleById,
		canEdit,
		draftComputed,
		editComputed,
		draftTotal,
		editTotal,
		total,
		estimateCostText,
		showAddEstimate,
		statusLine,
		footerTotalText,
		tableRows,
		showInputs,
		hasCreateChanges,
		hasEditChanges,
		onChange,
		startCreate,
		cancelCreate,
		startEdit,
		cancelEdit,
		saveEstimate,
		saveEdit,
		syncEstimate,
		softDeleteEditRow,
		softDeleteDraftRow,
		inventory,
	};
}

