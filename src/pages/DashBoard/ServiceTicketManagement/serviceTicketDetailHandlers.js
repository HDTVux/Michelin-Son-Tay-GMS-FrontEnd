import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchServiceTicketDetail, updateServiceTicket } from '../../../services/serviceTicketService.js';
import { validateTextInput } from '../../../components/inputValidation.js';
import { getServiceTicketStatusTextVi } from '../../../components/statusUtils.js';

// Prefix dùng để lưu trạng thái tạm thời khi đang thêm dịch vụ vào SessionStorage
const ADD_SERVICE_RESTORE_STORAGE_PREFIX = 'serviceTicketAddServicePending:';

// Đọc role của nhân viên từ localStorage, chuẩn hóa thành mảng các string (chữ hoa).
function readStaffRolesFromStorage() {
    try {
        const raw = localStorage.getItem('staffRoles');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((r) => typeof r === 'string')
            .map((r) => r.trim().toUpperCase())
            .filter(Boolean);
    } catch {
        return [];
    }
}

//Chuyển chuỗi mã (ví dụ LICENSE_PLATE hoặc photo-type) thành dạng Title Case (License Plate).
function toTitleCaseFromCode(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (!/^[A-Z0-9_-]+$/.test(raw)) return raw;

    return raw
        .replaceAll(/[-_]+/g, ' ')
        .toLowerCase()
        .replaceAll(/\b\w/g, (m) => m.toUpperCase());
}

// Định dạng tiền tệ theo chuẩn Việt Nam, thêm đuôi "đ"
function formatCurrencyVnd(value) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
}

// Chuyển giá trị (chuỗi hoặc số) thành số tiền hợp lệ (number), trả về 0 nếu không hợp lệ.
// Dùng ở đâu: Đảm bảo các trường tiền tệ (price, discount, total) luôn là số để tính toán và hiển thị.
function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

// Ưu tiên lấy giá đã bao gồm VAT nếu có, nếu không lấy giá cơ bản
function pickMoneyDisplayValue(withVatValue, baseValue) {
    const withVatNum = toMoneyNumber(withVatValue);
    if (withVatNum > 0) return withVatNum;
    return Math.max(0, toMoneyNumber(baseValue));
}

