import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchServiceTicketDetail, updateServiceTicket } from '../../../services/serviceTicketService.js';
import { validateTextInput } from '../../../components/inputValidation.js';
import { getServiceTicketStatusTextVi } from '../../../components/statusUtils.js';

const STAFF_ROLE = {
    ADVISOR: 'ADVISOR',
    RECEPTIONIST: 'RECEPTIONIST',
    ACCOUNTANT: 'ACCOUNTANT',
    WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
};
const ADD_SERVICE_RESTORE_STORAGE_PREFIX = 'serviceTicketAddServicePending:';
const PROMOTION_TYPES = [
    { type: 'PERCENT', label: 'Giảm theo phần trăm' },
    { type: 'BUY_X_GET_Y', label: 'Mua X tặng Y' },
];

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

function toTitleCaseFromCode(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (!/^[A-Z0-9_-]+$/.test(raw)) return raw;

    return raw
        .replaceAll(/[-_]+/g, ' ')
        .toLowerCase()
        .replaceAll(/\b\w/g, (m) => m.toUpperCase());
}

function formatCurrencyVnd(value) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
}

function toMoneyNumber(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(n) ? n : 0;
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
    const withVatNum = toMoneyNumber(withVatValue);
    if (withVatNum > 0) return withVatNum;
    return Math.max(0, toMoneyNumber(baseValue));
}

function pickDiscountAmountValue(item) {
    return toMoneyNumber(item?.discountAmount ?? item?.discount_amount);
}

