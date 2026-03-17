import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './QueueManagement.module.css';

const MOCK_QUEUE = [
	{
		id: 'q-1',
		source: 'BOOKING',
		licensePlate: '29A-123.45',
		customerName: 'Nguyễn Văn A',
		serviceName: 'Đổi dầu',
		waitMinutes: 10,
		status: 'Next-in-line',
		speedHint: 'Fast (10-20 phút)',
	},
	{
		id: 'q-2',
		source: 'WALKIN',
		licensePlate: '30B-678.90',
		customerName: 'Trần Thị B',
		serviceName: 'Cân bằng lốp',
		waitMinutes: 35,
		status: 'Waiting',
		speedHint: 'Fast (10-20 phút)',
	},
	{
		id: 'q-3',
		source: 'BOOKING',
		licensePlate: '51C-111.22',
		customerName: 'Lê Văn C',
		serviceName: 'Sửa phanh',
		waitMinutes: 20,
		status: 'Waiting',
		speedHint: '',
	},
	{
		id: 'q-4',
		source: 'WALKIN',
		licensePlate: '60D-333.44',
		customerName: 'Phạm Thị D',
		serviceName: 'Kiểm tra động cơ',
		waitMinutes: 50,
		status: 'Waiting',
		speedHint: '',
	},
];

function sourceLabel(source) {
	return String(source || '').toUpperCase() === 'WALKIN' ? 'Walk-in' : 'Booking online';
}

function waitTone(minutes) {
	const m = Number(minutes);
	if (!Number.isFinite(m)) return 'neutral';
	if (m > 45) return 'danger';
	if (m > 30) return 'warning';
	if (m < 15) return 'success';
	return 'neutral';
}

export default function QueueManagement() {
	useScrollToTop();

	const notify = (message) => toast(message, { containerId: 'app-toast' });

	const [queue, setQueue] = useState(MOCK_QUEUE);
	const [dragId, setDragId] = useState('');

	const walkInCapacity = 2;
	const walkInCount = useMemo(
		() => queue.filter((q) => String(q.source).toUpperCase() === 'WALKIN').length,
		[queue],
	);
	const showCapacityWarning = walkInCount > walkInCapacity;

	const handleCancel = (id) => {
		setQueue((prev) => prev.filter((q) => q.id !== id));
		notify('Đã hủy đơn khỏi hàng đợi.');
	};

	const handleAssign = (id) => {
		const item = queue.find((q) => q.id === id);
		notify(item ? `Đã gán ${item.licensePlate} vào bay (mock).` : 'Đã gán vào bay (mock).');
	};

	const moveItem = (fromId, toId) => {
		if (!fromId || !toId || fromId === toId) return;
		setQueue((prev) => {
			const fromIndex = prev.findIndex((q) => q.id === fromId);
			const toIndex = prev.findIndex((q) => q.id === toId);
			if (fromIndex < 0 || toIndex < 0) return prev;

			const next = [...prev];
			const [moved] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, moved);
			return next;
		});
	};

	return (
		<div className={styles.page}>
			<h1 className={styles.pageTitle}>Quản lý hàng đợi</h1>

			{showCapacityWarning && (
				<div className={styles.capacityBanner}>
					Vượt capacity - Dòng nhận Walk-in
				</div>
			)}

			<div className={styles.layout}>
				<section className={styles.listCol}>
					<div className={styles.list}>
						{queue.map((item) => {
							const tone = waitTone(item.waitMinutes);
							return (
								<article
									key={item.id}
									className={styles.card}
									draggable
									onDragStart={(e) => {
										setDragId(item.id);
										e.dataTransfer.effectAllowed = 'move';
										e.dataTransfer.setData('text/plain', item.id);
									}}
									onDragOver={(e) => {
										e.preventDefault();
										e.dataTransfer.dropEffect = 'move';
									}}
									onDrop={(e) => {
										e.preventDefault();
										const from = e.dataTransfer.getData('text/plain') || dragId;
										moveItem(from, item.id);
										setDragId('');
									}}
								>
									<div className={styles.cardHeader}>
										<div className={styles.plate}>{item.licensePlate}</div>
										<span className={styles.sourcePill}>{sourceLabel(item.source)}</span>
									</div>

									<div className={styles.cardBody}>
										<div className={styles.infoGrid}>
											<div className={styles.infoItem}>
												<span className={styles.label}>Khách hàng:</span> {item.customerName}
											</div>
											<div className={styles.infoItem}>
												<span className={styles.label}>Dịch vụ:</span> {item.serviceName}
											</div>
											<div className={styles.infoItem}>
												<span className={styles.label}>Thời gian chờ:</span>
												<span className={`${styles.waitPill} ${styles['waitPill--' + tone]}`}>
													{item.waitMinutes} phút
												</span>
											</div>
											<div className={styles.infoItem}>
												<span className={styles.label}>Status:</span> {item.status}
											</div>
										</div>
									</div>

									{item.speedHint ? <div className={styles.hint}>{item.speedHint}</div> : null}

									<div className={styles.actionButtons}>
										<button type="button" className={styles.assignButton} onClick={() => handleAssign(item.id)}>
											Assign to Bay
										</button>
										<button type="button" className={styles.cancelButton} onClick={() => handleCancel(item.id)}>
											Hủy
										</button>
									</div>
							</article>
							);
						})}

						{queue.length === 0 && <div className={styles.empty}>Chưa có đơn nào trong hàng đợi.</div>}
					</div>
				</section>
			</div>
		</div>
	);
}

