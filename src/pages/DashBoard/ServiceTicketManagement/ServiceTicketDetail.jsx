import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { toast } from 'react-toastify';
import AdvisorItemsTable from './AdvisorItemsTable.jsx';
import EstimateTimePopup from './EstimateTimePopup.jsx';
import MaintenanceBookingPopup from './MaintenanceBookingPopup.jsx';
import {
    STAFF_ROLE,
    PROMOTION_TYPES,
    readStaffRolesFromStorage,
    formatCurrencyVnd,
    toMoneyNumber,
    pickDiscountAmountValue,
    getEstimateItemGiftFlag,
    formatEstimatedDeliveryAtForApi,
    getFinishWorkErrorMessage,
    toPositiveNumberOrNull,
    getTicketItemName,
    normalizeTicketItemType,
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
    normalizeTicket,
    mapEstimateItemsForReceipt,
    normalizeBillId,
    useServiceTicketDetailData,
    useServiceTicketEditing,
} from './serviceTicketDetailHandlers.js';
import {
    allocateEstimateStock,
    applyPromotionToEstimate,
    createServiceTicketReminder,
    updateEstimateStockAllocation,
    fetchEstimateStockAllocations,
    fetchServiceTicketDetail,
    fetchServiceTicketEstimate,
    manageServiceTicketEstimateStatus,
    manageServiceTicketStatus,
    fetchTicketAssignments,
    updateServiceTicketEstimatedDelivery,
    unapplyPromotionFromEstimate,
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

function isReturnedEstimatePrintItem(item) {
    return String(
        item?.stockAllocation?.status ??
            item?.allocation?.status ??
            item?.warehouseAllocation?.status ??
            item?.stockAllocationStatus ??
            item?.stock_allocation_status ??
            item?.allocationStatus ??
            '',
    ).trim().toUpperCase() === 'RELEASED';
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

function getEstimateIdValue(estimate) {
    return toPositiveNumberOrNull(
        estimate?.estimateId ??
        estimate?.estimateID ??
        estimate?.id ??
        estimate?.serviceTicketEstimateId ??
        estimate?.serviceTicketEstimateID ??
        estimate?.service_ticket_estimate_id,
    );
}

function getEstimateItemWarehouseId(item) {
    return toPositiveNumberOrNull(
        item?.warehouseId ??
        item?.warehouseID ??
        item?.warehouse_id ??
        item?.warehouse?.warehouseId ??
        item?.warehouse?.id,
    );
}

function getEstimateItemStockStatus(item) {
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

function isEstimateItemCheckedForActions(item) {
    const raw = item?.isChecked ?? item?.checked;
    return !(raw === false || String(raw ?? '').trim().toLowerCase() === 'false');
}

function isEstimateItemAvailableForActions(item) {
    return getEstimateItemStockStatus(item) !== 'RELEASED' && isEstimateItemCheckedForActions(item);
}

export default function ServiceTicketDetail({ ticketCodeOverride }) {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
    const hasAdvisorRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.ADVISOR);
    const hasReceptionistRole = staffRoles.includes(STAFF_ROLE.RECEPTIONIST);
    const hasAccountantRole = staffRoles.includes(STAFF_ROLE.ACCOUNTANT);
    const hasWarehouseKeeperRole = staffRoles.includes(STAFF_ROLE.WAREHOUSE_KEEPER);
    const isAdvisorOnlyViewRole = hasAdvisorRole;
    const hasReceptionistEditAccess = hasReceptionistRole;
    const canViewInspectionAndEstimate = true;

    const [receiptApproving, setReceiptApproving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [latestEstimate, setLatestEstimate] = useState(null);
    const estimateLoadSeqRef = useRef(0);
    const createVersionSyncRef = useRef('');
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
    const [, setPageRenderTick] = useState(0);
    const renderPageSoon = useCallback(() => {
        const render = () => setPageRenderTick((prev) => prev + 1);
        if (typeof globalThis.requestAnimationFrame === 'function') {
            globalThis.requestAnimationFrame(render);
        } else {
            render();
        }
    }, []);
    const handlePageButtonClickCapture = useCallback((event) => {
        const button = typeof event?.target?.closest === 'function'
            ? event.target.closest('button')
            : null;
        if (!button || button.disabled) return;
        renderPageSoon();
    }, [renderPageSoon]);

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

    const customerIdNum = useMemo(() => {
        const source = ticketRaw ?? ticketFromState ?? ticket ?? {};
        return toPositiveNumberOrNull(
            source?.customerId ??
                source?.customerID ??
                source?.customer?.customerId ??
                source?.customer?.customerID ??
                source?.customer?.id,
        );
    }, [ticket, ticketFromState, ticketRaw]);

    // Route param changes often reuse the same component instance.
    // Ensure transient workflow refs don't leak across tickets.
    useEffect(() => {
        addServiceRevertRef.current = null;
        createNewEstimateRevertRef.current = null;
        createVersionSyncRef.current = '';
        setIsCreatingNewEstimateVersion(false);
    }, [serviceTicketIdNum]);

    const [billPayment, setBillPayment] = useState(null);
    const [billLookupError, setBillLookupError] = useState('');
    const [billCreating, setBillCreating] = useState(false);

    const [availablePromotions, setAvailablePromotions] = useState({
        PERCENT: [],
        BUY_X_GET_Y: [],
    });
    const [promotionsLoading, setPromotionsLoading] = useState(false);
    const [promotionsError, setPromotionsError] = useState('');
    const [promoCodes, setPromoCodes] = useState({
        PERCENT: '',
        BUY_X_GET_Y: '',
    });
    const [selectedPromotions, setSelectedPromotions] = useState({
        PERCENT: '',
        BUY_X_GET_Y: '',
    });
    const [appliedPromotions, setAppliedPromotions] = useState({
        PERCENT: null,
        BUY_X_GET_Y: null,
    });
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
                const entries = await Promise.all(PROMOTION_TYPES.map(async ({ type }) => {
                    const res = await fetchAvailablePromotions(token, type, customerIdNum);
                    return [type, Array.isArray(res?.data) ? res.data : []];
                }));
                if (cancelled) return;
                setAvailablePromotions(Object.fromEntries(entries));
            } catch (err) {
                if (cancelled) return;
                setAvailablePromotions({ PERCENT: [], BUY_X_GET_Y: [] });
                setPromotionsError(err?.message || 'Không thể tải danh sách khuyến mãi.');
            } finally {
                if (!cancelled) setPromotionsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [customerIdNum]);

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
        return getEstimateIdValue(latestEstimate);
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

    const isEstimateDraft = estimateStatus === 'DRAFT';
    const isEstimateSent = estimateStatus === 'SENT';
    const isEstimateApproved = estimateStatus === 'APPROVED';
    const billId = useMemo(() => normalizeBillId(billPayment), [billPayment]);
    const hasBill = Boolean(billId);
    const isActionLocked = ticketStatus === 'PAID' || hasBill;
    const isEstimateVersionRevision = useMemo(() => {
        if (isCreatingNewEstimateVersion) return true;
        const versionRaw =
            latestEstimate?.version ??
            latestEstimate?.estimateVersion ??
            latestEstimate?.estimateNo ??
            latestEstimate?.versionNo ??
            null;
        const hasVersionValue = versionRaw != null && String(versionRaw).trim() !== '';
        const versionNumber =
            typeof versionRaw === 'number'
                ? versionRaw
                : Number(/\d+/.exec(String(versionRaw ?? ''))?.[0] ?? '');
        if (Number.isFinite(versionNumber) && versionNumber > 1) return true;
        if (hasVersionValue) return false;
        const items = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        return items.some((it) => toPositiveNumberOrNull(it?.revisedFromItemId) != null);
    }, [isCreatingNewEstimateVersion, latestEstimate]);
    const isNewEstimateVersionPromotionLimited = isEstimateVersionRevision && (isEstimateDraft || isEstimateSent);
    const canApplyPromotionToCurrentEstimate = Boolean(latestEstimate)
        && (isEstimateDraft || (isNewEstimateVersionPromotionLimited && isEstimateSent))
        && ticketStatus !== 'PAID'
        && !shouldHideEstimateUntilInspectionDone;

    const receiptItems = useMemo(() => mapEstimateItemsForReceipt(latestEstimate), [latestEstimate]);
    const receiptSubtotal = useMemo(
        () => receiptItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotalDisplay ?? it.subTotal), 0),
        [receiptItems],
    );
    const receiptDiscountAmount = useMemo(() => {
        return receiptItems.reduce((acc, it) => {
            const lineSubtotal = toMoneyNumber(it.subTotalDisplay ?? it.subTotal);
            const lineFinal = toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal);
            const backendDiscount = toMoneyNumber(it.discountAmount);
            return acc + Math.max(backendDiscount, lineSubtotal - lineFinal, 0);
        }, 0);
    }, [receiptItems]);
    const receiptTotal = useMemo(
        () => receiptItems.reduce((acc, it) => acc + toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal), 0),
        [receiptItems],
    );
    const printReceiptItems = useMemo(
        () => receiptItems.filter((it) => !isReturnedEstimatePrintItem(it)),
        [receiptItems],
    );
    const printReceiptSubtotal = useMemo(
        () => printReceiptItems.reduce((acc, it) => acc + toMoneyNumber(it.subTotalDisplay ?? it.subTotal), 0),
        [printReceiptItems],
    );
    const printReceiptDiscountAmount = useMemo(() => {
        return printReceiptItems.reduce((acc, it) => {
            const lineSubtotal = toMoneyNumber(it.subTotalDisplay ?? it.subTotal);
            const lineFinal = toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal);
            const backendDiscount = toMoneyNumber(it.discountAmount);
            return acc + Math.max(backendDiscount, lineSubtotal - lineFinal, 0);
        }, 0);
    }, [printReceiptItems]);
    const printReceiptTotal = useMemo(
        () => printReceiptItems.reduce((acc, it) => acc + toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal), 0),
        [printReceiptItems],
    );
    const appliedPromotionList = useMemo(
        () => PROMOTION_TYPES.map(({ type }) => appliedPromotions[type]).filter(Boolean),
        [appliedPromotions],
    );
    const appliedPromotionLabel = useMemo(
        () => appliedPromotionList.map(buildPromotionLabel).filter(Boolean).join(' / '),
        [appliedPromotionList],
    );
    const estimatePromotionLabels = useMemo(
        () => buildEstimatePromotionLabels(latestEstimate, availablePromotions),
        [availablePromotions, latestEstimate],
    );
    const activePromotionLabels = useMemo(() => {
        const labels = [];
        const seen = new Set();
        const add = (label) => {
            const text = String(label || '').trim();
            if (!text || seen.has(text)) return;
            seen.add(text);
            labels.push(text);
        };
        add(appliedPromotionLabel);
        estimatePromotionLabels.forEach(add);
        return labels;
    }, [appliedPromotionLabel, estimatePromotionLabels]);
    const activePromotionRows = useMemo(() => {
        const rows = [];
        const seen = new Set();
        const byId = buildPromotionLookupById(availablePromotions);
        const byCode = buildPromotionLookupByCode(availablePromotions);
        const addPromo = (promo, typeHint = '') => {
            if (!promo) return;
            const id = getPromotionId(promo);
            const code = getPromotionCode(promo);
            const lookupPromo = (id ? byId.get(id) : null) || (code ? byCode.get(code) : null) || promo;
            const resolvedId = getPromotionId(lookupPromo) || id;
            const resolvedCode = getPromotionCode(lookupPromo) || code;
            const key = resolvedId ? `id:${resolvedId}` : resolvedCode ? `code:${resolvedCode}` : '';
            if (!key || seen.has(key)) return;
            seen.add(key);
            rows.push({
                promotionId: resolvedId,
                promotionCode: resolvedCode,
                promotionType: getPromotionType(lookupPromo) || typeHint,
                label: buildPromotionDisplayLabel(lookupPromo) || buildPromotionLabel(lookupPromo) || resolvedCode || buildPromotionIdFallbackLabel(resolvedId),
            });
        };

        Object.entries(appliedPromotions || {}).forEach(([type, promo]) => addPromo(promo, type));
        const estimatePromotions = Array.isArray(latestEstimate?.promotions) ? latestEstimate.promotions : [];
        estimatePromotions.forEach((promo) => addPromo(promo));
        addPromo(latestEstimate?.promotion);
        addPromo(latestEstimate?.appliedPromotion);
        addPromo(latestEstimate?.promotionCode);
        addPromo(latestEstimate?.promoCode);
        return rows.filter((row) => row.label);
    }, [appliedPromotions, availablePromotions, latestEstimate]);
    const canUnapplyPromotionFromCurrentEstimate = Boolean(latestEstimate)
        && (isEstimateDraft || (isNewEstimateVersionPromotionLimited && isEstimateSent))
        && !isActionLocked;
    const visiblePromotionTypes = useMemo(() => {
        if (isNewEstimateVersionPromotionLimited) {
            return PROMOTION_TYPES.filter(({ type }) => type === 'PERCENT');
        }
        return PROMOTION_TYPES;
    }, [isNewEstimateVersionPromotionLimited]);
    const printTicket = useMemo(() => ({
        ...ticket,
        receivedAtDisplay,
        handoverAtDisplay,
        recommendation: printRecommendation,
        safetyInspectionEnabled: ticketRaw?.safetyInspectionEnabled,
        invoice: {
            items: printReceiptItems.map((it) => ({
                ...it,
                unitPrice: toMoneyNumber(it.unitPriceDisplay ?? it.unitPrice),
                subTotal: toMoneyNumber(it.finalPriceDisplay ?? it.subTotalDisplay ?? it.subTotal),
            })),
            subtotal: printReceiptSubtotal,
            discountAmount: printReceiptDiscountAmount,
            vatRate: '',
            vatAmount: 0,
            total: printReceiptTotal,
            promotionLabel: activePromotionLabels.join(' / '),
        },
        safetyInspection: safetyInspectionForPrint ?? ticketRaw?.safetyInspection ?? {},
        defaultCategories: defaultSafetyCategories,
    }), [
        activePromotionLabels,
        defaultSafetyCategories,
        handoverAtDisplay,
        printRecommendation,
        printReceiptItems,
        printReceiptDiscountAmount,
        printReceiptSubtotal,
        printReceiptTotal,
        receivedAtDisplay,
        safetyInspectionForPrint,
        ticket,
        ticketRaw?.safetyInspection,
        ticketRaw?.safetyInspectionEnabled,
    ]);

    useEffect(() => {
        if (!hasBill) return;
        if (appliedPromotionList.length > 0) setAppliedPromotions({ PERCENT: null, BUY_X_GET_Y: null });
        if (promoCodes.PERCENT || promoCodes.BUY_X_GET_Y) {
            setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
        }
        if (selectedPromotions.PERCENT || selectedPromotions.BUY_X_GET_Y) {
            setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
        }
    }, [
        hasBill,
        appliedPromotionList.length,
        promoCodes.BUY_X_GET_Y,
        promoCodes.PERCENT,
        selectedPromotions.BUY_X_GET_Y,
        selectedPromotions.PERCENT,
    ]);

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

            const latestEstimateId = getEstimateIdValue(latest);
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

            const hasNoSavedItemChange = hasSameStringSet(getActiveEstimateItemKeys(latest), snapshot.activeItemKeys);
            if (!hasNoSavedItemChange) {
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

    const refreshDetailView = useCallback(async (options = {}) => {
        const {
            refreshEstimate = true,
            refreshBill = false,
            refreshAdvisor = refreshEstimate,
        } = options;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const ticketCode = String(ticket?.ticketCode || ticketCodeParam || '').trim();
        const tasks = [];

        if (token && ticketCode) {
            tasks.push(
                fetchServiceTicketDetail(ticketCode, token)
                    .then((detailRes) => {
                        if (detailRes?.data) setTicketRaw(detailRes.data);
                    })
                    .catch(() => null),
            );
        }

        if (refreshEstimate) {
            tasks.push(loadLatestEstimate());
        }

        if (refreshBill && token && serviceTicketIdNum) {
            tasks.push(
                fetchPaymentByServiceTicketId(serviceTicketIdNum, token)
                    .then((res) => {
                        setBillPayment(res?.data ?? res ?? null);
                        setBillLookupError('');
                    })
                    .catch((err) => {
                        const message = String(err?.message || '').toLowerCase();
                        const isNotFound = message.includes('not found')
                            || message.includes('404')
                            || message.includes('không tìm thấy')
                            || message.includes('khong tim thay');
                        if (isNotFound) {
                            setBillPayment(null);
                            setBillLookupError('');
                        }
                    }),
            );
        }

        if (tasks.length > 0) {
            await Promise.allSettled(tasks);
        }
        if (refreshAdvisor) triggerRefresh();
        renderPageSoon();
    }, [loadLatestEstimate, renderPageSoon, serviceTicketIdNum, setTicketRaw, ticket?.ticketCode, ticketCodeParam, triggerRefresh]);

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

    const handleGoToWarehouseIssues = useCallback(() => {
        navigate('/warehouse-stock-issues', {
            state: {
                serviceTicketId: serviceTicketIdNum,
                ticketCode: ticket?.ticketCode || ticketCodeParam,
            },
        });
    }, [navigate, serviceTicketIdNum, ticket?.ticketCode, ticketCodeParam]);

    const handleGoToReceiptPayment = useCallback(() => {
        const code = String(ticket?.ticketCode || ticketCodeParam || '').trim();
        if (!code) {
            notify('Thiếu mã phiếu dịch vụ để mở màn hình thanh toán.');
            return;
        }
        navigate(`/service-ticket/${encodeURIComponent(code)}/receipt-payment-method`, {
            state: { ticket: ticketRaw ?? ticket, serviceTicketId: serviceTicketIdNum },
        });
    }, [navigate, notify, serviceTicketIdNum, ticket, ticketCodeParam, ticketRaw]);

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

            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
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
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
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
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
        }
    }, [addServiceReverting, notify, refreshDetailView, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw]);

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

            await refreshDetailView({ refreshEstimate: false, refreshBill: true, refreshAdvisor: false });
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
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
            notify('Đã hoàn tác trạng thái phiếu dịch vụ trước khi tạo báo giá mới.');
        } catch (err) {
            notify(err?.message || 'Không thể hoàn tác trạng thái phiếu dịch vụ.');
        } finally {
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
            setStatusUpdating(false);
        }
    }, [notify, refreshDetailView, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw]);

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

    const ensureStockAllocationAfterConfirm = useCallback(async ({ token, shouldUpdateExistingAllocations }) => {
        if (!estimateIdNum) return;

        try {
            if (shouldUpdateExistingAllocations) {
                // Backend expects the full snapshot of allocations; missing rows can be treated as deleted.
                // New API: GET stock-allocation-get returns rows in shape { estimateItemDto, stockAllocationDto }.
                // We must send all warehouse-related items back; items without allocation send allocationId: null.
                try {
                    let currentEstimateItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
                    try {
                        const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
                        const list = Array.isArray(estimateRes?.data) ? estimateRes.data : [];
                        const found =
                            list.find((row) => getEstimateIdValue(row) === Number(estimateIdNum)) ||
                            pickLatestEstimate(list);
                        if (Array.isArray(found?.items)) {
                            currentEstimateItems = found.items;
                            setLatestEstimate((prev) => {
                                if (!prev) return found;
                                return { ...prev, ...found, items: found.items };
                            });
                        }
                    } catch {
                        // keep current estimate items from state
                    }

                    const allocationRes = await fetchEstimateStockAllocations(estimateIdNum, token);
                    const rows = Array.isArray(allocationRes?.data) ? allocationRes.data : [];
                    debugEstimateAllocation('stock-allocation-snapshot', {
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        rows,
                    });

                    const fallbackByEstimateItemId = new Map(
                        currentEstimateItems
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
                    const payloadEstimateItemIds = new Set(payload.map((item) => Number(item.estimateItemId)).filter(Boolean));
                    const missingWarehouseItemsPayload = buildStockAllocationUpdatePayload({
                        estimateId: estimateIdNum,
                        serviceTicketId: serviceTicketIdNum,
                        estimateItems: currentEstimateItems,
                    }).filter((item) => !payloadEstimateItemIds.has(Number(item.estimateItemId)));
                    const fullPayload = [...payload, ...missingWarehouseItemsPayload];

                    if (fullPayload.length > 0) {
                        await updateEstimateStockAllocation(estimateIdNum, fullPayload, token);
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
                            list.find((row) => getEstimateIdValue(row) === Number(estimateIdNum)) ||
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
        if (activeItems.length === 0) {
            notify('Báo giá không có hạng mục hợp lệ để xác nhận.');
            return;
        }

        try {
            setEstimateLoading(true);

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
            const estimateVersionRaw =
                latestEstimate?.version ??
                latestEstimate?.estimateVersion ??
                latestEstimate?.estimateNo ??
                latestEstimate?.versionNo ??
                null;
            const estimateVersionNumber =
                typeof estimateVersionRaw === 'number'
                    ? estimateVersionRaw
                    : Number(/\d+/.exec(String(estimateVersionRaw ?? ''))?.[0] ?? '');
            const isRevisionEstimateConfirm =
                (Number.isFinite(estimateVersionNumber) && estimateVersionNumber > 1) ||
                activeItems.some((it) => toPositiveNumberOrNull(it?.revisedFromItemId) != null);
            await ensureStockAllocationAfterConfirm({
                token,
                shouldUpdateExistingAllocations: isAppendOnlyConfirm || isRevisionEstimateConfirm,
            });

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);

            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
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

    const advisorItems = useMemo(() => Array.isArray(latestEstimate?.items) ? latestEstimate.items.filter(it => !it?.isRemoved) : [], [latestEstimate]);
    const actionableAdvisorItems = useMemo(
        () => advisorItems.filter(isEstimateItemAvailableForActions),
        [advisorItems],
    );
    const hasAnyActionableAdvisorItem = actionableAdvisorItems.length > 0;
    const hasAnyWarehouseDependentItem = useMemo(
        () => actionableAdvisorItems.some((it) => getEstimateItemWarehouseId(it) != null),
        [actionableAdvisorItems],
    );

    const canCancel =
        ['CREATED', 'INSPECTING', 'PENDING', 'INSPECTED', 'ESTIMATED', 'REPAIRING'].includes(ticketStatus)
        && !hasAnyStockAllocation
        && !isActionLocked;
    const canStartRepair = (ticketStatus === 'ESTIMATED' || ticketStatus === 'PENDING')
        && Boolean(estimateIdNum)
        && isEstimateApproved
        && hasAnyActionableAdvisorItem
        && (ticket?.warehouseReadyForRepair === true || !hasAnyWarehouseDependentItem)
        && !isActionLocked;
    const canCompleteRepair = ticketStatus === 'REPAIRING' && !isActionLocked && ticket?.hasDraftStockIssue === false;
    const canOpenReceiptPayment = hasAccountantRole && hasBill;

    const hasAnyRequestableWarehouseDependentItem = useMemo(
        () => actionableAdvisorItems.some((it) => getEstimateItemWarehouseId(it) != null),
        [actionableAdvisorItems],
    );
    const canOpenWarehouseIssues =
        hasWarehouseKeeperRole &&
        ticket?.hasDraftStockIssue === true &&
        hasAnyRequestableWarehouseDependentItem;

    const canRequestStockIssue = useMemo(() => {
        if (isActionLocked) return false;
        if (ticketStatus !== 'ESTIMATED' && ticketStatus !== 'REPAIRING' ) return false;
        if (!hasAnyRequestableWarehouseDependentItem) return false;
        return ticket?.canRequestIssueDraft === true;
    }, [hasAnyRequestableWarehouseDependentItem, isActionLocked, ticketStatus, ticket?.canRequestIssueDraft]);

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
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
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
        setTicketRaw,
        refreshDetailView,
    ]);

    const selectedServiceItems = useMemo(
        () => (Array.isArray(ticket.services) ? ticket.services : []).filter((item) => normalizeTicketItemType(item) === 'SERVICE'),
        [ticket.services],
    );
    const selectedPartItems = useMemo(
        () => (Array.isArray(ticket.services) ? ticket.services : []).filter((item) => normalizeTicketItemType(item) === 'PART'),
        [ticket.services],
    );
    const hasAnyAdvisorItem = actionableAdvisorItems.length > 0;
    const isEstimatePersisted = Boolean(
        estimateIdNum ||
        latestEstimate?.createdAt ||
        latestEstimate?.createdDate ||
        latestEstimate?.created_at,
    );
    const canPrintServiceReceipt = Boolean(estimateIdNum)
        && (estimateStatus === 'DRAFT' || estimateStatus === 'SENT')
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
        const nextEstimateId = getEstimateIdValue(est);
        const nextEstimateStatus = normalizeEstimateStatus(est?.estimateStatus ?? est?.status ?? est?.estimate_status);
        const optimisticEstimateStatus =
            nextEstimateStatus || (isCreatingNewEstimateVersion && nextEstimateId ? 'DRAFT' : '');

        setLatestEstimate((prev) => {
            if (!est) return null;
            const next = prev ? { ...prev, ...est } : { ...est };
            if (optimisticEstimateStatus) {
                next.status = normalizeEstimateStatus(next.status) || optimisticEstimateStatus;
                next.estimateStatus = normalizeEstimateStatus(next.estimateStatus) || optimisticEstimateStatus;
            }
            if (nextEstimateId && !getEstimateIdValue(next)) {
                next.estimateId = nextEstimateId;
            }
            // Some update APIs may return estimate meta without items.
            // Keep previous items temporarily to avoid disabling confirm button,
            // then trigger a refetch to sync the real latest estimate.
            if (!Array.isArray(est?.items) && Array.isArray(prev?.items)) {
                next.items = prev.items;
            }
            return next;
        });

        if (!isCreatingNewEstimateVersion && nextEstimateId && nextEstimateStatus === 'DRAFT') {
            createNewEstimateRevertRef.current = null;
            setIsCreatingNewEstimateVersion(false);
        }

        const hasEstimateId = Boolean(nextEstimateId);
        const hasItems = Array.isArray(est?.items) && est.items.length > 0;
        if (hasEstimateId && !hasItems && !isCreatingNewEstimateVersion) {
            loadLatestEstimate();
        }
        const shouldSyncCreatedVersion =
            isCreatingNewEstimateVersion &&
            hasEstimateId &&
            (optimisticEstimateStatus === 'DRAFT' || optimisticEstimateStatus === 'SENT') &&
            createVersionSyncRef.current !== `${nextEstimateId}:${optimisticEstimateStatus}`;

        if (shouldSyncCreatedVersion) {
            createVersionSyncRef.current = `${nextEstimateId}:${optimisticEstimateStatus}`;
            globalThis.setTimeout?.(() => {
                createNewEstimateRevertRef.current = null;
                setIsCreatingNewEstimateVersion(false);
                refreshDetailView({ refreshEstimate: false, refreshBill: true, refreshAdvisor: false });
            }, 80);
        } else if (hasEstimateId) {
            globalThis.setTimeout?.(() => {
                refreshDetailView({ refreshEstimate: false, refreshBill: true, refreshAdvisor: false });
            }, 120);
        }
    }, [isCreatingNewEstimateVersion, loadLatestEstimate, refreshDetailView]);

    const handleBeforeEstimateMutate = useCallback(async (options = {}) => {
        if (!estimateIdNum || hasBill) return;
        const promotionTypesToUnapply = Array.isArray(options?.promotionTypesToUnapply)
            ? options.promotionTypesToUnapply.map((type) => String(type || '').trim().toUpperCase()).filter(Boolean)
            : [];
        if (options?.skipUnapplyPromotion) {
            if (options?.resetPromotionSelection) {
                setAppliedPromotions({ PERCENT: null, BUY_X_GET_Y: null });
                setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
                setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
            }
            return latestEstimate ?? null;
        }
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) return;

        const estimateItems = Array.isArray(latestEstimate?.items) ? latestEstimate.items : [];
        const estimatePromotionIds = Array.isArray(latestEstimate?.promotions)
            ? latestEstimate.promotions.map(getPromotionId).filter(Boolean)
            : [];
        const hasPromotionIdsOnItems = estimateItems.some((it) => Boolean(getExplicitPromotionId(it)));
        const hasPromotionIdsOnEstimate = estimatePromotionIds.length > 0 || Boolean(getExplicitPromotionId(latestEstimate));
        const hasPromotionEffects = estimateItems.some((it) => getEstimateItemGiftFlag(it) || pickDiscountAmountValue(it) > 0);
        let promotionLookup = availablePromotions;
        let refs = collectAppliedPromotionRefs(latestEstimate, appliedPromotions, promotionLookup);

        const shouldFetchPromotionLookup =
            refs.length === 0 ||
            refs.some((ref) => !ref.promotionType) ||
            promotionTypesToUnapply.length > 0;

        if (shouldFetchPromotionLookup && (hasPromotionIdsOnEstimate || hasPromotionIdsOnItems || hasPromotionEffects)) {
            try {
                const entries = await Promise.all(PROMOTION_TYPES.map(async ({ type }) => {
                    const res = await fetchAvailablePromotions(token, type, customerIdNum);
                    return [type, Array.isArray(res?.data) ? res.data : []];
                }));
                promotionLookup = Object.fromEntries(entries);
                setAvailablePromotions(promotionLookup);
                refs = collectAppliedPromotionRefs(latestEstimate, appliedPromotions, promotionLookup);
            } catch {
                // Surface the clearer message below if refs still cannot be resolved.
            }
        }

        if (promotionTypesToUnapply.length > 0) {
            const allowed = new Set(promotionTypesToUnapply);
            refs = refs.filter((ref) => allowed.has(String(ref?.promotionType || '').trim().toUpperCase()));
        }

        if (refs.length === 0) {
            if (!promotionTypesToUnapply.length && (hasPromotionIdsOnEstimate || hasPromotionIdsOnItems || hasPromotionEffects)) {
                notify('Không tìm thấy promotionId/promotionCode để gỡ khuyến mãi khỏi báo giá.');
            }
            return latestEstimate ?? null;
        }

        try {
            setPromoApplying(true);
            for (const ref of refs) {
                await unapplyPromotionFromEstimate(ref.promotionId, estimateIdNum, ref.promotionCode, token);
            }
            setAppliedPromotions((prev) => {
                if (promotionTypesToUnapply.length === 0) return { PERCENT: null, BUY_X_GET_Y: null };
                const next = { ...prev };
                promotionTypesToUnapply.forEach((type) => {
                    next[type] = null;
                });
                return next;
            });
            setPromoCodes({ PERCENT: '', BUY_X_GET_Y: '' });
            setSelectedPromotions({ PERCENT: '', BUY_X_GET_Y: '' });
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            const cleanEstimate = pickLatestEstimate(estimateRes?.data);
            setLatestEstimate(cleanEstimate ?? null);
            setRefreshTick((prev) => prev + 1);
            notify(promotionTypesToUnapply.length > 0
                ? 'Đã gỡ khuyến mãi phần trăm khỏi báo giá. Vui lòng áp dụng lại sau khi lưu chỉnh sửa.'
                : 'Đã gỡ khuyến mãi khỏi báo giá. Vui lòng áp dụng lại sau khi lưu chỉnh sửa.');
            return cleanEstimate ?? null;
        } catch (err) {
            notify(err?.message || 'Không thể gỡ khuyến mãi khỏi báo giá.');
            throw err;
        } finally {
            setPromoApplying(false);
        }
    }, [appliedPromotions, availablePromotions, customerIdNum, estimateIdNum, hasBill, latestEstimate, notify, serviceTicketIdNum]);

    const handleInspectionCompleted = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        const code = String(ticket.ticketCode || ticketCodeParam || '').trim();
        if (!token || !code) return;

        try {
            const detailRes = await fetchServiceTicketDetail(code, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
        } catch (err) {
            notify(err?.message || 'Không thể tải lại trạng thái phiếu dịch vụ sau khi hoàn thành kiểm tra.');
        }
    }, [notify, refreshDetailView, setTicketRaw, ticket.ticketCode, ticketCodeParam]);

    const applyPromotion = async (promotionType) => {
        const type = String(promotionType || '').trim().toUpperCase();
        if (isNewEstimateVersionPromotionLimited && type !== 'PERCENT') {
            notify('Version báo giá mới chỉ được áp dụng mã giảm giá phần trăm.');
            return;
        }
        const canApplyForStatus = isEstimateDraft || (isNewEstimateVersionPromotionLimited && isEstimateSent);
        if (!canApplyForStatus) {
            notify('Chỉ có thể áp dụng khuyến mãi khi báo giá đang ở trạng thái DRAFT.');
            return;
        }
        if (ticketStatus === 'PAID') {
            notify('Phiếu dịch vụ đã thanh toán. Không thể áp dụng khuyến mãi.');
            return;
        }
        if (!estimateIdNum) {
            notify('Không tìm thấy báo giá hợp lệ để áp dụng khuyến mãi.');
            return;
        }

        setPromoError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const code = String(promoCodes[type] || '').trim();
        const selectedId = String(selectedPromotions[type] || '').trim();

        if (!code && !selectedId) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            return;
        }

        const list = Array.isArray(availablePromotions[type]) ? availablePromotions[type] : [];
        let picked = null;
        if (code) {
            try {
                setPromoApplying(true);
                const res = await fetchPromotionByCode(code, token);
                picked = normalizePromotion(res?.data ?? null);
            } catch (err) {
                setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
                setPromoError(err?.message || 'Mã không hợp lệ');
                return;
            } finally {
                setPromoApplying(false);
            }
        } else {
            picked = list.find((p) => {
                const id = getPromotionId(p);
                return id != null && String(id) === selectedId;
            }) ?? null;
        }

        const pickedType = getPromotionType(picked);
        if (pickedType && pickedType !== type) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            setPromoError(`Mã này thuộc loại ${pickedType}, không áp dụng cho ${type}.`);
            return;
        }

        const validationMessage = validatePromotion(picked, receiptSubtotal);
        if (validationMessage) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            setPromoError(validationMessage);
            return;
        }

        const promotionId = getPromotionId(picked);
        const promotionCode = String(picked?.code ?? '').trim();
        if (!promotionId || !promotionCode) {
            setPromoError('Khuyến mãi thiếu promotionId hoặc promotionCode.');
            return;
        }

        try {
            setPromoApplying(true);
            await applyPromotionToEstimate(promotionId, estimateIdNum, promotionCode, token);
            setAppliedPromotions((prev) => ({ ...prev, [type]: normalizePromotion(picked) }));
            setPromoCodes((prev) => ({ ...prev, [type]: '' }));
            setSelectedPromotions((prev) => ({ ...prev, [type]: '' }));
            await loadLatestEstimate();
            setRefreshTick((prev) => prev + 1);
            notify('Đã áp dụng khuyến mãi vào báo giá.');
        } catch (err) {
            setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
            setPromoError(err?.message || 'Không thể áp dụng khuyến mãi.');
        } finally {
            setPromoApplying(false);
        }
    };

    const unapplySinglePromotion = async (promotionRow) => {
        if (promoApplying) return;
        if (!estimateIdNum) {
            notify('Không tìm thấy báo giá hợp lệ để hủy mã giảm giá.');
            return;
        }
        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId để tải lại báo giá sau khi hủy mã giảm giá.');
            return;
        }

        const promotionId = getPromotionId(promotionRow);
        const promotionCode = getPromotionCode(promotionRow);
        if (!promotionId || !promotionCode) {
            notify('Không đủ thông tin promotionId/promotionCode để hủy mã giảm giá.');
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để hủy mã giảm giá.');
            return;
        }

        try {
            setPromoApplying(true);
            setPromoError('');
            await unapplyPromotionFromEstimate(promotionId, estimateIdNum, promotionCode, token);
            const type = String(promotionRow?.promotionType || '').trim().toUpperCase();
            if (type) {
                setAppliedPromotions((prev) => ({ ...prev, [type]: null }));
                setPromoCodes((prev) => ({ ...prev, [type]: '' }));
                setSelectedPromotions((prev) => ({ ...prev, [type]: '' }));
            }
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            const latest = pickLatestEstimate(estimateRes?.data);
            setLatestEstimate(latest ?? null);
            triggerRefresh();
            notify('Đã hủy áp dụng mã giảm giá.');
        } catch (err) {
            setPromoError(err?.message || 'Không thể hủy áp dụng mã giảm giá.');
        } finally {
            setPromoApplying(false);
        }
    };

    const handlePrintServiceReceipt = async () => {
        if (receiptApproving) return;
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        if (!token) {
            notify('Vui lòng đăng nhập để in phiếu dịch vụ.');
            return;
        }
        if (!estimateIdNum || (estimateStatus !== 'DRAFT' && estimateStatus !== 'SENT')) {
            notify('Chỉ có thể in phiếu dịch vụ khi báo giá đang ở trạng thái DRAFT hoặc SENT.');
            return;
        }

        try {
            setReceiptApproving(true);
            if (estimateStatus === 'DRAFT') {
                await manageServiceTicketEstimateStatus(estimateIdNum, 'SENT', token);
                setLatestEstimate((prev) => (prev ? { ...prev, status: 'SENT', estimateStatus: 'SENT' } : prev));
                await refreshDetailView({ refreshEstimate: true, refreshBill: true });
                notify('Đã chuyển báo giá sang trạng thái SENT.');
            }
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
            const promotionId = getPromotionId(appliedPromotionList[0]);
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
            await refreshDetailView({ refreshEstimate: true, refreshBill: true });
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
            renderPageSoon();
            notify('Đã tạo lịch nhắc bảo dưỡng.');
        } catch (err) {
            notify(err?.message || 'Không thể tạo lịch nhắc bảo dưỡng.');
        } finally {
            setMaintenanceSubmitting(false);
        }
    };

    return (
        <div className={styles.page} onClickCapture={handlePageButtonClickCapture}>
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
                                            onBeforeEstimateMutate={handleBeforeEstimateMutate}
                                            readOnly={isInspectionAndEstimateReadOnly}
                                            readOnlyMessage={inspectionAndEstimateReadOnlyMessage}
                                            hideReadOnlyNotice={false}
                                            disableFullEdit={isAddServicePending}
                                        />
                                    )}
                            {canApplyPromotionToCurrentEstimate ? (
                                <section className={styles.block}>
                                    <h2 className={styles.blockTitle}>Mã giảm giá</h2>
                                    {activePromotionRows.length > 0 ? (
                                        <div className={styles.promotionSummaryList}>
                                            {activePromotionRows.map((row) => (
                                                <div key={`${row.promotionId || row.promotionCode}`} className={styles.promotionSummary}>
                                                    <span className={styles.promotionSummaryLabel}>Đang áp dụng:</span>
                                                    <span className={styles.promotionSummaryText}>{row.label}</span>
                                                    {canUnapplyPromotionFromCurrentEstimate ? (
                                                        <button
                                                            type="button"
                                                            className="ui-btn ui-btn--ghost"
                                                            onClick={() => unapplySinglePromotion(row)}
                                                            disabled={promoApplying || !row.promotionId || !row.promotionCode}
                                                        >
                                                            Hủy áp dụng
                                                        </button>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className={styles.promotionGrid}>
                                                {visiblePromotionTypes.map(({ type, label }) => {
                                                    const list = Array.isArray(availablePromotions[type]) ? availablePromotions[type] : [];
                                                    const appliedLabel = buildPromotionDisplayLabel(appliedPromotions[type]);
                                                    return (
                                                        <div key={type} className={styles.promotionBox}>
                                                            <div className="ui-field" style={{ marginBottom: 0 }}>
                                                                <label htmlFor={`service-ticket-promo-code-${type}`}>{label}</label>
                                                                <input
                                                                    id={`service-ticket-promo-code-${type}`}
                                                                    value={promoCodes[type] || ''}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        setPromoCodes((prev) => ({ ...prev, [type]: value }));
                                                                        if (selectedPromotions[type]) {
                                                                            setSelectedPromotions((prev) => ({ ...prev, [type]: '' }));
                                                                        }
                                                                    }}
                                                                    placeholder="Nhập mã khuyến mãi"
                                                                    disabled={!canApplyPromotionToCurrentEstimate || billCreating || promoApplying}
                                                                />
                                                            </div>
                                                            <div className="ui-field" style={{ marginBottom: 0 }}>
                                                                <label htmlFor={`service-ticket-promo-${type}`}>Chọn từ danh sách</label>
                                                                <select
                                                                    id={`service-ticket-promo-${type}`}
                                                                    value={selectedPromotions[type] || ''}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        setSelectedPromotions((prev) => ({ ...prev, [type]: value }));
                                                                        if (promoCodes[type]) {
                                                                            setPromoCodes((prev) => ({ ...prev, [type]: '' }));
                                                                        }
                                                                    }}
                                                                    disabled={!canApplyPromotionToCurrentEstimate || billCreating || promoApplying || promotionsLoading}
                                                                >
                                                                    <option value="">{promotionsLoading ? 'Đang tải...' : '-'}</option>
                                                                    {list.map((p) => {
                                                                        const id = getPromotionId(p);
                                                                        if (!id) return null;
                                                                        return (
                                                                            <option key={String(id)} value={String(id)}>
                                                                                {buildPromotionDisplayLabel(p) || String(id)}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="ui-btn ui-btn--primary"
                                                                onClick={() => applyPromotion(type)}
                                                                disabled={!canApplyPromotionToCurrentEstimate || billCreating || promoApplying || (!promoCodes[type] && !selectedPromotions[type])}
                                                            >
                                                                {promoApplying ? 'Đang áp dụng...' : 'Áp dụng'}
                                                            </button>
                                                            {appliedLabel ? (
                                                                <div className={styles.promotionApplied}>
                                                                    Đã áp dụng: {appliedLabel}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                    {promotionsError ? <div className={styles.errorBanner} style={{ marginTop: 12 }}>{promotionsError}</div> : null}
                                    {promoError ? <div className={styles.errorBanner} style={{ marginTop: 12 }}>{promoError}</div> : null}
                                </section>
                            ) : activePromotionRows.length > 0 ? (
                                <section className={styles.block}>
                                    <h2 className={styles.blockTitle}>Mã giảm giá</h2>
                                    <div className={styles.promotionSummaryList}>
                                        {activePromotionRows.map((row) => (
                                            <div key={`${row.promotionId || row.promotionCode}`} className={styles.promotionSummary}>
                                                <span className={styles.promotionSummaryLabel}>Đang áp dụng:</span>
                                                <span className={styles.promotionSummaryText}>{row.label}</span>
                                                {canUnapplyPromotionFromCurrentEstimate ? (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={() => unapplySinglePromotion(row)}
                                                        disabled={promoApplying || !row.promotionId || !row.promotionCode}
                                                    >
                                                        Hủy áp dụng
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                                    {ticket.hasDraftStockIssue && hasAnyRequestableWarehouseDependentItem ? (
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
                                        {canOpenWarehouseIssues ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--primary"
                                                onClick={handleGoToWarehouseIssues}
                                            >
                                                Đi đến phiếu xuất kho
                                            </button>
                                        ) : null}
                                        {canOpenReceiptPayment ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--primary"
                                                onClick={handleGoToReceiptPayment}
                                            >
                                                Thanh toán
                                            </button>
                                        ) : null}
                                        {advisorReadOnlyWithoutTechnician || isInspectionAndEstimateReadOnly ? null : isCreatingNewEstimateVersion ? (
                                            <>
                                                {canPrintServiceReceipt ? (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--ghost"
                                                        onClick={handlePrintServiceReceipt}
                                                        disabled={receiptApproving || statusUpdating}
                                                    >
                                                        {receiptApproving ? 'Đang in...' : 'In phiếu dịch vụ'}
                                                    </button>
                                                ) : null}
                                                {canConfirmEstimate ? (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--primary"
                                                        onClick={handleOpenEstimateTimePopup}
                                                        disabled={receiptApproving || statusUpdating || estimateLoading}
                                                    >
                                                        {estimateLoading ? 'Đang xác nhận...' : 'Xác nhận báo giá'}
                                                    </button>
                                                ) : null}
                                            </>
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
