import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createPromotion,
  fetchAllPromotions,
  fetchAvailablePromotions,
  fetchPromotionByCode,
  updatePromotion,
} from '../../../services/promotionService.js';
import { searchAdminCustomers } from '../../../services/customerService.js';
import { searchWarehouseCatalogItems } from '../../../services/warehouseService.js';
import styles from './PromotionManagement.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const normalizeTypeValue = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PERCENTAGE') return 'PERCENT';
  if (raw === 'BOGO') return 'BUY_X_GET_Y';
  return raw || 'PERCENT';
};

const normalizeApplyToValue = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'ALL' || raw === 'SPECIFIC') return raw;
  return 'ALL';
};

const normalizeTargetTypeValue = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'ALL_CUSTOMERS') return 'ALL';
  if (raw === 'VIP_CUSTOMERS' || raw === 'NEW_CUSTOMERS') return 'SPECIFIC';
  if (raw === 'ALL' || raw === 'SPECIFIC') return raw;
  return 'ALL';
};

const defaultForm = {
  promotionId: null,
  code: '',
  name: '',
  type: 'PERCENT',
  discountPercent: '',
  isActive: true,
  applyTo: 'ALL',
  targetType: 'ALL',
  minOrderValue: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  buyItemId: '',
  buyQuantity: '',
  getItemId: '',
  getQuantity: '',
  promotionItems: [],
  promotionCustomers: [],
};

const PROMOTION_CODE_PATTERN = /^[A-Z0-9_-]+$/;

const normalizePromotionCode = (value) => String(value ?? '').trim().toUpperCase();

const isPositiveIntegerValue = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};

const getDiscountPercentError = (value) => {
  if (String(value ?? '').trim() === '') return 'Vui lòng nhập phần trăm giảm.';
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > 100) {
    return 'Phần trăm giảm phải lớn hơn 0 và không vượt quá 100.';
  }
  return '';
};

const toPositiveId = (value) => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
};

const normalizeIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((item) => {
      if (item && typeof item === 'object') {
        return toPositiveId(item.id ?? item.itemId ?? item.customerId ?? item.value);
      }
      return toPositiveId(item);
    })
    .filter((id) => id !== null);
  return [...new Set(ids)];
};

const extractPageContent = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const extractPromotionDetail = (response, fallback) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload[0] ?? fallback;
  return payload && typeof payload === 'object' ? payload : fallback;
};

const getCatalogItemId = (item) => toPositiveId(item?.itemId ?? item?.id ?? item?.catalogItemId);
const getCatalogItemName = (item) => String(item?.itemName ?? item?.name ?? item?.title ?? '').trim();
const getCatalogItemMeta = (item) => String(item?.sku ?? item?.partNumber ?? item?.barcode ?? '').trim();

const getCustomerId = (customer) => toPositiveId(customer?.customerId ?? customer?.id ?? customer?.customerProfileId);
const getCustomerName = (customer) => String(customer?.fullName ?? customer?.customerName ?? customer?.name ?? '').trim();
const getCustomerMeta = (customer) => String(customer?.phone ?? customer?.email ?? '').trim();

const mergeSelectedById = (current, nextItem, getId) => {
  const nextId = getId(nextItem);
  if (!nextId) return current;
  if (current.some((item) => getId(item) === nextId)) return current;
  return [...current, nextItem];
};

