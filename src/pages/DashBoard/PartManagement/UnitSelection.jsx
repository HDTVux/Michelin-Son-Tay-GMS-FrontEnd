import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	fetchWarehouseProductUnits,
	createWarehouseProductUnit,
	deleteWarehouseProductUnit,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const mapUnitItem = (item) => {
	if (!item) return null;
	return {
		unitId: item.unitId ?? item.id ?? null,
		unitName: item.unitName ?? item.name ?? '',
		isActive: item.isActive ?? item.active ?? '1',
	};
};

export default function UnitSelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const [units, setUnits] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Add new unit
	const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);
	const [unitName, setUnitName] = useState('');
	const [isCreatingUnit, setIsCreatingUnit] = useState(false);

	// Load data
	useEffect(() => {
		let cancelled = false;
		const loadData = async () => {
			try {
				setIsLoading(true);
				const token = localStorage.getItem('authToken');
				const res = await fetchWarehouseProductUnits(token);
				const unitList = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];

				if (cancelled) return;
				setUnits(unitList.map(mapUnitItem).filter(Boolean));
			} catch (err) {
				if (cancelled) return;
				notify(err?.message || 'Không thể tải danh sách đơn vị.');
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

	// Filtered units by search query
	const filteredUnits = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return units.filter((u) => {
			// Only show active units in the list
			const isActive = String(u.isActive) === '1' || u.isActive === true;
			if (!isActive) return false;
			if (!q) return true;
			return u.unitName.toLowerCase().includes(q);
		});
	}, [units, searchQuery]);

	// Check if the unit name already exists
	const isUnitNameDuplicate = useMemo(() => {
		const nameTrimmed = String(unitName || '').trim().toUpperCase();
		if (!nameTrimmed) return false;
		return units.some((u) => {
			const isActive = String(u.isActive) === '1' || u.isActive === true;
			return isActive && String(u.unitName || '').trim().toUpperCase() === nameTrimmed;
		});
	}, [units, unitName]);

	// Select handler
	const handleSelectUnit = useCallback((unit) => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}
		draft.unit = unit.unitName;
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromUnitSelection: true } });
	}, [navigate]);

	// Unit creation handler
	const handleCreateUnit = useCallback(async () => {
		if (isCreatingUnit) return;
		const name = String(unitName || '').trim();

		if (!name) {
			notify('Vui lòng nhập tên đơn vị.');
			return;
		}

		if (isUnitNameDuplicate) {
			notify('Đơn vị này đã tồn tại trong hệ thống. Vui lòng nhập tên khác.');
			return;
		}

		try {
			setIsCreatingUnit(true);
			const token = localStorage.getItem('authToken');
			const response = await createWarehouseProductUnit(name, token);
			const created = mapUnitItem(extractPayload(response));
			const createdId = Number(created?.unitId) || null;
			if (!createdId) {
				notify('Tạo đơn vị thất bại.');
				return;
			}

			notify('Đã thêm đơn vị mới thành công.');
			// Auto select and go back
			handleSelectUnit(created);
		} catch (err) {
			notify(err?.message || 'Không thể tạo đơn vị.');
		} finally {
			setIsCreatingUnit(false);
		}
	}, [unitName, isCreatingUnit, notify, isUnitNameDuplicate, handleSelectUnit]);

	const handleDeleteUnit = useCallback(async (unit) => {
		const ok = window.confirm(`Bạn có chắc chắn muốn xóa đơn vị "${unit.unitName}"?`);
		if (!ok) return;
		try {
			const token = localStorage.getItem('authToken');
			await deleteWarehouseProductUnit(unit.unitId, token);
			notify('Đã xóa đơn vị thành công.');
			// Reload unit list
			const res = await fetchWarehouseProductUnits(token);
			const unitList = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];
			setUnits(unitList.map(mapUnitItem).filter(Boolean));
		} catch (err) {
			notify(err?.message || 'Không thể xóa đơn vị.');
		}
	}, [notify]);

	const handleToggleAddingUnit = useCallback(() => {
		setIsAddingNewUnit((prev) => {
			const next = !prev;
			if (next) {
				setUnitName('');
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
					<h1>Chọn đơn vị đo lường</h1>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						className={styles['primary-button']}
						onClick={handleToggleAddingUnit}
					>
						{isAddingNewUnit ? 'Xem danh sách' : 'Thêm đơn vị mới'}
					</button>
					<button
						className={styles['ghost-button']}
						onClick={() => navigate('/part-management/create-product', { state: { fromUnitSelection: true } })}
					>
						Quay lại
					</button>
				</div>
			</div>

			{isAddingNewUnit ? (
				<div className={styles['service-card']}>
					<div className={styles['service-card__header']}>
						<div className={styles['service-card__title']}>
							<strong>Thêm đơn vị mới</strong>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
						<div className="ui-field">
							<label htmlFor="unitName">Tên đơn vị</label>
							<input
								id="unitName"
								value={unitName}
								onChange={(e) => setUnitName(e.target.value)}
								placeholder="Ví dụ: Hộp"
								style={isUnitNameDuplicate ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
								disabled={isCreatingUnit}
							/>
							{isUnitNameDuplicate ? (
								<span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
									Đơn vị này đã tồn tại trong hệ thống!
								</span>
							) : null}
						</div>
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
						<button
							type="button"
							className={styles['primary-button']}
							onClick={handleCreateUnit}
							disabled={isCreatingUnit || !unitName.trim()}
						>
							{isCreatingUnit ? 'Đang tạo...' : 'Xác nhận tạo đơn vị'}
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
								placeholder="Tìm kiếm theo tên đơn vị..."
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
										<th style={{ textAlign: 'left' }}>TÊN ĐƠN VỊ ĐO LƯỜNG</th>
										<th style={{ width: 140 }}>THAO TÁC</th>
									</tr>
								</thead>
								<tbody>
									{isLoading && (
										<tr>
											<td colSpan="2" className={styles['empty-row']}>Đang tải danh sách...</td>
										</tr>
									)}
									{!isLoading && filteredUnits.length === 0 && (
										<tr>
											<td colSpan="2" className={styles['empty-row']}>Không tìm thấy đơn vị nào.</td>
										</tr>
									)}
									{!isLoading && filteredUnits.map((u) => (
										<tr key={String(u.unitId)}>
											<td style={{ textAlign: 'left', fontWeight: 500 }}>{u.unitName}</td>
											<td>
												<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
													<button
														type="button"
														className={styles['primary-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
														onClick={() => handleSelectUnit(u)}
													>
														Chọn
													</button>
													<button
														type="button"
														className={styles['ghost-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none', borderColor: '#ef4444', color: '#ef4444' }}
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteUnit(u);
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
