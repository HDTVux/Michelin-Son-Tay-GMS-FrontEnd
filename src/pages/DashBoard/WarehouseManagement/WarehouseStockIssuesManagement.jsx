import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import { fetchWarehousesAll, fetchWarehouseStockIssues } from '../../../services/warehouseService.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseStockIssuesManagement.module.css';

const DEFAULT_WAREHOUSE_ID = 1;

const toWarehouseIdText = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
};

const getWarehouseIdText = (warehouse) =>
	toWarehouseIdText(warehouse?.warehouseId ?? warehouse?.warehouseID ?? warehouse?.id);

const STATUS_OPTIONS = [
	{ value: 'ALL', label: 'Tất cả' },
	{ value: 'DRAFT', label: getStatusTextVi('DRAFT') },
	{ value: 'CONFIRMED', label: getStatusTextVi('CONFIRMED') },
	{ value: 'CANCELLED', label: getStatusTextVi('CANCELLED') },
];

const extractIssues = (response) => {
	// apiClient.request() already returns parsed JSON.
	// Backend may wrap list payloads as: { success, message, data: { content: [] } }
	const root = response?.data?.data ?? response?.data ?? response;
	if (Array.isArray(root)) return root;

	const content = root?.content ?? root?.data?.content ?? root?.data;
	if (Array.isArray(content)) return content;

	return [];
};

const badgeClassByStatus = (status) => {
	const tone = getStatusTone(status, 'info');
	if (tone === 'success') return commonStyles.badgeSuccess;
	if (tone === 'warning') return commonStyles.badgeWarning;
	if (tone === 'danger') return commonStyles.badgeDanger;
	return commonStyles.badgeMuted;
};

export default function WarehouseStockIssues() {
	useScrollToTop();
	const navigate = useNavigate();

	const [warehouses, setWarehouses] = useState([]);
	const [warehouseLoading, setWarehouseLoading] = useState(false);
	const [warehouseIdInput, setWarehouseIdInput] = useState(String(DEFAULT_WAREHOUSE_ID));
	const [status, setStatus] = useState('ALL');
	const [issues, setIssues] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [warehouseError, setWarehouseError] = useState('');

	const fetchList = async (warehouseIdOverride) => {
		try {
			setLoading(true);
			setError('');
			const warehouseIdSource = warehouseIdOverride ?? warehouseIdInput ?? '';
			const warehouseId = toWarehouseIdText(warehouseIdSource);
			if (!warehouseId) {
				setIssues([]);
				setError('Vui lòng chọn kho.');
				return;
			}
			const params = { warehouseId };
			if (status && status !== 'ALL') params.status = status;
			const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
			const res = await fetchWarehouseStockIssues(params, token);
			setIssues(extractIssues(res));
		} catch (err) {
			setIssues([]);
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
					await fetchList(currentIdText);
					return;
				}

				const firstActive =
					list.find((w) => w?.isActive === true && getWarehouseIdText(w)) ||
					list.find((w) => getWarehouseIdText(w)) ||
					null;
				const nextId = getWarehouseIdText(firstActive) || String(DEFAULT_WAREHOUSE_ID);
				setWarehouseIdInput(String(nextId));
				await fetchList(String(nextId));
			} catch (err) {
				if (cancelled) return;
				setWarehouses([]);
				setWarehouseError(err?.message || 'Không thể tải danh sách kho.');
				await fetchList();
			} finally {
				if (!cancelled) setWarehouseLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const stats = useMemo(() => {
		const total = issues.length;
		const draft = issues.filter((row) => String(row?.status || '').toUpperCase() === 'DRAFT').length;
		const confirmed = issues.filter((row) => String(row?.status || '').toUpperCase() === 'CONFIRMED').length;
		return { total, draft, confirmed };
	}, [issues]);

	const selectedWarehouseLabel = useMemo(() => {
		const idText = toWarehouseIdText(warehouseIdInput);
		if (!idText) return '-';
		const w = warehouses.find((row) => getWarehouseIdText(row) === idText);
		if (!w) return idText;
		return (
			String(w?.warehouseName || w?.warehouseCode || w?.warehouseId || w?.warehouseID || w?.id || idText).trim() ||
			idText
		);
	}, [warehouseIdInput, warehouses]);

	return (
		<div className={commonStyles.page}>
			<div className={styles.wrapper}>
				<header className={commonStyles.header}>
					<div>
						<h1 className={commonStyles.title}>Quản lý phiếu xuất kho</h1>
						<p className={styles.helper}>Danh sách phiếu xuất kho theo kho và trạng thái.</p>
					</div>
				</header>

				<section className={commonStyles.statsGrid}>
					<article className={commonStyles.statCard}>
						<p className={commonStyles.statLabel}>Tổng phiếu</p>
						<p className={commonStyles.statValue}>{stats.total}</p>
					</article>
					<article className={commonStyles.statCard}>
						<p className={commonStyles.statLabel}>Nháp</p>
						<p className={commonStyles.statValue}>{stats.draft}</p>
					</article>
					<article className={commonStyles.statCard}>
						<p className={commonStyles.statLabel}>Đã xác nhận</p>
						<p className={commonStyles.statValue}>{stats.confirmed}</p>
					</article>
					<article className={commonStyles.statCard}>
						<p className={commonStyles.statLabel}>Kho đang lọc</p>
						<p className={commonStyles.statValue}>{selectedWarehouseLabel}</p>
					</article>
				</section>

				<section className={commonStyles.toolbar}>
					<div className={commonStyles.field}>
						<label htmlFor="stock-issue-warehouse">Kho</label>
						<select
							id="stock-issue-warehouse"
							className={commonStyles.select}
							value={warehouseIdInput}
							onChange={(e) => setWarehouseIdInput(e.target.value)}
							disabled={warehouseLoading}
						>
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
								<option value={warehouseIdInput}>{warehouseIdInput || '-'}</option>
							)}
						</select>
					</div>

					<div className={commonStyles.field}>
						<label htmlFor="stock-issue-status">Trạng thái</label>
						<select
							id="stock-issue-status"
							className={commonStyles.select}
							value={status}
							onChange={(e) => setStatus(e.target.value)}
						>
							{STATUS_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className={commonStyles.actions}>
						<button type="button" className="ui-btn ui-btn--primary" onClick={() => fetchList()} disabled={loading}>
							{loading ? 'Đang tải...' : 'Lọc dữ liệu'}
						</button>
					</div>
				</section>

				{warehouseError ? <div className={commonStyles.error}>{warehouseError}</div> : null}

				{error ? <div className={commonStyles.error}>{error}</div> : null}

				<div className={commonStyles.tableWrap}>
					<table className={commonStyles.table}>
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
							{!loading && issues.length === 0 ? (
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
												<span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
											</td>
											<td>
												<button
													type="button"
													className="ui-btn ui-btn--ghost"
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
			</div>
		</div>
	);
}

