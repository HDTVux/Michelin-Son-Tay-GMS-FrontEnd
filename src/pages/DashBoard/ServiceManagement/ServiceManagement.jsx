import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';

function formatCurrencyVnd(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	if (!Number.isFinite(n)) return '-';
	return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

const MOCK_SERVICES = [
	{ code: 'SV-LOP-001', group: 'Lốp', detail: 'Thay lốp / Lốp du lịch', priceVnd: 1850000, unit: 'Cái' },
	{ code: 'SV-LOP-001', group: 'Lốp', detail: 'Vá lốp / Vá dùi', priceVnd: 120000, unit: 'Lần' },
	{ code: 'SV-LOP-001', group: 'Lốp', detail: 'Cân bằng động', priceVnd: 150000, unit: 'Lần' },
	{ code: 'SV-LOP-001', group: 'Lốp', detail: 'Đảo lốp', priceVnd: 100000, unit: 'Lần' },
	{ code: 'SV-THUOC-001', group: 'Căn chỉnh', detail: 'Cân chỉnh thước lái', priceVnd: 350000, unit: 'Lần' },
	{ code: 'SV-PHANH-001', group: 'Phanh', detail: 'Thay má phanh trước', priceVnd: 950000, unit: 'Bộ' },
	{ code: 'SV-PHANH-001', group: 'Phanh', detail: 'Thay dầu phanh', priceVnd: 280000, unit: 'Lần' },
	{ code: 'SV-PHANH-001', group: 'Phanh', detail: 'Vệ sinh phanh', priceVnd: 180000, unit: 'Lần' },
	{ code: 'SV-GAT-001', group: 'Gạt mưa', detail: 'Thay gạt mưa', priceVnd: 220000, unit: 'Cặp' },
	{ code: 'SV-NUOC-001', group: 'Nước rửa kính', detail: 'Châm nước rửa kính', priceVnd: 60000, unit: 'Lần' },
	{ code: 'SV-DAU-001', group: 'Dầu', detail: 'Thay dầu động cơ', priceVnd: 650000, unit: 'Lần' },
	{ code: 'SV-DAU-002', group: 'Dầu', detail: 'Thay lọc dầu động cơ', priceVnd: 180000, unit: 'Cái' },
	{ code: 'SV-LOC-001', group: 'Lọc', detail: 'Thay lọc gió động cơ', priceVnd: 220000, unit: 'Cái' },
	{ code: 'SV-LOC-002', group: 'Lọc', detail: 'Thay lọc gió điều hòa', priceVnd: 260000, unit: 'Cái' },
	{ code: 'SV-ACQUY-001', group: 'Ắc quy', detail: 'Thay ắc quy', priceVnd: 1650000, unit: 'Bình' },
	{ code: 'SV-NUOCMAT-001', group: 'Nước mát', detail: 'Thay nước mát', priceVnd: 320000, unit: 'Lần' },
	{ code: 'SV-KTAT-001', group: 'Kiểm tra', detail: 'Kiểm tra an toàn tổng quát', priceVnd: 0, unit: 'Lần' },
];

export default function ServiceManagement() {
	useScrollToTop();

	const [isLoading] = useState(false);
	const [error] = useState('');

	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	const filtered = useMemo(() => {
		const q = String(debouncedSearch || '').toLowerCase();
		if (!q) return MOCK_SERVICES;
		return MOCK_SERVICES.filter((s) => {
			const hay = `${s.code} ${s.group} ${s.detail} ${s.unit}`.toLowerCase();
			return hay.includes(q);
		});
	}, [debouncedSearch]);

	const totalElements = filtered.length;
	const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, size)));
	const safePage = Math.min(Math.max(0, page), totalPages - 1);

	const paged = useMemo(() => {
		const start = safePage * size;
		const end = start + size;
		return filtered.slice(start, end);
	}, [filtered, safePage, size]);

	const handleResetFilters = () => {
		setPage(0);
		setSize(10);
		setSearch('');
	};

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-layout']}>
				<div className={styles['service-left']}>
					<ServicePanel
						title="Danh sách dịch vụ"
						icon={<WrenchIcon />}
						data={paged}
						isLoading={isLoading}
						error={error}
						page={safePage}
						size={size}
						totalPages={totalPages}
						totalElements={totalElements}
						search={search}
						onChangePage={setPage}
						onChangeSize={(next) => {
							setSize(next);
							setPage(0);
						}}
						onChangeSearch={(next) => {
							setSearch(next);
							setPage(0);
						}}
						onResetFilters={handleResetFilters}
						actionLabel={`${totalElements} dịch vụ`}
					/>
				</div>
			</div>
		</div>
	);
}