// Chuẩn hóa các trường liên quan đến thuế của một item
function normalizeTaxRatePercentText(rawRate) {
    const n = typeof rawRate === 'number' ? rawRate : Number(String(rawRate ?? '').trim());
    if (!Number.isFinite(n) || n <= 0) return '';
    const pct = (n > 1 ? n : n * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${pct}%`;
}

// Lấy nhãn hiển thị thuế suất VD: 8%, 10%, hoặc '--' nếu có thuế nhưng không xác định được suất, hoặc '0%' nếu không có thuế
function getEstimateItemTaxRateText(item) {
    const directText = String(item?.taxRateText ?? item?.tax_rate_text ?? '').trim();
    if (directText) return directText;

    const rateText = normalizeTaxRatePercentText(
        item?.appliedTaxRate ??
        item?.applied_tax_rate ??
        item?.taxRate ??
        item?.tax_rate ??
        item?.taxRule?.taxRate ??
        item?.taxRule?.rate ??
        item?.workCategory?.taxRule?.taxRate ??
        item?.workCategory?.taxRule?.rate,
    );
    if (rateText) return rateText;

    return toMoneyNumber(item?.taxAmount ?? item?.tax_amount) > 0 ? '--' : '0%';
}

// Ưu tiên lấy discountAmount đã tính toán nếu có, nếu không lấy discount_amount
function pickDiscountAmountValue(item) {
    return toMoneyNumber(item?.discountAmount ?? item?.discount_amount);
}

// Lấy cờ quà tặng của một item
function getEstimateItemGiftFlag(item) {
    const raw = item?.isGift ?? item?.is_gift;
    return raw === true || String(raw ?? '').trim().toLowerCase() === 'true';
}

// Lấy trạng thái giữ chỗ vật tư của một item, ưu tiên các trường mới hơn, trả về chuỗi đã chuẩn hóa (UPPERCASE) hoặc empty string nếu không xác định
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

// Lấy giá cuối cùng của item, ưu tiên các trường mới hơn, trả về số hoặc fallbackValue nếu không xác định
function getEstimateItemFinalPriceDisplay(item, fallbackValue) {
    const rawFinalPrice = item?.finalPrice ?? item?.final_price;
    if (rawFinalPrice == null || String(rawFinalPrice).trim() === '') return fallbackValue;
    const finalPrice = typeof rawFinalPrice === 'number' ? rawFinalPrice : Number(String(rawFinalPrice ?? '').trim());
    return Number.isFinite(finalPrice) ? finalPrice : fallbackValue;
}

// Chuyển giá trị ngày giờ từ các định dạng khác nhau thành chuẩn ISO 8601 (YYYY-MM-DDTHH:mm:ss) để gửi payload
function formatEstimatedDeliveryAtForApi(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    let datePart = '';
    let timePart = '';

    if (raw.includes('T')) {
        const [d, t] = raw.split('T');
        datePart = String(d || '').trim();
        timePart = String(t || '').trim();
    } else if (raw.includes(' ')) {
        const [d, t] = raw.split(' ');
        datePart = String(d || '').trim();
        timePart = String(t || '').trim();
    } else {
        return '';
    }


    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '';

    if (/^\d{2}:\d{2}:\d{2}$/.test(timePart)) return `${datePart}T${timePart}`;

    const hhmm = String(timePart).slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return '';
    return `${datePart}T${hhmm}:00`;
}

// Không thể báo hoàn thành sửa chữa nếu có lỗi từ backend
function getFinishWorkErrorMessage(err, fallback) {
    // Intentionally do not surface backend error messages in the UI.
    // Keep the helper for consistent call-sites.
    return fallback || 'Không thể báo hoàn thành sửa chữa.';
}

// Chuẩn hóa giá trị số công tơ mét, loại bỏ các ký tự không phải số
function normalizeOdometerKm(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : Number(String(value).replaceAll(/\D/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Chuyển giá trị thành số nguyên dương hoặc null. Loại bỏ các ký tự không phải số.
 * Chuẩn hóa ID (serviceTicketId, estimateId, customerId, warehouseId...).
 */
function toPositiveNumberOrNull(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

// Chuẩn hóa giá trị boolean từ backend có thể ở dạng boolean, số (1/0), hoặc chuỗi ('true', 'false')
function normalizeBackendBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
        if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    }
    return false;
}

// Lấy tên hiển thị của item
function getTicketItemName(item) {
    return String(
        item?.serviceName ??
        item?.itemName ??
        item?.name ??
        item?.title ??
        item?.catalogItemName ??
        item?.partName ??
        item?.productName ??
        '',
    ).trim();
}

// Kiểm tra nếu text có chứa các từ khóa liên quan đến phụ tùng, dùng để phân loại item
function hasPartText(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return false;
    return (
        text.includes('part') ||
        text.includes('product') ||
        text.includes('spare') ||
        text.includes('phụ tùng') ||
        text.includes('phu tung')
    );
}

// Kiểm tra nếu tên item có chứa tín hiệu liên quan đến phụ tùng, dùng để phân loại item
function normalizeSearchText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replaceAll('đ', 'd')
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '');
}

// Kiểm tra nếu tên item có chứa tín hiệu liên quan đến phụ tùng, dùng để phân loại item
function hasPartNameSignal(value) {
    const text = normalizeSearchText(value);
    if (!text || text.includes('dich vu')) return false;

    return (
        text.includes('phu tung') ||
        text.includes('lop') ||
        text.includes('vo xe') ||
        text.includes('tire') ||
        text.includes('tyre') ||
        text.includes('miche') ||
        text.includes('bridgestone') ||
        text.includes('goodyear') ||
        text.includes('continental') ||
        text.includes('pirelli') ||
        text.includes('yokohama') ||
        text.includes('maxxis') ||
        text.includes('gat mua') ||
        text.includes('can gat') ||
        text.includes('dau nhot') ||
        text.includes('nhot') ||
        text.includes('dau may') ||
        text.includes('ac quy') ||
        text.includes('loc dau') ||
        text.includes('loc gio') ||
        text.includes('loc dieu hoa') ||
        text.includes('bugi') ||
        text.includes('bong den') ||
        text.includes('nuoc lam mat') ||
        text.includes('ma phanh') ||
        /\b\d{1,2}w[-\s]?\d{2}\b/.test(text)
    );
}

// Lấy loại item (SERVICE hoặc PART) dựa trên nhiều trường khác nhau và heuristic từ tên/mô tả.
function getTicketItemTypeText(item) {
    return String(
        item?.__forcedType ??
        item?.itemType ??
        item?.type ??
        item?.catalogItemType ??
        item?.productType ??
        item?.categoryType ??
        item?.itemCategoryType ??
        item?.catalogItem?.itemType ??
        item?.itemCategory?.categoryType ??
        item?.itemCategory?.itemType ??
        item?.category?.categoryType ??
        item?.category?.itemType ??
        '',
    ).trim();
}

/**
 * Xác định loại item (SERVICE hoặc PART) dựa trên nhiều trường khác nhau và heuristic từ tên/mô tả.
 * Phân loại item để hiển thị riêng dịch vụ và phụ tùng, tính toán phí dịch vụ/phụ tùng.
 */
function normalizeTicketItemType(item) {
    const typeText = getTicketItemTypeText(item).toUpperCase();
    if (typeText === 'SERVICE') return 'SERVICE';
    if (
        typeText === 'PART' ||
        typeText === 'PRODUCT' ||
        typeText === 'SPARE_PART' ||
        typeText === 'SPAREPART' ||
        typeText === 'ACCESSORY' ||
        typeText === 'EQUIPMENT' ||
        typeText === 'MACHINERY' ||
        hasPartText(typeText)
    ) {
        return 'PART';
    }

    const name = getTicketItemName(item).toLowerCase();
    if (
        item?.partId ||
        item?.productId ||
        item?.sparePartId ||
        hasPartText(item?.itemCategoryName) ||
        hasPartText(item?.categoryName) ||
        hasPartText(item?.categoryCode) ||
        hasPartText(item?.itemCategoryCode) ||
        hasPartText(item?.catalogItem?.itemCategoryName) ||
        hasPartText(item?.itemCategory?.categoryName) ||
        hasPartText(item?.category?.categoryName) ||
        hasPartNameSignal(name)
    ) {
        return 'PART';
    }

    return 'SERVICE';
}

/**
 * Thu thập tất cả các item từ các trường khác nhau (services, items, parts, bookingItems...) và loại bỏ trùng lặp.
 * Chuẩn hóa danh sách item được chọn khi hiển thị phiếu chi tiết.
 */
function collectTicketItems(input) {
    const sources = [
        { list: input?.services },
        { list: input?.items },
        { list: input?.bookingItems },
        { list: input?.selectedItems },
        { list: input?.serviceItems, forcedType: 'SERVICE' },
        { list: input?.parts, forcedType: 'PART' },
        { list: input?.partItems, forcedType: 'PART' },
        { list: input?.booking?.services },
        { list: input?.booking?.items },
        { list: input?.booking?.parts, forcedType: 'PART' },
    ];

    const map = new Map();
    sources.forEach(({ list, forcedType }) => {
        if (!Array.isArray(list)) return;
        list.forEach((item) => {
            if (!item) return;
            const normalized = forcedType ? { ...item, __forcedType: forcedType } : item;
            const name = getTicketItemName(normalized);
            if (!name) return;
            const id = normalized?.itemId ?? normalized?.catalogItemId ?? normalized?.serviceId ?? normalized?.partId ?? normalized?.id ?? '';
            const key = String(id || name).trim();
            const existing = map.get(key);
            if (!existing || normalizeTicketItemType(existing) !== 'PART') {
                map.set(key, normalized);
            }
        });
    });

    return Array.from(map.values());
}

/**
 * Payload để gửi API update stock allocation (giữ chỗ vật tư).
 * Khi confirm estimate, để thực hiện giữ chỗ vật tư (PUT /stock-allocation/update).
 */
function buildStockAllocationUpdatePayload({ estimateId, serviceTicketId, estimateItems }) {
    const estId = toPositiveNumberOrNull(estimateId);
    const ticketId = toPositiveNumberOrNull(serviceTicketId);
    const items = Array.isArray(estimateItems) ? estimateItems : [];
    if (!estId || !ticketId || items.length === 0) return [];

    const rows = [];

    for (const it of items) {
        if (it?.isRemoved) continue;

        const estimateItemId =
            it?.estimateItemId ??
            it?.estimateItemID ??
            it?.estimate_item_id ??
            it?.id ??
            null;

        const estItemNum = toPositiveNumberOrNull(estimateItemId);
        if (!estItemNum) continue;

        const isCombo =
            it?.itemType === 'COMBO' ||
            String(it?.workCategoryCode ?? '').toUpperCase() === 'COMBO' ||
            String(it?.newCategoryName ?? '').trim().toLowerCase() === 'combo' ||
            String(it?.categoryName ?? '').trim().toLowerCase() === 'combo' ||
            (Array.isArray(it?.comboSubItems) && it.comboSubItems.length > 0);

        if (isCombo && Array.isArray(it?.comboSubItems) && it.comboSubItems.length > 0) {
            const parentQty = toPositiveNumberOrNull(it?.quantity ?? it?.qty) || 1;

            for (const sub of it.comboSubItems) {
                const subType = String(sub?.itemType || sub?.type || '').toUpperCase();
                const isService = subType === 'SERVICE' || subType === 'SERVICE_PACK';
                if (isService) continue; // Phân bổ kho CHỈ áp dụng cho Phụ tùng, Linh kiện, Máy móc thiết bị

                const subItemId = toPositiveNumberOrNull(sub?.includedItemId ?? sub?.itemId ?? sub?.id);
                if (!subItemId) continue;

                const rawWId =
                    sub?.warehouseId ??
                    sub?.warehouseID ??
                    sub?.warehouse_id ??
                    sub?.warehouse?.warehouseId ??
                    sub?.warehouse?.id ??
                    it?.warehouseId ?? 1;

                const warehouseIdNum = toPositiveNumberOrNull(rawWId) || 1;
                const subQty = (toPositiveNumberOrNull(sub?.quantity ?? sub?.qty) || 1) * parentQty;
                const allocationId = sub?.allocationId ?? sub?.stockAllocationId ?? sub?.stock_allocation_id ?? undefined;
                const status = sub?.allocationStatus ?? sub?.stockAllocationStatus ?? sub?.stock_allocation_status ?? undefined;
                const createdBy = sub?.createdBy ?? sub?.created_by ?? undefined;
                const entryItemId = toPositiveNumberOrNull(sub?.entryItemId ?? sub?.entry_item_id ?? null);

                rows.push({
                    ...(allocationId == null ? {} : { allocationId }),
                    serviceTicketId: ticketId,
                    estimateItemId: Number(estItemNum),
                    warehouseId: Number(warehouseIdNum),
                    itemId: Number(subItemId),
                    estimateId: estId,
                    quantity: Number(subQty),
                    ...(status == null ? {} : { status }),
                    ...(createdBy == null ? {} : { createdBy }),
                    entryItemId: entryItemId ?? null,
                });
            }
            continue;
        }

        const itemId =
            it?.itemId ??
            it?.catalogItemId ??
            it?.serviceItemId ??
            it?.productId ??
            it?.item?.itemId ??
            it?.catalogItem?.itemId ??
            it?.serviceItem?.itemId ??
            null;

        const quantity = toPositiveNumberOrNull(it?.quantity ?? it?.qty);
        if (!toPositiveNumberOrNull(itemId) || !quantity) continue;

        const warehouseId =
            it?.warehouseId ??
            it?.warehouseID ??
            it?.warehouse_id ??
            it?.warehouse?.warehouseId ??
            it?.warehouse?.id ??
            undefined;

        const warehouseIdNum = toPositiveNumberOrNull(warehouseId);
        if (!warehouseIdNum) continue;

        const allocationId =
            it?.allocationId ??
            it?.stockAllocationId ??
            it?.stock_allocation_id ??
            it?.reservationId ??
            undefined;

        const status = it?.allocationStatus ?? it?.stockAllocationStatus ?? it?.stock_allocation_status ?? undefined;
        const createdBy = it?.createdBy ?? it?.created_by ?? undefined;
        const entryItemId = toPositiveNumberOrNull(it?.entryItemId ?? it?.entry_item_id ?? null);

        rows.push({
            ...(allocationId == null ? {} : { allocationId }),
            serviceTicketId: ticketId,
            estimateItemId: Number(estItemNum),
            warehouseId: Number(warehouseIdNum),
            itemId: Number(itemId),
            estimateId: estId,
            quantity: Number(quantity),
            ...(status == null ? {} : { status }),
            ...(createdBy == null ? {} : { createdBy }),
            entryItemId: entryItemId ?? null,
        });
    }

    return rows;
}

// Lấy giá trị đầu tiên không null/undefined/empty string từ một đối tượng dựa trên danh sách khóa ưu tiên.
// Khi có nhiều trường có thể chứa cùng một thông tin để lấy giá trị hiển thị cuối cùng.
function pickFirstDefined(obj, keys) {
    for (const key of keys) {
        const v = obj?.[key];
        if (v != null && String(v).trim() !== '') return v;
    }
    return null;
}

/**
 * Lấy báo giá mới nhất từ mảng estimate (sắp xếp theo version/createdAt giảm dần).
 * Sau khi fetch danh sách estimate, lấy phiên bản mới nhất để hiển thị/chỉnh sửa.
 */
function pickLatestEstimate(list) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return null;

    return [...arr].sort((a, b) => {
        const idA = Number(a?.estimateId ?? a?.id ?? a?.serviceTicketEstimateId ?? 0);
        const idB = Number(b?.estimateId ?? b?.id ?? b?.serviceTicketEstimateId ?? 0);

        if (idA > 0 && idB > 0 && idA !== idB) {
            return idB - idA;
        }

        const ta = new Date(a?.createdAt || a?.approvedAt || a?.createdDate || 0).getTime();
        const tb = new Date(b?.createdAt || b?.approvedAt || b?.createdDate || 0).getTime();
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    })[0];
}

// Kiểm tra nếu item báo giá đang hoạt động (chưa bị xoá), dựa trên trường isRemoved.
function isEstimateItemActive(it) {
    return !it?.isRemoved;
}

// Lấy ID của item báo giá dưới dạng string, ưu tiên các trường mới hơn
function getEstimateItemIdKey(it) {
    const id = toPositiveNumberOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
    return id ? String(id) : '';
}

// Lấy danh sách item báo giá chưa bị xoá (isRemoved = false) từ một estimate, dựa trên trường items hoặc services.
function getActiveEstimateItems(estimate) {
    return (Array.isArray(estimate?.items) ? estimate.items : []).filter(isEstimateItemActive);
}

/**
 * Lấy danh sách ID (dạng string) của các item báo giá chưa bị xoá (isRemoved = false).
 * So sánh thay đổi item khi khôi phục trạng thái thêm dịch vụ (add service).
 */
function getActiveEstimateItemKeys(estimate) {
    return getActiveEstimateItems(estimate).map(getEstimateItemIdKey).filter(Boolean);
}

// Kiểm tra nếu hai mảng có cùng tập hợp giá trị (dạng string)
// Không quan tâm đến thứ tự, loại bỏ giá trị rỗng/null/undefined.
function hasSameStringSet(left, right) {
    const a = Array.isArray(left) ? left.map(String).filter(Boolean) : [];
    const b = Array.isArray(right) ? right.map(String).filter(Boolean) : [];
    if (a.length !== b.length) return false;
    const bSet = new Set(b);
    return a.every((value) => bSet.has(value));
}

// Lấy key cho storage khi khôi phục trạng thái thêm dịch vụ.
function getAddServiceRestoreStorageKey(serviceTicketId) {
    const id = toPositiveNumberOrNull(serviceTicketId);
    return id ? `${ADD_SERVICE_RESTORE_STORAGE_PREFIX}${id}` : '';
}

/**
 * Đọc snapshot trạng thái tạm (lưu trong sessionStorage) khi đang trong luồng thêm dịch vụ.
 * Để khôi phục trạng thái khi user cancel hành động thêm dịch vụ.
 */
function readAddServiceRestoreSnapshot(serviceTicketId) {
    try {
        const key = getAddServiceRestoreStorageKey(serviceTicketId);
        if (!key || typeof sessionStorage === 'undefined') return null;
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const estimateIdNum = toPositiveNumberOrNull(parsed?.estimateIdNum);
        if (!estimateIdNum) return null;
        return {
            ...parsed,
            estimateIdNum,
            activeItemKeys: Array.isArray(parsed?.activeItemKeys)
                ? parsed.activeItemKeys.map(String).filter(Boolean)
                : [],
        };
    } catch {
        return null;
    }
}

/**
 * Xoá snapshot trạng thái tạm khỏi sessionStorage (sau khi hoàn thành hoặc cancel thêm dịch vụ).
 * Khi confirm estimate hoặc cancel luồng thêm dịch vụ.
 */
function clearAddServiceRestoreSnapshot(serviceTicketId) {
    try {
        const key = getAddServiceRestoreStorageKey(serviceTicketId);
        if (!key || typeof sessionStorage === 'undefined') return;
        sessionStorage.removeItem(key);
    } catch {
        // ignore storage failures
    }
}


function debugEstimateAllocation(tag, payload) {
    try {
        console.log(`[estimate-allocation-debug] ${tag}`, payload);
    } catch {
        // ignore console failures
    }
}

/**
 * Chuẩn hóa trạng thái ticket từ các tên khác nhau (CREATED/DRAFT, INSPECTING/INSPECTION, COMPLETED/DONE...) thành canonical form.
 * Quyết định hiển thị UI và enable/disable nút hành động dựa trên trạng thái ticket.
 */
function normalizeTicketStatus(raw) {
    const value = String(raw || '')
        .trim()
        .toUpperCase()
        .replaceAll(/\s+/g, '_');
    if (!value) return '';

    if (value === 'CREATED' || value === 'DRAFT') return 'CREATED';
    if (value === 'INSPECTION' || value === 'INSPECTING' || value === 'DIAGNOSIS') return 'INSPECTING';
    if (value === 'INSPECTED' || value === 'INSPECTED_DIAGNOSTIC') return 'INSPECTED';
    if (value === 'PENDING' || value === 'WAITING') return 'PENDING';
    if (value === 'ESTIMATED' || value === 'ESTIMATE') return 'ESTIMATED';
    if (value === 'IN_PROGRESS' || value === 'INPROGRESS' || value === 'PROCESSING' || value === 'REPAIRING') return 'REPAIRING';
    if (value === 'COMPLETED' || value === 'DONE' || value === 'FINISHED') return 'COMPLETED';
    if (value === 'PAID' || value === 'PAYED') return 'PAID';
    if (value === 'CANCELLED' || value === 'CANCELED' || value === 'CANCEL') return 'CANCELLED';
    return value;
}

/**
 * Chuẩn hóa trạng thái estimate (DRAFT, SENT, APPROVED, ARCHIVED, CANCELLED...).
 * Quyết định hiển thị UI (ẩn/hiện nút confirm, print...) và kiểm tra điều kiện cho các hành động.
 */
function normalizeEstimateStatus(raw) {
    const value = String(raw || '')
        .trim()
        .toUpperCase()
        .replaceAll(/\s+/g, '_');
    if (!value) return '';

    if (value === 'CONFIRMED') return 'APPROVED';
    if (value === 'CANCELLED' || value === 'CANCELED' || value === 'CANCEL') return 'CANCELLED';
    return value;
}

// Chuyển giá trị ngày tháng từ định dạng YMD (YYYY-MM-DD) thành đối tượng Date, với tuỳ chọn lấy thời điểm cuối ngày.
function parsePromotionYmdDate(value, { endOfDay } = {}) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const [y, m, d] = raw.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isFinite(dt.getTime()) ? dt : null;
}

/**
 * getPromotionId(promo)
 * Trích xuất ID khuyến mãi từ object promotion (hỗ trợ nhiều tên trường: promotionId, id, PromotionId...).
 * Lấy ID để call API apply/unapply promotion hoặc lookup trong cache.
 */
function getPromotionId(promo) {
    if (!promo) return null;
    if (typeof promo === 'number' || typeof promo === 'string') {
        const n = typeof promo === 'number' ? promo : Number(String(promo).trim());
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    const raw = promo?.promotionId ?? promo?.promotionID ?? promo?.PromotionId ?? promo?.promotion_id ?? promo?.id ?? promo?.ID ?? null;
    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

// Lấy ID khuyến mãi từ object promotion
function getExplicitPromotionId(promo) {
    if (!promo) return null;
    const raw = promo?.promotionId ?? promo?.promotionID ?? promo?.PromotionId ?? promo?.promotion_id ?? null;
    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

// Chuẩn hóa object promotion, đảm bảo có trường promotionId để dễ dàng lookup và hiển thị.
function normalizePromotion(promo) {
    if (!promo) return null;
    if (Array.isArray(promo)) return normalizePromotion(promo[0] ?? null);
    if (Array.isArray(promo?.data)) return normalizePromotion(promo.data[0] ?? null);
    const promotionId = getPromotionId(promo);
    return promotionId ? { ...promo, promotionId } : promo;
}

/**
 * buildPromotionLabel(promo)
 * Xây dựng nhãn hiển thị cho khuyến mãi (ví dụ: 'Khuyến mãi 10%' hoặc 'Mua X tặng Y').
 * Hiển thị tên khuyến mãi đang áp dụng hoặc danh sách khuyến mãi có sẵn.
 */
function buildPromotionLabel(promo) {
    if (!promo) return '';
    if (typeof promo === 'number' || typeof promo === 'string') {
        return buildPromotionIdFallbackLabel(getPromotionId(promo));
    }
    const name = String(promo?.name || '').trim();
    const code = String(promo?.code || '').trim();
    const type = String(promo?.type ?? promo?.promotionType ?? '').trim().toUpperCase();
    const discountPercent = toMoneyNumber(promo?.discountPercent);
    const parts = [name || code].filter(Boolean);
    if (code && name) parts.push(code);
    if (discountPercent > 0) parts.push(`-${discountPercent}%`);
    if (type === 'BUY_X_GET_Y' && discountPercent <= 0) parts.push('Quà tặng');
    return parts.join(' • ');
}

// Tính số lượt sử dụng còn lại của khuyến mãi dựa trên usageLimit và usedCount
function getPromotionUsageRemaining(promo) {
    const usageLimit = toMoneyNumber(promo?.usageLimit);
    const usedCount = toMoneyNumber(promo?.usedCount);
    if (!Number.isFinite(usageLimit) || usageLimit <= 0) return null;
    const used = Number.isFinite(usedCount) && usedCount > 0 ? usedCount : 0;
    return Math.max(usageLimit - used, 0);
}

// Xây dựng nhãn hiển thị chi tiết cho khuyến mãi, bao gồm tên, mã, điều kiện đơn tối thiểu, và số lượt còn lại.
function buildPromotionDisplayLabel(promo, { includeUsageRemaining = true } = {}) {
    const base = buildPromotionLabel(promo);
    if (!promo || typeof promo === 'number' || typeof promo === 'string') return base;
    const details = [];
    const minOrderValue = toMoneyNumber(promo?.minOrderValue);
    if (Number.isFinite(minOrderValue) && minOrderValue > 0) {
        details.push(`Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}đ`);
    }
    if (includeUsageRemaining) {
        const remaining = getPromotionUsageRemaining(promo);
        if (remaining != null) details.push(`Còn ${remaining} lượt`);
    }
    if (details.length === 0) return base;
    return [base, details.join(' • ')].filter(Boolean).join(' — ');
}

// Kiểm tra nếu khuyến mãi có thể áp dụng được trên hóa đơn hiện tại dựa trên trạng thái, thời gian, điều kiện đơn tối thiểu, và loại khuyến mãi.
function validatePromotion(promo, subtotal) {
    if (!promo) return 'Mã không hợp lệ';
    if (promo?.isActive === false) return 'Khuyến mãi không còn hiệu lực';

    const now = new Date();
    const start = parsePromotionYmdDate(promo?.startDate, { endOfDay: false });
    const end = parsePromotionYmdDate(promo?.endDate, { endOfDay: true });
    if (start && now < start) return 'Khuyến mãi chưa bắt đầu';
    if (end && now > end) return 'Khuyến mãi đã hết hạn';

    const minOrderValue = toMoneyNumber(promo?.minOrderValue);
    if (minOrderValue > 0 && subtotal < minOrderValue) {
        return `Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}đ để áp dụng`;
    }

    const type = String(promo?.type ?? promo?.promotionType ?? '').trim().toUpperCase();
    const discountPercent = toMoneyNumber(promo?.discountPercent);
    if (type !== 'BUY_X_GET_Y' && discountPercent <= 0) return 'Khuyến mãi này chưa hỗ trợ trên hoá đơn';
    return '';
}

// Lấy loại khuyến mãi đã chuẩn hóa (UPPERCASE) để phân loại và hiển thị phù hợp
function getPromotionType(promo) {
    return String(promo?.type ?? promo?.promotionType ?? '').trim().toUpperCase();
}

// Lấy mã khuyến mãi đã chuẩn hóa
function getPromotionCode(promo) {
    return String(
        promo?.code ??
        promo?.promotionCode ??
        promo?.promotion_code ??
        promo?.promoCode ??
        promo?.promo_code ??
        promo?.couponCode ??
        promo?.voucherCode ??
        '',
    ).trim();
}

// Tra cứu promotion theo ID từ danh sách promotion có sẵn theo loại.
function buildPromotionLookupById(availablePromotionsByType = {}) {
    const lookup = new Map();
    Object.values(availablePromotionsByType || {})
        .flatMap((list) => (Array.isArray(list) ? list : []))
        .forEach((promo) => {
            const id = getPromotionId(promo);
            if (id && !lookup.has(id)) lookup.set(id, promo);
        });
    return lookup;
}

// Tra cứu promotion theo mã code từ danh sách promotion có sẵn theo loại.
function buildPromotionLookupByCode(availablePromotionsByType = {}) {
    const lookup = new Map();
    Object.values(availablePromotionsByType || {})
        .flatMap((list) => (Array.isArray(list) ? list : []))
        .forEach((promo) => {
            const code = getPromotionCode(promo);
            if (code && !lookup.has(code)) lookup.set(code, promo);
        });
    return lookup;
}

function buildPromotionIdFallbackLabel(promotionId) {
    return promotionId ? `Promotion #${promotionId}` : '';
}

