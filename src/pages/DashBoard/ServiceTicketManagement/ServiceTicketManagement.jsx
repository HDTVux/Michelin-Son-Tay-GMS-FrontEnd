import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import styles from './ServiceTicketManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchServiceTicketsPaged } from '../../../services/serviceTicketService.js';
import { combineDateTime, formatDateTimeVi, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';

export default function ServiceTicketManagement() {
	useScrollToTop();

	const navigate = useNavigate();
	const [tickets, setTickets] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	// Query state (backend paging/filtering)
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [date, setDate] = useState(''); // yyyy-mm-dd
	const [status, setStatus] = useState('');
	const [search, setSearch] = useState('');

	// Server paging metadata
	const [totalPages, setTotalPages] = useState(1);
	const [totalElements, setTotalElements] = useState(0);

	// Debounce search to avoid spamming API
	const [debouncedSearch, setDebouncedSearch] = useState('');

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	const filters = useMemo(() => {
		return {
			page,
			size,
			date: date || undefined,
			status: status || undefined,
			search: debouncedSearch || undefined,
		};
	}, [page, size, date, status, debouncedSearch]);

	useEffect(() => {
		const token = localStorage.getItem('authToken');

		if (!token) {
			setError('Vui lòng đăng nhập để xem danh sách phiếu dịch vụ.');
			setTickets([]);
			setIsLoading(false);
			return;
		}

		const loadData = async () => {
			try {
				setIsLoading(true);
				const response = await fetchServiceTicketsPaged(filters, token);

				const pageData = response?.data;
				const list = Array.isArray(pageData?.content) ? pageData.content : [];
				const apiTotalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
				const apiTotalElements = Number.isFinite(pageData?.totalElements)
					? pageData.totalElements
					: list.length;

				setTickets(list);
				setTotalPages(Math.max(1, apiTotalPages));
				setTotalElements(Math.max(0, apiTotalElements));

				if (apiTotalPages > 0 && filters.page > apiTotalPages - 1) {
					setPage(Math.max(0, apiTotalPages - 1));
				}
				setError('');
			} catch (err) {
				const msg = err?.message || 'Không thể tải danh sách phiếu dịch vụ.';
				const isUnauthorized = err?.status === 401 || err?.status === 403;

				if (isUnauthorized) {
					localStorage.removeItem('authToken');
					setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
				} else {
					setError(msg);
				}
				setTickets([]);
				setTotalPages(1);
				setTotalElements(0);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [filters]);

	const handleResetFilters = () => {
		setPage(0);
		setSize(10);
		setDate('');
		setStatus('');
		setSearch('');
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
						onChangeSize={(next) => {
							setSize(next);
							setPage(0);
						}}
						onChangeDate={(next) => {
							setDate(next);
							setPage(0);
						}}
						onChangeStatus={(next) => {
							setStatus(next);
							setPage(0);
						}}
						onChangeSearch={(next) => {
							setSearch(next);
							setPage(0);
						}}
						onResetFilters={handleResetFilters}
						onViewDetail={(ticket) => {
							const code = String(ticket?.ticketCode || '').trim();
							if (!code) {
								setError('Phiếu này chưa có ticketCode nên không thể xem chi tiết.');
								return;
							}
							navigate(`/service-ticket/${encodeURIComponent(code)}`, { state: { ticket } });
						}}
						actionLabel={`${totalElements} phiếu`}
					/>
				</div>
			</div>
		</div>
	);
}

function TicketPanel({
	title,
	icon,
	tone,
	data,
	actionLabel,
	onViewDetail,
	isLoading,
	error,
	page,
	size,
	totalPages,
	date,
	status,
	search,
	onChangePage,
	onChangeSize,
	onChangeDate,
	onChangeStatus,
	onChangeSearch,
	onResetFilters,
}) {
	const toneClass = styles['booking-card--' + tone];

	const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1;
	const safePage = Number.isFinite(page) ? Math.min(Math.max(0, page), safeTotalPages - 1) : 0;

	const pageButtons = useMemo(() => {
		const maxButtons = 5;
		const current = safePage;
		const last = safeTotalPages - 1;
		const start = Math.max(0, Math.min(current - 2, last - (maxButtons - 1)));
		const end = Math.min(last, start + (maxButtons - 1));
		const items = [];
		for (let i = start; i <= end; i += 1) items.push(i);
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
					<input
						id="service-ticket-date"
						type="date"
						value={date}
						onChange={(e) => onChangeDate?.(e.target.value)}
					/>
					<select
						id="service-ticket-status"
						value={status}
						onChange={(e) => onChangeStatus?.(e.target.value)}
					>
						<option value="">Tất cả</option>
						<option value="CREATED">Created</option>
						<option value="DIAGNOSIS">Diagnosis</option>
						<option value="IN_PROGRESS">In Progress</option>
						<option value="COMPLETED">Completed</option>
					</select>
					<div aria-hidden="true" />
				</div>
				<div className={styles['filter-card__actions']}>
					<div className={styles['search-box']}>
						<input
							placeholder="Tìm kiếm..."
							value={search}
							onChange={(e) => onChangeSearch?.(e.target.value)}
						/>
						<SearchIcon />
					</div>
					<button className={styles['ghost-button']} onClick={onResetFilters}>Xóa bộ lọc</button>
				</div>
				<p className={styles['filter-card__hint']}>(tìm kiếm theo cả tên, mã, dịch vụ)</p>
			</div>

			<div className={styles['booking-table__wrapper']}>
				<table className={styles['booking-table']}>
					<thead>
						<tr>
							<th>STT</th>
							<th>TÊN KHÁCH HÀNG</th>
							<th>SỐ ĐIỆN THOẠI</th>
							<th>DỊCH VỤ</th>
							<th>TRẠNG THÁI</th>
							<th>THỜI GIAN TẠO</th>
							<th>THỜI GIAN HẸN</th>
							<th>THAO TÁC</th>
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr><td colSpan="8" className={styles['empty-row']}>Đang tải dữ liệu...</td></tr>
						)}

						{!isLoading && data.length === 0 && (
							<tr><td colSpan="8" className={styles['empty-row']}>Không có phiếu dịch vụ nào.</td></tr>
						)}

						{!isLoading && data.map((item, idx) => {
							const statusCode = item?.ticketStatus ?? item?.status;
							const tone = getStatusTone(statusCode, 'info');
							const displayStatus = getStatusTextVi(statusCode, String(statusCode || '-'));

							const createdAt = item?.receivedAt ?? item?.createdAt;
							const scheduled = combineDateTime(item?.scheduledDate, formatTimeHHmm(item?.scheduledTime));

							return (
								<tr key={item?.serviceTicketId ?? item?.ticketCode ?? idx}>
									<td className={styles['link-cell']}>{item?.ticketCode || item?.serviceTicketId || '-'}</td>
									<td>{item?.customerName || '-'}</td>
									<td>{item?.customerPhone || '-'}</td>
									<td>{item?.serviceCategory || '-'}</td>
									<td>
										<span className={`${styles['status-badge']} ${styles['status-badge--' + tone]}`}>
											{displayStatus}
										</span>
									</td>
									<td>{formatDateTimeVi(createdAt, '-')}</td>
									<td>{scheduled || '-'}</td>
									<td>
										<button
											className={styles['primary-button']}
											onClick={() => onViewDetail?.(item)}
										>
											Xem chi tiết
										</button>
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
					<select value={String(size)} onChange={(e) => onChangeSize?.(Number(e.target.value))}>
						<option value="10">10</option>
						<option value="20">20</option>
						<option value="50">50</option>
					</select>
				</div>
				<div className={styles.pagination}>
					<button
						className={styles['primary-button']}
						disabled={safePage <= 0 || isLoading}
						onClick={() => onChangePage?.(safePage - 1)}
					>
						Trước
					</button>

					{pageButtons.map((p) => {
						const isActive = p === safePage;
						return (
							<button
								key={p}
								className={isActive ? styles['ghost-button'] : `${styles['primary-button']} ${styles['is-ghost']}`}
								disabled={isActive || isLoading}
								onClick={() => onChangePage?.(p)}
							>
								{p + 1}
							</button>
						);
					})}

					<button
						className={styles['primary-button']}
						disabled={safePage >= safeTotalPages - 1 || isLoading}
						onClick={() => onChangePage?.(safePage + 1)}
					>
						Sau
					</button>
				</div>
			</div>
		</section>
	);
}

TicketPanel.propTypes = {
	title: PropTypes.string,
	icon: PropTypes.node,
	tone: PropTypes.string,
	data: PropTypes.arrayOf(PropTypes.object),
	actionLabel: PropTypes.string,
	onViewDetail: PropTypes.func,
	isLoading: PropTypes.bool,
	error: PropTypes.string,
	page: PropTypes.number,
	size: PropTypes.number,
	totalPages: PropTypes.number,
	date: PropTypes.string,
	status: PropTypes.string,
	search: PropTypes.string,
	onChangePage: PropTypes.func,
	onChangeSize: PropTypes.func,
	onChangeDate: PropTypes.func,
	onChangeStatus: PropTypes.func,
	onChangeSearch: PropTypes.func,
	onResetFilters: PropTypes.func,
};

function TicketIcon() { /* ... SVG Code ... */ }
function SearchIcon() { /* ... SVG Code ... */ }