function ServicePanel({
	title,
	icon,
	data,
	actionLabel,
	isLoading,
	error,
	page,
	size,
	totalPages,
	totalElements,
	search,
	onChangePage,
	onChangeSize,
	onChangeSearch,
	onResetFilters,
}) {
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
		<section className={styles['service-card']}>
			<div className={styles['service-card__header']}>
				<div className={styles['service-card__title']}>
					{icon} {title}
				</div>
				<button className={styles['ghost-button']}>{actionLabel}</button>
			</div>

			{error && <div className={styles['error-banner']}>{error}</div>}

			<div className={styles['pending-filters']}>
				<div className={styles['filter-card__actions']}>
					<div className={styles['search-box']}>
						<input
							placeholder="Tìm kiếm..."
							value={search}
							onChange={(e) => onChangeSearch?.(e.target.value)}
						/>
						<SearchIcon />
					</div>
					<button className={styles['ghost-button']} onClick={onResetFilters}>
						Xóa bộ lọc
					</button>
				</div>
				<p className={styles['filter-card__hint']}>(tìm kiếm theo cả mã, nhóm, phân loại, đơn vị tính)</p>
			</div>

			<div className={styles['service-table__wrapper']}>
				<table className={styles['service-table']}>
					<thead>
						<tr>
							<th>MÃ DỊCH VỤ</th>
							<th>NHÓM DỊCH VỤ</th>
							<th>CHI TIẾT / PHÂN LOẠI</th>
							<th>GIÁ (VNĐ)</th>
							<th>ĐƠN VỊ TÍNH</th>
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr>
								<td colSpan="5" className={styles['empty-row']}>
									Đang tải dữ liệu...
								</td>
							</tr>
						)}

						{!isLoading && totalElements === 0 && (
							<tr>
								<td colSpan="5" className={styles['empty-row']}>
									Không có dịch vụ nào.
								</td>
							</tr>
						)}

						{!isLoading && data.map((item) => (
							<tr key={item.code}>
								<td className={styles['link-cell']}>{item.code}</td>
								<td>{item.group}</td>
								<td>{item.detail}</td>
								<td className={styles['td-right']}>{item.priceVnd ? formatCurrencyVnd(item.priceVnd) : '-'}</td>
								<td>{item.unit}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className={styles['service-card__footer']}>
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

function WrenchIcon() {
	return (
		<svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path
				d="M14.7 6.1a5.3 5.3 0 0 0-6.9 6.9l-4.2 4.2a1.6 1.6 0 0 0 2.3 2.3l4.2-4.2a5.3 5.3 0 0 0 6.9-6.9l-2.4 2.4-2.9-.7-.7-2.9 2.4-2.4Z"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path
				d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
			<path
				d="M16.6 16.6 21 21"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</svg>
	);
}

ServicePanel.propTypes = {
	title: PropTypes.string.isRequired,
	icon: PropTypes.node,
	data: PropTypes.arrayOf(
		PropTypes.shape({
			code: PropTypes.string.isRequired,
			group: PropTypes.string,
			detail: PropTypes.string,
			priceVnd: PropTypes.number,
			unit: PropTypes.string,
		})
	).isRequired,
	actionLabel: PropTypes.string,
	isLoading: PropTypes.bool,
	error: PropTypes.string,
	page: PropTypes.number,
	size: PropTypes.number,
	totalPages: PropTypes.number,
	totalElements: PropTypes.number,
	search: PropTypes.string,
	onChangePage: PropTypes.func,
	onChangeSize: PropTypes.func,
	onChangeSearch: PropTypes.func,
	onResetFilters: PropTypes.func,
};