const buildPromotionFormErrors = (rawForm, existingPromotions = [], currentPromotionId = null) => {
  const nextErrors = {};
  const code = normalizePromotionCode(rawForm?.code);
  const name = String(rawForm?.name ?? '').trim();
  const type = normalizeTypeValue(rawForm?.type);
  const startDate = String(rawForm?.startDate ?? '').trim();
  const endDate = String(rawForm?.endDate ?? '').trim();
  const minOrderValueText = String(rawForm?.minOrderValue ?? '').trim();
  const usageLimitText = String(rawForm?.usageLimit ?? '').trim();

  if (!code) {
    nextErrors.code = 'Vui lòng nhập mã khuyến mãi.';
  } else if (code.length < 3 || code.length > 30) {
    nextErrors.code = 'Mã khuyến mãi phải dài từ 3 đến 30 ký tự.';
  } else if (!PROMOTION_CODE_PATTERN.test(code)) {
    nextErrors.code = 'Mã chỉ được chứa chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.';
  } else {
    const duplicatedCode = existingPromotions.some((item) => (
      normalizePromotionCode(item?.code) === code
      && Number(item?.promotionId ?? 0) !== Number(currentPromotionId ?? 0)
    ));
    if (duplicatedCode) {
      nextErrors.code = 'Mã khuyến mãi đã tồn tại.';
    }
  }

  if (!name) {
    nextErrors.name = 'Vui lòng nhập tên chương trình.';
  } else if (name.length < 3) {
    nextErrors.name = 'Tên chương trình phải có ít nhất 3 ký tự.';
  } else if (name.length > 120) {
    nextErrors.name = 'Tên chương trình không được vượt quá 120 ký tự.';
  }

  if (type === 'PERCENT') {
    const discountPercent = Number(rawForm?.discountPercent);
    if (String(rawForm?.discountPercent ?? '').trim() === '') {
      nextErrors.discountPercent = 'Vui lòng nhập phần trăm giảm.';
    } else if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      nextErrors.discountPercent = 'Phần trăm giảm phải lớn hơn 0 và không vượt quá 100.';
    }
  }

  if (type === 'BUY_X_GET_Y') {
    if (!isPositiveIntegerValue(rawForm?.buyQuantity)) {
      nextErrors.buyQuantity = 'Số lượng mua phải là số nguyên lớn hơn 0.';
    }
    if (!isPositiveIntegerValue(rawForm?.getQuantity)) {
      nextErrors.getQuantity = 'Số lượng tặng phải là số nguyên lớn hơn 0.';
    }
    if (String(rawForm?.buyItemId ?? '').trim() !== '' && !isPositiveIntegerValue(rawForm?.buyItemId)) {
      nextErrors.buyItemId = 'Mã sản phẩm mua phải là số nguyên lớn hơn 0.';
    }
    if (String(rawForm?.getItemId ?? '').trim() !== '' && !isPositiveIntegerValue(rawForm?.getItemId)) {
      nextErrors.getItemId = 'Mã sản phẩm tặng phải là số nguyên lớn hơn 0.';
    }
  }

  if (startDate && !endDate) {
    nextErrors.endDate = 'Vui lòng chọn ngày kết thúc.';
  }
  if (!startDate && endDate) {
    nextErrors.startDate = 'Vui lòng chọn ngày bắt đầu.';
  }
  if (startDate && endDate && startDate > endDate) {
    nextErrors.startDate = 'Ngày bắt đầu không được sau ngày kết thúc.';
    nextErrors.endDate = 'Ngày kết thúc không được trước ngày bắt đầu.';
  }

  if (minOrderValueText !== '') {
    const minOrderValue = Number(minOrderValueText);
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
      nextErrors.minOrderValue = 'Giá trị đơn tối thiểu phải lớn hơn hoặc bằng 0.';
    }
  }

  if (usageLimitText !== '') {
    const usageLimit = Number(usageLimitText);
    if (!Number.isInteger(usageLimit) || usageLimit <= 0) {
      nextErrors.usageLimit = 'Giới hạn lượt dùng phải là số nguyên lớn hơn 0.';
    }
  }

  if (!['ALL', 'SPECIFIC'].includes(normalizeApplyToValue(rawForm?.applyTo))) {
    nextErrors.applyTo = 'Giá trị áp dụng cho không hợp lệ.';
  }

  if (!['ALL', 'SPECIFIC'].includes(normalizeTargetTypeValue(rawForm?.targetType))) {
    nextErrors.targetType = 'Đối tượng khách hàng không hợp lệ.';
  }

  if (normalizeApplyToValue(rawForm?.applyTo) === 'SPECIFIC' && normalizeIdArray(rawForm?.promotionItems).length === 0) {
    nextErrors.promotionItems = 'Vui lòng chọn ít nhất 1 catalog item.';
  }

  if (normalizeTargetTypeValue(rawForm?.targetType) === 'SPECIFIC' && normalizeIdArray(rawForm?.promotionCustomers).length === 0) {
    nextErrors.promotionCustomers = 'Vui lòng chọn ít nhất 1 customer.';
  }

  return nextErrors;
};

const PROMOTION_TYPE_LABELS = {
  PERCENT: 'Giảm theo phần trăm',
  BUY_X_GET_Y: 'Mua X tặng Y',
};

