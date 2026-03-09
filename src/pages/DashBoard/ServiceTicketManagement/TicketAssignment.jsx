import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './TicketAssignment.module.css';

const MOCK_TICKETS = [
	{
		id: 'T12345',
		plate: '30A-12345',
		services: 'Bảo dưỡng, Thay lốp',
		time: '09:00 - 25/02/2026',
		assigned: false,
	},
	{
		id: 'T12346',
		plate: '30B-67890',
		services: 'Sửa chữa phanh',
		time: '10:00 - 25/02/2026',
		assigned: false,
	},
	{
		id: 'T12347',
		plate: '29C-11223',
		services: 'Thay dầu',
		time: '11:00 - 25/02/2026',
		assigned: false,
	},
];

const MOCK_ADVISORS = [
	{
		id: 'a-1',
		name: 'Nguyễn Văn A',
		title: 'Technical Advisor',
		shift: '07:30 - 12:00',
		tickets: 0,
		availability: 'AVAILABLE',
	},
	{
		id: 'a-2',
		name: 'Trần Thị B',
		title: 'Service Advisor',
		shift: '13:00 - 17:30',
		tickets: 0,
		availability: 'AVAILABLE',
	},
	{
		id: 'a-3',
		name: 'Lê Văn C',
		title: 'Technical Advisor',
		shift: '07:30 - 12:00',
		tickets: 1,
		availability: 'BUSY',
	},
];

function normalize(text) {
	return String(text || '').trim().toLowerCase();
}

function availabilityPill(availability) {
	if (availability === 'AVAILABLE') return { label: 'Rảnh', tone: 'success' };
	return { label: 'Bận', tone: 'danger' };
}

