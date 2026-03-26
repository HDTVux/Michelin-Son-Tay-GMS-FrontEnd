import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { toast } from 'react-toastify';
import AdvisorItemsTable from './AdvisorItemsTable.jsx';
import { useServiceTicketDetailData, useServiceTicketEditing } from './serviceTicketDetailHandlers.js';
import { approveServiceTicketEstimate, fetchServiceTicketEstimate } from '../../../services/serviceTicketService.js';
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

	// If already looks like a label, keep it.
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
		const va = Number(a?.version);
		const vb = Number(b?.version);
		const versionCmp = (Number.isFinite(vb) ? vb : -1) - (Number.isFinite(va) ? va : -1);
		if (versionCmp !== 0) return versionCmp;
		const ta = Date.parse(a?.createdAt || a?.approvedAt || 0);
		const tb = Date.parse(b?.createdAt || b?.approvedAt || 0);
		return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
	})[0];
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

function RoleBasedSections({ showTimeline, timelineSteps, showAdvisorTable, serviceTicketId, ticketCode }) {
	if (!showTimeline && !showAdvisorTable) return null;
	return (
		<>
			{showTimeline ? <TimelineBlock steps={timelineSteps} /> : null}
			{showAdvisorTable ? (
				<>
					<TechnicianServiceTicket ticketCode={ticketCode} embedded />
					<AdvisorItemsTable serviceTicketId={serviceTicketId} />
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
};

export default function ServiceTicketDetail() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
	const hasAdvisorRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.ADVISOR);
	const [receiptApproving, setReceiptApproving] = useState(false);

	const ticketCodeParam = String(params?.ticketCode || '').trim();
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

	const handleBack = () => navigate(-1);

	// UI-only handlers for status transitions (backend will be wired later)
	const handleCancelTicket = () => notify('Chức năng hủy phiếu dịch vụ đang được phát triển.');
	const handleSetPending = () => notify('Chức năng chuyển sang "Chờ xử lý" đang được phát triển.');
	const handleStartRepair = () => notify('Chức năng chuyển sang "Tiến hành sửa chữa" đang được phát triển.');
	const handleCompleteRepair = () => notify('Chức năng chuyển sang "Hoàn tất sửa chữa" đang được phát triển.');
	const handleAddService = () => notify('Chức năng "Thêm dịch vụ" đang được phát triển.');

	const canCancel = ['DRAFT', 'INSPECTION', 'PENDING', 'IN_PROGRESS'].includes(ticketStatus);
	const canSetPending = ticketStatus === 'DRAFT';
	const canStartRepair = ticketStatus === 'DRAFT' || ticketStatus === 'PENDING';
	const canCompleteRepair = ticketStatus === 'IN_PROGRESS';
	const canAddService = ticketStatus === 'DRAFT' || ticketStatus === 'INSPECTION';
	const canCreateReceipt = ticketStatus === 'COMPLETED';

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

		const serviceTicketIdRaw = ticket?.serviceTicketId;
		const serviceTicketIdNum = typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(serviceTicketIdRaw);
		if (!Number.isFinite(serviceTicketIdNum) || serviceTicketIdNum <= 0) {
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

			await approveServiceTicketEstimate(estimateIdNum, token);
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
						{/* Hàng ngang trên đầu - 2 cột, mỗi cột 2 hàng */}
						<div className={styles.topInfoGrid}>
							{/* Cột 1 */}
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
							{/* Cột 2 */}
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
								<TechnicianServiceTicket ticketCode={ticket.ticketCode || ticketCodeParam} embedded />
								<AdvisorItemsTable serviceTicketId={ticket?.serviceTicketId} />
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
										className="ui-btn ui-btn--danger"
										onClick={handleCancelTicket}
										disabled={receiptApproving}
									>
										Hủy phiếu dịch vụ
									</button>
								)}
								{canSetPending && (
									<button type="button" className="ui-btn ui-btn--ghost" onClick={handleSetPending} disabled={receiptApproving}>
										Chờ xử lý
									</button>
								)}
								{canAddService && (
									<button type="button" className="ui-btn ui-btn--ghost" onClick={handleAddService} disabled={receiptApproving}>
										Thêm dịch vụ
									</button>
								)}
								{canStartRepair && (
									<button type="button" className="ui-btn ui-btn--primary" onClick={handleStartRepair} disabled={receiptApproving}>
										Tiến hành sửa chữa
									</button>
								)}
								{canCompleteRepair && (
									<button type="button" className="ui-btn ui-btn--primary" onClick={handleCompleteRepair} disabled={receiptApproving}>
										Hoàn tất sửa chữa
									</button>
								)}
								{canCreateReceipt && (
									<button type="button" className="ui-btn ui-btn--primary" onClick={handleCreateReceipt} disabled={receiptApproving}>
										Tạo hoá đơn
									</button>
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
};