export default function PromotionManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [mode, setMode] = useState('ADMIN_ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [selectedCatalogItems, setSelectedCatalogItems] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const normalizedFormType = normalizeTypeValue(form.type);
  const isBuyXGetY = normalizedFormType === 'BUY_X_GET_Y';
  const isPercentType = normalizedFormType === 'PERCENT';
  const detailPromotionItems = useMemo(
    () => normalizeIdArray(selectedPromotion?.promotionItems),
    [selectedPromotion],
  );
  const detailPromotionCustomers = useMemo(
    () => normalizeIdArray(selectedPromotion?.promotionCustomers),
    [selectedPromotion],
  );

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để quản lý khuyến mãi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = mode === 'AVAILABLE'
        ? await fetchAvailablePromotions(token)
        : await fetchAllPromotions(token);
      setPromotions(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setPromotions([]);
      setError(err?.message || 'Không tải được danh sách khuyến mãi.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!openModal || normalizeApplyToValue(form.applyTo) !== 'SPECIFIC') {
      setCatalogResults([]);
      setCatalogLoading(false);
      setCatalogError('');
      return undefined;
    }

    const keyword = catalogSearch.trim();
    if (!keyword) {
      setCatalogResults([]);
      setCatalogLoading(false);
      setCatalogError('');
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setCatalogLoading(true);
        setCatalogError('');
        const response = await searchWarehouseCatalogItems(
          { page: 0, size: 10, search: keyword, isActive: true },
          getAuthToken(),
        );
        if (cancelled) return;
        setCatalogResults(extractPageContent(response));
      } catch (err) {
        if (cancelled) return;
        setCatalogResults([]);
        setCatalogError(err?.message || 'Khong the tim catalog item.');
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [catalogSearch, form.applyTo, openModal]);

  useEffect(() => {
    if (!openModal || normalizeTargetTypeValue(form.targetType) !== 'SPECIFIC') {
      setCustomerResults([]);
      setCustomerLoading(false);
      setCustomerError('');
      return undefined;
    }

    const keyword = customerSearch.trim();
    if (!keyword) {
      setCustomerResults([]);
      setCustomerLoading(false);
      setCustomerError('');
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setCustomerLoading(true);
        setCustomerError('');
        const response = await searchAdminCustomers(
          { page: 0, size: 10, search: keyword },
          getAuthToken(),
        );
        if (cancelled) return;
        setCustomerResults(extractPageContent(response));
      } catch (err) {
        if (cancelled) return;
        setCustomerResults([]);
        setCustomerError(err?.message || 'Khong the tim customer.');
      } finally {
        if (!cancelled) setCustomerLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearch, form.targetType, openModal]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promotions.filter((item) => {
      const matchesSearch = !q || `${item?.promotionId ?? ''} ${item?.code ?? ''} ${item?.name ?? ''} ${item?.type ?? ''}`
        .toLowerCase()
        .includes(q);
      const itemStatus = item?.isActive ? 'ACTIVE' : 'INACTIVE';
      const itemType = normalizeTypeValue(item?.type);
      const matchesStatus = statusFilter === 'ALL' || statusFilter === itemStatus;
      const matchesType = typeFilter === 'ALL' || typeFilter === itemType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [promotions, search, statusFilter, typeFilter]);

  const resetFilters = () => {
    setSearch('');
    setMode('ADMIN_ALL');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p) => p?.isActive).length;
    return { total, active, inactive: total - active };
  }, [promotions]);

  const resetSpecificSelections = () => {
    setCatalogSearch('');
    setCatalogResults([]);
    setCatalogError('');
    setCatalogLoading(false);
    setSelectedCatalogItems([]);
    setCustomerSearch('');
    setCustomerResults([]);
    setCustomerError('');
    setCustomerLoading(false);
    setSelectedCustomers([]);
  };

  const openCreate = () => {
    setEditing(false);
    setForm(defaultForm);
    resetSpecificSelections();
    setFormErrors({});
    setOpenModal(true);
  };

  const openDetail = async (item) => {
    setSelectedPromotion(item);
    setDetailOpen(true);
    setDetailError('');

    const token = getAuthToken();
    if (!item?.code || !token) {
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    try {
      const detailResponse = await fetchPromotionByCode(item.code, token);
      setSelectedPromotion(extractPromotionDetail(detailResponse, item));
    } catch (err) {
      setDetailError(err?.message || 'Không tải được chi tiết khuyến mãi.');
      setSelectedPromotion(item);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = async (item) => {
    setEditing(true);
    resetSpecificSelections();
    let source = item;
    const token = getAuthToken();
    if (item?.code && token) {
      try {
        const detailResponse = await fetchPromotionByCode(item.code, token);
        source = extractPromotionDetail(detailResponse, item);
      } catch {
        source = item;
      }
    }
    const promotionItems = normalizeIdArray(source?.promotionItems);
    const promotionCustomers = normalizeIdArray(source?.promotionCustomers);
    setSelectedCatalogItems(promotionItems.map((id) => ({ itemId: id, itemName: `Catalog #${id}` })));
    setSelectedCustomers(promotionCustomers.map((id) => ({ customerId: id, fullName: `Customer #${id}` })));
    setForm({
      promotionId: source?.promotionId ?? null,
      code: source?.code || '',
      name: source?.name || '',
      type: normalizeTypeValue(source?.type),
      discountPercent: source?.discountPercent ?? '',
      isActive: source?.isActive !== false,
      applyTo: normalizeApplyToValue(source?.applyTo),
      targetType: normalizeTargetTypeValue(source?.targetType),
      minOrderValue: source?.minOrderValue ?? '',
      startDate: source?.startDate || '',
      endDate: source?.endDate || '',
      usageLimit: source?.usageLimit ?? '',
      buyItemId: source?.buyItemId ?? '',
      buyQuantity: source?.buyQuantity ?? '',
      getItemId: source?.getItemId ?? '',
      getQuantity: source?.getQuantity ?? '',
      promotionItems,
      promotionCustomers,
    });
    setFormErrors({});
    setOpenModal(true);
  };

  const editSelectedPromotion = () => {
    if (!selectedPromotion) return;
    const item = selectedPromotion;
    setDetailOpen(false);
    setSelectedPromotion(null);
    setDetailError('');
    openEdit(item);
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError('');
    setSelectedPromotion(null);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(false);
    setForm(defaultForm);
    resetSpecificSelections();
    setFormErrors({});
  };

  const clearFieldErrors = useCallback((fields) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      let hasChanged = false;
      fields.forEach((field) => {
        if (field in next) {
          delete next[field];
          hasChanged = true;
        }
      });
      return hasChanged ? next : prev;
    });
  }, []);

  const selectedPromotionItemIds = useMemo(() => new Set(normalizeIdArray(form.promotionItems)), [form.promotionItems]);
  const selectedPromotionCustomerIds = useMemo(() => new Set(normalizeIdArray(form.promotionCustomers)), [form.promotionCustomers]);

  const addPromotionItem = useCallback((item) => {
    const id = getCatalogItemId(item);
    if (!id) return;
    setSelectedCatalogItems((prev) => mergeSelectedById(prev, item, getCatalogItemId));
    setForm((prev) => ({
      ...prev,
      promotionItems: normalizeIdArray([...(Array.isArray(prev.promotionItems) ? prev.promotionItems : []), id]),
    }));
    clearFieldErrors(['promotionItems']);
  }, [clearFieldErrors]);

  const removePromotionItem = useCallback((itemId) => {
    const id = toPositiveId(itemId);
    if (!id) return;
    setSelectedCatalogItems((prev) => prev.filter((item) => getCatalogItemId(item) !== id));
    setForm((prev) => ({
      ...prev,
      promotionItems: normalizeIdArray(prev.promotionItems).filter((value) => value !== id),
    }));
  }, []);

  const addPromotionCustomer = useCallback((customer) => {
    const id = getCustomerId(customer);
    if (!id) return;
    setSelectedCustomers((prev) => mergeSelectedById(prev, customer, getCustomerId));
    setForm((prev) => ({
      ...prev,
      promotionCustomers: normalizeIdArray([...(Array.isArray(prev.promotionCustomers) ? prev.promotionCustomers : []), id]),
    }));
    clearFieldErrors(['promotionCustomers']);
  }, [clearFieldErrors]);

  const removePromotionCustomer = useCallback((customerId) => {
    const id = toPositiveId(customerId);
    if (!id) return;
    setSelectedCustomers((prev) => prev.filter((customer) => getCustomerId(customer) !== id));
    setForm((prev) => ({
      ...prev,
      promotionCustomers: normalizeIdArray(prev.promotionCustomers).filter((value) => value !== id),
    }));
  }, []);

  const updateFormField = useCallback((field, value) => {
    const normalizedApplyTo = field === 'applyTo' ? normalizeApplyToValue(value) : null;
    const normalizedTargetType = field === 'targetType' ? normalizeTargetTypeValue(value) : null;
    if (field === 'applyTo' && normalizedApplyTo !== 'SPECIFIC') {
      setSelectedCatalogItems([]);
      setCatalogSearch('');
      setCatalogResults([]);
    }
    if (field === 'targetType' && normalizedTargetType !== 'SPECIFIC') {
      setSelectedCustomers([]);
      setCustomerSearch('');
      setCustomerResults([]);
    }

    setForm((prev) => {
      if (field === 'type') {
        const nextType = normalizeTypeValue(value);
        return nextType === 'PERCENT'
          ? {
              ...prev,
              type: nextType,
              buyItemId: '',
              buyQuantity: '',
              getItemId: '',
              getQuantity: '',
            }
          : {
              ...prev,
              type: nextType,
              discountPercent: '',
            };
      }

      if (field === 'code') {
        return {
          ...prev,
          code: normalizePromotionCode(value),
        };
      }

      if (field === 'applyTo') {
        return {
          ...prev,
          applyTo: normalizedApplyTo,
          promotionItems: normalizedApplyTo === 'SPECIFIC' ? prev.promotionItems : [],
        };
      }

      if (field === 'targetType') {
        return {
          ...prev,
          targetType: normalizedTargetType,
          promotionCustomers: normalizedTargetType === 'SPECIFIC' ? prev.promotionCustomers : [],
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });

    if (field === 'discountPercent') {
      const error = getDiscountPercentError(value);
      setFormErrors((prev) => {
        const next = { ...prev };
        if (error) next.discountPercent = error;
        else delete next.discountPercent;
        return next;
      });
      return;
    }

    if (field === 'type') {
      clearFieldErrors(['type', 'discountPercent', 'buyItemId', 'buyQuantity', 'getItemId', 'getQuantity']);
      return;
    }

    if (field === 'startDate' || field === 'endDate') {
      clearFieldErrors(['startDate', 'endDate']);
      return;
    }

    if (field === 'applyTo') {
      clearFieldErrors(['applyTo', 'promotionItems']);
      return;
    }

    if (field === 'targetType') {
      clearFieldErrors(['targetType', 'promotionCustomers']);
      return;
    }

    clearFieldErrors([field]);
  }, [clearFieldErrors]);

  const handleSubmit = async () => {
    const token = getAuthToken();
    if (!token) return;
    const submitType = normalizeTypeValue(form.type);
    const nextErrors = buildPromotionFormErrors(form, promotions, editing ? form.promotionId : null);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      toast.error('Vui lòng kiểm tra lại các trường dữ liệu.');
      return;
    }

    if (!form.code || !form.name || !submitType) {
      toast.error('Vui lòng nhập đầy đủ code, tên và loại khuyến mãi.');
      return;
    }

    if (isPercentType && (form.discountPercent === '' || Number(form.discountPercent) <= 0)) {
      toast.error('Vui lòng nhập phần trăm giảm hợp lệ.');
      return;
    }

    if (submitType === 'BUY_X_GET_Y') {
      const buyQty = Number(form.buyQuantity);
      const getQty = Number(form.getQuantity);
      if (!Number.isFinite(buyQty) || buyQty <= 0 || !Number.isFinite(getQty) || getQty <= 0) {
        toast.error('Vui lòng nhập số lượng mua/tặng hợp lệ cho chương trình Mua X tặng Y.');
        return;
      }
    }

    try {
      const payload = {
        ...form,
        code: normalizePromotionCode(form.code),
        name: String(form.name ?? '').trim(),
        type: submitType,
        applyTo: normalizeApplyToValue(form.applyTo),
        targetType: normalizeTargetTypeValue(form.targetType),
        discountPercent: submitType === 'PERCENT' ? form.discountPercent : '',
        buyItemId: submitType === 'BUY_X_GET_Y' ? form.buyItemId : '',
        buyQuantity: submitType === 'BUY_X_GET_Y' ? form.buyQuantity : '',
        getItemId: submitType === 'BUY_X_GET_Y' ? form.getItemId : '',
        getQuantity: submitType === 'BUY_X_GET_Y' ? form.getQuantity : '',
        promotionItems: normalizeApplyToValue(form.applyTo) === 'SPECIFIC' ? normalizeIdArray(form.promotionItems) : [],
        promotionCustomers: normalizeTargetTypeValue(form.targetType) === 'SPECIFIC' ? normalizeIdArray(form.promotionCustomers) : [],
      };
      if (editing) {
        await updatePromotion(payload, token);
        toast.success('Cập nhật khuyến mãi thành công.');
      } else {
        await createPromotion(payload, token);
        toast.success('Tạo khuyến mãi thành công.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Lưu khuyến mãi thất bại.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (value) => {
    if (value === '' || value == null) return '-';
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const formatPlainNumber = (value) => {
    if (value === '' || value == null) return '-';
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return num.toLocaleString('vi-VN');
  };

  const getFieldClassName = (field, baseClassName) => (
    formErrors[field] ? `${baseClassName} ${styles.inputError}` : baseClassName
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý khuyến mãi</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={loadData}>↻ Làm mới</button>
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>+ Tạo khuyến mãi</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <p className={styles.statLabel}>Tổng khuyến mãi</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <p className={styles.statLabel}>Đang hoạt động</p>
          <p className={styles.statValue}>{stats.active}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <p className={styles.statLabel}>Không hoạt động</p>
          <p className={styles.statValue}>{stats.inactive}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={`${styles.filterField} ${styles.filterFieldSearch}`}>
          <label className={styles.filterLabel}>Tìm kiếm</label>
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder="Tìm kiếm theo code, tên, loại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Dữ liệu</label>
          <select
            className={styles.filterSelect}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="ADMIN_ALL">Admin - Tất cả</option>
            <option value="AVAILABLE">Khách hàng - Đang khả dụng</option>
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Trạng thái</label>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Vô hiệu</option>
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Loại</label>
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tất cả loại</option>
            <option value="PERCENT">Giảm theo phần trăm</option>
            <option value="BUY_X_GET_Y">Mua X tặng Y</option>
          </select>
        </div>
        <button type="button" className={`${styles.ghostBtn} ${styles.filterResetBtn}`} onClick={resetFilters}>
          Xóa lọc
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải khuyến mãi...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠</div>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎁</div>
          <p className={styles.emptyTitle}>Không có khuyến mãi phù hợp</p>
          <p className={styles.emptyMessage}>Thử thay đổi từ khóa tìm kiếm hoặc chế độ dữ liệu.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã khuyến mãi</th>
                <th>Tên chương trình</th>
                <th>Loại</th>
                <th>Giảm (%)</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.promotionId || item.code}>
                  <td>#{item.promotionId ?? '-'}</td>
                  <td className={styles.codeCell}>{item.code || '-'}</td>
                  <td className={styles.nameCell}>{item.name || '-'}</td>
                  <td>
                    <span className={styles.typeBadge}>
                      {PROMOTION_TYPE_LABELS[normalizeTypeValue(item.type)] || item.type || '-'}
                    </span>
                  </td>
                  <td>{item.discountPercent ?? '-'}</td>
                  <td className={styles.dateCell}>
                    {item.startDate ? formatDate(item.startDate) : '-'} — {item.endDate ? formatDate(item.endDate) : '-'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${item.isActive ? styles.statusActive : styles.statusInactive}`}>
                      {item.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button type="button" className={styles.viewBtn} onClick={() => openDetail(item)}>
                        Xem
                      </button>
                      <button type="button" className={styles.editBtn} onClick={() => openEdit(item)}>
                        Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.detailModalContent}`}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Chi tiết khuyến mãi</h3>
                <p className={styles.modalSubtitle}>
                  {selectedPromotion?.code ? `Mã ${selectedPromotion.code}` : 'Thông tin chương trình khuyến mãi'}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeDetailModal}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {detailLoading ? (
                <div className={styles.detailLoading}>Đang tải chi tiết khuyến mãi...</div>
              ) : (
                <>
                  {detailError && <div className={styles.detailError}>{detailError}</div>}
                  <div className={styles.detailSummary}>
                    <div>
                      <span className={styles.detailLabel}>Mã khuyến mãi</span>
                      <strong className={styles.detailCode}>{selectedPromotion?.code || '-'}</strong>
                    </div>
                    <span className={`${styles.statusBadge} ${selectedPromotion?.isActive ? styles.statusActive : styles.statusInactive}`}>
                      {selectedPromotion?.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Tên chương trình</span>
                      <strong className={styles.detailValue}>{selectedPromotion?.name || '-'}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Loại</span>
                      <strong className={styles.detailValue}>
                        {PROMOTION_TYPE_LABELS[normalizeTypeValue(selectedPromotion?.type)] || selectedPromotion?.type || '-'}
                      </strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Giảm (%)</span>
                      <strong className={styles.detailValue}>{selectedPromotion?.discountPercent ?? '-'}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Giá trị đơn tối thiểu</span>
                      <strong className={styles.detailValue}>{formatCurrency(selectedPromotion?.minOrderValue)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Ngày bắt đầu</span>
                      <strong className={styles.detailValue}>{formatDate(selectedPromotion?.startDate)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Ngày kết thúc</span>
                      <strong className={styles.detailValue}>{formatDate(selectedPromotion?.endDate)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Giới hạn lượt dùng</span>
                      <strong className={styles.detailValue}>{formatPlainNumber(selectedPromotion?.usageLimit)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Áp dụng cho</span>
                      <strong className={styles.detailValue}>
                        {normalizeApplyToValue(selectedPromotion?.applyTo) === 'SPECIFIC' ? 'Nhóm cụ thể' : 'Toàn bộ'}
                      </strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Đối tượng khách hàng</span>
                      <strong className={styles.detailValue}>
                        {normalizeTargetTypeValue(selectedPromotion?.targetType) === 'SPECIFIC' ? 'Nhóm khách hàng cụ thể' : 'Tất cả khách hàng'}
                      </strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Số lượng mua (X)</span>
                      <strong className={styles.detailValue}>{formatPlainNumber(selectedPromotion?.buyQuantity)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Sản phẩm mua</span>
                      <strong className={styles.detailValue}>{selectedPromotion?.buyItemId || '-'}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Số lượng tặng (Y)</span>
                      <strong className={styles.detailValue}>{formatPlainNumber(selectedPromotion?.getQuantity)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Sản phẩm tặng</span>
                      <strong className={styles.detailValue}>{selectedPromotion?.getItemId || '-'}</strong>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>Catalog item áp dụng</h4>
                    <div className={styles.detailChips}>
                      {detailPromotionItems.length === 0 ? (
                        <span className={styles.selectorHint}>Không giới hạn catalog item.</span>
                      ) : detailPromotionItems.map((id) => (
                        <span key={id} className={styles.detailChip}>Catalog #{id}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>Customer áp dụng</h4>
                    <div className={styles.detailChips}>
                      {detailPromotionCustomers.length === 0 ? (
                        <span className={styles.selectorHint}>Không giới hạn customer.</span>
                      ) : detailPromotionCustomers.map((id) => (
                        <span key={id} className={styles.detailChip}>Customer #{id}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={closeDetailModal}>Đóng</button>
              <button type="button" className={styles.saveBtn} onClick={editSelectedPromotion} disabled={!selectedPromotion || detailLoading}>
                Sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {openModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  {editing ? 'Cập nhật khuyến mãi' : 'Tạo khuyến mãi mới'}
                </h3>
                <p className={styles.modalSubtitle}>
                  {editing ? `Chỉnh sửa chương trình #${form.promotionId}` : 'Tạo một chương trình khuyến mãi mới cho hệ thống'}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeModal}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mã khuyến mãi <span className={styles.required}>*</span></label>
                  <div className={styles.codeInputRow}>
                    <input
                      className={getFieldClassName('code', styles.input)}
                      placeholder="Ví dụ: SUMMER2026"
                      value={form.code}
                      onChange={(e) => updateFormField('code', e.target.value)}
                      aria-invalid={Boolean(formErrors.code)}
                    />
                    <button
                      type="button"
                      className={styles.generateBtn}
                      onClick={() => updateFormField('code', generateRandomCode())}
                      title="Tạo mã ngẫu nhiên"
                    >
                      🎲 Tạo mã
                    </button>
                  </div>
                  {formErrors.code && <span className={styles.errorText}>{formErrors.code}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên chương trình <span className={styles.required}>*</span></label>
                  <input
                    className={getFieldClassName('name', styles.input)}
                    placeholder="Ví dụ: Khuyến mãi mùa hè 2026"
                    value={form.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    aria-invalid={Boolean(formErrors.name)}
                  />
                  {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Loại <span className={styles.required}>*</span></label>
                  <select
                    className={getFieldClassName('type', styles.select)}
                    value={form.type}
                    onChange={(e) => updateFormField('type', e.target.value)}
                    aria-invalid={Boolean(formErrors.type)}
                  >
                    <option value="PERCENT">Giảm theo phần trăm</option>
                    <option value="BUY_X_GET_Y">Mua X tặng Y</option>
                  </select>
                  {formErrors.type && <span className={styles.errorText}>{formErrors.type}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giảm (%)</label>
                  <input
                    className={getFieldClassName('discountPercent', styles.input)}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ví dụ: 15"
                    value={form.discountPercent}
                    onChange={(e) => updateFormField('discountPercent', e.target.value)}
                    disabled={!isPercentType}
                    aria-invalid={Boolean(formErrors.discountPercent)}
                  />
                  {formErrors.discountPercent && <span className={styles.errorText}>{formErrors.discountPercent}</span>}
                </div>
                {isBuyXGetY && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mã sản phẩm mua (tuỳ chọn)</label>
                      <input
                        className={getFieldClassName('buyItemId', styles.input)}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 101"
                        value={form.buyItemId}
                        onChange={(e) => updateFormField('buyItemId', e.target.value)}
                        aria-invalid={Boolean(formErrors.buyItemId)}
                      />
                      {formErrors.buyItemId && <span className={styles.errorText}>{formErrors.buyItemId}</span>}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Số lượng mua (X) <span className={styles.required}>*</span></label>
                      <input
                        className={getFieldClassName('buyQuantity', styles.input)}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 2"
                        value={form.buyQuantity}
                        onChange={(e) => updateFormField('buyQuantity', e.target.value)}
                        aria-invalid={Boolean(formErrors.buyQuantity)}
                      />
                      {formErrors.buyQuantity && <span className={styles.errorText}>{formErrors.buyQuantity}</span>}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mã sản phẩm tặng (tuỳ chọn)</label>
                      <input
                        className={getFieldClassName('getItemId', styles.input)}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 102"
                        value={form.getItemId}
                        onChange={(e) => updateFormField('getItemId', e.target.value)}
                        aria-invalid={Boolean(formErrors.getItemId)}
                      />
                      {formErrors.getItemId && <span className={styles.errorText}>{formErrors.getItemId}</span>}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Số lượng tặng (Y) <span className={styles.required}>*</span></label>
                      <input
                        className={getFieldClassName('getQuantity', styles.input)}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 1"
                        value={form.getQuantity}
                        onChange={(e) => updateFormField('getQuantity', e.target.value)}
                        aria-invalid={Boolean(formErrors.getQuantity)}
                      />
                      {formErrors.getQuantity && <span className={styles.errorText}>{formErrors.getQuantity}</span>}
                    </div>
                  </>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày bắt đầu</label>
                  <input
                    className={getFieldClassName('startDate', styles.input)}
                    type="date"
                    value={form.startDate || ''}
                    onChange={(e) => updateFormField('startDate', e.target.value)}
                    aria-invalid={Boolean(formErrors.startDate)}
                  />
                  {formErrors.startDate && <span className={styles.errorText}>{formErrors.startDate}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày kết thúc</label>
                  <input
                    className={getFieldClassName('endDate', styles.input)}
                    type="date"
                    value={form.endDate || ''}
                    onChange={(e) => updateFormField('endDate', e.target.value)}
                    aria-invalid={Boolean(formErrors.endDate)}
                  />
                  {formErrors.endDate && <span className={styles.errorText}>{formErrors.endDate}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giá trị đơn tối thiểu</label>
                  <input
                    className={getFieldClassName('minOrderValue', styles.input)}
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 100000"
                    value={form.minOrderValue}
                    onChange={(e) => updateFormField('minOrderValue', e.target.value)}
                    aria-invalid={Boolean(formErrors.minOrderValue)}
                  />
                  {formErrors.minOrderValue && <span className={styles.errorText}>{formErrors.minOrderValue}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giới hạn lượt dùng</label>
                  <input
                    className={getFieldClassName('usageLimit', styles.input)}
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 100"
                    value={form.usageLimit}
                    onChange={(e) => updateFormField('usageLimit', e.target.value)}
                    aria-invalid={Boolean(formErrors.usageLimit)}
                  />
                  {formErrors.usageLimit && <span className={styles.errorText}>{formErrors.usageLimit}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Áp dụng cho</label>
                  <select
                    className={styles.select}
                    value={form.applyTo}
                    onChange={(e) => updateFormField('applyTo', e.target.value)}
                  >
                    <option value="ALL">Toàn bộ</option>
                    <option value="SPECIFIC">Nhóm cụ thể</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Đối tượng khách hàng</label>
                  <select
                    className={styles.select}
                    value={form.targetType}
                    onChange={(e) => updateFormField('targetType', e.target.value)}
                  >
                    <option value="ALL">Tất cả khách hàng</option>
                    <option value="SPECIFIC">Nhóm khách hàng cụ thể</option>
                  </select>
                </div>
                {normalizeApplyToValue(form.applyTo) === 'SPECIFIC' && (
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Catalog item áp dụng <span className={styles.required}>*</span></label>
                    <input
                      className={getFieldClassName('promotionItems', styles.input)}
                      placeholder="Tìm theo tên, SKU, mã sản phẩm..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      aria-invalid={Boolean(formErrors.promotionItems)}
                    />
                    {formErrors.promotionItems && <span className={styles.errorText}>{formErrors.promotionItems}</span>}
                    <div className={styles.selectedChips}>
                      {selectedCatalogItems.length === 0 ? (
                        <span className={styles.selectorHint}>Chưa chọn catalog item nào.</span>
                      ) : selectedCatalogItems.map((item) => {
                        const id = getCatalogItemId(item);
                        return (
                          <span key={id} className={styles.selectedChip}>
                            {getCatalogItemName(item) || `Catalog #${id}`}
                            <button type="button" onClick={() => removePromotionItem(id)} aria-label="Remove catalog item">x</button>
                          </span>
                        );
                      })}
                    </div>
                    <div className={styles.selectorResults}>
                      {catalogLoading && <div className={styles.selectorHint}>Đang tìm catalog item...</div>}
                      {!catalogLoading && catalogError && <div className={styles.selectorError}>{catalogError}</div>}
                      {!catalogLoading && !catalogError && catalogSearch.trim() && catalogResults.length === 0 && (
                        <div className={styles.selectorHint}>Không có catalog item phù hợp.</div>
                      )}
                      {!catalogLoading && !catalogError && catalogResults.map((item) => {
                        const id = getCatalogItemId(item);
                        if (!id) return null;
                        const alreadySelected = selectedPromotionItemIds.has(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={styles.selectorRow}
                            onClick={() => addPromotionItem(item)}
                            disabled={alreadySelected}
                          >
                            <span>
                              <strong>{getCatalogItemName(item) || `Catalog #${id}`}</strong>
                              <small>ID: {id}{getCatalogItemMeta(item) ? ` - ${getCatalogItemMeta(item)}` : ''}</small>
                            </span>
                            <em>{alreadySelected ? 'Đã chọn' : 'Thêm'}</em>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {normalizeTargetTypeValue(form.targetType) === 'SPECIFIC' && (
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Customer áp dụng <span className={styles.required}>*</span></label>
                    <input
                      className={getFieldClassName('promotionCustomers', styles.input)}
                      placeholder="Tìm theo tên, số điện thoại, email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      aria-invalid={Boolean(formErrors.promotionCustomers)}
                    />
                    {formErrors.promotionCustomers && <span className={styles.errorText}>{formErrors.promotionCustomers}</span>}
                    <div className={styles.selectedChips}>
                      {selectedCustomers.length === 0 ? (
                        <span className={styles.selectorHint}>Chưa chọn customer nào.</span>
                      ) : selectedCustomers.map((customer) => {
                        const id = getCustomerId(customer);
                        return (
                          <span key={id} className={styles.selectedChip}>
                            {getCustomerName(customer) || `Customer #${id}`}
                            <button type="button" onClick={() => removePromotionCustomer(id)} aria-label="Remove customer">x</button>
                          </span>
                        );
                      })}
                    </div>
                    <div className={styles.selectorResults}>
                      {customerLoading && <div className={styles.selectorHint}>Đang tìm customer...</div>}
                      {!customerLoading && customerError && <div className={styles.selectorError}>{customerError}</div>}
                      {!customerLoading && !customerError && customerSearch.trim() && customerResults.length === 0 && (
                        <div className={styles.selectorHint}>Không có customer phù hợp.</div>
                      )}
                      {!customerLoading && !customerError && customerResults.map((customer) => {
                        const id = getCustomerId(customer);
                        if (!id) return null;
                        const alreadySelected = selectedPromotionCustomerIds.has(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={styles.selectorRow}
                            onClick={() => addPromotionCustomer(customer)}
                            disabled={alreadySelected}
                          >
                            <span>
                              <strong>{getCustomerName(customer) || `Customer #${id}`}</strong>
                              <small>ID: {id}{getCustomerMeta(customer) ? ` - ${getCustomerMeta(customer)}` : ''}</small>
                            </span>
                            <em>{alreadySelected ? 'Đã chọn' : 'Thêm'}</em>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Trạng thái</label>
                  <select
                    className={styles.select}
                    value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => updateFormField('isActive', e.target.value === 'ACTIVE')}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Vô hiệu</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={handleSubmit}>
                {editing ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
