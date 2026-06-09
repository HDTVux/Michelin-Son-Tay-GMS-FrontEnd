import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	createWarehouseSpecAttribute,
	fetchWarehouseSpecAttributes,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const mapSpecAttributeItem = (item) => {
	if (!item) return null;
	return {
		attributeId: item.attributeId ?? item.id ?? null,
		attributeCode: item.attributeCode ?? item.code ?? '',
		displayName: item.displayName ?? item.name ?? '',
		unit: item.unit ?? '',
	};
};

export default function AttributeSelection() {
	useScrollToTop();
	const navigate = useNavigate();

	const [attributes, setAttributes] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Wizard step: 1 = Checkbox selection, 2 = Value/Unit input
	const [step, setStep] = useState(1);

	// List of selected attributes with their configuration
	const [selectedList, setSelectedList] = useState(() => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		try {
			if (draftRaw) {
				const draft = JSON.parse(draftRaw);
				if (Array.isArray(draft.specDrafts)) {
					// Filter out rows that don't have an attributeId
					return draft.specDrafts.filter(s => s.attributeId).map(s => ({
						id: s.id || `spec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
						attributeId: String(s.attributeId),
						code: String(s.code || '').toUpperCase(),
						displayName: s.displayName || '',
						specValue: s.specValue || '',
						unit: s.unit || '',
					}));
				}
			}
		} catch (e) {
			console.error("Failed to load initial spec draft:", e);
		}
		return [];
	});

	// Form to create a new attribute in Step 1
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [newDisplayName, setNewDisplayName] = useState('');
	const [newUnit, setNewUnit] = useState('');
	const [isCreating, setIsCreating] = useState(false);

	// Fetch all attributes from server
	const loadAttributes = useCallback(async () => {
		try {
			setIsLoading(true);
			const token = localStorage.getItem('authToken');
			const res = await fetchWarehouseSpecAttributes(token);
			const attrList = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];
			setAttributes(attrList.map(mapSpecAttributeItem).filter(Boolean));
		} catch (err) {
			toast.error(err?.message || 'Không thể tải danh sách thuộc tính.', { containerId: 'app-toast' });
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAttributes();
	}, [loadAttributes]);

	// Filter attributes in Step 1
	const filteredAttributes = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return attributes.filter((a) => {
			if (!q) return true;
			const name = String(a.displayName || '').toLowerCase();
			const code = String(a.attributeCode || '').toLowerCase();
			return name.includes(q) || code.includes(q);
		});
	}, [attributes, searchQuery]);

	// Check if display name is duplicate
	const isDisplayNameDuplicate = useMemo(() => {
		const nameTrimmed = String(newDisplayName || '').trim().toUpperCase();
		if (!nameTrimmed) return false;
		return attributes.some((a) => String(a.displayName || '').trim().toUpperCase() === nameTrimmed);
	}, [attributes, newDisplayName]);

	// Checkbox toggling handler in Step 1
	const handleToggleCheckbox = useCallback((attr) => {
		setSelectedList((prev) => {
			const exists = prev.some((item) => String(item.attributeId) === String(attr.attributeId));
			if (exists) {
				// Remove it
				return prev.filter((item) => String(item.attributeId) !== String(attr.attributeId));
			} else {
				// Add it with default values
				return [
					...prev,
					{
						id: `spec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
						attributeId: String(attr.attributeId),
						code: String(attr.attributeCode || '').toUpperCase(),
						displayName: attr.displayName,
						specValue: '',
						unit: attr.unit || '',
					}
				];
			}
		});
	}, []);

	// Create new attribute handler
	const handleCreateNewAttribute = useCallback(async () => {
		if (isCreating) return;
		const nameTrimmed = String(newDisplayName || '').trim();
		if (!nameTrimmed) {
			toast.warning('Vui lòng nhập tên hiển thị cho thuộc tính mới.', { containerId: 'app-toast' });
			return;
		}
		if (isDisplayNameDuplicate) {
			toast.warning('Tên thuộc tính đã tồn tại.', { containerId: 'app-toast' });
			return;
		}

		const token = localStorage.getItem('authToken');
		if (!token) {
			toast.error('Vui lòng đăng nhập để tạo thuộc tính.', { containerId: 'app-toast' });
			return;
		}

		// Generate attributeCode from displayName
		const attributeCode = nameTrimmed
			.toUpperCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove accents
			.replace(/Đ/g, 'D')
			.replace(/[^A-Z0-9]+/g, '_')
			.trim()
			.replace(/^_+|_+$/g, '')
			.slice(0, 50);

		try {
			setIsCreating(true);
			const res = await createWarehouseSpecAttribute(
				{
					attributeId: null,
					attributeCode,
					displayName: nameTrimmed,
					unit: String(newUnit || '').trim(),
				},
				token
			);
			const created = mapSpecAttributeItem(extractPayload(res));
			const createdId = Number(created?.attributeId) || null;
			if (!createdId) {
				toast.error('Tạo thuộc tính thất bại.', { containerId: 'app-toast' });
				return;
			}

			toast.success('Đã thêm thuộc tính mới.', { containerId: 'app-toast' });
			
			// Refresh list
			await loadAttributes();

			// Auto select the new attribute
			setSelectedList((prev) => [
				...prev,
				{
					id: `spec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
					attributeId: String(createdId),
					code: String(created.attributeCode || '').toUpperCase(),
					displayName: created.displayName,
					specValue: '',
					unit: created.unit || '',
				}
			]);
			setIsAddingNew(false);
		} catch (err) {
			toast.error(err?.message || 'Không thể tạo thuộc tính.', { containerId: 'app-toast' });
		} finally {
			setIsCreating(false);
		}
	}, [newDisplayName, newUnit, isCreating, isDisplayNameDuplicate, loadAttributes]);

	// Save spec values & return to product page
	const handleFinishSelection = useCallback(() => {
		// Validation: specValue is required for all selected attributes
		const invalidItem = selectedList.find(item => !String(item.specValue || '').trim());
		if (invalidItem) {
			toast.warning(`Vui lòng nhập giá trị cho thuộc tính "${invalidItem.displayName}".`, { containerId: 'app-toast' });
			return;
		}

		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}

		draft.specDrafts = selectedList;
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromAttributeSelection: true } });
	}, [selectedList, navigate]);

	return (
		<div className={styles['service-page']}>
			{/* Wizard Header */}
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
						</svg>
					</span>
					<h1>{step === 1 ? 'Bước 1: Chọn thuộc tính' : 'Bước 2: Điền giá trị thuộc tính'}</h1>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					{step === 1 && (
						<button
							className={styles['primary-button']}
							onClick={() => setIsAddingNew(prev => !prev)}
						>
							{isAddingNew ? 'Xem danh sách' : 'Thêm thuộc tính mới'}
						</button>
					)}
					<button
						className={styles['ghost-button']}
						onClick={() => {
							if (step === 2) {
								setStep(1);
							} else {
								navigate('/part-management/create-product', { state: { fromAttributeSelection: true } });
							}
						}}
					>
						Quay lại
					</button>
				</div>
			</div>

			{/* STEP 1: SELECT ATTRIBUTES */}
			{step === 1 && (
				<>
					{isAddingNew ? (
						<div className={styles['service-card']}>
							<div className={styles['service-card__header']}>
								<div className={styles['service-card__title']}>
									<strong>Thêm thuộc tính mới vào hệ thống</strong>
								</div>
							</div>

							<div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: '600px' }}>
								<div className="ui-field">
									<label htmlFor="attrDisplayName">Tên hiển thị</label>
									<input
										id="attrDisplayName"
										value={newDisplayName}
										onChange={(e) => setNewDisplayName(e.target.value)}
										placeholder="Ví dụ: Kích thước, Chiều rộng, Độ dày..."
										disabled={isCreating}
									/>
									{isDisplayNameDuplicate ? (
										<span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
											Tên thuộc tính đã tồn tại!
										</span>
									) : null}
								</div>

								<div className="ui-field">
									<label htmlFor="attrUnit">Đơn vị (không bắt buộc)</label>
									<input
										id="attrUnit"
										value={newUnit}
										onChange={(e) => setNewUnit(e.target.value)}
										placeholder="Ví dụ: inch, mm, %..."
										disabled={isCreating}
									/>
								</div>
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
								<button
									type="button"
									className={styles['primary-button']}
									onClick={handleCreateNewAttribute}
									disabled={isCreating || !newDisplayName.trim()}
								>
									{isCreating ? 'Đang tạo...' : 'Xác nhận tạo thuộc tính'}
								</button>
							</div>
						</div>
					) : (
						<>
							<div className={styles['pending-filters']}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
									<div className={styles['search-box']} style={{ flex: 1, marginBottom: 0 }}>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
											<circle cx="11" cy="11" r="8" />
											<line x1="21" y1="21" x2="16.65" y2="16.65" />
										</svg>
										<input
											placeholder="Tìm kiếm thuộc tính..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
									<div style={{ fontWeight: 600, color: '#374151' }}>
										Đã chọn: <span style={{ color: '#1E90FF', fontSize: '16px' }}>{selectedList.length}</span> thuộc tính
									</div>
								</div>
							</div>

							<div className={styles['service-card']}>
								<div className={styles['table-wrapper']}>
									<table className={styles['service-table']}>
										<thead>
											<tr>
												<th style={{ width: 60 }}>Chọn</th>
												<th style={{ textAlign: 'left' }}>TÊN THUỘC TÍNH</th>
												<th>MÃ CODE</th>
												<th>ĐƠN VỊ MẶC ĐỊNH</th>
											</tr>
										</thead>
										<tbody>
											{isLoading && (
												<tr>
													<td colSpan="4" className={styles['empty-row']}>Đang tải danh sách thuộc tính...</td>
												</tr>
											)}
											{!isLoading && filteredAttributes.length === 0 && (
												<tr>
													<td colSpan="4" className={styles['empty-row']}>Không tìm thấy thuộc tính nào.</td>
												</tr>
											)}
											{!isLoading && filteredAttributes.map((a) => {
												const isChecked = selectedList.some(item => String(item.attributeId) === String(a.attributeId));
												return (
													<tr
														key={String(a.attributeId)}
														onClick={() => handleToggleCheckbox(a)}
														style={{ cursor: 'pointer' }}
													>
														<td onClick={(e) => e.stopPropagation()}>
															<input
																type="checkbox"
																checked={isChecked}
																onChange={() => handleToggleCheckbox(a)}
																style={{ width: '18px', height: '18px', cursor: 'pointer' }}
															/>
														</td>
														<td style={{ textAlign: 'left', fontWeight: 600 }}>{a.displayName}</td>
														<td style={{ fontFamily: 'monospace' }}>{a.attributeCode}</td>
														<td>{a.unit || '-'}</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>

								<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
									<button
										className={styles['primary-button']}
										disabled={selectedList.length === 0}
										onClick={() => setStep(2)}
									>
										Tiếp tục sang điền giá trị &rarr;
									</button>
								</div>
							</div>
						</>
					)}
				</>
			)}

			{/* STEP 2: ENTER VALUES & UNITS */}
			{step === 2 && (
				<div className={styles['service-card']}>
					<div className={styles['service-card__header']}>
						<div className={styles['service-card__title']}>
							<strong>Điền giá trị cho các thuộc tính đã chọn</strong>
						</div>
					</div>

					<div className={styles['table-wrapper']}>
						<table className={styles['service-table']}>
							<thead>
								<tr>
									<th style={{ textAlign: 'left' }}>THUỘC TÍNH</th>
									<th>GIÁ TRỊ (BẮT BUỘC) <span style={{ color: '#ef4444' }}>*</span></th>
									<th>ĐƠN VỊ (KHÔNG BẮT BUỘC)</th>
									<th style={{ width: 100 }}>HÀNH ĐỘNG</th>
								</tr>
							</thead>
							<tbody>
								{selectedList.length === 0 ? (
									<tr>
										<td colSpan="4" className={styles['empty-row']}>Chưa có thuộc tính nào được chọn. Quay lại để chọn thuộc tính.</td>
									</tr>
								) : (
									selectedList.map((item, idx) => (
										<tr key={item.attributeId}>
											<td style={{ textAlign: 'left', fontWeight: 600 }}>
												{item.displayName} <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400, fontFamily: 'monospace' }}>({item.code})</span>
											</td>
											<td>
												<input
													className={styles['spec-input']}
													value={item.specValue}
													onChange={(e) => {
														const val = e.target.value;
														setSelectedList(prev => prev.map((x, i) => i === idx ? { ...x, specValue: val } : x));
													}}
													placeholder="Nhập giá trị (bắt buộc)..."
													required
												/>
											</td>
											<td>
												<input
													className={styles['spec-input']}
													value={item.unit}
													onChange={(e) => {
														const val = e.target.value;
														setSelectedList(prev => prev.map((x, i) => i === idx ? { ...x, unit: val } : x));
													}}
													placeholder="Nhập đơn vị (tùy chọn)..."
												/>
											</td>
											<td>
												<button
													type="button"
													className={styles['ghost-button']}
													style={{ padding: '6px 12px', color: '#ef4444', borderColor: '#fca5a5' }}
													onClick={() => {
														setSelectedList(prev => prev.filter((_, i) => i !== idx));
													}}
												>
													Bỏ chọn
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
						<button
							className={styles['ghost-button']}
							onClick={() => setStep(1)}
						>
							&larr; Quay lại chọn thêm thuộc tính
						</button>
						<button
							className={styles['primary-button']}
							disabled={selectedList.length === 0}
							onClick={handleFinishSelection}
						>
							Hoàn tất cấu hình thuộc tính
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
