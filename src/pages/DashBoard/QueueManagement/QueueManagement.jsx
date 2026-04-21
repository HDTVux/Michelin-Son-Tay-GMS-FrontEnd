import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { buildDateOptions, formatDateTimeViNoSeconds, formatLocalDateYYYYMMDD, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, normalizeStatusCode } from '../../../components/statusUtils.js';
import { fetchAllSlots, fetchManagedBookingsPaged, fetchQueueBySlot, swapQueueBookings } from '../../../services/bookingService.js';
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

const isBookingConfirmed = (status) => {
	const s = String(status || '').trim().toUpperCase();
	return s === 'CONFIRMED' || s === 'COMPLETED';
};

const getQueueBookingDateISO = (item) => {
	const directDate = String(
		item?.scheduledDate
		|| item?.appointmentDate
		|| item?.bookingDate
		|| item?.booking?.scheduledDate
		|| '',
	).trim();
	const directMatch = directDate.match(/\d{4}-\d{2}-\d{2}/);
	if (directMatch) return directMatch[0];

	const dateTimeRaw = String(
		item?.appointmentAt
		|| item?.scheduledAt
		|| item?.booking?.appointmentAt
		|| item?.booking?.scheduledAt
		|| '',
	).trim();
	if (!dateTimeRaw) return '';

	const dateTimeMatch = dateTimeRaw.match(/\d{4}-\d{2}-\d{2}/);
	if (dateTimeMatch) return dateTimeMatch[0];

	const parsed = new Date(dateTimeRaw);
	return Number.isFinite(parsed.getTime()) ? formatLocalDateYYYYMMDD(parsed) : '';
};

const isQueueBookingToday = (item, todayISO) => getQueueBookingDateISO(item) === todayISO;

const DEFAULT_SLOT_CAPACITY = 6;

const getScheduleStateLabel = (state) => {
	if (state === 'full') return 'Đầy';
	return 'Còn chỗ';
};

const getScheduleBookingBadgeLabel = (item) => {
	const code = item?.bookingCode || item?.booking_code || item?.code;
	if (code) return String(code);
	const plate = item?.licensePlate || item?.plateNumber || item?.vehiclePlate || item?.vehicleNumber;
	if (plate) return String(plate);
	const id = item?.bookingId ?? item?.id;
	return id == null ? 'Booking' : `#${id}`;
};

const sortQueueList = (data) => {
	const list = Array.isArray(data) ? [...data] : [];
	list.sort((a, b) => {
		const byOrder = queueOrderKey(a) - queueOrderKey(b);
		if (byOrder !== 0) return byOrder;
		return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
	});
	return list;
};

async function collectManagedBookingsByDate({ dateISO, token }) {
	const size = 200;
	const maxPages = 10;
	const collected = [];

	for (let page = 0; page < maxPages; page++) {
		const res = await fetchManagedBookingsPaged({ page, size, date: dateISO }, token);
		const pageData = res?.data;
		const content = Array.isArray(pageData?.content) ? pageData.content : [];
		collected.push(...content);

		const totalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
		if (page >= totalPages - 1) break;
		if (content.length === 0) break;
	}

	return collected;
}

function countConfirmedBookingsByTime(bookings) {
	const list = Array.isArray(bookings) ? bookings : [];
	const nextMap = new Map();
	for (const item of list) {
		if (!isBookingConfirmed(item?.status)) continue;
		const key = formatTimeHHmm(item?.scheduledTime);
		if (!key) continue;
		nextMap.set(key, (nextMap.get(key) || 0) + 1);
	}
	return nextMap;
}

function groupConfirmedBookingsByTime(bookings) {
	const list = Array.isArray(bookings) ? bookings : [];
	const map = new Map();
	for (const item of list) {
		if (!isBookingConfirmed(item?.status)) continue;
		// Luôn chuẩn hóa về HH:mm để đồng bộ với slot startTime
		let key = '';
		if (item?.scheduledTime) {
			const m = String(item.scheduledTime).match(/^(\d{2}:\d{2})/);
			key = m ? m[1] : '';
		}
		if (!key) continue;
		const entry = map.get(key) || [];
		entry.push({
			bookingId: item?.bookingId ?? item?.id,
			bookingCode: item?.bookingCode ?? item?.booking_code ?? item?.code,
			status: item?.status,
			label: getScheduleBookingBadgeLabel(item),
		});
		map.set(key, entry);
	}
	return map;
}

