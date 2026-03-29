import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	createServiceTicketEstimate,
	fetchServiceTicketEstimate,
	fetchWorkCategoriesAll,
	fetchTaxRulesAll,
	updateServiceTicketEstimate,
	updateServiceTicketEstimateItem,
} from '../../../services/serviceTicketService.js';
import { fetchAllCatalogItems } from '../../../services/catalogService.js';
import { createTaxRule } from '../../../services/warehouseService.js';

const PLACEHOLDER_ROW_COUNT = 15;

export function formatCurrencyVnd(value) {
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return '';
	return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
}

function pickLatestEstimate(list) {
	const arr = Array.isArray(list) ? list : [];
	if (arr.length === 0) return null;
	return [...arr].sort((a, b) => {
		const va = Number(a?.version);
		const vb = Number(b?.version);
		const versionCmp = (Number.isFinite(vb) ? vb : -1) - (Number.isFinite(va) ? va : -1);
		if (versionCmp !== 0) return versionCmp;
		const ta = Date.parse(a?.createdAt || a?.approvedAt || 0);
		const tb = Date.parse(b?.createdAt || b?.approvedAt || 0);
		return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
	})[0];
}

function createEmptyDraftRow() {
	return {
		estimateItemId: null,
		workCategoryId: null,
		itemId: null,
		newCategoryName: '',
		itemName: '',
		quantity: '',
		unitPrice: '',
		taxRuleId: '',
		confirmed: false,
		isRemoved: false,
	};
}

function toNumberOrZero(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) ? n : 0;
}

function pickMoneyDisplayValue(withVatValue, baseValue) {
	const withVatNum = toNumberOrZero(withVatValue);
	if (withVatNum > 0) return withVatNum;
	const baseNum = toNumberOrZero(baseValue);
	return baseNum > 0 ? baseNum : '';
}

export function toIdOrNull(value) {
	if (value == null) return null;
	const n = typeof value === 'number' ? value : Number(String(value).trim());
	return Number.isFinite(n) && n > 0 ? n : null;
}

export function isDraftRowEmpty(row) {
	const newCategoryName = String(row?.newCategoryName || '').trim();
	const itemName = String(row?.itemName || '').trim();
	const quantity = String(row?.quantity ?? '').trim();
	const unitPrice = String(row?.unitPrice ?? '').trim();
	const taxRuleId = String(row?.taxRuleId ?? '').trim();
	const confirmed = Boolean(row?.confirmed);
	return !newCategoryName && !itemName && !quantity && !unitPrice && !taxRuleId && !confirmed;
}

function normalizeDraftRows(rows, maxRows) {
	const max = Number.isFinite(maxRows) && maxRows > 0 ? maxRows : 15;
	let next = Array.isArray(rows) ? rows.slice(0, max) : [];
	if (next.length === 0) return [createEmptyDraftRow()];

	if (next.every((r) => isDraftRowEmpty(r))) return [createEmptyDraftRow()];

	while (next.length > 1 && isDraftRowEmpty(next.at(-1)) && isDraftRowEmpty(next.at(-2))) {
		next = next.slice(0, -1);
	}

	if (!isDraftRowEmpty(next.at(-1)) && next.length < max) {
		next = [...next, createEmptyDraftRow()];
	}

	return next;
}

function getItemCheckedFlag(it) {
	return Boolean(
		it?.isChecked ??
			it?.confirmed ??
			it?.isConfirmed ??
			it?.approved ??
			it?.isApproved ??
			it?.customerConfirmed ??
			it?.isCustomerConfirmed,
	);
}

