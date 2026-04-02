import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
	createWarehouseBrand,
	createWarehouseCatalogItem,
	createWarehouseItemCategory,
	createWarehouseProductLine,
	createWarehouseSpecAttribute,
	createWarehouseSpecificationValue,
	createTaxRule,
	fetchWarehouseBrands,
	fetchWarehouseItemCategories,
	fetchWarehouseProductLines,
	fetchWarehouseSpecAttributes,
	fetchWarehouseSpecificationsByCatalogItemId,
	fetchTaxRules,
} from '../../../services/warehouseService.js';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const mapBrandItem = (item) => {
	if (!item) return null;
	return {
		brandId: item.brandId ?? item.id ?? null,
		brandName: item.brandName ?? item.name ?? '',
	};
};

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

const mapProductLineItem = (item) => {
	if (!item) return null;
	return {
		productLineId: item.productLineId ?? item.id ?? null,
		brandId: item.brandId ?? item.brandID ?? item.brand?.brandId ?? null,
		lineName: item.lineName ?? item.name ?? '',
		isActive: item.isActive ?? item.active ?? '',
	};
};

const mapSpecAttributeItem = (item) => {
	if (!item) return null;
	return {
		attributeId: item.attributeId ?? item.id ?? null,
		attributeCode: item.attributeCode ?? item.code ?? '',
		displayName: item.displayName ?? item.name ?? '',
		unit: item.unit ?? '',
	};
};

// Spec templates removed: specDrafts are dynamic per-product now.
// Each product can add the attributes it needs; if an attribute does not exist
// it will be created via the API when the user requests it.

const CATEGORY_TYPE_FIXED = 'PART';

