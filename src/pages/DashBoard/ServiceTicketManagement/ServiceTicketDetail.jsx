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
    fetchServiceTicketDetail,
    fetchServiceTicketEstimate,
    manageServiceTicketEstimateStatus,
    manageServiceTicketStatus,
    fetchTicketAssignments,
    updateServiceTicketEstimatedDelivery,
} from '../../../services/serviceTicketService.js';
import { ServiceTicket as TechnicianServiceTicket } from '../../Technician/ServiceTicket/ServiceTicket.jsx';
import styles from './ServiceTicketDetail.module.css';

const STAFF_ROLE = {
    ADVISOR: 'ADVISOR',
    RECEPTIONIST: 'RECEPTIONIST',
    ACCOUNTANT: 'ACCOUNTANT',
};

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
        services:
            Array.isArray(input?.services) ? input.services : [],
        photos,
        externalDependency: Boolean(input?.externalDependency || input?.isExternalDependency),
        timelineStatus: input?.timelineStatus || statusCode || statusLabelRaw,
    };
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

export default function ServiceTicketDetail({ ticketCodeOverride }) {
    useScrollToTop();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
    const hasAdvisorRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.ADVISOR);
    const isAccountant = staffRoles.includes(STAFF_ROLE.ACCOUNTANT);

    const [receiptApproving, setReceiptApproving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [latestEstimate, setLatestEstimate] = useState(null);
    const estimateLoadSeqRef = useRef(0);
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

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
    const triggerRefresh = () => setRefreshTick(prev => prev + 1);

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

    const isEstimateApproved = estimateStatus === 'APPROVED';
    const isImmutable = Boolean(ticketRaw?.immutable ?? ticketFromState?.immutable ?? ticket?.immutable);

    const {
        isEditing,
        isSaving,
        editForm,
        setEditForm,
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

    const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
    const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';
    const odometerKm = ticket?.vehicle?.odometerKm;
    const odometerDisplay =
        odometerKm == null ? '-' : `${Number(odometerKm).toLocaleString('vi-VN')} km`;

    const ticketPhotos = useMemo(() => (Array.isArray(ticket?.photos) ? ticket.photos : []), [ticket?.photos]);
    const licensePlatePhotos = useMemo(
        () => ticketPhotos.filter((p) => String(p?.category || '').toUpperCase() === 'LICENSE_PLATE'),
        [ticketPhotos],
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
            const latest = pickLatestEstimate(estimateRes?.data);
            setLatestEstimate(latest ?? null);
        } catch {
            if (estimateLoadSeqRef.current !== seq) return;
            setLatestEstimate(null);
        } finally {
            if (estimateLoadSeqRef.current === seq) setEstimateLoading(false);
        }
    }, [serviceTicketIdNum]);

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

    const canCreateReceipt = ticketStatus === 'COMPLETED' && !assignmentsLoading;
    const canBookMaintenance = hasAdvisorRole && ticketStatus === 'COMPLETED';

    const handleBack = () => navigate(-1);

    const handleUpdateTicketStatus = async (nextStatus, fallbackSuccessMessage) => {
        if (statusUpdating) return;

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

    const handleCompleteRepair = () => handleUpdateTicketStatus('COMPLETED', 'Đã chuyển sang trạng thái "Hoàn tất sửa chữa".');

    const handleAddService = async () => {
        if (statusUpdating) return;
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

            // Capture current statuses so Cancel can revert them.
            addServiceRevertRef.current = {
                prevTicketStatus: ticketStatus,
                prevEstimateStatus: estimateStatus,
                estimateIdNum,
            };

            // Simplified rule: "Thêm dịch vụ" always brings ticket to ESTIMATED.
            await manageServiceTicketStatus(serviceTicketIdNum, 'ESTIMATED', token);
            let canOpenAppendEdit = true;
            if (estimateIdNum) {
                try {
                    await manageServiceTicketEstimateStatus(estimateIdNum, 'DRAFT', token);
                    setLatestEstimate((prev) => prev ? { ...prev, status: 'DRAFT', estimateStatus: 'DRAFT' } : prev);
                } catch (err) {
                    canOpenAppendEdit = false;
                    notify(err?.message || 'Không thể chuyển trạng thái báo giá về nháp.');
                }
            }

            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);

            // Notify advisor table to open append-only edit mode immediately
            if (canOpenAppendEdit) {
                try {
                    globalThis.dispatchEvent(new CustomEvent('startAppendEstimate'));
                } catch {
                    // ignore if unavailable
                }
            }

            triggerRefresh();
            notify(`Đã chuyển về trạng thái để thêm dịch vụ.`);
        } catch (err) {
            notify(err?.message || 'Không thể cập nhật trạng thái phiếu dịch vụ.');
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
            setAddServiceReverting(false);
            triggerRefresh();
        }
    }, [addServiceReverting, notify, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw]);

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
    }, [notify, serviceTicketIdNum, setTicketRaw, ticket, ticketCodeParam, ticketRaw]);

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
                const payload = buildStockAllocationUpdatePayload({
                    estimateId: estimateIdNum,
                    serviceTicketId: serviceTicketIdNum,
                    estimateItems: latestEstimate?.items,
                });
                // Nếu không có dòng vật tư cần giữ chỗ (toàn dịch vụ), bỏ qua update.
                if (payload.length > 0) {
                    await updateEstimateStockAllocation(estimateIdNum, payload, token);
                }
                return;
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

    const canCancel = ['CREATED', 'INSPECTING', 'PENDING', 'INSPECTED', 'ESTIMATED', 'REPAIRING'].includes(ticketStatus);
    const canSetPending = ticketStatus === 'ESTIMATED';
    const canAddService = (ticketStatus === 'ESTIMATED' || ticketStatus === 'REPAIRING');
    const canStartRepair = (ticketStatus === 'ESTIMATED' || ticketStatus === 'PENDING');
    const canCompleteRepair = ticketStatus === 'REPAIRING';

    const advisorItems = useMemo(() => Array.isArray(latestEstimate?.items) ? latestEstimate.items.filter(it => !it?.isRemoved) : [], [latestEstimate]);
    const hasAnyAdvisorItem = advisorItems.length > 0;
    const isEstimatePersisted = Boolean(latestEstimate?.createdAt || latestEstimate?.estimateId || latestEstimate?.id);
    const canConfirmEstimate = Boolean(estimateIdNum)
        && estimateStatus === 'DRAFT'
        && (ticketStatus === 'CREATED' || ticketStatus === 'INSPECTED' || ticketStatus === 'ESTIMATED')
        && hasAnyAdvisorItem
        && isEstimatePersisted
        && !isEstimateEditing;
    const handleEstimateStatusChange = useCallback((est) => {
        setLatestEstimate((prev) => {
            if (!est) return null;
            const next = { ...(prev || {}), ...(est || {}) };
            // Some update APIs may return estimate meta without items.
            // Keep previous items temporarily to avoid disabling confirm button,
            // then trigger a refetch to sync the real latest estimate.
            if (!Array.isArray(est?.items) && Array.isArray(prev?.items)) {
                next.items = prev.items;
            }
            return next;
        });

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

    const handleCreateReceipt = async () => {
        if (receiptApproving) return;
        const code = ticket.ticketCode || ticketCodeParam;
        if (!code) {
            notify('Thiếu mã phiếu dịch vụ để tạo hoá đơn.');
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để tạo hoá đơn.');
            return;
        }

        if (!serviceTicketIdNum) {
            notify('Thiếu serviceTicketId hợp lệ để tạo hoá đơn.');
            return;
        }

        try {
            setReceiptApproving(true);
            const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
            const latest = pickLatestEstimate(estimateRes?.data);
            const estimateIdRaw = latest?.estimateId ?? latest?.id;
            const estimateIdNum = typeof estimateIdRaw === 'number' ? estimateIdRaw : Number(estimateIdRaw);
            if (!Number.isFinite(estimateIdNum) || estimateIdNum <= 0) {
                notify('Chưa có báo giá hợp lệ để xác nhận trước khi tạo hoá đơn.');
                return;
            }

            const latestStatus = normalizeEstimateStatus(latest?.estimateStatus ?? latest?.status);
            if (latestStatus !== 'APPROVED' && latestStatus !== 'ARCHIVED') {
                notify('Vui lòng xác nhận báo giá trước khi tạo hoá đơn.');
                return;
            }
            navigate(`/service-ticket/${encodeURIComponent(String(code || '').trim())}/receipt-confirm`, {
                state: { ticket: ticketRaw ?? ticketFromState ?? null },
            });
        } catch (err) {
            notify(err?.message || 'Không thể xác nhận báo giá để tạo hoá đơn.');
        } finally {
            setReceiptApproving(false);
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

    // Chặn toàn bộ trang nếu chưa phân công kỹ thuật viên
    if (!assignmentsLoading && !hasTechnician) {
        return (
            <div className={styles.page}>
                <div className={styles.screenOnly}>
                    <div className={styles.layout}>
                        <main className={styles.main}>
                            <header className={styles.header}>
                                <div className={styles.headerLeft}>
                                    <div className={styles.titleRow}>
                                        <h1 className={styles.title}>Phiếu dịch vụ #{ticketCodeParam || '-'}</h1>
                                    </div>
                                </div>
                            </header>
                            <div className={`ui-card ${styles.card}`} style={{ textAlign: 'center', padding: '48px 24px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                                    Chưa phân công kỹ thuật viên
                                </h2>
                                <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', maxWidth: '440px', margin: '0 auto 32px' }}>
                                    Phiếu dịch vụ này chưa được phân công kỹ thuật viên. Vui lòng phân công kỹ thuật viên trước khi mở phiếu.
                                </p>
                                <button
                                    type="button"
                                    className="ui-btn ui-btn--ghost"
                                    onClick={() => navigate(-1)}
                                >
                                    Quay lại
                                </button>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        );
    }

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
                            {staffRoles.includes(STAFF_ROLE.RECEPTIONIST) && (ticket.statusCode === 'CREATED' || ticket.statusCode === 'DRAFT') && (
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
                                                <span className={styles.kvLabel}>Ngày bàn giao:</span>
                                                <span className={styles.kvValue}>{handoverAtDisplay}</span>
                                            </div>
                                            <div className={styles.kvRow}>
                                                <span className={styles.kvLabel}>Thời gian ước tính:</span>
                                                <span className={styles.kvValue}>{estimatedTimeDisplay}</span>
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
                                <h2 className={styles.blockTitle}>Dịch vụ đã chọn</h2>
                                <div className={styles.servicesList}>
                                    {(Array.isArray(ticket.services) ? ticket.services : []).map((s, idx) => {
                                        const price = s?.priceVnd ?? s?.price;
                                        return (
                                            <div key={`${s?.id ?? s?.name ?? 'service'}-${idx}`} className={styles.serviceRow}>
                                                <span className={styles.serviceName}>{s?.serviceName || s?.label || s?.name || '-'}</span>
                                                <span className={styles.servicePrice}>{price == null ? '-' : formatCurrencyVnd(price)}</span>
                                            </div>
                                        );
                                    })}
                                    {(!Array.isArray(ticket.services) || ticket.services.length === 0) && <div className={styles.noteBox}>-</div>}
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
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, customerRequest: e.target.value }))}
                                                disabled={isSaving}
                                            />
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

                            {hasAdvisorRole && (
                                <>
                                    <TechnicianServiceTicket
                                        key={`tech-${ticket.ticketCode || ticketCodeParam}-${ticketStatus}-${estimateStatus}`}
                                        ticketCode={ticket.ticketCode || ticketCodeParam}
                                        embedded
                                        mode="advisor"
                                        onInspectionCompleted={handleInspectionCompleted}
                                    />

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
                                    />
                                </>
                            )}

                            {isTicketCancelled ? null : (
                                <div className={`ui-actions ${styles.actions}`}>
                                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
                                        Quay lại
                                    </button>
                                    <div className={styles.actionsRight}>
                                        {isCreatingNewEstimateVersion && canConfirmEstimate ? (
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--primary"
                                                onClick={handleOpenEstimateTimePopup}
                                                disabled={receiptApproving || statusUpdating || estimateLoading}
                                            >
                                                {estimateLoading ? 'Đang xác nhận...' : 'Xác nhận báo giá'}
                                            </button>
                                        ) : null}

                                        {isCreatingNewEstimateVersion ? null : (
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
                                                {canAddService && (
                                                    <button type="button" className="ui-btn ui-btn--ghost" onClick={handleAddService} disabled={receiptApproving || statusUpdating}>
                                                        Thêm dịch vụ
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
                                                {canCreateReceipt && isAccountant && (
                                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleCreateReceipt} disabled={receiptApproving}>
                                                        Tạo hoá đơn
                                                    </button>
                                                )}

                                                {!assignmentsLoading && !hasTechnician && ticketStatus === 'COMPLETED' && (
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
