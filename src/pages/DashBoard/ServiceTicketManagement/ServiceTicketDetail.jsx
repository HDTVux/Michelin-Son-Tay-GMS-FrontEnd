import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { toast } from 'react-toastify';
import AdvisorItemsTable from './AdvisorItemsTable.jsx';
import EstimateTimePopup from './EstimateTimePopup.jsx';
import MaintenanceBookingPopup from './MaintenanceBookingPopup.jsx';
import { useServiceTicketDetailData, useServiceTicketEditing } from './serviceTicketDetailHandlers.js';
import { getServiceTicketStatusTextVi } from '../../../components/statusUtils.js';
import {
    allocateEstimateStock,
    createServiceTicketReminder,
    updateEstimateStockAllocation,
    fetchEstimateStockAllocations,
    fetchServiceTicketDetail,
    fetchServiceTicketEstimate,
    manageServiceTicketEstimateStatus,
    manageServiceTicketStatus,
    fetchTicketAssignments,
    updateServiceTicketEstimatedDelivery,
    fetchSafetyInspectionCurrentRecommend,
} from '../../../services/serviceTicketService.js';
import { finishWork } from '../../../services/technicianService.js';
import { requestWarehouseStockIssue } from '../../../services/warehouseService.js';
import { createPayment, fetchPaymentByServiceTicketId } from '../../../services/paymentService.js';
import { fetchAvailablePromotions, fetchPromotionByCode } from '../../../services/promotionService.js';
import { getDefaultSafetyInspectionCategories, getSafetyInspectionByTicketCode } from '../../../services/safetyInspectionService.js';
import { ServiceTicket as TechnicianServiceTicket } from '../../Technician/ServiceTicket/ServiceTicket.jsx';
import Receipt from '../Receipt/Receipt.jsx';
import styles from './ServiceTicketDetail.module.css';

const STAFF_ROLE = {
    ADVISOR: 'ADVISOR',
    RECEPTIONIST: 'RECEPTIONIST',
    ACCOUNTANT: 'ACCOUNTANT',
};
const ADD_SERVICE_RESTORE_STORAGE_PREFIX = 'serviceTicketAddServicePending:';

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

function formatCurrencyVndCompact(value) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(n) || n === 0) return '';
    return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
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
    return item?.isGift === true || String(item?.isGift ?? '').trim().toLowerCase() === 'true';
}

function getEstimateItemFinalPriceDisplay(item, fallbackValue) {
    const discountAmount = pickDiscountAmountValue(item);
    const isGift = getEstimateItemGiftFlag(item);
    if (!isGift && discountAmount <= 0) return fallbackValue;

    const rawFinalPrice = item?.finalPrice ?? item?.final_price;
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

function getEstimateItemCheckedFlag(it) {
    return Boolean(
        it?.isChecked ??
        it?.confirmed ??
        it?.isConfirmed ??
        it?.approved ??
        it?.isApproved ??
        it?.customerConfirmed ??
        it?.isCustomerConfirmed,
    );
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
    const raw = promo?.promotionId ?? promo?.promotionID ?? promo?.PromotionId ?? promo?.id ?? promo?.ID ?? null;
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
    const name = String(promo?.name || '').trim();
    const code = String(promo?.code || '').trim();
    const discountPercent = toMoneyNumber(promo?.discountPercent);
    const parts = [name || code].filter(Boolean);
    if (code && name) parts.push(code);
    if (discountPercent > 0) parts.push(`-${discountPercent}%`);
    return parts.join(' • ');
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

    const discountPercent = toMoneyNumber(promo?.discountPercent);
    if (discountPercent <= 0) return 'Khuyến mãi này chưa hỗ trợ trên hoá đơn';
    return '';
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

function getItemConfirmedFlag(it) {
    return Boolean(
        it?.isChecked ??
        it?.confirmed ??
        it?.isConfirmed ??
        it?.approved ??
        it?.isApproved ??
        it?.customerConfirmed ??
        it?.isCustomerConfirmed,
    );
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
                warehouseName: String(it?.warehouseName ?? it?.warehouse?.warehouseName ?? it?.warehouse?.name ?? '').trim(),
                confirmed: getItemConfirmedFlag(it),
            };
        })
        .filter((r) => r.itemName || r.categoryName || r.quantity > 0 || r.unitPrice > 0 || r.subTotal > 0 || r.subTotalDisplay > 0);
}