export default function CreateProduct() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	// Step 1: Category
	const [categories, setCategories] = useState([]);
	const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState('');
	const selectedCategoryIdRef = useRef('');
	const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
	const previousCategoryIdRef = useRef('');
	const [categoryCode, setCategoryCode] = useState('');
	const [categoryName, setCategoryName] = useState('');
	const [categoryType] = useState(CATEGORY_TYPE_FIXED);
	const [isCreatingCategory, setIsCreatingCategory] = useState(false);

	// Tax rules for category
	const [taxRules, setTaxRules] = useState([]);
	const [isTaxRulesLoading, setIsTaxRulesLoading] = useState(false);
	const [selectedTaxRuleId, setSelectedTaxRuleId] = useState('');
	const [isAddingNewTaxRule, setIsAddingNewTaxRule] = useState(false);
	const [taxName, setTaxName] = useState('');
	const [taxRate, setTaxRate] = useState('');
	const [isCreatingTaxRule, setIsCreatingTaxRule] = useState(false);

	// Step 2: Brand
	const [brands, setBrands] = useState([]);
	const [isBrandsLoading, setIsBrandsLoading] = useState(false);
	const [selectedBrandId, setSelectedBrandId] = useState('');
	const selectedBrandIdRef = useRef('');
	const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
	const previousBrandIdRef = useRef('');
	const [brandName, setBrandName] = useState('');
	const [isCreatingBrand, setIsCreatingBrand] = useState(false);

	// Step 3: Product line
	const [productLines, setProductLines] = useState([]);
	const [isProductLinesLoading, setIsProductLinesLoading] = useState(false);
	const [selectedProductLineId, setSelectedProductLineId] = useState('');
	const selectedProductLineIdRef = useRef('');
	const [isAddingNewProductLine, setIsAddingNewProductLine] = useState(false);
	const previousProductLineIdRef = useRef('');
	const [productLineName, setProductLineName] = useState('');
	const [isCreatingProductLine, setIsCreatingProductLine] = useState(false);

	// Step 4: Catalog item
	const [isCreatingCatalogItem, setIsCreatingCatalogItem] = useState(false);
	const [createdCatalogItem, setCreatedCatalogItem] = useState(null);
	const itemType = 'PART';
	const [selectedProductTaxRuleId, setSelectedProductTaxRuleId] = useState('');
	const [isAddingNewProductTaxRule, setIsAddingNewProductTaxRule] = useState(false);
	const [productTaxName, setProductTaxName] = useState('');
	const [productTaxRate, setProductTaxRate] = useState('');
	const [isCreatingProductTaxRule, setIsCreatingProductTaxRule] = useState(false);
	const [sku, setSku] = useState('');
	const [price, setPrice] = useState('');
	const [showPrice, setShowPrice] = useState(true);
	const [unit, setUnit] = useState('');
	const [description, setDescription] = useState('');
	// Image file is kept only in component state (no upload at create time)
	const [imageFile, setImageFile] = useState(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState('');
	// const [imageUrl, setImageUrl] = useState('');
	const [warrantyDurationMonths, setWarrantyDurationMonths] = useState('');

	// Step 5-6: Spec attributes + specification values
	const [specAttributes, setSpecAttributes] = useState([]);
	const [isSpecAttributesLoading, setIsSpecAttributesLoading] = useState(false);
	const [savedSpecs, setSavedSpecs] = useState([]);
	const [isSpecsLoading, setIsSpecsLoading] = useState(false);

	const makeSpecDraft = () => ({
		id: `spec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		code: '',
		displayName: '',
		unit: '',
		attributeId: '',
		specValue: '',
		creatingAttribute: false,
		creatingSpec: false,
		isCreatingNew: false,
	});

	const [specDrafts, setSpecDrafts] = useState(() => [makeSpecDraft()]);

	const addSpecDraft = useCallback(() => {
		setSpecDrafts((prev) => [...(Array.isArray(prev) ? prev : []), makeSpecDraft()]);
	}, []);

	const removeSpecDraft = useCallback((index) => {
		setSpecDrafts((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== index) : []));
	}, []);

	useEffect(() => {
		selectedBrandIdRef.current = String(selectedBrandId || '');
	}, [selectedBrandId]);

	useEffect(() => {
		selectedCategoryIdRef.current = String(selectedCategoryId || '');
	}, [selectedCategoryId]);

	useEffect(() => {
		selectedProductLineIdRef.current = String(selectedProductLineId || '');
	}, [selectedProductLineId]);

	const categoryPlaceholder = useMemo(() => {
		if (isCategoriesLoading) return 'Đang tải danh sách nhóm...';
		if (categories.length) return 'Chọn nhóm';
		return 'Chưa có nhóm';
	}, [categories, isCategoriesLoading]);

	const brandPlaceholder = useMemo(() => {
		if (isBrandsLoading) return 'Đang tải danh sách hãng...';
		if (brands.length) return 'Chọn hãng';
		return 'Chưa có hãng';
	}, [brands.length, isBrandsLoading]);

	const productLinePlaceholder = useMemo(() => {
		if (isProductLinesLoading) return 'Đang tải danh sách dòng...';
		if (productLines.length) return 'Chọn dòng sản phẩm';
		return 'Chưa có dòng sản phẩm';
	}, [isProductLinesLoading, productLines.length]);

	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			try {
				const token = localStorage.getItem('authToken');
				setIsCategoriesLoading(true);
				setIsBrandsLoading(true);
				setIsProductLinesLoading(true);
				setIsSpecAttributesLoading(true);
				setIsTaxRulesLoading(true);

				const [catRes, brandRes, lineRes, attrRes, taxRes] = await Promise.all([
					fetchWarehouseItemCategories(token),
					fetchWarehouseBrands(token),
					fetchWarehouseProductLines(token),
					fetchWarehouseSpecAttributes(token),
					fetchTaxRules(token),
				]);

				const catList = Array.isArray(extractPayload(catRes)) ? extractPayload(catRes) : [];
				const brandList = Array.isArray(extractPayload(brandRes)) ? extractPayload(brandRes) : [];
				const lineList = Array.isArray(extractPayload(lineRes)) ? extractPayload(lineRes) : [];
				const attrList = Array.isArray(extractPayload(attrRes)) ? extractPayload(attrRes) : [];
				const taxList = Array.isArray(extractPayload(taxRes)) ? extractPayload(taxRes) : [];

				const catsNorm = catList.map(mapCategoryItem).filter(Boolean);
				const brandsNorm = brandList.map(mapBrandItem).filter(Boolean);
				const linesNorm = lineList.map(mapProductLineItem).filter(Boolean);
				const attrsNorm = attrList.map(mapSpecAttributeItem).filter(Boolean);
				const taxNorm = taxList.map(mapTaxRuleItem).filter(Boolean);

				if (cancelled) return;
				setCategories(catsNorm);
				setBrands(brandsNorm);
				setProductLines(linesNorm);
				setSpecAttributes(attrsNorm);
				setTaxRules(taxNorm);

				const prevCat = String(selectedCategoryIdRef.current || '').trim();
				const prevBrand = String(selectedBrandIdRef.current || '').trim();
				const prevLine = String(selectedProductLineIdRef.current || '').trim();

				// Only auto-select if user hasn't picked (selectedCategoryId is empty or not in new list)
				let newCatId = '';
				const currentSelectedCategoryId = String(selectedCategoryIdRef.current || '').trim();
				const userPicked = catsNorm.some((c) => String(c.itemCategoryId) === currentSelectedCategoryId);
				if (userPicked) {
					newCatId = currentSelectedCategoryId;
				} else if (prevCat && catsNorm.some((c) => String(c.itemCategoryId) === prevCat)) {
					newCatId = prevCat;
				} else if (catsNorm.length > 0) {
					newCatId = String(catsNorm[0].itemCategoryId);
				}
				setSelectedCategoryId(newCatId);

				const brandExists = prevBrand && brandsNorm.some((b) => String(b.brandId) === prevBrand);
				setSelectedBrandId(brandExists ? prevBrand : brandsNorm?.[0]?.brandId ? String(brandsNorm[0].brandId) : '');

				const lineExists = prevLine && linesNorm.some((l) => String(l.productLineId) === prevLine);
				setSelectedProductLineId(lineExists ? prevLine : linesNorm?.[0]?.productLineId ? String(linesNorm[0].productLineId) : '');
			} catch (err) {
				if (cancelled) return;
				setCategories([]);
				setBrands([]);
				setProductLines([]);
				setSpecAttributes([]);
				setTaxRules([]);
				setSelectedCategoryId('');
				setSelectedBrandId('');
				setSelectedProductLineId('');
				notify(err?.message || 'Không thể tải dữ liệu kho.');
			} finally {
				if (!cancelled) {
					setIsCategoriesLoading(false);
					setIsBrandsLoading(false);
					setIsProductLinesLoading(false);
					setIsSpecAttributesLoading(false);
					setIsTaxRulesLoading(false);
				}
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [notify]);

	const selectedCategory = useMemo(() => {
		const id = String(selectedCategoryId || '').trim();
		return categories.find((c) => String(c.itemCategoryId) === id) || null;
	}, [categories, selectedCategoryId]);

	const selectedTaxRule = useMemo(() => {
		const id = String(selectedTaxRuleId || '').trim();
		return taxRules.find((t) => String(t.taxRuleId) === id) || null;
	}, [selectedTaxRuleId, taxRules]);

	const selectedProductTaxRule = useMemo(() => {
		const id = String(selectedProductTaxRuleId || '').trim();
		return taxRules.find((t) => String(t.taxRuleId) === id) || null;
	}, [selectedProductTaxRuleId, taxRules]);

	const selectedBrand = useMemo(() => {
		const id = String(selectedBrandId || '').trim();
		return brands.find((b) => String(b.brandId) === id) || null;
	}, [brands, selectedBrandId]);

	const filteredProductLines = useMemo(() => {
		const brandIdNum = Number(selectedBrandId) || null;
		const list = Array.isArray(productLines) ? productLines : [];
		if (!brandIdNum) return list;
		return list.filter((l) => Number(l.brandId) === brandIdNum);
	}, [productLines, selectedBrandId]);

	const selectedProductLine = useMemo(() => {
		const id = String(selectedProductLineId || '').trim();
		return productLines.find((l) => String(l.productLineId) === id) || null;
	}, [productLines, selectedProductLineId]);

	useEffect(() => {
		// Auto-pick a product line when brand changes.
		const brandIdNum = Number(selectedBrandId) || null;
		const list = Array.isArray(filteredProductLines) ? filteredProductLines : [];
		const current = String(selectedProductLineId || '').trim();
		if (!brandIdNum) return;
		if (current && list.some((l) => String(l.productLineId) === current)) return;
		const firstId = list?.[0]?.productLineId ? String(list[0].productLineId) : '';
		setSelectedProductLineId(firstId);
	}, [filteredProductLines, selectedBrandId, selectedProductLineId]);

	useEffect(() => {
		// Auto-map attributeId for known spec codes if attribute exists.
		setSpecDrafts((prev) => {
			const list = Array.isArray(prev) ? prev : [];
			return list.map((d) => {
				if (d.attributeId) return d;
				const match = specAttributes.find((a) => String(a.attributeCode || '').toUpperCase() === d.code);
				if (!match?.attributeId) return d;
				return { ...d, attributeId: String(match.attributeId) };
			});
		});
	}, [specAttributes]);

	const computedItemName = useMemo(() => {
		const parts = [];
		const catName = String(selectedCategory?.categoryName || '').trim();
		const brand = String(selectedBrand?.brandName || '').trim();
		const line = String(selectedProductLine?.lineName || '').trim();
		if (catName) parts.push(catName);
		if (brand) parts.push(brand);
		if (line) parts.push(line);

		const valueByCode = new Map();
		for (const d of Array.isArray(specDrafts) ? specDrafts : []) {
			const v = String(d?.specValue || '').trim();
			const code = String(d?.code || '').trim().toUpperCase();
			if (!v || !code) continue;
			valueByCode.set(code, v);
		}
		// Use the current specDrafts order to append spec values to the name
		const orderedCodes = (Array.isArray(specDrafts) ? specDrafts : []).map((s) => String(s.code || '').toUpperCase()).filter(Boolean);
		for (const c of orderedCodes) {
			const v = valueByCode.get(c);
			if (v) parts.push(v);
		}
		return parts.join(' ').replaceAll(/\s+/g, ' ').trim();
	}, [selectedBrand?.brandName, selectedCategory?.categoryName, selectedProductLine?.lineName, specDrafts]);

	const createdCatalogItemId = useMemo(() => {
		const raw = createdCatalogItem?.itemId ?? createdCatalogItem?.catalogItemId ?? createdCatalogItem?.id;
		const n = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(n) && n > 0 ? n : null;
	}, [createdCatalogItem]);

	const canShowBrandStep = useMemo(() => {
		return Boolean(String(selectedCategoryId || '').trim()) && !isAddingNewCategory;
	}, [isAddingNewCategory, selectedCategoryId]);

	const canShowProductLineStep = useMemo(() => {
		return canShowBrandStep && Boolean(String(selectedBrandId || '').trim()) && !isAddingNewBrand;
	}, [canShowBrandStep, isAddingNewBrand, selectedBrandId]);

	const canShowCatalogItemStep = useMemo(() => {
		return canShowProductLineStep && Boolean(String(selectedProductLineId || '').trim()) && !isAddingNewProductLine;
	}, [canShowProductLineStep, isAddingNewProductLine, selectedProductLineId]);

	const canShowSpecsStep = Boolean(createdCatalogItemId);

	useEffect(() => {
		if (!createdCatalogItemId) {
			setSavedSpecs([]);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				setIsSpecsLoading(true);
				const token = localStorage.getItem('authToken');
				const res = await fetchWarehouseSpecificationsByCatalogItemId(createdCatalogItemId, token);
				const list = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];
				if (cancelled) return;
				setSavedSpecs(list);
			} catch {
				if (cancelled) return;
				setSavedSpecs([]);
			} finally {
				if (!cancelled) setIsSpecsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [createdCatalogItemId]);


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
			const createdId = Number(created?.brandId) || null;
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

	const startAddNewCategory = useCallback(() => {
		previousCategoryIdRef.current = String(selectedCategoryId || '');
		setIsAddingNewCategory(true);
		setSelectedCategoryId('');
		setCategoryCode('');
		setCategoryName('');
		setSelectedTaxRuleId('');
		setIsAddingNewTaxRule(false);
		setTaxName('');
		setTaxRate('');
	}, [selectedCategoryId]);

	const stopAddNewCategory = useCallback(() => {
		setIsAddingNewCategory(false);
		const restored = previousCategoryIdRef.current;
		const restoredExists = restored && categories.some((c) => String(c?.itemCategoryId) === String(restored));
		if (restoredExists) {
			setSelectedCategoryId(restored);
			return;
		}
		const firstId = categories?.[0]?.itemCategoryId ? String(categories[0].itemCategoryId) : '';
		setSelectedCategoryId(firstId);
	}, [categories]);

	const handleCreateCategory = useCallback(async () => {
		if (isCreatingCategory) return;
		const code = String(categoryCode || '').trim();
		const name = String(categoryName || '').trim();
		const type = CATEGORY_TYPE_FIXED;
		const taxRuleIdNumRaw = selectedTaxRuleId ? Number(selectedTaxRuleId) : null;
		const taxRuleIdNum = Number.isFinite(taxRuleIdNumRaw) && taxRuleIdNumRaw > 0 ? taxRuleIdNumRaw : null;
		if (!code || !name) {
			notify('Vui lòng nhập đủ: Mã nhóm, Tên nhóm.');
			return;
		}
		try {
			setIsCreatingCategory(true);
			const token = localStorage.getItem('authToken');

			const basePayload = {
				// Legacy id field (some envs still expect itemCategoryId)
				itemCategoryId: null,
				// New id field (work category)
				workCategoryId: null,
				categoryCode: code,
				categoryName: name,
				displayOrder: 0,
				isActive: true,
				estimateItemEstimateItem: 0,
				isDefault: true,
				taxRuleId: taxRuleIdNum,
				categoryType: type,
			};

			const res = await createWarehouseItemCategory(basePayload, token);

			const created = mapCategoryItem(extractPayload(res));
			const createdId = Number(created?.itemCategoryId) || null;
			if (!createdId) {
				notify('Tạo nhóm thất bại (không nhận được itemCategoryId).');
				return;
			}
			setCategories((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((c) => Number(c?.itemCategoryId) !== createdId);
				return [created, ...withoutDup];
			});
			setIsAddingNewCategory(false);
			setSelectedCategoryId(String(createdId));
			notify('Đã thêm nhóm mới.');
		} catch (err) {
			notify(err?.message || 'Không thể tạo nhóm.');
		} finally {
			setIsCreatingCategory(false);
		}
	}, [categoryCode, categoryName, isCreatingCategory, notify, selectedTaxRuleId]);

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
		const name = String(taxName || '').trim();
		if (!name) {
			notify('Vui lòng nhập tên thuế.');
			return;
		}
		const rateNumber = Number(String(taxRate || '').trim());
		if (Number.isNaN(rateNumber)) {
			notify('Vui lòng nhập thuế suất hợp lệ.');
			return;
		}
		try {
			setIsCreatingTaxRule(true);
			const res = await createTaxRule({ taxName: name, taxRate: rateNumber }, token);
			const created = mapTaxRuleItem(extractPayload(res));
			const createdId = Number(created?.taxRuleId) || null;
			if (!createdId) {
				notify('Tạo thuế thất bại (không nhận được taxRuleId).');
				return;
			}
			setTaxRules((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((t) => Number(t?.taxRuleId) !== createdId);
				return [created, ...withoutDup];
			});
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

	const startAddNewProductTaxRule = useCallback(() => {
		if (isTaxRulesLoading) return;
		setIsAddingNewProductTaxRule(true);
		setProductTaxName('');
		setProductTaxRate('');
	}, [isTaxRulesLoading]);

	const stopAddNewProductTaxRule = useCallback(() => {
		if (isCreatingProductTaxRule) return;
		setIsAddingNewProductTaxRule(false);
		setProductTaxName('');
		setProductTaxRate('');
	}, [isCreatingProductTaxRule]);

	const handleCreateProductTaxRule = useCallback(async () => {
		if (isCreatingProductTaxRule) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			notify('Vui lòng đăng nhập để tạo loại thuế.');
			return;
		}
		const name = String(productTaxName || '').trim();
		if (!name) {
			notify('Vui lòng nhập tên thuế.');
			return;
		}
		const rateNumber = Number(String(productTaxRate || '').trim());
		if (Number.isNaN(rateNumber)) {
			notify('Vui lòng nhập thuế suất hợp lệ.');
			return;
		}
		try {
			setIsCreatingProductTaxRule(true);
			const res = await createTaxRule({ taxName: name, taxRate: rateNumber }, token);
			const created = mapTaxRuleItem(extractPayload(res));
			const createdId = Number(created?.taxRuleId) || null;
			if (!createdId) {
				notify('Tạo thuế thất bại (không nhận được taxRuleId).');
				return;
			}
			setTaxRules((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((t) => Number(t?.taxRuleId) !== createdId);
				return [created, ...withoutDup];
			});
			setSelectedProductTaxRuleId(String(createdId));
			setIsAddingNewProductTaxRule(false);
			setProductTaxName('');
			setProductTaxRate('');
			notify('Đã thêm thuế mới cho sản phẩm.');
		} catch (err) {
			notify(err?.message || 'Không thể tạo thuế.');
		} finally {
			setIsCreatingProductTaxRule(false);
		}
	}, [isCreatingProductTaxRule, notify, productTaxName, productTaxRate]);

	const startAddNewProductLine = useCallback(() => {
		previousProductLineIdRef.current = String(selectedProductLineId || '');
		setIsAddingNewProductLine(true);
		setSelectedProductLineId('');
		setProductLineName('');
	}, [selectedProductLineId]);

	const stopAddNewProductLine = useCallback(() => {
		setIsAddingNewProductLine(false);
		const restored = previousProductLineIdRef.current;
		const restoredExists = restored && productLines.some((l) => String(l?.productLineId) === String(restored));
		if (restoredExists) {
			setSelectedProductLineId(restored);
			return;
		}
		const firstId = filteredProductLines?.[0]?.productLineId ? String(filteredProductLines[0].productLineId) : '';
		setSelectedProductLineId(firstId);
	}, [filteredProductLines, productLines]);

	const handleCreateProductLine = useCallback(async () => {
		if (isCreatingProductLine) return;
		const brandId = Number(selectedBrandId) || null;
		if (!brandId) {
			notify('Vui lòng chọn hãng trước khi tạo dòng sản phẩm.');
			return;
		}
		const name = String(productLineName || '').trim();
		if (!name) {
			notify('Vui lòng nhập tên dòng sản phẩm.');
			return;
		}
		try {
			setIsCreatingProductLine(true);
			const token = localStorage.getItem('authToken');
			const res = await createWarehouseProductLine(
				{ productLineId: null, brandId, lineName: name, isActive: '1' },
				token,
			);
			const created = mapProductLineItem(extractPayload(res));
			const createdId = Number(created?.productLineId) || null;
			if (!createdId) {
				notify('Tạo dòng sản phẩm thất bại (không nhận được productLineId).');
				return;
			}
			setProductLines((prev) => {
				const list = Array.isArray(prev) ? prev : [];
				const withoutDup = list.filter((l) => Number(l?.productLineId) !== createdId);
				return [created, ...withoutDup];
			});
			setIsAddingNewProductLine(false);
			setSelectedProductLineId(String(createdId));
			notify('Đã thêm dòng sản phẩm mới.');
		} catch (err) {
			notify(err?.message || 'Không thể tạo dòng sản phẩm.');
		} finally {
			setIsCreatingProductLine(false);
		}
	}, [isCreatingProductLine, notify, productLineName, selectedBrandId]);

	// Image file selection (local preview only)
	const handleImageFileChange = useCallback(
		(e) => {
			const file = e?.target?.files?.[0] ?? null;
			if (!file) {
				if (imagePreviewUrl) {
					URL.revokeObjectURL(imagePreviewUrl);
					setImagePreviewUrl('');
				}
				setImageFile(null);
				return;
			}
			if (imagePreviewUrl) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
			const url = URL.createObjectURL(file);
			setImageFile(file);
			setImagePreviewUrl(url);
		},
		[imagePreviewUrl],
	);

	useEffect(() => {
		return () => {
			if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
		};
	}, [imagePreviewUrl]);

	const handleSubmitProduct = useCallback(async () => {
		if (isCreatingCatalogItem) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			notify('Vui lòng đăng nhập để tạo sản phẩm.');
			return;
		}
		const categoryId = Number(selectedCategoryId) || null;
		const brandId = Number(selectedBrandId) || null;
		const productLineId = Number(selectedProductLineId) || null;
		if (!categoryId) {
			notify('Vui lòng chọn hạng mục sản phẩm (Item Category).');
			return;
		}
		if (!brandId) {
			notify('Vui lòng chọn hãng.');
			return;
		}
		if (!productLineId) {
			notify('Vui lòng chọn dòng sản phẩm.');
			return;
		}
		const skuTrim = String(sku || '').trim();
		if (!skuTrim) {
			notify('Vui lòng nhập SKU.');
			return;
		}
		const itemName = computedItemName;
		if (!itemName) {
			notify('Vui lòng nhập đủ thông tin để tạo tên sản phẩm (nhóm/hãng/dòng).');
			return;
		}
		const priceNum = Number(String(price || '').trim());
		if (!Number.isFinite(priceNum)) {
			notify('Vui lòng nhập giá hợp lệ.');
			return;
		}
		const warrantyNum = String(warrantyDurationMonths || '').trim() === '' ? 0 : Number(warrantyDurationMonths);
		if (!Number.isFinite(warrantyNum) || warrantyNum < 0) {
			notify('Bảo hành (tháng) không hợp lệ.');
			return;
		}

		try {
			setIsCreatingCatalogItem(true);
			const taxRuleIdNumRaw = selectedProductTaxRuleId ? Number(selectedProductTaxRuleId) : null;
			const taxRuleIdNum = Number.isFinite(taxRuleIdNumRaw) && taxRuleIdNumRaw > 0 ? taxRuleIdNumRaw : null;
			const res = await createWarehouseCatalogItem(
				{
					itemName,
					itemType,
					warrantyDurationMonths: Math.trunc(warrantyNum),
					serviceServiceId: 0,
					sku: skuTrim,
					price: priceNum,
					showPrice,
					description: String(description || '').trim(),
					// imageUrl: String(imageUrl || '').trim(),
					unit: String(unit || '').trim(),
					comboDurationMonths: 0,
					comboDescription: '',
					isRecurring: false,
					brandId,
					productLineId,
					// Backward compatible (older warehouse API)
					itemCategoryId: categoryId,
					// Newer API shape (work category)
					workCategoryId: categoryId,
					taxRuleId: taxRuleIdNum,
				},
				token,
			);
			const created = extractPayload(res);
			const createdId = Number(created?.itemId ?? created?.catalogItemId ?? created?.id ?? 0) || null;
			if (!createdId) {
				notify('Tạo sản phẩm thất bại (không nhận được CatalogItemId/itemId).');
				return;
			}
			setCreatedCatalogItem(created);
			notify(`Đã tạo sản phẩm (#${createdId}).`);
		} catch (err) {
			notify(err?.message || 'Không thể tạo sản phẩm.');
		} finally {
			setIsCreatingCatalogItem(false);
		}
	}, [
		description,
		computedItemName,
		// imageUrl,
		isCreatingCatalogItem,
		itemType,
		notify,
		price,
		selectedBrandId,
		selectedCategoryId,
		selectedProductLineId,
		selectedProductTaxRuleId,
		showPrice,
		sku,
		unit,
		warrantyDurationMonths,
	]);

	const handleCreateSpecAttributeIfNeeded = useCallback(
		async (draftIndex) => {
			const d = specDrafts?.[draftIndex];
			if (!d) return null;
			if (d.attributeId) return Number(d.attributeId) || null;
			const token = localStorage.getItem('authToken');
			if (!token) {
				notify('Vui lòng đăng nhập để tạo thuộc tính thông số.');
				return null;
			}
			try {
				setSpecDrafts((prev) => prev.map((x, idx) => (idx === draftIndex ? { ...x, creatingAttribute: true } : x)));
				// Generate attributeCode if missing (safe fallback from displayName)
				const codeCandidate = String(d.code || '').trim();
				const attributeCode =
					codeCandidate ||
					String(d.displayName || '')
						.trim()
						.toUpperCase()
						.replace(/[^A-Z0-9]+/g, '_')
						.slice(0, 50);
				const res = await createWarehouseSpecAttribute(
					{
						attributeId: null,
						attributeCode,
						displayName: String(d.displayName || '').trim() || attributeCode,
						unit: String(d.unit || '').trim(),
					},
					token,
				);
				const created = mapSpecAttributeItem(extractPayload(res));
				const createdId = Number(created?.attributeId) || null;
				if (!createdId) {
					notify('Tạo thuộc tính thất bại (không nhận được attributeId).');
					return null;
				}
				setSpecAttributes((prev) => {
					const list = Array.isArray(prev) ? prev : [];
					const withoutDup = list.filter((a) => Number(a?.attributeId) !== createdId);
					return [created, ...withoutDup];
				});
				setSpecDrafts((prev) =>
					prev.map((x, idx) =>
						idx === draftIndex
							? {
								...x,
								attributeId: String(createdId),
								code: String(created?.attributeCode || '').toUpperCase(),
								displayName: created?.displayName || x.displayName,
								unit: created?.unit || x.unit,
								creatingAttribute: false,
								isCreatingNew: false,
							}
						: x,
					),
				);
				return createdId;
			} catch (err) {
				notify(err?.message || 'Không thể tạo thuộc tính thông số.');
				setSpecDrafts((prev) => prev.map((x, idx) => (idx === draftIndex ? { ...x, creatingAttribute: false } : x)));
				return null;
			}
		},
		[notify, specDrafts],
	);

	const handleSaveSpecificationValue = useCallback(
		async (draftIndex) => {
			if (!createdCatalogItemId) {
				notify('Vui lòng tạo sản phẩm trước khi lưu thông số.');
				return;
			}
			const d = specDrafts?.[draftIndex];
			if (!d) return;
			const value = String(d.specValue || '').trim();
			if (!value) {
				notify('Vui lòng nhập giá trị thông số.');
				return;
			}
			const token = localStorage.getItem('authToken');
			if (!token) {
				notify('Vui lòng đăng nhập để lưu thông số.');
				return;
			}

			// Require attributeId to be present before saving spec value
			const attributeId = Number(d.attributeId) || null;
			if (!attributeId) {
				notify('Vui lòng chọn hoặc tạo thuộc tính trước khi lưu giá trị.');
				return;
			}

			try {
				setSpecDrafts((prev) => prev.map((x, idx) => (idx === draftIndex ? { ...x, creatingSpec: true } : x)));
				await createWarehouseSpecificationValue(
					{ specId: null, itemId: createdCatalogItemId, attributeId, specValue: value },
					token,
				);
				const res = await fetchWarehouseSpecificationsByCatalogItemId(createdCatalogItemId, token);
				const list = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];
				setSavedSpecs(list);
				notify('Đã lưu thông số.');
			} catch (err) {
				notify(err?.message || 'Không thể lưu thông số.');
			} finally {
				setSpecDrafts((prev) => prev.map((x, idx) => (idx === draftIndex ? { ...x, creatingSpec: false } : x)));
			}
		},
		[createdCatalogItemId, notify, specDrafts],
	);

	return (
		<div className={styles['service-page']}>
			<section className={styles['service-card']}>
				<div className={styles['service-card__header']}>
					<div className={styles['service-card__title']}>
						<strong>Tạo sản phẩm</strong>
					</div>
				</div>

				<div className={styles['pending-filters']}>
					<div style={{ fontWeight: 600, marginBottom: 8 }}>Tên sản phẩm</div>
					<div className={styles['filter-card__hint']}>
						{computedItemName || 'Nhập nhóm/hãng/dòng + thông số để tạo tên'}
					</div>
				</div>

				{/* Step 1: Category */}
				<div className={styles['pending-filters']}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
						<div style={{ fontWeight: 600 }}>1) Hạng mục sản phẩm </div>
						{isAddingNewCategory ? (
							<div style={{ display: 'flex', gap: 8 }}>
								<button
									type="button"
									className={styles['primary-button']}
									onClick={handleCreateCategory}
									disabled={isCreatingCategory || Boolean(createdCatalogItemId)}
								>
									{isCreatingCategory ? 'Đang thêm...' : 'Xác nhận thêm hạng mục'}
								</button>
								<button
									type="button"
									className={styles['ghost-button']}
									onClick={stopAddNewCategory}
									disabled={isCreatingCategory || Boolean(createdCatalogItemId)}
								>
									Chọn từ danh sách
								</button>
							</div>
						) : (
							<button
								type="button"
								className={styles['primary-button']}
								onClick={startAddNewCategory}
								disabled={isCategoriesLoading || Boolean(createdCatalogItemId)}
							>
								Thêm nhóm
							</button>
						)}
					</div>

					{isAddingNewCategory ? (
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12, marginBottom: 0 }}>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="categoryCode">Mã nhóm</label>
								<input id="categoryCode" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="categoryName">Tên nhóm</label>
								<input id="categoryName" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="categoryType">Loại</label>
								<input id="categoryType" value={categoryType} disabled />
							</div>
							<div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
									<div style={{ fontWeight: 600 }}>Thuế</div>
									{isAddingNewTaxRule ? (
										<div style={{ display: 'flex', gap: 8 }}>
											<button
												type="button"
												className={styles['primary-button']}
												onClick={handleCreateTaxRule}
												disabled={isCreatingTaxRule || Boolean(createdCatalogItemId)}
											>
												{isCreatingTaxRule ? 'Đang thêm...' : 'Xác nhận thuế'}
											</button>
											<button
												type="button"
												className={styles['ghost-button']}
												onClick={stopAddNewTaxRule}
												disabled={isCreatingTaxRule || Boolean(createdCatalogItemId)}
											>
												Hủy
											</button>
										</div>
									) : (
										<button
											type="button"
											className={styles['ghost-button']}
											onClick={startAddNewTaxRule}
											disabled={isTaxRulesLoading || Boolean(createdCatalogItemId)}
										>
											Thêm thuế
										</button>
									)}
								</div>

								{isAddingNewTaxRule ? (
									<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
										<div className="ui-field" style={{ marginBottom: 0 }}>
											<label htmlFor="taxName">Tên thuế</label>
											<input
												id="taxName"
												value={taxName}
												onChange={(e) => setTaxName(e.target.value)}
												placeholder="Ví dụ: VAT 10%"
												disabled={isCreatingTaxRule || Boolean(createdCatalogItemId)}
											/>
										</div>
										<div className="ui-field" style={{ marginBottom: 0 }}>
											<label htmlFor="taxRate">Thuế suất</label>
											<input
												id="taxRate"
												value={taxRate}
												onChange={(e) => setTaxRate(e.target.value)}
												placeholder="10 hoặc 0.1"
												disabled={isCreatingTaxRule || Boolean(createdCatalogItemId)}
											/>
										</div>
									</div>
								) : (
									<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
										<div className="ui-field" style={{ marginBottom: 0 }}>
											<label htmlFor="taxRuleSelect">Chọn thuế</label>
											<select
												id="taxRuleSelect"
												value={selectedTaxRuleId}
												onChange={(e) => setSelectedTaxRuleId(e.target.value)}
												disabled={isTaxRulesLoading || isCreatingCategory || Boolean(createdCatalogItemId)}
											>
												<option value="">Không áp dụng</option>
												{taxRules.map((t) => (
													<option key={String(t.taxRuleId)} value={String(t.taxRuleId)}>
														{getTaxRuleSelectLabel(t) || `#${t.taxRuleId}`}
													</option>
												))}
											</select>
											{selectedTaxRule ? (
												<div className={styles['filter-card__hint']}>
													Thuế suất: {formatTaxRatePercent(selectedTaxRule) || '--'}
												</div>
											) : null}
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<select
								id="categorySelect"
								value={selectedCategoryId}
								onChange={(e) => setSelectedCategoryId(e.target.value)}
								disabled={isCategoriesLoading || Boolean(createdCatalogItemId)}
							>
								<option value="">{categoryPlaceholder}</option>
								{categories.map((c) => (
									<option key={String(c.itemCategoryId)} value={String(c.itemCategoryId)}>
										{c.categoryName || c.categoryCode || `#${c.itemCategoryId}`}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* Step 2: Brand */}
				{canShowBrandStep ? (
					<div className={styles['pending-filters']}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
							<div style={{ fontWeight: 600 }}>2) Hãng</div>
							{isAddingNewBrand ? (
								<div style={{ display: 'flex', gap: 8 }}>
									<button type="button" className={styles['primary-button']} onClick={handleCreateBrand} disabled={isCreatingBrand || Boolean(createdCatalogItemId)}>
										{isCreatingBrand ? 'Đang thêm...' : 'Xác nhận thêm hãng'}
									</button>
									<button type="button" className={styles['ghost-button']} onClick={stopAddNewBrand} disabled={isCreatingBrand || Boolean(createdCatalogItemId)}>
										Chọn từ danh sách
									</button>
								</div>
							) : (
								<button type="button" className={styles['primary-button']} onClick={startAddNewBrand} disabled={isBrandsLoading || Boolean(createdCatalogItemId)}>
									Thêm hãng
								</button>
							)}
						</div>

						{isAddingNewBrand ? (
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="brandName">Tên hãng (mới)</label>
								<input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Nhập tên hãng" autoComplete="off" disabled={Boolean(createdCatalogItemId)} />
							</div>
						) : (
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<select id="brandSelect" value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} disabled={isBrandsLoading || !brands.length || Boolean(createdCatalogItemId)}>
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
				) : null}

				{/* Step 3: Product line */}
				{canShowProductLineStep ? (
					<div className={styles['pending-filters']} style={{ marginTop: 12 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
							<div style={{ fontWeight: 600 }}>3) Dòng sản phẩm </div>
							{isAddingNewProductLine ? (
								<div style={{ display: 'flex', gap: 8 }}>
									<button type="button" className={styles['primary-button']} onClick={handleCreateProductLine} disabled={isCreatingProductLine || Boolean(createdCatalogItemId)}>
										{isCreatingProductLine ? 'Đang thêm...' : 'Xác nhận thêm dòng'}
									</button>
									<button type="button" className={styles['ghost-button']} onClick={stopAddNewProductLine} disabled={isCreatingProductLine || Boolean(createdCatalogItemId)}>
										Chọn từ danh sách
									</button>
								</div>
							) : (
								<button type="button" className={styles['primary-button']} onClick={startAddNewProductLine} disabled={!selectedBrandId || isProductLinesLoading || Boolean(createdCatalogItemId)}>
									Thêm dòng
								</button>
							)}
						</div>

						{isAddingNewProductLine ? (
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="productLineName">Tên dòng sản phẩm (mới)</label>
								<input id="productLineName" value={productLineName} onChange={(e) => setProductLineName(e.target.value)} placeholder="Nhập tên dòng" autoComplete="off" disabled={Boolean(createdCatalogItemId)} />
							</div>
						) : (
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<select id="productLineSelect" value={selectedProductLineId} onChange={(e) => setSelectedProductLineId(e.target.value)} disabled={isProductLinesLoading || !filteredProductLines.length || Boolean(createdCatalogItemId)}>
									<option value="">{productLinePlaceholder}</option>
									{filteredProductLines.map((l) => (
										<option key={String(l.productLineId)} value={String(l.productLineId)}>
											{l.lineName || `#${l.productLineId}`}
										</option>
									))}
								</select>
							</div>
						)}
					</div>
				) : null}

				{/* Step 4: Catalog item fields */}
				{canShowCatalogItemStep ? (
					<div className={styles['pending-filters']} style={{ marginTop: 12 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>4) Thông tin sản phẩm (Catalog Item)</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="itemType">Loại</label>
								<input id="itemType" value={itemType} disabled />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="sku">SKU</label>
								<input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="price">Giá</label>
								<input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="unit">Đơn vị</label>
								<input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="warranty">Bảo hành (tháng)</label>
								<input id="warranty" type="number" value={warrantyDurationMonths} onChange={(e) => setWarrantyDurationMonths(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
								<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
									<input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} disabled={Boolean(createdCatalogItemId)} />
									<span>Hiển thị giá</span>
								</label>
							</div>
						</div>

						<div style={{ marginTop: 12 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
								<div style={{ fontWeight: 600 }}>Thuế sản phẩm</div>
								{isAddingNewProductTaxRule ? (
									<div style={{ display: 'flex', gap: 8 }}>
										<button
											type="button"
											className={styles['primary-button']}
											onClick={handleCreateProductTaxRule}
											disabled={isCreatingProductTaxRule || Boolean(createdCatalogItemId)}
										>
											{isCreatingProductTaxRule ? 'Đang thêm...' : 'Xác nhận thuế'}
										</button>
										<button
											type="button"
											className={styles['ghost-button']}
											onClick={stopAddNewProductTaxRule}
											disabled={isCreatingProductTaxRule || Boolean(createdCatalogItemId)}
										>
											Hủy
										</button>
									</div>
								) : (
									<button
										type="button"
										className={styles['ghost-button']}
										onClick={startAddNewProductTaxRule}
										disabled={isTaxRulesLoading || Boolean(createdCatalogItemId)}
									>
										Thêm thuế
									</button>
								)}
							</div>

							{isAddingNewProductTaxRule ? (
								<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
									<div className="ui-field" style={{ marginBottom: 0 }}>
										<label htmlFor="productTaxName">Tên thuế</label>
										<input
											id="productTaxName"
											value={productTaxName}
											onChange={(e) => setProductTaxName(e.target.value)}
											placeholder="Ví dụ: VAT 10%"
											disabled={isCreatingProductTaxRule || Boolean(createdCatalogItemId)}
										/>
									</div>
									<div className="ui-field" style={{ marginBottom: 0 }}>
										<label htmlFor="productTaxRate">Thuế suất</label>
										<input
											id="productTaxRate"
											value={productTaxRate}
											onChange={(e) => setProductTaxRate(e.target.value)}
											placeholder="10 hoặc 0.1"
											disabled={isCreatingProductTaxRule || Boolean(createdCatalogItemId)}
										/>
									</div>
							</div>
							) : (
								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label htmlFor="productTaxRuleSelect">Chọn thuế</label>
									<select
										id="productTaxRuleSelect"
										value={selectedProductTaxRuleId}
										onChange={(e) => setSelectedProductTaxRuleId(e.target.value)}
										disabled={isTaxRulesLoading || isCreatingCatalogItem || Boolean(createdCatalogItemId)}
									>
										<option value="">Không áp dụng</option>
										{taxRules.map((t) => (
											<option key={String(t.taxRuleId)} value={String(t.taxRuleId)}>
												{getTaxRuleSelectLabel(t) || `#${t.taxRuleId}`}
											</option>
										))}
									</select>
									{selectedProductTaxRule ? (
										<div className={styles['filter-card__hint']}>
											Thuế suất: {formatTaxRatePercent(selectedProductTaxRule) || '--'}
										</div>
									) : null}
								</div>
							)}
						</div>
						<div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
							<label htmlFor="description">Mô tả</label>
							<textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
						</div>
						<div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
							<label htmlFor="imageFile">Ảnh </label>
							<input id="imageFile" type="file" accept="image/*" onChange={handleImageFileChange} disabled={Boolean(createdCatalogItemId)} />
							{imagePreviewUrl ? (
								<div style={{ marginTop: 8 }}>
									{imageFile?.name ? <div style={{ fontSize: 12, marginBottom: 6 }}>{imageFile.name}</div> : null}
									<img src={imagePreviewUrl} alt="Preview" style={{ maxWidth: 240, maxHeight: 240, objectFit: 'contain' }} />
								</div>
							) : null}
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 12 }}>
							<button type="button" className={styles['primary-button']} onClick={handleSubmitProduct} disabled={isCreatingCatalogItem || Boolean(createdCatalogItemId)}>
								{createdCatalogItemId ? `Đã tạo (#${createdCatalogItemId})` : isCreatingCatalogItem ? 'Đang tạo...' : 'Tạo sản phẩm'}
							</button>
						</div>
					</div>
				) : null}

				{/* Step 5-6: Specs */}
				{canShowSpecsStep ? (
					<div className={styles['pending-filters']} style={{ marginTop: 12 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>5-6) Thông số (Spec Attribute + Specification Value)</div>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>

						</div>

						<table className={styles['service-table']}>
							<thead>
								<tr>
									<th style={{ width: 140 }}>Mã</th>
									<th style={{ width: 220 }}>Thuộc tính</th>
									<th>Giá trị</th>
									<th style={{ width: 160 }}>Hành động</th>
								</tr>
							</thead>
							<tbody>
								{specDrafts.map((d, idx) => {
									const options = Array.isArray(specAttributes) ? specAttributes : [];
									const selectedAttr = specAttributes.find((sa) => String(sa.attributeId) === String(d.attributeId));
									const selectedUnit = selectedAttr?.unit || '';

									return (
										<tr key={d.id}>
											<td>{d.code}</td>
											<td>
												{d.isCreatingNew ? (
													<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
														<input
															className={styles['spec-input']}
															value={d.displayName}
															onChange={(e) =>
																setSpecDrafts((prev) => prev.map((x, i) => (i === idx ? { ...x, displayName: e.target.value } : x)))
															}
															placeholder="Tên hiển thị"
															disabled={d.creatingAttribute}
														/>
														<div style={{ display: 'flex', gap: 8 }}>
															<input
																className={styles['spec-input']}
																value={d.unit}
																onChange={(e) =>
																setSpecDrafts((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))
															}
															placeholder="Đơn vị"
															disabled={d.creatingAttribute}
															/>
															<button
																type="button"
																className={styles['ghost-button']}
																onClick={() => handleCreateSpecAttributeIfNeeded(idx)}
																disabled={d.creatingAttribute || !d.displayName}
															>
																{d.creatingAttribute ? 'Đang tạo...' : 'Tạo thuộc tính'}
															</button>
															<button
																type="button"
																className={styles['ghost-button']}
																onClick={() => setSpecDrafts((prev) => prev.map((x, i) => (i === idx ? { ...x, isCreatingNew: false } : x)))}
															>
																Huỷ
															</button>
														</div>
													</div>
												) : (
													<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
														<select
															className={styles['spec-select']}
															value={d.attributeId || ''}
															onChange={(e) => {
																const val = e.target.value;
																const attr = specAttributes.find((a) => String(a.attributeId) === String(val));
																setSpecDrafts((prev) =>
																	prev.map((x, i) =>
																		i === idx
																			? {
																				...x,
																				attributeId: val,
																				code: attr?.attributeCode || x.code,
																				displayName: attr?.displayName || x.displayName,
																				unit: attr?.unit || x.unit,
																			}
																		: x,
																	),
																);
															}}
															disabled={isSpecAttributesLoading}
														>
															<option value="">Chọn thuộc tính</option>
															{options.map((a) => (
																<option key={String(a.attributeId)} value={String(a.attributeId)}>
																	{a.displayName || a.attributeCode}
																</option>
															))}
														</select>
														<input className={styles['spec-input']} value={selectedUnit} readOnly placeholder="Đơn vị" style={{ minWidth: 100 }} />
														<button
															type="button"
															className={styles['ghost-button']}
															onClick={() => setSpecDrafts((prev) => prev.map((x, i) => (i === idx ? { ...x, isCreatingNew: true } : x)))}
															disabled={d.creatingAttribute}
														>
															Tạo thuộc tính
														</button>
													</div>
												)}
											</td>
											<td>
												<input
													className={styles['spec-input']}
													value={d.specValue}
													onChange={(e) =>
														setSpecDrafts((prev) => prev.map((x, i) => (i === idx ? { ...x, specValue: e.target.value } : x)))
													}
													disabled={d.creatingSpec}
												/>
											</td>
											<td>
												<div style={{ display: 'flex', gap: 8 }}>
													<button
														type="button"
														className={styles['primary-button']}
														onClick={() => handleSaveSpecificationValue(idx)}
														disabled={!createdCatalogItemId || d.creatingAttribute || d.creatingSpec || !d.attributeId || !String(d.specValue || '').trim()}
													>
														{d.creatingSpec ? 'Đang lưu...' : 'Lưu'}
													</button>
													<button
														type="button"
														className={styles['ghost-button']}
														onClick={() => removeSpecDraft(idx)}
														disabled={d.creatingAttribute || d.creatingSpec}
													>
														Xoá
													</button>
												</div>
											</td>
										</tr>
									);
								})}
						</tbody>
					</table>

					<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
						<button type="button" className={styles['ghost-button']} onClick={addSpecDraft}>
							Thêm thông số
						</button>
					</div>

					<div style={{ marginTop: 12 }}>
						<div style={{ fontWeight: 600, marginBottom: 8,fontSize: 16 }}>Thông số đã lưu</div>
						{isSpecsLoading ? (
							<div className={styles['filter-card__hint']}>Đang tải...</div>
						) : savedSpecs.length ? (
							<table className={styles['service-table']}>
								<thead>
									<tr>
										<th style={{ fontWeight: 600, fontSize: 15 }}>Thuộc tính</th>
										<th style={{ fontWeight: 600, fontSize: 15 }}>Giá trị</th>
                                        <th style={{ fontWeight: 600, fontSize: 15 }}>Đơn vị</th>
									</tr>
								</thead>
								<tbody>
									{savedSpecs.map((s, i) => {
										const attr = specAttributes.find((a) => Number(a.attributeId) === Number(s?.attributeId));
										return (
											<tr key={`${s?.specId ?? ''}-${i}`}>
												<td>{attr?.displayName || attr?.attributeCode || s?.attributeId || '-'}</td>
												<td>{s?.specValue ?? '-'}</td>
												<td>{s?.specUnit || attr?.unit || '-'}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<div className={styles['filter-card__hint']}>Chưa có thông số.</div>
						)}
					</div>
				</div>
				) : null}
			</section>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<button type="button" className={styles['primary-button']} onClick={() => navigate(-1)}>
							Quay lại
						</button>
					</div>
		</div>
	);
}