/**
 * Danh sách nhãn khuyến mãi có sẵn trên báo giá hiện tại (từ promotions field hoặc item gifts).
 * Hiển thị tóm tắt khuyến mãi trên hóa đơn hoặc khối thông tin báo giá.
 */
function buildEstimatePromotionLabels(estimate, availablePromotionsByType = {}) {
    const labels = [];
    const seen = new Set();
    const promotionLookupById = buildPromotionLookupById(availablePromotionsByType);
    const addLabel = (label) => {
        const text = String(label || '').trim();
        if (!text || seen.has(text)) return;
        seen.add(text);
        labels.push(text);
    };
    const addPromo = (promo) => {
        if (!promo) return;
        if (Array.isArray(promo)) {
            promo.forEach(addPromo);
            return;
        }
        if (typeof promo === 'string' || typeof promo === 'number') {
            addPromotionId(getPromotionId(promo));
            return;
        }
        const built = buildPromotionLabel(promo);
        if (built) {
            addLabel(built);
            return;
        }
        const code = getPromotionCode(promo);
        if (code) addLabel(code);
    };
    const addPromotionId = (promotionId) => {
        if (!promotionId) return;
        const promo = promotionLookupById.get(promotionId);
        addLabel(buildPromotionLabel(promo) || getPromotionCode(promo) || buildPromotionIdFallbackLabel(promotionId));
    };

    addPromo(estimate?.promotion);
    addPromo(estimate?.appliedPromotion);
    addPromo(estimate?.promotions);
    addPromo(estimate?.appliedPromotions);
    addPromo(estimate?.promotionCode);
    addPromo(estimate?.promoCode);

    const items = Array.isArray(estimate?.items) ? estimate.items.filter((it) => !it?.isRemoved) : [];
    items.forEach((it) => {
        addPromo(it?.promotion);
        addPromo(it?.appliedPromotion);
        addPromo(it?.promotionCode);
        addPromo(it?.promoCode);
        addPromotionId(getExplicitPromotionId(it));
    });

    if (labels.length > 0) return labels;

    const discountedCount = items.filter((it) => {
        const discount = pickDiscountAmountValue(it);
        const subTotal = pickMoneyDisplayValue(it?.subTotalWithVat ?? it?.subTotalWithVAT ?? 0, it?.subTotal);
        const finalPrice = getEstimateItemFinalPriceDisplay(it, subTotal);
        return discount > 0 || toMoneyNumber(finalPrice) < toMoneyNumber(subTotal);
    }).length;
    const giftCount = items.filter(getEstimateItemGiftFlag).length;

    if (discountedCount > 0) addLabel(`Giảm giá đã áp dụng trên ${discountedCount} dòng`);
    if (giftCount > 0) addLabel(`Quà tặng đã áp dụng trên ${giftCount} dòng`);
    return labels;
}

