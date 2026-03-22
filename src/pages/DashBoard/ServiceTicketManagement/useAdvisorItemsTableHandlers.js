import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	createServiceTicketEstimate,
	fetchServiceTicketEstimate,
	fetchTaxRulesAll,
	updateServiceTicketEstimate,
	updateServiceTicketEstimateItem,
} from '../../../services/serviceTicketService.js';
import { fetchAllCatalogItems } from '../../../services/catalogService.js';

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

export function useAdvisorItemsTableHandlers(serviceTicketId) {
	const [estimate, setEstimate] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [fetched, setFetched] = useState(false);
	const [taxRules, setTaxRules] = useState([]);
	const [taxRulesLoading, setTaxRulesLoading] = useState(false);
	const [taxRulesError, setTaxRulesError] = useState('');
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
		setRecommendation('');
	}, [serviceTicketId]);

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setTaxRules([]);
			setTaxRulesError('');
			setTaxRulesLoading(false);
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
		if (!token || serviceTicketId == null || String(serviceTicketId).trim() === '') {
			setEstimate(null);
			setFetched(false);
			setIsCreating(false);
			setIsEditing(false);
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
				setFetched(true);
			} catch (err) {
				if (ignore) return;
				setEstimate(null);
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

	const canEdit = useMemo(() => {
		return fetched && !loading && !loadError && !!estimate && !isCreating && !isEditing;
	}, [fetched, loading, loadError, estimate, isCreating, isEditing]);

	const draftComputed = useMemo(() => {
		return draftRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;
			return {
				key: `draft-${idx + 1}`,
				...r,
				subTotal,
			};
		});
	}, [draftRows]);

	const editComputed = useMemo(() => {
		return editRows.map((r, idx) => {
			const quantity = toNumberOrZero(r.quantity);
			const unitPrice = toNumberOrZero(r.unitPrice);
			const subTotal = quantity * unitPrice;
			return {
				key: `edit-${idx + 1}`,
				...r,
				subTotal,
			};
		});
	}, [editRows]);

	const draftTotal = useMemo(() => {
		return draftComputed.reduce((acc, r) => acc + toNumberOrZero(r.subTotal), 0);
	}, [draftComputed]);

	const editTotal = useMemo(() => {
		return editComputed.reduce((acc, r) => acc + toNumberOrZero(r.subTotal), 0);
	}, [editComputed]);

	const total = useMemo(() => {
		const raw = estimate?.totalPrice;
		const n = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(n) ? n : 0;
	}, [estimate]);

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
		if (saveError || loadError || taxRulesError) return saveError || loadError || taxRulesError;
		if (isCreating || isEditing) return 'Chưa bao gồm VAT';
		return 'Đã bao gồm VAT';
	}, [saveError, loadError, taxRulesError, isCreating, isEditing]);

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
			const next = base.map((r, idx) => (idx === index ? { ...r, [field]: value } : r));
			return normalizeDraftRows(next, PLACEHOLDER_ROW_COUNT);
		});
	}, []);

	const handleEditChange = useCallback((index, field, value) => {
		setEditRows((prev) => {
			const base = Array.isArray(prev) ? prev : [];
			const next = base.map((r, idx) => (idx === index ? { ...r, [field]: value } : r));
			return normalizeDraftRows(next, PLACEHOLDER_ROW_COUNT);
		});
	}, []);

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
				setEstimate((prev) => res?.data ?? prev);
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
				const taxRuleId = toIdOrNull(r?.taxRuleId);
				return {
					workCategoryId: null,
					newCategoryName,
					itemId: null,
					itemName,
					quantity,
					unitPrice,
					taxRuleId,
					isChecked: Boolean(r?.confirmed),
					isRemoved: false,
				};
			})
			.filter((it) => it.newCategoryName && it.quantity > 0);

		if (normalized.some((it) => !it.taxRuleId)) {
			setSaveError('Vui lòng chọn loại thuế cho tất cả hạng mục.');
			return;
		}

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
				const taxRuleId = toIdOrNull(r?.taxRuleId);
				return {
					workCategoryId: null,
					newCategoryName,
					itemId: null,
					itemName,
					quantity,
					unitPrice,
					taxRuleId,
					isChecked: Boolean(r?.confirmed),
					isRemoved: false,
				};
			})
			.filter((it) => it.newCategoryName && it.quantity > 0);

		if (normalized.some((it) => !it.taxRuleId)) {
			setSaveError('Vui lòng chọn loại thuế cho tất cả hạng mục.');
			return;
		}

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
						newCategoryName: String(row?.newCategoryName ?? '').trim() || null,
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
					return {
						...current,
						items: items.map((it) => {
							const itId = toIdOrNull(it?.estimateItemId ?? it?.estimateItemID ?? it?.id);
							if (itId === estimateItemId) return { ...it, isRemoved: true };
							return it;
						}),
					};
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
