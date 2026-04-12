import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { buildDateOptions, formatDateTimeViNoSeconds, formatLocalDateYYYYMMDD, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, normalizeStatusCode } from '../../../components/statusUtils.js';
import { fetchAllSlots, fetchQueueBySlot, setQueueAuto, swapQueueBookings } from '../../../services/bookingService.js';
import styles from './QueueManagement.module.css';

const timeKey = (t) => formatTimeHHmm(t || '');

const queueOrderKey = (item) => {
	const n = Number(item?.queueOrder);
	return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const minutesSinceMidnight = (timeRaw) => {
	const parts = String(timeRaw || '').split(':');
	const hh = Number(parts[0] ?? 0);
	const mm = Number(parts[1] ?? 0);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Number.NaN;
	return hh * 60 + mm;
};

const pickCurrentSlotStartTime = (options, now = new Date()) => {
	const list = Array.isArray(options) ? options : [];
	if (list.length === 0) return '';
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	let picked = list[0]?.startTime || '';
	for (const s of list) {
		const start = minutesSinceMidnight(s?.startTime);
		if (!Number.isFinite(start)) continue;
		if (start <= nowMinutes) picked = s?.startTime || picked;
	}
	return picked;
};
const getQueueBookingTargetId = (item) => {
	const code = String(item?.bookingCode || item?.booking_code || '').trim();
	if (code) return code;
	const id = item?.bookingId ?? item?.id ?? null;
	return id == null ? '' : String(id);
};

const isQueueBookingConfirmed = (item) => String(item?.status || '').trim().toUpperCase() === 'CONFIRMED';

const getQueueBookingStatusLabel = (item) => {
	const status = normalizeStatusCode(item?.status);
	return getBookingStatusTextVi(status, '-');
};

export default function QueueManagement() {
	useScrollToTop();
	const navigate = useNavigate();

	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const [dateISO, setDateISO] = useState(() => formatLocalDateYYYYMMDD(new Date()));
	const [slot, setSlot] = useState('');
	const [slots, setSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState('');

	const [queue, setQueue] = useState([]);
	const [queueLoading, setQueueLoading] = useState(false);
	const [queueError, setQueueError] = useState('');
	const [dragBookingId, setDragBookingId] = useState(null);
	const didAutoLoadRef = useRef(false);
	const isDraggingRef = useRef(false);

	const dateOptions = useMemo(() => buildDateOptions(10), []);

	const slotOptions = useMemo(() => {
		const list = Array.isArray(slots) ? [...slots] : [];
		list.sort((a, b) => timeKey(a?.startTime).localeCompare(timeKey(b?.startTime)));
		return list;
	}, [slots]);

	useEffect(() => {
		let active = true;
		Promise.resolve().then(() => {
			if (!active) return;
			setSlotsLoading(true);
			setSlotsError('');
		});

			fetchAllSlots()
			.then((res) => {
				if (!active) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				const filtered = list.filter((s) => s && (s.isActive ?? true));
				filtered.sort((a, b) => timeKey(a?.startTime).localeCompare(timeKey(b?.startTime)));
				setSlots(filtered);
			})
			.catch((err) => {
				if (!active) return;
				setSlotsError(err?.message || 'Không thể tải khung giờ.');
				setSlots([]);
			})
			.finally(() => {
				if (active) setSlotsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const handlePickCurrentSlot = useCallback(() => {
		const todayISO = formatLocalDateYYYYMMDD(new Date());
		setDateISO(todayISO);
		const picked = pickCurrentSlotStartTime(slotOptions);
		setSlot(picked);
	}, [slotOptions]);

	const loadQueue = useCallback(async ({ date, slot: slotValue, silent } = {}) => {
		const dateParam = String(date ?? dateISO ?? '').trim();
		const slotParam = String(slotValue ?? slot ?? '').trim();
		const isSilent = Boolean(silent);

		if (!dateParam || !slotParam) {
			notify('Vui lòng chọn ngày và khung giờ.');
			return;
		}

		const token = localStorage.getItem('authToken');
		if (!token) {
			setQueue([]);
			setQueueError('Vui lòng đăng nhập để xem hàng đợi.');
			return;
		}

		setQueueLoading(true);
		setQueueError('');
		try {
			const res = await fetchQueueBySlot(dateParam, slotParam, token);
			const list = Array.isArray(res?.data) ? [...res.data] : [];
			list.sort((a, b) => {
				const byOrder = queueOrderKey(a) - queueOrderKey(b);
				if (byOrder !== 0) return byOrder;
				return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
			});
			setQueue(list);
			if (!isSilent && res?.message) notify(res.message);
		} catch (err) {
			const msg = err?.message || 'Không thể tải hàng đợi.';
			setQueueError(msg);
			setQueue([]);
			if (!isSilent) notify(msg);
		} finally {
			setQueueLoading(false);
		}
	}, [dateISO, notify, slot]);

	const handleSetQueueAuto = useCallback(async () => {
		if (!dateISO || !slot) {
			notify('Vui lòng chọn ngày và khung giờ.');
			return;
		}
		const token = localStorage.getItem('authToken');
		if (!token) {
			setQueueError('Vui lòng đăng nhập để thao tác.');
			return;
		}
		try {
			setQueueLoading(true);
			setQueueError('');
			const res = await setQueueAuto(dateISO, slot, token);
			notify(res?.message || 'Đã tự động xếp hàng.');
		} catch (err) {
			const msg = err?.message || 'Không thể tự động xếp hàng.';
			setQueueError(msg);
			notify(msg);
		} finally {
			setQueueLoading(false);
			// Always refresh from GET for display.
			loadQueue({ silent: true });
		}
	}, [dateISO, loadQueue, notify, slot]);

	useEffect(() => {
		// Auto pick current date + slot and fetch queue once.
		if (didAutoLoadRef.current) return;
		if (slotsLoading) return;
		if (slotsError) return;
		if (!slotOptions || slotOptions.length === 0) return;

		// If user already picked a slot before slots finished loading, don't override.
		if (String(slot || '').trim()) {
			didAutoLoadRef.current = true;
			return;
		}

		const todayISO = formatLocalDateYYYYMMDD(new Date());
		const picked = pickCurrentSlotStartTime(slotOptions);
		if (!picked) return;

		didAutoLoadRef.current = true;
		setDateISO(todayISO);
		setSlot(picked);
	}, [slot, slotOptions, slotsError, slotsLoading]);

	useEffect(() => {
		if (slotsLoading) return;
		if (slotsError) return;
		if (!dateISO || !slot) return;
		loadQueue({ silent: true });
	}, [dateISO, loadQueue, slot, slotsError, slotsLoading]);

	const applySwapLocal = (fromId, toId) => {
		setQueue((prev) => {
			const fromIndex = prev.findIndex((q) => Number(q?.bookingId) === Number(fromId));
			const toIndex = prev.findIndex((q) => Number(q?.bookingId) === Number(toId));
			if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
			const next = [...prev];
			const [moved] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, moved);
			// Re-number queueOrder in UI for clarity
			return next.map((item, idx) => ({ ...item, queueOrder: idx + 1 }));
		});
	};

	const handleSwap = async (fromId, toId) => {
		if (!fromId || !toId || Number(fromId) === Number(toId)) return;
		try {
			const token = localStorage.getItem('authToken');
			const res = await swapQueueBookings(Number(fromId), Number(toId), token || undefined);
			const list = Array.isArray(res?.data) ? [...res.data] : null;
			if (list) {
				list.sort((a, b) => {
					const byOrder = queueOrderKey(a) - queueOrderKey(b);
					if (byOrder !== 0) return byOrder;
					return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
				});
				setQueue(list);
			} else {
				applySwapLocal(fromId, toId);
			}
			notify(res?.message || 'Đã đổi vị trí trong hàng đợi.');
		} catch (err) {
			const msg = err?.message || 'Không thể đổi vị trí.';
			notify(msg);
		}
	};

	const handleOpenBookingDetail = useCallback((item) => {
		const targetId = getQueueBookingTargetId(item);
		if (!targetId) {
			notify('Không tìm thấy mã booking để xem chi tiết.');
			return;
		}
		navigate(`/booking-management/${encodeURIComponent(String(targetId))}`);
	}, [navigate, notify]);

	const handleCheckIn = (item) => {
		const bookingId = item?.bookingId ?? item?.id ?? null;
		const bookingCode = item?.bookingCode ?? '';
		const customerPhone = item?.customer?.phone || item?.phone || '-';
		const appointmentAt = item?.appointmentAt || ((item?.scheduledDate && item?.scheduledTime) ? `${String(item.scheduledDate).trim()}T${String(item.scheduledTime).trim()}` : null);

		navigate('/check-in', {
			state: {
				bookingCode,
				bookingId,
				booking: {
					bookingId,
					bookingCode,
					customerPhone,
					appointmentAt,
				},
			},
		});
	};

	return (
		<div className={styles.page}>
			<h1 className={styles.pageTitle}>Quản lý hàng đợi</h1>

			<section className={styles.controlsCard}>
				<div className={styles.controlsRow}>
					<div className={styles.control}>
						<label className={styles.label} htmlFor="queue-date">Ngày</label>
						<select
							id="queue-date"
							className={styles.input}
							value={dateISO}
							onChange={(e) => setDateISO(e.target.value)}
						>
							{dateOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					<div className={styles.control}>
						<label className={styles.label} htmlFor="queue-slot">Khung giờ</label>
						<select
							id="queue-slot"
							className={styles.input}
							value={slot}
							onChange={(e) => setSlot(e.target.value)}
							disabled={slotsLoading || !!slotsError || slotOptions.length === 0}
						>
							{slotOptions.length === 0 ? (
								<option value="">Không có khung giờ</option>
							) : (
								slotOptions.map((s, idx) => (
									<option key={s?.slotId ?? s?.startTime ?? String(idx)} value={s?.startTime || ''}>
										{formatTimeHHmm(s?.startTime)}
									</option>
								))
							)}
						</select>
					</div>

					<div className={styles.controlAction}>
						<button
							type="button"
							className={styles.secondaryButton}
							onClick={handlePickCurrentSlot}
							disabled={slotsLoading || slotOptions.length === 0}
						>
							Lấy khung giờ hiện tại
						</button>
					</div>

					<div className={styles.controlAction}>
						<button
							type="button"
							className={styles.assignButton}
							onClick={handleSetQueueAuto}
							disabled={queueLoading || !dateISO || !slot}
						>
							{queueLoading ? 'Đang xử lý...' : 'Tự động xếp hàng'}
						</button>
					</div>
				</div>

				{slotsLoading ? <div className={styles.helpText}>Đang tải khung giờ...</div> : null}
				{slotsError ? <div className={styles.errorText}>{slotsError}</div> : null}
				{queueError ? <div className={styles.errorText}>{queueError}</div> : null}
			</section>

			<div className={styles.layout}>
				<section className={styles.listCol}>
					<div className={styles.list}>
						{queue.map((item, idx) => (
							<article
								key={item?.bookingId ?? item?.bookingCode ?? String(idx)}
								className={styles.card}
								draggable
								onDragStart={(e) => {
									const id = item?.bookingId;
									isDraggingRef.current = true;
									setDragBookingId(id ?? null);
									e.dataTransfer.effectAllowed = 'move';
									e.dataTransfer.setData('text/plain', String(id ?? ''));
								}}
								onDragEnd={() => {
									isDraggingRef.current = false;
								}}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = 'move';
								}}
								onDrop={(e) => {
									e.preventDefault();
									const fromRaw = e.dataTransfer.getData('text/plain') || String(dragBookingId ?? '');
									const fromId = Number(fromRaw);
									const toId = Number(item?.bookingId);
									isDraggingRef.current = false;
									setDragBookingId(null);
									if (!Number.isFinite(fromId) || !Number.isFinite(toId)) return;
									handleSwap(fromId, toId);
								}}
							>
								<div className={styles.cardHeader}>
									<div className={styles.plate}>
										#{item?.queueOrder ?? '-'} · {item?.bookingCode || `Booking #${item?.bookingId ?? '-'}`}
									</div>
									<span className={styles.sourcePill}>{getQueueBookingStatusLabel(item)}</span>
								</div>

								<div className={styles.cardBody}>
									<div className={styles.infoGrid}>
										<div className={styles.infoItem}>
											<span className={styles.label}>Lịch:</span>
											{formatTimeHHmm(item?.scheduledTime) || '-'} {item?.scheduledDate || ''}
										</div>
										<div className={styles.infoItem}>
											<span className={styles.label}>Tạo lúc:</span> {formatDateTimeViNoSeconds(item?.createdAt)}
										</div>
										<div className={styles.infoItem}>
											<span className={styles.label}>Khách:</span> {item?.customer?.fullName || item?.fullName || item?.name || '-'}
										</div>
										<div className={styles.infoItem}>
											<span className={styles.label}>SĐT:</span> {item?.customer?.phone || item?.phone || '-'}
										</div>
										<div className={styles.infoItem}>
											<span className={styles.label}>Ghi chú:</span> {item?.description || '-'}
										</div>
									</div>

									<div className={styles.actionButtons}>
										<button
											type="button"
											className={styles.secondaryButton}
											onClick={() => handleOpenBookingDetail(item)}
										>
											Chi tiết
										</button>

										{isQueueBookingConfirmed(item) ? (
										<button
											type="button"
											className={styles.secondaryButton}
											onClick={(e) => {
											e.stopPropagation();
											handleCheckIn(item);
										}}
										>
											Check-in
										</button>
										) : null}
									</div>
								</div>
							</article>
						))}

						{queueLoading && queue.length === 0 ? (
							<div className={styles.empty}>Đang tải hàng đợi...</div>
						) : null}
						{!queueLoading && queue.length === 0 ? (
							<div className={styles.empty}>Chưa có booking nào trong khung giờ này.</div>
						) : null}
					</div>
				</section>
			</div>
		</div>
	);
}

