import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { createWarehouseBrand, fetchWarehouseBrands } from '../../../services/warehouseBrandService.js';

const mapBrandItem = (item) => {
	if (!item) return null;
	return {
		brandId: item.brandId ?? item.id ?? 0,
		brandName: item.brandName ?? item.name ?? '',
	};
};

export default function CreateProduct() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	// Brand selection/creation (like CheckIn vehicle flow)
	const [brands, setBrands] = useState([]);
	const [isBrandsLoading, setIsBrandsLoading] = useState(false);
	const [selectedBrandId, setSelectedBrandId] = useState('');
	const selectedBrandIdRef = useRef('');

	const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
	const previousBrandIdRef = useRef('');
	const [brandName, setBrandName] = useState('');
	const [isCreatingBrand, setIsCreatingBrand] = useState(false);

	useEffect(() => {
		selectedBrandIdRef.current = String(selectedBrandId || '');
	}, [selectedBrandId]);

	const brandPlaceholder = useMemo(() => {
		if (isBrandsLoading) return 'Đang tải danh sách hãng...';
		if (brands.length) return 'Chọn hãng';
		return 'Chưa có hãng';
	}, [brands.length, isBrandsLoading]);

	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			try {
				setIsBrandsLoading(true);
				const token = localStorage.getItem('authToken');
				const response = await fetchWarehouseBrands(token);
				const payload = response?.data?.data ?? response?.data ?? response;
				const list = Array.isArray(payload) ? payload : [];
				const normalized = list.map(mapBrandItem).filter(Boolean);

				if (cancelled) return;
				setBrands(normalized);
				const prevId = String(selectedBrandIdRef.current || '').trim();
				if (!normalized.length) {
					setSelectedBrandId('');
					return;
				}
				const exists = prevId && normalized.some((b) => String(b.brandId) === prevId);
				setSelectedBrandId(exists ? prevId : String(normalized[0].brandId));
			} catch (err) {
				if (cancelled) return;
				setBrands([]);
				setSelectedBrandId('');
				notify(err?.message || 'Không thể tải danh sách hãng.');
			} finally {
				if (!cancelled) setIsBrandsLoading(false);
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [notify]);

	const startAddNewBrand = useCallback(() => {
		previousBrandIdRef.current = String(selectedBrandId || '');
		setIsAddingNewBrand(true);
		setSelectedBrandId('');
		setBrandName('');
	}, [selectedBrandId]);

	const stopAddNewBrand = useCallback(() => {
		setIsAddingNewBrand(false);
		const restored = previousBrandIdRef.current;
		const restoredExists = restored && brands.some((b) => String(b?.brandId) === String(restored));
		if (restoredExists) {
			setSelectedBrandId(restored);
			return;
		}
		const firstId = brands?.[0]?.brandId ? String(brands[0].brandId) : '';
		setSelectedBrandId(firstId);
	}, [brands]);

	const handleCreateBrand = useCallback(async () => {
		if (isCreatingBrand) return;
		const name = String(brandName || '').trim();
		if (!name) {
			notify('Vui lòng nhập tên hãng.');
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
			const payload = response?.data?.data ?? response?.data ?? response;
			const created = mapBrandItem(payload);
			const createdId = Number(created?.brandId) || 0;
			if (!createdId) {
				notify('Tạo hãng thất bại (không nhận được brandId).');
				return;
			}

			setBrands((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((b) => Number(b?.brandId) !== createdId);
				return [created, ...withoutDup];
			});

			setIsAddingNewBrand(false);
			setSelectedBrandId(String(createdId));
			notify('Đã thêm hãng mới.');
		} catch (err) {
			notify(err?.message || 'Không thể tạo hãng.');
		} finally {
			setIsCreatingBrand(false);
		}
	}, [brandName, isCreatingBrand, notify]);

	const handleSubmitProduct = useCallback(() => {
		const brandId = Number(selectedBrandId) || 0;
		if (!brandId) {
			notify('Vui lòng chọn hãng cho sản phẩm.');
			return;
		}
		notify('Chưa có API tạo sản phẩm. Vui lòng cung cấp endpoint để lưu dữ liệu.');
	}, [notify, selectedBrandId]);

	return (
		<div className={styles['service-page']}>
			<section className={styles['service-card']}>
				<div className={styles['service-card__header']}>
					<div className={styles['service-card__title']}>
						<strong>Tạo sản phẩm</strong>
					</div>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<button type="button" className={styles['ghost-button']} onClick={() => navigate(-1)}>
							Quay lại
						</button>
						<button type="button" className={styles['primary-button']} onClick={handleSubmitProduct}>
							Tạo sản phẩm
						</button>
					</div>
				</div>

				{/* Section: Brand */}
				<div className={styles['pending-filters']}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
						<div style={{ fontWeight: 600 }}>Hãng</div>
						{isAddingNewBrand ? (
							<div style={{ display: 'flex', gap: 8 }}>
								<button
									type="button"
									className={styles['primary-button']}
									onClick={handleCreateBrand}
									disabled={isCreatingBrand}
								>
									{isCreatingBrand ? 'Đang thêm...' : 'Xác nhận thêm hãng'}
								</button>
								<button
									type="button"
									className={styles['ghost-button']}
									onClick={stopAddNewBrand}
									disabled={isCreatingBrand}
								>
									Chọn từ danh sách
								</button>
							</div>
						) : (
							<button
								type="button"
								className={styles['primary-button']}
								onClick={startAddNewBrand}
								disabled={isBrandsLoading}
							>
								Thêm hãng
							</button>
						)}
					</div>

					{isAddingNewBrand ? (
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="brandName">Tên hãng (mới)</label>
							<input
								id="brandName"
								value={brandName}
								onChange={(e) => setBrandName(e.target.value)}
								placeholder="Nhập tên hãng"
								autoComplete="off"
							/>
						</div>
					) : (
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="brandSelect">Hãng có sẵn</label>
							<select
								id="brandSelect"
								value={selectedBrandId}
								onChange={(e) => setSelectedBrandId(e.target.value)}
								disabled={isBrandsLoading || !brands.length}
							>
								<option value="">{brandPlaceholder}</option>
								{brands.map((b) => (
									<option key={String(b.brandId)} value={String(b.brandId)}>
										{b.brandName || `#${b.brandId}`}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