export default function TicketAssignment() {
	useScrollToTop();
	const notify = (message) => toast(message, { containerId: 'app-toast' });

	const [tickets, setTickets] = useState(MOCK_TICKETS);
	const [advisors, setAdvisors] = useState(MOCK_ADVISORS);

	const [serviceFilter, setServiceFilter] = useState('ALL');
	const [ticketSearch, setTicketSearch] = useState('');

	const [shiftFilter, setShiftFilter] = useState('ALL');
	const [onlyAvailable, setOnlyAvailable] = useState(false);

	const [draggingTicketId, setDraggingTicketId] = useState('');
	const [dropHoverAdvisorId, setDropHoverAdvisorId] = useState('');
	const [pending, setPending] = useState(null);

	const uniqueServices = useMemo(() => {
		const set = new Set();
		for (const t of tickets) {
			String(t.services || '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
				.forEach((s) => set.add(s));
		}
		return ['ALL', ...Array.from(set)];
	}, [tickets]);

	const visibleTickets = useMemo(() => {
		const q = normalize(ticketSearch);
		return tickets.filter((t) => {
			if (t.assigned) return false;
			if (serviceFilter !== 'ALL') {
				const svc = String(t.services || '');
				if (!svc.toLowerCase().includes(String(serviceFilter).toLowerCase())) return false;
			}
			if (!q) return true;
			const hay = `${t.id} ${t.plate}`.toLowerCase();
			return hay.includes(q);
		});
	}, [tickets, serviceFilter, ticketSearch]);

	const visibleAdvisors = useMemo(() => {
		return advisors.filter((a) => {
			if (shiftFilter !== 'ALL' && a.shift !== shiftFilter) return false;
			if (onlyAvailable && a.availability !== 'AVAILABLE') return false;
			return true;
		});
	}, [advisors, shiftFilter, onlyAvailable]);

	const uniqueShifts = useMemo(() => {
		const set = new Set(advisors.map((a) => a.shift).filter(Boolean));
		return ['ALL', ...Array.from(set)];
	}, [advisors]);

	const pendingTicket = useMemo(
		() => (pending ? tickets.find((t) => t.id === pending.ticketId) ?? null : null),
		[pending, tickets],
	);
	const pendingAdvisor = useMemo(
		() => (pending ? advisors.find((a) => a.id === pending.advisorId) ?? null : null),
		[pending, advisors],
	);

	const clearPending = () => setPending(null);

	const confirmAssign = () => {
		if (!pendingTicket || !pendingAdvisor) return;
		setTickets((prev) => prev.map((t) => (t.id === pendingTicket.id ? { ...t, assigned: true } : t)));
		setAdvisors((prev) =>
			prev.map((a) => (a.id === pendingAdvisor.id ? { ...a, tickets: Number(a.tickets || 0) + 1 } : a)),
		);
		setPending(null);
		notify(`Đã phân công ${pendingTicket.id} cho ${pendingAdvisor.name} (mock).`);
	};

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<h1 className={styles.title}>Phân công Advisor</h1>
				<div className={styles.subtitle}>Chọn ticket và advisor để phân công</div>
			</div>

			<div className={styles.layout}>
				<section className={styles.col}>
					<div className={styles.filtersRow}>
						<select
							className={styles.select}
							value={serviceFilter}
							onChange={(e) => setServiceFilter(e.target.value)}
						>
							{uniqueServices.map((svc) => (
								<option key={svc} value={svc}>
									{svc === 'ALL' ? 'Lọc theo dịch vụ' : svc}
								</option>
							))}
						</select>
						<input
							className={styles.input}
							value={ticketSearch}
							onChange={(e) => setTicketSearch(e.target.value)}
							placeholder="Tìm theo biển số, mã ticket..."
						/>
					</div>

					<div className={styles.list}>
						{visibleTickets.map((t) => (
							<article
								key={t.id}
								className={`${styles.card} ${draggingTicketId === t.id ? styles['card--dragging'] : ''}`}
								draggable
								onDragStart={(e) => {
								setDraggingTicketId(t.id);
								e.dataTransfer.effectAllowed = 'move';
								e.dataTransfer.setData('text/plain', t.id);
							}}
								onDragEnd={() => setDraggingTicketId('')}
							>
								<div className={styles.cardTop}>
									<div className={styles.cardTitle}>Ticket #{t.id}</div>
									<span className={styles.pill}>Chưa phân công</span>
								</div>
								<div className={styles.ticketMeta}>
									<div className={styles.ticketLine}>Biển số: {t.plate}</div>
									<div>Dịch vụ: {t.services}</div>
									<div>Thời gian: {t.time}</div>
								</div>
							</article>
						))}

						{visibleTickets.length === 0 && (
							<div className={styles.empty}>Không có ticket phù hợp.</div>
						)}
					</div>
				</section>

				<section className={styles.col}>
					<div className={styles.rightFiltersRow}>
						<select
							className={styles.select}
							value={shiftFilter}
							onChange={(e) => setShiftFilter(e.target.value)}
						>
							{uniqueShifts.map((s) => (
								<option key={s} value={s}>
									{s === 'ALL' ? 'Lọc theo ca làm việc' : s}
								</option>
							))}
						</select>
						<label className={styles.toggle}>
							<input
								type="checkbox"
								checked={onlyAvailable}
								onChange={(e) => setOnlyAvailable(e.target.checked)}
							/>
							Chỉ hiển thị advisor rảnh
						</label>
					</div>

					<div className={styles.list}>
						{visibleAdvisors.map((a) => {
							const pill = availabilityPill(a.availability);
							const dropActive = dropHoverAdvisorId === a.id;
							return (
								<article
									key={a.id}
									className={`${styles.card} ${dropActive ? styles['card--dropActive'] : ''}`}
									onDragOver={(e) => {
									if (!draggingTicketId) return;
									e.preventDefault();
									setDropHoverAdvisorId(a.id);
									e.dataTransfer.dropEffect = 'move';
								}}
									onDragLeave={() => {
									setDropHoverAdvisorId((prev) => (prev === a.id ? '' : prev));
								}}
									onDrop={(e) => {
									e.preventDefault();
									const ticketId = e.dataTransfer.getData('text/plain') || draggingTicketId;
									setDropHoverAdvisorId('');
									setDraggingTicketId('');
									if (!ticketId) return;
									setPending({ ticketId, advisorId: a.id });
									notify('Đã kéo ticket sang advisor. Bấm Xác nhận để phân công.');
								}}
								>
									<div className={styles.advisorRow}>
										<div className={styles.avatar} aria-hidden="true" />
										<div>
											<div className={styles.advisorName}>{a.name}</div>
											<div className={styles.advisorMeta}>
												<div>{a.title}</div>
												<div>Ca làm: {a.shift}</div>
												<div>{a.tickets} tickets</div>
											</div>
										</div>
										<span className={`${styles.pill} ${styles['pill--' + pill.tone]}`}>{pill.label}</span>
									</div>
								</article>
							);
						})}

						{visibleAdvisors.length === 0 && (
							<div className={styles.empty}>Không có advisor phù hợp.</div>
						)}
					</div>
				</section>
			</div>

			<div className={styles.footerBar}>
				<div className={styles.footerText}>
					{pendingTicket && pendingAdvisor
						? `Đã chọn: 1 ticket (${pendingTicket.id}), 1 advisor (${pendingAdvisor.name}). Bấm Xác nhận để phân công.`
						: 'Kéo ticket từ cột trái sang advisor ở cột phải để giao việc.'}
				</div>
				<div className={styles.footerActions}>
					<button type="button" className={styles.btn} onClick={clearPending} disabled={!pending}>
						Hủy
					</button>
					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={confirmAssign}
						disabled={!pendingTicket || !pendingAdvisor}
					>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);
}

