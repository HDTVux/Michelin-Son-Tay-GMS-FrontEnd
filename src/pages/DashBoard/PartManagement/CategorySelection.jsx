import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { validateTaxName, validateTaxRatePercent } from '../../../components/inputValidation.js';
import {
	createWarehouseItemCategory,
	fetchWarehouseItemCategories,
	createTaxRule,
	fetchTaxRules,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const mapCategoryItem = (item) => {
	if (!item) return null;
	return {
		itemCategoryId: item.itemCategoryId ?? item.workCategoryId ?? item.workCateId ?? item.id ?? null,
		categoryCode: item.categoryCode ?? item.code ?? '',
		categoryName: item.categoryName ?? item.name ?? '',
		categoryType: item.categoryType ?? item.type ?? '',
		taxRuleId: item.taxRuleId ?? item.tax_rule_id ?? null,
		isActive: item.isActive ?? item.active ?? '',
	};
};

const mapTaxRuleItem = (item) => {
	if (!item) return null;
	return {
		taxRuleId: item.taxRuleId ?? item.id ?? null,
		taxCode: item.taxCode ?? item.code ?? '',
		taxName: item.taxName ?? item.name ?? '',
		taxRate: item.taxRate ?? item.rate ?? 0,
	};
};

const formatTaxRatePercent = (rule) => {
	const raw = rule?.taxRate ?? rule?.rate;
	const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
	if (!Number.isFinite(n)) return '';
	let rate = n;
	if (rate > 1) rate = rate / 100;
	if (rate < 0) rate = 0;
	const pct = rate * 100;
	const text = pct.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
	return `${text}%`;
};

const getTaxRuleSelectLabel = (rule) => {
	if (!rule) return '';
	const name = String(rule?.taxName ?? rule?.name ?? '').trim();
	const code = String(rule?.taxCode ?? rule?.code ?? '').trim();
	return name || code;
};

const generateCategoryCodeFromName = (name) => {
	if (!name) return '';
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[đĐ]/g, 'd')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
		.replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
};

const CATEGORY_TYPE_FIXED = 'PART';

