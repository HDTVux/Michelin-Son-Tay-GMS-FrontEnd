import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import CompatibleCarsSelector from '../../../components/CompatibleCarsSelector.jsx';
import { validateTaxName, validateTaxRatePercent } from '../../../components/inputValidation.js';
import {
	createWarehouseCatalogItem,
	createWarehouseItemCategory,
	createWarehouseSpecAttribute,
	createWarehouseSpecificationValue,
	createTaxRule,
	fetchWarehouseBrands,
	fetchWarehouseItemCategories,
	fetchWarehouseProductLines,
	fetchWarehouseSpecAttributes,
	fetchWarehouseSpecificationsByCatalogItemId,
	fetchTaxRules,
	fetchWarehouseProductUnits,
	createWarehouseProductUnit,
} from '../../../services/warehouseService.js';
import { createServiceForCatalog } from '../../../services/blogService.js';
import { sendAiMessage } from '../../../services/aiAssistantService.js';
import { Sparkles } from 'lucide-react';

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
const OTHER_OPTION_VALUE = '__OTHER__';

// Helper functions for formatting description and editor HTML
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value) => String(value || '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');
const normalizeEditorHtml = (rawHtml) => {
	if (typeof window === 'undefined') return String(rawHtml || '');
	const wrapper = document.createElement('div');
	wrapper.innerHTML = String(rawHtml || '').trim();
	wrapper.querySelectorAll('b').forEach((node) => {
		const strong = document.createElement('strong');
		strong.innerHTML = node.innerHTML;
		node.replaceWith(strong);
	});
	wrapper.querySelectorAll('i').forEach((node) => {
		const em = document.createElement('em');
		em.innerHTML = node.innerHTML;
		node.replaceWith(em);
	});
	return wrapper.innerHTML;
};
const composeDescriptionHtml = (introText, detailHtml) => {
	const sections = [];
	const introTrim = String(introText || '').trim();
	if (introTrim) {
		const introParagraphs = introTrim.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
		sections.push('<h3>Giới thiệu</h3>');
		sections.push(introParagraphs);
	}
	const normalizedDetail = normalizeEditorHtml(detailHtml);
	if (stripHtml(normalizedDetail)) {
		sections.push('<h3>Chi tiết dịch vụ</h3>');
		sections.push(normalizedDetail);
	}
	if (!sections.length) return normalizedDetail;
	return sections.join('');
};