function InfoBlock({ title, rows }) {
    return (
        <section className={styles.block}>
            <h2 className={styles.blockTitle}>{title}</h2>
            <div className={styles.kvList}>
                {rows.map((r) => (
                    <div key={r.label} className={styles.kvRow}>
                        <span className={styles.kvLabel}>{r.label}</span>
                        <span className={styles.kvValue}>{r.value}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function TimelineBlock({ steps }) {
    return (
        <section className={styles.block}>
            <h2 className={styles.blockTitle}>Timeline</h2>
            <ol className={styles.timeline}>
                {(Array.isArray(steps) ? steps : []).map((step) => {
                    const itemClassName = [
                        styles.timelineItem,
                        step.state === 'done' ? styles.isCompleted : '',
                        step.state === 'active' ? styles.isActive : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <li key={step.key} className={itemClassName}>
                            <span className={styles.dot} aria-hidden="true" />
                            <span className={styles.timelineLabel}>{step.label}</span>
                            <span className={styles.timelineTime}>
                                {step.at ? formatDateTimeViNoSeconds(step.at, '') : ''}
                            </span>
                        </li>
                    );
                })}
                {(!Array.isArray(steps) || steps.length === 0) && (
                    <li className={styles.timelineItem}>
                        <span className={styles.dot} aria-hidden="true" />
                        <span className={styles.timelineLabel}>-</span>
                    </li>
                )}
            </ol>
        </section>
    );
}

function RoleBasedSections({ showTimeline, timelineSteps, showAdvisorTable, serviceTicketId, ticketCode, onEstimateStatusChange }) {
    if (!showTimeline && !showAdvisorTable) return null;
    return (
        <>
            {showTimeline ? <TimelineBlock steps={timelineSteps} /> : null}
            {showAdvisorTable ? (
                <>
                    <TechnicianServiceTicket ticketCode={ticketCode} embedded mode="advisor" />
                    <AdvisorItemsTable serviceTicketId={serviceTicketId} onEstimateStatusChange={onEstimateStatusChange} />
                </>
            ) : null}
        </>
    );
}

RoleBasedSections.propTypes = {
    showTimeline: PropTypes.bool,
    timelineSteps: PropTypes.array,
    showAdvisorTable: PropTypes.bool,
    serviceTicketId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ticketCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onEstimateStatusChange: PropTypes.func,
};

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

export default function ServiceTicketDetail({ ticketCodeOverride }) {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
    const hasAdvisorRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.ADVISOR);
    const hasReceptionistRole = staffRoles.includes(STAFF_ROLE.RECEPTIONIST);
    const isAdvisorOnlyViewRole = hasAdvisorRole;
    const hasReceptionistEditAccess = hasReceptionistRole;
    const canViewInspectionAndEstimate = true;

    const [receiptApproving, setReceiptApproving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [latestEstimate, setLatestEstimate] = useState(null);
    const estimateLoadSeqRef = useRef(0);
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    const [stockIssueRequesting, setStockIssueRequesting] = useState(false);

    const [isEstimateEditing, setIsEstimateEditing] = useState(false);

    const [maintenancePopupOpen, setMaintenancePopupOpen] = useState(false);
    const [maintenanceDraft, setMaintenanceDraft] = useState({ scheduledAt: '', note: '' });
    const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
    const [estimateTimePopupOpen, setEstimateTimePopupOpen] = useState(false);
    const [estimatedTimeDraft, setEstimatedTimeDraft] = useState('');
    const handleOpenMaintenancePopup = () => {
        setMaintenancePopupOpen(true);
    };


    // Only for flow: "Tạo bản báo giá mới" (restart from archived).
    // While active, hide other ticket action buttons and only allow confirming estimate after it is saved.
    const [isCreatingNewEstimateVersion, setIsCreatingNewEstimateVersion] = useState(false);
    const createNewEstimateRevertRef = useRef(null);

    const [refreshTick, setRefreshTick] = useState(0);
    const triggerRefresh = useCallback(() => setRefreshTick((prev) => prev + 1), []);

    // When using "Thêm dịch vụ" we temporarily force Estimate to DRAFT.
    // Cancel in append-only mode must revert statuses back.
    const addServiceRevertRef = useRef(null);
    const [addServiceReverting, setAddServiceReverting] = useState(false);

    const ticketCodeParam = String(ticketCodeOverride || params?.ticketCode || '').trim();
    const ticketFromState = location?.state?.ticket ?? location?.state?.serviceTicket ?? null;

    const { ticketRaw, setTicketRaw, isLoading, error, setError } = useServiceTicketDetailData(
        ticketCodeParam,
        ticketFromState,
    );
    const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);
    const ticket = useMemo(
        () => normalizeTicket(ticketRaw ?? ticketFromState, ticketCodeParam),
        [ticketRaw, ticketFromState, ticketCodeParam],
    );
    const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
    const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';

    useEffect(() => {
        if (estimatedTimeDraft) return;
        const fromBackend = ticket?.estimatedDeliveryAt;
        if (fromBackend) setEstimatedTimeDraft(fromBackend);
    }, [estimatedTimeDraft, ticket?.estimatedDeliveryAt]);

    const estimatedTimeValue = useMemo(
        () => String(estimatedTimeDraft || ticket?.estimatedDeliveryAt || '').trim(),
        [estimatedTimeDraft, ticket?.estimatedDeliveryAt],
    );
    const estimatedTimeDisplay = useMemo(
        () => (estimatedTimeValue ? formatDateTimeViNoSeconds(estimatedTimeValue, '-') : '-'),
        [estimatedTimeValue],
    );
    const ticketStatus = useMemo(
        () => normalizeTicketStatus(ticket?.statusCode || ticket?.timelineStatus || ticket?.statusLabel),
        [ticket?.statusCode, ticket?.timelineStatus, ticket?.statusLabel],
    );
    const isSafetyInspectionEnabled = useMemo(
        () => ticketRaw?.safetyInspectionEnabled === true || ticketFromState?.safetyInspectionEnabled === true,
        [ticketFromState?.safetyInspectionEnabled, ticketRaw?.safetyInspectionEnabled],
    );
    const safetyInspectionStatus = useMemo(() => normalizeSafetyInspectionStatus(
        ticketRaw?.safetyInspection?.inspectionStatus
        ?? ticketRaw?.safetyInspectionStatus
        ?? ticketRaw?.inspectionStatus
        ?? ticketRaw?.inspection?.inspectionStatus
        ?? ticketFromState?.safetyInspection?.inspectionStatus
        ?? ticketFromState?.safetyInspectionStatus
        ?? ticketFromState?.inspectionStatus
        ?? ticketFromState?.inspection?.inspectionStatus,
    ), [
        ticketFromState?.inspection?.inspectionStatus,
        ticketFromState?.inspectionStatus,
        ticketFromState?.safetyInspection?.inspectionStatus,
        ticketFromState?.safetyInspectionStatus,
        ticketRaw?.inspection?.inspectionStatus,
        ticketRaw?.inspectionStatus,
        ticketRaw?.safetyInspection?.inspectionStatus,
        ticketRaw?.safetyInspectionStatus,
    ]);
    const hasCompletedInspectionStep = useMemo(() => {
        if (isSafetyInspectionEnabled && safetyInspectionStatus === 'COMPLETED') return true;
        return ['INSPECTED', 'ESTIMATED', 'PENDING', 'REPAIRING', 'COMPLETED', 'PAID'].includes(ticketStatus);
    }, [isSafetyInspectionEnabled, safetyInspectionStatus, ticketStatus]);
    const shouldHideEstimateUntilInspectionDone = !hasCompletedInspectionStep;

    const isTicketCancelled = ticketStatus === 'CANCELLED';

    const serviceTicketIdNum = useMemo(() => {
        const raw = ticket?.serviceTicketId;
        const n = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [ticket?.serviceTicketId]);

    // Route param changes often reuse the same component instance.
    // Ensure transient workflow refs don't leak across tickets.
    useEffect(() => {
        addServiceRevertRef.current = null;
        createNewEstimateRevertRef.current = null;
        setIsCreatingNewEstimateVersion(false);
    }, [serviceTicketIdNum]);

    const [billPayment, setBillPayment] = useState(null);
    const [billLookupError, setBillLookupError] = useState('');
    const [billCreating, setBillCreating] = useState(false);

    const [availablePromotions, setAvailablePromotions] = useState([]);
    const [promotionsLoading, setPromotionsLoading] = useState(false);
    const [promotionsError, setPromotionsError] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [selectedPromotionId, setSelectedPromotionId] = useState('');
    const [appliedPromotion, setAppliedPromotion] = useState(null);
    const [promoApplying, setPromoApplying] = useState(false);
    const [promoError, setPromoError] = useState('');

    const [safetyInspectionForPrint, setSafetyInspectionForPrint] = useState(null);
    const [defaultSafetyCategories, setDefaultSafetyCategories] = useState([]);
    const [printRecommendation, setPrintRecommendation] = useState('');

    useEffect(() => {
        let cancelled = false;

        if (!serviceTicketIdNum) {
            setBillPayment(null);
            setBillLookupError('');
            return () => { cancelled = true; };
        }

        (async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (!cancelled) {
                    setBillPayment(null);
                    setBillLookupError('');
                }
                return;
            }

            try {
                if (!cancelled) {
                    setBillLookupError('');
                }
                const res = await fetchPaymentByServiceTicketId(serviceTicketIdNum, token);
                if (cancelled) return;
                setBillPayment(res?.data ?? res ?? null);
            } catch (err) {
                if (cancelled) return;
                const message = String(err?.message || '').toLowerCase();
                const isNotFound = message.includes('not found')
                    || message.includes('404')
                    || message.includes('không tìm thấy')
                    || message.includes('khong tim thay');
                if (isNotFound) {
                    setBillPayment(null);
                    setBillLookupError('');
                } else {
                    setBillPayment(null);
                    setBillLookupError(err?.message || 'Không thể kiểm tra hóa đơn của phiếu dịch vụ.');
                }
            } finally {
                // no-op
            }
        })();

        return () => { cancelled = true; };
    }, [serviceTicketIdNum]);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return undefined;

        let cancelled = false;
        (async () => {
            try {
                setPromotionsLoading(true);
                setPromotionsError('');
                const res = await fetchAvailablePromotions(token);
                if (cancelled) return;
                setAvailablePromotions(Array.isArray(res?.data) ? res.data : []);
            } catch (err) {
                if (cancelled) return;
                setAvailablePromotions([]);
                setPromotionsError(err?.message || 'Không thể tải danh sách khuyến mãi.');
            } finally {
                if (!cancelled) setPromotionsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return undefined;
        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!code) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const res = await getSafetyInspectionByTicketCode(code, token);
                if (!cancelled) setSafetyInspectionForPrint(res?.data ?? null);
            } catch {
                if (!cancelled) setSafetyInspectionForPrint(null);
            }
        })();
        return () => { cancelled = true; };
    }, [ticket.ticketCode, ticketCodeParam]);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const res = await getDefaultSafetyInspectionCategories(token);
                if (!cancelled) setDefaultSafetyCategories(Array.isArray(res?.data) ? res.data : []);
            } catch {
                if (!cancelled) setDefaultSafetyCategories([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token || !serviceTicketIdNum) {
            setPrintRecommendation('');
            return undefined;
        }

        let cancelled = false;
        (async () => {
            const storageKey = `serviceTicketRecommendation:${serviceTicketIdNum}`;
            try {
                const res = await fetchSafetyInspectionCurrentRecommend(serviceTicketIdNum, token);
                const value = String(
                    res?.data?.recommend ??
                    res?.data?.recommendation ??
                    res?.data?.recommendationText ??
                    res?.data?.currentRecommend ??
                    res?.data ??
                    '',
                ).trim();
                if (cancelled) return;
                const next = value || localStorage.getItem(storageKey) || '';
                setPrintRecommendation(next);
                if (next) localStorage.setItem(storageKey, next);
            } catch {
                if (!cancelled) setPrintRecommendation(localStorage.getItem(storageKey) || '');
            }
        })();

        return () => { cancelled = true; };
    }, [serviceTicketIdNum]);

    const estimateStatus = useMemo(() => {
        return normalizeEstimateStatus(
            latestEstimate?.estimateStatus ?? latestEstimate?.status ?? latestEstimate?.estimate_status,
        );
    }, [latestEstimate]);

    const estimateIdNum = useMemo(() => {
        const raw = latestEstimate?.estimateId ?? latestEstimate?.id;
        const n = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [latestEstimate]);

    const isAddServicePending = useMemo(() => {
        if (!serviceTicketIdNum) return false;
        const snapshot = addServiceRevertRef.current ?? readAddServiceRestoreSnapshot(serviceTicketIdNum);
        if (!snapshot) return false;

        const snapshotEstimateId = toPositiveNumberOrNull(snapshot?.estimateIdNum);
        const previousEstimateStatus = normalizeEstimateStatus(snapshot?.prevEstimateStatus);
        if (previousEstimateStatus !== 'APPROVED') return false;

        if (snapshotEstimateId && estimateIdNum) {
            return snapshotEstimateId === estimateIdNum;
        }

        return true;
    }, [estimateIdNum, serviceTicketIdNum]);

    const isEstimateApproved = estimateStatus === 'APPROVED';
    const billId = useMemo(() => normalizeBillId(billPayment), [billPayment]);
    const hasBill = Boolean(billId);
    const isActionLocked = ticketStatus === 'PAID' || hasBill;

    const receiptItems = useMemo(() => mapEstimateItemsForReceipt(latestEstimate), [latestEstimate]);
    const confirmedReceiptItems = useMemo(
        () => receiptItems.filter((it) => it.confirmed),
        [receiptItems],
    );
    const receiptSubtotal = useMemo(
        () => confirmedReceiptItems.reduce((acc, it) => acc + toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal), 0),
        [confirmedReceiptItems],
    );
    const receiptDiscountAmount = useMemo(() => {
        if (!appliedPromotion) return 0;
        const validationMessage = validatePromotion(appliedPromotion, receiptSubtotal);
        if (validationMessage) return 0;
        const percent = toMoneyNumber(appliedPromotion?.discountPercent);
        return Math.min(receiptSubtotal, Math.max(0, receiptSubtotal * (percent / 100)));
    }, [appliedPromotion, receiptSubtotal]);
    const receiptTotal = useMemo(
        () => Math.max(0, receiptSubtotal - receiptDiscountAmount),
        [receiptDiscountAmount, receiptSubtotal],
    );
    const printTicket = useMemo(() => ({
        ...ticket,
        receivedAtDisplay,
        handoverAtDisplay,
        recommendation: printRecommendation,
        safetyInspectionEnabled: ticketRaw?.safetyInspectionEnabled,
        invoice: {
            items: receiptItems.map((it) => ({
                ...it,
                unitPrice: toMoneyNumber(it.unitPriceDisplay ?? it.unitPrice),
                subTotal: toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal),
            })),
            subtotal: receiptSubtotal,
            discountAmount: receiptDiscountAmount,
            vatRate: '',
            vatAmount: 0,
            total: receiptTotal,
            promotionLabel: buildPromotionLabel(appliedPromotion),
        },
        safetyInspection: safetyInspectionForPrint ?? ticketRaw?.safetyInspection ?? {},
        defaultCategories: defaultSafetyCategories,
    }), [
        appliedPromotion,
        defaultSafetyCategories,
        handoverAtDisplay,
        printRecommendation,
        receiptItems,
        receiptDiscountAmount,
        receiptSubtotal,
        receiptTotal,
        receivedAtDisplay,
        safetyInspectionForPrint,
        ticket,
        ticketRaw?.safetyInspection,
        ticketRaw?.safetyInspectionEnabled,
    ]);

    useEffect(() => {
        if (!hasBill) return;
        if (appliedPromotion) setAppliedPromotion(null);
        if (promoCode) setPromoCode('');
        if (selectedPromotionId) setSelectedPromotionId('');
    }, [hasBill, appliedPromotion, promoCode, selectedPromotionId]);

    const isImmutable = Boolean(ticketRaw?.immutable ?? ticketFromState?.immutable ?? ticket?.immutable) || isActionLocked;
    const isInspectionAndEstimateReadOnly = isActionLocked || !hasAdvisorRole;
    const inspectionAndEstimateReadOnlyMessage = !hasAdvisorRole
        ? 'Chỉ tư vấn viên mới được chỉnh sửa phần phiếu kiểm tra và báo giá. '
        : ticketStatus === 'PAID'
            ? 'Phiếu dịch vụ đã được thanh toán, không thể chỉnh sửa.'
            : 'Phiếu dịch vụ đã có hóa đơn chờ thanh toán, không thể chỉnh sửa.';

    const {
        isEditing,
        isSaving,
        editForm,
        fieldErrors,
        setCustomerRequest,
        toggleEdit,
        cancelEdit,
        saveEdit,
    } = useServiceTicketEditing({
        ticketCodeParam,
        isImmutable,
        ticketRaw,
        ticket,
        setTicketRaw,
        setError,
        notify,
    });

    const odometerKm = ticket?.vehicle?.odometerKm;
    const odometerDisplay =
        odometerKm == null ? '-' : `${Number(odometerKm).toLocaleString('vi-VN')} km`;

    const ticketPhotos = useMemo(() => (Array.isArray(ticket?.photos) ? ticket.photos : []), [ticket?.photos]);
    const licensePlatePhotos = useMemo(
        () => ticketPhotos.filter((p) => String(p?.category || '').toUpperCase() === 'LICENSE_PLATE'),
        [ticketPhotos],
    );

    const restoreInterruptedAddServiceEstimate = useCallback(
        async (latest, token) => {
            if (!latest || !serviceTicketIdNum) return latest;

            const snapshot = readAddServiceRestoreSnapshot(serviceTicketIdNum);
            if (!snapshot) return latest;

            const latestEstimateId = toPositiveNumberOrNull(latest?.estimateId ?? latest?.id);
            if (!latestEstimateId || latestEstimateId !== snapshot.estimateIdNum) {
                clearAddServiceRestoreSnapshot(serviceTicketIdNum);
                if (addServiceRevertRef.current?.estimateIdNum === snapshot.estimateIdNum) {
                    addServiceRevertRef.current = null;
                }
                return latest;
            }

            addServiceRevertRef.current = snapshot;

            const currentStatus = normalizeEstimateStatus(latest?.estimateStatus ?? latest?.status ?? latest?.estimate_status);
            const previousStatus = normalizeEstimateStatus(snapshot.prevEstimateStatus);
            if (currentStatus !== 'DRAFT') {
                clearAddServiceRestoreSnapshot(serviceTicketIdNum);
                addServiceRevertRef.current = null;
                return latest;
            }
            if (previousStatus !== 'APPROVED') return latest;

            const activeItems = getActiveEstimateItems(latest);
            const allActiveItemsChecked = activeItems.length > 0 && activeItems.every(getEstimateItemCheckedFlag);
            const hasNoSavedItemChange = hasSameStringSet(getActiveEstimateItemKeys(latest), snapshot.activeItemKeys);
            if (!allActiveItemsChecked || !hasNoSavedItemChange) {
                globalThis.setTimeout?.(() => {
                    try {
                        globalThis.dispatchEvent(new CustomEvent('startAppendEstimate'));
                    } catch {
                        // ignore if unavailable
                    }
                }, 0);
                return latest;
            }

            try {
                const previousTicketStatus = normalizeTicketStatus(snapshot.prevTicketStatus);
                if (previousTicketStatus) {
                    await manageServiceTicketStatus(serviceTicketIdNum, previousTicketStatus, token);
                }
                await manageServiceTicketEstimateStatus(latestEstimateId, previousStatus, token);

                clearAddServiceRestoreSnapshot(serviceTicketIdNum);
                addServiceRevertRef.current = null;

                const code = String(ticket?.ticketCode || ticketCodeParam || snapshot.ticketCode || '').trim();
                if (code) {
                    try {
                        const detailRes = await fetchServiceTicketDetail(code, token);
                        if (detailRes?.data) setTicketRaw(detailRes.data);
                    } catch {
                        // The estimate status is restored even if detail refresh fails.
                    }
                }

                return { ...latest, status: previousStatus, estimateStatus: previousStatus };
            } catch {
                return latest;
            }
        },
        [serviceTicketIdNum, setTicketRaw, ticket?.ticketCode, ticketCodeParam],
    );

    const loadLatestEstimate = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (!serviceTicketIdNum) return;

        const seq = ++estimateLoadSeqRef.current;
        try {
            setEstimateLoading(true);
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            if (estimateLoadSeqRef.current !== seq) return;
            const latest = await restoreInterruptedAddServiceEstimate(pickLatestEstimate(estimateRes?.data), token);
            setLatestEstimate((prev) => {
                if (!latest) return null;
                const next = prev ? { ...prev, ...latest } : { ...latest };
                // Some APIs/paths may return estimate meta without `items`.
                // Keep previous items to avoid flicker/hiding actions like "Xác nhận báo giá".
                if (!Array.isArray(latest?.items) && Array.isArray(prev?.items)) {
                    next.items = prev.items;
                }
                return next;
            });
        } catch {
            if (estimateLoadSeqRef.current !== seq) return;
            setLatestEstimate(null);
        } finally {
            if (estimateLoadSeqRef.current === seq) setEstimateLoading(false);
        }
    }, [restoreInterruptedAddServiceEstimate, serviceTicketIdNum]);

    useEffect(() => {
        loadLatestEstimate();
    }, [loadLatestEstimate]);

    // Load assignments to check technician before allowing receipt creation
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (!serviceTicketIdNum) return;

        let cancelled = false;
        (async () => {
            try {
                setAssignmentsLoading(true);
                const res = await fetchTicketAssignments(serviceTicketIdNum, token);
                if (cancelled) return;
                setAssignments(Array.isArray(res?.data) ? res.data : []);
            } catch {
                if (cancelled) return;
                setAssignments([]);
            } finally {
                if (!cancelled) setAssignmentsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [serviceTicketIdNum]);

    const hasTechnician = useMemo(() => {
        if (assignmentsLoading) return true;
        return assignments.some(
            (a) =>
                String(a?.roleInTicket || a?.role || '').toUpperCase() === 'TECHNICIAN'
                && String(a?.status || '').toUpperCase() !== 'CANCELLED',
        );
    }, [assignments, assignmentsLoading]);
    const advisorReadOnlyWithoutTechnician = isAdvisorOnlyViewRole && !assignmentsLoading && !hasTechnician;

    const canRequestPayment = ticketStatus === 'COMPLETED' && !assignmentsLoading && !isActionLocked;
    const canBookMaintenance = hasAdvisorRole && ticketStatus === 'COMPLETED' && !isActionLocked;

    const handleBack = () => navigate(-1);

    const handleUpdateTicketStatus = async (nextStatus, fallbackSuccessMessage) => {
        if (statusUpdating) return;

        if (isActionLocked) {
            notify('Phiếu dịch vụ đã có hóa đơn, không thể thay đổi trạng thái hoặc thao tác thêm.');
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            return;
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để cập nhật trạng thái.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ để tải lại sau khi cập nhật trạng thái.');
            return;
        }

        try {
            setStatusUpdating(true);
            setError('');
            const res = await manageServiceTicketStatus(serviceTicketIdNum, nextStatus, token);

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            triggerRefresh();
            notify(res?.message || fallbackSuccessMessage || `Đã cập nhật trạng thái: ${nextStatus}`);
        } catch (err) {
            notify(err?.message || 'Không thể cập nhật trạng thái phiếu dịch vụ.');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCancelTicket = async () => {
        if (statusUpdating) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để hủy phiếu dịch vụ.');
            return;
        }

        try {
            if (estimateIdNum) {
                await manageServiceTicketEstimateStatus(estimateIdNum, 'CANCELLED', token);
                setLatestEstimate((prev) => (prev ? { ...prev, status: 'CANCELLED', estimateStatus: 'CANCELLED' } : prev));
            }
        } catch (err) {
            notify(err?.message || 'Không thể cập nhật trạng thái báo giá.');
        }

        await handleUpdateTicketStatus('CANCELLED', 'Đã hủy phiếu dịch vụ.');
    };

    const handleSetPending = () => handleUpdateTicketStatus('PENDING', 'Đã chuyển sang trạng thái "Chờ xử lý".');

    const handleStartRepair = async () => {
        if (!estimateIdNum) {
            notify('Chưa có báo giá hợp lệ. Vui lòng tạo và xác nhận báo giá trước khi tiến hành sửa chữa.');
            return;
        }
        if (!isEstimateApproved) {
            notify('Vui lòng xác nhận báo giá trước khi tiến hành sửa chữa.');
            return;
        }

        await handleUpdateTicketStatus('REPAIRING', 'Đã chuyển sang trạng thái "Tiến hành sửa chữa".');
        navigate('/advisor/inspection');
    };

    const handleCompleteRepair = async () => {
        if (statusUpdating) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để báo hoàn thành.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ.');
            return;
        }

        try {
            setStatusUpdating(true);
            await finishWork(ticketCode, token);

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);
            triggerRefresh();
            notify('Đã chuyển sang trạng thái "Hoàn tất sửa chữa".');
        } catch (err) {
            notify(getFinishWorkErrorMessage(err, 'Không thể báo hoàn thành sửa chữa.'));
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCancelAppendOnly = useCallback(async () => {
        if (addServiceReverting) return;
        const snapshot = addServiceRevertRef.current;
        // Only revert if we have a snapshot (i.e. this edit session came from "Thêm dịch vụ").
        if (!snapshot) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để cập nhật trạng thái.');
            return;
        }

        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ để tải lại sau khi cập nhật trạng thái.');
            return;
        }

        try {
            setAddServiceReverting(true);

            const prevTicketStatus = String(snapshot.prevTicketStatus || '').trim().toUpperCase();
            if (prevTicketStatus) {
                await manageServiceTicketStatus(serviceTicketIdNum, prevTicketStatus, token);
            }

            const prevEstimateStatus = String(snapshot.prevEstimateStatus || '').trim().toUpperCase();
            if (snapshot.estimateIdNum && prevEstimateStatus) {
                await manageServiceTicketEstimateStatus(snapshot.estimateIdNum, prevEstimateStatus, token);
                setLatestEstimate((prev) => prev ? { ...prev, status: prevEstimateStatus, estimateStatus: prevEstimateStatus } : prev);
            }

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            notify('Đã hoàn tác trạng thái trước khi thêm dịch vụ.');
        } catch (err) {
            notify(err?.message || 'Không thể hoàn tác trạng thái.');
        } finally {
            addServiceRevertRef.current = null;
            clearAddServiceRestoreSnapshot(serviceTicketIdNum);
            setAddServiceReverting(false);
            triggerRefresh();
        }
    }, [addServiceReverting, notify, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw, triggerRefresh]);

    const handleRestartFromArchived = async () => {
        if (statusUpdating) return;
        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            throw new Error('No auth token');
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để bắt đầu báo giá mới.');
            throw new Error('Missing serviceTicketId');
        }

        try {
            setStatusUpdating(true);
            // Starting a new estimate/version should not be treated as append-only.
            addServiceRevertRef.current = null;
            clearAddServiceRestoreSnapshot(serviceTicketIdNum);
            // Snapshot current ticket status so Cancel during "create new estimate version" can revert.
            if (!createNewEstimateRevertRef.current) {
                createNewEstimateRevertRef.current = { prevTicketStatus: ticketStatus };
            }
            setIsCreatingNewEstimateVersion(true);
            // Simplified rule: "Tạo bản báo giá mới" always brings ticket to ESTIMATED.
            await manageServiceTicketStatus(serviceTicketIdNum, 'ESTIMATED', token);

            const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            triggerRefresh();
            // Notify advisor table to open create mode immediately
            try {
                globalThis.dispatchEvent(new CustomEvent('startCreateEstimate'));
            } catch {
                // ignore if unavailable
            }
            notify('Đã chuyển phiếu dịch vụ về trạng thái để bắt đầu báo giá mới.');
        } catch (err) {
            notify(err?.message || 'Không thể chuyển trạng thái phiếu dịch vụ để bắt đầu báo giá mới.');
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
            throw err;
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCancelCreateNewEstimateVersion = useCallback(async () => {
        const snapshot = createNewEstimateRevertRef.current;
        if (!snapshot?.prevTicketStatus) {
            setIsCreatingNewEstimateVersion(false);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để cập nhật trạng thái.');
            return;
        }

        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!code) {
            notify('Thiếu mã phiếu dịch vụ để tải lại sau khi cập nhật trạng thái.');
            return;
        }

        try {
            setStatusUpdating(true);
            const prev = String(snapshot.prevTicketStatus || '').trim().toUpperCase();
            if (prev) {
                await manageServiceTicketStatus(serviceTicketIdNum, prev, token);
            }
            const detailRes = await fetchServiceTicketDetail(code, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);
            triggerRefresh();
            notify('Đã hoàn tác trạng thái phiếu dịch vụ trước khi tạo báo giá mới.');
        } catch (err) {
            notify(err?.message || 'Không thể hoàn tác trạng thái phiếu dịch vụ.');
        } finally {
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
            setStatusUpdating(false);
        }
    }, [notify, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw, triggerRefresh]);

    const handleOpenEstimateTimePopup = () => {
        setEstimateTimePopupOpen(true);
    };

    const revertEstimateToDraftSilently = useCallback(async (token) => {
        if (!estimateIdNum) return;
        try {
            await manageServiceTicketEstimateStatus(estimateIdNum, 'DRAFT', token);
        } catch {
            // ignore
        }
        setLatestEstimate((prev) => (prev ? { ...prev, status: 'DRAFT', estimateStatus: 'DRAFT' } : prev));
    }, [estimateIdNum]);

    const ensureStockAllocationAfterConfirm = useCallback(async ({ token, isAppendOnlyConfirm }) => {
        if (!estimateIdNum) return;

        try {
            if (isAppendOnlyConfirm) {
                // Backend expects the full snapshot of allocations; missing rows can be treated as deleted.
                // New API: GET stock-allocation-get returns rows in shape { estimateItemDto, stockAllocationDto }.
                // We must send all warehouse-related items back; items without allocation send allocationId: null.
                try {
                    const allocationRes = await fetchEstimateStockAllocations(estimateIdNum, token);
                    const rows = Array.isArray(allocationRes?.data) ? allocationRes.data : [];
                    debugEstimateAllocation('stock-allocation-snapshot', {
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        rows,
                    });

                    const fallbackItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
                    const fallbackByEstimateItemId = new Map(
                        fallbackItems
                            .map((it) => {
                                const id = toPositiveNumberOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
                                return id ? [id, it] : null;
                            })
                            .filter(Boolean),
                    );

                    const payload = rows
                        .map((row) => {
                            const estimateItem = row?.estimateItemDto ?? null;
                            const stockAlloc = row?.stockAllocationDto ?? null;

                            const estimateItemId = toPositiveNumberOrNull(
                                estimateItem?.estimateItemId ?? estimateItem?.estimateItemID ?? estimateItem?.id,
                            );

                            const revisedFromItemId = toPositiveNumberOrNull(estimateItem?.revisedFromItemId);
                            const fallbackItem =
                                (estimateItemId ? fallbackByEstimateItemId.get(estimateItemId) : null) ||
                                (revisedFromItemId ? fallbackByEstimateItemId.get(revisedFromItemId) : null) ||
                                null;

                            const warehouseId = toPositiveNumberOrNull(
                                stockAlloc?.warehouseId ??
                                    estimateItem?.warehouseId ??
                                    estimateItem?.warehouseID ??
                                    estimateItem?.warehouse_id ??
                                    fallbackItem?.warehouseId ??
                                    fallbackItem?.warehouseID ??
                                    fallbackItem?.warehouse_id ??
                                    fallbackItem?.warehouse?.warehouseId ??
                                    fallbackItem?.warehouse?.id,
                            );

                            // Rows without a warehouse cannot be allocated (typically service lines).
                            if (!estimateItemId || !warehouseId) return null;

                            const itemId = toPositiveNumberOrNull(
                                stockAlloc?.itemId ??
                                    estimateItem?.itemId ??
                                    estimateItem?.catalogItemId ??
                                    estimateItem?.serviceItemId ??
                                    estimateItem?.productId ??
                                    fallbackItem?.itemId ??
                                    fallbackItem?.catalogItemId ??
                                    fallbackItem?.serviceItemId ??
                                    fallbackItem?.productId,
                            );
                            const quantity = toPositiveNumberOrNull(
                                estimateItem?.quantity ?? stockAlloc?.quantity ?? fallbackItem?.quantity,
                            );
                            if (!itemId || !quantity) return null;

                            const allocationIdRaw = stockAlloc?.allocationId ?? stockAlloc?.stockAllocationId ?? null;
                            const allocationId = toPositiveNumberOrNull(allocationIdRaw);

                            const createdBy = stockAlloc?.createdBy ?? null;

                            return {
                                allocationId: allocationId ?? null,
                                serviceTicketId: serviceTicketIdNum,
                                estimateItemId,
                                warehouseId,
                                itemId,
                                estimateId: estimateIdNum,
                                quantity,
                                status: 'COMMITTED',
                                ...(createdBy == null ? {} : { createdBy }),
                            };
                        })
                        .filter(Boolean);

                    if (payload.length > 0) {
                        await updateEstimateStockAllocation(estimateIdNum, payload, token);
                    }
                    return;
                } catch {
                    // Fallback to legacy mapping from estimate items if the allocation snapshot endpoint fails.
                    // Refetch the estimate to ensure we include all existing allocations (old + new).
                    let estimateItemsForAllocation = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
                    try {
                        const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
                        const list = Array.isArray(estimateRes?.data) ? estimateRes.data : [];
                        const found =
                            list.find((row) => Number(row?.estimateId ?? row?.id ?? 0) === Number(estimateIdNum)) ||
                            pickLatestEstimate(list);
                        debugEstimateAllocation('refetched-estimate-before-allocation-fallback', {
                            estimateId: estimateIdNum,
                            serviceTicketId: serviceTicketIdNum,
                            estimate: found ?? null,
                        });
                        if (Array.isArray(found?.items)) {
                            estimateItemsForAllocation = found.items;
                            setLatestEstimate((prev) => {
                                if (!prev) return prev;
                                const next = { ...prev, ...found };
                                next.items = found.items;
                                return next;
                            });
                        }
                    } catch {
                        // keep fallback to latestEstimate.items
                    }
                    const payload = buildStockAllocationUpdatePayload({
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        estimateItems: estimateItemsForAllocation,
                    });
                    if (payload.length > 0) {
                        await updateEstimateStockAllocation(estimateIdNum, payload, token);
                    }
                    return;
                }
            }

            await allocateEstimateStock(estimateIdNum, token);
        } catch (err) {
            await revertEstimateToDraftSilently(token);
            throw err;
        }
    }, [estimateIdNum, latestEstimate?.items, revertEstimateToDraftSilently, serviceTicketIdNum]);

    const executeConfirmEstimate = async (estimatedAt = '') => {
        if (estimateLoading) return;
        if (!estimateIdNum) {
            notify('Chưa có báo giá hợp lệ để xác nhận.');
            return;
        }
        if (isEstimateApproved) {
            notify('Báo giá đã được xác nhận trước đó.');
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để xác nhận báo giá.');
            return;
        }


        const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!ticketCode) {
            notify('Thiếu mã phiếu dịch vụ.');
            return;
        }

        const rawItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        const activeItems = rawItems.filter((it) => !it?.isRemoved);
        const uncheckedActiveItems = activeItems.filter((it) => !getEstimateItemCheckedFlag(it));
        if (activeItems.length === 0) {
            notify('Báo giá không có hạng mục hợp lệ để xác nhận.');
            return;
        }

        try {
            setEstimateLoading(true);

            if (uncheckedActiveItems.length > 0) {
                notify(
                    `Còn ${uncheckedActiveItems.length} hạng mục chưa được tích xác nhận. Vui lòng tích xác nhận hoặc xóa hẳn các dòng đó trước khi xác nhận báo giá.`,
                );
                return;
            }

            if (estimatedAt) {
                const estimatedDeliveryAt = formatEstimatedDeliveryAtForApi(estimatedAt);
                if (!estimatedDeliveryAt) {
                    notify('Thời gian ước tính không hợp lệ.');
                    return;
                }
                await updateServiceTicketEstimatedDelivery(ticketCode, estimatedDeliveryAt, token);
                setEstimatedTimeDraft(estimatedAt);
            }

            await manageServiceTicketStatus(serviceTicketIdNum, 'ESTIMATED', token);
            await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
            setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));

            // Giữ chỗ vật tư:
            // - Báo giá mới / version mới: POST allocateEstimateStock
            // - Thêm dịch vụ (append-only) và xác nhận lại: PUT stock-allocation/update
            const appendSnapshot = addServiceRevertRef.current;
            const snapshotEstimateId = toPositiveNumberOrNull(appendSnapshot?.estimateIdNum);
            const snapshotPrevStatus = normalizeEstimateStatus(appendSnapshot?.prevEstimateStatus);
            const isAppendOnlyConfirm =
                !isCreatingNewEstimateVersion &&
                snapshotEstimateId != null &&
                snapshotEstimateId === estimateIdNum &&
                snapshotPrevStatus === 'APPROVED';
            await ensureStockAllocationAfterConfirm({ token, isAppendOnlyConfirm });

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);

            triggerRefresh();
            notify('Đã xác nhận báo giá.');

            // End "create new estimate version" flow after confirming.
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);

            // End "Thêm dịch vụ" append-only flow after confirming.
            addServiceRevertRef.current = null;
            clearAddServiceRestoreSnapshot(serviceTicketIdNum);
        } catch (err) {
            notify(err?.message || 'Không thể xác nhận báo giá.');
        } finally {
            setEstimateLoading(false);
        }
    };

    const handleSubmitEstimateTime = async ({ estimatedAt }) => {
        setEstimateTimePopupOpen(false);
        await executeConfirmEstimate(estimatedAt);
    };

    const reservedAllocationCount = Number(ticket?.reservedAllocationCount ?? 0);
    const committedAllocationCount = Number(ticket?.committedAllocationCount ?? 0);
    const hasAnyStockAllocation = reservedAllocationCount > 0 || committedAllocationCount > 0;

    const hasAnyWarehouseDependentItem = useMemo(() => {
        const items = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        return items
            .filter((it) => !it?.isRemoved)
            .some((it) => {
                const warehouseId =
                    it?.warehouseId ??
                    it?.warehouseID ??
                    it?.warehouse_id ??
                    it?.warehouse?.warehouseId ??
                    it?.warehouse?.id ??
                    null;
                return toPositiveNumberOrNull(warehouseId) != null;
            });
    }, [latestEstimate?.items]);

    const canCancel =
        ['CREATED', 'INSPECTING', 'PENDING', 'INSPECTED', 'ESTIMATED', 'REPAIRING'].includes(ticketStatus)
        && !hasAnyStockAllocation
        && !isActionLocked;
    const canSetPending = ticketStatus === 'ESTIMATED' && !isActionLocked;
    const canStartRepair = (ticketStatus === 'ESTIMATED' || ticketStatus === 'PENDING')
        && Boolean(estimateIdNum)
        && isEstimateApproved
        && (ticket?.warehouseReadyForRepair === true || !hasAnyWarehouseDependentItem)
        && !isActionLocked;
    const canCompleteRepair = ticketStatus === 'REPAIRING' && !isActionLocked && ticket?.hasDraftStockIssue === false;

    const canRequestStockIssue = useMemo(() => {
        if (isActionLocked) return false;
        if (ticketStatus !== 'ESTIMATED' && ticketStatus !== 'REPAIRING' ) return false;
        return ticket?.canRequestIssueDraft === true;
    }, [isActionLocked, ticketStatus, ticket?.canRequestIssueDraft]);

    const handleRequestStockIssue = useCallback(async () => {
        if (stockIssueRequesting) return;
        if (isActionLocked) {
            notify('Phiếu dịch vụ đã có hóa đơn, không thể yêu cầu xuất kho.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId để yêu cầu xuất kho.');
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để yêu cầu xuất kho.');
            return;
        }

        setStockIssueRequesting(true);
        try {
            const response = await requestWarehouseStockIssue(serviceTicketIdNum, token);
            notify(response?.message || 'Đã tạo yêu cầu xuất kho.');

            const ticketCode = String(ticket?.ticketCode || ticketCodeParam || '').trim();
            if (ticketCode) {
                const detailRes = await fetchServiceTicketDetail(ticketCode, token);
                if (detailRes?.data) setTicketRaw(detailRes.data);
            }
            triggerRefresh();
        } catch (err) {
            notify(err?.message || 'Không thể tạo yêu cầu xuất kho.');
        } finally {
            setStockIssueRequesting(false);
        }
    }, [
        isActionLocked,
        notify,
        serviceTicketIdNum,
        stockIssueRequesting,
        ticket?.ticketCode,
        ticketCodeParam,
        triggerRefresh,
        setTicketRaw,
    ]);

    const advisorItems = useMemo(() => Array.isArray(latestEstimate?.items) ? latestEstimate.items.filter(it => !it?.isRemoved) : [], [latestEstimate]);
    const selectedServiceItems = useMemo(
        () => (Array.isArray(ticket.services) ? ticket.services : []).filter((item) => normalizeTicketItemType(item) === 'SERVICE'),
        [ticket.services],
    );
    const selectedPartItems = useMemo(
        () => (Array.isArray(ticket.services) ? ticket.services : []).filter((item) => normalizeTicketItemType(item) === 'PART'),
        [ticket.services],
    );
    const hasAnyAdvisorItem = advisorItems.length > 0;
    const isEstimatePersisted = Boolean(latestEstimate?.createdAt || latestEstimate?.estimateId || latestEstimate?.id);
    const canPrintServiceReceipt = Boolean(estimateIdNum)
        && estimateStatus === 'DRAFT'
        && hasAnyAdvisorItem
        && isEstimatePersisted
        && !shouldHideEstimateUntilInspectionDone
        && !isEstimateEditing
        && !isActionLocked;
    const canConfirmEstimate = Boolean(estimateIdNum)
        && estimateStatus === 'SENT'
        && (ticketStatus === 'CREATED'
            || ticketStatus === 'INSPECTING'
            || ticketStatus === 'INSPECTED'
            || ticketStatus === 'ESTIMATED'
            || ticketStatus === 'PENDING')
        && hasAnyAdvisorItem
        && isEstimatePersisted
        && !shouldHideEstimateUntilInspectionDone
        && !isEstimateEditing
        && !isActionLocked;
    const handleEstimateStatusChange = useCallback((est) => {
        const nextEstimateId = toPositiveNumberOrNull(est?.estimateId ?? est?.id);
        const nextEstimateStatus = normalizeEstimateStatus(est?.estimateStatus ?? est?.status ?? est?.estimate_status);

        setLatestEstimate((prev) => {
            if (!est) return null;
            const next = prev ? { ...prev, ...est } : { ...est };
            // Some update APIs may return estimate meta without items.
            // Keep previous items temporarily to avoid disabling confirm button,
            // then trigger a refetch to sync the real latest estimate.
            if (!Array.isArray(est?.items) && Array.isArray(prev?.items)) {
                next.items = prev.items;
            }
            return next;
        });

        if (nextEstimateId && nextEstimateStatus === 'DRAFT') {
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
        }

        const hasEstimateId = Boolean(est?.estimateId ?? est?.id);
        const hasItems = Array.isArray(est?.items) && est.items.length > 0;
        if (hasEstimateId && !hasItems) {
            loadLatestEstimate();
        }
    }, [loadLatestEstimate]);

    const handleInspectionCompleted = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!token || !code) return;

        try {
            const detailRes = await fetchServiceTicketDetail(code, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);
            setRefreshTick(prev => prev + 1);
        } catch (err) {
            notify(err?.message || 'Không thể tải lại trạng thái phiếu dịch vụ sau khi hoàn thành kiểm tra.');
        }
    }, [notify, setTicketRaw, ticket.ticketCode, ticketCodeParam]);

    const applyPromotion = async () => {
        if (hasBill) {
            notify('Phiếu dịch vụ đã có hoá đơn. Không thể áp dụng khuyến mãi.');
            return;
        }

        setPromoError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const code = String(promoCode || '').trim();
        const selectedId = String(selectedPromotionId || '').trim();

        if (!code && !selectedId) {
            setAppliedPromotion(null);
            return;
        }

        if (code) {
            try {
                setPromoApplying(true);
                const res = await fetchPromotionByCode(code, token);
                const promo = normalizePromotion(res?.data ?? null);
                const validationMessage = validatePromotion(promo, receiptSubtotal);
                if (validationMessage) {
                    setAppliedPromotion(null);
                    setPromoError(validationMessage);
                    return;
                }
                setAppliedPromotion(promo);
                setSelectedPromotionId('');
            } catch (err) {
                setAppliedPromotion(null);
                setPromoError(err?.message || 'Mã không hợp lệ');
            } finally {
                setPromoApplying(false);
            }
            return;
        }

        const picked = availablePromotions.find((p) => {
            const id = getPromotionId(p);
            return id != null && String(id) === selectedId;
        }) ?? null;
        const validationMessage = validatePromotion(picked, receiptSubtotal);
        if (validationMessage) {
            setAppliedPromotion(null);
            setPromoError(validationMessage);
            return;
        }
        setAppliedPromotion(normalizePromotion(picked));
    };

    const handlePrintServiceReceipt = async () => {
        if (receiptApproving) return;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để in phiếu dịch vụ.');
            return;
        }
        if (!estimateIdNum || estimateStatus !== 'DRAFT') {
            notify('Chỉ có thể in phiếu dịch vụ khi báo giá đang ở trạng thái DRAFT.');
            return;
        }

        try {
            setReceiptApproving(true);
            await manageServiceTicketEstimateStatus(estimateIdNum, 'SENT', token);
            setLatestEstimate((prev) => (prev ? { ...prev, status: 'SENT', estimateStatus: 'SENT' } : prev));
            notify('Đã chuyển báo giá sang trạng thái SENT.');
            globalThis.setTimeout?.(() => {
                globalThis.requestAnimationFrame?.(() => globalThis.window?.print?.());
            }, 120);
        } catch (err) {
            notify(err?.message || 'Không thể in phiếu dịch vụ.');
        } finally {
            setReceiptApproving(false);
        }
    };

    const handleRequestPayment = async () => {
        if (billCreating) return;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để yêu cầu thanh toán.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để tạo hoá đơn.');
            return;
        }
        if (!estimateIdNum) {
            notify('Không tìm thấy báo giá hợp lệ để tạo hoá đơn.');
            return;
        }
        if (hasBill) {
            notify('Phiếu dịch vụ đã có hoá đơn.');
            return;
        }
        if (estimateStatus !== 'APPROVED') {
            notify('Vui lòng xác nhận báo giá trước khi yêu cầu thanh toán.');
            return;
        }

        let archivedBeforeBill = false;
        try {
            setBillCreating(true);
            await manageServiceTicketEstimateStatus(estimateIdNum, 'ARCHIVED', token);
            archivedBeforeBill = true;
            setLatestEstimate((prev) => (prev ? { ...prev, status: 'ARCHIVED', estimateStatus: 'ARCHIVED' } : prev));

            const versionRaw = latestEstimate?.version ?? latestEstimate?.estimateVersion ?? latestEstimate?.estimateNo ?? latestEstimate?.versionNo ?? null;
            const versionParsed =
                typeof versionRaw === 'number'
                    ? versionRaw
                    : Number(/\d+/.exec(String(versionRaw ?? ''))?.[0] ?? '');
            const billVersion = Number.isFinite(versionParsed) && versionParsed > 0 ? versionParsed : 1;
            const promotionId = getPromotionId(appliedPromotion);
            const createPayload = {
                serviceTicketId: serviceTicketIdNum,
                estimateId: estimateIdNum,
                version: billVersion,
                paymentStatus: 'UNPAID',
                subTotal: toMoneyNumber(receiptSubtotal),
                discountAmount: toMoneyNumber(receiptDiscountAmount),
                finalAmount: toMoneyNumber(receiptTotal),
                promotionId: promotionId ?? null,
                discount_amount: toMoneyNumber(receiptDiscountAmount),
                final_amount: toMoneyNumber(receiptTotal),
                totalAmount: toMoneyNumber(receiptTotal),
            };

            const billRes = await createPayment(createPayload, token);
            const createdBillId = normalizeBillId(billRes);
            if (!createdBillId) throw new Error('Tạo bill thất bại (không nhận được billId).');

            try {
                const res = await fetchPaymentByServiceTicketId(serviceTicketIdNum, token);
                setBillPayment(res?.data ?? res ?? billRes ?? null);
            } catch {
                setBillPayment(billRes?.data ?? billRes ?? null);
            }
            notify('Đã tạo yêu cầu thanh toán.');
        } catch (err) {
            if (archivedBeforeBill) {
                try {
                    const lookup = await fetchPaymentByServiceTicketId(serviceTicketIdNum, token);
                    const existingBillId = normalizeBillId(lookup?.data ?? lookup);
                    if (existingBillId) {
                        setBillPayment(lookup?.data ?? lookup ?? null);
                    } else {
                        await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
                        setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));
                    }
                } catch {
                    try {
                        await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
                        setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));
                    } catch {
                        // If rollback also fails, surface the original error below.
                    }
                }
            }
            notify(err?.message || 'Không thể tạo yêu cầu thanh toán.');
        } finally {
            setBillCreating(false);
        }
    };

    const handleSubmitMaintenance = async ({ scheduledAt, note }) => {
        if (maintenanceSubmitting) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để đặt lịch bảo dưỡng.');
            return;
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để đặt lịch bảo dưỡng.');
            return;
        }

        const raw = String(scheduledAt || '').trim();
        const [reminderDateRaw, reminderTimeRaw] = raw.split('T');
        const reminderDate = String(reminderDateRaw || '').trim();
        const reminderTime = String(reminderTimeRaw || '').slice(0, 5);

        const source = ticketRaw ?? ticketFromState ?? ticket ?? {};
        const vehicleId =
            toPositiveNumberOrNull(
                source?.vehicleId ??
                    source?.vehicleID ??
                    source?.vehicle?.vehicleId ??
                    source?.vehicle?.vehicleID ??
                    source?.vehicle?.id,
            ) || null;
        const customerId =
            toPositiveNumberOrNull(
                source?.customerId ??
                    source?.customerID ??
                    source?.customer?.customerId ??
                    source?.customer?.customerID ??
                    source?.customer?.id,
            ) || null;

        if (!vehicleId) {
            notify('Thiếu vehicleId hợp lệ để tạo lịch nhắc.');
            return;
        }
        if (!customerId) {
            notify('Thiếu customerId hợp lệ để tạo lịch nhắc.');
            return;
        }

        try {
            setMaintenanceSubmitting(true);
            await createServiceTicketReminder(
                {
                    serviceTicketId: serviceTicketIdNum,
                    vehicleId,
                    customerId,
                    reminderDate,
                    reminderTime,
                    note,
                },
                token,
            );
            setMaintenanceDraft({ scheduledAt: String(scheduledAt || ''), note: String(note || '') });
            setMaintenancePopupOpen(false);
            notify('Đã tạo lịch nhắc bảo dưỡng.');
        } catch (err) {
            notify(err?.message || 'Không thể tạo lịch nhắc bảo dưỡng.');
        } finally {
            setMaintenanceSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.screenOnly}>
                <div className={styles.layout}>
                    <main className={styles.main}>
                        <header className={styles.header}>
                            <div className={styles.headerLeft}>
                                <div className={styles.titleRow}>
                                    <h1 className={styles.title}>Phiếu dịch vụ #{ticket.ticketCode || ticketCodeParam || '-'}</h1>
                                    <span className={styles.statusPill}>{ticket.statusLabel || '-'}</span>
                                </div>
                            </div>
                            {hasReceptionistEditAccess && ticketStatus === 'CREATED' && !isActionLocked && (
                                <button
                                    type="button"
                                    className={`ui-btn ui-btn--ghost ${styles.editBtn}`}
                                    onClick={toggleEdit}
                                    disabled={isLoading || isSaving}
                                >
                                    {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
                                </button>
                            )}
                        </header>

                        {error && <div className={styles.errorBanner}>{error}</div>}

                        {!hasBill && billLookupError ? (
                            <div className={styles.errorBanner}>{billLookupError}</div>
                        ) : null}

                        <div className={`ui-card ${styles.card}`}>
                            <div className={styles.topInfoGrid}>
                                <div className={styles.topInfoCol}>
                                    <InfoBlock
                                        title="Thông tin khách hàng"
                                        rows={[
                                            { label: 'Họ tên:', value: ticket.customer?.name || '-' },
                                            { label: 'SĐT:', value: ticket.customer?.phone || '-' },
                                            { label: 'Email:', value: ticket.customer?.email || '-' },
                                        ]}
                                    />
                                    <InfoBlock
                                        title="Thông tin xe"
                                        rows={[
                                            { label: 'Biển số xe:', value: ticket.vehicle?.licensePlate || '-' },
                                            { label: 'Số km:', value: odometerDisplay },
                                            { label: 'Model:', value: ticket.vehicle?.model || '-' },
                                        ]}
                                    />
                                </div>
                                <div className={styles.topInfoCol}>
                                    <InfoBlock
                                        title="Thông tin ticket"
                                        rows={[
                                            { label: 'Ngày tiếp nhận:', value: receivedAtDisplay },
                                            { label: 'Người tạo:', value: ticket.createdBy || '-' },
                                        ]}
                                    />
                                    <section className={styles.block}>
                                        <h2 className={styles.blockTitle}>Lịch hẹn</h2>
                                        <div className={styles.kvList}>
                                            <div className={styles.kvRow}>
                                                <span className={styles.kvLabel}>Ngày & Giờ hẹn:</span>
                                                <span className={styles.kvValue}>
                                                    {ticket?.booking?.scheduledDate
                                                        ? `${ticket.booking.scheduledDate} ${formatTimeHHmm(ticket.booking.scheduledTime) || ''}`.trim()
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className={styles.kvRow}>
                                                <span className={styles.kvLabel}>Thời gian ước tính hoàn tất:</span>
                                                <span className={styles.kvValue}>{estimatedTimeDisplay}</span>
                                            </div>
                                            <div className={styles.kvRow}>
                                                <span className={styles.kvLabel}>Ngày bàn giao:</span>
                                                <span className={styles.kvValue}>{handoverAtDisplay}</span>
                                            </div>
                                            <div className={styles.kvRow}>
                                                <span className={styles.kvLabel}>Kiểm tra an toàn:</span>
                                                {ticketRaw?.safetyInspectionEnabled === true ? (
                                                    <span className={`${styles.safetyBadge} ${styles['safetyBadge--yes']}`}>Có</span>
                                                ) : ticketRaw?.safetyInspectionEnabled === false ? (
                                                    <span className={`${styles.safetyBadge} ${styles['safetyBadge--no']}`}>Không</span>
                                                ) : (
                                                    <span className={styles.kvValue}>-</span>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <section className={styles.block}>
                                <h2 className={styles.blockTitle}>Ảnh biển số xe</h2>
                                {licensePlatePhotos.length > 0 ? (
                                    <div className={styles.vehiclePhotoGrid}>
                                        {licensePlatePhotos.map((p, idx) => {
                                            const key = String(p?.photoId ?? `${p?.category || 'photo'}-${idx}`);
                                            const label = String(p?.label || p?.category || '').trim();
                                            const caption = label || (p?.description ? String(p.description) : `Ảnh ${idx + 1}`);
                                            return (
                                                <figure key={key} className={styles.vehiclePhotoCard}>
                                                    <img
                                                        className={styles.vehiclePhotoImg}
                                                        src={p.url}
                                                        alt={caption}
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <figcaption className={styles.vehiclePhotoCaption}>{caption}</figcaption>
                                                </figure>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.noteBox}>{isLoading ? 'Đang tải...' : '-'}</div>
                                )}
                            </section>

                            <section className={styles.block}>
                                <h2 className={styles.blockTitle}>Hạng mục đã chọn</h2>
                                <div className={styles.selectedItemGroups}>
                                    <div>
                                        <h3 className={styles.selectedItemTitle}>Dịch vụ đã chọn</h3>
                                        <div className={styles.servicesList}>
                                            {selectedServiceItems.map((s, idx) => {
                                                const price = s?.priceVnd ?? s?.price;
                                                return (
                                                    <div key={`${s?.id ?? s?.name ?? 'service'}-${idx}`} className={styles.serviceRow}>
                                                        <span className={styles.serviceName}>{getTicketItemName(s) || s?.label || '-'}</span>
                                                        <span className={styles.servicePrice}>{price == null ? '-' : formatCurrencyVnd(price)}</span>
                                                    </div>
                                                );
                                            })}
                                            {selectedServiceItems.length === 0 && <div className={styles.noteBox}>-</div>}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className={styles.selectedItemTitle}>Phụ tùng đã chọn</h3>
                                        <div className={styles.servicesList}>
                                            {selectedPartItems.map((s, idx) => {
                                                const price = s?.priceVnd ?? s?.price;
                                                return (
                                                    <div key={`${s?.id ?? s?.name ?? 'part'}-${idx}`} className={styles.serviceRow}>
                                                        <span className={styles.serviceName}>{getTicketItemName(s) || s?.label || '-'}</span>
                                                        <span className={styles.servicePrice}>{price == null ? '-' : formatCurrencyVnd(price)}</span>
                                                    </div>
                                                );
                                            })}
                                            {selectedPartItems.length === 0 && <div className={styles.noteBox}>-</div>}
                                        </div>
                                    </div>
                                </div>

                                {ticket.externalDependency && (
                                    <div className={styles.tagsRow}>
                                        <span className={styles.tag}>External Dependency</span>
                                    </div>
                                )}
                            </section>

                            <section className={styles.block}>
                                <h2 className={styles.blockTitle}>Yêu cầu khách hàng</h2>
                                {isEditing ? (
                                    <>
                                        <div className="ui-field" style={{ marginBottom: 0 }}>
                                            <label htmlFor="service-ticket-customer-request">Nội dung yêu cầu</label>
                                            <textarea
                                                id="service-ticket-customer-request"
                                                value={editForm.customerRequest}
                                                onChange={(e) => setCustomerRequest(e.target.value)}
                                                maxLength={255}
                                                disabled={isSaving}
                                            />
                                            {fieldErrors?.customerRequest ? (
                                                <div className={styles.fieldError}>{fieldErrors.customerRequest}</div>
                                            ) : null}
										<div className={styles.fieldHint}>
											Còn lại {Math.max(0, 255 - String(editForm.customerRequest || '').length)} ký tự
										</div>
                                        </div>
                                        <div className="ui-actions ui-actions--end">
                                            <button type="button" className="ui-btn ui-btn--ghost" onClick={cancelEdit} disabled={isSaving}>
                                                Hủy
                                            </button>
                                            <button type="button" className="ui-btn ui-btn--primary" onClick={saveEdit} disabled={isSaving}>
                                                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className={styles.noteBox}>{ticket.requestNote || (isLoading ? 'Đang tải...' : '-')}</div>
                                )}
                            </section>

                            {advisorReadOnlyWithoutTechnician ? (
                                <section className={styles.block}>
                                    <h2 className={styles.blockTitle}>Trạng thái xử lý</h2>
                                    <div className={styles.noteBox}>
                                        Phiếu này chưa được phân công kỹ thuật viên. Cố vấn viên hiện chỉ có thể xem thông tin phiếu cho đến khi có phân công kỹ thuật viên.
                                    </div>
                                </section>
                            ) : null}

                            {canViewInspectionAndEstimate && !advisorReadOnlyWithoutTechnician && (
                                <>
                                    <TechnicianServiceTicket
                                        key={`tech-${ticket.ticketCode || ticketCodeParam}-${ticketStatus}-${estimateStatus}`}
                                        ticketCode={ticket.ticketCode || ticketCodeParam}
                                        embedded
                                        mode="advisor"
                                        onInspectionCompleted={handleInspectionCompleted}
                                        readOnly={isInspectionAndEstimateReadOnly}
                                        readOnlyMessage={inspectionAndEstimateReadOnlyMessage}
                                        hideReadOnlyNotice={false}
                                    />

                                    {shouldHideEstimateUntilInspectionDone ? (
                                        <section className={styles.block}>
                                            <h2 className={styles.blockTitle}>Báo giá</h2>
                                            <div className={styles.noteBox}>
                                                {isSafetyInspectionEnabled
                                                    ? 'Phiếu này có kiểm tra an toàn. Vui lòng hoàn thành kiểm tra an toàn trước khi hiển thị phần báo giá.'
                                                    : 'Phiếu này không kiểm tra an toàn. Vui lòng bấm Hoàn thành phiếu kiểm tra trước khi hiển thị phần báo giá.'}
                                            </div>
                                        </section>
                                    ) : (
                                        <AdvisorItemsTable
                                            key={`advisor-${ticket?.serviceTicketId}`}
                                            serviceTicketId={ticket?.serviceTicketId}
                                            ticketStatus={ticketStatus}
                                            ticketPhotos={ticketPhotos}
                                            refreshToken={refreshTick}
                                            estimatedTimeDisplay={estimatedTimeDisplay}
                                            onEstimateStatusChange={handleEstimateStatusChange}
                                            onRestartWorkflow={handleRestartFromArchived}
                                            onCancelCreateNewVersion={handleCancelCreateNewEstimateVersion}
                                            onCancelAppendOnly={handleCancelAppendOnly}
                                            onEstimateEditingChange={setIsEstimateEditing}
                                            readOnly={isInspectionAndEstimateReadOnly}
                                            readOnlyMessage={inspectionAndEstimateReadOnlyMessage}
                                            hideReadOnlyNotice={false}
                                            disableFullEdit={isAddServicePending}
                                        />
                                    )}
                                    {latestEstimate && !isActionLocked ? (
                                        <section className={styles.block}>
                                            <h2 className={styles.blockTitle}>Mã giảm giá</h2>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 320px) auto', gap: 12, alignItems: 'end' }}>
                                                <div className="ui-field" style={{ marginBottom: 0 }}>
                                                    <label htmlFor="service-ticket-promo-code">Nhập mã</label>
                                                    <input
                                                        id="service-ticket-promo-code"
                                                        value={promoCode}
                                                        onChange={(e) => {
                                                            setPromoCode(e.target.value);
                                                            if (selectedPromotionId) setSelectedPromotionId('');
                                                        }}
                                                        placeholder="Mã khuyến mãi"
                                                        disabled={billCreating || promoApplying}
                                                    />
                                                </div>
                                                <div className="ui-field" style={{ marginBottom: 0 }}>
                                                    <label htmlFor="service-ticket-promo-list">Hoặc chọn khuyến mãi</label>
                                                    <select
                                                        id="service-ticket-promo-list"
                                                        value={selectedPromotionId}
                                                        onChange={(e) => {
                                                            setSelectedPromotionId(e.target.value);
                                                            if (promoCode) setPromoCode('');
                                                        }}
                                                        disabled={billCreating || promoApplying || promotionsLoading}
                                                    >
                                                        <option value="">{promotionsLoading ? 'Đang tải...' : '-'}</option>
                                                        {availablePromotions.map((p) => {
                                                            const id = getPromotionId(p);
                                                            if (!id) return null;
                                                            return (
                                                                <option key={String(id)} value={String(id)}>
                                                                    {buildPromotionLabel(p) || String(id)}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="ui-btn ui-btn--primary"
                                                    onClick={applyPromotion}
                                                    disabled={billCreating || promoApplying}
                                                >
                                                    {promoApplying ? 'Đang áp dụng...' : 'Áp dụng'}
                                                </button>
                                            </div>
                                            {buildPromotionLabel(appliedPromotion) ? (
                                                <div className={styles.noteBox} style={{ marginTop: 12 }}>
                                                    Đã áp dụng: {buildPromotionLabel(appliedPromotion)}
                                                </div>
                                            ) : null}
                                            <div className={styles.kvList} style={{ marginTop: 12 }}>
                                                <div className={styles.kvRow}>
                                                    <span className={styles.kvLabel}>Giá gốc:</span>
                                                    <span className={styles.kvValue}>{formatCurrencyVndCompact(receiptSubtotal) || '-'}</span>
                                                </div>
                                                <div className={styles.kvRow}>
                                                    <span className={styles.kvLabel}>Giảm giá:</span>
                                                    <span className={styles.kvValue}>{receiptDiscountAmount ? `- ${formatCurrencyVndCompact(receiptDiscountAmount)}` : '-'}</span>
                                                </div>
                                                <div className={styles.kvRow}>
                                                    <span className={styles.kvLabel}>Tổng:</span>
                                                    <span className={styles.kvValue} style={{ fontWeight: 800 }}>{formatCurrencyVndCompact(receiptTotal) || '-'}</span>
                                                </div>
                                            </div>
                                            {promotionsError ? <div className={styles.errorBanner} style={{ marginTop: 12 }}>{promotionsError}</div> : null}
                                            {promoError ? <div className={styles.errorBanner} style={{ marginTop: 12 }}>{promoError}</div> : null}
                                        </section>
                                    ) : null}
                                    {ticket.hasDraftStockIssue ? (
                                    <div className={styles.stockWaitBanner}>Hiện có phụ tùng đang đợi xuất kho</div>
                                    ) : null}
                                </>
                            )}

                            {isTicketCancelled ? null : (
                                <div className={`ui-actions ${styles.actions}`}>
                                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
                                        Quay lại
                                    </button>
                                    <div className={styles.actionsRight}>
                                        {advisorReadOnlyWithoutTechnician || isInspectionAndEstimateReadOnly ? null : isCreatingNewEstimateVersion && canPrintServiceReceipt ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--ghost"
                                                onClick={handlePrintServiceReceipt}
                                                disabled={receiptApproving || statusUpdating}
                                            >
                                                {receiptApproving ? 'Đang in...' : 'In phiếu dịch vụ'}
                                            </button>
                                        ) : isCreatingNewEstimateVersion && canConfirmEstimate ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--primary"
                                                onClick={handleOpenEstimateTimePopup}
                                                disabled={receiptApproving || statusUpdating || estimateLoading}
                                            >
                                                {estimateLoading ? 'Đang xác nhận...' : 'Xác nhận báo giá'}
                                            </button>
                                        ) : null}

                                        {advisorReadOnlyWithoutTechnician || isInspectionAndEstimateReadOnly || isCreatingNewEstimateVersion ? null : (
                                            <>
                                                {canCancel && (
                                                    <button
                                                        type="button"
                                                        className={`ui-btn ui-btn--danger ${styles.dangerBtn}`}
                                                        onClick={handleCancelTicket}
                                                        disabled={statusUpdating}
                                                    >
                                                        Hủy phiếu dịch vụ
                                                    </button>
                                                )}
                                                {canSetPending && (
                                                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleSetPending} disabled={receiptApproving || statusUpdating}>
                                                        Chờ xử lý
                                                    </button>
                                                )}
                                                {canPrintServiceReceipt && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handlePrintServiceReceipt}
                                                        disabled={receiptApproving || statusUpdating}
                                                    >
                                                        {receiptApproving ? 'Đang in...' : 'In phiếu dịch vụ'}
                                                    </button>
                                                )}
                                                {canConfirmEstimate && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--primary"
                                                        onClick={handleOpenEstimateTimePopup}
                                                        disabled={receiptApproving || statusUpdating || estimateLoading}
                                                    >
                                                        {estimateLoading ? 'Đang xác nhận...' : 'Xác nhận báo giá'}
                                                    </button>
                                                )}
                                                {canRequestStockIssue && !canConfirmEstimate && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handleRequestStockIssue}
                                                        disabled={receiptApproving || statusUpdating || stockIssueRequesting}
                                                    >
                                                        {stockIssueRequesting ? 'Đang tạo yêu cầu...' : 'Yêu cầu xuất kho'}
                                                    </button>
                                                )}
                                                {canStartRepair && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleStartRepair} disabled={receiptApproving || statusUpdating}>
                                                        Tiến hành sửa chữa
                                                    </button>
                                                )}
                                                {canCompleteRepair && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleCompleteRepair} disabled={receiptApproving || statusUpdating}>
                                                        Hoàn tất sửa chữa
                                                    </button>
                                                )}
                                                {canBookMaintenance && (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handleOpenMaintenancePopup}
                                                        disabled={statusUpdating || receiptApproving}
                                                    >
                                                        Đặt lịch bảo dưỡng
                                                    </button>
                                                )}
                                                {canRequestPayment && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleRequestPayment} disabled={billCreating}>
                                                        {billCreating ? 'Đang tạo yêu cầu...' : 'Yêu cầu thanh toán'}
                                                    </button>
                                                )}
                                                {!assignmentsLoading && !hasTechnician && ticketStatus === 'COMPLETED' && !isActionLocked && (
                                                    <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                                                        Cần phân công KTV trước khi tạo hóa đơn.
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    {maintenancePopupOpen ? (
                        <MaintenanceBookingPopup
                            open
                            initialDateTime={maintenanceDraft.scheduledAt}
                            initialNote={maintenanceDraft.note}
                            durationMinutes={60}
                            submitting={maintenanceSubmitting}
                            onClose={() => setMaintenancePopupOpen(false)}
                            onSubmit={handleSubmitMaintenance}
                        />
                    ) : null}
                    {estimateTimePopupOpen ? (
                        <EstimateTimePopup
                            open
                            initialDateTime={estimatedTimeValue}
                            onClose={() => setEstimateTimePopupOpen(false)}
                            onSubmit={handleSubmitEstimateTime}
                        />
                    ) : null}
                    </main>
                </div>
            </div>
            <div className={styles.printOnly}>
                <Receipt ticket={printTicket} />
            </div>
        </div>
    );
}

ServiceTicketDetail.propTypes = {
    ticketCodeOverride: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

InfoBlock.propTypes = {
    title: PropTypes.string.isRequired,
    rows: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.node,
        }),
    ).isRequired,
};

TimelineBlock.propTypes = {
    steps: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            at: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
            state: PropTypes.oneOf(['done', 'active', 'todo']),
        }),
    ),
};

RoleBasedSections.propTypes = {
    showTimeline: PropTypes.bool.isRequired,
    timelineSteps: PropTypes.array,
    showAdvisorTable: PropTypes.bool.isRequired,
    serviceTicketId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ticketCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onEstimateStatusChange: PropTypes.func,
};