export default function CategorySelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const [categories, setCategories] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Tax rules for adding category
	const [taxRules, setTaxRules] = useState([]);
	const [isTaxRulesLoading, setIsTaxRulesLoading] = useState(false);
	const [selectedTaxRuleId, setSelectedTaxRuleId] = useState('');
	const [isAddingNewTaxRule, setIsAddingNewTaxRule] = useState(false);
	const [taxName, setTaxName] = useState('');
	const [taxRate, setTaxRate] = useState('');
	const [isCreatingTaxRule, setIsCreatingTaxRule] = useState(false);

	// Add new category
	const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
	const [categoryCode, setCategoryCode] = useState('');
	const [categoryName, setCategoryName] = useState('');
	const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
	const [isCreatingCategory, setIsCreatingCategory] = useState(false);

	// Load data
	useEffect(() => {
		let cancelled = false;
		const loadData = async () => {
			try {
				setIsLoading(true);
				setIsTaxRulesLoading(true);
				const token = localStorage.getItem('authToken');
				const [catRes, taxRes] = await Promise.all([
					fetchWarehouseItemCategories(token),
					fetchTaxRules(token),
				]);

				const catList = Array.isArray(extractPayload(catRes)) ? extractPayload(catRes) : [];
				const taxList = Array.isArray(extractPayload(taxRes)) ? extractPayload(taxRes) : [];

				if (cancelled) return;
				setCategories(catList.map(mapCategoryItem).filter(Boolean));
				setTaxRules(taxList.map(mapTaxRuleItem).filter(Boolean));
			} catch (err) {
				if (cancelled) return;
				notify(err?.message || 'Không thể tải danh sách hạng mục hoặc thuế.');
			} finally {
				if (!cancelled) {
					setIsLoading(false);
					setIsTaxRulesLoading(false);
				}
			}
		};
		loadData();
		return () => {
			cancelled = true;
		};
	}, [notify]);

	// Filtered categories by type and search query
	const filteredCategories = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return categories.filter((c) => {
			const isPart = c.categoryType === CATEGORY_TYPE_FIXED;
			if (!isPart) return false;
			if (!q) return true;
			return (
				c.categoryName.toLowerCase().includes(q) ||
				c.categoryCode.toLowerCase().includes(q)
			);
		});
	}, [categories, searchQuery]);

	const isCodeDuplicate = useMemo(() => {
		const codeTrimmed = String(categoryCode || '').trim().toUpperCase();
		if (!codeTrimmed) return false;
		return categories.some((c) => String(c.categoryCode || '').trim().toUpperCase() === codeTrimmed);
	}, [categories, categoryCode]);

	const selectedTaxRule = useMemo(() => {
		const id = String(selectedTaxRuleId || '').trim();
		return taxRules.find((t) => String(t.taxRuleId) === id) || null;
	}, [selectedTaxRuleId, taxRules]);

	// Select handler
	const handleSelectCategory = useCallback((cat) => {
		const draftRaw = sessionStorage.getItem('gms_create_product_draft');
		let draft = {};
		try {
			if (draftRaw) draft = JSON.parse(draftRaw);
		} catch {
			draft = {};
		}
		draft.selectedCategoryId = String(cat.itemCategoryId);
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/create-product', { state: { fromCategorySelection: true } });
	}, [navigate]);

	const handleToggleAddingCategory = useCallback(() => {
		setIsAddingNewCategory((prev) => {
			const next = !prev;
			if (next) {
				setCategoryCode('');
				setCategoryName('');
				setIsCodeManuallyEdited(false);
				setSelectedTaxRuleId('');
			}
			return next;
		});
	}, []);

	const handleCategoryNameChange = useCallback((e) => {
		const val = e.target.value;
		setCategoryName(val);
		if (!isCodeManuallyEdited) {
			setCategoryCode(generateCategoryCodeFromName(val));
		}
	}, [isCodeManuallyEdited]);

	const handleCategoryCodeChange = useCallback((e) => {
		setCategoryCode(e.target.value);
		setIsCodeManuallyEdited(true);
	}, []);

	// Category creation handlers
	const handleCreateCategory = useCallback(async () => {
		if (isCreatingCategory) return;
		const code = String(categoryCode || '').trim();
		const name = String(categoryName || '').trim();
		const taxRuleIdNumRaw = selectedTaxRuleId ? Number(selectedTaxRuleId) : null;
		const taxRuleIdNum = Number.isFinite(taxRuleIdNumRaw) && taxRuleIdNumRaw > 0 ? taxRuleIdNumRaw : null;

		if (!code || !name) {
			notify('Vui lòng nhập đầy đủ Mã nhóm và Tên nhóm.');
			return;
		}

		const isCodeDuplicate = categories.some((c) => String(c.categoryCode || '').trim().toUpperCase() === code.toUpperCase());
		if (isCodeDuplicate) {
			notify('Mã nhóm này đã tồn tại trong hệ thống. Vui lòng nhập mã khác.');
			return;
		}

		try {
			setIsCreatingCategory(true);
			const token = localStorage.getItem('authToken');
			const basePayload = {
				itemCategoryId: null,
				workCategoryId: null,
				categoryCode: code,
				categoryName: name,
				displayOrder: 0,
				isActive: true,
				estimateItemEstimateItem: 0,
				isDefault: true,
				taxRuleId: taxRuleIdNum,
				categoryType: CATEGORY_TYPE_FIXED,
			};

			const res = await createWarehouseItemCategory(basePayload, token);
			const created = mapCategoryItem(extractPayload(res));
			const createdId = Number(created?.itemCategoryId) || null;
			if (!createdId) {
				notify('Tạo nhóm thất bại.');
				return;
			}

			notify('Đã thêm nhóm mới thành công.');
			// Auto select and go back
			handleSelectCategory(created);
		} catch (err) {
			notify(err?.message || 'Không thể tạo nhóm.');
		} finally {
			setIsCreatingCategory(false);
		}
	}, [categoryCode, categoryName, isCreatingCategory, notify, selectedTaxRuleId, handleSelectCategory, categories]);

	// Tax creation handlers
	const startAddNewTaxRule = useCallback(() => {
		if (isTaxRulesLoading) return;
		setIsAddingNewTaxRule(true);
		setTaxName('');
		setTaxRate('');
	}, [isTaxRulesLoading]);

	const stopAddNewTaxRule = useCallback(() => {
		if (isCreatingTaxRule) return;
		setIsAddingNewTaxRule(false);
		setTaxName('');
		setTaxRate('');
	}, [isCreatingTaxRule]);

	const handleCreateTaxRule = useCallback(async () => {
		if (isCreatingTaxRule) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			notify('Vui lòng đăng nhập để tạo loại thuế.');
			return;
		}
		const nameValidated = validateTaxName(taxName, { required: true });
		if (nameValidated.error) {
			notify(nameValidated.error);
			return;
		}
		const rateValidated = validateTaxRatePercent(taxRate, { required: true });
		if (rateValidated.error) {
			notify(rateValidated.error);
			return;
		}
		const name = nameValidated.value;
		const rateNumber = rateValidated.value;
		try {
			setIsCreatingTaxRule(true);
			const res = await createTaxRule({ taxName: name, taxRate: rateNumber }, token);
			const created = mapTaxRuleItem(extractPayload(res));
			const createdId = Number(created?.taxRuleId) || null;
			if (!createdId) {
				notify('Tạo thuế thất bại.');
				return;
			}
			setTaxRules((prev) => [created, ...prev]);
			setSelectedTaxRuleId(String(createdId));
			setIsAddingNewTaxRule(false);
			setTaxName('');
			setTaxRate('');
			notify('Đã thêm thuế mới.');
		} catch (err) {
			notify(err?.message || 'Không thể tạo thuế.');
		} finally {
			setIsCreatingTaxRule(false);
		}
	}, [isCreatingTaxRule, notify, taxName, taxRate]);

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M4 6h16M4 12h16M4 18h7" />
						</svg>
					</span>
					<h1>Chọn hạng mục sản phẩm</h1>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						className={styles['primary-button']}
						onClick={handleToggleAddingCategory}
					>
						{isAddingNewCategory ? 'Xem danh sách' : 'Thêm nhóm mới'}
					</button>
					<button
						className={styles['ghost-button']}
						onClick={() => navigate('/part-management/create-product', { state: { fromCategorySelection: true } })}
					>
						Quay lại
					</button>
				</div>
			</div>

			{isAddingNewCategory ? (
				<div className={styles['service-card']}>
					<div className={styles['service-card__header']}>
						<div className={styles['service-card__title']}>
							<strong>Thêm hạng mục mới</strong>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
						<div className="ui-field">
							<label htmlFor="categoryName">Tên nhóm</label>
							<input
								id="categoryName"
								value={categoryName}
								onChange={handleCategoryNameChange}
								placeholder="Ví dụ: Lốp xe"
							/>
						</div>
						<div className="ui-field">
							<label htmlFor="categoryCode">Mã nhóm</label>
							<input
								id="categoryCode"
								value={categoryCode}
								onChange={handleCategoryCodeChange}
								placeholder="Ví dụ: LOP"
								style={isCodeDuplicate ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
							/>
							{isCodeDuplicate ? (
								<span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
									Mã nhóm đã tồn tại!
								</span>
							) : null}
						</div>
					</div>

					<div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginTop: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
							<div style={{ fontWeight: 600 }}>Cấu hình Thuế</div>
							{isAddingNewTaxRule ? (
								<div style={{ display: 'flex', gap: 8 }}>
									<button
										type="button"
										className={styles['primary-button']}
										onClick={handleCreateTaxRule}
										disabled={isCreatingTaxRule}
									>
										{isCreatingTaxRule ? 'Đang thêm...' : 'Xác nhận thêm thuế'}
									</button>
									<button
										type="button"
										className={styles['ghost-button']}
										onClick={stopAddNewTaxRule}
										disabled={isCreatingTaxRule}
									>
										Hủy
									</button>
								</div>
							) : (
								<button
									type="button"
									className={styles['ghost-button']}
									onClick={startAddNewTaxRule}
									disabled={isTaxRulesLoading}
								>
									Thêm thuế mới
								</button>
							)}
						</div>

						{isAddingNewTaxRule ? (
							<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
								<div className="ui-field">
									<label htmlFor="taxName">Tên thuế</label>
									<input
										id="taxName"
										value={taxName}
										onChange={(e) => setTaxName(e.target.value)}
										placeholder="Ví dụ: VAT 10%"
										disabled={isCreatingTaxRule}
									/>
								</div>
								<div className="ui-field">
									<label htmlFor="taxRate">Thuế suất</label>
									<input
										id="taxRate"
										value={taxRate}
										onChange={(e) => setTaxRate(e.target.value)}
										placeholder="10 hoặc 0.1"
										disabled={isCreatingTaxRule}
									/>
								</div>
							</div>
						) : (
							<div className="ui-field">
								<label htmlFor="taxRuleSelect">Chọn thuế</label>
								<select
									id="taxRuleSelect"
									value={selectedTaxRuleId}
									onChange={(e) => setSelectedTaxRuleId(e.target.value)}
									disabled={isTaxRulesLoading}
								>
									<option value="">Không áp dụng</option>
									{taxRules.map((t) => (
										<option key={String(t.taxRuleId)} value={String(t.taxRuleId)}>
											{getTaxRuleSelectLabel(t) || `#${t.taxRuleId}`}
										</option>
									))}
								</select>
								{selectedTaxRule ? (
									<div className={styles['filter-card__hint']} style={{ marginTop: 6 }}>
										Thuế suất: {formatTaxRatePercent(selectedTaxRule) || '--'}
									</div>
								) : null}
							</div>
						)}
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
						<button
							type="button"
							className={styles['primary-button']}
							onClick={handleCreateCategory}
							disabled={isCreatingCategory}
						>
							{isCreatingCategory ? 'Đang tạo...' : 'Xác nhận tạo hạng mục'}
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
								placeholder="Tìm kiếm theo tên nhóm hoặc mã nhóm hàng..."
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
										<th style={{ width: 120 }}>MÃ NHÓM</th>
										<th style={{ textAlign: 'left' }}>TÊN NHÓM HÀNG</th>
										<th style={{ width: 180 }}>THUẾ SUẤT</th>
										<th style={{ width: 140 }}>THAO TÁC</th>
									</tr>
								</thead>
								<tbody>
									{isLoading && (
										<tr>
											<td colSpan="4" className={styles['empty-row']}>Đang tải danh sách...</td>
										</tr>
									)}
									{!isLoading && filteredCategories.length === 0 && (
										<tr>
											<td colSpan="4" className={styles['empty-row']}>Không tìm thấy nhóm hàng nào.</td>
										</tr>
									)}
									{!isLoading && filteredCategories.map((cat) => {
										const rule = taxRules.find((tr) => String(tr.taxRuleId) === String(cat.taxRuleId));
										const taxText = rule ? `${getTaxRuleSelectLabel(rule)} (${formatTaxRatePercent(rule)})` : 'Không áp dụng';
										return (
											<tr key={String(cat.itemCategoryId)}>
												<td style={{ fontWeight: 600 }}>{cat.categoryCode}</td>
												<td style={{ textAlign: 'left', fontWeight: 500 }}>{cat.categoryName}</td>
												<td>{taxText}</td>
												<td>
													<button
														type="button"
														className={styles['primary-button']}
														style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
														onClick={() => handleSelectCategory(cat)}
													>
														Chọn
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