/**
 * Thu thập danh sách promotion đã áp dụng hoặc có sẵn trên estimate để chuẩn bị gỡ/restore.
 * Khi chỉnh sửa estimate để biết promotion nào cần gỡ trước khi thao tác.
 */
function collectAppliedPromotionRefs(estimate, appliedPromotionsByType = {}, availablePromotionsByType = {}) {
    const refs = [];
    const seen = new Set();
    const availablePromotions = Object.values(availablePromotionsByType || {})
        .flatMap((list) => (Array.isArray(list) ? list : []));
    const promotionLookupById = buildPromotionLookupById(availablePromotionsByType);
    const promotionCodeById = new Map();
    availablePromotions.forEach((promo) => {
        const id = getPromotionId(promo);
        const code = getPromotionCode(promo);
        if (id && code && !promotionCodeById.has(id)) promotionCodeById.set(id, code);
    });

    const addPromo = (promo, { explicitOnly = false } = {}) => {
        if (!promo) return;
        if (Array.isArray(promo)) {
            promo.forEach((item) => addPromo(item, { explicitOnly }));
            return;
        }
        if (typeof promo !== 'object') {
            const promotionId = explicitOnly ? null : getPromotionId(promo);
            const promotionCode = promotionId ? promotionCodeById.get(promotionId) : '';
            if (!promotionId || !promotionCode) return;
            const key = `${promotionId}|${promotionCode}`;
            if (seen.has(key)) return;
            seen.add(key);
            refs.push({ promotionId, promotionCode, promotionType: getPromotionType(promotionLookupById.get(promotionId)) });
            return;
        }
        const promotionId = explicitOnly ? getExplicitPromotionId(promo) : getPromotionId(promo);
        const promotionCode = getPromotionCode(promo) || (promotionId ? promotionCodeById.get(promotionId) : '');
        if (!promotionId || !promotionCode) return;
        const key = `${promotionId}|${promotionCode}`;
        if (seen.has(key)) return;
        seen.add(key);
        refs.push({
            promotionId,
            promotionCode,
            promotionType: getPromotionType(promo) || getPromotionType(promotionLookupById.get(promotionId)),
        });
    };

    Object.values(appliedPromotionsByType || {}).forEach(addPromo);
    addPromo(estimate?.promotion);
    addPromo(estimate?.appliedPromotion);
    addPromo(estimate?.promotions);
    addPromo(estimate?.appliedPromotions);
    addPromo(estimate, { explicitOnly: true });

    const items = Array.isArray(estimate?.items) ? estimate.items : [];
    items.forEach((it) => {
        addPromo(it?.promotion);
        addPromo(it?.appliedPromotion);
        addPromo(it, { explicitOnly: true });
    });

    return refs;
}