function getEstimateItemGiftFlag(item) {
    const raw = item?.isGift ?? item?.is_gift;
    return raw === true || String(raw ?? '').trim().toLowerCase() === 'true';
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

function getEstimateItemFinalPriceDisplay(item, fallbackValue) {
    const rawFinalPrice = item?.finalPrice ?? item?.final_price;
    if (rawFinalPrice == null || String(rawFinalPrice).trim() === '') return fallbackValue;
    const finalPrice = typeof rawFinalPrice === 'number' ? rawFinalPrice : Number(String(rawFinalPrice ?? '').trim());
    return Number.isFinite(finalPrice) ? finalPrice : fallbackValue;
}

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

function getFinishWorkErrorMessage(err, fallback) {
    // Intentionally do not surface backend error messages in the UI.
    // Keep the helper for consistent call-sites.
    return fallback || 'Không thể báo hoàn thành sửa chữa.';
}

function normalizeOdometerKm(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : Number(String(value).replaceAll(/\D/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
}

function toPositiveNumberOrNull(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

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

function normalizeSearchText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replaceAll('đ', 'd')
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '');
}

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

function buildStockAllocationUpdatePayload({ estimateId, serviceTicketId, estimateItems }) {
    const estId = toPositiveNumberOrNull(estimateId);
    const ticketId = toPositiveNumberOrNull(serviceTicketId);
    const items = Array.isArray(estimateItems) ? estimateItems : [];
    if (!estId || !ticketId || items.length === 0) return [];

    const rows = items
        .filter((it) => !it?.isRemoved)
        .map((it) => {
            const estimateItemId =
                it?.estimateItemId ??
                it?.estimateItemID ??
                it?.estimate_item_id ??
                it?.id ??
                null;

            // Try to avoid mistakenly picking estimateItemId as itemId by checking nested fields first.
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
            if (!toPositiveNumberOrNull(estimateItemId) || !toPositiveNumberOrNull(itemId) || !quantity) return null;

            const warehouseId =
                it?.warehouseId ??
                it?.warehouseID ??
                it?.warehouse_id ??
                it?.warehouse?.warehouseId ??
                it?.warehouse?.id ??
                undefined;

            // Stock allocation only applies to rows tied to a warehouse (parts/materials).
            // Service-only rows typically have no warehouseId and must be skipped,
            // otherwise backend validation can fail (warehouseId must not be null).
            const warehouseIdNum = toPositiveNumberOrNull(warehouseId);
            if (!warehouseIdNum) return null;

            const allocationId =
                it?.allocationId ??
                it?.stockAllocationId ??
                it?.stock_allocation_id ??
                it?.reservationId ??
                undefined;

            const status = it?.allocationStatus ?? it?.stockAllocationStatus ?? it?.stock_allocation_status ?? undefined;
            const createdBy = it?.createdBy ?? it?.created_by ?? undefined;

            return {
                ...(allocationId == null ? {} : { allocationId }),
                serviceTicketId: ticketId,
                estimateItemId: Number(estimateItemId),
                warehouseId: Number(warehouseIdNum),
                itemId: Number(itemId),
                estimateId: estId,
                quantity: Number(quantity),
                ...(status == null ? {} : { status }),
                ...(createdBy == null ? {} : { createdBy }),
            };
        })
        .filter(Boolean);

    return rows;
}

function pickFirstDefined(obj, keys) {
    for (const key of keys) {
        const v = obj?.[key];
        if (v != null && String(v).trim() !== '') return v;
    }
    return null;
}

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

function isEstimateItemActive(it) {
    return !it?.isRemoved;
}

function getEstimateItemIdKey(it) {
    const id = toPositiveNumberOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
    return id ? String(id) : '';
}

function getActiveEstimateItems(estimate) {
    return (Array.isArray(estimate?.items) ? estimate.items : []).filter(isEstimateItemActive);
}

function getActiveEstimateItemKeys(estimate) {
    return getActiveEstimateItems(estimate).map(getEstimateItemIdKey).filter(Boolean);
}

function hasSameStringSet(left, right) {
    const a = Array.isArray(left) ? left.map(String).filter(Boolean) : [];
    const b = Array.isArray(right) ? right.map(String).filter(Boolean) : [];
    if (a.length !== b.length) return false;
    const bSet = new Set(b);
    return a.every((value) => bSet.has(value));
}

function getAddServiceRestoreStorageKey(serviceTicketId) {
    const id = toPositiveNumberOrNull(serviceTicketId);
    return id ? `${ADD_SERVICE_RESTORE_STORAGE_PREFIX}${id}` : '';
}

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

function parsePromotionYmdDate(value, { endOfDay } = {}) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const [y, m, d] = raw.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isFinite(dt.getTime()) ? dt : null;
}

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

function getExplicitPromotionId(promo) {
    if (!promo) return null;
    const raw = promo?.promotionId ?? promo?.promotionID ?? promo?.PromotionId ?? promo?.promotion_id ?? null;
    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizePromotion(promo) {
    if (!promo) return null;
    if (Array.isArray(promo)) return normalizePromotion(promo[0] ?? null);
    if (Array.isArray(promo?.data)) return normalizePromotion(promo.data[0] ?? null);
    const promotionId = getPromotionId(promo);
    return promotionId ? { ...promo, promotionId } : promo;
}

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

function getPromotionUsageRemaining(promo) {
    const usageLimit = toMoneyNumber(promo?.usageLimit);
    const usedCount = toMoneyNumber(promo?.usedCount);
    if (!Number.isFinite(usageLimit) || usageLimit <= 0) return null;
    const used = Number.isFinite(usedCount) && usedCount > 0 ? usedCount : 0;
    return Math.max(usageLimit - used, 0);
}

function buildPromotionDisplayLabel(promo) {
    const base = buildPromotionLabel(promo);
    if (!promo || typeof promo === 'number' || typeof promo === 'string') return base;
    const details = [];
    const minOrderValue = toMoneyNumber(promo?.minOrderValue);
    if (Number.isFinite(minOrderValue) && minOrderValue > 0) {
        details.push(`Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}đ`);
    }
    const remaining = getPromotionUsageRemaining(promo);
    if (remaining != null) details.push(`Còn ${remaining} lượt`);
    if (details.length === 0) return base;
    return [base, details.join(' • ')].filter(Boolean).join(' — ');
}

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

function getPromotionType(promo) {
    return String(promo?.type ?? promo?.promotionType ?? '').trim().toUpperCase();
}

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
                finalPrice: it?.finalPrice ?? it?.final_price ?? '',
                finalPriceDisplay,
                isGift: getEstimateItemGiftFlag(it),
                stockAllocationStatus: getEstimateItemStockAllocationStatus(it),
                warehouseName: String(it?.warehouseName ?? it?.warehouse?.warehouseName ?? it?.warehouse?.name ?? '').trim(),
            };
        })
        .filter((r) => r.itemName || r.categoryName || r.quantity > 0 || r.unitPrice > 0 || r.subTotal > 0 || r.subTotalDisplay > 0);
}

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
	STAFF_ROLE,
	PROMOTION_TYPES,
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
				const res = await fetchServiceTicketDetail(ticketCodeParam, token);
				if (ignore) return;
				setTicketRaw(res?.data ?? null);
			} catch (err) {
				if (ignore) return;
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

function getSaveEditGuardError({ ticketCodeParam, isImmutable }) {
	if (!ticketCodeParam) return 'Thiếu ticketCode để cập nhật.';
	if (isImmutable) return 'Phiếu dịch vụ này không thể chỉnh sửa.';
	return '';
}

export function useServiceTicketEditing({ ticketCodeParam, isImmutable, ticketRaw, ticket, setTicketRaw, setError, notify }) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editForm, setEditForm] = useState({ customerRequest: '' });
	const [fieldErrors, setFieldErrors] = useState({ customerRequest: '' });

	const CUSTOMER_REQUEST_MAX_LENGTH = 255;

	const initialEditState = useMemo(() => {
		const request = String(ticketRaw?.customerRequest ?? ticket?.requestNote ?? '').trim();
		return { request };
	}, [ticketRaw, ticket]);

	const toggleEdit = useCallback(() => {
		if (isSaving) return;
		if (!isEditing && isImmutable) {
			setError('Phiếu dịch vụ này không thể chỉnh sửa.');
			return;
		}

		setError('');
		setFieldErrors({ customerRequest: '' });
		setIsEditing((prev) => {
			const next = !prev;
			if (next) {
				setEditForm({ customerRequest: initialEditState.request });
			}
			return next;
		});
	}, [isSaving, isEditing, isImmutable, setError, initialEditState]);

	const cancelEdit = useCallback(() => setIsEditing(false), []);

	const setCustomerRequest = useCallback((nextValue) => {
		setEditForm((prev) => ({ ...prev, customerRequest: nextValue }));
		setFieldErrors((prev) => (prev.customerRequest ? { ...prev, customerRequest: '' } : prev));
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

		const validated = validateTextInput(editForm.customerRequest, {
			fieldLabel: 'Nội dung yêu cầu',
			required: true,
			trim: true,
			maxLength: CUSTOMER_REQUEST_MAX_LENGTH,
		});
		if (validated.error) {
			setError('');
			setFieldErrors({ customerRequest: validated.error });
			return;
		}

		const customerRequest = validated.value;

		try {
			setIsSaving(true);
			setError('');
			setFieldErrors({ customerRequest: '' });
			const res = await updateServiceTicket(
				ticketCodeParam,
				{
					customerRequest,
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
	}, [isSaving, ticketCodeParam, isImmutable, editForm.customerRequest, setError, setTicketRaw, notify]);

	return {
		isEditing,
		isSaving,
		editForm,
		setEditForm,
		fieldErrors,
		setCustomerRequest,
		toggleEdit,
		cancelEdit,
		saveEdit,
	};
}