function useSlotsData() {
	const [slots, setSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState('');

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

	return { slots, slotsLoading, slotsError };
}

function useScheduleData(dateISO) {
	const [scheduleLoading, setScheduleLoading] = useState(false);
	const [scheduleError, setScheduleError] = useState('');
	const [scheduleCountByTime, setScheduleCountByTime] = useState(() => new Map());
	const [scheduleBookingsByTime, setScheduleBookingsByTime] = useState(() => new Map());

	useEffect(() => {
		let active = true;
		const token = localStorage.getItem('authToken');
		const safeDate = String(dateISO || '').trim();
		if (!safeDate) {
			setScheduleCountByTime(new Map());
			setScheduleBookingsByTime(new Map());
			setScheduleError('');
			setScheduleLoading(false);
			return undefined;
		}
		if (!token) {
			setScheduleCountByTime(new Map());
			setScheduleBookingsByTime(new Map());
			setScheduleError('Vui lòng đăng nhập để xem lịch.');
			setScheduleLoading(false);
			return undefined;
		}

		setScheduleLoading(true);
		setScheduleError('');

		(async () => {
			try {
				const bookings = await collectManagedBookingsByDate({ dateISO: safeDate, token });
				const nextCountMap = countConfirmedBookingsByTime(bookings);
				const nextBookingsMap = groupConfirmedBookingsByTime(bookings);
				if (active) {
					setScheduleCountByTime(nextCountMap);
					setScheduleBookingsByTime(nextBookingsMap);
				}
			} catch (err) {
				if (active) {
					setScheduleCountByTime(new Map());
					setScheduleBookingsByTime(new Map());
					setScheduleError(err?.message || 'Không thể tải lịch theo ngày.');
				}
			} finally {
				if (active) setScheduleLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [dateISO]);

	return { scheduleLoading, scheduleError, scheduleCountByTime, scheduleBookingsByTime };
}

const renderQueueHeaderSection = ({ dateISO, slot, onBack }) => (
	<section className={styles.queueHeaderCard}>
		<div className={styles.queueHeaderRow}>
			<button type="button" className={styles.secondaryButton} onClick={onBack}>
				Quay lại lịch
			</button>
			<div className={styles.queueHeaderTitle}>
				Hàng đợi ngày {dateISO}{slot ? ` · ${formatTimeHHmm(slot)}` : ''}
			</div>
		</div>
	</section>
);

const renderScheduleSection = ({
	dateISO,
	scheduleLoading,
	scheduleError,
	slotsLoading,
	slotOptions,
	scheduleRows,
	onPickSlot,
	onOpenBookingDetail,
}) => (
	<section className={styles.scheduleCard}>
		<div className={styles.scheduleHeader}>
			<div className={styles.scheduleTitle}>Lịch slot ngày {dateISO}</div>
			<div className={styles.scheduleHint}>Bấm vào 1 khung giờ để xem và sắp xếp hàng đợi.</div>
		</div>
		{scheduleLoading ? <div className={styles.helpText}>Đang tải lịch...</div> : null}
		{!scheduleLoading && scheduleError ? <div className={styles.errorText}>{scheduleError}</div> : null}
		{slotOptions.length === 0 && !slotsLoading ? (
			<div className={styles.empty}>Không có khung giờ cho ngày này.</div>
		) : (
			<div className={styles.scheduleTableWrap}>
				<table className={styles.scheduleTable}>
					<thead>
						<tr>
							<th>Khung giờ</th>
							<th>Booking</th>
							<th>Đã đặt</th>
							<th>Trạng thái</th>
						</tr>
					</thead>
					<tbody>
						{scheduleRows.map((r) => (
							<tr
								key={r.key}
								className={`${styles.scheduleRow} ${styles['scheduleRow--' + r.state]}`}
								onClick={() => onPickSlot(r.startTime)}
								tabIndex={0}
								onKeyDown={(e) => {
									if (e.key !== 'Enter') return;
									onPickSlot(r.startTime);
								}}
							>
								<td>{r.time || '-'}</td>
								<td>
									<div className={styles.scheduleBadges}>
										{Array.isArray(r.bookings) && r.bookings.length > 0 ? (
											r.bookings.map((b) => (
												<button
													key={b?.bookingCode ?? b?.bookingId ?? b?.label}
													type="button"
													className={styles.scheduleBadge}
													onClick={(e) => {
													e.stopPropagation();
													onOpenBookingDetail(b);
												}}
													title="Xem chi tiết"
												>
													{b?.label || 'Booking'}
												</button>
											))
										) : (
											<span className={styles.scheduleBadgeEmpty}>Trống</span>
										)}
									</div>
								</td>
								<td>{r.quota}</td>
								<td>{getScheduleStateLabel(r.state)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)}
	</section>
);

const getQueueBookingStatusLabel = (item) => {
	const status = normalizeStatusCode(item?.status);
	return getBookingStatusTextVi(status, '-');
};

export default function QueueManagement() {
	useScrollToTop();
	const navigate = useNavigate();

	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const todayISO = useMemo(() => formatLocalDateYYYYMMDD(new Date()), []);
	const [dateISO, setDateISO] = useState(() => formatLocalDateYYYYMMDD(new Date()));
	const [slot, setSlot] = useState('');
	const { slots, slotsLoading, slotsError } = useSlotsData();

	const [queue, setQueue] = useState([]);
	const [queueLoading, setQueueLoading] = useState(false);
	const [queueError, setQueueError] = useState('');
	const { scheduleLoading, scheduleError, scheduleCountByTime, scheduleBookingsByTime } = useScheduleData(dateISO);
	const [scheduleHidden, setScheduleHidden] = useState(false);
	const [dragBookingId, setDragBookingId] = useState(null);
	const isDraggingRef = useRef(false);

	const dateOptions = useMemo(() => buildDateOptions(10), []);

	const slotOptions = useMemo(() => {
		const list = Array.isArray(slots) ? [...slots] : [];
		list.sort((a, b) => timeKey(a?.startTime).localeCompare(timeKey(b?.startTime)));
		return list;
	}, [slots]);

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
			setQueue(sortQueueList(res?.data));
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

	// const handleSetQueueAuto = useCallback(async () => {
	// 	if (!dateISO || !slot) {
	// 		notify('Vui lòng chọn ngày và khung giờ.');
	// 		return;
	// 	}
	// 	const token = localStorage.getItem('authToken');
	// 	if (!token) {
	// 		setQueueError('Vui lòng đăng nhập để thao tác.');
	// 		return;
	// 	}
	// 	try {
	// 		setQueueLoading(true);
	// 		setQueueError('');
	// 		const res = await setQueueAuto(dateISO, slot, token);
	// 		notify(res?.message || 'Đã tự động xếp hàng.');
	// 	} catch (err) {
	// 		const msg = err?.message || 'Không thể tự động xếp hàng.';
	// 		setQueueError(msg);
	// 		notify(msg);
	// 	} finally {
	// 		setQueueLoading(false);
	// 		// Always refresh from GET for display.
	// 		loadQueue({ silent: true });
	// 	}
	// }, [dateISO, loadQueue, notify, slot]);

	useEffect(() => {
		if (!scheduleHidden) return;
		if (slotsLoading) return;
		if (slotsError) return;
		if (!dateISO || !slot) return;
		loadQueue({ silent: true });
	}, [dateISO, loadQueue, scheduleHidden, slot, slotsError, slotsLoading]);

	const scheduleRows = useMemo(() => {
		const list = Array.isArray(slotOptions) ? slotOptions : [];
		const selectedKey = timeKey(slot);
		return list.map((s, index) => {
			const startTime = s?.startTime || '';
			const time = formatTimeHHmm(startTime);
			const capacityRaw = s?.capacity;
			const capacityNum = typeof capacityRaw === 'number' ? capacityRaw : Number(String(capacityRaw ?? '').trim());
			const capacity = Number.isFinite(capacityNum) ? capacityNum : DEFAULT_SLOT_CAPACITY;
			const current = time ? (scheduleCountByTime.get(time) || 0) : 0;
			const bookings = time ? (scheduleBookingsByTime.get(time) || []) : [];
			let state = 'ok';
			if (current >= capacity) state = 'full';
			if (time && selectedKey && time === selectedKey) state = 'selected';
			return {
				key: s?.slotId ?? `${startTime}-${index}`,
				startTime,
				time,
				current,
				capacity,
				quota: `${current}/${capacity}`,
				bookings,
				state,
			};
		});
	}, [scheduleBookingsByTime, scheduleCountByTime, slot, slotOptions]);

	const handlePickSlotFromSchedule = useCallback(
		(startTime) => {
			if (!startTime) return;
			setSlot(startTime);
			setScheduleHidden(true);
			loadQueue({ date: dateISO, slot: startTime, silent: true });
		},
		[dateISO, loadQueue],
	);

	const handleBackToSchedule = useCallback(() => {
		setScheduleHidden(false);
	}, []);

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
		if (!isQueueBookingToday(item, todayISO)) {
			notify('Chỉ có thể check-in booking có lịch hẹn trong ngày hôm nay.');
			return;
		}

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
						{/* <button
							type="button"
							className={styles.assignButton}
							onClick={handleSetQueueAuto}
							disabled={queueLoading || !dateISO || !slot}
						>
							{queueLoading ? 'Đang xử lý...' : 'Tự động xếp hàng'}
						</button> */}
					</div>
				</div>

				{slotsLoading ? <div className={styles.helpText}>Đang tải khung giờ...</div> : null}
				{slotsError ? <div className={styles.errorText}>{slotsError}</div> : null}
				{queueError ? <div className={styles.errorText}>{queueError}</div> : null}
			</section>

			{scheduleHidden ? (
				renderQueueHeaderSection({ dateISO, slot, onBack: handleBackToSchedule })
			) : (
				renderScheduleSection({
					dateISO,
					scheduleLoading,
					scheduleError,
					slotsLoading,
					slotOptions,
					scheduleRows,
					onPickSlot: handlePickSlotFromSchedule,
					onOpenBookingDetail: handleOpenBookingDetail,
				})
			)}

			{scheduleHidden ? (
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

										{isQueueBookingConfirmed(item) && isQueueBookingToday(item, todayISO) ? (
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
			) : null}
		</div>
	);
}