function normalizeSafetyInspectionStatus(raw) {
    const value = String(raw || '')
        .trim()
        .toUpperCase()
        .replaceAll(/[\s-]+/g, '_');
    if (!value) return '';
    if (['SKIP', 'SKIPPED', 'DISABLED', 'NOT_REQUIRED', 'NO_SAFETY_INSPECTION'].includes(value)) return 'SKIPPED';
    if (['DONE', 'FINISHED', 'PASSED'].includes(value)) return 'COMPLETED';
    if (['WAITING', 'REPAIRING'].includes(value)) return 'PENDING';
    return value;
}

// Xây dựng danh sách sự kiện timeline (check-in, created, diagnosis, in progress, completed) dựa trên nhiều trường ngày tháng khác nhau từ input.
function buildTimelineEvents(input, receivedAt, handoverAt) {
    const createdAt = pickFirstDefined(input, [
        'createdAt',
        'createAt',
        'createdDate',
        'createdDateTime',
        'ticketCreatedAt',
        'ticketCreatedDate',
        'createdTime',
    ]);

    const diagnosisAt = pickFirstDefined(input, [
        'diagnosisAt',
        'diagnosticAt',
        'inspectedAt',
        'checkedAt',
        'checkAt',
    ]);

    const inProgressAt = pickFirstDefined(input, [
        'inProgressAt',
        'processingAt',
        'startedAt',
        'startAt',
        'workStartAt',
    ]);

    const events = [
        { key: 'checkin', label: 'Check-in', at: receivedAt },
        { key: 'created', label: 'Ticket Created', at: createdAt },
        { key: 'diagnosis', label: 'Diagnosis', at: diagnosisAt },
        { key: 'inProgress', label: 'In Progress', at: inProgressAt },
        { key: 'completed', label: 'Completed', at: handoverAt },
    ];

    return events.filter((e) => e.at != null && String(e.at).trim() !== '');
}

// Chuẩn hóa danh sách ảnh của ticket
// trích xuất URL, loại ảnh, mô tả, và sắp xếp theo thứ tự ưu tiên loại ảnh và thời gian tải lên.
function getPhotoCategoryLabel(category) {
    const c = String(category || '').trim().toUpperCase();
    if (c === 'FRONT') return 'Trước';
    if (c === 'BACK') return 'Sau';
    if (c === 'LEFT') return 'Trái';
    if (c === 'RIGHT') return 'Phải';
    if (c === 'OVERALL') return 'Tổng quan';
    if (c === 'DAMAGE') return 'Hư hỏng';
    if (c === 'LICENSE_PLATE') return 'Biển số';
    if (!c) return '';
    return toTitleCaseFromCode(c);
}

// Xếp hạng ưu tiên cho các loại ảnh để sắp xếp khi hiển thị: FRONT > BACK > LEFT > RIGHT > OVERALL > DAMAGE > LICENSE_PLATE > others
function photoCategoryRank(category) {
    const c = String(category || '').trim().toUpperCase();
    if (c === 'FRONT') return 1;
    if (c === 'BACK') return 2;
    if (c === 'LEFT') return 3;
    if (c === 'RIGHT') return 4;
    if (c === 'OVERALL') return 10;
    if (c === 'DAMAGE') return 20;
    if (c === 'LICENSE_PLATE') return 90;
    return 99;
}

