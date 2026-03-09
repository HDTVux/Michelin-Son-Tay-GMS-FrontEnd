import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { toast } from 'react-toastify';
import AdvisorItemsTable from './AdvisorItemsTable.jsx';
import { useServiceTicketDetailData, useServiceTicketEditing } from './serviceTicketDetailHooks.js';
import styles from './ServiceTicketDetail.module.css';

const TIMELINE_STEPS = [
	{ key: 'checkin', label: 'Check-in' },
	{ key: 'created', label: 'Ticket Created' },
	{ key: 'diagnosis', label: 'Diagnosis' },
	{ key: 'inProgress', label: 'In Progress' },
	{ key: 'completed', label: 'Completed' },
];

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

function resolveActiveStepIndex(statusLike) {
	const raw = String(statusLike || '').trim();
	if (!raw) return 2;
	const upper = raw.toUpperCase();

	if (upper.includes('COMPLETED') || upper.includes('DONE')) return 4;
	if (upper.includes('IN_PROGRESS') || upper.includes('PROCESSING') || upper.includes('PROGRESS')) return 3;
	if (upper.includes('DIAGNOSIS') || upper.includes('QUEUE')) return 2;
	if (upper.includes('CREATED') || upper.includes('NEW')) return 1;
	if (upper.includes('CHECK_IN') || upper.includes('CHECKIN') || upper.includes('ARRIVED')) return 0;

	return 2;
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

function normalizeTicket(input, codeFallback) {
	const ticketCode = String(input?.ticketCode || codeFallback || '').trim();

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

	return {
		immutable: Boolean(input?.immutable),
		ticketCode,
		statusCode,
		statusLabel: toTitleCaseFromCode(statusLabel),
		receivedAt,
		handoverAt,
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

function TimelineBlock({ activeStepIndex }) {
	return (
		<section className={styles.block}>
			<h2 className={styles.blockTitle}>Timeline</h2>
			<ol className={styles.timeline}>
				{TIMELINE_STEPS.map((step, idx) => {
					const isCompleted = idx < activeStepIndex;
					const isActive = idx === activeStepIndex;
					return (
						<li
							key={step.key}
							className={`${styles.timelineItem} ${isCompleted ? styles.isCompleted : ''} ${
								isActive ? styles.isActive : ''
							}`}
						>
							<span className={styles.dot} aria-hidden="true" />
							<span className={styles.timelineLabel}>{step.label}</span>
						</li>
					);
				})}
			</ol>
		</section>
	);
}

function RoleBasedSections({ showTimeline, activeStepIndex, showAdvisorTable }) {
	if (!showTimeline && !showAdvisorTable) return null;
	return (
		<>
			{showTimeline ? <TimelineBlock activeStepIndex={activeStepIndex} /> : null}
			{showAdvisorTable ? <AdvisorItemsTable /> : null}
		</>
	);
}

export default function ServiceTicketDetail() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
	const hasReceptionistRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.RECEPTIONIST);
	const hasAdvisorRole = staffRoles.length === 0 ? true : staffRoles.includes(STAFF_ROLE.ADVISOR);

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
	const activeStepIndex = resolveActiveStepIndex(ticket?.timelineStatus || ticket?.statusLabel);
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
	const handlePrint = () => {
		if (typeof globalThis?.print === 'function') globalThis.print();
	};

	return (
		<div className={styles.page}>
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
						<div className={styles.infoGrid}>
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

						<section className={styles.block}>
							<h2 className={styles.blockTitle}>Thông tin ticket</h2>
							<div className={styles.kvList}>
								<div className={styles.kvRow}>
									<span className={styles.kvLabel}>Ngày tiếp nhận:</span>
									<span className={styles.kvValue}>{receivedAtDisplay}</span>
								</div>
								<div className={styles.kvRow}>
									<span className={styles.kvLabel}>Ngày bàn giao:</span>
									<span className={styles.kvValue}>{handoverAtDisplay}</span>
								</div>
								<div className={styles.kvRow}>
									<span className={styles.kvLabel}>Lịch hẹn:</span>
									<span className={styles.kvValue}>
										{ticket?.booking?.scheduledDate
											? `${ticket.booking.scheduledDate} ${formatTimeHHmm(ticket.booking.scheduledTime) || ''}`.trim()
											: '-'}
									</span>
								</div>
								<div className={styles.kvRow}>
									<span className={styles.kvLabel}>Người tạo:</span>
									<span className={styles.kvValue}>{ticket.createdBy || '-'}</span>
								</div>
							</div>
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

						<RoleBasedSections
							showTimeline={hasReceptionistRole}
							activeStepIndex={activeStepIndex}
							showAdvisorTable={hasAdvisorRole}
							services={ticket?.services}
						/>

						<div className="ui-actions">
							<button type="button" className="ui-btn ui-btn--ghost" onClick={handleBack}>
								Quay lại
							</button>
							<button type="button" className="ui-btn ui-btn--primary" onClick={handlePrint}>
								In phiếu
							</button>
						</div>
					</div>
				</main>
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
	activeStepIndex: PropTypes.number.isRequired,
};

RoleBasedSections.propTypes = {
	showTimeline: PropTypes.bool.isRequired,
	activeStepIndex: PropTypes.number.isRequired,
	showAdvisorTable: PropTypes.bool.isRequired,
};

