import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
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
const COUNTRY_OPTIONS = [
	'Việt Nam',
	'Nhật Bản',
	'Hàn Quốc',
	'Trung Quốc',
	'Thái Lan',
	'Indonesia',
	'Malaysia',
	'Singapore',
	'Đức',
	'Pháp',
	'Ý',
	'Anh',
	'Mỹ',
];
const COLOR_OPTIONS = [
	'Đen',
	'Trắng',
	'Xám',
	'Bạc',
	'Đỏ',
	'Xanh dương',
	'Xanh lá',
	'Vàng',
	'Cam',
	'Nâu',
	'Be',
];
const OTHER_OPTION_VALUE = '__OTHER__';

export default function CreateProduct() {
	useScrollToTop();
	const navigate = useNavigate();
	const notify = useCallback((message) => toast(message, { containerId: 'app-toast' }), []);

	const location = useLocation();
	const initialDraft = useMemo(() => {
		if (!location.state?.fromCategorySelection && !location.state?.fromBrandSelection && !location.state?.fromProductLineSelection) {
			sessionStorage.removeItem('gms_create_product_draft');
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
	const itemType = 'PART';
	const [selectedProductTaxRuleId, setSelectedProductTaxRuleId] = useState(() => initialDraft?.selectedProductTaxRuleId ?? '');
	const [isAddingNewProductTaxRule, setIsAddingNewProductTaxRule] = useState(false);
	const [productTaxName, setProductTaxName] = useState('');
	const [productTaxRate, setProductTaxRate] = useState('');
	const [isCreatingProductTaxRule, setIsCreatingProductTaxRule] = useState(false);
	const [sku, setSku] = useState(() => initialDraft?.sku ?? '');
	const [isScanning, setIsScanning] = useState(false);
	const codeReaderRef = useRef(null);
	const videoTrackRef = useRef(null);
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
	const [origin, setOrigin] = useState(() => initialDraft?.origin ?? '');
	const [customOrigin, setCustomOrigin] = useState(() => initialDraft?.customOrigin ?? '');
	const [color, setColor] = useState(() => initialDraft?.color ?? '');
	const [customColor, setCustomColor] = useState(() => initialDraft?.customColor ?? '');
	const [description, setDescription] = useState(() => initialDraft?.description ?? '');
	// Image file is kept only in component state (no upload at create time)
	const [imageFile, setImageFile] = useState(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState('');
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

	const handleCategoryInputClick = useCallback(() => {
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
		};
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/select-category');
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
		navigate,
	]);

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
		const brandIdNum = Number(selectedBrandId) || null;
		const list = Array.isArray(filteredProductLines) ? filteredProductLines : [];
		const current = String(selectedProductLineId || '').trim();
		if (!brandIdNum) {
			if (current) setSelectedProductLineId('');
			return;
		}
		if (current && list.some((l) => String(l.productLineId) === current)) return;
		setSelectedProductLineId('');
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
		};
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/select-brand');
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
		navigate,
	]);

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
		const nameValidated = validateTaxName(productTaxName, { required: true });
		if (nameValidated.error) {
			notify(nameValidated.error);
			return;
		}
		const rateValidated = validateTaxRatePercent(productTaxRate, { required: true });
		if (rateValidated.error) {
			notify(rateValidated.error);
			return;
		}
		const name = nameValidated.value;
		const rateNumber = rateValidated.value;
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

	const handleProductLineInputClick = useCallback(() => {
		if (!selectedBrandId) {
			notify('Vui lòng chọn hãng sản xuất trước khi chọn dòng sản phẩm.');
			return;
		}
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
		};
		sessionStorage.setItem('gms_create_product_draft', JSON.stringify(draft));
		navigate('/part-management/select-product-line');
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
		navigate,
		notify,
	]);

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
				await videoElement.play().catch(() => {});
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

				videoElement.srcObject = stream;

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

				const startDecoding = () => {
					videoElement.play().then(() => {
						codeReader.decodeFromVideoElementContinuously(videoElement, (result, err) => {
							if (result) {
								const decodedText = result.getText();
								setSku(decodedText);
								toast.success(`Đã quét được SKU: ${decodedText}`, { containerId: 'app-toast' });
								stopScanningSku();
							}
						});
					}).catch(err => {
						console.error("Autoplay failed:", err);
					});
				};

				if (videoElement.readyState >= 1) {
					startDecoding();
				} else {
					videoElement.onloadedmetadata = startDecoding;
				}

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
					serviceServiceId: 0,
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
			sessionStorage.removeItem('gms_create_product_draft');
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
		} catch (err) {
			notify(err?.message || 'Không thể tạo sản phẩm.');
		} finally {
			setIsCreatingCatalogItem(false);
		}
	}, [
		description,
		color,
		computedItemName,
		customColor,
		customOrigin,
		// imageUrl,
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
				<div className={styles['pending-filters']}>
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
				<div className={styles['pending-filters']} style={{ marginTop: 12 }}>
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
								<label htmlFor="price">Giá</label>
								<input id="price" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} disabled={Boolean(createdCatalogItemId) || !showPrice} />
							</div>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="unit">Đơn vị</label>
								<input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="warranty">Bảo hành (tháng)</label>
								<input id="warranty" type="number" value={warrantyDurationMonths} onChange={(e) => setWarrantyDurationMonths(e.target.value)} disabled={Boolean(createdCatalogItemId)} />
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="origin">Xuất xứ</label>
								<select id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} disabled={Boolean(createdCatalogItemId)}>
									<option value="">Chọn xuất xứ</option>
									{COUNTRY_OPTIONS.map((country) => (
										<option key={country} value={country}>
											{country}
										</option>
									))}
									<option value={OTHER_OPTION_VALUE}>Khác</option>
								</select>
								{origin === OTHER_OPTION_VALUE ? (
									<input
										style={{ marginTop: 8 }}
										value={customOrigin}
										onChange={(e) => setCustomOrigin(e.target.value)}
										placeholder="Nhập xuất xứ"
										disabled={Boolean(createdCatalogItemId)}
									/>
								) : null}
							</div>
							<div className="ui-field" style={{ marginBottom: 0 }}>
								<label htmlFor="color">Màu</label>
								<select id="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={Boolean(createdCatalogItemId)}>
									<option value="">Chọn màu</option>
									{COLOR_OPTIONS.map((colorOption) => (
										<option key={colorOption} value={colorOption}>
											{colorOption}
										</option>
									))}
									<option value={OTHER_OPTION_VALUE}>Khác</option>
								</select>
								{color === OTHER_OPTION_VALUE ? (
									<input
										style={{ marginTop: 8 }}
										value={customColor}
										onChange={(e) => setCustomColor(e.target.value)}
										placeholder="Nhập màu"
										disabled={Boolean(createdCatalogItemId)}
									/>
								) : null}
							</div>
						</div>
						<div style={{ marginTop: 12 }}>
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

				{/* Step 5-6: Specs */}
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
									objectFit: 'contain',
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
