import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import ItemDetailModal from './ItemDetailModal.jsx';
import { searchWarehouseCatalogItems } from '../../../services/warehouseService.js';
import { formatCurrencyVnd, formatItemTypeLabel } from './itemFormatters.js';

const buildRowKeyWithIndex = (baseKey, idx) => `${String(baseKey ?? '')}-${idx}`;




export default function ServiceManagement() {
	useScrollToTop();
	const navigate = useNavigate();

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const [page, setPage] = useState(0);
	const [size, setSize] = useState(10);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [selectedItem, setSelectedItem] = useState(null);

	// Server data
	const [items, setItems] = useState([]);
	const [totalElementsServer, setTotalElementsServer] = useState(0);
	const [totalPagesServer, setTotalPagesServer] = useState(1);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	// Fetch catalog items from server whenever page/size/search changes
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setIsLoading(true);
				setError('');
				const token = localStorage.getItem('authToken');
				const params = { page, size };
				if (debouncedSearch) params.search = debouncedSearch;
				const res = await searchWarehouseCatalogItems(params, token);
				const payload = res?.data ?? res;
				const content = Array.isArray(payload?.content) ? payload.content : [];
				if (cancelled) return;
				setItems(content);
				setTotalElementsServer(Number(payload?.totalElements ?? content.length));
				setTotalPagesServer(Number(payload?.totalPages ?? Math.max(1, Math.ceil((payload?.totalElements ?? content.length) / Math.max(1, size)))));
			} catch (err) {
				if (cancelled) return;
				setError(err?.message || 'Không thể tải danh sách sản phẩm.');
				setItems([]);
				setTotalElementsServer(0);
				setTotalPagesServer(1);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [page, size, debouncedSearch]);

	const activeConfig = useMemo(
		() => ({
			title: 'Danh sách hạng mục (dịch vụ / phụ tùng)',
			data: items,
			columns: [
  				{ header: 'ID', get: (x) => x.itemId },
  				{ header: 'TÊN', get: (x) => x.itemName },
  				{ header: 'SKU', get: (x) => x.sku || '-' },
  				{ header: 'LOẠI', get: (x) => x.itemType, format: (raw) => formatItemTypeLabel(raw) },
  				{ header: 'HÃNG', get: (x) => x.brand || '-' },           // <-- Sửa lại lấy string
  				{ header: 'DÒNG SP', get: (x) => x.productLine || '-' },  // <-- Sửa lại lấy string
  				{		
    			header: 'GIÁ',
    			get: (x) => ({ showPrice: x.showPrice, price: x.price }),
    			format: (raw) => (raw?.showPrice ? `${formatCurrencyVnd(raw?.price)} ₫` : 'Liên hệ'),
  				},
  				{ header: 'ĐƠN VỊ', get: (x) => x.unit || '-' },
				],
			searchHint: '(tìm kiếm theo tên, SKU, loại, hãng, dòng sản phẩm)',
			searchHaystack: (x) => `${x.itemId} ${x.itemName} ${x.sku || ''} ${x.itemType || ''} ${x.brand || ''} ${x.productLine || ''}`,
			rowKey: (x, idx) => buildRowKeyWithIndex(x.itemId, idx),
		}),
		[items]
	);

	// Use server-side totals when available
	const totalElements = Number(totalElementsServer ?? (Array.isArray(items) ? items.length : 0));
	const totalPages = Math.max(1, Number(totalPagesServer ?? Math.max(1, Math.ceil(totalElements / Math.max(1, size)))));
	const safePage = Math.min(Math.max(0, page), totalPages - 1);

	const paged = useMemo(() => {
		return Array.isArray(items) ? items : [];
	}, [items]);

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
						title={activeConfig.title}
						icon={<WrenchIcon />}
						data={paged}
						columns={activeConfig.columns}
						rowKey={activeConfig.rowKey}
						onViewDetail={setSelectedItem}
						onAddProduct={() => navigate('/service-management/create-product')}
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
						actionLabel={`${totalElements} mục`}
						searchHint={activeConfig.searchHint}
					/>
				</div>
			</div>

			<ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
		</div>
	);
}

function ViewDetailButton({ onClick }) {
	return (
		<button type="button" className={styles['table-action-button']} onClick={onClick}>
			Xem chi tiết
		</button>
	);
}

function ServicePanel({
	title,
	icon,
	data,
	columns,
	rowKey,
	onViewDetail,
	onAddProduct,
	actionLabel,
	isLoading,
	error,
	page,
	size,
	totalPages,
	totalElements,
	search,
	searchHint,
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
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					{typeof onAddProduct === 'function' && (
						<button type="button" className={styles['primary-button']} onClick={onAddProduct}>
							Thêm sản phẩm
						</button>
					)}
					<button type="button" className={styles['ghost-button']} disabled>
						{actionLabel}
					</button>
				</div>
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
				<p className={styles['filter-card__hint']}>{searchHint || '(tìm kiếm theo mã, tên)'}</p>
			</div>

			<div className={styles['service-table__wrapper']}>
				<table className={styles['service-table']}>
					<thead>
						<tr>
							{(Array.isArray(columns) ? columns : []).map((c) => (
								<th key={c.header}>{c.header}</th>
							))}
							{typeof onViewDetail === 'function' && <th>THAO TÁC</th>}
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr>
								<td colSpan={Array.isArray(columns) ? columns.length : 1} className={styles['empty-row']}>
									Đang tải dữ liệu...
								</td>
							</tr>
						)}

						{!isLoading && totalElements === 0 && (
							<tr>
								<td colSpan={Array.isArray(columns) ? columns.length : 1} className={styles['empty-row']}>
									Không có dữ liệu.
								</td>
							</tr>
						)}

						{!isLoading && data.map((item, idx) => {
							const key = rowKey ? rowKey(item, idx) : buildRowKeyWithIndex(item?.code, idx);
							return (
								<tr key={String(key)}>
									{(Array.isArray(columns) ? columns : []).map((c) => {
										const raw = c.get?.(item);
										const value = typeof c.format === 'function' ? c.format(raw, item) : raw;
										const className = c.className ? c.className : undefined;
										return (
											<td key={c.header} className={className}>
												{value == null || value === '' ? '-' : value}
											</td>
										);
									})}
									{typeof onViewDetail === 'function' && (
										<td>
											<ViewDetailButton onClick={() => onViewDetail(item)} />
										</td>
									)}
								</tr>
							);
						})}
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
	data: PropTypes.arrayOf(PropTypes.object).isRequired,
	columns: PropTypes.arrayOf(
		PropTypes.shape({
			header: PropTypes.string.isRequired,
			get: PropTypes.func,
			format: PropTypes.func,
			className: PropTypes.string,
		})
	).isRequired,
	rowKey: PropTypes.func,
	onViewDetail: PropTypes.func,
	onAddProduct: PropTypes.func,
	actionLabel: PropTypes.string,
	isLoading: PropTypes.bool,
	error: PropTypes.string,
	page: PropTypes.number,
	size: PropTypes.number,
	totalPages: PropTypes.number,
	totalElements: PropTypes.number,
	search: PropTypes.string,
	searchHint: PropTypes.string,
	onChangePage: PropTypes.func,
	onChangeSize: PropTypes.func,
	onChangeSearch: PropTypes.func,
	onResetFilters: PropTypes.func,
};

ViewDetailButton.propTypes = {
	onClick: PropTypes.func.isRequired,
};