// Chuẩn hóa danh sách ảnh của ticket
// trích xuất URL, loại ảnh, mô tả, và sắp xếp theo thứ tự ưu tiên loại ảnh và thời gian tải lên.
function normalizeTicketPhotos(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr
        .map((p) => {
            const url = String(p?.photoUrl ?? p?.url ?? p?.imageUrl ?? '').trim();
            const category = String(p?.category ?? p?.type ?? '').trim().toUpperCase();
            if (!url) return null;
            return {
                photoId: p?.photoId ?? p?.id ?? null,
                category,
                label: getPhotoCategoryLabel(category),
                url,
                description: String(p?.description ?? '').trim(),
                uploadedAt: p?.uploadedAt ?? p?.createdAt ?? null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const ra = photoCategoryRank(a?.category);
            const rb = photoCategoryRank(b?.category);
            if (ra !== rb) return ra - rb;
            const ta = new Date(a?.uploadedAt || 0).getTime();
            const tb = new Date(b?.uploadedAt || 0).getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        });
}

/**
 * Chuẩn hóa ticket object từ backend: trích xuất/chuẩn hóa các trường, tính toán trạng thái hiển thị.
 * Component ServiceTicketDetail để hiển thị thông tin ticket trên giao diện.
 */
function normalizeTicket(input, codeFallback) {
    const ticketCode = String(input?.ticketCode || codeFallback || '').trim();
    const serviceTicketId =
        input?.serviceTicketId ??
        input?.serviceTicketID ??
        input?.id ??
        input?.ticketId ??
        null;

    const statusCode = String(input?.ticketStatus || input?.status || '').trim();
    const statusLabelRaw = String(input?.statusLabel || input?.statusText || statusCode).trim() || '-';
    const canonicalCode = normalizeTicketStatus(statusCode || statusLabelRaw);
    const statusLabel = getServiceTicketStatusTextVi(canonicalCode, toTitleCaseFromCode(statusLabelRaw));

    const receivedAt = pickFirstDefined(input, [
        'receivedAt',
        'checkInAt',
        'checkinAt',
        'checkInDateTime',
        'checkinDateTime',
        'receptionDate',
        'arrivedAt',
        'arrivalTime',
    ]);

    const handoverAt = pickFirstDefined(input, [
        'handoverAt',
        'handOverAt',
        'deliveryAt',
        'deliveredAt',
        'completedAt',
        'finishedAt',
        'closedAt',
        'releaseAt',
    ]);

    const estimatedDeliveryAt = pickFirstDefined(input, [
        'estimatedDeliveryAt',
        'estimated_delivery_at',
        'estimatedDelivery',
        'estimatedAt',
        'estimated_delivery',
    ]);

    const odometerKm = normalizeOdometerKm(
        input?.odometerReading ??
        input?.vehicle?.lastOdometerReading ??
        input?.vehicle?.odometerReading ??
        input?.odometerKm ??
        input?.mileage ??
        input?.vehicle?.odometerKm ??
        input?.vehicle?.mileage,
    );

    const timelineEvents = buildTimelineEvents(input, receivedAt, handoverAt);
    const photos = normalizeTicketPhotos(input?.photos);

    return {
        serviceTicketId,
        immutable: Boolean(input?.immutable),
        hasDraftStockIssue: Boolean(input?.hasDraftStockIssue),
        hasConfirmedStockIssue: Boolean(input?.hasConfirmedStockIssue),
        canRequestIssueDraft: normalizeBackendBoolean(input?.canRequestIssueDraft),
        reservedAllocationCount: input?.reservedAllocationCount ?? null,
        committedAllocationCount: input?.committedAllocationCount ?? null,
        warehouseReadyForRepair: input?.warehouseReadyForRepair ?? null,
        ticketCode,
        statusCode,
        statusLabel,
        receivedAt,
        handoverAt,
        estimatedDeliveryAt,
        timelineEvents,
        customer: {
            name: input?.customer?.fullName || input?.customerName || input?.customer?.name || '',
            phone: input?.customer?.phone || input?.customerPhone || input?.phone || '',
            email: input?.customer?.email || input?.customerEmail || input?.email || '',
        },
        vehicle: {
            licensePlate: input?.vehicle?.licensePlate || input?.licensePlate || '',
            model: input?.vehicle?.model || input?.vehicleModel || '',
            make: input?.vehicle?.make || input?.vehicleMake || '',
            year: input?.vehicle?.year ?? null,
            odometerKm,
        },
        booking: {
            bookingCode: input?.booking?.bookingCode || input?.bookingCode || '',
            scheduledDate: input?.booking?.scheduledDate || input?.scheduledDate || '',
            scheduledTime: input?.booking?.scheduledTime || input?.scheduledTime || '',
        },
        createdBy: input?.createdByName || input?.createdBy || input?.creatorName || input?.staffName || '',
        requestNote:
            input?.requestNote ||
            input?.customerRequest ||
            input?.checkInNotes ||
            input?.note ||
            '',
        services: collectTicketItems(input),
        photos,
        externalDependency: Boolean(input?.externalDependency || input?.isExternalDependency),
        timelineStatus: input?.timelineStatus || statusCode || statusLabelRaw,
    };
}

/**
 * mapEstimateItemsForReceipt(estimate)
 * Biến đổi estimate items thành format phù hợp để hiển thị/in trên phiếu dịch vụ.
 * Hiển thị bảng items trên phiếu dịch vụ hoặc PDF in.
 */
function mapEstimateItemsForReceipt(estimate) {
    const items = Array.isArray(estimate?.items) ? estimate.items : [];
    return items
        .filter((it) => !it?.isRemoved)
        .map((it, idx) => {
            const quantity = toMoneyNumber(it?.quantity);
            const unitPrice = toMoneyNumber(it?.unitPrice);
            const subTotal = toMoneyNumber(it?.subTotal);
            const unitPriceDisplay = pickMoneyDisplayValue(it?.unitPriceWithVat ?? it?.unitPriceWithVAT ?? 0, unitPrice);
            const subTotalDisplay = pickMoneyDisplayValue(it?.subTotalWithVat ?? it?.subTotalWithVAT ?? 0, subTotal);
            const finalPriceDisplay = getEstimateItemFinalPriceDisplay(it, subTotalDisplay);
            const taxAmount = toMoneyNumber(it?.taxAmount ?? it?.tax_amount);
            return {
                key: String(it?.estimateItemId ?? it?.itemId ?? `${idx}`),
                estimateItemId: it?.estimateItemId ?? it?.estimateItemID ?? it?.id ?? null,
                categoryName: it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '',
                itemName: String(it?.itemName || '').trim(),
                quantity,
                unitPrice,
                unitPriceDisplay,
                subTotal,
                subTotalDisplay,
                discountAmount: pickDiscountAmountValue(it),
                taxRateText: getEstimateItemTaxRateText(it),
                taxAmount,
                appliedTaxRate: it?.appliedTaxRate ?? it?.applied_tax_rate ?? it?.taxRate ?? it?.tax_rate ?? '',
                finalPrice: it?.finalPrice ?? it?.final_price ?? '',
                finalPriceDisplay,
                isGift: getEstimateItemGiftFlag(it),
                stockAllocationStatus: getEstimateItemStockAllocationStatus(it),
                warehouseName: String(it?.warehouseName ?? it?.warehouse?.warehouseName ?? it?.warehouse?.name ?? '').trim(),
            };
        })
        .filter((r) => r.itemName || r.categoryName || r.quantity > 0 || r.unitPrice > 0 || r.subTotal > 0 || r.subTotalDisplay > 0);
}

/**
 * Trích xuất bill/invoice ID từ payment object 
 * Xác định xem có hóa đơn liên quan đến ticket hay không để lock hành động chỉnh sửa.
 */
function normalizeBillId(payment) {
    if (!payment || typeof payment !== 'object') return null;
    const candidates = [
        payment.billId,
        payment.billID,
        payment.data?.billId,
        payment.data?.billID,
        payment.invoiceId,
        payment.invoiceID,
        payment.data?.invoiceId,
        payment.data?.invoiceID,
        payment.id,
        payment.data?.id,
    ];
    const raw = candidates.find((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (raw === undefined) return null;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return String(n);
    return String(raw).trim() || null;
}

export {
    readStaffRolesFromStorage,
    formatCurrencyVnd,
    toMoneyNumber,
    pickMoneyDisplayValue,
    pickDiscountAmountValue,
    getEstimateItemGiftFlag,
    getEstimateItemFinalPriceDisplay,
    formatEstimatedDeliveryAtForApi,
    getFinishWorkErrorMessage,
    normalizeOdometerKm,
    toPositiveNumberOrNull,
    normalizeBackendBoolean,
    getTicketItemName,
    normalizeTicketItemType,
    collectTicketItems,
    buildStockAllocationUpdatePayload,
    pickLatestEstimate,
    getActiveEstimateItemKeys,
    hasSameStringSet,
    readAddServiceRestoreSnapshot,
    clearAddServiceRestoreSnapshot,
    debugEstimateAllocation,
    normalizeTicketStatus,
    normalizeEstimateStatus,
    getPromotionId,
    getExplicitPromotionId,
    normalizePromotion,
    buildPromotionLabel,
    getPromotionUsageRemaining,
    buildPromotionDisplayLabel,
    validatePromotion,
    getPromotionType,
    getPromotionCode,
    buildPromotionLookupById,
    buildPromotionLookupByCode,
    buildPromotionIdFallbackLabel,
    buildEstimatePromotionLabels,
    collectAppliedPromotionRefs,
    normalizeSafetyInspectionStatus,
    buildTimelineEvents,
    getPhotoCategoryLabel,
    photoCategoryRank,
    normalizeTicketPhotos,
    normalizeTicket,
    mapEstimateItemsForReceipt,
    normalizeBillId,
};

// --------- Ticket detail loading ---------
/**
 * Custom React hook để tải dữ liệu chi tiết ticket từ API (nếu truyền code) hoặc dùng state có sẵn.
 * Component ServiceTicketDetail để quản lý lifecycle load ticket detail.
 */
export function useServiceTicketDetailData(ticketCodeParam, ticketFromState) {
    const [ticketRaw, setTicketRaw] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('Vui lòng đăng nhập để xem chi tiết phiếu dịch vụ.');
            setIsLoading(false);
            return;
        }

        if (!ticketCodeParam) {
            setError('Thiếu ticketCode để xem chi tiết.');
            setIsLoading(false);
            return;
        }

        let ignore = false;
        const load = async () => {
            try {
                setIsLoading(true);
                setError('');
                if (ticketCodeParam === 'demo' || String(ticketCodeParam).toUpperCase().includes('DEMO')) {
                    setTicketRaw({
                        serviceTicketId: 99999,
                        ticketCode: ticketCodeParam,
                        ticketStatus: 'ESTIMATED',
                        receivedAt: '2026-07-26T09:00:00Z',
                        estimatedDeliveryAt: '2026-07-26T17:00:00Z',
                        customer: {
                            customerId: 99999,
                            id: 99999,
                            fullName: 'Nguyễn Văn A (Khách Hàng Demo)',
                            phone: '0988 123 456',
                            email: 'nguyenvana@gmail.com'
                        },
                        vehicle: {
                            licensePlate: '30A-888.88',
                            model: 'Camry 2.5Q',
                            make: 'Toyota',
                            year: 2022,
                            odometerReading: 45200
                        },
                        booking: {
                            bookingCode: 'B-88888',
                            scheduledDate: '2026-07-26',
                            scheduledTime: '09:00'
                        },
                        createdByName: 'Cố vấn Dịch vụ Michelin Sơn Tây',
                        customerRequest: 'Khách hàng yêu cầu kiểm tra an toàn xe, thay 2 lốp Michelin Pilot Sport 5, cân bằng chì và căn chỉnh Hunter 3D.',
                        safetyInspectionEnabled: true,
                        safetyInspectionStatus: 'COMPLETED',
                        photos: [
                            { photoId: 1, category: 'LICENSE_PLATE', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', description: 'Ảnh biển số xe 30A-888.88' },
                            { photoId: 2, category: 'FRONT', url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80', description: 'Ảnh trước xe Camry 2.5Q' },
                            { photoId: 3, category: 'BACK', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', description: 'Ảnh sau xe' },
                            { photoId: 4, category: 'LEFT', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', description: 'Ảnh sườn trái' },
                            { photoId: 5, category: 'RIGHT', url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', description: 'Ảnh sườn phải' },
                            { photoId: 6, category: 'DAMAGE', url: 'https://images.unsplash.com/photo-1600793575654-910699b5e4d4?auto=format&fit=crop&w=800&q=80', description: 'Vết trầy xước cản trước' }
                        ]
                    });
                    setIsLoading(false);
                    return;
                }
                const res = await fetchServiceTicketDetail(ticketCodeParam, token); // API call để lấy chi tiết ticket
                if (ignore) return;
                setTicketRaw(res?.data ?? null);
            } catch (err) {
                if (ignore) return;
                if (String(ticketCodeParam).toUpperCase().includes('DEMO')) {
                    setTicketRaw({
                        serviceTicketId: 99999,
                        ticketCode: ticketCodeParam,
                        ticketStatus: 'ESTIMATED',
                        receivedAt: '2026-07-26T09:00:00Z',
                        estimatedDeliveryAt: '2026-07-26T17:00:00Z',
                        customer: {
                            customerId: 99999,
                            id: 99999,
                            fullName: 'Nguyễn Văn A (Khách Hàng Demo)',
                            phone: '0988 123 456',
                            email: 'nguyenvana@gmail.com'
                        },
                        vehicle: {
                            licensePlate: '30A-888.88',
                            model: 'Camry 2.5Q',
                            make: 'Toyota',
                            year: 2022,
                            odometerReading: 45200
                        },
                        booking: {
                            bookingCode: 'B-88888',
                            scheduledDate: '2026-07-26',
                            scheduledTime: '09:00'
                        },
                        createdByName: 'Cố vấn Dịch vụ Michelin Sơn Tây',
                        customerRequest: 'Khách hàng yêu cầu kiểm tra an toàn xe, thay 2 lốp Michelin Pilot Sport 5, cân bằng chì và căn chỉnh Hunter 3D.',
                        safetyInspectionEnabled: true,
                        safetyInspectionStatus: 'COMPLETED',
                        photos: [
                            { photoId: 1, category: 'LICENSE_PLATE', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', description: 'Ảnh biển số xe 30A-888.88' },
                            { photoId: 2, category: 'FRONT', url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80', description: 'Ảnh trước xe Camry 2.5Q' },
                            { photoId: 3, category: 'BACK', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', description: 'Ảnh sau xe' },
                            { photoId: 4, category: 'LEFT', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', description: 'Ảnh sườn trái' },
                            { photoId: 5, category: 'RIGHT', url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', description: 'Ảnh sườn phải' },
                            { photoId: 6, category: 'DAMAGE', url: 'https://images.unsplash.com/photo-1600793575654-910699b5e4d4?auto=format&fit=crop&w=800&q=80', description: 'Vết trầy xước cản trước' }
                        ]
                    });
                    setIsLoading(false);
                    return;
                }
                const msg = err?.message || 'Không thể tải chi tiết phiếu dịch vụ.';
                const isUnauthorized = err?.status === 401 || err?.status === 403;
                if (isUnauthorized) {
                    localStorage.removeItem('authToken');
                    setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    setError(msg);
                }
                // fallback: if we have state ticket, keep showing it
                setTicketRaw((prev) => prev ?? ticketFromState ?? null);
            } finally {
                if (!ignore) setIsLoading(false);
            }
        };

        load();
        return () => {
            ignore = true;
        };
    }, [ticketCodeParam, ticketFromState]);

    return {
        ticketRaw,
        setTicketRaw,
        isLoading,
        error,
        setError,
    };
}

// Edit customer request của ticket, với validation, guard condition, và API call để lưu thay đổi.
function getSaveEditGuardError({ ticketCodeParam, isImmutable }) {
    if (!ticketCodeParam) return 'Thiếu ticketCode để cập nhật.';
    if (isImmutable) return 'Phiếu dịch vụ này không thể chỉnh sửa.';
    return '';
}

// Chuyển ngày giờ từ server (ISO string, Space separated, or Date object) thành chuẩn datetime-local input YYYY-MM-DDTHH:mm
function formatDateTimeLocal(dateStr) {
    if (!dateStr) return '';
    const raw = String(dateStr).trim();
    if (raw.includes('T')) {
        return raw.slice(0, 16);
    }
    if (raw.includes(' ')) {
        return raw.replace(' ', 'T').slice(0, 16);
    }
    try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${y}-${m}-${day}T${h}:${min}`;
        }
    } catch { }
    return '';
}

/**
 * Custom React hook để quản lý form chỉnh sửa các thông tin của ticket ở đầu trang.
 */
export function useServiceTicketEditing({ ticketCodeParam, isImmutable, ticketRaw, ticket, setTicketRaw, setError, notify }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        customerRequest: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        receivedAt: '',
        safetyInspectionEnabled: false,
        vehicleModel: '',
        licensePlate: '',
        odometerKm: '',
        estimatedDeliveryAt: '',
        deliveredAt: ''
    });
    const [fieldErrors, setFieldErrors] = useState({
        customerRequest: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        receivedAt: '',
        safetyInspectionEnabled: '',
        vehicleModel: '',
        licensePlate: '',
        odometerKm: '',
        estimatedDeliveryAt: '',
        deliveredAt: ''
    });

    const CUSTOMER_REQUEST_MAX_LENGTH = 255;

    const initialEditState = useMemo(() => {
        const request = String(ticketRaw?.customerRequest ?? ticket?.requestNote ?? '').trim();
        const customerName = String(ticket?.customer?.name ?? '').trim();
        const customerPhone = String(ticket?.customer?.phone ?? '').trim();
        const customerEmail = String(ticket?.customer?.email ?? '').trim();
        const receivedAt = formatDateTimeLocal(ticket?.receivedAt);
        const safetyInspectionEnabled = Boolean(ticketRaw?.safetyInspectionEnabled ?? false);
        const vehicleModel = String(ticket?.vehicle?.model ?? '').trim();
        const licensePlate = String(ticket?.vehicle?.licensePlate ?? '').trim();
        const odometerKm = ticket?.vehicle?.odometerKm != null ? String(ticket.vehicle.odometerKm) : '';
        const estimatedDeliveryAt = formatDateTimeLocal(ticket?.estimatedDeliveryAt);
        const deliveredAt = formatDateTimeLocal(ticket?.handoverAt);
        return {
            request,
            customerName,
            customerPhone,
            customerEmail,
            receivedAt,
            safetyInspectionEnabled,
            vehicleModel,
            licensePlate,
            odometerKm,
            estimatedDeliveryAt,
            deliveredAt
        };
    }, [ticketRaw, ticket]);

    const toggleEdit = useCallback(() => {
        if (isSaving) return;
        if (!isEditing && isImmutable) {
            setError('Phiếu dịch vụ này không thể chỉnh sửa.');
            return;
        }

        setError('');
        setFieldErrors({
            customerRequest: '',
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            receivedAt: '',
            safetyInspectionEnabled: '',
            vehicleModel: '',
            licensePlate: '',
            odometerKm: '',
            estimatedDeliveryAt: '',
            deliveredAt: ''
        });
        setIsEditing((prev) => {
            const next = !prev;
            if (next) {
                setEditForm({
                    customerRequest: initialEditState.request,
                    customerName: initialEditState.customerName,
                    customerPhone: initialEditState.customerPhone,
                    customerEmail: initialEditState.customerEmail,
                    receivedAt: initialEditState.receivedAt,
                    safetyInspectionEnabled: initialEditState.safetyInspectionEnabled,
                    vehicleModel: initialEditState.vehicleModel,
                    licensePlate: initialEditState.licensePlate,
                    odometerKm: initialEditState.odometerKm,
                    estimatedDeliveryAt: initialEditState.estimatedDeliveryAt,
                    deliveredAt: initialEditState.deliveredAt
                });
            }
            return next;
        });
    }, [isSaving, isEditing, isImmutable, setError, initialEditState]);

    const cancelEdit = useCallback(() => setIsEditing(false), []);

    const setCustomerRequest = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, customerRequest: nextValue }));
        setFieldErrors((prev) => (prev.customerRequest ? { ...prev, customerRequest: '' } : prev));
    }, []);

    const setCustomerName = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, customerName: nextValue }));
        setFieldErrors((prev) => (prev.customerName ? { ...prev, customerName: '' } : prev));
    }, []);

    const setCustomerPhone = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, customerPhone: nextValue }));
        setFieldErrors((prev) => (prev.customerPhone ? { ...prev, customerPhone: '' } : prev));
    }, []);

    const setCustomerEmail = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, customerEmail: nextValue }));
        setFieldErrors((prev) => (prev.customerEmail ? { ...prev, customerEmail: '' } : prev));
    }, []);

    const setReceivedAt = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, receivedAt: nextValue }));
        setFieldErrors((prev) => (prev.receivedAt ? { ...prev, receivedAt: '' } : prev));
    }, []);

    const setSafetyInspectionEnabled = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, safetyInspectionEnabled: nextValue }));
        setFieldErrors((prev) => (prev.safetyInspectionEnabled ? { ...prev, safetyInspectionEnabled: '' } : prev));
    }, []);

    const setVehicleModel = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, vehicleModel: nextValue }));
        setFieldErrors((prev) => (prev.vehicleModel ? { ...prev, vehicleModel: '' } : prev));
    }, []);

    const setLicensePlate = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, licensePlate: nextValue }));
        setFieldErrors((prev) => (prev.licensePlate ? { ...prev, licensePlate: '' } : prev));
    }, []);

    const setOdometerKm = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, odometerKm: nextValue }));
        setFieldErrors((prev) => (prev.odometerKm ? { ...prev, odometerKm: '' } : prev));
    }, []);

    const setEstimatedDeliveryAt = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, estimatedDeliveryAt: nextValue }));
        setFieldErrors((prev) => (prev.estimatedDeliveryAt ? { ...prev, estimatedDeliveryAt: '' } : prev));
    }, []);

    const setDeliveredAt = useCallback((nextValue) => {
        setEditForm((prev) => ({ ...prev, deliveredAt: nextValue }));
        setFieldErrors((prev) => (prev.deliveredAt ? { ...prev, deliveredAt: '' } : prev));
    }, []);

    const saveEdit = useCallback(async () => {
        if (isSaving) return;

        const guardError = getSaveEditGuardError({ ticketCodeParam, isImmutable });
        if (guardError) {
            setError(guardError);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('Vui lòng đăng nhập để lưu thay đổi.');
            return;
        }

        // Validations
        const validatedRequest = validateTextInput(editForm.customerRequest, {
            fieldLabel: 'Nội dung yêu cầu',
            required: true,
            trim: true,
            maxLength: CUSTOMER_REQUEST_MAX_LENGTH,
        });
        if (validatedRequest.error) {
            setError('');
            setFieldErrors((prev) => ({ ...prev, customerRequest: validatedRequest.error }));
            return;
        }

        const validatedName = validateTextInput(editForm.customerName, {
            fieldLabel: 'Họ tên',
            required: true,
            trim: true,
            maxLength: 100,
        });
        if (validatedName.error) {
            setError('');
            setFieldErrors((prev) => ({ ...prev, customerName: validatedName.error }));
            return;
        }

        const validatedPhone = validateTextInput(editForm.customerPhone, {
            fieldLabel: 'Số điện thoại',
            required: true,
            trim: true,
            maxLength: 20,
        });
        if (validatedPhone.error) {
            setError('');
            setFieldErrors((prev) => ({ ...prev, customerPhone: validatedPhone.error }));
            return;
        }
        if (!/^\+?[0-9]{9,15}$/.test(validatedPhone.value.replace(/\s+/g, ''))) {
            setError('');
            setFieldErrors((prev) => ({ ...prev, customerPhone: 'Số điện thoại không hợp lệ (phải từ 9-15 chữ số)' }));
            return;
        }

        if (editForm.customerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(editForm.customerEmail.trim())) {
                setError('');
                setFieldErrors((prev) => ({ ...prev, customerEmail: 'E-mail không hợp lệ' }));
                return;
            }
        }

        const validatedVehicleModel = validateTextInput(editForm.vehicleModel, {
            fieldLabel: 'Loại & kiểu xe',
            required: true,
            trim: true,
            maxLength: 100,
        });
        if (validatedVehicleModel.error) {
            setError('');
            setFieldErrors((prev) => ({ ...prev, vehicleModel: validatedVehicleModel.error }));
            return;
        }

        const validatedLicensePlate = validateTextInput(editForm.licensePlate, {
            fieldLabel: 'Biển số',
            required: true,
            trim: true,
            maxLength: 30,
        });
        if (validatedLicensePlate.error) {
            setError('');
            setFieldErrors((prev) => ({ ...prev, licensePlate: validatedLicensePlate.error }));
            return;
        }

        let odometerKm = null;
        if (editForm.odometerKm !== '') {
            const odometerVal = parseInt(String(editForm.odometerKm).replace(/\D/g, ''), 10);
            if (isNaN(odometerVal) || odometerVal < 0) {
                setError('');
                setFieldErrors((prev) => ({ ...prev, odometerKm: 'Số công tơ mét không hợp lệ' }));
                return;
            }
            odometerKm = odometerVal;
        }

        const customerRequest = validatedRequest.value;
        const customerName = validatedName.value;
        const customerPhone = validatedPhone.value;
        const customerEmail = editForm.customerEmail ? editForm.customerEmail.trim() : '';
        const receivedAt = editForm.receivedAt ? formatEstimatedDeliveryAtForApi(editForm.receivedAt) : null;
        const safetyInspectionEnabled = editForm.safetyInspectionEnabled;
        const vehicleModel = validatedVehicleModel.value;
        const licensePlate = validatedLicensePlate.value;
        const estimatedDeliveryAt = editForm.estimatedDeliveryAt ? formatEstimatedDeliveryAtForApi(editForm.estimatedDeliveryAt) : null;
        const deliveredAt = editForm.deliveredAt ? formatEstimatedDeliveryAtForApi(editForm.deliveredAt) : null;

        try {
            setIsSaving(true);
            setError('');
            setFieldErrors({
                customerRequest: '',
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                receivedAt: '',
                safetyInspectionEnabled: '',
                vehicleModel: '',
                licensePlate: '',
                odometerKm: '',
                estimatedDeliveryAt: '',
                deliveredAt: ''
            });
            const res = await updateServiceTicket(
                ticketCodeParam,
                {
                    customerRequest,
                    customerName,
                    customerPhone,
                    customerEmail,
                    receivedAt,
                    safetyInspectionEnabled,
                    vehicleModel,
                    licensePlate,
                    odometerKm,
                    estimatedDeliveryAt,
                    deliveredAt
                },
                token,
            );

            setTicketRaw(res?.data ?? null);
            setIsEditing(false);
            notify(res?.message || 'Cập nhật phiếu dịch vụ thành công.');
        } catch (err) {
            setError(err?.message || 'Không thể cập nhật phiếu dịch vụ.');
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, ticketCodeParam, isImmutable, editForm, setError, setTicketRaw, notify]);

    return {
        isEditing,
        isSaving,
        editForm,
        setEditForm,
        fieldErrors,
        setCustomerRequest,
        setCustomerName,
        setCustomerPhone,
        setCustomerEmail,
        setReceivedAt,
        setSafetyInspectionEnabled,
        setVehicleModel,
        setLicensePlate,
        setOdometerKm,
        setEstimatedDeliveryAt,
        setDeliveredAt,
        toggleEdit,
        cancelEdit,
        saveEdit,
    };
}
