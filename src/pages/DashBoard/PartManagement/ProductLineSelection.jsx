import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	createWarehouseProductLine,
	fetchWarehouseProductLines,
	deleteWarehouseProductLine,
	fetchWarehouseBrands,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const mapBrandItem = (item) => {
	if (!item) return null;
	return {
		brandId: item.brandId ?? item.id ?? null,
		brandName: item.brandName ?? item.name ?? '',
	};
};

const mapProductLineItem = (item) => {
	if (!item) return null;
	return {
		productLineId: item.productLineId ?? item.id ?? null,
		brandId: item.brandId ?? item.brandID ?? item.brand?.brandId ?? null,
		lineName: item.lineName ?? item.name ?? '',
		isActive: item.isActive ?? item.active ?? '',
	};
};

export default function ProductLineSelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const [brands, setBrands] = useState([]);
	const [lines, setLines] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Add new line
	const [isAddingNewLine, setIsAddingNewLine] = useState(false);
	const [lineName, setLineName] = useState('');
	const [isCreatingLine, setIsCreatingLine] = useState(false);

	// Read brand from draft
	const selectedBrandId = useMemo(() => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		try {
			if (draftRaw) {
				const draft = JSON.parse(draftRaw);
				return draft.selectedBrandId ? String(draft.selectedBrandId) : '';
			}
		} catch (e) {
			console.error(e);
		}
		return '';
	}, []);

	// Load data
	useEffect(() => {
		if (!selectedBrandId) return;

		let cancelled = false;
		const loadData = async () => {
			try {
				setIsLoading(true);
				const token = localStorage.getItem('authToken');
				const [brandRes, lineRes] = await Promise.all([
					fetchWarehouseBrands(token),
					fetchWarehouseProductLines(token),
				]);

				const brandList = Array.isArray(extractPayload(brandRes)) ? extractPayload(brandRes) : [];
				const lineList = Array.isArray(extractPayload(lineRes)) ? extractPayload(lineRes) : [];

				if (cancelled) return;
				setBrands(brandList.map(mapBrandItem).filter(Boolean));
				setLines(lineList.map(mapProductLineItem).filter(Boolean));
			} catch (err) {
				if (cancelled) return;
				notify(err?.message || 'Không thể tải danh sách dòng sản phẩm.');
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};
		loadData();
		return () => {
			cancelled = true;
		};
	}, [selectedBrandId, notify]);

	// Find active selected brand object
	const selectedBrand = useMemo(() => {
		return brands.find((b) => String(b.brandId) === selectedBrandId) || null;
	}, [brands, selectedBrandId]);

	// Filtered product lines
	const filteredLines = useMemo(() => {
		const list = lines.filter((l) => String(l.brandId) === selectedBrandId);
		const q = String(searchQuery || '').trim().toLowerCase();
		return list.filter((l) => {
			if (!q) return true;
			return l.lineName.toLowerCase().includes(q);
		});
	}, [lines, selectedBrandId, searchQuery]);

	// Check if name is duplicate under this brand
	const isLineNameDuplicate = useMemo(() => {
		const nameTrimmed = String(lineName || '').trim().toUpperCase();
		if (!nameTrimmed) return false;
		return lines.some(
			(l) =>
				String(l.brandId) === selectedBrandId &&
				String(l.lineName || '').trim().toUpperCase() === nameTrimmed,
		);
	}, [lines, lineName, selectedBrandId]);

	// Select handler
	const handleSelectLine = useCallback((line) => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}
		draft.selectedProductLineId = String(line.productLineId);
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromProductLineSelection: true } });
	}, [navigate]);

	// Create handler
	const handleCreateLine = useCallback(async () => {
		if (isCreatingLine) return;
		const name = String(lineName || '').trim();

		if (!name) {
			notify('Vui lòng nhập tên dòng sản phẩm.');
			return;
		}

		if (isLineNameDuplicate) {
			notify('Dòng sản phẩm đã tồn tại trong hãng này. Vui lòng nhập tên khác.');
			return;
		}

		try {
			setIsCreatingLine(true);
			const token = localStorage.getItem('authToken');
			const response = await createWarehouseProductLine(
				{
					productLineId: null,
					brandId: Number(selectedBrandId),
					lineName: name,
					isActive: '1',
				},
				token,
			);
			const created = mapProductLineItem(extractPayload(response));
			const createdId = Number(created?.productLineId) || null;
			if (!createdId) {
				notify('Tạo dòng sản phẩm thất bại.');
				return;
			}

			notify('Đã thêm dòng sản phẩm mới thành công.');
			// Auto select and return
			handleSelectLine(created);
		} catch (err) {
			notify(err?.message || 'Không thể tạo dòng sản phẩm.');
		} finally {
			setIsCreatingLine(false);
		}
	}, [lineName, isCreatingLine, notify, isLineNameDuplicate, handleSelectLine, selectedBrandId]);

	const handleDeleteLine = useCallback(async (line) => {
		const ok = window.confirm(`Bạn có chắc chắn muốn xóa dòng sản phẩm "${line.lineName}"?`);
		if (!ok) return;
		try {
			const token = localStorage.getItem('authToken');
			await deleteWarehouseProductLine(line.productLineId, token);
			notify('Đã xóa dòng sản phẩm thành công.');
			// Reload product line list
			const lineRes = await fetchWarehouseProductLines(token);
			const lineList = Array.isArray(extractPayload(lineRes)) ? extractPayload(lineRes) : [];
			setLines(lineList.map(mapProductLineItem).filter(Boolean));
		} catch (err) {
			notify(err?.message || 'Không thể xóa dòng sản phẩm.');
		}
	}, [notify]);

	const handleToggleAddingLine = useCallback(() => {
		setIsAddingNewLine((prev) => {
			const next = !prev;
			if (next) {
				setLineName('');
			}
			return next;
		});
	}, []);

	// Render early if brand not selected
	if (!selectedBrandId) {
		return (
			<div className={styles['service-page']}>
				<div className={styles['service-card']}>
					<div style={{ textAlign: 'center', padding: '40px 20px' }}>
						<p style={{ marginBottom: 20, fontSize: 16, color: '#ef4444', fontWeight: 600 }}>
							Vui lòng chọn hãng sản xuất trước khi chọn dòng sản phẩm!
						</p>
						<button
							className={styles['primary-button']}
							onClick={() => navigate('/part-management/select-brand')}
						>
							Đến trang chọn hãng
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M4 6h16M4 12h16M4 18h7" />
						</svg>
					</span>
					<h1>Dòng sản phẩm hãng: {selectedBrand ? selectedBrand.brandName : `Hãng #${selectedBrandId}`}</h1>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						className={styles['primary-button']}
						onClick={handleToggleAddingLine}
					>
						{isAddingNewLine ? 'Xem danh sách' : 'Thêm dòng mới'}
					</button>
					<button
						className={styles['ghost-button']}
						onClick={() => navigate('/part-management/create-product', { state: { fromProductLineSelection: true } })}
					>
						Quay lại
					</button>
				</div>
			</div>

			{isAddingNewLine ? (
				<div className={styles['service-card']}>
					<div className={styles['service-card__header']}>
						<div className={styles['service-card__title']}>
							<strong>Thêm dòng sản phẩm mới</strong>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
						<div className="ui-field">
							<label htmlFor="lineName">Tên dòng sản phẩm</label>
							<input
								id="lineName"
								value={lineName}
								onChange={(e) => setLineName(e.target.value)}
								placeholder="Ví dụ: Primacy 4"
								style={isLineNameDuplicate ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
								disabled={isCreatingLine}
							/>
							{isLineNameDuplicate ? (
								<span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
									Dòng sản phẩm này đã tồn tại trong hãng này!
								</span>
							) : null}
						</div>
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
						<button
							type="button"
							className={styles['primary-button']}
							onClick={handleCreateLine}
							disabled={isCreatingLine || !lineName.trim()}
						>
							{isCreatingLine ? 'Đang tạo...' : 'Xác nhận tạo dòng'}
						</button>
					</div>
				</div>
			) : (
				<>
					<div className={styles['pending-filters']}>
						<div className={styles['search-box']}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
							<input
								placeholder="Tìm kiếm theo tên dòng sản phẩm..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>

					<div className={styles['service-card']}>
						<div className={styles['table-wrapper']}>
							<table className={styles['service-table']}>
								<thead>
									<tr>
										<th style={{ textAlign: 'left' }}>TÊN DÒNG SẢN PHẨM</th>
										<th style={{ width: 140 }}>THAO TÁC</th>
									</tr>
								</thead>
								<tbody>
									{isLoading && (
										<tr>
											<td colSpan="2" className={styles['empty-row']}>Đang tải danh sách...</td>
										</tr>
									)}
									{!isLoading && filteredLines.length === 0 && (
										<tr>
											<td colSpan="2" className={styles['empty-row']}>Không tìm thấy dòng sản phẩm nào.</td>
										</tr>
									)}
									{!isLoading && filteredLines.map((l) => (
										<tr key={String(l.productLineId)}>
											<td style={{ textAlign: 'left', fontWeight: 500 }}>{l.lineName}</td>
											<td>
												<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
													<button
														type="button"
														className={styles['primary-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
														onClick={() => handleSelectLine(l)}
													>
														Chọn
													</button>
													<button
														type="button"
														className={styles['ghost-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none', borderColor: '#ef4444', color: '#ef4444' }}
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteLine(l);
														}}
													>
														Xóa
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
