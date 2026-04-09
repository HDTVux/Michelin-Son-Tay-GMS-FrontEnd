import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import styles from './ServiceTicketManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	fetchServiceTicketsPaged,
	fetchTicketAssignments,
	changeAdvisorByReceptionist,
	exportServiceTicketsManage,
	fetchAdvisorsWithWorkload,
} from '../../../services/serviceTicketService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { getServiceTicketStatusTextVi, getServiceTicketStatusTone, getStatusTextVi } from '../../../components/statusUtils.js';

export default function ServiceTicketManagement() {
	useScrollToTop();

	const navigate = useNavigate();
	const [tickets, setTickets] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [date, setDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [status, setStatus] = useState('');
	const [search, setSearch] = useState('');
	const [totalPages, setTotalPages] = useState(1);
	const [totalElements, setTotalElements] = useState(0);
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [isExporting, setIsExporting] = useState(false);

	const [modal, setModal] = useState({ open: false, ticket: null });
	const [modalAssignments, setModalAssignments] = useState([]);
	const [modalLoading, setModalLoading] = useState(false);
	const [modalError, setModalError] = useState('');
	const [modalSuccess, setModalSuccess] = useState('');
	const [advisorOptions, setAdvisorOptions] = useState([]);
	const [workloadFilter, setWorkloadFilter] = useState('all'); // 'all' | 'least' | 'most'
	const [, setPageAssignments] = useState(new Map());

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	const getToken = () => localStorage.getItem('staffToken') || localStorage.getItem('authToken');

	const filters = useMemo(() => ({
		page,
		size,
		date: date || undefined,
		status: status || undefined,
		search: debouncedSearch || undefined,
	}), [page, size, date, status, debouncedSearch]);

	const loadData = useCallback(async () => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setError('Vui lòng đăng nhập.');
			setTickets([]);
			setIsLoading(false);
			return;
		}
		try {
			setIsLoading(true);
			const response = await fetchServiceTicketsPaged(filters, token);
			const pageData = response?.data;
			const list = Array.isArray(pageData?.content) ? pageData.content : [];
			setTickets(list);
			setTotalPages(Math.max(1, Number(pageData?.totalPages) || 1));
			setTotalElements(Math.max(0, Number(pageData?.totalElements) || 0));
			setError('');
		} catch (err) {
			setError(err?.message || 'Không thể tải danh sách phiếu.');
			setTickets([]);
		} finally {
			setIsLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Load technician assignments for all tickets on current page
	useEffect(() => {
		const token = getToken();
		if (!token || tickets.length === 0) return;

		const ticketIds = tickets
			.map((t) => {
				const id = Number(t?.serviceTicketId || t?.ticketId || t?.id);
				return Number.isFinite(id) && id > 0 ? id : null;
			})
			.filter(Boolean);

		if (ticketIds.length === 0) return;

		Promise.all(
			ticketIds.map(async (ticketId) => {
				try {
					const res = await fetchTicketAssignments(ticketId, token);
					const rawList = Array.isArray(res?.data) ? res.data : [];
					const hasTech = rawList.some(
						(a) =>
							String(a?.roleInTicket || a?.role || '').toUpperCase() === 'TECHNICIAN'
							&& String(a?.status || '').toUpperCase() !== 'CANCELLED',
					);
					return { ticketId, hasTech };
				} catch {
					return { ticketId, hasTech: false };
				}
			}),
		).then((rows) => {
			setPageAssignments((prev) => {
				const next = new Map(prev);
				for (const row of rows) {
					next.set(row.ticketId, row.hasTech);
				}
				return next;
			});
		});
	}, [tickets, page, size, date, status, debouncedSearch]);

	// Load advisors with workload for the change-advisor modal
	useEffect(() => {
		const token = getToken();
		if (!token) return;
		fetchAdvisorsWithWorkload(token)
			.then((res) => {
				setAdvisorOptions(Array.isArray(res?.data) ? res.data : []);
			})
			.catch(() => {
				setAdvisorOptions([]);
			});
	}, []);

	const openModal = async (ticket) => {
		setModal({ open: true, ticket });
		setModalAssignments([]);
		setModalError('');
		setModalSuccess('');

		const token = getToken();
		const ticketId = Number(ticket?.serviceTicketId || ticket?.ticketId || ticket?.id);
		if (!token || !Number.isFinite(ticketId) || ticketId <= 0) return;

		setModalLoading(true);
		try {
			const [assignRes] = await Promise.all([fetchTicketAssignments(ticketId, token)]);
			const assignments = Array.isArray(assignRes?.data) ? assignRes.data : [];
			setModalAssignments(assignments);
		} catch (err) {
			setModalError(err?.message || 'Không tải được dữ liệu phân công.');
		} finally {
			setModalLoading(false);
		}
	};

	const closeModal = () => {
		setModal({ open: false, ticket: null });
		setModalAssignments([]);
		setModalError('');
		setModalSuccess('');
	};

	const handleResetFilters = () => {
		setPage(0);
		setSize(10);
		setDate('');
		setEndDate('');
		setStatus('');
		setSearch('');
	};

	const handleExport = useCallback(async () => {
		if (isExporting) return;
		const token = getToken();
		if (!token) {
			setError('Vui lòng đăng nhập.');
			return;
		}
		const startDate = String(date || '').trim();
		const end = String(endDate || date || '').trim();
		if (!startDate || !end) {
			setError('Vui lòng chọn đủ Từ ngày và Đến ngày để export.');
			return;
		}

		try {
			setIsExporting(true);
			setError('');
			const { blob, filename } = await exportServiceTicketsManage({ startDate, endDate: end }, token);
			const safeName = String(filename || '').trim() || `service-tickets_${date || 'export'}_${endDate || date || 'export'}.xlsx`;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = safeName;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			setError(err?.message || 'Không thể export file.');
		} finally {
			setIsExporting(false);
		}
	}, [date, endDate, isExporting]);

	const currentAdvisor = modalAssignments.find((a) =>
		String(a?.roleInTicket || a?.role || '').toUpperCase() === 'ADVISOR'
		&& String(a?.status || '').toUpperCase() !== 'CANCELLED');

	const currentAdvisorName =
		currentAdvisor?.fullName || currentAdvisor?.staffName || modal.ticket?.advisorName || modal.ticket?.advisor?.fullName || '-';
	const isTicketDraftForReception = String(modal.ticket?.ticketStatus || '').toUpperCase() === 'DRAFT';
	const isAdvisorPendingForReception = String(currentAdvisor?.status || '').toUpperCase() === 'PENDING';
	const canReceptionistChangeAdvisor = isTicketDraftForReception && isAdvisorPendingForReception;

	const handleChangeAdvisorFromReception = async (newAdvisorId) => {
		const token = getToken();
		const ticketCode = String(modal.ticket?.ticketCode || '').trim();
		const ticketId = Number(modal.ticket?.serviceTicketId || modal.ticket?.ticketId || modal.ticket?.id);
		const currentAdvisorId = Number(currentAdvisor?.staffId || 0);
		const nextAdvisorId = Number(newAdvisorId);

		if (!token || !ticketCode) return;
		if (!Number.isFinite(nextAdvisorId) || nextAdvisorId <= 0) return;
		if (!Number.isFinite(ticketId) || ticketId <= 0) return;
		if (nextAdvisorId === currentAdvisorId) return;
		if (!canReceptionistChangeAdvisor) {
			setModalError('Chỉ lễ tân được đổi advisor khi phiếu đang ở trạng thái Nháp và advisor hiện tại đang ở trạng thái Chờ duyệt.');
			return;
		}

		setModalError('');
		setModalSuccess('');
		setModalLoading(true);
		try {
			await changeAdvisorByReceptionist(
				ticketCode,
				nextAdvisorId,
				'Đổi advisor từ màn lễ tân',
				token,
			);
			const assignRes = await fetchTicketAssignments(ticketId, token);
			setModalAssignments(Array.isArray(assignRes?.data) ? assignRes.data : []);
			setModalSuccess('Đã đổi cố vấn viên thành công.');
			await loadData();
		} catch (err) {
			setModalError(err?.message || 'Không thể đổi cố vấn viên.');
		} finally {
			setModalLoading(false);
		}
	};

	return (
		<div className={styles['booking-page']}>
			<div className={styles['booking-layout']}>
				<div className={styles['booking-left']}>
					<TicketPanel
						title="Quản lý phiếu dịch vụ"
						icon={<TicketIcon />}
						tone="warning"
						data={tickets}
						isLoading={isLoading}
						error={error}
						page={page}
						size={size}
						totalPages={totalPages}
						totalElements={totalElements}
						date={date}
						endDate={endDate}
						status={status}
						search={search}
						onChangePage={setPage}
						onChangeSize={(next) => { setSize(next); setPage(0); }}
						onChangeDate={(next) => { setDate(next); setPage(0); }}
						onChangeEndDate={(next) => { setEndDate(next); }}
						onChangeStatus={(next) => { setStatus(next); setPage(0); }}
						onChangeSearch={(next) => { setSearch(next); setPage(0); }}
						onResetFilters={handleResetFilters}
						onExport={handleExport}
						isExporting={isExporting}
						onViewDetail={(ticket) => {
							const code = String(ticket?.ticketCode || '').trim();
							if (!code) { setError('Phiếu này chưa có ticketCode.'); return; }
							navigate(`/service-ticket-detail/${encodeURIComponent(code)}`, { state: { ticket } });
						}}
						onOpenAssign={(ticket) => openModal(ticket)}
						actionLabel={`${totalElements} phiếu`}
					/>
				</div>
			</div>

			{modal.open && (
				<div className={styles['modal-overlay']} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
					<div className={styles['modal-box']}>
						<div className={styles['modal-header']}>
							<h3>Xem phân công</h3>
							<button className={styles['modal-close']} onClick={closeModal}>×</button>
						</div>

						<div className={styles['modal-body']}>
							<p className={styles['modal-info']}>
								<strong>Phiếu:</strong> {modal.ticket?.ticketCode || '-'}
								{' | '}
								<strong>Trạng thái:</strong>{' '}
								{getServiceTicketStatusTextVi(modal.ticket?.ticketStatus, modal.ticket?.ticketStatus || '-')}
							</p>
							{modalError && <div className={styles['error-banner']}>{modalError}</div>}
							{modalSuccess && <div className={styles['success-banner']}>{modalSuccess}</div>}
							{modalLoading && <div className={styles['empty-text']}>Đang tải phân công...</div>}

							{modal.ticket && !modalLoading && (
								<div className={styles['assign-section']}>
									<h4 className={styles['section-title']}>Cố vấn viên được giao</h4>
									<div className={styles['assign-card']}>
										<div className={styles['assign-info']}>
											<span className={styles['assign-name']}>{currentAdvisorName}</span>
											<span className={styles['assign-role']}>
												Cố vấn viên {currentAdvisor?.status ? `• ${getStatusTextVi(currentAdvisor.status, currentAdvisor.status)}` : ''}
											</span>
										</div>
									</div>

									{canReceptionistChangeAdvisor && advisorOptions.length > 0 && (
										<div className={styles['advisor-change-section']}>
											<div className={styles['workload-filter']}>
												<label>Lọc theo số phiếu:</label>
												<select
													value={workloadFilter}
													onChange={(e) => setWorkloadFilter(e.target.value)}
												>
													<option value="all">Tất cả</option>
													<option value="least">Ít phiếu nhất</option>
													<option value="most">Nhiều phiếu nhất</option>
												</select>
											</div>

											<div className={styles['advisor-list']}>
												{(() => {
													let filtered = [...advisorOptions];
													if (workloadFilter === 'least') {
														filtered.sort((a, b) => a.currentTicketCount - b.currentTicketCount);
													} else if (workloadFilter === 'most') {
														filtered.sort((a, b) => b.currentTicketCount - a.currentTicketCount);
													}

													return filtered.map((advisor) => {
														const isCurrent = Number(advisor.staffId) === Number(currentAdvisor?.staffId || 0);
														return (
															<div
																key={advisor.staffId}
																className={`${styles['advisor-card']} ${isCurrent ? styles['advisor-card--current'] : ''}`}
															>
																<div className={styles['advisor-info']}>
																	<span className={styles['advisor-name']}>
																		{advisor.fullName || `NV-${advisor.staffId}`}
																		{isCurrent && <span className={styles['current-tag']}> (Hiện tại)</span>}
																	</span>
																	<span className={styles['advisor-phone']}>
																		{advisor.phone || 'Không có SĐT'}
																	</span>
																</div>
																<div className={styles['workload-badge']}>
																	<span className={`${styles['workload-count']} ${advisor.isBusy ? styles['workload--busy'] : styles['workload--free']}`}>
																		{advisor.currentTicketCount ?? 0} phiếu
																	</span>
																</div>
																<button
																	className={styles['assign-btn']}
																	onClick={() => handleChangeAdvisorFromReception(advisor.staffId)}
																	disabled={modalLoading || isCurrent}
																>
																	Đổi
																</button>
															</div>
														);
													});
												})()}
											</div>
										</div>
									)}

									{canReceptionistChangeAdvisor && advisorOptions.length === 0 && (
										<div className={styles['empty-text']}>Không có cố vấn viên nào.</div>
									)}
								</div>
							)}

							{!modal.ticket && (
								<div className={styles['empty-text']}>Không có dữ liệu phiếu.</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function TicketPanel({
	title, icon, tone, data, actionLabel,
	onViewDetail, onOpenAssign,
	isLoading, error,
	page, size, totalPages,
	date, endDate, status, search,
	onChangePage, onChangeSize,
	onChangeDate, onChangeEndDate, onChangeStatus,
	onChangeSearch, onResetFilters,
	onExport, isExporting,
}) {
	const toneClass = styles['booking-card--' + tone];
	const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1;
	const safePage = Number.isFinite(page) ? Math.min(Math.max(0, page), safeTotalPages - 1) : 0;

	const pageButtons = useMemo(() => {
		const max = 5;
		const last = safeTotalPages - 1;
		const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
		const items = [];
		for (let i = start; i <= Math.min(last, start + max - 1); i += 1) items.push(i);
		return items;
	}, [safePage, safeTotalPages]);

	return (
		<section className={`${styles['booking-card']} ${toneClass}`}>
			<div className={styles['booking-card__header']}>
				<div className={styles['booking-card__title']}>{icon} {title}</div>
				<button className={styles['ghost-button']}>{actionLabel}</button>
			</div>

			{error && <div className={styles['error-banner']}>{error}</div>}

			<div className={styles['pending-filters']}>
				<div className={styles['filter-card__labels']}>
					<span>Từ ngày</span>
					<span>Đến ngày</span>
					<span>Trạng thái</span>
				</div>
				<div className={styles['filter-card__controls']}>
					<input type="date" value={date} onChange={e => onChangeDate?.(e.target.value)} />
					<input type="date" value={endDate} onChange={e => onChangeEndDate?.(e.target.value)} />
					<select value={status} onChange={e => onChangeStatus?.(e.target.value)}>
						<option value="">Tất cả</option>
						<option value="DRAFT">Nháp</option>
						<option value="INSPECTION">Đang kiểm tra</option>
						<option value="PENDING">Chờ duyệt</option>
						<option value="IN_PROGRESS">Đang sửa chữa</option>
						<option value="COMPLETED">Hoàn tất</option>
						<option value="PAID">Đã thanh toán</option>
						<option value="CANCELLED">Đã hủy</option>
					</select>
					<div aria-hidden="true" />
				</div>
				<div className={styles['filter-card__actions']}>
					<div className={styles['search-box']}>
						<input placeholder="Tìm kiếm..." value={search} onChange={e => onChangeSearch?.(e.target.value)} />
						<SearchIcon />
					</div>
					<button className={styles['ghost-button']} onClick={onResetFilters}>Xóa bộ lọc</button>
					<button
						className={styles['primary-button']}
						onClick={onExport}
						disabled={Boolean(isExporting)}
					>
						{isExporting ? 'Đang xuất...' : 'Export'}
					</button>
				</div>
			</div>

			<div className={styles['booking-table__wrapper']}>
				<table className={styles['booking-table']}>
					<thead>
						<tr>
							<th>STT</th>
							<th>MÃ PHIẾU</th>
							<th>TÊN KHÁCH HÀNG</th>
							<th>SĐT</th>
							<th>BIỂN SỐ</th>
							<th>TRẠNG THÁI</th>
							<th>NGÀY HẸN</th>
							<th>THAO TÁC</th>
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr><td colSpan="8" className={styles['empty-row']}>Đang tải...</td></tr>
						)}
						{!isLoading && data.length === 0 && (
							<tr><td colSpan="8" className={styles['empty-row']}>Không có phiếu nào.</td></tr>
						)}
						{!isLoading && data.map((item, idx) => {
							const statusCode = item?.ticketStatus ?? item?.status;
							const tone = getServiceTicketStatusTone(statusCode, 'info');
							const displayStatus = getServiceTicketStatusTextVi(statusCode, String(statusCode || '-'));
							return (
								<tr key={item?.serviceTicketId ?? item?.ticketCode ?? idx}>
									<td>{idx + 1}</td>
									<td className={styles['ticket-code-cell']}>{item?.ticketCode || '-'}</td>
									<td>{item?.customerName || '-'}</td>
									<td>{item?.customerPhone || '-'}</td>
									<td>
										<span className={styles['license-plate']}>
											{item?.licensePlate || '-'}
										</span>
									</td>
									<td>
										<span className={`${styles['status-badge']} ${styles['status-badge--' + tone]}`}>{displayStatus}</span>
									</td>
									<td>
										{item?.booking?.scheduledDate
											? `${item.booking.scheduledDate} ${formatTimeHHmm(item?.booking?.scheduledTime)}`.trim()
											: (item?.scheduledDate
												? `${item.scheduledDate} ${formatTimeHHmm(item?.scheduledTime)}`.trim()
												: '-')}
									</td>
									<td>
										<div className={styles['action-buttons']}>
											<button className={styles['primary-button']} onClick={() => onViewDetail?.(item)}>Xem chi tiết</button>
											<button className={styles['assign-action-btn']} onClick={() => onOpenAssign?.(item)}>Xem phân công</button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className={styles['booking-card__footer']}>
				<div className={styles['page-size']}>
					<span>Hiển thị:</span>
					<select value={String(size)} onChange={e => onChangeSize?.(Number(e.target.value))}>
						<option value="10">10</option>
						<option value="20">20</option>
						<option value="50">50</option>
					</select>
				</div>
				<div className={styles.pagination}>
					<button className={styles['primary-button']} disabled={safePage <= 0 || isLoading} onClick={() => onChangePage?.(safePage - 1)}>Trước</button>
					{pageButtons.map(p => (
						<button
							key={p}
							className={p === safePage ? styles['ghost-button'] : `${styles['primary-button']} ${styles['is-ghost']}`}
							disabled={p === safePage || isLoading}
							onClick={() => onChangePage?.(p)}
						>{p + 1}</button>
					))}
					<button className={styles['primary-button']} disabled={safePage >= safeTotalPages - 1 || isLoading} onClick={() => onChangePage?.(safePage + 1)}>Sau</button>
				</div>
			</div>
		</section>
	);
}

TicketPanel.propTypes = {
	title: PropTypes.string, icon: PropTypes.node, tone: PropTypes.string,
	data: PropTypes.arrayOf(PropTypes.object), actionLabel: PropTypes.string,
	onViewDetail: PropTypes.func, onOpenAssign: PropTypes.func,
	isLoading: PropTypes.bool, error: PropTypes.string,
	page: PropTypes.number, size: PropTypes.number, totalPages: PropTypes.number,
	date: PropTypes.string,
	endDate: PropTypes.string,
	status: PropTypes.string, search: PropTypes.string,
	onChangePage: PropTypes.func, onChangeSize: PropTypes.func,
	onChangeDate: PropTypes.func,
	onChangeEndDate: PropTypes.func,
	onChangeStatus: PropTypes.func,
	onChangeSearch: PropTypes.func, onResetFilters: PropTypes.func,
	onExport: PropTypes.func,
	isExporting: PropTypes.bool,
};

function TicketIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
			<rect x="9" y="3" width="6" height="4" rx="1" />
			<line x1="9" y1="12" x2="15" y2="12" />
			<line x1="9" y1="16" x2="15" y2="16" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	);
}
