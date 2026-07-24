import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import { fetchWarehousesAll, fetchWarehouseStockIssues } from '../../../services/warehouseService.js';
import styles from './WarehouseStockIssuesManagement.module.css';

const DEFAULT_WAREHOUSE_ID = 1;
const DEFAULT_WAREHOUSE_LABEL = 'Kho Tổng';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const toWarehouseIdText = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
};

const getWarehouseIdText = (warehouse) =>
	toWarehouseIdText(warehouse?.warehouseId ?? warehouse?.warehouseID ?? warehouse?.id);

const normalizeSearchText = (value) =>
	String(value ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replaceAll(/[\u0300-\u036f]/g, '')
		.replaceAll('đ', 'd');

const pickDefaultWarehouseId = (list) => {
	const warehouses = Array.isArray(list) ? list : [];
	const defaultWarehouse =
		warehouses.find((w) => {
			const idText = getWarehouseIdText(w);
			if (!idText) return false;
			const name = normalizeSearchText(`${w?.warehouseName ?? ''} ${w?.warehouseCode ?? ''} ${w?.name ?? ''}`);
			return name.includes('kho tong') || name.includes('tong kho');
		}) ||
		warehouses.find((w) => getWarehouseIdText(w) === String(DEFAULT_WAREHOUSE_ID)) ||
		warehouses.find((w) => w?.isActive === true && getWarehouseIdText(w)) ||
		warehouses.find((w) => getWarehouseIdText(w)) ||
		null;

	return getWarehouseIdText(defaultWarehouse) || String(DEFAULT_WAREHOUSE_ID);
};

const STATUS_OPTIONS = [
	{ value: 'ALL', label: 'Tất cả' },
	{ value: 'DRAFT', label: getStatusTextVi('DRAFT') },
	{ value: 'CONFIRMED', label: getStatusTextVi('CONFIRMED') },
	{ value: 'CANCELLED', label: getStatusTextVi('CANCELLED') },
];

const extractIssuePage = (response) => {
	// apiClient.request() already returns parsed JSON.
	// Backend may wrap list payloads as: { success, message, data: { content: [] } }
	const root = response?.data?.data ?? response?.data ?? response;
	if (Array.isArray(root)) {
		return {
			content: root,
			totalElements: root.length,
			totalPages: 1,
		};
	}

	const content = root?.content ?? root?.data?.content ?? root?.data;
	if (Array.isArray(content)) {
		return {
			content,
			totalElements: Number(root?.totalElements ?? root?.data?.totalElements ?? content.length) || content.length,
			totalPages: Math.max(1, Number(root?.totalPages ?? root?.data?.totalPages ?? 1) || 1),
		};
	}

	return {
		content: [],
		totalElements: 0,
		totalPages: 1,
	};
};

const badgeClassByStatus = (status) => {
	const tone = getStatusTone(status, 'info');
	if (tone === 'success') return styles.statusSuccess;
	if (tone === 'warning') return styles.statusWarning;
	if (tone === 'danger') return styles.statusDanger;
	return styles.statusMuted;
};

export default function WarehouseStockIssues() {
	useScrollToTop();
	const navigate = useNavigate();

	const [warehouses, setWarehouses] = useState([]);
	const [warehouseLoading, setWarehouseLoading] = useState(false);
	const [warehouseIdInput, setWarehouseIdInput] = useState(String(DEFAULT_WAREHOUSE_ID));
	const [status, setStatus] = useState('ALL');
	const [search, setSearch] = useState('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [issues, setIssues] = useState([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [totalElements, setTotalElements] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [warehouseError, setWarehouseError] = useState('');

	const warehouseSelectValue = useMemo(() => {
		if (warehouseIdInput === 'ALL') return 'ALL';
		const currentIdText = toWarehouseIdText(warehouseIdInput);
		if (currentIdText && (!warehouses.length || warehouses.some((w) => getWarehouseIdText(w) === currentIdText))) {
			return currentIdText;
		}
		return pickDefaultWarehouseId(warehouses);
	}, [warehouseIdInput, warehouses]);

	const fetchList = async ({ warehouseIdOverride, pageOverride, sizeOverride } = {}) => {
		try {
			setLoading(true);
			setError('');
			const warehouseIdSource = warehouseIdOverride ?? warehouseSelectValue;
			const warehouseId = warehouseIdSource === 'ALL' ? 'ALL' : (toWarehouseIdText(warehouseIdSource) || pickDefaultWarehouseId(warehouses));
			if (!warehouseId) {
				setIssues([]);
				setTotalElements(0);
				setTotalPages(1);
				setError('Vui lòng chọn kho.');
				return;
			}
			if (warehouseId !== warehouseIdInput) {
				setWarehouseIdInput(warehouseId);
			}
			const nextPage = Number.isFinite(pageOverride) ? pageOverride : page;
			const nextSize = Number.isFinite(sizeOverride) ? sizeOverride : size;
			const params = { page: nextPage, size: nextSize };
			if (warehouseId && warehouseId !== 'ALL') params.warehouseId = warehouseId;
			if (status && status !== 'ALL') params.status = status;
			if (search) params.search = search.trim();
			if (fromDate) params.fromDate = fromDate;
			if (toDate) params.toDate = toDate;
			const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
			const res = await fetchWarehouseStockIssues(params, token);
			const pageData = extractIssuePage(res);
			setIssues(pageData.content);
			setTotalElements(pageData.totalElements);
			setTotalPages(pageData.totalPages);
		} catch (err) {
			setIssues([]);
			setTotalElements(0);
			setTotalPages(1);
			setError(err?.message || 'Không thể tải danh sách phiếu xuất kho.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setWarehouseLoading(true);
				setWarehouseError('');
				const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
				const res = await fetchWarehousesAll(token);
				const payload = res?.data?.data ?? res?.data ?? res;
				const list = Array.isArray(payload) ? payload : [];
				if (cancelled) return;
				setWarehouses(list);

				const currentIdText = toWarehouseIdText(warehouseIdInput);
				const hasCurrent = Boolean(currentIdText) && list.some((w) => getWarehouseIdText(w) === currentIdText);
				if (hasCurrent) {
					return;
				}

				const nextId = pickDefaultWarehouseId(list);
				setWarehouseIdInput(String(nextId));
			} catch (err) {
				if (cancelled) return;
				setWarehouses([]);
				setWarehouseError(err?.message || 'Không thể tải danh sách kho.');
			} finally {
				if (!cancelled) setWarehouseLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const warehouseId = warehouseSelectValue;
		if (!warehouseId) return;

		const timer = setTimeout(() => {
			fetchList({ warehouseIdOverride: warehouseId, pageOverride: page, sizeOverride: size });
		}, 300);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [warehouseSelectValue, status, search, fromDate, toDate, page, size]);

	const stats = useMemo(() => {
		const total = totalElements;
		const draft = issues.filter((row) => String(row?.status || '').toUpperCase() === 'DRAFT').length;
		const confirmed = issues.filter((row) => String(row?.status || '').toUpperCase() === 'CONFIRMED').length;
		return { total, draft, confirmed };
	}, [issues, totalElements]);

	const safePage = Math.min(Math.max(0, page), Math.max(1, totalPages) - 1);
	const pageButtons = useMemo(() => {
		const max = 5;
		const last = Math.max(1, totalPages) - 1;
		const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
		const result = [];
		for (let i = start; i <= Math.min(last, start + max - 1); i += 1) result.push(i);
		return result;
	}, [safePage, totalPages]);

	const goToPage = (nextPage) => {
		const safeNext = Math.min(Math.max(0, nextPage), Math.max(1, totalPages) - 1);
		setPage(safeNext);
		fetchList({ warehouseIdOverride: warehouseSelectValue, pageOverride: safeNext });
	};

	const changePageSize = (nextSize) => {
		setSize(nextSize);
		setPage(0);
		fetchList({ warehouseIdOverride: warehouseSelectValue, pageOverride: 0, sizeOverride: nextSize });
	};

	const selectedWarehouseLabel = useMemo(() => {
		const idText = warehouseSelectValue;
		if (idText === 'ALL') return 'Tất cả kho';
		if (!idText) return '-';
		const w = warehouses.find((row) => getWarehouseIdText(row) === idText);
		if (!w && idText === String(DEFAULT_WAREHOUSE_ID)) return DEFAULT_WAREHOUSE_LABEL;
		if (!w) return idText;
		return (
			String(w?.warehouseName || w?.warehouseCode || w?.warehouseId || w?.warehouseID || w?.id || idText).trim() ||
			idText
		);
	}, [warehouseSelectValue, warehouses]);

	return (
		<div className={styles.bookingPage}>
			<div className={styles.wrapper}>
				<header className={styles.bookingHeader}>
					<div className={styles.bookingHeaderTitle}>
						<span className={styles.headerIcon} aria-hidden="true">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
								<path d="M3.3 7 12 12l8.7-5M12 22V12" />
							</svg>
						</span>
						<div>
							<h1>Quản lý phiếu xuất kho</h1>
						<p className={styles.helper}>Danh sách phiếu xuất kho theo kho và trạng thái.</p>
						</div>
					</div>
					<div className={styles.headerActions}>
						<span className={styles.totalCount}>{stats.total} phiếu</span>
					</div>
				</header>

				<section className={styles.statsGrid}>
					<article className={styles.statCard}>
						<p className={styles.statLabel}>Tổng phiếu</p>
						<p className={styles.statValue}>{stats.total}</p>
					</article>
					<article className={styles.statCard}>
						<p className={styles.statLabel}>Nháp</p>
						<p className={styles.statValue}>{stats.draft}</p>
					</article>
					<article className={styles.statCard}>
						<p className={styles.statLabel}>Đã xác nhận</p>
						<p className={styles.statValue}>{stats.confirmed}</p>
					</article>
					<article className={styles.statCard}>
						<p className={styles.statLabel}>Kho đang lọc</p>
						<p className={styles.statValue}>{selectedWarehouseLabel}</p>
					</article>
				</section>

				<section className={styles.pendingFilters}>
					<div className={styles.filterCardControls}>
					<div className={styles.field}>
						<label htmlFor="stock-issue-warehouse">Kho</label>
						<select
							id="stock-issue-warehouse"
							className={styles.select}
							value={warehouseSelectValue}
							onChange={(e) => {
								setWarehouseIdInput(e.target.value);
								setPage(0);
							}}
							disabled={warehouseLoading}
						>
							<option value="ALL">Tất cả kho</option>
							{warehouses.length > 0 ? (
								warehouses
									.map((w) => {
										const idText = getWarehouseIdText(w);
										if (!idText) return null;
										return (
											<option key={idText} value={idText}>
												{String(
													w?.warehouseName ||
														w?.warehouseCode ||
														w?.name ||
														w?.warehouseId ||
														w?.warehouseID ||
														w?.id ||
														'',
												).trim() || '-'}
											</option>
										);
									})
									.filter(Boolean)
							) : (
								warehouseSelectValue !== 'ALL' && <option value={warehouseSelectValue || String(DEFAULT_WAREHOUSE_ID)}>{DEFAULT_WAREHOUSE_LABEL}</option>
							)}
						</select>
					</div>

					<div className={styles.field}>
						<label htmlFor="stock-issue-status">Trạng thái</label>
						<select
							id="stock-issue-status"
							className={styles.select}
							value={status}
							onChange={(e) => {
								setStatus(e.target.value);
								setPage(0);
							}}
						>
							{STATUS_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className={styles.field}>
						<label htmlFor="stock-issue-search">Tìm kiếm</label>
						<input
							type="text"
							id="stock-issue-search"
							className={styles.input}
							/* input style for search */
							placeholder="Mã phiếu..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(0);
							}}
						/>
					</div>

					<div className={styles.field}>
						<label htmlFor="stock-issue-from-date">Từ ngày</label>
						<input
							type="date"
							id="stock-issue-from-date"
							className={styles.input}
							value={fromDate}
							onChange={(e) => {
								setFromDate(e.target.value);
								setPage(0);
							}}
						/>
					</div>

					<div className={styles.field}>
						<label htmlFor="stock-issue-to-date">Đến ngày</label>
						<input
							type="date"
							id="stock-issue-to-date"
							className={styles.input}
							value={toDate}
							onChange={(e) => {
								setToDate(e.target.value);
								setPage(0);
							}}
						/>
					</div>
					</div>
				</section>

				{warehouseError ? <div className={styles.errorBanner}>{warehouseError}</div> : null}

				{error ? <div className={styles.errorBanner}>{error}</div> : null}

				<div className={styles.bookingCard}>
				<div className={styles.tableWrapper}>
					<table className={styles.bookingTable}>
						<thead>
							<tr>
								<th>STT</th>
								<th>Mã phiếu</th>
								<th>Kho xuất</th>
								<th>Phiếu dịch vụ</th>
								<th>Ngày tạo</th>
								<th>Trạng thái</th>
								<th>Hành động</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={7} className={styles.emptyCell}>
										Đang tải danh sách phiếu xuất kho...
									</td>
								</tr>
							) : issues.length === 0 ? (
								<tr>
									<td colSpan={7} className={styles.emptyCell}>
										Không có dữ liệu phiếu xuất kho.
									</td>
								</tr>
							) : (
								issues.map((row) => {
									const id = row?.issueId ?? 0;
									const statusValue = String(row?.status || '-').toUpperCase();
									const statusLabel = getStatusTextVi(statusValue, statusValue || '-');
									return (
										<tr key={String(id)}>
											<td>{id || '-'}</td>
											<td>{row?.issueCode || '-'}</td>
											<td>{row?.warehouseName || '-'}</td>
											<td>{row?.serviceTicketCode ?? '-'}</td>
											<td>{row?.createdAt || '-'}</td>
											<td>
												<span className={`${styles.statusBadge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
											</td>
											<td>
												<button
													type="button"
													className={`${styles.actionBtn} ${styles.viewBtn}`}
													onClick={() => navigate(`/warehouse-stock-issues/${id}`, { state: { issue: row } })}
												>
													Xem chi tiết
												</button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
				<div className={styles.bookingFooter}>
					<div className={styles.pageSize}>
						<span>Hiển thị:</span>
						<select id="stock-issue-page-size" value={String(size)} onChange={(e) => changePageSize(Number(e.target.value))}>
							{PAGE_SIZE_OPTIONS.map((option) => (
								<option key={option} value={option}>{option}</option>
							))}
						</select>
					</div>
					<div className={styles.pagination}>
						<button type="button" className={styles.primaryButton} disabled={safePage <= 0 || loading} onClick={() => goToPage(safePage - 1)}>
							Trước
						</button>
						{pageButtons.map((p) => (
							<button
								type="button"
								key={p}
								className={p === safePage ? styles.ghostButton : `${styles.primaryButton} ${styles.isGhost}`}
								disabled={p === safePage || loading}
								onClick={() => goToPage(p)}
							>
								{p + 1}
							</button>
						))}
						<button type="button" className={styles.primaryButton} disabled={safePage >= Math.max(1, totalPages) - 1 || loading} onClick={() => goToPage(safePage + 1)}>
							Sau
						</button>
					</div>
				</div>
				</div>
			</div>
		</div>
	);
}

