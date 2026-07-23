import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import styles from './ServiceManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import CompatibleCarsSelector from '../../../components/CompatibleCarsSelector.jsx';
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

const toServiceCodeFragment = (value) => String(value || '')
	.normalize('NFD')
	.replace(/[\u0300-\u036f]/g, '')
	.toUpperCase()
	.replace(/[^A-Z0-9]+/g, '-')
	.replace(/^-+|-+$/g, '')
	.replace(/-{2,}/g, '-')
	.slice(0, 24);

const generateServiceCode = (title) => {
	const base = toServiceCodeFragment(title) || 'DICH-VU';
	const random = Math.floor(100 + Math.random() * 900);
	return `DV-${base}-${random}`;
};

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

const CATEGORY_TYPE_FIXED = 'SERVICE';
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

export default function CreateService() {
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
			sessionStorage.removeItem('gms_create_service_draft');
			delete window._gms_create_service_imageFile;
			delete window._gms_create_service_imagePreviewUrl;
			delete window._gms_create_service_blogMediaFiles;
			return null;
		}
		try {
			const raw = sessionStorage.getItem('gms_create_service_draft');
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

	// Step 3: Service line
	const [productLines, setProductLines] = useState([]);
	const [isProductLinesLoading, setIsProductLinesLoading] = useState(false);
	const [selectedProductLineId, setSelectedProductLineId] = useState(() => initialDraft?.selectedProductLineId ?? '');
	const selectedProductLineIdRef = useRef(initialDraft?.selectedProductLineId ?? '');

	// Step 4: Catalog item
	const [isCreatingCatalogItem, setIsCreatingCatalogItem] = useState(false);
	const [createdCatalogItem, setCreatedCatalogItem] = useState(null);
	const itemType = 'SERVICE';
	const [selectedProductTaxRuleId, setSelectedProductTaxRuleId] = useState(() => initialDraft?.selectedProductTaxRuleId ?? '');
	const [sku, setSku] = useState(() => initialDraft?.sku ?? '');
	const fileInputRef = useRef(null);
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
	const [imageFile, setImageFile] = useState(() => window._gms_create_service_imageFile ?? null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState(() => {
		return window._gms_create_service_imagePreviewUrl ?? '';
	});
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
		return Array.isArray(window._gms_create_service_blogMediaFiles) ? window._gms_create_service_blogMediaFiles : [];
	});
	const [isBlogSubmitting, setIsBlogSubmitting] = useState(false);
	const [isAiGenerating, setIsAiGenerating] = useState(false);
	const [aiTokenUsage, setAiTokenUsage] = useState(null);
	const editorRef = useRef(null);

	const [itemNameInput, setItemNameInput] = useState(() => initialDraft?.itemNameInput ?? '');
	const [itemNameManualEdited, setItemNameManualEdited] = useState(() => Boolean(initialDraft?.itemNameManualEdited));

	const createdCatalogItemId = useMemo(() => {
		return createdCatalogItem?.itemId ?? createdCatalogItem?.catalogItemId ?? createdCatalogItem?.id ?? null;
	}, [createdCatalogItem]);

	const selectedCategory = useMemo(() => {
		const id = String(selectedCategoryId || '').trim();
		if (!id || id === 'null' || id === 'undefined') return null;
		return categories.find((c) => c.itemCategoryId && String(c.itemCategoryId) === id) || null;
	}, [categories, selectedCategoryId]);

	const handleRandomServiceCode = useCallback(() => {
		if (createdCatalogItemId) return;
		const baseTitle = String(itemNameInput || selectedCategory?.categoryName || 'Dich Vu').trim();
		setSku(generateServiceCode(baseTitle));
	}, [createdCatalogItemId, itemNameInput, selectedCategory?.categoryName]);

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
				setIsUnitsLoading(true);

				const [catRes, brandRes, lineRes, specRes, taxRes, unitRes] = await Promise.all([
					fetchWarehouseItemCategories(token),
					fetchWarehouseBrands(token),
					fetchWarehouseProductLines(token),
					fetchWarehouseSpecAttributes(token),
					fetchTaxRules(token),
					fetchWarehouseProductUnits(token),
				]);

				if (cancelled) return;

				const catList = Array.isArray(extractPayload(catRes)) ? extractPayload(catRes) : [];
				const brandList = Array.isArray(extractPayload(brandRes)) ? extractPayload(brandRes) : [];
				const lineList = Array.isArray(extractPayload(lineRes)) ? extractPayload(lineRes) : [];
				const specList = Array.isArray(extractPayload(specRes)) ? extractPayload(specRes) : [];
				const taxList = Array.isArray(extractPayload(taxRes)) ? extractPayload(taxRes) : [];
				const unitList = Array.isArray(extractPayload(unitRes)) ? extractPayload(unitRes) : [];

				const serviceCats = catList
					.map(mapCategoryItem)
					.filter(Boolean)
					.filter((c) => String(c.categoryType || '').toUpperCase() === CATEGORY_TYPE_FIXED)
					.filter((c) => String(c.isActive || '1') === '1' || c.isActive === true);

				const activeBrands = brandList.map(mapBrandItem).filter(Boolean);

				const activeLines = lineList
					.map(mapProductLineItem)
					.filter(Boolean)
					.filter((l) => String(l.isActive || '1') === '1' || l.isActive === true);

				const activeSpecs = specList.map(mapSpecAttributeItem).filter(Boolean);
				const mappedTaxes = taxList.map(mapTaxRuleItem).filter(Boolean);
				const mappedUnits = unitList
					.map((u) => ({
						unitId: u.unitId ?? u.id,
						unitName: u.unitName ?? u.name ?? '',
						isActive: u.isActive ?? u.active ?? '1',
					}))
					.filter((u) => u.unitName && (String(u.isActive) === '1' || u.isActive === true));

				setCategories(serviceCats);
				setBrands(activeBrands);
				setProductLines(activeLines);
				setSpecAttributes(activeSpecs);
				setTaxRules(mappedTaxes);
				setUnits(mappedUnits);
			} catch (err) {
				if (cancelled) return;
				notify(err?.message || 'Không thể tải danh mục.');
			} finally {
				if (!cancelled) {
					setIsCategoriesLoading(false);
					setIsBrandsLoading(false);
					setIsProductLinesLoading(false);
					setIsSpecAttributesLoading(false);
					setIsTaxRulesLoading(false);
					setIsUnitsLoading(false);
				}
			}
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [notify]);

	useEffect(() => {
		if (!createdCatalogItemId) return;
		let cancelled = false;
		(async () => {
			try {
				const token = localStorage.getItem('authToken');
				setIsSpecsLoading(true);
				const res = await fetchWarehouseSpecificationsByCatalogItemId(createdCatalogItemId, token);
				if (cancelled) return;
				const list = Array.isArray(extractPayload(res)) ? extractPayload(res) : [];
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

	const saveDraft = useCallback(
		(targetPath) => {
			const draft = {
				selectedCategoryId,
				selectedBrandId,
				selectedProductLineId,
				selectedProductTaxRuleId,
				sku,
				price,
				showPrice,
				unit,
				origin,
				customOrigin,
				color,
				customColor,
				description,
				compatibleCars,
				warrantyDurationMonths,
				specDrafts,
				introText,
				detailHtml,
				itemNameInput,
				itemNameManualEdited,
			};
			sessionStorage.setItem('gms_create_service_draft', JSON.stringify(draft));
			if (imageFile) {
				window._gms_create_service_imageFile = imageFile;
				window._gms_create_service_imagePreviewUrl = imagePreviewUrl;
			}
			if (blogMediaFiles.length > 0) {
				window._gms_create_service_blogMediaFiles = blogMediaFiles;
			}
			navigate(targetPath);
		},
		[
			selectedCategoryId,
			selectedBrandId,
			selectedProductLineId,
			selectedProductTaxRuleId,
			sku,
			price,
			showPrice,
			unit,
			origin,
			customOrigin,
			color,
			customColor,
			description,
			compatibleCars,
			warrantyDurationMonths,
			specDrafts,
			introText,
			detailHtml,
			itemNameInput,
			itemNameManualEdited,
			imageFile,
			imagePreviewUrl,
			blogMediaFiles,
			navigate,
		],
	);

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

		const activeSpecs = (Array.isArray(specDrafts) ? specDrafts : []).filter((d) => String(d.specValue || '').trim());
		activeSpecs.forEach((s) => {
			const val = String(s.specValue || '').trim();
			const unitStr = String(s.unit || '').trim();
			if (val) parts.push(unitStr ? `${val}${unitStr}` : val);
		});

		return parts.join(' ');
	}, [selectedCategory, selectedBrand, selectedProductLine, specDrafts]);

	useEffect(() => {
		if (!itemNameManualEdited) {
			setItemNameInput(computedItemName);
		}
	}, [computedItemName, itemNameManualEdited]);

	const handleBrandInputClick = useCallback(() => {
		saveDraft('/part-management/select-brand');
	}, [saveDraft]);

	const filteredUnitsInline = useMemo(() => {
		const q = unitSearchQuery.trim().toLowerCase();
		return units.filter((u) => !q || u.unitName.toLowerCase().includes(q));
	}, [units, unitSearchQuery]);

	const isNewUnitDuplicate = useMemo(() => {
		const n = newUnitName.trim().toUpperCase();
		return n ? units.some((u) => u.unitName.trim().toUpperCase() === n) : false;
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

			const listRes = await fetchWarehouseProductUnits(token);
			const listRaw = Array.isArray(extractPayload(listRes)) ? extractPayload(listRes) : [];
			setUnits(listRaw.map((u) => ({ unitId: u.unitId ?? u.id, unitName: u.unitName ?? u.name ?? '' })).filter((u) => u.unitName && (String(u.isActive ?? u.active ?? '1') === '1' || u.isActive === true)));
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
		if (!createdCatalogItem) setShowUnitDropdown((v) => !v);
	}, [createdCatalogItem]);

	const handleProductTaxInputClick = useCallback(() => {
		saveDraft('/part-management/select-tax');
	}, [saveDraft]);

	const handleProductLineInputClick = useCallback(() => {
		if (!selectedBrandId) {
			notify('Vui lòng chọn thương hiệu dịch vụ trước khi chọn dòng dịch vụ.');
			return;
		}
		saveDraft('/part-management/select-product-line');
	}, [saveDraft, selectedBrandId, notify]);

	const handleOriginInputClick = useCallback(() => {
		saveDraft('/part-management/select-origin');
	}, [saveDraft]);

	// ── AI Article Auto-Generator & Token Calculator for Service ──
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

	const generateFallbackServiceArticle = useCallback((promptText = '') => {
		const title = String(itemNameInput || selectedCategory?.categoryName || 'Dịch vụ bảo dưỡng ô tô').trim();
		const formattedPrice = price ? `${Number(price).toLocaleString('vi-VN')} VNĐ` : 'Ưu đãi liên hệ';
		const duration = warrantyDurationMonths ? `${warrantyDurationMonths} tháng` : 'Theo quy chuẩn nhà sản xuất';

		const intro = `Dịch vụ ${title} tại Michelin Sơn Tây cam kết mang tới giải pháp chăm sóc xe toàn diện với mức chi phí ưu đãi chỉ ${formattedPrice}. Kỹ thuật viên lành nghề cùng máy móc hiện đại giúp xế yêu luôn bền bỉ và an toàn.`;

		const detailHtmlContent = `
<h3>Tổng quan dịch vụ ${title}</h3>
<p>Dịch vụ <strong>${title}</strong> được Garage Michelin Sơn Tây triển khai với quy trình thi công tiêu chuẩn nghiêm ngặt. Chúng tôi ứng dụng công nghệ chẩn đoán tiên tiến cùng thiết bị chuyên dụng, đáp ứng hoàn hảo mọi yêu cầu khắt khe của khách hàng.</p>

<h3>Quy trình thi công tiêu chuẩn tại Michelin Sơn Tây</h3>
<ul>
  <li><strong>Bước 1:</strong> Tiếp nhận xe, đọc lỗi chẩn đoán toàn diện và tư vấn giải pháp tối ưu.</li>
  <li><strong>Bước 2:</strong> Tiến hành thi công ${title} đúng kỹ thuật theo tiêu chuẩn nhà sản xuất.</li>
  <li><strong>Bước 3:</strong> Kiểm tra vận hành thực tế, vệ sinh khu vực thi công và kiểm định an toàn.</li>
  <li><strong>Bước 4:</strong> Bàn giao xe kèm phiếu bảo hành dịch vụ chính hãng <strong>${duration}</strong>.</li>
</ul>

<h3>Cam kết chất lượng dịch vụ</h3>
<p>Chúng tôi cam kết sử dụng linh kiện và vật tư <strong>chính hãng 100%</strong>. Bảo hành dịch vụ <strong>${duration}</strong>, hỗ trợ kỹ thuật và kiểm tra tổng quát xe miễn phí cho mọi khách hàng.</p>
		`.trim();

		setIntroText(intro);
		setDetailHtml(detailHtmlContent);
		if (editorRef.current) {
			editorRef.current.innerHTML = detailHtmlContent;
		}
		const usage = calculateTokenUsage(promptText, intro, detailHtmlContent, null);
		setAiTokenUsage(usage);
	}, [itemNameInput, selectedCategory, price, warrantyDurationMonths, calculateTokenUsage]);

	const handleAiGenerateServiceArticle = useCallback(async () => {
		if (isAiGenerating) return;

		const title = String(itemNameInput || '').trim();
		const categoryName = selectedCategory?.categoryName || '';
		const prompt = `Bạn là chuyên gia truyền thông ô tô của Garage Michelin Sơn Tây. Hãy viết một bài viết giới thiệu thật hấp dẫn, chuyên nghiệp và đầy đủ thông tin cho Dịch vụ chăm sóc xe sau:
- Tên dịch vụ: ${title || 'Dịch vụ bảo dưỡng xe chuyên nghiệp'}
- Giá dịch vụ: ${price ? Number(price).toLocaleString('vi-VN') + ' VNĐ' : 'Ưu đãi liên hệ'}
- Danh mục dịch vụ: ${categoryName || 'Bảo dưỡng định kỳ'}
- Thời gian bảo hành: ${warrantyDurationMonths ? warrantyDurationMonths + ' tháng' : 'Theo quy định'}
- Đơn vị tính: ${unit || 'Lượt/Gói'}
- Xe tương thích: ${compatibleCars || 'Tất cả các dòng xe ô tô'}
- Ghi chú/Mô tả dịch vụ: ${description || 'Dịch vụ thi công tiêu chuẩn chất lượng cao'}

YÊU CẦU ĐỊNH DẠNG:
Hãy trả về duy nhất 1 đoạn JSON chuẩn không chứa mã markdown backtick với cấu trúc:
{
  "intro": "Phần tóm tắt ngắn 2-3 câu làm nổi bật điểm sáng của dịch vụ...",
  "detailHtml": "<h3>Giới thiệu dịch vụ</h3><p>...</p><h3>Quy trình thi công</h3><ul><li>...</li></ul><h3>Cam kết chất lượng</h3><p>...</p>"
}`;

		try {
			setIsAiGenerating(true);

			const res = await sendAiMessage({ message: prompt }).catch((err) => {
				console.warn('[AI Service Generator] Backend Gemini API returned error, falling back:', err?.message);
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

			generateFallbackServiceArticle(prompt);
		} catch (err) {
			console.warn('[AI Service Generator] Exception, using fallback:', err);
			generateFallbackServiceArticle(prompt);
		} finally {
			setIsAiGenerating(false);
		}
	}, [itemNameInput, selectedCategory, price, warrantyDurationMonths, unit, compatibleCars, description, isAiGenerating, calculateTokenUsage, generateFallbackServiceArticle]);

	const handleColorInputClick = useCallback(() => {
		saveDraft('/part-management/select-color');
	}, [saveDraft]);

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

	const handleSubmitService = useCallback(
		async (e) => {
			if (e) e.preventDefault();
			if (isCreatingCatalogItem) return;

			const token = localStorage.getItem('authToken');
			const categoryId = Number(selectedCategoryId) || null;
			const brandId = Number(selectedBrandId) || null;
			const productLineId = selectedProductLineId ? Number(selectedProductLineId) : null;
			if (!categoryId) {
				notify('Vui lòng chọn hạng mục dịch vụ.');
				return;
			}
			if (!brandId) {
				notify('Vui lòng chọn thương hiệu dịch vụ.');
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
					notify('Vui lòng nhập mô tả dịch vụ hoặc tóm tắt/nội dung bài viết.');
					return;
				}
			}
			const skuTrim = String(sku || '').trim();
			if (!skuTrim) {
				notify('Vui lòng nhập mã dịch vụ (SKU).');
				return;
			}
			const itemName = String(itemNameInput || '').trim();
			if (!itemName) {
				notify('Vui lòng nhập tên dịch vụ.');
				return;
			}
			const priceNum = showPrice ? Number(String(price || '').trim()) : 0;
			if (showPrice && (!Number.isFinite(priceNum) || priceNum <= 0)) {
				notify('Giá dịch vụ phải lớn hơn 0.');
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
						itemType: 'SERVICE',
						warrantyDurationMonths: Math.trunc(warrantyNum),
						serviceServiceId: null,
						sku: skuTrim,
						price: showPrice ? priceNum : 0,
						showPrice,
						description: String(description || '').trim(),
						madeIn: resolvedOrigin,
						origin: resolvedOrigin,
						color: resolvedColor,
						unit: String(unit || '').trim(),
						comboDurationMonths: 0,
						comboDescription: '',
						isRecurring: false,
						brandId,
						productLineId,
						product_line_id: productLineId,
						itemCategoryId: categoryId,
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
					notify('Tạo dịch vụ thất bại (không nhận được CatalogItemId/itemId).');
					return;
				}
				setCreatedCatalogItem(created);
				sessionStorage.removeItem('gms_create_service_draft');
				delete window._gms_create_service_imageFile;
				delete window._gms_create_service_imagePreviewUrl;
				delete window._gms_create_service_blogMediaFiles;
				notify(`Đã tạo dịch vụ (#${createdId}).`);

				const draftsToSave = Array.isArray(specDrafts) ? specDrafts.filter((d) => String(d.specValue || '').trim() && d.attributeId) : [];
				if (draftsToSave.length > 0) {
					notify('Đang lưu các thông số...');
					for (let i = 0; i < draftsToSave.length; i++) {
						const d = draftsToSave[i];
						try {
							await createWarehouseSpecificationValue(
								{ specId: null, itemId: createdId, attributeId: Number(d.attributeId), specValue: String(d.specValue).trim() },
								token,
							);
						} catch (err) {
							notify(`Không thể lưu thông số "${d.displayName}": ${err.message}`);
						}
					}
					try {
						const specRes = await fetchWarehouseSpecificationsByCatalogItemId(createdId, token);
						const specList = Array.isArray(extractPayload(specRes)) ? extractPayload(specRes) : [];
						setSavedSpecs(specList);
					} catch {
						// ignore spec fetch error
					}
				}

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
						if (imageFile) {
							formData.append('thumbnailFile', imageFile);
						}
						blogMediaFiles.forEach((m) => {
							if (m.file) {
								formData.append('mediaFiles', m.file);
							}
						});

						await createServiceForCatalog(createdId, formData, token);
						notify('Đã tạo bài viết chi tiết cho dịch vụ thành công!', 'success');
					} catch (blogErr) {
						notify(`Tạo bài viết chi tiết thất bại: ${blogErr.message}`);
					} finally {
						setIsBlogSubmitting(false);
					}
				}

				navigate('/service-management');
			} catch (err) {
				notify(err?.message || 'Không thể tạo dịch vụ.');
			} finally {
				setIsCreatingCatalogItem(false);
			}
		},
		[
			description,
			color,
			itemNameInput,
			customColor,
			customOrigin,
			isCreatingCatalogItem,
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
			compatibleCars,
		],
	);

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

		const wrapper = document.createElement(tagName);
		if (attrs && typeof attrs === 'object') {
			Object.entries(attrs).forEach(([k, v]) => wrapper.setAttribute(k, v));
		}
		try {
			range.surroundContents(wrapper);
		} catch {
			const fragment = range.extractContents();
			wrapper.appendChild(fragment);
			range.insertNode(wrapper);
		}
		selection.removeAllRanges();
		syncDetailFromEditor();
	}, [syncDetailFromEditor]);

	const applyListTag = useCallback((listTagName) => {
		const editor = editorRef.current;
		if (!editor) return;
		editor.focus();
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);
		if (!editor.contains(range.commonAncestorContainer)) return;

		const text = range.toString();
		const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

		const listNode = document.createElement(listTagName);
		if (lines.length > 0) {
			lines.forEach((line) => {
				const li = document.createElement('li');
				li.textContent = line;
				listNode.appendChild(li);
			});
		} else {
			const li = document.createElement('li');
			li.textContent = 'Mục mới';
			listNode.appendChild(li);
		}

		if (!range.collapsed) {
			range.deleteContents();
		}
		range.insertNode(listNode);
		selection.removeAllRanges();
		syncDetailFromEditor();
	}, [syncDetailFromEditor]);

	const handleToolbarClick = useCallback(
		(action) => {
			if (action === 'bold') applyInlineTag('strong');
			if (action === 'italic') applyInlineTag('em');
			if (action === 'uppercase') applyInlineTag('span', { style: 'text-transform: uppercase;' });
			if (action === 'ol') applyListTag('ol');
			if (action === 'ul') applyListTag('ul');
		},
		[applyInlineTag, applyListTag],
	);

	const handleBlogMediaChange = useCallback((e) => {
		const files = Array.from(e?.target?.files || []);
		if (!files.length) return;
		const mapped = files.map((file) => ({
			id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			file,
			previewUrl: URL.createObjectURL(file),
		}));
		setBlogMediaFiles((prev) => [...(Array.isArray(prev) ? prev : []), ...mapped]);
		e.target.value = '';
	}, []);

	const removeBlogMedia = useCallback((index) => {
		setBlogMediaFiles((prev) => {
			const list = Array.isArray(prev) ? [...prev] : [];
			const removed = list.splice(index, 1)[0];
			if (removed?.previewUrl) {
				URL.revokeObjectURL(removed.previewUrl);
			}
			return list;
		});
	}, []);

	return (
		<div className={styles['service-page']} onKeyDown={handleKeyDown}>
			<section className={styles['service-card']}>
				<div className={styles['service-card__header']}>
					<div className={styles['service-card__title']}>
						<strong>Tạo dịch vụ mới</strong>
					</div>
				</div>

				{/* Avatar Image Upload Box */}
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

				{/* Service Name Card */}
				<div className={styles['pending-filters']}>
					<div style={{ fontWeight: 600, marginBottom: 8 }}>Tên dịch vụ</div>
					<div className="ui-field" style={{ marginBottom: 0 }}>
						<input
							id="itemNameInput"
							type="text"
							value={itemNameInput}
							onChange={(e) => {
								setItemNameInput(e.target.value);
								setItemNameManualEdited(true);
							}}
							placeholder="Nhập tên dịch vụ, hoặc chọn nhóm/hãng/dòng để tạo tên gợi ý"
							disabled={Boolean(createdCatalogItemId)}
						/>
					</div>
					{!createdCatalogItemId && computedItemName && computedItemName !== itemNameInput.trim() && (
						<button
							type="button"
							className={styles['ghost-button']}
							style={{ marginTop: 8, fontSize: 12.5, padding: '6px 12px' }}
							onClick={() => {
								setItemNameInput(computedItemName);
								setItemNameManualEdited(false);
							}}
						>
							Dùng tên gợi ý: "{computedItemName}"
						</button>
					)}
				</div>

				{/* Steps 1, 2, 3 Grid (Hạng mục dịch vụ, Hãng, Dòng sản phẩm) */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 12 }}>
					{/* Step 1: Category */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>1) Hạng mục dịch vụ</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<input
								id="categorySelect"
								readOnly
								placeholder="Nhấn vào đây để chọn hạng mục dịch vụ..."
								value={selectedCategory ? selectedCategory.categoryName || selectedCategory.categoryCode : ''}
								onClick={handleCategoryInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>

					{/* Step 2: Brand */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>2) Hãng / Thương hiệu dịch vụ</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<input
								id="brandSelect"
								readOnly
								placeholder="Nhấn vào đây để chọn thương hiệu dịch vụ..."
								value={selectedBrand ? selectedBrand.brandName : ''}
								onClick={handleBrandInputClick}
								style={{ cursor: 'pointer' }}
								disabled={Boolean(createdCatalogItemId)}
							/>
						</div>
					</div>

					{/* Step 3: Product line */}
					<div className={styles['pending-filters']} style={{ marginTop: 0 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>3) Dòng dịch vụ</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<input
								id="productLineSelect"
								readOnly
								placeholder="Nhấn vào đây để chọn dòng dịch vụ..."
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
					<div style={{ fontWeight: 600, marginBottom: 8 }}>4) Thông tin dịch vụ</div>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<label htmlFor="sku" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span>Mã dịch vụ (SKU)</span>
								{!createdCatalogItemId && (
									<button
										type="button"
										className={styles['ghost-button']}
										style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #d1d5db' }}
										onClick={handleRandomServiceCode}
									>
										<span>Random mã</span>
									</button>
								)}
							</label>
							<input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} disabled={Boolean(createdCatalogItemId)} placeholder="DV-..." />
						</div>
						<div className="ui-field" style={{ marginBottom: 0 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
								<label htmlFor="price" style={{ marginBottom: 0 }}>Giá dịch vụ</label>
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
								placeholder={showPrice ? "Nhập giá dịch vụ..." : "Liên hệ"}
							/>
						</div>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 12 }}>
						<div className="ui-field" style={{ marginBottom: 0, position: 'relative' }} ref={unitDropdownRef}>
							<label htmlFor="unit">Đơn vị tính</label>
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

							{showUnitDropdown && (
								<div style={{
									position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
									background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
									boxShadow: '0 8px 24px rgba(0,0,0,.12)', marginTop: 4, overflow: 'hidden',
								}}>
									<div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
										<input
											autoFocus
											placeholder="Tìm đơn vị..."
											value={unitSearchQuery}
											onChange={(e) => { setUnitSearchQuery(e.target.value); setShowAddUnitInput(false); }}
											style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
										/>
									</div>

									<div style={{ maxHeight: 180, overflowY: 'auto' }}>
										{filteredUnitsInline.length === 0 ? (
											<div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>Không tìm thấy đơn vị</div>
										) : filteredUnitsInline.map((u) => (
											<div
												key={u.unitId}
												onClick={() => handleSelectUnitInline(u.unitName)}
												style={{
													padding: '9px 14px', cursor: 'pointer', fontSize: 13,
													background: unit === u.unitName ? '#eff6ff' : 'white',
													color: unit === u.unitName ? '#2563eb' : '#111827',
													fontWeight: unit === u.unitName ? 600 : 400,
												}}
												onMouseEnter={(e) => { if (unit !== u.unitName) e.currentTarget.style.background = '#f9fafb'; }}
												onMouseLeave={(e) => { if (unit !== u.unitName) e.currentTarget.style.background = 'white'; }}
											>
												{u.unitName}
											</div>
										))}
									</div>

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
														onChange={(e) => setNewUnitName(e.target.value)}
														onKeyDown={(e) => e.key === 'Enter' && handleCreateUnitInline()}
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
							<label htmlFor="color">Màu sắc</label>
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
							<label htmlFor="productTaxRuleSelect">Chọn thuế dịch vụ</label>
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
						<label htmlFor="description">Mô tả ngắn</label>
						<textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={Boolean(createdCatalogItemId)} placeholder="Nhập mô tả ngắn cho dịch vụ..." />
					</div>

					{!createdCatalogItemId && (
						<div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', flexWrap: 'wrap', gap: 8 }}>
									<div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
										Bài viết giới thiệu chi tiết dịch vụ
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
											onClick={handleAiGenerateServiceArticle}
											disabled={isAiGenerating || isCreatingCatalogItem}
											title="Tự động đọc thông tin form và sử dụng AI để tạo bài viết dịch vụ"
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
										placeholder="Nhập phần giới thiệu ngắn hoặc tóm tắt của bài viết dịch vụ..."
										style={{ minHeight: '80px' }}
									/>
								</div>

								<div className="ui-field" style={{ marginBottom: 0 }}>
									<label style={{ fontWeight: 500 }}>Chi tiết dịch vụ</label>
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
											overflowY: 'auto',
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
															padding: 0,
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

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 16 }}>
						<button
							type="button"
							className={styles['primary-button']}
							onClick={handleSubmitService}
							disabled={isCreatingCatalogItem || isBlogSubmitting}
						>
							{createdCatalogItemId ? `Đã tạo (#${createdCatalogItemId})` : (isCreatingCatalogItem || isBlogSubmitting) ? 'Đang tạo...' : 'Tạo dịch vụ'}
						</button>
					</div>
				</div>
			</section>

			<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
				<button type="button" className={styles['primary-button']} onClick={() => navigate('/service-management')}>
					Quay lại
				</button>
			</div>
		</div>
	);
}
