import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { validateTaxName, validateTaxRatePercent } from '../../../components/inputValidation.js';
import {
	createTaxRule,
	fetchTaxRules,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

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

const generateTaxNameFromRate = (rateStr) => {
	if (!rateStr) return '';
	const clean = rateStr.replace(/%/g, '').trim();
	const num = parseFloat(clean);
	if (Number.isNaN(num)) return '';
	if (num > 0 && num < 1) {
		return `VAT ${(num * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
	}
	return `VAT ${num.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
};

export default function TaxSelection() {
	useScrollToTop();
	const navigate = useNavigate();
	const location = useLocation();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const isFromCategory = useMemo(() => Boolean(location.state?.fromCategorySelection), [location]);

	const [taxRules, setTaxRules] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Add new tax rule
	const [isAddingNewTax, setIsAddingNewTax] = useState(false);
	const [taxName, setTaxName] = useState('');
	const [taxRate, setTaxRate] = useState('');
	const [isTaxNameManuallyEdited, setIsTaxNameManuallyEdited] = useState(false);
	const [isCreatingTax, setIsCreatingTax] = useState(false);

	// Load data
	useEffect(() => {
		let cancelled = false;
		const loadData = async () => {
			try {
				setIsLoading(true);
				const token = localStorage.getItem('authToken');
				const res = await fetchTaxRules(token);
				const taxList = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];

				if (cancelled) return;
				setTaxRules(taxList.map(mapTaxRuleItem).filter(Boolean));
			} catch (err) {
				if (cancelled) return;
				notify(err?.message || 'Không thể tải danh sách thuế.');
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

	// Filtered tax rules by search query
	const filteredTaxRules = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		return taxRules.filter((t) => {
			if (!q) return true;
			const label = getTaxRuleSelectLabel(t).toLowerCase();
			const rate = formatTaxRatePercent(t).toLowerCase();
			return label.includes(q) || rate.includes(q);
		});
	}, [taxRules, searchQuery]);

	// Check for duplicate tax name
	const isTaxNameDuplicate = useMemo(() => {
		const nameTrimmed = String(taxName || '').trim().toUpperCase();
		if (!nameTrimmed) return false;
		return taxRules.some((t) => String(t.taxName || '').trim().toUpperCase() === nameTrimmed);
	}, [taxRules, taxName]);

	// Select handler
	const handleSelectTaxRule = useCallback((rule) => {
		const targetIdStr = rule ? String(rule.taxRuleId) : '';
		if (isFromCategory) {
			const draftRaw = sessionStorage.getItem('gms_create_category_draft');
			let draft = {};
			try {
				if (draftRaw) draft = JSON.parse(draftRaw);
			} catch {
				draft = {};
			}
			draft.selectedTaxRuleId = targetIdStr;
			sessionStorage.setItem('gms_create_category_draft', JSON.stringify(draft));
			navigate('/part-management/select-category', { state: { fromTaxSelection: true } });
		} else {
			const draftRaw = sessionStorage.getItem('gms_create_product_draft');
			let draft = {};
			try {
				if (draftRaw) draft = JSON.parse(draftRaw);
			} catch {
				draft = {};
			}
			draft.selectedProductTaxRuleId = targetIdStr;
			sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
			navigate('/part-management/create-product', { state: { fromProductTaxSelection: true } });
		}
	}, [isFromCategory, navigate]);

	// Create new tax rule
	const handleCreateTax = useCallback(async () => {
		if (isCreatingTax) return;
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

		if (isTaxNameDuplicate) {
			notify('Tên loại thuế này đã tồn tại trong hệ thống. Vui lòng đặt tên khác.');
			return;
		}

		const name = nameValidated.value;
		const rateNumber = rateValidated.value;

		try {
			setIsCreatingTax(true);
			const res = await createTaxRule({ taxName: name, taxRate: rateNumber }, token);
			const created = mapTaxRuleItem(extractPayload(res));
			const createdId = Number(created?.taxRuleId) || null;
			if (!createdId) {
				notify('Tạo thuế thất bại.');
				return;
			}

			notify('Đã thêm loại thuế mới thành công.');
			handleSelectTaxRule(created);
		} catch (err) {
			notify(err?.message || 'Không thể tạo loại thuế.');
		} finally {
			setIsCreatingTax(false);
		}
	}, [taxName, taxRate, isCreatingTax, isTaxNameDuplicate, notify, handleSelectTaxRule]);

	const handleTaxRateChange = useCallback((e) => {
		const val = e.target.value;
		setTaxRate(val);
		if (!isTaxNameManuallyEdited) {
			setTaxName(generateTaxNameFromRate(val));
		}
	}, [isTaxNameManuallyEdited]);

	const handleTaxNameChange = useCallback((e) => {
		setTaxName(e.target.value);
		setIsTaxNameManuallyEdited(true);
	}, []);

	const handleToggleAddingTax = useCallback(() => {
		setIsAddingNewTax((prev) => {
			const next = !prev;
			if (next) {
				setTaxName('');
				setTaxRate('');
				setIsTaxNameManuallyEdited(false);
			}
			return next;
		});
	}, []);

	const handleGoBack = useCallback(() => {
		if (isFromCategory) {
			navigate('/part-management/select-category', { state: { fromTaxSelection: true } });
		} else {
			navigate('/part-management/create-product', { state: { fromProductTaxSelection: true } });
		}
	}, [isFromCategory, navigate]);

	return (
		<div className={styles['service-page']}>
			<div className={styles['service-header']}>
				<div className={styles['service-header-title']}>
					<span className={styles['header-icon']}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<line x1="9" y1="9" x2="15" y2="15" />
							<line x1="15" y1="9" x2="9" y2="15" />
						</svg>
					</span>
					<h1>Chọn thuế suất</h1>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						className={styles['primary-button']}
						onClick={handleToggleAddingTax}
					>
						{isAddingNewTax ? 'Xem danh sách' : 'Thêm thuế mới'}
					</button>
					<button
						className={styles['ghost-button']}
						onClick={handleGoBack}
					>
						Quay lại
					</button>
				</div>
			</div>

			{isAddingNewTax ? (
				<div className={styles['service-card']}>
					<div className={styles['service-card__header']}>
						<div className={styles['service-card__title']}>
							<strong>Thêm loại thuế mới</strong>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
						<div className="ui-field">
							<label htmlFor="taxRate">Thuế suất</label>
							<input
								id="taxRate"
								type="text"
								inputMode="decimal"
								pattern="[0-9]*[.,]?[0-9]*"
								value={taxRate}
								onChange={handleTaxRateChange}
								placeholder="Ví dụ: 10 hoặc 0.1"
								disabled={isCreatingTax}
							/>
						</div>
						<div className="ui-field">
							<label htmlFor="taxName">Tên thuế</label>
							<input
								id="taxName"
								value={taxName}
								onChange={handleTaxNameChange}
								placeholder="Ví dụ: VAT 10%"
								style={isTaxNameDuplicate ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
								disabled={isCreatingTax}
							/>
							{isTaxNameDuplicate ? (
								<span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
									Tên loại thuế đã tồn tại trong hệ thống!
								</span>
							) : null}
						</div>
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
						<button
							type="button"
							className={styles['primary-button']}
							onClick={handleCreateTax}
							disabled={isCreatingTax || !taxName.trim() || !taxRate.trim()}
						>
							{isCreatingTax ? 'Đang tạo...' : 'Xác nhận tạo thuế'}
						</button>
					</div>
				</div>
			) : (
				<>
					<div className={styles['pending-filters']}>
						<div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
							<div className={styles['search-box']} style={{ flex: 1, marginBottom: 0 }}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
									<circle cx="11" cy="11" r="8" />
									<line x1="21" y1="21" x2="16.65" y2="16.65" />
								</svg>
								<input
									placeholder="Tìm kiếm thuế suất theo tên hoặc tỉ lệ..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<button
								className={styles['ghost-button']}
								style={{ height: '42px', color: '#ef4444', borderColor: '#ef4444' }}
								onClick={() => handleSelectTaxRule(null)}
							>
								Không áp dụng thuế
							</button>
						</div>
					</div>

					<div className={styles['service-card']}>
						<div className={styles['table-wrapper']}>
							<table className={styles['service-table']}>
								<thead>
									<tr>
										<th style={{ textAlign: 'left' }}>TÊN THUẾ (MÃ THUẾ)</th>
										<th>THUẾ SUẤT %</th>
										<th style={{ width: 140 }}>THAO TÁC</th>
									</tr>
								</thead>
								<tbody>
									{isLoading && (
										<tr>
											<td colSpan="3" className={styles['empty-row']}>Đang tải danh sách thuế...</td>
										</tr>
									)}
									{!isLoading && filteredTaxRules.length === 0 && (
										<tr>
											<td colSpan="3" className={styles['empty-row']}>Không tìm thấy loại thuế nào.</td>
										</tr>
									)}
									{!isLoading && filteredTaxRules.map((t) => (
										<tr key={String(t.taxRuleId)}>
											<td style={{ textAlign: 'left', fontWeight: 600 }}>{getTaxRuleSelectLabel(t)}</td>
											<td style={{ fontWeight: 500 }}>{formatTaxRatePercent(t)}</td>
											<td>
												<button
													type="button"
													className={styles['primary-button']}
													style={{ padding: '6px 16px', fontSize: 13, boxShadow: 'none' }}
													onClick={() => handleSelectTaxRule(t)}
												>
													Chọn
												</button>
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
