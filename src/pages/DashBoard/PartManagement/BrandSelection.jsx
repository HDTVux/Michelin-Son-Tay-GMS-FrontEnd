import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	createWarehouseBrand,
	fetchWarehouseBrands,
	deleteWarehouseBrand,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const mapBrandItem = (item) => {
	if (!item) return null;
	return {
		brandId: item.brandId ?? item.id ?? null,
		brandName: item.brandName ?? item.name ?? '',
		logoUrl: item.logoUrl ?? null,
		isActive: item.isActive ?? item.active ?? '1',
	};
};

export default function BrandSelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const [brands, setBrands] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Add new brand
	const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
	const [brandName, setBrandName] = useState('');
	const [isCreatingBrand, setIsCreatingBrand] = useState(false);

	// Load data
	useEffect(() => {
		let cancelled = false;
		const loadData = async () => {
			try {
				setIsLoading(true);
				const token = localStorage.getItem('authToken');
				const res = await fetchWarehouseBrands(token);
				const brandList = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];

				if (cancelled) return;
				setBrands(brandList.map(mapBrandItem).filter(Boolean));
			} catch (err) {
				if (cancelled) return;
				notify(err?.message || 'Không thể tải danh sách hãng.');
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
	}, [notify]);

	// Filtered brands by search query
	const filteredBrands = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return brands.filter((b) => {
			if (!q) return true;
			return b.brandName.toLowerCase().includes(q);
		});
	}, [brands, searchQuery]);

	// Check if the brand name already exists
	const isBrandNameDuplicate = useMemo(() => {
		const nameTrimmed = String(brandName || '').trim().toUpperCase();
		if (!nameTrimmed) return false;
		return brands.some((b) => String(b.brandName || '').trim().toUpperCase() === nameTrimmed);
	}, [brands, brandName]);

	// Select handler
	const handleSelectBrand = useCallback((brand) => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}
		// Update brand and reset product line since it depends on brand
		draft.selectedBrandId = String(brand.brandId);
		draft.selectedProductLineId = '';
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromBrandSelection: true } });
	}, [navigate]);

	// Brand creation handler
	const handleCreateBrand = useCallback(async () => {
		if (isCreatingBrand) return;
		const name = String(brandName || '').trim();

		if (!name) {
			notify('Vui lòng nhập tên hãng.');
			return;
		}

		if (isBrandNameDuplicate) {
			notify('Hãng này đã tồn tại trong hệ thống. Vui lòng nhập tên khác.');
			return;
		}

		try {
			setIsCreatingBrand(true);
			const token = localStorage.getItem('authToken');
			const response = await createWarehouseBrand(
				{
					brandId: null,
					brandName: name,
					logoUrl: null,
					isActive: '1',
				},
				token,
			);
			const created = mapBrandItem(extractPayload(response));
			const createdId = Number(created?.brandId) || null;
			if (!createdId) {
				notify('Tạo hãng thất bại.');
				return;
			}

			notify('Đã thêm hãng mới thành công.');
			// Auto select and go back
			handleSelectBrand(created);
		} catch (err) {
			notify(err?.message || 'Không thể tạo hãng.');
		} finally {
			setIsCreatingBrand(false);
		}
	}, [brandName, isCreatingBrand, notify, isBrandNameDuplicate, handleSelectBrand]);

	const handleDeleteBrand = useCallback(async (brand) => {
		const ok = window.confirm(`Bạn có chắc chắn muốn xóa hãng "${brand.brandName}"?`);
		if (!ok) return;
		try {
			const token = localStorage.getItem('authToken');
			await deleteWarehouseBrand(brand.brandId, token);
			notify('Đã xóa hãng thành công.');
			// Reload brand list
			const res = await fetchWarehouseBrands(token);
			const brandList = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];
			setBrands(brandList.map(mapBrandItem).filter(Boolean));
		} catch (err) {
			notify(err?.message || 'Không thể xóa hãng.');
		}
	}, [notify]);

	const handleToggleAddingBrand = useCallback(() => {
		setIsAddingNewBrand((prev) => {
			const next = !prev;
			if (next) {
				setBrandName('');
			}
			return next;
		});
	}, []);

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M4 6h16M4 12h16M4 18h7" />
						</svg>
					</span>
					<h1>Chọn hãng sản xuất</h1>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						className={styles['primary-button']}
						onClick={handleToggleAddingBrand}
					>
						{isAddingNewBrand ? 'Xem danh sách' : 'Thêm hãng mới'}
					</button>
					<button
						className={styles['ghost-button']}
						onClick={() => navigate('/part-management/create-product', { state: { fromBrandSelection: true } })}
					>
						Quay lại
					</button>
				</div>
			</div>

			{isAddingNewBrand ? (
				<div className={styles['service-card']}>
					<div className={styles['service-card__header']}>
						<div className={styles['service-card__title']}>
							<strong>Thêm hãng mới</strong>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
						<div className="ui-field">
							<label htmlFor="brandName">Tên hãng</label>
							<input
								id="brandName"
								value={brandName}
								onChange={(e) => setBrandName(e.target.value)}
								placeholder="Ví dụ: Michelin"
								style={isBrandNameDuplicate ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
								disabled={isCreatingBrand}
							/>
							{isBrandNameDuplicate ? (
								<span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
									Hãng này đã tồn tại trong hệ thống!
								</span>
							) : null}
						</div>
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
						<button
							type="button"
							className={styles['primary-button']}
							onClick={handleCreateBrand}
							disabled={isCreatingBrand || !brandName.trim()}
						>
							{isCreatingBrand ? 'Đang tạo...' : 'Xác nhận tạo hãng'}
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
								placeholder="Tìm kiếm theo tên hãng..."
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
										<th style={{ textAlign: 'left' }}>TÊN HÃNG SẢN XUẤT</th>
										<th style={{ width: 140 }}>THAO TÁC</th>
									</tr>
								</thead>
								<tbody>
									{isLoading && (
										<tr>
											<td colSpan="2" className={styles['empty-row']}>Đang tải danh sách...</td>
										</tr>
									)}
									{!isLoading && filteredBrands.length === 0 && (
										<tr>
											<td colSpan="2" className={styles['empty-row']}>Không tìm thấy hãng nào.</td>
										</tr>
									)}
									{!isLoading && filteredBrands.map((b) => (
										<tr key={String(b.brandId)}>
											<td style={{ textAlign: 'left', fontWeight: 500 }}>{b.brandName}</td>
											<td>
												<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
													<button
														type="button"
														className={styles['primary-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
														onClick={() => handleSelectBrand(b)}
													>
														Chọn
													</button>
													<button
														type="button"
														className={styles['ghost-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none', borderColor: '#ef4444', color: '#ef4444' }}
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteBrand(b);
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
