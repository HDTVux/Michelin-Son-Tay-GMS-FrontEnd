import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { toast } from 'react-toastify';
import AdvisorItemsTable from './AdvisorItemsTable.jsx';
import { useServiceTicketDetailData, useServiceTicketEditing } from './serviceTicketDetailHandlers.js';
import {
    fetchServiceTicketDetail,
    fetchServiceTicketEstimate,
    manageServiceTicketEstimateStatus,
    manageServiceTicketStatus,
    fetchTicketAssignments,
} from '../../../services/serviceTicketService.js';
import { ServiceTicket as TechnicianServiceTicket } from '../../Technician/ServiceTicket/ServiceTicket.jsx';
import styles from './ServiceTicketDetail.module.css';

const STAFF_ROLE = {
    ADVISOR: 'ADVISOR',
    RECEPTIONIST: 'RECEPTIONIST',
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
    return `${new Intl.NumberFormat('vi-VN').format(n)} VND`;
}

function normalizeOdometerKm(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : Number(String(value).replaceAll(/\D/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
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

    if (value === 'CREATED' || value === 'DRAFT') return 'DRAFT';
    if (value === 'INSPECTION' || value === 'INSPECTING' || value === 'DIAGNOSIS') return 'INSPECTION';
    if (value === 'PENDING' || value === 'WAITING') return 'PENDING';
    if (value === 'IN_PROGRESS' || value === 'INPROGRESS' || value === 'PROCESSING') return 'IN_PROGRESS';
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

function normalizeTicket(input, codeFallback) {
    const ticketCode = String(input?.ticketCode || codeFallback || '').trim();
    const serviceTicketId =
        input?.serviceTicketId ??
        input?.serviceTicketID ??
        input?.id ??
        input?.ticketId ??
        null;

    const statusCode = String(input?.ticketStatus || input?.status || '').trim();
    const statusLabel = String(input?.statusLabel || input?.statusText || statusCode).trim() || '-';

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

    return {
        serviceTicketId,
        immutable: Boolean(input?.immutable),
        ticketCode,
        statusCode,
        statusLabel: toTitleCaseFromCode(statusLabel),
        receivedAt,
        handoverAt,
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
        externalDependency: Boolean(input?.externalDependency || input?.isExternalDependency),
        timelineStatus: input?.timelineStatus || statusCode || statusLabel,
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
    
    const [receiptApproving, setReceiptApproving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [latestEstimate, setLatestEstimate] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    const [refreshTick, setRefreshTick] = useState(0);
    const triggerRefresh = () => setRefreshTick(prev => prev + 1);

    const ticketCodeParam = String(ticketCodeOverride || params?.ticketCode || '').trim();
    const ticketFromState = location?.state?.ticket ?? location?.state?.serviceTicket ?? null;

    const { ticketRaw, setTicketRaw, isLoading, error, setError } = useServiceTicketDetailData(
        ticketCodeParam,
        ticketFromState,
    );
    const notify = (message) => toast(message, { containerId: 'app-toast' });
    const ticket = useMemo(
        () => normalizeTicket(ticketRaw ?? ticketFromState, ticketCodeParam),
        [ticketRaw, ticketFromState, ticketCodeParam],
    );
    const ticketStatus = useMemo(
        () => normalizeTicketStatus(ticket?.statusCode || ticket?.timelineStatus || ticket?.statusLabel),
        [ticket?.statusCode, ticket?.timelineStatus, ticket?.statusLabel],
    );

    const serviceTicketIdNum = useMemo(() => {
        const raw = ticket?.serviceTicketId;
        const n = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [ticket?.serviceTicketId]);

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

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        if (!serviceTicketIdNum) return;

        let cancelled = false;
        (async () => {
            try {
                setEstimateLoading(true);
                const estimateRes = await fetchServiceTicketEstimate(serviceTicketIdNum, token);
                if (cancelled) return;
                const latest = pickLatestEstimate(estimateRes?.data);
                setLatestEstimate(latest ?? null);
            } catch {
                if (cancelled) return;
                setLatestEstimate(null);
            } finally {
                if (!cancelled) setEstimateLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [serviceTicketIdNum]);

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

    const canCreateReceipt = ticketStatus === 'COMPLETED' && !assignmentsLoading && hasTechnician;

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
        await handleUpdateTicketStatus('IN_PROGRESS', 'Đã chuyển sang trạng thái "Tiến hành sửa chữa".');
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
            await manageServiceTicketStatus(serviceTicketIdNum, 'DRAFT', token);
            if (estimateIdNum) {
                try {
                    await manageServiceTicketEstimateStatus(estimateIdNum, 'DRAFT', token);
                    setLatestEstimate((prev) => prev ? { ...prev, status: 'DRAFT', estimateStatus: 'DRAFT' } : prev);
                } catch (err) {
                    notify(err?.message || 'Không thể chuyển trạng thái báo giá về nháp.');
                }
            }
            
            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            setTicketRaw(detailRes?.data ?? ticketRaw ?? null);            
            
            // Notify advisor table to open create mode immediately
            try {
                globalThis.dispatchEvent(new CustomEvent('startCreateEstimate'));
            } catch {
                // ignore if unavailable
            }            triggerRefresh(); 
            notify('Đã chuyển về trạng thái "Nháp" để thêm dịch vụ.');
        } catch (err) {
            notify(err?.message || 'Không thể cập nhật trạng thái phiếu dịch vụ.');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleRestartFromArchived = async () => {
        if (statusUpdating) return;
        const token = localStorage.getItem('authToken');
        if (!token) {
            notify('Vui lòng đăng nhập để cập nhật trạng thái phiếu dịch vụ.');
            throw new Error('No auth token');
        }
        
        try {
            setStatusUpdating(true);
            await manageServiceTicketStatus(serviceTicketIdNum, 'DRAFT', token);
            
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
            notify('Đã chuyển phiếu dịch vụ về trạng thái Nháp để bắt đầu báo giá mới.');
        } catch (err) {
            notify(err?.message || 'Không thể chuyển trạng thái phiếu dịch vụ về Nháp.');
            throw err;
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleConfirmEstimate = async () => {
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

            await manageServiceTicketEstimateStatus(estimateIdNum, 'APPROVED', token);
            setLatestEstimate((prev) => (prev ? { ...prev, status: 'APPROVED', estimateStatus: 'APPROVED' } : prev));
            
            const ticketCode = String(ticket.ticketCode || ticketCodeParam || '').trim();
            const detailRes = await fetchServiceTicketDetail(ticketCode, token);
            if (detailRes?.data) setTicketRaw(detailRes.data);

            triggerRefresh(); 
            notify('Đã xác nhận báo giá.');
        } catch (err) {
            notify(err?.message || 'Không thể xác nhận báo giá.');
        } finally {
            setEstimateLoading(false);
        }
    };

    const canCancel = ['DRAFT', 'INSPECTION', 'PENDING', 'IN_PROGRESS'].includes(ticketStatus);
    const canSetPending = ticketStatus === 'DRAFT';
    const canStartRepair = (ticketStatus === 'DRAFT' || ticketStatus === 'PENDING' || ticketStatus === 'INSPECTION') && isEstimateApproved;
    const canCompleteRepair = ticketStatus === 'IN_PROGRESS';
    const canAddService = ticketStatus === 'DRAFT' || ticketStatus === 'INSPECTION';

    const advisorItems = useMemo(() => Array.isArray(latestEstimate?.items) ? latestEstimate.items.filter(it => !it?.isRemoved) : [], [latestEstimate]);
    const hasAnyAdvisorItem = advisorItems.length > 0;
    const canConfirmEstimate = Boolean(estimateIdNum) && (estimateStatus === 'DRAFT' || estimateStatus === 'SENT') && hasAnyAdvisorItem;
    const handleEstimateStatusChange = useCallback((est) => {
        setLatestEstimate(est);
    }, []);

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
                        <button
                            type="button"
                            className={`ui-btn ui-btn--ghost ${styles.editBtn}`}
                            onClick={toggleEdit}
                            disabled={isLoading || isSaving}
                        >
                            {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
                        </button>
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
                                />
                                
                                <AdvisorItemsTable 
                                    key={`advisor-${ticket?.serviceTicketId}`} 
                                    serviceTicketId={ticket?.serviceTicketId} 
                                    ticketStatus={ticketStatus}
                                    onEstimateStatusChange={handleEstimateStatusChange}
                                    onRestartWorkflow={handleRestartFromArchived}
                                />
                            </>
                        )}

                        <div className={`ui-actions ${styles.actions}`}>
                            <button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
                                Quay lại
                            </button>
                            <div className={styles.actionsRight}>
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
                                        onClick={handleConfirmEstimate}
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
                                {canCreateReceipt && (
                                    <button type="button" className="ui-btn ui-btn--primary" onClick={handleCreateReceipt} disabled={receiptApproving}>
                                        Tạo hoá đơn
                                    </button>
                                )}
                                {!assignmentsLoading && !hasTechnician && ticketStatus === 'COMPLETED' && (
                                    <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                                        Cần phân công KTV trước khi tạo hóa đơn.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

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