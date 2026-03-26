import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import styles from './ServiceTicketManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	fetchServiceTicketsPaged,
	fetchAvailableStaffWithWorkload,
	fetchTicketAssignments,
	assignStaff,
	cancelAssignment,
} from '../../../services/serviceTicketService.js';
import { combineDateTime, formatDateTimeVi, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';

export default function ServiceTicketManagement() {
	useScrollToTop();

	const navigate = useNavigate();
	const [tickets, setTickets] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	// Query state
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [date, setDate] = useState('');
	const [status, setStatus] = useState('');
	const [search, setSearch] = useState('');

	// Server paging metadata
	const [totalPages, setTotalPages] = useState(1);
	const [totalElements, setTotalElements] = useState(0);

	// Debounce search
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Modal phân công / xem phân công
	const [modal, setModal] = useState({ open: false, ticket: null, viewOnly: false });
	const [staffList, setStaffList] = useState([]);
	const [assignments, setAssignments] = useState([]);
	const [loadingModal, setLoadingModal] = useState(false);
	const [modalError, setModalError] = useState('');
	const [modalSuccess, setModalSuccess] = useState('');

	// Notify
	const notify = (msg) => {
		// eslint-disable-next-line no-alert
		alert(msg);
	};

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	const filters = useMemo(() => ({
		page,
		size,
		date: date || undefined,
		status: status || undefined,
		search: debouncedSearch || undefined,
	}), [page, size, date, status, debouncedSearch]);

	const loadData = async () => {
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
	};

	useEffect(() => {
		loadData();
	}, [filters]);

	// Mở modal: load phân công + advisor
	const openModal = async (ticket) => {
		setModal({ open: true, ticket, viewOnly: false });
		setModalError('');
		setModalSuccess('');
		setStaffList([]);
		setAssignments([]);
		setLoadingModal(true);

		const token = localStorage.getItem('authToken');
		try {
			// Load danh sách advisor có workload
			const res = await fetchAvailableStaffWithWorkload('ADVISOR', token);
			setStaffList(Array.isArray(res?.data) ? res.data : []);
			// Load danh sách phân công
			const assignRes = await fetchTicketAssignments(ticket.serviceTicketId, token);
			setAssignments(
				Array.isArray(assignRes?.data?.assignments)
					? assignRes.data.assignments
					: [],
			);
		} catch (err) {
			setModalError(err?.message || 'Không tải được dữ liệu.');
		} finally {
			setLoadingModal(false);
		}
	};

	const closeModal = () => {
		setModal({ open: false, ticket: null, viewOnly: false });
		setStaffList([]);
		setAssignments([]);
		setModalError('');
		setModalSuccess('');
	};

	// Gán advisor
	const handleAssign = async (advisor) => {
		const token = localStorage.getItem('authToken');
		const ticket = modal.ticket;
		setModalError('');
		setModalSuccess('');
		setLoadingModal(true);
		try {
			await assignStaff(ticket.serviceTicketId, {
				staffId: advisor.staffId,
				roleInTicket: 'ADVISOR',
				isPrimary: false,
				note: '',
			}, token);
			setModalSuccess(`Đã phân công cho ${advisor.fullName || `NV-${advisor.staffId}`}`);
			// Reload assignments
			const assignRes = await fetchTicketAssignments(ticket.serviceTicketId, token);
			setAssignments(
				Array.isArray(assignRes?.data?.assignments)
					? assignRes.data.assignments
					: [],
			);
			// Reload ticket list
			loadData();
		} catch (err) {
			setModalError(err?.message || 'Phân công thất bại.');
		} finally {
			setLoadingModal(false);
		}
	};

	// Hủy phân công
	const handleCancel = async (assignment) => {
		const token = localStorage.getItem('authToken');
		const ticket = modal.ticket;
		if (!window.confirm(`Hủy phân công cho ${assignment.staffName || 'nhân viên này'}?`)) return;
		setModalError('');
		setModalSuccess('');
		setLoadingModal(true);
		try {
			await cancelAssignment(ticket.serviceTicketId, assignment.assignmentId, token);
			setModalSuccess('Đã hủy phân công.');
			// Reload
			const assignRes = await fetchTicketAssignments(ticket.serviceTicketId, token);
			setAssignments(
				Array.isArray(assignRes?.data?.assignments)
					? assignRes.data.assignments
					: [],
			);
			loadData();
		} catch (err) {
			setModalError(err?.message || 'Hủy phân công thất bại.');
		} finally {
			setLoadingModal(false);
		}
	};

	const handleResetFilters = () => {
		setPage(0);
		setSize(10);
		setDate('');
		setStatus('');
		setSearch('');
	};

	// Kiểm tra ticket đã có phân công advisor chưa
	const hasAdvisorAssignment = (ticketId) => {
		// Hiện tại dựa vào ticket.status — khi có assignment trả về từ API thì dùng assignments
		// Tạm thời: chưa phân công → status = DRAFT, đã phân công → INSPECTION
		return false; // sẽ check từ API
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
						status={status}
						search={search}
						onChangePage={setPage}
						onChangeSize={(next) => { setSize(next); setPage(0); }}
						onChangeDate={(next) => { setDate(next); setPage(0); }}
						onChangeStatus={(next) => { setStatus(next); setPage(0); }}
						onChangeSearch={(next) => { setSearch(next); setPage(0); }}
						onResetFilters={handleResetFilters}
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

			{/* Modal Phân công / Xem phân công */}
			{modal.open && (
				<div className={styles['modal-overlay']} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
					<div className={styles['modal-box']}>
						<div className={styles['modal-header']}>
							<h3>Phân công phiếu</h3>
							<button className={styles['modal-close']} onClick={closeModal}>×</button>
						</div>

						<div className={styles['modal-body']}>
							<p className={styles['modal-info']}>
								<strong>Phiếu:</strong> {modal.ticket?.ticketCode || '-'}
								{' | '}
								<strong>Trạng thái:</strong>{' '}
								{getStatusTextVi(modal.ticket?.ticketStatus, modal.ticket?.ticketStatus || '-')}
							</p>

							{modalSuccess && <div className={styles['success-banner']}>{modalSuccess}</div>}
							{modalError && <div className={styles['error-banner']}>{modalError}</div>}

							{loadingModal && !modalSuccess && (
								<div className={styles['loading-text']}>Đang tải...</div>
							)}

							{/* Danh sách phân công hiện tại */}
							{assignments.length > 0 && (
								<div className={styles['assign-section']}>
									<h4 className={styles['section-title']}>Nhân viên đã phân công</h4>
									{assignments
										.filter(a => a.status === 'ACTIVE')
										.map(a => (
											<div key={a.assignmentId} className={styles['assign-card']}>
												<div className={styles['assign-info']}>
													<span className={styles['assign-name']}>{a.staffName || `NV-${a.staffId}`}</span>
													<span className={styles['assign-role']}>
														{a.roleInTicket === 'ADVISOR' ? 'Cố vấn viên' : 'Kỹ thuật viên'}
														{a.isPrimary ? ' (KTV chính)' : ''}
													</span>
												</div>
												<button
													className={styles['cancel-btn']}
													onClick={() => handleCancel(a)}
													disabled={loadingModal}
												>
													Hủy
												</button>
											</div>
										))}
								</div>
							)}

							{/* Danh sách nhân viên để phân công */}
							{!loadingModal && staffList.length > 0 && (
								<div className={styles['assign-section']}>
									<h4 className={styles['section-title']}>Chọn cố vấn viên</h4>
									{staffList.map(advisor => (
										<div key={advisor.staffId} className={styles['staff-card']}>
											<div className={styles['staff-info']}>
												<span className={styles['staff-name']}>
													{advisor.fullName || `NV-${advisor.staffId}`}
												</span>
												<span className={styles['staff-phone']}>{advisor.phone || ''}</span>
											</div>
											<div className={styles['workload-badge']}>
												<span className={advisor.isBusy ? styles['busy'] : styles['available']}>
													{advisor.workload || 0} phiếu
													{advisor.isBusy ? ' (bận)' : ' (rảnh)'}
												</span>
											</div>
											<button
												className={styles['assign-btn']}
												onClick={() => handleAssign(advisor)}
												disabled={loadingModal || advisor.isBusy}
											>
												Phân công
											</button>
										</div>
									))}
								</div>
							)}

							{!loadingModal && staffList.length === 0 && !modalError && (
								<div className={styles['empty-text']}>Không có cố vấn viên nào khả dụng.</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── TicketPanel ────────────────────────────────────────────
function TicketPanel({
	title, icon, tone, data, actionLabel,
	onViewDetail, onOpenAssign,
	isLoading, error,
	page, size, totalPages,
	date, status, search,
	onChangePage, onChangeSize,
	onChangeDate, onChangeStatus,
	onChangeSearch, onResetFilters,
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
					<span>Ngày hẹn</span>
					<span>Trạng thái</span>
					<span aria-hidden="true" />
				</div>
				<div className={styles['filter-card__controls']}>
					<input type="date" value={date} onChange={e => onChangeDate?.(e.target.value)} />
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
				</div>
			</div>

			<div className={styles['booking-table__wrapper']}>
				<table className={styles['booking-table']}>
					<thead>
						<tr>
							<th>STT</th>
							<th>Mã phiếu</th>
							<th>TÊN KHÁCH HÀNG</th>
							<th>SĐT</th>
							<th>TRẠNG THÁI</th>
							<th>THỜI GIAN TẠO</th>
							<th>THAO TÁC</th>
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr><td colSpan="7" className={styles['empty-row']}>Đang tải...</td></tr>
						)}
						{!isLoading && data.length === 0 && (
							<tr><td colSpan="7" className={styles['empty-row']}>Không có phiếu nào.</td></tr>
						)}
						{!isLoading && data.map((item, idx) => {
							const statusCode = item?.ticketStatus ?? item?.status;
							const tone = getStatusTone(statusCode, 'info');
							const displayStatus = getStatusTextVi(statusCode, String(statusCode || '-'));
							const isAssigned = statusCode && statusCode !== 'DRAFT';
							return (
								<tr key={item?.serviceTicketId ?? item?.ticketCode ?? idx}>
									<td>{item?.serviceTicketId || '-'}</td>
									<td>{item?.ticketCode || '-'}</td>
									<td>{item?.customerName || '-'}</td>
									<td>{item?.customerPhone || '-'}</td>
									<td>
										<span className={`${styles['status-badge']} ${styles['status-badge--' + tone]}`}>
											{displayStatus}
										</span>
									</td>
									<td>{formatDateTimeVi(item?.receivedAt || item?.createdAt, '-')}</td>
									<td>
										<div className={styles['action-buttons']}>
											<button className={styles['primary-button']} onClick={() => onViewDetail?.(item)}>
												Xem chi tiết
											</button>
											<button className={styles['assign-action-btn']} onClick={() => onOpenAssign?.(item)}>
												{isAssigned ? 'Xem phân công' : 'Phân công'}
											</button>
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
	date: PropTypes.string, status: PropTypes.string, search: PropTypes.string,
	onChangePage: PropTypes.func, onChangeSize: PropTypes.func,
	onChangeDate: PropTypes.func, onChangeStatus: PropTypes.func,
	onChangeSearch: PropTypes.func, onResetFilters: PropTypes.func,
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