export default function CreateProduct() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const location = useLocation();
	const initialDraft = useMemo(() => {
		if (
			!location.state?.fromCategorySelection &&
			!location.state?.fromBrandSelection &&
			!location.state?.fromProductLineSelection &&
			!location.state?.fromOriginSelection &&
			!location.state?.fromColorSelection &&
			!location.state?.fromProductTaxSelection &&
			!location.state?.fromAttributeSelection &&
			!location.state?.fromUnitSelection
		) {
			sessionStorage.removeItem('gms_create_product_draft');
			delete window._gms_create_product_imageFile;
			delete window._gms_create_product_imagePreviewUrl;
			delete window._gms_create_product_blogMediaFiles;
			return null;
		}
		try {
			const raw = sessionStorage.getItem('gms_create_product_draft');
			if (raw) return JSON.parse(raw);
		} catch (e) {
			console.error(e);
		}
		return null;
	}, [location]);

	// Step 1: Category
	const [categories, setCategories] = useState([]);
	const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState(() => initialDraft?.selectedCategoryId ?? '');
	const selectedCategoryIdRef = useRef(initialDraft?.selectedCategoryId ?? '');

	// Tax rules (fetched for product tax configuration)
	const [taxRules, setTaxRules] = useState([]);
	const [isTaxRulesLoading, setIsTaxRulesLoading] = useState(false);

	// Step 2: Brand
	const [brands, setBrands] = useState([]);
	const [isBrandsLoading, setIsBrandsLoading] = useState(false);
	const [selectedBrandId, setSelectedBrandId] = useState(() => initialDraft?.selectedBrandId ?? '');
	const selectedBrandIdRef = useRef(initialDraft?.selectedBrandId ?? '');

	// Step 3: Product line
	const [productLines, setProductLines] = useState([]);
	const [isProductLinesLoading, setIsProductLinesLoading] = useState(false);
	const [selectedProductLineId, setSelectedProductLineId] = useState(() => initialDraft?.selectedProductLineId ?? '');
	const selectedProductLineIdRef = useRef(initialDraft?.selectedProductLineId ?? '');

	// Step 4: Catalog item
	const [isCreatingCatalogItem, setIsCreatingCatalogItem] = useState(false);
	const [createdCatalogItem, setCreatedCatalogItem] = useState(null);
	const [itemType, setItemType] = useState(() => initialDraft?.itemType ?? location.state?.defaultItemType ?? 'PART');
	const [selectedProductTaxRuleId, setSelectedProductTaxRuleId] = useState(() => initialDraft?.selectedProductTaxRuleId ?? '');
	const [sku, setSku] = useState(() => initialDraft?.sku ?? '');
	const [isScanning, setIsScanning] = useState(false);
	const codeReaderRef = useRef(null);
	const videoTrackRef = useRef(null);
	const fileInputRef = useRef(null);
	const [hasZoomSupport, setHasZoomSupport] = useState(false);
	const [zoomMin, setZoomMin] = useState(1);
	const [zoomMax, setZoomMax] = useState(10);
	const [zoomStep, setZoomStep] = useState(0.1);
	const [zoomValue, setZoomValue] = useState(1);
	const zoomTimeoutRef = useRef(null);
	const isApplyingZoomRef = useRef(false);
	const pendingZoomValRef = useRef(null);
	const [price, setPrice] = useState(() => initialDraft?.price ?? '');
	const [showPrice, setShowPrice] = useState(() => initialDraft?.showPrice ?? true);
	const [unit, setUnit] = useState(() => initialDraft?.unit ?? '');
	// Unit dropdown inline
	const [units, setUnits] = useState([]);
	const [isUnitsLoading, setIsUnitsLoading] = useState(false);
	const [showUnitDropdown, setShowUnitDropdown] = useState(false);
	const [unitSearchQuery, setUnitSearchQuery] = useState('');
	const [newUnitName, setNewUnitName] = useState('');
	const [isCreatingUnit, setIsCreatingUnit] = useState(false);
	const [showAddUnitInput, setShowAddUnitInput] = useState(false);
	const unitDropdownRef = useRef(null);
	const [origin, setOrigin] = useState(() => initialDraft?.origin ?? '');
	const [customOrigin, setCustomOrigin] = useState(() => initialDraft?.customOrigin ?? '');
	const [color, setColor] = useState(() => initialDraft?.color ?? '');
	const [customColor, setCustomColor] = useState(() => initialDraft?.customColor ?? '');
	const [description, setDescription] = useState(() => initialDraft?.description ?? '');
	const [compatibleCars, setCompatibleCars] = useState(() => initialDraft?.compatibleCars ?? '');
	// Image file is kept only in component state (no upload at create time)
	const [imageFile, setImageFile] = useState(() => {
		return window._gms_create_product_imageFile ?? null;
	});
	const [imagePreviewUrl, setImagePreviewUrl] = useState(() => {
		return window._gms_create_product_imagePreviewUrl ?? '';
	});
	// const [imageUrl, setImageUrl] = useState('');
	const [warrantyDurationMonths, setWarrantyDurationMonths] = useState(() => initialDraft?.warrantyDurationMonths ?? '');

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

	const [specDrafts, setSpecDrafts] = useState(() => initialDraft?.specDrafts ?? [makeSpecDraft()]);

	// Blog/article creation states
	const createBlogEnabled = true;
	const [introText, setIntroText] = useState(() => initialDraft?.introText ?? '');
	const [detailHtml, setDetailHtml] = useState(() => initialDraft?.detailHtml ?? '');
	const [blogMediaFiles, setBlogMediaFiles] = useState(() => {
		return Array.isArray(window._gms_create_product_blogMediaFiles) ? window._gms_create_product_blogMediaFiles : [];
	});
	const [isBlogSubmitting, setIsBlogSubmitting] = useState(false);
	const [isAiGenerating, setIsAiGenerating] = useState(false);
	const [aiTokenUsage, setAiTokenUsage] = useState(null);
	const editorRef = useRef(null);

	// Tên sản phẩm: gợi ý tự động từ nhóm/hãng/dòng/thông số, nhưng cho phép nhập tay.
	// Một khi người dùng đã tự sửa, ngừng ghi đè theo gợi ý tự động.
	const [itemNameInput, setItemNameInput] = useState(() => initialDraft?.itemNameInput ?? '');
	const [itemNameManualEdited, setItemNameManualEdited] = useState(() => Boolean(initialDraft?.itemNameManualEdited));

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

				const [catRes, brandRes, lineRes, attrRes, taxRes, unitRes] = await Promise.all([
					fetchWarehouseItemCategories(token),
					fetchWarehouseBrands(token),
					fetchWarehouseProductLines(token),
					fetchWarehouseSpecAttributes(token),
					fetchTaxRules(token),
					fetchWarehouseProductUnits(token),
				]);

				const catList = Array.isArray(extractPayload(catRes)) ? extractPayload(catRes) : [];
				const brandList = Array.isArray(extractPayload(brandRes)) ? extractPayload(brandRes) : [];
				const lineList = Array.isArray(extractPayload(lineRes)) ? extractPayload(lineRes) : [];
				const attrList = Array.isArray(extractPayload(attrRes)) ? extractPayload(attrRes) : [];
				const taxList = Array.isArray(extractPayload(taxRes)) ? extractPayload(taxRes) : [];
				const unitList = Array.isArray(extractPayload(unitRes)) ? extractPayload(unitRes) : [];

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
				setUnits(unitList.map(u => ({ unitId: u.unitId ?? u.id, unitName: u.unitName ?? u.name ?? '' })).filter(u => u.unitName && (String(u.isActive ?? u.active ?? '1') === '1' || u.isActive === true)));

				// Keep user's current selection only if it still exists in the refreshed list.
				// Otherwise, stay at default (empty) so the user explicitly chooses.
				const currentCategoryId = String(selectedCategoryIdRef.current || '').trim();
				const categoryValid = currentCategoryId &&
					currentCategoryId !== 'null' &&
					currentCategoryId !== 'undefined' &&
					catsNorm.some((c) => c.itemCategoryId && String(c.itemCategoryId) === currentCategoryId);
				setSelectedCategoryId(categoryValid ? currentCategoryId : '');

				const currentBrandId = String(selectedBrandIdRef.current || '').trim();
				const brandValid = currentBrandId &&
					currentBrandId !== 'null' &&
					currentBrandId !== 'undefined' &&
					brandsNorm.some((b) => b.brandId && String(b.brandId) === currentBrandId);
				setSelectedBrandId(brandValid ? currentBrandId : '');

				const currentLineId = String(selectedProductLineIdRef.current || '').trim();
				const lineValid = currentLineId &&
					currentLineId !== 'null' &&
					currentLineId !== 'undefined' &&
					linesNorm.some((l) => l.productLineId && String(l.productLineId) === currentLineId);
				setSelectedProductLineId(lineValid ? currentLineId : '');
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
		if (!id || id === 'null' || id === 'undefined') return null;
		return categories.find((c) => c.itemCategoryId && String(c.itemCategoryId) === id) || null;
	}, [categories, selectedCategoryId]);

	const saveDraft = useCallback((targetPath) => {
		const draft = {
			selectedCategoryId,
			selectedBrandId,
			selectedProductLineId,
			sku,
			price,
			showPrice,
			unit,
			origin,
			customOrigin,
			color,
			customColor,
			description,
			warrantyDurationMonths,
			selectedProductTaxRuleId,
			specDrafts,
			compatibleCars,
			createBlogEnabled,
			introText,
			detailHtml,
			itemNameInput,
			itemNameManualEdited,
			itemType,
		};
		// Preserve file states in window object before navigating away
		window._gms_create_product_imageFile = imageFile;
		window._gms_create_product_imagePreviewUrl = imagePreviewUrl;
		window._gms_create_product_blogMediaFiles = blogMediaFiles;
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		if (targetPath) navigate(targetPath);
	}, [
		selectedCategoryId,
		selectedBrandId,
		selectedProductLineId,
		sku,
		price,
		showPrice,
		unit,
		origin,
		customOrigin,
		color,
		customColor,
		description,
		warrantyDurationMonths,
		selectedProductTaxRuleId,
		specDrafts,
		compatibleCars,
		createBlogEnabled,
		introText,
		detailHtml,
		itemNameInput,
		itemNameManualEdited,
		itemType,
		imageFile,
		imagePreviewUrl,
		blogMediaFiles,
		navigate,
	]);

	const handleCategoryInputClick = useCallback(() => {
		saveDraft('/part-management/select-category');
	}, [saveDraft]);

	const selectedProductTaxRule = useMemo(() => {
		const id = String(selectedProductTaxRuleId || '').trim();
		if (!id || id === 'null' || id === 'undefined') return null;
		return taxRules.find((t) => t.taxRuleId && String(t.taxRuleId) === id) || null;
	}, [selectedProductTaxRuleId, taxRules]);

	const selectedBrand = useMemo(() => {
		const id = String(selectedBrandId || '').trim();
		if (!id || id === 'null' || id === 'undefined') return null;
		return brands.find((b) => b.brandId && String(b.brandId) === id) || null;
	}, [brands, selectedBrandId]);

	const filteredProductLines = useMemo(() => {
		const brandIdNum = Number(selectedBrandId) || null;
		const list = Array.isArray(productLines) ? productLines : [];
		if (!brandIdNum) return list;
		return list.filter((l) => Number(l.brandId) === brandIdNum);
	}, [productLines, selectedBrandId]);

	const selectedProductLine = useMemo(() => {
		const id = String(selectedProductLineId || '').trim();
		if (!id || id === 'null' || id === 'undefined') return null;
		return productLines.find((l) => l.productLineId && String(l.productLineId) === id) || null;
	}, [productLines, selectedProductLineId]);

	useEffect(() => {
		// When brand changes, keep current product line only if still valid; otherwise reset to default.
		// Avoid resetting during initial load when productLines are not loaded yet.
		if (isProductLinesLoading || productLines.length === 0) return;
		const brandIdNum = Number(selectedBrandId) || null;
		const list = Array.isArray(filteredProductLines) ? filteredProductLines : [];
		const current = String(selectedProductLineId || '').trim();
		if (!brandIdNum) {
			if (current) setSelectedProductLineId('');
			return;
		}
		if (current && list.some((l) => String(l.productLineId) === current)) return;
		setSelectedProductLineId('');
	}, [filteredProductLines, selectedBrandId, selectedProductLineId, isProductLinesLoading, productLines]);

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



	useEffect(() => {
		if (itemNameManualEdited) return;
		setItemNameInput(computedItemName);
	}, [computedItemName, itemNameManualEdited]);

	const handleItemNameInputChange = useCallback((e) => {
		setItemNameManualEdited(true);
		setItemNameInput(e.target.value);
	}, []);

	const handleUseSuggestedItemName = useCallback(() => {
		setItemNameManualEdited(false);
		setItemNameInput(computedItemName);
	}, [computedItemName]);

	const createdCatalogItemId = useMemo(() => {
		const raw = createdCatalogItem?.itemId ?? createdCatalogItem?.catalogItemId ?? createdCatalogItem?.id;
		const n = typeof raw === 'number' ? raw : Number(raw);
		return Number.isFinite(n) && n > 0 ? n : null;
	}, [createdCatalogItem]);



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


	const handleBrandInputClick = useCallback(() => {
		saveDraft('/part-management/select-brand');
	}, [saveDraft]);

	// ─── Unit dropdown handlers (thay thế navigate sang trang riêng) ──────────
	const filteredUnitsInline = useMemo(() => {
		const q = unitSearchQuery.trim().toLowerCase();
		return units.filter(u => !q || u.unitName.toLowerCase().includes(q));
	}, [units, unitSearchQuery]);

	const isNewUnitDuplicate = useMemo(() => {
		const n = newUnitName.trim().toUpperCase();
		return n ? units.some(u => u.unitName.trim().toUpperCase() === n) : false;
	}, [units, newUnitName]);

	const handleSelectUnitInline = useCallback((unitName) => {
		setUnit(unitName);
		setShowUnitDropdown(false);
		setUnitSearchQuery('');
	}, []);

	const handleCreateUnitInline = useCallback(async () => {
		const name = newUnitName.trim();
		if (!name || isNewUnitDuplicate || isCreatingUnit) return;
		try {
			setIsCreatingUnit(true);
			const token = localStorage.getItem('authToken');
			const res = await createWarehouseProductUnit(name, token);
			const created = extractPayload(res);
			const createdName = created?.unitName ?? created?.name ?? name;
			// Refresh list
			const listRes = await fetchWarehouseProductUnits(token);
			const listRaw = Array.isArray(extractPayload(listRes)) ? extractPayload(listRes) : [];
			setUnits(listRaw.map(u => ({ unitId: u.unitId ?? u.id, unitName: u.unitName ?? u.name ?? '' })).filter(u => u.unitName && (String(u.isActive ?? u.active ?? '1') === '1' || u.isActive === true)));
			setUnit(createdName);
			setNewUnitName('');
			setShowAddUnitInput(false);
			setShowUnitDropdown(false);
			notify('Đã thêm đơn vị mới.');
		} catch (err) {
			notify(err?.message || 'Không thể tạo đơn vị.');
		} finally {
			setIsCreatingUnit(false);
		}
	}, [newUnitName, isNewUnitDuplicate, isCreatingUnit, notify]);

	// Close dropdown khi click ngoài
	useEffect(() => {
		if (!showUnitDropdown) return;
		const handler = (e) => {
			if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target)) {
				setShowUnitDropdown(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [showUnitDropdown]);

	const handleUnitInputClick = useCallback(() => {
		if (!createdCatalogItem) setShowUnitDropdown(v => !v);
	}, [createdCatalogItem]);
	const handleProductTaxInputClick = useCallback(() => {
		saveDraft('/part-management/select-tax');
	}, [saveDraft]);

	const handleProductLineInputClick = useCallback(() => {
		if (!selectedBrandId) {
			notify('Vui lòng chọn hãng sản xuất trước khi chọn dòng sản phẩm.');
			return;
		}
		saveDraft('/part-management/select-product-line');
	}, [saveDraft, selectedBrandId, notify]);

	const handleOriginInputClick = useCallback(() => {
		saveDraft('/part-management/select-origin');
	}, [saveDraft]);

	const handleColorInputClick = useCallback(() => {
		saveDraft('/part-management/select-color');
	}, [saveDraft]);

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

	// (Cleanup on unmount removed to preserve draft image preview)

	const startScanningSku = useCallback(() => {
		setIsScanning(true);
	}, []);

	const stopScanningSku = useCallback(() => {
		if (codeReaderRef.current) {
			try {
				codeReaderRef.current.reset();
			} catch (e) {
				console.error("Failed to stop scanner:", e);
			}
			codeReaderRef.current = null;
		}
		if (videoTrackRef.current) {
			try {
				videoTrackRef.current.stop();
			} catch (e) {
				console.error("Failed to stop track:", e);
			}
			videoTrackRef.current = null;
		}
		setIsScanning(false);
		setHasZoomSupport(false);
	}, []);

	const applyZoomConstraints = useCallback(async (val) => {
		if (!videoTrackRef.current || typeof videoTrackRef.current.applyConstraints !== 'function') return;
		if (isApplyingZoomRef.current) {
			pendingZoomValRef.current = val;
			return;
		}
		isApplyingZoomRef.current = true;
		try {
			await videoTrackRef.current.applyConstraints({
				advanced: [{ zoom: val }]
			});
			const videoElement = document.getElementById("sku-scanner-reader-video");
			if (videoElement && videoElement.paused) {
				await videoElement.play().catch(() => { });
			}
		} catch (err) {
			console.error("Failed to apply zoom:", err);
		} finally {
			isApplyingZoomRef.current = false;
			if (pendingZoomValRef.current !== null) {
				const nextVal = pendingZoomValRef.current;
				pendingZoomValRef.current = null;
				applyZoomConstraints(nextVal);
			}
		}
	}, []);

	const handleZoomChange = useCallback((e) => {
		const val = parseFloat(e.target.value);
		setZoomValue(val);

		if (zoomTimeoutRef.current) {
			clearTimeout(zoomTimeoutRef.current);
		}

		zoomTimeoutRef.current = setTimeout(() => {
			applyZoomConstraints(val);
		}, 80); // 80ms debounce with concurrency lock
	}, [applyZoomConstraints]);

	useEffect(() => {
		if (!isScanning) return;

		let localStream = null;
		const timer = setTimeout(async () => {
			try {
				const hints = new Map();
				const formats = [
					BarcodeFormat.EAN_13,
					BarcodeFormat.EAN_8,
					BarcodeFormat.CODE_128,
					BarcodeFormat.CODE_39,
					BarcodeFormat.CODE_93,
					BarcodeFormat.UPC_A,
					BarcodeFormat.UPC_E,
					BarcodeFormat.QR_CODE,
					BarcodeFormat.ITF,
				];
				hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
				hints.set(DecodeHintType.TRY_HARDER, true);

				const codeReader = new BrowserMultiFormatReader(hints);
				codeReaderRef.current = codeReader;

				const constraints = {
					video: {
						facingMode: "environment",
						width: { ideal: 1280 },
						height: { ideal: 720 },
					}
				};

				const stream = await navigator.mediaDevices.getUserMedia(constraints);
				localStream = stream;

				const videoElement = document.getElementById("sku-scanner-reader-video");
				if (!videoElement) {
					stream.getTracks().forEach(track => track.stop());
					setIsScanning(false);
					return;
				}

				const track = stream.getVideoTracks()[0];
				videoTrackRef.current = track;

				if (track && typeof track.getCapabilities === 'function') {
					const capabilities = track.getCapabilities();
					if (capabilities.zoom) {
						setHasZoomSupport(true);
						setZoomMin(capabilities.zoom.min || 1);
						setZoomMax(capabilities.zoom.max || 10);
						setZoomStep(capabilities.zoom.step || 0.1);
						setZoomValue(track.getSettings().zoom || capabilities.zoom.min || 1);
					} else {
						setHasZoomSupport(false);
					}
				} else {
					setHasZoomSupport(false);
				}

				// The decodeFromStream method handles binding the media stream to the video element,
				// auto-playing it, and running the continuous frame decoding loop.
				codeReader.decodeFromStream(stream, videoElement, (result, err) => {
					if (result) {
						const decodedText = result.getText();
						setSku(decodedText);
						toast.success(`Đã quét được SKU: ${decodedText}`, { containerId: 'app-toast' });
						stopScanningSku();
					}
				}).catch(err => {
					console.error("Failed to decode from stream:", err);
				});

			} catch (err) {
				console.error("Camera start failed:", err);
				toast.error("Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.", { containerId: 'app-toast' });
				setIsScanning(false);
			}
		}, 300);

		return () => {
			clearTimeout(timer);
			if (zoomTimeoutRef.current) {
				clearTimeout(zoomTimeoutRef.current);
			}
			if (codeReaderRef.current) {
				codeReaderRef.current.reset();
				codeReaderRef.current = null;
			}
			if (videoTrackRef.current) {
				videoTrackRef.current.stop();
				videoTrackRef.current = null;
			}
			if (localStream) {
				localStream.getTracks().forEach(track => track.stop());
			}
		};
	}, [isScanning, stopScanningSku]);

	// ── AI Article Auto-Generator & Token Calculator for Product ──
	const calculateTokenUsage = useCallback((promptStr, introStr, detailStr, resUsage) => {
		if (resUsage?.totalTokens && resUsage?.promptTokens) {
			return {
				promptTokens: Number(resUsage.promptTokens) || 0,
				responseTokens: Number(resUsage.responseTokens) || ((Number(resUsage.totalTokens) || 0) - (Number(resUsage.promptTokens) || 0)),
				totalTokens: Number(resUsage.totalTokens) || 0,
			};
		}
		const promptTokens = Math.ceil((promptStr || '').length / 3.5);
		const responseTokens = Math.ceil(((introStr || '').length + (detailStr || '').length) / 3.5);
		const totalTokens = promptTokens + responseTokens;
		return { promptTokens, responseTokens, totalTokens };
	}, []);

	const generateFallbackProductArticle = useCallback((promptText = '') => {
		const title = String(itemNameInput || selectedCategory?.categoryName || 'Phụ tùng ô tô chính hãng').trim();
		const brandName = selectedBrand?.brandName || 'Michelin Sơn Tây';
		const formattedPrice = price ? `${Number(price).toLocaleString('vi-VN')} VNĐ` : 'Ưu đãi liên hệ';
		const originText = origin || 'Chính hãng';

		const intro = `${title} thương hiệu ${brandName} được phân phối chính hãng tại Michelin Sơn Tây với mức giá ưu đãi ${formattedPrice}. Sản phẩm đáp ứng tiêu chuẩn kỹ thuật nghiêm ngặt, đảm bảo độ bền và an toàn tối đa cho xế yêu.`;

		const detailHtmlContent = `
<h3>Tổng quan sản phẩm ${title}</h3>
<p>Sản phẩm <strong>${title}</strong> từ thương hiệu <strong>${brandName}</strong> được thiết kế tối ưu cho khả năng vận hành bền bỉ và ổn định. Sản phẩm đạt đầy đủ các chứng nhận chất lượng quốc tế, phù hợp hoàn hảo cho hệ thống xe ô tô tại Việt Nam.</p>

<h3>Đặc điểm nổi bật & Thông số kỹ thuật</h3>
<ul>
  <li><strong>Thương hiệu uy tín:</strong> Sản xuất bởi ${brandName} với công nghệ vật liệu chịu lực, chống mài mòn cao.</li>
  <li><strong>Khả năng tương thích:</strong> Phù hợp cho ${compatibleCars || 'nhiều dòng xe ô tô phổ biến tại Việt Nam'}.</li>
  <li><strong>Xuất xứ & Bảo hành:</strong> Xuất xứ ${originText}, bảo hành chính hãng theo tiêu chuẩn nhà sản xuất.</li>
</ul>

<h3>Cam kết từ Michelin Sơn Tây</h3>
<p>Chúng tôi cam kết cung cấp phụ tùng <strong>chính hãng 100%</strong>, hỗ trợ kiểm tra quy chuẩn và tư vấn lắp đặt chuyên nghiệp bởi đội ngũ kỹ thuật viên giàu kinh nghiệm.</p>
		`.trim();

		setIntroText(intro);
		setDetailHtml(detailHtmlContent);
		if (editorRef.current) {
			editorRef.current.innerHTML = detailHtmlContent;
		}
		const usage = calculateTokenUsage(promptText, intro, detailHtmlContent, null);
		setAiTokenUsage(usage);
	}, [itemNameInput, selectedBrand, selectedCategory, price, origin, compatibleCars, calculateTokenUsage]);

	const handleAiGenerateProductArticle = useCallback(async () => {
		if (isAiGenerating) return;

		const title = String(itemNameInput || '').trim();
		const brandName = selectedBrand?.brandName || '';
		const categoryName = selectedCategory?.categoryName || '';
		const productLineName = selectedProductLine?.productLineName || '';

		const prompt = `Bạn là chuyên gia truyền thông ô tô của Garage Michelin Sơn Tây. Hãy viết một bài viết giới thiệu thật hấp dẫn, chuyên nghiệp và đầy đủ thông tin cho Phụ tùng sản phẩm ô tô sau:
- Tên phụ tùng: ${title || 'Phụ tùng ô tô chính hãng'}
- Thương hiệu: ${brandName || 'Chính hãng'}
- Danh mục: ${categoryName || 'Phụ tùng ô tô'}
- Dòng sản phẩm: ${productLineName || 'Tiêu chuẩn'}
- Giá sản phẩm: ${price ? Number(price).toLocaleString('vi-VN') + ' VNĐ' : 'Ưu đãi liên hệ'}
- Xuất xứ: ${origin || 'Chính hãng'}
- Dòng xe tương thích: ${compatibleCars || 'Nhiều dòng xe phổ biến'}
- Mô tả sản phẩm: ${description || 'Sản phẩm đạt chuẩn chất lượng quốc tế'}

YÊU CẦU ĐỊNH DẠNG:
Hãy trả về duy nhất 1 đoạn JSON chuẩn không chứa mã markdown backtick với cấu trúc:
{
  "intro": "Phần tóm tắt ngắn 2-3 câu làm nổi bật điểm sáng của phụ tùng...",
  "detailHtml": "<h3>Tổng quan sản phẩm</h3><p>...</p><h3>Thông số & Đặc điểm nổi bật</h3><ul><li>...</li></ul><h3>Chính sách bảo hành & Cam kết</h3><p>...</p>"
}`;

		try {
			setIsAiGenerating(true);

			const res = await sendAiMessage({ message: prompt }).catch((err) => {
				console.warn('[AI Product Generator] Backend Gemini API returned error, falling back:', err?.message);
				return null;
			});

			const replyText = res?.reply ?? res?.data?.reply ?? (typeof res === 'string' ? res : '');
			const usageData = res?.usage ?? res?.data?.usage;

			const isErrorReply = !replyText ||
				replyText.includes('AI_UPSTREAM_ERROR') ||
				replyText.includes('503') ||
				replyText.includes('UNAVAILABLE') ||
				replyText.includes('high demand') ||
				replyText.includes('sự cố');

			if (!isErrorReply) {
				let parsed = null;
				try {
					const cleanJson = replyText.replace(/```json/gi, '').replace(/```/g, '').trim();
					parsed = JSON.parse(cleanJson);
				} catch {
					// JSON parse failure
				}

				if (parsed?.intro && parsed?.detailHtml) {
					setIntroText(parsed.intro);
					setDetailHtml(parsed.detailHtml);
					if (editorRef.current) {
						editorRef.current.innerHTML = parsed.detailHtml;
					}
					const usage = calculateTokenUsage(prompt, parsed.intro, parsed.detailHtml, usageData);
					setAiTokenUsage(usage);
					return;
				}
			}

			generateFallbackProductArticle(prompt);
		} catch (err) {
			console.warn('[AI Product Generator] Exception, using fallback:', err);
			generateFallbackProductArticle(prompt);
		} finally {
			setIsAiGenerating(false);
		}
	}, [itemNameInput, selectedBrand, selectedCategory, selectedProductLine, price, origin, compatibleCars, description, isAiGenerating, calculateTokenUsage, generateFallbackProductArticle]);

	const handleSubmitProduct = useCallback(async () => {
		if (isCreatingCatalogItem) return;
		const token = localStorage.getItem('authToken');
		if (!token) {
			notify('Vui lòng đăng nhập để tạo sản phẩm.');
			return;
		}
		const categoryId = Number(selectedCategoryId) || null;
		const brandId = Number(selectedBrandId) || null;
		const productLineId = selectedProductLineId ? Number(selectedProductLineId) : null;
		if (!categoryId) {
			notify('Vui lòng chọn hạng mục sản phẩm (Item Category).');
			return;
		}
		if (!brandId) {
			notify('Vui lòng chọn hãng.');
			return;
		}
		let finalIntroText = String(introText || '').trim();
		let finalDetailHtml = detailHtml;
		if (!finalIntroText && !stripHtml(finalDetailHtml)) {
			const descTrim = String(description || '').trim();
			if (descTrim) {
				finalIntroText = descTrim;
				finalDetailHtml = `<p>${escapeHtml(descTrim)}</p>`;
			} else {
				notify('Vui lòng nhập mô tả sản phẩm hoặc tóm tắt/nội dung bài viết.');
				return;
			}
		}
		const skuTrim = String(sku || '').trim();
		if (!skuTrim) {
			notify('Vui lòng nhập SKU.');
			return;
		}
		const itemName = String(itemNameInput || '').trim();
		if (!itemName) {
			notify('Vui lòng nhập tên sản phẩm (hoặc chọn đủ nhóm/hãng/dòng để tạo tên gợi ý).');
			return;
		}
		const priceNum = showPrice ? Number(String(price || '').trim()) : 0;
		if (showPrice && (!Number.isFinite(priceNum) || priceNum <= 0)) {
			notify('Giá phụ tùng phải lớn hơn 0.');
			return;
		}
		const warrantyNum = String(warrantyDurationMonths || '').trim() === '' ? 0 : Number(warrantyDurationMonths);
		if (!Number.isFinite(warrantyNum) || warrantyNum < 0) {
			notify('Bảo hành (tháng) không hợp lệ.');
			return;
		}
		const resolvedOrigin = origin === OTHER_OPTION_VALUE ? String(customOrigin || '').trim() : String(origin || '').trim();
		const resolvedColor = color === OTHER_OPTION_VALUE ? String(customColor || '').trim() : String(color || '').trim();

		try {
			setIsCreatingCatalogItem(true);
			const taxRuleIdNumRaw = selectedProductTaxRuleId ? Number(selectedProductTaxRuleId) : null;
			const taxRuleIdNum = Number.isFinite(taxRuleIdNumRaw) && taxRuleIdNumRaw > 0 ? taxRuleIdNumRaw : null;
			const res = await createWarehouseCatalogItem(
				{
					itemName,
					itemType,
					warrantyDurationMonths: Math.trunc(warrantyNum),
					serviceServiceId: null,
					sku: skuTrim,
					price: showPrice ? priceNum : 0,
					showPrice,
					description: String(description || '').trim(),
					madeIn: resolvedOrigin,
					origin: resolvedOrigin,
					color: resolvedColor,
					// imageUrl: String(imageUrl || '').trim(),
					unit: String(unit || '').trim(),
					comboDurationMonths: 0,
					comboDescription: '',
					isRecurring: false,
					brandId,
					productLineId,
					product_line_id: productLineId,
					// Backward compatible (older warehouse API)
					itemCategoryId: categoryId,
					// Newer API shape (work category)
					workCategoryId: categoryId,
					taxRuleId: taxRuleIdNum,
					tax_rule_id: taxRuleIdNum,
					compatibleCars: String(compatibleCars || '').trim(),
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
			sessionStorage.removeItem('gms_create_product_draft');
			delete window._gms_create_product_imageFile;
			delete window._gms_create_product_imagePreviewUrl;
			delete window._gms_create_product_blogMediaFiles;
			notify(`Đã tạo sản phẩm (#${createdId}).`);

			// Automatically save all filled specs in drafts
			const draftsToSave = Array.isArray(specDrafts) ? specDrafts.filter(d => String(d.specValue || '').trim() && d.attributeId) : [];
			if (draftsToSave.length > 0) {
				notify('Đang lưu các thông số...');
				for (let i = 0; i < draftsToSave.length; i++) {
					const d = draftsToSave[i];
					try {
						await createWarehouseSpecificationValue(
							{ specId: null, itemId: createdId, attributeId: Number(d.attributeId), specValue: String(d.specValue).trim() },
							token
						);
					} catch (err) {
						notify(`Không thể lưu thông số "${d.displayName}": ${err.message}`);
					}
				}
				// Refresh saved specs list
				try {
					const specRes = await fetchWarehouseSpecificationsByCatalogItemId(createdId, token);
					const specList = Array.isArray(extractPayload(specRes)) ? extractPayload(specRes) : [];
					setSavedSpecs(specList);
				} catch {
					// ignore spec fetch error
				}
				notify('Đã lưu các thông số.');
			}

			// If createBlogEnabled, create the blog post associated with this catalogItemId
			if (createBlogEnabled) {
				notify('Đang tạo bài viết chi tiết...');
				setIsBlogSubmitting(true);
				try {
					const formData = new FormData();
					const title = String(itemName || '').trim();
					const skuText = String(skuTrim || '').trim();
					const resolvedPrice = showPrice ? priceNum : 0;
					const warrantyNumInt = Math.trunc(warrantyNum);
					const serviceStatus = 'ACTIVE';
					const fullDescription = composeDescriptionHtml(finalIntroText, finalDetailHtml);
					const shortDescription = finalIntroText;

					formData.append('title', title);
					formData.append('itemName', title);
					formData.append('sku', skuText);
					formData.append('itemCode', skuText);
					formData.append('partCode', skuText);
					formData.append('unit', String(unit || '').trim());
					formData.append('price', String(resolvedPrice));
					formData.append('shortDescription', shortDescription);
					formData.append('fullDescription', fullDescription);
					formData.append('showPrice', showPrice ? 'true' : 'false');
					formData.append('displayPrice', String(resolvedPrice));
					formData.append('status', serviceStatus);
					formData.append('catalogItemId', String(createdId));
					if (Number.isFinite(warrantyNumInt) && warrantyNumInt >= 0) {
						formData.append('estimateTime', String(warrantyNumInt));
					}
					// If product has a primary image, we append it as thumbnailFile
					if (imageFile) {
						formData.append('thumbnailFile', imageFile);
					}
					// Append any additional blog media files
					blogMediaFiles.forEach((m) => {
						if (m.file) {
							formData.append('mediaFiles', m.file);
						}
					});

					await createServiceForCatalog(createdId, formData, token);
					notify('Đã tạo bài viết chi tiết cho phụ tùng thành công!', 'success');
				} catch (blogErr) {
					notify(`Tạo bài viết chi tiết thất bại: ${blogErr.message}`);
				} finally {
					setIsBlogSubmitting(false);
				}
			}

			navigate('/part-management');
		} catch (err) {
			notify(err?.message || 'Không thể tạo sản phẩm.');
		} finally {
			setIsCreatingCatalogItem(false);
		}
	}, [
		description,
		color,
		itemNameInput,
		customColor,
		customOrigin,
		isCreatingCatalogItem,
		itemType,
		notify,
		origin,
		price,
		selectedBrandId,
		selectedCategoryId,
		selectedProductLineId,
		selectedProductTaxRuleId,
		showPrice,
		sku,
		unit,
		warrantyDurationMonths,
		specDrafts,
		createBlogEnabled,
		introText,
		detailHtml,
		blogMediaFiles,
		imageFile,
		navigate,
	]);

	const handleAttributeInputClick = useCallback(() => {
		saveDraft('/part-management/select-attribute');
	}, [saveDraft]);

	const handleKeyDown = useCallback((e) => {
		if (e.key === 'Enter') {
			const target = e.target;
			const isTextArea = target.tagName === 'TEXTAREA';
			const isContentEditable = target.contentEditable === 'true' || target.getAttribute('contenteditable') === 'true';
			if (!isTextArea && !isContentEditable) {
				e.preventDefault();
			}
		}
	}, []);

	// Editor and media helper functions for blog creation
	const syncDetailFromEditor = useCallback(() => {
		setDetailHtml(normalizeEditorHtml(editorRef.current?.innerHTML || ''));
	}, []);

	const applyInlineTag = useCallback((tagName, attrs = null) => {
		const editor = editorRef.current;
		if (!editor) return;
		editor.focus();
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);
		if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return;
		const node = document.createElement(tagName);
		if (attrs && typeof attrs === 'object') Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
		node.appendChild(range.extractContents());
		range.insertNode(node);
		selection.removeAllRanges();
		const nextRange = document.createRange();
		nextRange.selectNodeContents(node);
		selection.addRange(nextRange);
		syncDetailFromEditor();
	}, [syncDetailFromEditor]);

	const applyExecCommand = useCallback((command) => {
		const editor = editorRef.current;
		if (!editor) return;
		editor.focus();
		document.execCommand(command, false, null);
		syncDetailFromEditor();
	}, [syncDetailFromEditor]);

	const handleToolbarClick = useCallback((action) => {
		if (action === 'bold') return applyExecCommand('bold');
		if (action === 'italic') return applyExecCommand('italic');
		if (action === 'uppercase') return applyInlineTag('span', { style: 'text-transform: uppercase;' });
		if (action === 'ol') return applyExecCommand('insertOrderedList');
		if (action === 'ul') return applyExecCommand('insertUnorderedList');
		return undefined;
	}, [applyExecCommand, applyInlineTag]);

	// Keep editor in sync when detailHtml updates (e.g. from drafts)
	useEffect(() => {
		if (!editorRef.current) return;
		const normalized = normalizeEditorHtml(detailHtml);
		if (editorRef.current.innerHTML !== normalized) {
			editorRef.current.innerHTML = normalized;
		}
	}, [detailHtml]);

	const handleBlogMediaChange = useCallback((e) => {
		const files = Array.from(e.target.files || []);
		const next = files.map((file) => ({
			id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			file,
			previewUrl: URL.createObjectURL(file),
		}));
		setBlogMediaFiles((prev) => [...prev, ...next]);
	}, []);

	const removeBlogMedia = useCallback((index) => {
		setBlogMediaFiles((prev) => {
			const item = prev[index];
			if (item?.previewUrl) {
				URL.revokeObjectURL(item.previewUrl);
			}
			return prev.filter((_, i) => i !== index);
		});
	}, []);

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
		<div className={styles['service-page']} onKeyDown={handleKeyDown}>
			<section className={styles['service-card']}>
				<div className={styles['service-card__header']}>
					<div className={styles['service-card__title']}>
						<strong>Tạo sản phẩm</strong>
					</div>
				</div>

				{/* Avatar Image Upload Section */}
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
					<div
						onClick={() => {
							if (!createdCatalogItemId && fileInputRef.current) {
								fileInputRef.current.click();
							}
						}}
						style={{
							width: '120px',
							height: '120px',
							borderRadius: '16px',
							border: imagePreviewUrl ? '2px solid #e2e8f0' : '2px dashed #cbd5e1',
							backgroundColor: '#f8fafc',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: createdCatalogItemId ? 'default' : 'pointer',
							overflow: 'hidden',
							position: 'relative',
							transition: 'all 0.2s ease-in-out',
							boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
						}}
						onMouseEnter={(e) => {
							if (!createdCatalogItemId) {
								e.currentTarget.style.borderColor = '#1E90FF';
								e.currentTarget.style.backgroundColor = '#eff6ff';
							}
						}}
						onMouseLeave={(e) => {
							if (!createdCatalogItemId) {
								e.currentTarget.style.borderColor = imagePreviewUrl ? '#e2e8f0' : '#cbd5e1';
								e.currentTarget.style.backgroundColor = '#f8fafc';
							}
						}}
					>
						{imagePreviewUrl ? (
							<>
								<img
									src={imagePreviewUrl}
									alt="Avatar Preview"
									style={{
										width: '100%',
										height: '100%',
										objectFit: 'cover',
									}}
								/>
								{!createdCatalogItemId && (
									<div
										style={{
											position: 'absolute',
											bottom: 0,
											left: 0,
											right: 0,
											backgroundColor: 'rgba(0, 0, 0, 0.6)',
											color: '#fff',
											fontSize: '11px',
											textAlign: 'center',
											padding: '4px 0',
											fontWeight: '500',
										}}
									>
										Thay đổi
									</div>
								)}
							</>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 4 }}>
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<polyline points="21 15 16 10 5 21" />
								</svg>
								<span style={{ fontSize: '12px', fontWeight: '500' }}>Thêm ảnh</span>
							</div>
						)}
					</div>

					<input
						type="file"
						ref={fileInputRef}
						accept="image/*"
						onChange={handleImageFileChange}
						style={{ display: 'none' }}
						disabled={Boolean(createdCatalogItemId)}
					/>

					{imagePreviewUrl && !createdCatalogItemId && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (imagePreviewUrl) {
									URL.revokeObjectURL(imagePreviewUrl);
								}
								setImageFile(null);
								setImagePreviewUrl('');
								if (fileInputRef.current) {
									fileInputRef.current.value = '';
								}
							}}
							style={{
								background: 'none',
								border: 'none',
								color: '#ef4444',
								fontSize: '12px',
								fontWeight: '600',
								marginTop: '8px',
								cursor: 'pointer',
								textDecoration: 'underline',
								padding: '2px 8px',
							}}
						>
							Xoá ảnh
						</button>
					)}
				</div>

				<div className={styles['pending-filters']}>
					<div style={{ fontWeight: 600, marginBottom: 8 }}>Tên sản phẩm</div>
					<div className="ui-field" style={{ marginBottom: 0 }}>
						<input
							id="itemNameInput"
							type="text"
							value={itemNameInput}
							onChange={handleItemNameInputChange}
							placeholder="Nhập tên sản phẩm, hoặc chọn nhóm/hãng/dòng + thông số để tạo tên gợi ý"
							disabled={Boolean(createdCatalogItemId)}
						/>
					</div>
					{!createdCatalogItemId && computedItemName && computedItemName !== itemNameInput.trim() && (
						<button
							type="button"
							className={styles['ghost-button']}
							style={{ marginTop: 8, fontSize: 12.5, padding: '6px 12px' }}
							onClick={handleUseSuggestedItemName}
						>
							Dùng tên gợi ý: "{computedItemName}"
						</button>
					)}
				</div>

				{/* Steps Grid */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 12 }}>
					{/* Step 0: Product Type */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>Loại hàng hóa</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<select
								value={itemType}
								onChange={(e) => setItemType(e.target.value)}
								className={styles['dropdown-select']}
								disabled={isCreatingCatalogItem || createdCatalogItemId}
								style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
							>
								<option value="PART">Phụ tùng</option>
								<option value="MACHINERY">Máy móc</option>
								<option value="EQUIPMENT">Thiết bị</option>
							</select>
						</div>
					</div>

					{/* Step 1: Category */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>1) Hạng mục sản phẩm</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<input
								id="categorySelect"
								readOnly
								placeholder="Nhấn vào đây để chọn nhóm hàng..."
								value={selectedCategory ? (selectedCategory.categoryName || selectedCategory.categoryCode) : ''}
								onClick={handleCategoryInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>

					{/* Step 2: Brand */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>2) Hãng</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<input
								id="brandSelect"
								readOnly
								placeholder="Nhấn vào đây để chọn hãng sản xuất..."
								value={selectedBrand ? selectedBrand.brandName : ''}
								onClick={handleBrandInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>

					{/* Step 3: Product line */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>3) Dòng sản phẩm</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<input
								id="productLineSelect"
								readOnly
								placeholder="Nhấn vào đây để chọn dòng sản phẩm..."
								value={selectedProductLine ? selectedProductLine.lineName : ''}
								onClick={handleProductLineInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>
				</div>

				{/* Step 4: Catalog item fields */}
				<div className={styles['pending-filters']} style={{ marginTop: 12 }}>
					<div style={{ fontWeight: 600, marginBottom: 8 }}>4) Thông tin sản phẩm</div>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="sku" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span>SKU</span>
								{!createdCatalogItemId && (
									<button
										type="button"
										className={styles['ghost-button']}
										style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #d1d5db' }}
										onClick={startScanningSku}
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
											<circle cx="12" cy="13" r="4" />
										</svg>
										<span>Quét mã</span>
									</button>
								)}
							</label>
							<input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
						</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
								<label htmlFor="price" style={{ marginBottom: 0 }}>Giá bán</label>
								<label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#6b7280', userSelect: 'none' }}>
									<input
										type="checkbox"
										checked={showPrice}
										onChange={(e) => setShowPrice(e.target.checked)}
										disabled={Boolean(createdCatalogItemId)}
										style={{ display: 'none' }}
									/>
									<span style={{
										width: '32px',
										height: '18px',
										backgroundColor: showPrice ? '#3b82f6' : '#d1d5db',
										borderRadius: '999px',
										display: 'inline-block',
										position: 'relative',
										transition: 'background-color 0.2s',
									}}>
										<span style={{
											width: '14px',
											height: '14px',
											backgroundColor: '#ffffff',
											borderRadius: '50%',
											display: 'inline-block',
											position: 'absolute',
											top: '2px',
											left: showPrice ? '16px' : '2px',
											transition: 'left 0.2s',
											boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
										}} />
									</span>
									<span style={{ fontWeight: 500 }}>Hiển thị giá</span>
								</label>
							</div>
							<input
								id="price"
								type="number"
								min="1"
								inputMode="numeric"
								pattern="[0-9]*"
								value={price}
								onChange={(e) => setPrice(e.target.value)}
								disabled={Boolean(createdCatalogItemId) || !showPrice}
								placeholder={showPrice ? "Nhập giá bán..." : "Liên hệ"}
							/>
						</div>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 12 }}>
						<div className="ui-field" style={{ marginBottom: 0, position: 'relative' }} ref={unitDropdownRef}>
							<label htmlFor="unit">Đơn vị</label>
							<div style={{ display: 'flex', gap: 6 }}>
								<input
									id="unit"
									readOnly
									placeholder={isUnitsLoading ? 'Đang tải...' : 'Chọn đơn vị...'}
									value={unit}
									onClick={handleUnitInputClick}
									style={{ cursor: createdCatalogItem ? 'not-allowed' : 'pointer', flex: 1 }}
									disabled={Boolean(createdCatalogItem)}
								/>
								{!createdCatalogItem && (
									<button
										type="button"
										title="Thêm đơn vị mới"
										onClick={() => { setShowUnitDropdown(true); setShowAddUnitInput(true); setUnitSearchQuery(''); }}
										style={{
											width: 34, height: 34, border: '1px solid #d1d5db', borderRadius: 8,
											background: '#f9fafb', cursor: 'pointer', display: 'flex',
											alignItems: 'center', justifyContent: 'center', flexShrink: 0,
											fontSize: 18, color: '#374151', lineHeight: 1,
										}}
									>
										+
									</button>
								)}
							</div>

							{/* Dropdown panel */}
							{showUnitDropdown && (
								<div style={{
									position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
									background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
									boxShadow: '0 8px 24px rgba(0,0,0,.12)', marginTop: 4, overflow: 'hidden',
								}}>
									{/* Search */}
									<div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
										<input
											autoFocus
											placeholder="Tìm đơn vị..."
											value={unitSearchQuery}
											onChange={e => { setUnitSearchQuery(e.target.value); setShowAddUnitInput(false); }}
											style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
										/>
									</div>

									{/* List */}
									<div style={{ maxHeight: 180, overflowY: 'auto' }}>
										{filteredUnitsInline.length === 0 ? (
											<div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>Không tìm thấy đơn vị</div>
										) : filteredUnitsInline.map(u => (
											<div
												key={u.unitId}
												onClick={() => handleSelectUnitInline(u.unitName)}
												style={{
													padding: '9px 14px', cursor: 'pointer', fontSize: 13,
													background: unit === u.unitName ? '#eff6ff' : 'white',
													color: unit === u.unitName ? '#2563eb' : '#111827',
													fontWeight: unit === u.unitName ? 600 : 400,
												}}
												onMouseEnter={e => { if (unit !== u.unitName) e.currentTarget.style.background = '#f9fafb'; }}
												onMouseLeave={e => { if (unit !== u.unitName) e.currentTarget.style.background = 'white'; }}
											>
												{u.unitName}
											</div>
										))}
									</div>

									{/* Add new unit inline */}
									<div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 10px' }}>
										{!showAddUnitInput ? (
											<button
												type="button"
												onClick={() => setShowAddUnitInput(true)}
												style={{ width: '100%', padding: '7px', border: '1px dashed #d1d5db', borderRadius: 6, background: 'none', cursor: 'pointer', color: '#2563eb', fontSize: 13, fontWeight: 600 }}
											>
												+ Thêm đơn vị mới
											</button>
										) : (
											<div style={{ display: 'flex', gap: 6 }}>
												<div style={{ flex: 1 }}>
													<input
														autoFocus
														placeholder="Tên đơn vị mới..."
														value={newUnitName}
														onChange={e => setNewUnitName(e.target.value)}
														onKeyDown={e => e.key === 'Enter' && handleCreateUnitInline()}
														style={{
															width: '100%', padding: '6px 10px', fontSize: 13, boxSizing: 'border-box',
															border: `1px solid ${isNewUnitDuplicate ? '#ef4444' : '#d1d5db'}`, borderRadius: 6,
															background: isNewUnitDuplicate ? '#fef2f2' : 'white',
														}}
													/>
													{isNewUnitDuplicate && <span style={{ color: '#ef4444', fontSize: 11 }}>Đơn vị đã tồn tại!</span>}
												</div>
												<button
													type="button"
													onClick={handleCreateUnitInline}
													disabled={isCreatingUnit || !newUnitName.trim() || isNewUnitDuplicate}
													style={{
														padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none',
														borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
														opacity: (isCreatingUnit || !newUnitName.trim() || isNewUnitDuplicate) ? 0.5 : 1,
													}}
												>
													{isCreatingUnit ? '...' : 'Tạo'}
												</button>
												<button
													type="button"
													onClick={() => { setShowAddUnitInput(false); setNewUnitName(''); }}
													style={{ padding: '6px 10px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
												>
													Hủy
												</button>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="warranty">Bảo hành (tháng)</label>
							<input id="warranty" type="number" value={warrantyDurationMonths} onChange={(e) => setWarrantyDurationMonths(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
						</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="origin">Xuất xứ</label>
							<input
								id="origin"
								readOnly
								placeholder="Nhấn vào đây để chọn xuất xứ..."
								value={origin === OTHER_OPTION_VALUE ? customOrigin : origin}
								onClick={handleOriginInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="color">Màu</label>
							<input
								id="color"
								readOnly
								placeholder="Nhấn vào đây để chọn màu..."
								value={color === OTHER_OPTION_VALUE ? customColor : color}
								onClick={handleColorInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>

					<div style={{ marginTop: 12 }}>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label>Xe tương thích</label>
							<CompatibleCarsSelector
								value={compatibleCars}
								onChange={setCompatibleCars}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>

					<div style={{ marginTop: 12 }}>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="productTaxRuleSelect">Chọn thuế</label>
							<input
								id="productTaxRuleSelect"
								readOnly
								placeholder="Nhấn vào đây để chọn thuế..."
								value={selectedProductTaxRule ? `${getTaxRuleSelectLabel(selectedProductTaxRule)} (${formatTaxRatePercent(selectedProductTaxRule)})` : 'Không áp dụng'}
								onClick={handleProductTaxInputClick}
								style={{ cursor: 'pointer' }}
								disabled={isTaxRulesLoading || isCreatingCatalogItem || Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>
					<div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
						<label htmlFor="description">Mô tả</label>
						<textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
					</div>

					{!createdCatalogItemId && (
						<div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', flexWrap: 'wrap', gap: 8 }}>
									<div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
										Bài viết giới thiệu chi tiết sản phẩm
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
										{aiTokenUsage && (
											<div style={{
												display: 'inline-flex',
												alignItems: 'center',
												gap: '6px',
												fontSize: '12px',
												color: '#334155',
												backgroundColor: '#f1f5f9',
												padding: '4px 8px',
												borderRadius: '6px',
												border: '1px solid #cbd5e1',
											}}>
												<Sparkles size={13} style={{ color: '#6366f1' }} />
												<span>Token sử dụng: <strong>{aiTokenUsage.totalTokens.toLocaleString('vi-VN')}</strong> (Input: {aiTokenUsage.promptTokens} | Output: {aiTokenUsage.responseTokens})</span>
											</div>
										)}
										<button
											type="button"
											data-gms-no-global-loading="true"
											className={styles['primary-button']}
											style={{
												background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
												borderColor: '#4f46e5',
												display: 'inline-flex',
												alignItems: 'center',
												gap: '6px',
												fontSize: '13px',
												padding: '6px 14px',
												boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
												cursor: isAiGenerating || isCreatingCatalogItem ? 'not-allowed' : 'pointer',
												opacity: isAiGenerating || isCreatingCatalogItem ? 0.7 : 1,
											}}
											onClick={handleAiGenerateProductArticle}
											disabled={isAiGenerating || isCreatingCatalogItem}
											title="Tự động đọc thông tin form và sử dụng AI để tạo bài viết sản phẩm"
										>
											<Sparkles size={16} />
											<span>{isAiGenerating ? 'AI đang viết bài...' : '✨ AI tự động viết bài'}</span>
										</button>
									</div>
								</div>
								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label htmlFor="introText" style={{ fontWeight: 500 }}>Tóm tắt ngắn (Intro)</label>
									<textarea
										id="introText"
										value={introText}
										onChange={(e) => setIntroText(e.target.value)}
										placeholder="Nhập phần giới thiệu ngắn hoặc tóm tắt của bài viết..."
										style={{ minHeight: '80px' }}
									/>
								</div>

								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label style={{ fontWeight: 500 }}>Chi tiết sản phẩm</label>
									<div className={styles['editor-toolbar']}>
										<button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('bold')}><strong>B</strong></button>
										<button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('italic')}><em>I</em></button>
										<button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('uppercase')}>UPPER</button>
										<button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ol')}>OL</button>
										<button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ul')}>UL</button>
									</div>
									<div
										ref={editorRef}
										className={styles['rich-editor']}
										contentEditable
										suppressContentEditableWarning
										onInput={syncDetailFromEditor}
										onBlur={syncDetailFromEditor}
										style={{
											minHeight: '200px',
											border: '1px solid #cbd5e1',
											borderRadius: '6px',
											padding: '12px',
											backgroundColor: '#fff',
											overflowY: 'auto'
										}}
									/>
									<div className={styles['editor-hint']}>Output HTML dùng các thẻ {'<strong>'}, {'<em>'}, span uppercase, {'<ol>'}, {'<ul>'}.</div>
								</div>

								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label style={{ fontWeight: 500 }}>Tải lên ảnh bổ sung cho bài viết (Media)</label>
									<input
										type="file"
										accept="image/*,video/*"
										multiple
										onChange={handleBlogMediaChange}
										style={{ padding: '6px', fontSize: '13px' }}
									/>
									{blogMediaFiles.length > 0 && (
										<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
											{blogMediaFiles.map((m, idx) => (
												<div key={m.id || idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
													<img src={m.previewUrl} alt="media preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
													<button
														type="button"
														onClick={() => removeBlogMedia(idx)}
														style={{
															position: 'absolute',
															top: '2px',
															right: '2px',
															backgroundColor: 'rgba(239, 68, 68, 0.9)',
															color: 'white',
															border: 'none',
															borderRadius: '50%',
															width: '18px',
															height: '18px',
															fontSize: '11px',
															cursor: 'pointer',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															padding: 0
														}}
													>
														×
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 12 }}>
						<button type="button" className={styles['primary-button']} onClick={handleSubmitProduct} disabled={isCreatingCatalogItem || Boolean(createdCatalogItemId)}>
							{createdCatalogItemId ? `Đã tạo (#${createdCatalogItemId})` : isCreatingCatalogItem ? 'Đang tạo...' : 'Tạo sản phẩm'}
						</button>
					</div>
				</div>

				{/* Step 5: Thuộc tính */}
				<div className={styles['pending-filters']} style={{ marginTop: 12 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div style={{ fontWeight: 600, fontSize: 16 }}>5) Thuộc tính</div>
						{!createdCatalogItemId && (
							<button
								type="button"
								className={styles['primary-button']}
								style={{ padding: '8px 16px', fontSize: '13px' }}
								onClick={handleAttributeInputClick}
							>
								{specDrafts.filter(s => s.attributeId).length > 0 ? 'Thay đổi thuộc tính' : 'Chọn thuộc tính'}
							</button>
						)}
					</div>

					{specDrafts.filter(s => s.attributeId).length > 0 ? (
						<table className={styles['service-table']}>
							<thead>
								<tr>
									<th style={{ width: 140 }}>Mã</th>
									<th style={{ textAlign: 'left' }}>Tên thuộc tính</th>
									<th>Giá trị</th>
									<th style={{ width: 120 }}>Đơn vị</th>
								</tr>
							</thead>
							<tbody>
								{specDrafts.filter(s => s.attributeId).map((d) => (
									<tr key={d.attributeId}>
										<td style={{ fontFamily: 'monospace' }}>{d.code || '-'}</td>
										<td style={{ textAlign: 'left', fontWeight: 600 }}>{d.displayName}</td>
										<td style={{ fontWeight: 500 }}>{d.specValue}</td>
										<td>{d.unit || '-'}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<div className={styles['filter-card__hint']} style={{ padding: '12px 0' }}>
							Chưa có thuộc tính nào được chọn. Nhấn nút "Chọn thuộc tính" để cấu hình.
						</div>
					)}

					<div style={{ marginTop: 16 }}>
						<div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>Thuộc tính đã lưu</div>
						{isSpecsLoading ? (
							<div className={styles['filter-card__hint']}>Đang tải...</div>
						) : savedSpecs.length ? (
							<table className={styles['service-table']}>
								<thead>
									<tr>
										<th style={{ fontWeight: 600, fontSize: 15, textAlign: 'left' }}>Thuộc tính</th>
										<th style={{ fontWeight: 600, fontSize: 15 }}>Giá trị</th>
										<th style={{ fontWeight: 600, fontSize: 15 }}>Đơn vị</th>
									</tr>
								</thead>
								<tbody>
									{savedSpecs.map((s, i) => {
										const attr = specAttributes.find((a) => Number(a.attributeId) === Number(s?.attributeId));
										return (
											<tr key={`${s?.specId ?? ''}-${i}`}>
												<td style={{ textAlign: 'left', fontWeight: 600 }}>{attr?.displayName || attr?.attributeCode || s?.attributeId || '-'}</td>
												<td>{s?.specValue ?? '-'}</td>
												<td>{s?.specUnit || attr?.unit || '-'}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<div className={styles['filter-card__hint']}>Chưa lưu thuộc tính nào lên hệ thống. (Thuộc tính sẽ tự động lưu khi tạo sản phẩm thành công)</div>
						)}
					</div>
				</div>
			</section>
			<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
				<button type="button" className={styles['primary-button']} onClick={() => navigate(-1)}>
					Quay lại
				</button>
			</div>

			{isScanning && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(14, 17, 24, 0.85)',
						backdropFilter: 'blur(8px)',
						zIndex: 10000,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'center',
						color: '#fff',
						fontFamily: 'sans-serif',
					}}
				>
					<style>{`
						@keyframes scan-line-animation {
							0% { top: 15%; }
							50% { top: 85%; }
							100% { top: 15%; }
						}
					`}</style>
					<div
						style={{
							backgroundColor: '#1b2230',
							borderRadius: '12px',
							padding: '24px',
							maxWidth: '440px',
							width: '90%',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
							border: '1px solid rgba(255, 255, 255, 0.1)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
						}}
					>
						<h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Quét mã vạch SKU</h3>

						<div
							style={{
								width: '100%',
								borderRadius: '8px',
								overflow: 'hidden',
								backgroundColor: '#000',
								border: '2px solid #3b82f6',
								position: 'relative',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								aspectRatio: '4/3',
							}}
						>
							<video
								id="sku-scanner-reader-video"
								style={{
									width: '100%',
									height: '100%',
									objectFit: 'cover',
									display: 'block',
								}}
								playsInline
								muted
								autoPlay
							/>

							{/* Laser scan line overlay */}
							<div
								style={{
									position: 'absolute',
									top: '50%',
									left: '10%',
									right: '10%',
									height: '2.5px',
									backgroundColor: '#ef4444',
									boxShadow: '0 0 8px #ef4444',
									animation: 'scan-line-animation 2.5s linear infinite',
									zIndex: 10,
								}}
							/>

							{/* Corner brackets */}
							<div style={{ position: 'absolute', border: '3px solid #3b82f6', width: '24px', height: '24px', top: '16px', left: '16px', borderRight: 'none', borderBottom: 'none' }} />
							<div style={{ position: 'absolute', border: '3px solid #3b82f6', width: '24px', height: '24px', top: '16px', right: '16px', borderLeft: 'none', borderBottom: 'none' }} />
							<div style={{ position: 'absolute', border: '3px solid #3b82f6', width: '24px', height: '24px', bottom: '16px', left: '16px', borderRight: 'none', borderTop: 'none' }} />
							<div style={{ position: 'absolute', border: '3px solid #3b82f6', width: '24px', height: '24px', bottom: '16px', right: '16px', borderLeft: 'none', borderTop: 'none' }} />
						</div>

						{hasZoomSupport && (
							<div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9ca3af' }}>
									<span>Thu phóng camera (Zoom)</span>
									<span style={{ fontWeight: 600, color: '#3b82f6' }}>{zoomValue.toFixed(1)}x</span>
								</div>
								<input
									type="range"
									min={zoomMin}
									max={zoomMax}
									step={zoomStep}
									value={zoomValue}
									onChange={handleZoomChange}
									style={{
										width: '100%',
										accentColor: '#3b82f6',
										cursor: 'pointer',
									}}
								/>
							</div>
						)}

						<p style={{ fontSize: '13px', color: '#9ca3af', margin: '16px 0', textAlign: 'center' }}>
							Căn chỉnh mã vạch vào vùng quét. Kéo thanh trượt để phóng to nếu mã vạch ở xa.
						</p>

						<div style={{ display: 'flex', gap: '12px', width: '100%' }}>
							<button
								type="button"
								className={styles['ghost-button']}
								style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
								onClick={stopScanningSku}
							>
								Hủy bỏ
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