function normalizeText(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

function mapTaxRuleItem(item) {
	if (!item) return null;
	return {
		taxRuleId: item.taxRuleId ?? item.id ?? 0,
		taxCode: item.taxCode ?? item.code ?? '',
		taxName: item.taxName ?? item.name ?? '',
		taxRate: item.taxRate ?? item.rate ?? 0,
	};
}

function matchesQuery(item, rawQuery) {
	const q = normalizeText(rawQuery).trim();
	if (!q) return true;

	const name = normalizeText(item?.itemName);
	const code = normalizeText(item?.itemCode);
	const category = normalizeText(item?.category);
	return name.includes(q) || code.includes(q) || category.includes(q);
}

export function useInventoryCheckHandlers() {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [catalogItems, setCatalogItems] = useState([]);
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const hasFetchedRef = useRef(false);

	const toggleOpen = useCallback(() => {
		setIsOpen((prev) => !prev);
		setError('');
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setError('');
	}, []);

	const onQueryChange = useCallback((e) => {
		setQuery(e.target.value);
		setError('');
	}, []);

	const ensureCatalogFetched = useCallback(async () => {
		if (hasFetchedRef.current) return catalogItems;

		const res = await fetchAllCatalogItems();
		const items = Array.isArray(res?.data) ? res.data : [];
		hasFetchedRef.current = true;
		setCatalogItems(items);
		return items;
	}, [catalogItems]);

	const runSearch = useCallback(async () => {
		if (loading) return;
		const q = String(query ?? '').trim();

		if (!q) {
			setResults([]);
			setError('Vui lòng nhập tên/mã phụ tùng để tìm.');
			return;
		}

		try {
			setLoading(true);
			setError('');
			const items = await ensureCatalogFetched();
			const filtered = (Array.isArray(items) ? items : []).filter((it) => matchesQuery(it, q));
			setResults(filtered);
			if (filtered.length === 0) setError('Không tìm thấy phụ tùng phù hợp trong kho.');
		} catch (err) {
			setResults([]);
			setError(err?.message || 'Không thể kiểm tra tồn kho.');
		} finally {
			setLoading(false);
		}
	}, [ensureCatalogFetched, loading, query]);

	const onSubmit = useCallback(
		(e) => {
			e?.preventDefault?.();
			runSearch();
		},
		[runSearch],
	);

	const showResults = useMemo(() => {
		return isOpen && !loading && Array.isArray(results) && results.length > 0;
	}, [isOpen, loading, results]);

	return {
		isOpen,
		query,
		results,
		loading,
		error,
		showResults,
		toggleOpen,
		close,
		onQueryChange,
		runSearch,
		onSubmit,
	};
}

export function useAdvisorItemsTableHandlers(serviceTicketId, options = {}) {
	const { onEstimateStatusChange } = options || {};
	const onEstimateStatusChangeRef = useRef(onEstimateStatusChange);
	const [estimate, setEstimate] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [fetched, setFetched] = useState(false);
	const [taxRules, setTaxRules] = useState([]);
	const [taxRulesLoading, setTaxRulesLoading] = useState(false);
	const [taxRulesError, setTaxRulesError] = useState('');
	const [workCategories, setWorkCategories] = useState([]);
	const [workCategoriesLoading, setWorkCategoriesLoading] = useState(false);
	const [workCategoriesError, setWorkCategoriesError] = useState('');
	const [isAddingNewTaxRule, setIsAddingNewTaxRule] = useState(false);
	const [taxName, setTaxName] = useState('');
	const [taxRate, setTaxRate] = useState('');
	const [isCreatingTaxRule, setIsCreatingTaxRule] = useState(false);
	const [recommendation, setRecommendation] = useState('');
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [draftRows, setDraftRows] = useState(() => [createEmptyDraftRow()]);
	const [editRows, setEditRows] = useState(() => [createEmptyDraftRow()]);
	const prevServiceTicketIdRef = useRef(serviceTicketId);

	const inventory = useInventoryCheckHandlers();

	useEffect(() => {
		onEstimateStatusChangeRef.current = onEstimateStatusChange;
	}, [onEstimateStatusChange]);

	useEffect(() => {
		setRecommendation('');
	}, [serviceTicketId]);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setTaxRules([]);
			setTaxRulesError('');
			setTaxRulesLoading(false);
			setIsAddingNewTaxRule(false);
			setTaxName('');
			setTaxRate('');
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setTaxRulesLoading(true);
				setTaxRulesError('');
				const res = await fetchTaxRulesAll(token);
				if (ignore) return;
				setTaxRules(Array.isArray(res?.data) ? res.data : []);
			} catch (err) {
				if (ignore) return;
				setTaxRules([]);
				setTaxRulesError(err?.message || 'Không thể tải danh sách loại thuế.');
			} finally {
				if (!ignore) setTaxRulesLoading(false);
			}
		};
		run();
		return () => {
			ignore = true;
		};
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setWorkCategories([]);
			setWorkCategoriesError('');
			setWorkCategoriesLoading(false);
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setWorkCategoriesLoading(true);
				setWorkCategoriesError('');
				const res = await fetchWorkCategoriesAll(token);
				if (ignore) return;
				setWorkCategories(Array.isArray(res?.data) ? res.data : []);
			} catch (err) {
				if (ignore) return;
				setWorkCategories([]);
				setWorkCategoriesError(err?.message || 'Không thể tải danh sách hạng mục.');
			} finally {
				if (!ignore) setWorkCategoriesLoading(false);
			}
		};
		run();
		return () => {
			ignore = true;
		};
	}, []);

	const startAddNewTaxRule = useCallback(() => {
		if (taxRulesLoading) return;
		setIsAddingNewTaxRule(true);
		setTaxName('');
		setTaxRate('');
		setSaveError('');
	}, [taxRulesLoading]);

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
			setSaveError('Vui lòng đăng nhập để tạo loại thuế.');
			return;
		}

		const name = String(taxName || '').trim();
		if (!name) {
			setSaveError('Vui lòng nhập tên thuế.');
			return;
		}
		const rateNumber = Number(String(taxRate || '').trim());
		if (Number.isNaN(rateNumber)) {
			setSaveError('Vui lòng nhập thuế suất hợp lệ.');
			return;
		}

		try {
			setIsCreatingTaxRule(true);
			setSaveError('');
			const res = await createTaxRule(
				{
					taxName: name,
					taxRate: rateNumber,
				},
				token,
			);
			const payload = res?.data?.data ?? res?.data ?? res;
			const created = mapTaxRuleItem(payload);
			const createdId = toIdOrNull(created?.taxRuleId);
			if (!createdId) {
				setSaveError('Tạo thuế thất bại (không nhận được taxRuleId).');
				return;
			}

			setTaxRules((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((t) => toIdOrNull(t?.taxRuleId) !== createdId);
				return [created, ...withoutDup];
			});

			setIsAddingNewTaxRule(false);
			setTaxName('');
			setTaxRate('');
		} catch (err) {
			setSaveError(err?.message || 'Không thể tạo thuế.');
		} finally {
			setIsCreatingTaxRule(false);
		}
	}, [isCreatingTaxRule, taxName, taxRate]);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token || serviceTicketId == null || String(serviceTicketId).trim() === '') {
			setEstimate(null);
			setFetched(false);
			setIsCreating(false);
			setIsEditing(false);
			onEstimateStatusChangeRef.current?.(null);
			return;
		}

		let ignore = false;
		const run = async () => {
			try {
				setLoading(true);
				setLoadError('');
				setFetched(false);
				const res = await fetchServiceTicketEstimate(serviceTicketId, token);
				if (ignore) return;
				const picked = pickLatestEstimate(res?.data);
				setEstimate(picked);
				onEstimateStatusChangeRef.current?.(picked);
				setFetched(true);
			} catch (err) {
				if (ignore) return;
				setEstimate(null);
				onEstimateStatusChangeRef.current?.(null);
				setLoadError(err?.message || 'Không thể tải ước tính.');
				setFetched(true);
			} finally {
				if (!ignore) setLoading(false);
			}
		};

		run();
		return () => {
			ignore = true;
		};
	}, [serviceTicketId]);

	useEffect(() => {
		if (!isCreating) return;
		setDraftRows([createEmptyDraftRow()]);
		setSaveError('');
	}, [serviceTicketId, isCreating]);

	useEffect(() => {
		const prev = prevServiceTicketIdRef.current;
		prevServiceTicketIdRef.current = serviceTicketId;
		if (!isEditing) return;
		if (prev === serviceTicketId) return;
		setEditRows([createEmptyDraftRow()]);
		setSaveError('');
	}, [serviceTicketId, isEditing]);

	const rows = useMemo(() => {
		const items = Array.isArray(estimate?.items) ? estimate.items : [];
		return items
			.map((it, idx) => ({ it, idx }))
			.filter(({ it }) => !it?.isRemoved)
			.map(({ it, idx }) => {
				const quantity = it?.quantity ?? '';
				const unitPrice = it?.unitPrice ?? '';
				const subTotal = it?.subTotal ?? '';
				const unitPriceWithVat = it?.unitPriceWithVat ?? it?.unitPriceWithVAT ?? '';
				const subTotalWithVat = it?.subTotalWithVat ?? it?.subTotalWithVAT ?? '';
				const categoryName =
					it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '';
				const confirmed = getItemCheckedFlag(it);
				const estimateItemId = it?.estimateItemId ?? it?.estimateItemID ?? it?.id ?? null;
				const workCategoryId =
					it?.workCategoryId ??
					it?.workCateId ??
					it?.workCategory?.workCategoryId ??
					it?.workCategory?.workCateId ??
					it?.workCategory?.id ??
					null;
				const itemId = it?.itemId ?? it?.catalogItemId ?? it?.serviceItemId ?? it?.id ?? null;
				return {
					key: String(it?.estimateItemId ?? it?.itemId ?? it?.itemName ?? `item-${idx}`),
					sourceIndex: idx,
					estimateItemId,
					workCategoryId,
					itemId,
					categoryName,
					itemName: it?.itemName || '',
					quantity,
					unitPrice,
					subTotal,
					unitPriceDisplay: pickMoneyDisplayValue(unitPriceWithVat, unitPrice),
					subTotalDisplay: pickMoneyDisplayValue(subTotalWithVat, subTotal),
					taxRuleId: it?.taxRuleId ?? '',
					confirmed,
					isRemoved: Boolean(it?.isRemoved),
				};
			});
	}, [estimate]);

	const taxRuleById = useMemo(() => {
		const map = new Map();
		for (const rule of Array.isArray(taxRules) ? taxRules : []) {
			const id = toIdOrNull(rule?.taxRuleId);
			if (id) map.set(id, rule);
		}
		return map;
	}, [taxRules]);

	// Danh sách hạng mục được index theo tên và mã (đã chuẩn hóa) để lookup nhanh khi chọn hạng mục cho dòng ước tính
	const workCategoryByNormalizedName = useMemo(() => {
		const map = new Map();
		for (const c of Array.isArray(workCategories) ? workCategories : []) {
			const name = String(c?.categoryName ?? '').trim();
			const code = String(c?.categoryCode ?? '').trim();
			const id = toIdOrNull(c?.workCateId ?? c?.workCategoryId ?? c?.id);
			if (!id) continue;
			if (name) map.set(normalizeText(name), c);
			if (code) map.set(normalizeText(code), c);
		}
		return map;
	}, [workCategories]);

	// Danh sách tên hạng mục để hiển thị trong dropdown khi chọn hạng mục cho dòng ước tính
	const categorySuggestions = useMemo(() => {
		return (Array.isArray(workCategories) ? workCategories : [])
			.map((c) => String(c?.categoryName || c?.categoryCode || '').trim())
			.filter(Boolean);
	}, [workCategories]);

	// tự động điền workCategoryId và taxRuleId khi chọn hạng mục, dựa trên tên hạng mục đã chọn
	const applyCategorySelection = useCallback(
		(row, nextCategoryLabel) => {
			const label = String(nextCategoryLabel ?? '').trim();
			const found = label ? workCategoryByNormalizedName.get(normalizeText(label)) : null;
			if (!found) {
				return {
					...row,
					workCategoryId: null,
					newCategoryName: nextCategoryLabel,
				};
			}

			const workCategoryId =
				found?.workCateId ??
				found?.workCategoryId ??
				found?.id ??
				null;
			const taxRuleId = found?.taxRuleId ?? '';
			return {
				...row,
				workCategoryId,
				newCategoryName: found?.categoryName || found?.categoryCode || label,
				taxRuleId: taxRuleId == null ? '' : String(taxRuleId),
			};
		},
		[workCategoryByNormalizedName],
	);

	const canEdit = useMemo(() => {
		return fetched && !loading && !loadError && !!estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	// Tính toán lại các cột phụ thuộc (subTotal, subTotalWithVat) mỗi khi có thay đổi ở quantity, unitPrice hoặc taxRuleId của dòng ước tính đang tạo hoặc đang edit
	const draftComputed = useMemo(() => {
		return draftRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;

			const taxId = toIdOrNull(r?.taxRuleId);
			const taxRateRaw = taxId ? taxRuleById.get(taxId)?.taxRate : 0;
			let rate = toNumberOrZero(taxRateRaw);
			if (rate > 1) rate = rate / 100;
			if (rate < 0) rate = 0;
			const subTotalWithVat = subTotal * (1 + rate);

			return {
				key: `draft-${idx + 1}`,
				...r,
				subTotal,
				subTotalWithVat,
			};
		});
	}, [draftRows, taxRuleById]);

	// Tương tự như trên nhưng cho các dòng đang edit (ko chỉ có thể edit một vài trường chứ không phải tất cả như trên)
	const editComputed = useMemo(() => {
		return editRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;

			const taxId = toIdOrNull(r?.taxRuleId);
			const taxRateRaw = taxId ? taxRuleById.get(taxId)?.taxRate : 0;
			let rate = toNumberOrZero(taxRateRaw);
			if (rate > 1) rate = rate / 100;
			if (rate < 0) rate = 0;
			// Nếu có taxRuleId và tìm được thuế suất tương ứng thì mới tính subTotalWithVat, nếu không thì coi như chưa bao gồm VAT
			const subTotalWithVat = subTotal * (1 + rate);

			return {
				key: `edit-${idx + 1}`,
				...r,
				subTotal,
				subTotalWithVat,
			};
		});
	}, [editRows, taxRuleById]);

	// Tổng tiền của các dòng ước tính đang tạo hoặc đang edit, được dùng để hiển thị ở dòng status và footer của table
	const draftTotal = useMemo(() => {
		return draftComputed.reduce((acc, r) => {
			const taxId = toIdOrNull(r?.taxRuleId);
			const raw = taxId ? r?.subTotalWithVat : r?.subTotal;
			return acc + toNumberOrZero(raw);
		}, 0);
	}, [draftComputed]);

	const editTotal = useMemo(() => {
		return editComputed.reduce((acc, r) => {
			const taxId = toIdOrNull(r?.taxRuleId);
			const raw = taxId ? r?.subTotalWithVat : r?.subTotal;
			return acc + toNumberOrZero(raw);
		}, 0);
	}, [editComputed]);

	const total = useMemo(() => {
		const raw = estimate?.totalPrice;
		const n = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(n) ? n : 0;
	}, [estimate]);

	//Quyết định hiển thị tổng tiền nào ở dòng status và footer của table: nếu đang tạo thì hiển thị draftTotal, nếu đang edit thì hiển thị editTotal, nếu đang load thì hiển thị "Đang tải...", nếu có lỗi hoặc chưa có estimate thì hiển thị "-", còn bình thường thì hiển thị total từ backend
	const estimateCostText = useMemo(() => {
		if (isCreating) return formatCurrencyVnd(draftTotal) || '-';
		if (isEditing) return formatCurrencyVnd(editTotal) || '-';
		if (loading) return 'Đang tải...';
		if (!estimate) return '-';
		return formatCurrencyVnd(total) || '-';
	}, [isCreating, draftTotal, isEditing, editTotal, loading, estimate, total]);

	const showAddEstimate = useMemo(() => {
		return fetched && !loading && !loadError && !estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	const statusLine = useMemo(() => {
		if (saveError || loadError || taxRulesError || workCategoriesError) return saveError || loadError || taxRulesError || workCategoriesError;
		if (isCreating || isEditing) {
			const activeRows = isCreating ? draftRows : editRows;
			const hasAny = activeRows.some((r) => !isDraftRowEmpty(r));
			const allHaveTax = activeRows
				.filter((r) => !isDraftRowEmpty(r))
				.every((r) => Boolean(toIdOrNull(r?.taxRuleId)) || Boolean(toIdOrNull(r?.workCategoryId)));
			if (!hasAny) return 'Chưa bao gồm VAT';
			return allHaveTax ? 'Đã bao gồm VAT (ước tính)' : 'Chưa bao gồm VAT';
		}
		return 'Đã bao gồm VAT';
	}, [saveError, loadError, taxRulesError, workCategoriesError, isCreating, isEditing, draftRows, editRows]);

	const footerTotalText = useMemo(() => {
		if (isCreating) return formatCurrencyVnd(draftTotal);
		if (isEditing) return formatCurrencyVnd(editTotal);
		if (!estimate) return '';
		return formatCurrencyVnd(total);
	}, [isCreating, draftTotal, isEditing, editTotal, estimate, total]);

	const tableRows = useMemo(() => {
		if (isCreating) return draftComputed;
		if (isEditing) return editComputed;
		return rows;
	}, [isCreating, isEditing, draftComputed, editComputed, rows]);

	const showInputs = useMemo(() => {
		return isCreating || isEditing;
	}, [isCreating, isEditing]);

	const handleDraftChange = useCallback((index, field, value) => {
		setDraftRows((prev) => {
			const base = Array.isArray(prev) ? prev : [];
			const next = base.map((r, idx) => {
				if (idx !== index) return r;
				if (field === 'newCategoryName') return applyCategorySelection(r, value);
				return { ...r, [field]: value };
			});
			return normalizeDraftRows(next, PLACEHOLDER_ROW_COUNT);
		});
	}, [applyCategorySelection]);

	const handleEditChange = useCallback((index, field, value) => {
		setEditRows((prev) => {
			const base = Array.isArray(prev) ? prev : [];
			const next = base.map((r, idx) => {
				if (idx !== index) return r;
				if (field === 'newCategoryName') return applyCategorySelection(r, value);
				return { ...r, [field]: value };
			});
			return normalizeDraftRows(next, PLACEHOLDER_ROW_COUNT);
		});
	}, [applyCategorySelection]);

	const onChange = useMemo(() => {
		return isCreating ? handleDraftChange : handleEditChange;
	}, [isCreating, handleDraftChange, handleEditChange]);

	const startCreate = useCallback(() => {
		if (isEditing) return;
		setIsCreating(true);
		setSaveError('');
		setDraftRows([createEmptyDraftRow()]);
	}, [isEditing]);

	const cancelCreate = useCallback(() => {
		if (isSaving) return;
		setIsCreating(false);
		setSaveError('');
	}, [isSaving]);

	const startEdit = useCallback(() => {
		if (!estimate || isCreating || isSaving) return;
		const items = Array.isArray(estimate?.items) ? estimate.items : [];
		const mapped = items
			.filter((it) => !it?.isRemoved)
			.map((it) => ({
				estimateItemId: it?.estimateItemId ?? it?.estimateItemID ?? it?.id ?? null,
				workCategoryId:
					it?.workCategoryId ??
					it?.workCateId ??
					it?.workCategory?.workCategoryId ??
					it?.workCategory?.workCateId ??
					it?.workCategory?.id ??
					null,
				itemId: it?.itemId ?? it?.catalogItemId ?? it?.serviceItemId ?? it?.id ?? null,
				newCategoryName: String(
					it?.workCategory?.categoryName || it?.workCategory?.categoryCode || it?.newCategoryName || '',
				).trim(),
				itemName: String(it?.itemName || '').trim(),
				quantity: it?.quantity ?? '',
				unitPrice: it?.unitPrice ?? '',
				taxRuleId: it?.taxRuleId ?? '',
				confirmed: getItemCheckedFlag(it),
				isRemoved: Boolean(it?.isRemoved),
			}));
		setEditRows(normalizeDraftRows(mapped, PLACEHOLDER_ROW_COUNT));
		setIsEditing(true);
		setSaveError('');
	}, [estimate, isCreating, isSaving]);

	const canToggleChecked = useMemo(() => {
		return fetched && !loading && !loadError && !!estimate && !isCreating && !isEditing && !isSaving;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing, isSaving]);

	const toggleChecked = useCallback(
		async (sourceIndex, nextChecked) => {
			if (!canToggleChecked) return;
			const token = localStorage.getItem('authToken');
			if (!token) {
				setSaveError('Vui lòng đăng nhập để cập nhật xác nhận.');
				return;
			}

			const estimateId = estimate?.estimateId ?? estimate?.id;
			const estimateIdNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
			if (!Number.isFinite(estimateIdNum) || estimateIdNum <= 0) {
				setSaveError('Thiếu estimateId hợp lệ.');
				return;
			}

			const serviceTicketIdRaw = estimate?.serviceTicketId ?? serviceTicketId;
			const serviceTicketIdNum =
				typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(serviceTicketIdRaw);
			if (!Number.isFinite(serviceTicketIdNum) || serviceTicketIdNum <= 0) {
				setSaveError('Thiếu serviceTicketId hợp lệ.');
				return;
			}

			const currentItems = Array.isArray(estimate?.items) ? estimate.items : [];
			if (!currentItems.length) return;

			const itemsPayload = currentItems.map((it, idx) => {
				const workCategoryId =
					it?.workCategoryId ??
					it?.workCateId ??
					it?.workCategory?.workCategoryId ??
					it?.workCategory?.workCateId ??
					it?.workCategory?.id ??
					null;
				const itemId = it?.itemId ?? it?.catalogItemId ?? it?.serviceItemId ?? it?.id ?? null;
				const newCategoryName =
					String(it?.newCategoryName || it?.workCategory?.categoryName || it?.workCategory?.categoryCode || '').trim() ||
					null;
				const itemName = String(it?.itemName ?? '').trim() || null;
				const quantity = toNumberOrZero(it?.quantity);
				const unitPrice = toNumberOrZero(it?.unitPrice);
				const taxRuleId = it?.taxRuleId ?? null;
				const isChecked = idx === sourceIndex ? Boolean(nextChecked) : getItemCheckedFlag(it);
				const isRemoved = Boolean(it?.isRemoved);
				return {
					workCategoryId: workCategoryId ?? null,
					newCategoryName,
					itemId: itemId ?? null,
					itemName,
					quantity,
					unitPrice,
					taxRuleId,
					isChecked,
					isRemoved,
				};
			});

			try {
				setIsSaving(true);
				setSaveError('');
				const res = await updateServiceTicketEstimate(
					estimateIdNum,
					{
						serviceTicketId: serviceTicketIdNum,
						estimateType: estimate?.estimateType || 'INITIAL',
						items: itemsPayload,
					},
					token,
				);
				setEstimate((prev) => {
					const next = res?.data ?? prev;
					onEstimateStatusChangeRef.current?.(next);
					return next;
				});
			} catch (err) {
				setSaveError(err?.message || 'Không thể cập nhật xác nhận.');
			} finally {
				setIsSaving(false);
			}
		},
		[canToggleChecked, estimate, serviceTicketId],
	);

	const cancelEdit = useCallback(() => {
		if (isSaving) return;
		setIsEditing(false);
		setSaveError('');
	}, [isSaving]);

	const saveEstimate = useCallback(async () => {
		if (isSaving) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để tạo báo giá.');
			return;
		}

		const idNum = typeof serviceTicketId === 'number' ? serviceTicketId : Number(serviceTicketId);
		if (!Number.isFinite(idNum) || idNum <= 0) {
			setSaveError('Thiếu serviceTicketId hợp lệ.');
			return;
		}

		const normalized = draftRows
			.filter((r) => !isDraftRowEmpty(r))
			.map((r) => {
				const newCategoryName = String(r.newCategoryName ?? '').trim() || null;
				const itemName = String(r.itemName ?? '').trim() || null;
				const quantity = toNumberOrZero(r.quantity);
				const unitPrice = toNumberOrZero(r.unitPrice);
				const workCategoryId = toIdOrNull(r?.workCategoryId);
				const taxRuleId = toIdOrNull(r?.taxRuleId);
				return {
					workCategoryId: workCategoryId ?? null,
					newCategoryName: workCategoryId ? null : newCategoryName,
					itemId: null,
					itemName,
					quantity,
					unitPrice,
					taxRuleId,
					isChecked: Boolean(r?.confirmed),
					isRemoved: false,
				};
			})
			.filter((it) => (it.workCategoryId || it.newCategoryName) && it.quantity > 0);

		const items = normalized;
		if (items.length === 0) {
			setSaveError('Vui lòng nhập ít nhất 1 dòng (hạng mục, số lượng).');
			return;
		}

		try {
			setIsSaving(true);
			setSaveError('');
			const res = await createServiceTicketEstimate(
				{
					serviceTicketId: idNum,
					estimateType: 'INITIAL',
					items,
				},
				token,
			);
			setEstimate(res?.data ?? null);
			onEstimateStatusChangeRef.current?.(res?.data ?? null);
			setIsCreating(false);
		} catch (err) {
			setSaveError(err?.message || 'Không thể lưu báo giá.');
		} finally {
			setIsSaving(false);
		}
	}, [draftRows, isSaving, serviceTicketId]);

	const saveEdit = useCallback(async () => {
		if (isSaving) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			setSaveError('Vui lòng đăng nhập để cập nhật báo giá.');
			return;
		}

		const estimateId = estimate?.estimateId ?? estimate?.id;
		const estimateIdNum = typeof estimateId === 'number' ? estimateId : Number(estimateId);
		if (!Number.isFinite(estimateIdNum) || estimateIdNum <= 0) {
			setSaveError('Thiếu estimateId hợp lệ.');
			return;
		}

		const serviceTicketIdRaw = estimate?.serviceTicketId ?? serviceTicketId;
		const serviceTicketIdNum =
			typeof serviceTicketIdRaw === 'number' ? serviceTicketIdRaw : Number(serviceTicketIdRaw);
		if (!Number.isFinite(serviceTicketIdNum) || serviceTicketIdNum <= 0) {
			setSaveError('Thiếu serviceTicketId hợp lệ.');
			return;
		}

		const normalized = editRows
			.filter((r) => !isDraftRowEmpty(r))
			.map((r) => {
				const newCategoryName = String(r.newCategoryName ?? '').trim() || null;
				const itemName = String(r.itemName ?? '').trim() || null;
				const quantity = toNumberOrZero(r.quantity);
				const unitPrice = toNumberOrZero(r.unitPrice);
				const workCategoryId = toIdOrNull(r?.workCategoryId);
				const taxRuleId = toIdOrNull(r?.taxRuleId);
				return {
					workCategoryId: workCategoryId ?? null,
					newCategoryName: workCategoryId ? null : newCategoryName,
					itemId: null,
					itemName,
					quantity,
					unitPrice,
					taxRuleId,
					isChecked: Boolean(r?.confirmed),
					isRemoved: false,
				};
			})
			.filter((it) => (it.workCategoryId || it.newCategoryName) && it.quantity > 0);

		const items = normalized;
		if (items.length === 0) {
			setSaveError('Vui lòng nhập ít nhất 1 dòng (hạng mục, số lượng).');
			return;
		}

		try {
			setIsSaving(true);
			setSaveError('');
			const res = await updateServiceTicketEstimate(
				estimateIdNum,
				{
					serviceTicketId: serviceTicketIdNum,
					estimateType: estimate?.estimateType || 'INITIAL',
					items,
				},
				token,
			);
			setEstimate(res?.data ?? null);
			onEstimateStatusChangeRef.current?.(res?.data ?? null);
			setIsEditing(false);
		} catch (err) {
			setSaveError(err?.message || 'Không thể cập nhật báo giá.');
		} finally {
			setIsSaving(false);
		}
	}, [editRows, estimate, isSaving, serviceTicketId]);

	const softDeleteEditRow = useCallback(
		async (rowIndex) => {
			if (!isEditing || isSaving) return;
			const token = localStorage.getItem('authToken');
			if (!token) {
				setSaveError('Vui lòng đăng nhập để xóa hạng mục.');
				return;
			}

			const row = editComputed[rowIndex];
			const estimateItemId = toIdOrNull(row?.estimateItemId);
			if (!estimateItemId) {
				setSaveError('Không tìm thấy estimateItemId để xóa.');
				return;
			}

			try {
				setIsSaving(true);
				setSaveError('');
				await updateServiceTicketEstimateItem(
					estimateItemId,
					{
						workCategoryId: toIdOrNull(row?.workCategoryId),
						newCategoryName: toIdOrNull(row?.workCategoryId)
							? null
							: String(row?.newCategoryName ?? '').trim() || null,
						itemId: toIdOrNull(row?.itemId),
						itemName: String(row?.itemName ?? '').trim() || null,
						quantity: toNumberOrZero(row?.quantity),
						unitPrice: toNumberOrZero(row?.unitPrice),
						taxRuleId: toIdOrNull(row?.taxRuleId),
						isChecked: Boolean(row?.confirmed),
						isRemoved: true,
					},
					token,
				);

				setEditRows((prev) => {
					const base = Array.isArray(prev) ? prev : [];
					const next = base.filter((_, idx) => idx !== rowIndex);
					return normalizeDraftRows(next, PLACEHOLDER_ROW_COUNT);
				});

				setEstimate((prev) => {
					const current = prev && typeof prev === 'object' ? prev : null;
					const items = Array.isArray(current?.items) ? current.items : [];
					if (!items.length) return current;
					const next = {
						...current,
						items: items.map((it) => {
							const itId = toIdOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
							if (itId === estimateItemId) return { ...it, isRemoved: true };
							return it;
						}),
					};
					onEstimateStatusChangeRef.current?.(next);
					return next;
				});
			} catch (err) {
				setSaveError(err?.message || 'Không thể xóa hạng mục.');
			} finally {
				setIsSaving(false);
			}
		},
		[editComputed, isEditing, isSaving],
	);

	return {
		estimate,
		loading,
		loadError,
		fetched,
		taxRules,
		taxRulesLoading,
		taxRulesError,
		workCategories,
		workCategoriesLoading,
		workCategoriesError,
		categorySuggestions,
		isAddingNewTaxRule,
		taxName,
		setTaxName,
		taxRate,
		setTaxRate,
		isCreatingTaxRule,
		startAddNewTaxRule,
		stopAddNewTaxRule,
		handleCreateTaxRule,
		recommendation,
		setRecommendation,
		isCreating,
		isEditing,
		isSaving,
		saveError,
		setSaveError,
		draftRows,
		editRows,
		taxRuleById,
		canEdit,
		draftComputed,
		editComputed,
		draftTotal,
		editTotal,
		total,
		estimateCostText,
		showAddEstimate,
		statusLine,
		footerTotalText,
		tableRows,
		showInputs,
		onChange,
		startCreate,
		cancelCreate,
		startEdit,
		cancelEdit,
		canToggleChecked,
		toggleChecked,
		saveEstimate,
		saveEdit,
		softDeleteEditRow,
		inventory,
	};
}

