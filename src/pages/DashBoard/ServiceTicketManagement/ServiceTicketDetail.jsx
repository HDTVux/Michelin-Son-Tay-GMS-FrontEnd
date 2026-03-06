import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { formatDateTimeViNoSeconds } from '../../../components/timeUtils.js';
import styles from './ServiceTicketDetail.module.css';

const TIMELINE_STEPS = [
	{ key: 'checkin', label: 'Check-in' },
	{ key: 'created', label: 'Ticket Created' },
	{ key: 'diagnosis', label: 'Diagnosis' },
	{ key: 'inProgress', label: 'In Progress' },
	{ key: 'completed', label: 'Completed' },
];

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
	const ticketCode =
		String(input?.ticketCode || input?.code || input?.id || codeFallback || '12345').trim() || '12345';

	const statusLabel =
		String(input?.statusLabel || input?.statusText || input?.status || 'Diagnosis Queue').trim() ||
		'Diagnosis Queue';

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
			input?.odometerKm ??
			input?.mileage ??
			input?.vehicle?.odometerReading ??
			input?.vehicle?.odometerKm ??
			input?.vehicle?.mileage,
	);

	return {
		ticketCode,
		statusLabel: toTitleCaseFromCode(statusLabel),
		receivedAt,
		handoverAt,
		customer: {
			name: input?.customerName || input?.customer?.name || 'Nguyễn Văn A',
			phone: input?.customerPhone || input?.phone || input?.customer?.phone || '0901234567',
			email: input?.customerEmail || input?.email || input?.customer?.email || 'anva@example.com',
		},
		vehicle: {
			licensePlate: input?.licensePlate || input?.vehicle?.licensePlate || '51F-123.45',
			model: input?.vehicleModel || input?.vehicle?.model || 'Toyota Camry 2020',
			odometerKm,
		},
		
		createdBy: input?.createdBy || input?.creatorName || input?.staffName || 'Lễ tân B',
		requestNote:
			input?.requestNote ||
			input?.customerRequest ||
			input?.note ||
			'Kiểm tra động cơ có tiếng ồn lạ khi tăng tốc.',
		services:
			Array.isArray(input?.services) && input.services.length
				? input.services
				: [
					{ name: 'Kiểm tra tổng quát', priceVnd: 500_000 },
					{ name: 'Thay dầu động cơ', priceVnd: 800_000 },
					{ name: 'Kiểm tra hệ thống phanh', priceVnd: 300_000 },
				],
		externalDependency: Boolean(input?.externalDependency || input?.isExternalDependency),
		timelineStatus: input?.timelineStatus || input?.status || statusLabel,
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

export default function ServiceTicketDetail() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();

	const ticketFromState = location?.state?.ticket ?? location?.state?.serviceTicket ?? location?.state ?? null;
	const ticket = useMemo(() => normalizeTicket(ticketFromState, params?.id), [ticketFromState, params?.id]);
	const activeStepIndex = resolveActiveStepIndex(ticket?.timelineStatus || ticket?.statusLabel);

	const receivedAtDisplay = ticket?.receivedAt ? formatDateTimeViNoSeconds(ticket.receivedAt, '-') : '-';
	const handoverAtDisplay = ticket?.handoverAt ? formatDateTimeViNoSeconds(ticket.handoverAt, '-') : '-';
	const odometerKm = ticket?.vehicle?.odometerKm;
	const odometerDisplay =
		odometerKm == null ? '-' : `${Number(odometerKm).toLocaleString('vi-VN')} km`;

	const handleBack = () => navigate(-1);
	const handlePrint = () => {
		if (typeof globalThis?.print === 'function') globalThis.print();
	};
	const handleEdit = () => {
		// Route for edit may be wired later.
		console.log('EDIT_SERVICE_TICKET', { ticketCode: ticket?.ticketCode });
	};

	return (
		<div className={styles.page}>
			<div className={styles.layout}>
				<main className={styles.main}>
					<header className={styles.header}>
						<div className={styles.headerLeft}>
							<div className={styles.titleRow}>
								<h1 className={styles.title}>Phiếu dịch vụ #{ticket.ticketCode}</h1>
								<span className={styles.statusPill}>{ticket.statusLabel}</span>
							</div>
						</div>
						<button type="button" className={`ui-btn ui-btn--ghost ${styles.editBtn}`} onClick={handleEdit}>
							Chỉnh sửa
						</button>
					</header>

					<div className={`ui-card ${styles.card}`}>
						<div className={styles.infoGrid}>
							<InfoBlock
								title="Thông tin khách hàng"
								rows={[
									{ label: 'Họ tên:', value: ticket.customer.name || '-' },
									{ label: 'SĐT:', value: ticket.customer.phone || '-' },
									{ label: 'Email:', value: ticket.customer.email || '-' },
								]}
							/>
							<InfoBlock
								title="Thông tin xe"
								rows={[
									{ label: 'Biển số xe:', value: ticket.vehicle.licensePlate || '-' },
									{ label: 'Số km:', value: odometerDisplay },
									{ label: 'Model:', value: ticket.vehicle.model || '-' },
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
									<span className={styles.kvLabel}>Người tạo:</span>
									<span className={styles.kvValue}>{ticket.createdBy || '-'}</span>
								</div>
							</div>
						</section>

						<section className={styles.block}>
							<h2 className={styles.blockTitle}>Yêu cầu khách hàng</h2>
							<div className={styles.noteBox}>{ticket.requestNote || '-'}</div>
						</section>

						<section className={styles.block}>
							<h2 className={styles.blockTitle}>Dịch vụ đã chọn</h2>
							<div className={styles.servicesList}>
								{ticket.services.map((s, idx) => (
									<div key={`${s?.id ?? s?.name ?? 'service'}-${idx}`} className={styles.serviceRow}>
										<span className={styles.serviceName}>{s?.label || s?.name || '-'}</span>
										<span className={styles.servicePrice}>{formatCurrencyVnd(s?.priceVnd ?? s?.price)}</span>
									</div>
								))}
							</div>

							{ticket.externalDependency && (
								<div className={styles.tagsRow}>
									<span className={styles.tag}>External Dependency</span>
								</div>
							)}
						</section>

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

