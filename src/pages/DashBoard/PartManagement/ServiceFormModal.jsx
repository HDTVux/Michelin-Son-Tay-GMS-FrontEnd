import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import {
  createServiceForCatalog,
  fetchCatalogItemDetail,
  updateServiceById,
} from '../../../services/blogService.js';
import {
  createWarehouseCatalogItem,
  createWarehouseItemCategory,
  fetchWarehouseItemCategories,
} from '../../../services/warehouseService.js';
import { fetchHomeProductDetail, fetchHomeServiceDetail } from '../../../services/homeService.js';
import { appendPersistedServiceMediaFiles, isPersistedMediaUrl } from './serviceMediaUploadUtils.js';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toNullablePositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const toNullableBoolean = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (['true', '1', 'active', 'enabled', 'published'].includes(text)) return true;
    if (['false', '0', 'inactive', 'disabled', 'unpublished'].includes(text)) return false;
  }
  return null;
};

const pickFirstPresent = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
};

const pickPriceValue = (...items) => {
  for (const item of items) {
    const value = pickFirstPresent(
      item?.price,
      item?.displayPrice,
      item?.servicePrice,
      item?.sellingPrice,
      item?.unitPrice,
      item?.listPrice,
    );
    if (value !== undefined) return value;
  }
  return '';
};

const pickPriceMode = (showPrice, fallback = true) => ((toNullableBoolean(showPrice) ?? fallback) ? 'fixed' : 'contact');

const pickEstimateTimeValue = (...items) => {
  for (const item of items) {
    const value = pickFirstPresent(
      item?.estimateTime,
      item?.estimate_time,
      item?.estimatedTime,
      item?.estimated_time,
      item?.durationMinutes,
      item?.duration_minutes,
      item?.warrantyDurationMonths,
    );
    if (value !== undefined) return value;
  }
  return '';
};

const mergeWithMeaningfulServiceData = (catalogDetail, serviceDetail) => {
  const base = { ...(catalogDetail || {}) };
  if (!serviceDetail || typeof serviceDetail !== 'object') return base;
  Object.entries(serviceDetail).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    if ((key === 'catalogItemId' || key === 'catalog_item_id') && Number(value) <= 0) return;
    base[key] = value;
  });
  return base;
};

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

const getServiceServiceId = (item) => {
  if (!item || typeof item !== 'object') return null;
  const candidates = [
    item.service_service_id, item.serviceServiceId, item.service_serviceId, item.serviceServiceID,
    item.serviceId, item.service_id,
    item?.data?.serviceId, item?.data?.service_service_id, item?.data?.serviceServiceId,
    item?.service?.service_service_id, item?.service?.serviceServiceId,
    item?.service?.service_id,
    item?.serviceInfo?.service_service_id, item?.serviceInfo?.serviceServiceId,
    item?.serviceInfo?.service_id,
  ];
  for (const value of candidates) {
    const parsed = toNullablePositiveNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
};

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

const splitDescriptionSections = (descriptionHtml) => {
  const source = String(descriptionHtml || '').trim();
  if (!source) return { introText: '', detailHtml: '' };
  const introMatch = source.match(
    /<h3[^>]*>\s*(?:Giới thiệu|Gioi thieu)\s*<\/h3>([\s\S]*?)(?=<h3[^>]*>\s*(?:Chi tiết dịch vụ|Chi tiet dich vu)\s*<\/h3>|$)/i,
  );
  const detailMatch = source.match(/<h3[^>]*>\s*(?:Chi tiết dịch vụ|Chi tiet dich vu)\s*<\/h3>([\s\S]*)$/i);
  if (!introMatch && !detailMatch) return { introText: '', detailHtml: normalizeEditorHtml(source) };
  return {
    introText: introMatch ? stripHtml(introMatch[1]) : '',
    detailHtml: detailMatch ? normalizeEditorHtml(detailMatch[1]) : '',
  };
};

const composeDescriptionHtml = (introText, detailHtml) => {
  const sections = [];
  const introTrim = String(introText || '').trim();
  if (introTrim) {
    const introParagraphs = introTrim
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');
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

const normalizeWorkCategoryList = (input) => {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((item) => {
      const workCategoryId = toNullablePositiveNumber(
        item?.workCategoryId ?? item?.itemCategoryId ?? item?.workCateId ?? item?.id,
      );
      if (workCategoryId == null) return null;
      return {
        workCategoryId,
        categoryCode: String(item?.categoryCode || '').trim(),
        categoryName: String(item?.categoryName || '').trim(),
        categoryType: String(item?.categoryType || '').trim().toUpperCase(),
        isActive: item?.isActive,
      };
    })
    .filter(Boolean);
};

const analyzeImageStats = (file) =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !file) {
      resolve(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 320;
        const ratio = img.naturalWidth > 0 ? maxWidth / img.naturalWidth : 1;
        const width = Math.max(1, Math.round(img.naturalWidth * Math.min(1, ratio)));
        const height = Math.max(1, Math.round(img.naturalHeight * Math.min(1, ratio)));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);
        let brightnessSum = 0;
        let sampleCount = 0;
        for (let i = 0; i < data.length; i += 16) {
          brightnessSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sampleCount += 1;
        }
        const avgBrightness = sampleCount > 0 ? brightnessSum / sampleCount : 128;
        const orientation = img.naturalWidth >= img.naturalHeight ? 'ngang' : 'dọc';
        const lightLevel =
          avgBrightness >= 170 ? 'sáng rõ' : avgBrightness >= 120 ? 'ánh sáng trung bình' : 'ánh sáng thấp';
        resolve({ width: img.naturalWidth, height: img.naturalHeight, orientation, lightLevel });
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc ảnh đã chọn.'));
    };
    img.src = objectUrl;
  });

const pickTemplateByContext = (itemName, sku, fileName) => {
  const contextKey = `${itemName || ''} ${sku || ''} ${fileName || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const SERVICE_TEMPLATES = [
    {
      id: 'wheel-alignment',
      keywords: ['chinh thuoc lai', 'do chum', 'thuoc lai', 'wheel alignment', 'can chinh goc dat banh'],
      intro:
        'Xe bị lệch lái, vô lăng không thẳng hoặc mòn lốp bất thường? Dịch vụ chỉnh thước lái giúp xe vận hành ổn định và an toàn hơn.',
      detailQuestion: 'Xe bị lệch lái, vô lăng không thẳng hoặc mòn lốp bất thường?',
      detailAnswer:
        'Đây là dấu hiệu phổ biến cho thấy hệ thống góc đặt bánh xe đang sai lệch. Cần cân chỉnh lại đúng thông số để xe chạy êm và bám đường tốt hơn.',
      checklist: [
        'Kiểm tra độ chụm và góc đặt bánh xe bằng thiết bị chuyên dụng.',
        'Cân chỉnh vô lăng về vị trí cân bằng khi xe đi thẳng.',
        'Đánh giá độ mòn lốp trước/sau để phát hiện lệch góc đặt.',
      ],
      process: [
        'Tiếp nhận xe và kiểm tra nhanh tình trạng vận hành.',
        'Đo thông số góc đặt bánh xe trên máy cân chỉnh.',
        'Hiệu chỉnh theo thông số chuẩn của nhà sản xuất.',
        'Chạy thử và xác nhận xe đi thẳng, vô lăng cân.',
      ],
    },
    {
      id: 'general-maintenance',
      keywords: ['bao duong', 'maintenance', 'kiem tra tong quat', 'service'],
      intro:
        'Bảo dưỡng định kỳ giúp xe vận hành ổn định, tăng tuổi thọ linh kiện và hạn chế sự cố phát sinh trong quá trình sử dụng.',
      detailQuestion: 'Vì sao nên thực hiện bảo dưỡng định kỳ?',
      detailAnswer:
        'Bảo dưỡng đúng lịch giúp phát hiện sớm hao mòn, giảm rủi ro hỏng hóc lớn và đảm bảo xe luôn trong trạng thái vận hành an toàn.',
      checklist: [
        'Kiểm tra nhanh các hạng mục an toàn cơ bản của xe.',
        'Đánh giá các bộ phận có dấu hiệu hao mòn theo thời gian sử dụng.',
        'Tư vấn phương án xử lý tối ưu theo tình trạng thực tế.',
      ],
      process: [
        'Tiếp nhận thông tin tình trạng xe từ khách hàng.',
        'Kiểm tra tổng quát theo quy trình kỹ thuật của xưởng.',
        'Thực hiện hạng mục cần thiết và ghi nhận kết quả.',
        'Bàn giao xe kèm khuyến nghị theo dõi định kỳ tiếp theo.',
      ],
    },
    {
      id: 'default',
      keywords: [],
      intro: 'Dịch vụ giúp xe vận hành ổn định hơn, hạn chế hao mòn và nâng cao độ an toàn khi sử dụng hàng ngày.',
      detailQuestion: 'Khi nào nên kiểm tra hạng mục này?',
      detailAnswer:
        'Khi xe có dấu hiệu vận hành bất thường hoặc đã đến mốc bảo dưỡng, bạn nên kiểm tra sớm để tránh phát sinh lỗi lớn.',
      checklist: [
        'Kiểm tra tình trạng thực tế của hệ thống liên quan.',
        'Đánh giá mức độ hao mòn và nguy cơ ảnh hưởng vận hành.',
        'Đề xuất phương án xử lý phù hợp và minh bạch chi phí.',
      ],
      process: [
        'Tiếp nhận và kiểm tra ban đầu.',
        'Đo/đánh giá thông số kỹ thuật cần thiết.',
        'Thực hiện xử lý theo đúng quy trình.',
        'Kiểm tra lại và bàn giao xe.',
      ],
    },
  ];
  const matched = SERVICE_TEMPLATES.find((template) =>
    template.keywords.length > 0 && template.keywords.some((kw) => contextKey.includes(kw)),
  );
  return matched || SERVICE_TEMPLATES[SERVICE_TEMPLATES.length - 1];
};

const buildAutoContentFromImage = ({ template, imageStats, itemName }) => {
  const safeName = String(itemName || '').trim() || 'dịch vụ này';
  const imageHint = imageStats
    ? `Dựa trên ảnh đại diện (${imageStats.width}x${imageStats.height}, khung ${imageStats.orientation}, ${imageStats.lightLevel}), kỹ thuật viên đang thao tác trực tiếp theo quy trình tại xưởng.`
    : 'Dựa trên ảnh đại diện đã chọn, kỹ thuật viên đang thao tác trực tiếp theo quy trình tại xưởng.';
  const introText = `${template.intro}\n${imageHint}`;
  const checklistHtml = template.checklist.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  const processHtml = template.process.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  const detailHtml = [
    `<p><strong>${escapeHtml(template.detailQuestion)}</strong> ${escapeHtml(template.detailAnswer)}</p>`,
    `<p>${escapeHtml(`Đối với ${safeName}, xưởng sẽ kiểm tra và xử lý theo đúng tiêu chuẩn kỹ thuật.`)}</p>`,
    `<ul>${checklistHtml}</ul>`,
    `<ol>${processHtml}</ol>`,
    `<p><em>${escapeHtml(imageHint)}</em></p>`,
  ].join('');
  return { introText, detailHtml };
};

const normalizeExistingMedia = (input) => {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((entry, idx) => {
      const mediaUrl = String(entry?.mediaUrl || entry?.url || '').trim();
      if (!mediaUrl) return null;
      const mediaType = String(entry?.mediaType || entry?.type || '').trim().toUpperCase();
      const isVideo = mediaType === 'VIDEO' || /\.(mp4|webm|ogg)$/i.test(mediaUrl);
      return {
        key: String(entry?.serviceMediaId ?? entry?.id ?? idx),
        mediaUrl,
        isVideo,
        mediaDescription: String(entry?.mediaDescription || entry?.description || '').trim(),
      };
    })
    .filter(Boolean);
};

function ServiceFormModal({ item, mode = 'create', onClose, onSaved, pageMode = false }) {
  const notify = useCallback((msg, type = 'error') => {
    toast[type](msg, { containerId: 'app-toast' });
  }, []);

  const baseItem = useMemo(() => item || {}, [item]);
  const isEdit = mode === 'edit' && Boolean(baseItem?.itemId);
  const isCreateFromCatalog = mode === 'createFromCatalog' && Boolean(baseItem?.itemId);
  const isCreateNew = !isEdit && !isCreateFromCatalog;
  const initialDescription = useMemo(
    () => splitDescriptionSections(baseItem.description || ''),
    [baseItem.description],
  );

  const [itemName, setItemName] = useState(baseItem.itemName || '');
  const [sku, setSku] = useState(baseItem.sku || '');
  const [priceMode, setPriceMode] = useState(pickPriceMode(baseItem.showPrice, true));
  const [price, setPrice] = useState(baseItem.price != null ? String(baseItem.price) : '');
  const [introText, setIntroText] = useState(initialDescription.introText);
  const [detailHtml, setDetailHtml] = useState(initialDescription.detailHtml);
  const [unit, setUnit] = useState(baseItem.unit || '');
  const [estimateTime, setEstimateTime] = useState(() => {
    const value = pickEstimateTimeValue(baseItem);
    return value !== '' ? String(value) : '';
  });
  const [isActive, setIsActive] = useState(isEdit ? baseItem.isActive !== false : true);
  const [brandId, setBrandId] = useState(baseItem.brandId != null ? String(baseItem.brandId) : '');
  const [productLineId, setProductLineId] = useState(
    baseItem.productLineId != null ? String(baseItem.productLineId) : '',
  );
  const [itemCategoryId, setItemCategoryId] = useState(
    baseItem.workCategoryId != null
      ? String(baseItem.workCategoryId)
      : baseItem.itemCategoryId != null
        ? String(baseItem.itemCategoryId)
        : '',
  );
  const [categoryInputMode, setCategoryInputMode] = useState('select');
  const [workCategories, setWorkCategories] = useState([]);
  const [isLoadingWorkCategories, setIsLoadingWorkCategories] = useState(false);
  const [isCreatingWorkCategory, setIsCreatingWorkCategory] = useState(false);
  const [newWorkCategoryCode, setNewWorkCategoryCode] = useState('');
  const [newWorkCategoryName, setNewWorkCategoryName] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(
    baseItem.thumbnailUrl || baseItem.imageUrl || baseItem.mediaThumbnail || '',
  );
  const [existingMedia, setExistingMedia] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenHint, setAutoGenHint] = useState('');
  const [errors, setErrors] = useState({});
  const [resolvedServiceId, setResolvedServiceId] = useState(() => getServiceServiceId(baseItem));
  const [isDraftReady, setIsDraftReady] = useState(false);

  const editorRef = useRef(null);
  const thumbnailPreviewRef = useRef('');
  const mediaFilesRef = useRef([]);

  const modalTitle = 'Tạo bài viết';
  const draftStorageKey = useMemo(() => {
    const itemId = baseItem?.itemId != null ? String(baseItem.itemId) : 'new';
    return `gms_service_form_draft_v1:${mode}:${itemId}`;
  }, [baseItem?.itemId, mode]);

  const readDraft = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }, [draftStorageKey]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore.
    }
  }, [draftStorageKey]);

  // Sync rich editor when detailHtml changes
  useEffect(() => {
    if (!editorRef.current) return;
    const normalized = normalizeEditorHtml(detailHtml);
    if (editorRef.current.innerHTML !== normalized) editorRef.current.innerHTML = normalized;
  }, [detailHtml]);

  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  useEffect(() => () => {
    if (thumbnailPreviewRef.current) URL.revokeObjectURL(thumbnailPreviewRef.current);
    mediaFilesRef.current.forEach((entry) => {
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });
  }, []);

  const loadDetail = useCallback(async () => {
    if (!baseItem?.itemId) return;
    setIsDraftReady(false);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const res = await fetchCatalogItemDetail(baseItem.itemId, token);
      const catalogDetail = extractPayload(res) || {};

      const serviceId = getServiceServiceId(baseItem) || getServiceServiceId(catalogDetail);
      let serviceDetail = null;

      if (serviceId) {
        try {
          const serviceRes = await fetchHomeServiceDetail(serviceId);
          serviceDetail = extractPayload(serviceRes);
        } catch {
          serviceDetail = null;
        }
      }

      if (!serviceDetail) {
        try {
          const homeProductRes = await fetchHomeProductDetail(baseItem.itemId);
          serviceDetail = extractPayload(homeProductRes);
        } catch {
          serviceDetail = null;
        }
      }

      const detail = mergeWithMeaningfulServiceData(catalogDetail, serviceDetail);
      const nextResolvedServiceId =
        serviceId
        || getServiceServiceId(serviceDetail)
        || getServiceServiceId(detail);
      setResolvedServiceId(nextResolvedServiceId ?? null);

      const mergedDescription =
        detail.fullDescription
        || detail.descriptionHtml
        || detail.description
        || '';
      const splitSections = splitDescriptionSections(mergedDescription);

      setItemName(detail.title || detail.itemName || '');
      setSku(detail.sku || '');
      const resolvedShowPrice = pickFirstPresent(baseItem.showPrice, catalogDetail.showPrice, true);
      const resolvedPrice = pickPriceValue(baseItem, catalogDetail);
      setPriceMode(pickPriceMode(resolvedShowPrice, true));
      setPrice(resolvedPrice !== '' ? String(resolvedPrice) : '');
      setIntroText(splitSections.introText || String(detail.shortDescription || '').trim());
      setDetailHtml(splitSections.detailHtml || normalizeEditorHtml(detail.fullDescription || detail.descriptionHtml || ''));
      setUnit(detail.unit || '');
      const resolvedEstimateTime = pickEstimateTimeValue(detail, serviceDetail, catalogDetail, baseItem);
      setEstimateTime(resolvedEstimateTime !== '' ? String(resolvedEstimateTime) : '');
      const parsedIsActive = toNullableBoolean(detail.isActive ?? detail.status);
      setIsActive(isEdit ? (parsedIsActive ?? true) : true);
      setBrandId(detail.brandId != null ? String(detail.brandId) : '');
      setProductLineId(detail.productLineId != null ? String(detail.productLineId) : '');
      setItemCategoryId(
        detail.workCategoryId != null
          ? String(detail.workCategoryId)
          : detail.itemCategoryId != null
            ? String(detail.itemCategoryId)
            : '',
      );
      if (detail.thumbnailUrl || detail.imageUrl || detail.mediaThumbnail) {
        setThumbnailPreview(detail.thumbnailUrl || detail.imageUrl || detail.mediaThumbnail);
      }
      setExistingMedia(normalizeExistingMedia(detail?.media ?? detail?.mediaList ?? baseItem.media));

      const draft = readDraft();
      if (draft) {
        if (typeof draft.itemName === 'string' && draft.itemName.trim()) setItemName(draft.itemName);
        if (typeof draft.sku === 'string' && draft.sku.trim()) setSku(draft.sku);
        if (typeof draft.introText === 'string' && draft.introText.trim()) setIntroText(draft.introText);
        if (typeof draft.detailHtml === 'string' && stripHtml(draft.detailHtml)) setDetailHtml(draft.detailHtml);
        if (typeof draft.unit === 'string' && draft.unit.trim()) setUnit(draft.unit);
        if (typeof draft.estimateTime === 'string' && draft.estimateTime.trim()) setEstimateTime(draft.estimateTime);
        else if (typeof draft.warrantyMonths === 'string' && draft.warrantyMonths.trim()) setEstimateTime(draft.warrantyMonths);
        if (typeof draft.isActive === 'boolean') setIsActive(draft.isActive);
        if (typeof draft.brandId === 'string') setBrandId(draft.brandId);
        if (typeof draft.productLineId === 'string') setProductLineId(draft.productLineId);
        if (typeof draft.itemCategoryId === 'string') setItemCategoryId(draft.itemCategoryId);
      }
    } catch {
      // Keep local values.
      setResolvedServiceId(getServiceServiceId(baseItem));
      setExistingMedia([]);
    } finally {
      setIsDraftReady(true);
    }
  }, [baseItem, isEdit, readDraft]);

  const loadWorkCategoryOptions = useCallback(async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) return;
    try {
      setIsLoadingWorkCategories(true);
      const res = await fetchWarehouseItemCategories(token);
      const payload = extractPayload(res);
      const normalized = normalizeWorkCategoryList(payload)
        .filter((entry) => entry.categoryType === 'SERVICE')
        .sort((a, b) => a.workCategoryId - b.workCategoryId);
      setWorkCategories(normalized);
    } catch {
      // keep existing state
    } finally {
      setIsLoadingWorkCategories(false);
    }
  }, []);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!isCreateNew) return;
    const draft = readDraft();
    if (draft) {
      if (typeof draft.itemName === 'string') setItemName(draft.itemName);
      if (typeof draft.sku === 'string') setSku(draft.sku);
      if (draft.priceMode === 'fixed' || draft.priceMode === 'contact') setPriceMode(draft.priceMode);
      if (typeof draft.price === 'string') setPrice(draft.price);
      if (typeof draft.introText === 'string') setIntroText(draft.introText);
      if (typeof draft.detailHtml === 'string') setDetailHtml(draft.detailHtml);
      if (typeof draft.unit === 'string') setUnit(draft.unit);
      if (typeof draft.estimateTime === 'string') setEstimateTime(draft.estimateTime);
      else if (typeof draft.warrantyMonths === 'string') setEstimateTime(draft.warrantyMonths);
      if (typeof draft.isActive === 'boolean') setIsActive(draft.isActive);
      if (typeof draft.brandId === 'string') setBrandId(draft.brandId);
      if (typeof draft.productLineId === 'string') setProductLineId(draft.productLineId);
      if (typeof draft.itemCategoryId === 'string') setItemCategoryId(draft.itemCategoryId);
    }
    setResolvedServiceId(getServiceServiceId(baseItem));
    setIsDraftReady(true);
  }, [baseItem, isCreateNew, readDraft]);

  useEffect(() => {
    if (isCreateNew) return;
    setResolvedServiceId(getServiceServiceId(baseItem));
  }, [baseItem, isCreateNew]);

  useEffect(() => {
    if (!isCreateNew) return;
    loadWorkCategoryOptions();
  }, [isCreateNew, loadWorkCategoryOptions]);

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
    if (attrs && typeof attrs === 'object') {
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    }
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

  const handleToolbarClick = useCallback(
    (action) => {
      if (action === 'bold') return applyExecCommand('bold');
      if (action === 'italic') return applyExecCommand('italic');
      if (action === 'uppercase') return applyInlineTag('span', { style: 'text-transform: uppercase;' });
      if (action === 'ol') return applyExecCommand('insertOrderedList');
      if (action === 'ul') return applyExecCommand('insertUnorderedList');
      return undefined;
    },
    [applyExecCommand, applyInlineTag],
  );

  const autoGenerateContentFromImage = useCallback(
    async (file, { force = false } = {}) => {
      if (!file) {
        notify('Vui lòng chọn ảnh đại diện để tự động tạo nội dung từ ảnh.', 'info');
        return;
      }
      try {
        setIsAutoGenerating(true);
        const stats = await analyzeImageStats(file);
        const template = pickTemplateByContext(itemName, sku, file.name);
        const generated = buildAutoContentFromImage({ template, imageStats: stats, itemName });
        const hasIntro = Boolean(String(introText || '').trim());
        const hasDetail = Boolean(stripHtml(detailHtml));
        if (force || !hasIntro) setIntroText(generated.introText);
        if (force || !hasDetail) setDetailHtml(generated.detailHtml);
        if (!force && hasIntro && hasDetail) {
          setAutoGenHint('Đã có nội dung sẵn. Nhấn "Tạo lại từ ảnh" nếu bạn muốn ghi đè.');
          notify('Đã phân tích ảnh. Nội dung hiện tại được giữ nguyên.', 'info');
          return;
        }
        setAutoGenHint(
          `Đã tạo nội dung theo ảnh (${stats?.width || '-'}x${stats?.height || '-'}, khung ${stats?.orientation || '-'}).`,
        );
        notify(force ? 'Đã tạo lại nội dung từ ảnh.' : 'Đã tự động tạo nội dung từ ảnh.', 'success');
      } catch (err) {
        notify(err?.message || 'Không thể tự động tạo nội dung từ ảnh.', 'error');
      } finally {
        setIsAutoGenerating(false);
      }
    },
    [detailHtml, introText, itemName, notify, sku],
  );

  const handleThumbnailChange = useCallback(
    (e) => {
      const file = e?.target?.files?.[0] ?? null;
      if (thumbnailPreviewRef.current) {
        URL.revokeObjectURL(thumbnailPreviewRef.current);
        thumbnailPreviewRef.current = '';
      }
      if (!file) {
        setThumbnailFile(null);
        setThumbnailPreview(baseItem.thumbnailUrl || baseItem.imageUrl || baseItem.mediaThumbnail || '');
      return;
      }
      const objectUrl = URL.createObjectURL(file);
      thumbnailPreviewRef.current = objectUrl;
      setThumbnailFile(file);
      setThumbnailPreview(objectUrl);
      setAutoGenHint('');
    },
    [baseItem.imageUrl, baseItem.mediaThumbnail, baseItem.thumbnailUrl],
  );

  const handleMediaChange = useCallback((e) => {
    const files = Array.from(e?.target?.files ?? []);
    const next = files.map((mediaFile) => ({ file: mediaFile, previewUrl: URL.createObjectURL(mediaFile) }));
    setMediaFiles((prev) => [...prev, ...next]);
    e.target.value = '';
  }, []);

  const removeMedia = useCallback((index) => {
    setMediaFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isDraftReady) return;
    const snapshot = {
      itemName,
      sku,
      priceMode,
      price,
      introText,
      detailHtml,
      unit,
      estimateTime,
      isActive,
      brandId,
      productLineId,
      itemCategoryId,
    };
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore quota/private mode.
    }
  }, [
    brandId,
    detailHtml,
    draftStorageKey,
    introText,
    isDraftReady,
    isActive,
    itemCategoryId,
    itemName,
    price,
    priceMode,
    productLineId,
    sku,
    unit,
    estimateTime,
  ]);

  const handleClearDraft = useCallback(() => {
    clearDraft();
    if (thumbnailPreviewRef.current) {
      URL.revokeObjectURL(thumbnailPreviewRef.current);
      thumbnailPreviewRef.current = '';
    }
    mediaFilesRef.current.forEach((entry) => {
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });
    mediaFilesRef.current = [];
    setMediaFiles([]);
    setThumbnailFile(null);
    setAutoGenHint('');
    setErrors({});
    if (baseItem?.itemId) {
      void loadDetail();
      return;
    }
    setItemName(baseItem.itemName || '');
    setSku(baseItem.sku || '');
    setPriceMode(pickPriceMode(baseItem.showPrice, true));
    setPrice(baseItem.price != null ? String(baseItem.price) : '');
    setIntroText(initialDescription.introText);
    setDetailHtml(initialDescription.detailHtml);
    setUnit(baseItem.unit || '');
    const baseEstimateTime = pickEstimateTimeValue(baseItem);
    setEstimateTime(baseEstimateTime !== '' ? String(baseEstimateTime) : '');
    setIsActive(isEdit ? baseItem.isActive !== false : true);
    setBrandId(baseItem.brandId != null ? String(baseItem.brandId) : '');
    setProductLineId(baseItem.productLineId != null ? String(baseItem.productLineId) : '');
    setItemCategoryId(
      baseItem.workCategoryId != null
        ? String(baseItem.workCategoryId)
        : baseItem.itemCategoryId != null
          ? String(baseItem.itemCategoryId)
          : '',
    );
    setThumbnailPreview(baseItem.thumbnailUrl || baseItem.imageUrl || baseItem.mediaThumbnail || '');
  }, [baseItem, clearDraft, initialDescription.detailHtml, initialDescription.introText, isEdit, loadDetail]);

  const buildDescriptionHtml = useCallback(
    () => composeDescriptionHtml(introText, detailHtml),
    [detailHtml, introText],
  );

  const buildServiceFormData = useCallback(async () => {
    const formData = new FormData();
    const showPrice = priceMode === 'fixed';
    const priceNum = Number(String(price || '').trim());
    const resolvedPrice =
      showPrice && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : 0;
    const estimateTimeSource = String(estimateTime || '').trim() || String(pickEstimateTimeValue(baseItem) || '').trim();
    const estimateTimeNum = Number(estimateTimeSource);
    const serviceStatus = isActive ? 'ACTIVE' : 'INACTIVE';
    const fullDescription = buildDescriptionHtml();
    const shortDescription = String(introText || '').trim();
    const title = String(itemName || '').trim();
    const skuText = String(sku || '').trim();
    const unitText = String(unit || '').trim();
    const catalogItemId = toNullablePositiveNumber(baseItem.itemId);

    formData.append('title', title);
    formData.append('itemName', title);
    formData.append('sku', skuText);
    formData.append('itemCode', skuText);
    formData.append('serviceCode', skuText);
    formData.append('unit', unitText);
    formData.append('price', String(resolvedPrice));
    formData.append('shortDescription', shortDescription);
    formData.append('fullDescription', fullDescription);
    formData.append('showPrice', showPrice ? 'true' : 'false');
    formData.append('displayPrice', String(resolvedPrice));
    formData.append('status', serviceStatus);
    if (catalogItemId != null) formData.append('catalogItemId', String(catalogItemId));
    if (Number.isFinite(estimateTimeNum) && estimateTimeNum >= 0) {
      formData.append('estimateTime', String(Math.trunc(estimateTimeNum)));
    }
    if (thumbnailFile) {
      formData.append('thumbnailFile', thumbnailFile);
    } else if (isPersistedMediaUrl(thumbnailPreview)) {
      formData.append('thumbnailUrl', thumbnailPreview);
      formData.append('imageUrl', thumbnailPreview);
      formData.append('mediaThumbnail', thumbnailPreview);
    }
    await appendPersistedServiceMediaFiles({
      formData,
      thumbnailFile,
      thumbnailPreview,
      existingMedia,
    });
    mediaFiles.forEach((entry) => {
      if (entry?.file) formData.append('mediaFiles', entry.file);
    });
    const existingMediaUrls = existingMedia
      .map((entry) => entry?.mediaUrl)
      .filter(isPersistedMediaUrl);
    if (existingMediaUrls.length > 0) {
      formData.append('existingMediaUrls', JSON.stringify(existingMediaUrls));
    }
    return formData;
  }, [
    buildDescriptionHtml,
    existingMedia,
    introText,
    isActive,
    itemName,
    baseItem,
    mediaFiles,
    price,
    priceMode,
    sku,
    thumbnailFile,
    thumbnailPreview,
    estimateTime,
    unit,
  ]);

  const buildCatalogPayload = useCallback((catalogItemId = null, serviceServiceId = null) => {
    const priceNum = Number(String(price || '').trim());
    const showPrice = priceMode === 'fixed';
    const resolvedPrice = Number.isFinite(priceNum) ? priceNum : 0;
    const description = stripHtml(buildDescriptionHtml());
    const parsedItemCategoryId = toNullablePositiveNumber(itemCategoryId);
    const categoryIdForPayload = parsedItemCategoryId ?? (isCreateNew ? 0 : undefined);
    const safeCatalogItemId = toNullablePositiveNumber(catalogItemId);
    const safeServiceServiceId = toNullablePositiveNumber(serviceServiceId) ?? getServiceServiceId(baseItem);
    return {
      itemId: safeCatalogItemId ?? undefined,
      catalogItemId: safeCatalogItemId ?? undefined,
      itemName: String(itemName || '').trim() || undefined,
      itemType: 'SERVICE',
      sku: String(sku || '').trim(),
      price: resolvedPrice,
      showPrice,
      unit: String(unit || '').trim(),
      description: description || undefined,
      warrantyDurationMonths: toNullablePositiveNumber(estimateTime) ?? undefined,
      serviceServiceId: safeServiceServiceId ?? 0,
      comboDurationMonths: 0,
      comboDescription: '',
      isRecurring: false,
      isActive,
      is_active: 1,
      brandId: toNullablePositiveNumber(brandId) ?? undefined,
      productLineId: toNullablePositiveNumber(productLineId) ?? undefined,
      itemCategoryId: categoryIdForPayload,
      workCategoryId: categoryIdForPayload,
    };
  }, [baseItem, brandId, buildDescriptionHtml, estimateTime, isActive, isCreateNew, itemCategoryId, itemName, price, priceMode, productLineId, sku, unit]);

  const buildSavedCatalogSnapshot = useCallback((serviceServiceId = null) => {
    const priceNum = Number(String(price || '').trim());
    const showPrice = priceMode === 'fixed';
    return {
      itemName: String(itemName || '').trim(),
      sku: String(sku || '').trim(),
      price: Number.isFinite(priceNum) ? priceNum : 0,
      showPrice,
      unit: String(unit || '').trim(),
      warrantyDurationMonths: toNullablePositiveNumber(estimateTime) ?? undefined,
      isActive,
      serviceServiceId: toNullablePositiveNumber(serviceServiceId) ?? undefined,
      service_service_id: toNullablePositiveNumber(serviceServiceId) ?? undefined,
    };
  }, [estimateTime, isActive, itemName, price, priceMode, sku, unit]);

  const validateBeforeSubmit = useCallback(() => {
    const nextErrors = {};
    if (!String(itemName || '').trim()) nextErrors.itemName = 'Vui lòng nhập tiêu đề dịch vụ.';
    if (!String(sku || '').trim()) nextErrors.sku = 'Vui lòng nhập mã dịch vụ.';
    if (!String(unit || '').trim()) nextErrors.unit = 'Vui lòng nhập đơn vị.';
    if (priceMode === 'fixed') {
      const priceNum = Number(String(price || '').trim());
      if (!Number.isFinite(priceNum) || priceNum < 0) nextErrors.price = 'Vui lòng nhập giá hợp lệ.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [itemName, price, priceMode, sku, unit]);

  const handleCreateWorkCategory = useCallback(async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) { notify('Vui lòng đăng nhập.', 'error'); return; }
    const categoryCode = String(newWorkCategoryCode || '').trim();
    const categoryName = String(newWorkCategoryName || '').trim();
    if (!categoryCode) { notify('Vui lòng nhập mã category.', 'error'); return; }
    if (!categoryName) { notify('Vui lòng nhập tên category.', 'error'); return; }
    try {
      setIsCreatingWorkCategory(true);
      const res = await createWarehouseItemCategory(
        {
          itemCategoryId: null,
          workCategoryId: null,
          categoryCode,
          categoryName,
          categoryType: 'SERVICE',
          isActive: '1',
        },
        token,
      );
      const created = extractPayload(res);
      const createdId = toNullablePositiveNumber(
        created?.workCategoryId ?? created?.itemCategoryId ?? created?.id,
      );
      if (createdId == null) throw new Error('Không nhận được ID.');
      const nextEntry = {
        workCategoryId: createdId,
        categoryCode: String(created?.categoryCode ?? categoryCode).trim(),
        categoryName: String(created?.categoryName ?? categoryName).trim(),
        categoryType: 'SERVICE',
        isActive: created?.isActive,
      };
      setWorkCategories((prev) => {
        const withoutDup = prev.filter((entry) => entry.workCategoryId !== createdId);
        return [...withoutDup, nextEntry].sort((a, b) => a.workCategoryId - b.workCategoryId);
      });
      setItemCategoryId(String(createdId));
      setCategoryInputMode('select');
      setNewWorkCategoryCode('');
      setNewWorkCategoryName('');
      notify(`Đã tạo category #${createdId}.`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể tạo category.', 'error');
    } finally {
      setIsCreatingWorkCategory(false);
    }
  }, [newWorkCategoryCode, newWorkCategoryName, notify]);

  const handleRandomServiceCode = useCallback(() => {
    setSku(generateServiceCode(itemName));
    setErrors((prev) => ({ ...prev, sku: undefined }));
  }, [itemName]);

  const handleSubmit = useCallback(async () => {
    if (!validateBeforeSubmit()) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) { notify('Vui lòng đăng nhập.', 'error'); return; }
    try {
      setIsSubmitting(true);
      const submittedItemName = String(itemName || baseItem.itemName || '').trim();
      const successName = submittedItemName ? ` "${submittedItemName}"` : '';
      if (isEdit) {
        const catalogItemId = toNullablePositiveNumber(baseItem.itemId);
        const serviceId = resolvedServiceId ?? getServiceServiceId(baseItem);
        if (!serviceId) {
          notify('Không tìm thấy serviceId để cập nhật. Vui lòng tạo bài viết trước.', 'error');
          return;
        }
        const updateRes = await updateServiceById(serviceId, await buildServiceFormData(), token);
        const updatedService = extractPayload(updateRes) || {};
        const updatedMediaThumbnail = updatedService.mediaThumbnail || thumbnailPreview;
        const updatedMedia = normalizeExistingMedia(updatedService.media ?? updatedService.mediaList ?? existingMedia);
        setThumbnailPreview(updatedMediaThumbnail);
        setExistingMedia(updatedMedia);
        notify(`Cap nhat bai viet dich vu${successName} thanh cong!`, 'success');
        clearDraft();
        setResolvedServiceId(serviceId);
        onSaved({
          catalogItemId: catalogItemId ?? baseItem.itemId,
          serviceServiceId: serviceId,
          mediaThumbnail: updatedMediaThumbnail,
          thumbnailUrl: updatedMediaThumbnail,
          imageUrl: updatedMediaThumbnail,
          media: updatedMedia,
          ...buildSavedCatalogSnapshot(serviceId),
        });
        return;
      }

      let catalogItemId = toNullablePositiveNumber(baseItem.itemId);
      let serviceServiceId = resolvedServiceId ?? getServiceServiceId(baseItem);
      if (isCreateNew) {
        const createCatalogRes = await createWarehouseCatalogItem(buildCatalogPayload(), token);
        const createdCatalog = extractPayload(createCatalogRes);
        catalogItemId = toNullablePositiveNumber(
          createdCatalog?.itemId ?? createdCatalog?.catalogItemId ?? createdCatalog?.id,
        );
        serviceServiceId = getServiceServiceId(createdCatalog) || serviceServiceId;
        if (!catalogItemId) throw new Error('Không nhận được catalogItemId sau khi tạo catalog.');
      }

      const createRes = await createServiceForCatalog(catalogItemId, await buildServiceFormData(), token);
      const createdService = extractPayload(createRes) || {};
      serviceServiceId = getServiceServiceId(createdService) || serviceServiceId;
      const createdMediaThumbnail = createdService.mediaThumbnail || thumbnailPreview;
      const createdMedia = normalizeExistingMedia(createdService.media ?? createdService.mediaList ?? existingMedia);
      if (isCreateFromCatalog && !serviceServiceId) {
        throw new Error('Đã tạo dịch vụ nhưng chưa nhận được serviceId.');
      }
      notify(`Tao bai viet dich vu${successName} thanh cong!`, 'success');
      clearDraft();
      setResolvedServiceId(serviceServiceId ?? null);
      onSaved({
        catalogItemId,
        serviceServiceId,
        mediaThumbnail: createdMediaThumbnail,
        thumbnailUrl: createdMediaThumbnail,
        imageUrl: createdMediaThumbnail,
        media: createdMedia,
        ...buildSavedCatalogSnapshot(serviceServiceId),
      });
    } catch (err) {
      notify(err?.message || 'Thao tác thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    baseItem,
    buildCatalogPayload,
    buildSavedCatalogSnapshot,
    buildServiceFormData,
    existingMedia,
    isCreateFromCatalog,
    isCreateNew,
    isEdit,
    itemName,
    notify,
    onSaved,
    resolvedServiceId,
    thumbnailPreview,
    validateBeforeSubmit,
    clearDraft,
  ]);
  return (
    <div
      className={pageMode ? styles['form-page-shell'] : styles['modal-overlay']}
      onClick={(e) => {
        if (!pageMode && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={pageMode ? `${styles['modal-box']} ${styles['form-page-box']}` : styles['modal-box']}>
        <div className={styles['modal-header']}>
          <h3>{modalTitle}</h3>
          <button type="button" className={pageMode ? styles['header-back-btn'] : styles['modal-close']} onClick={onClose} aria-label={pageMode ? 'Quay lại' : 'Đóng'}>
            {pageMode ? 'Quay lại' : 'x'}
          </button>
        </div>
        <div className={styles['modal-body']}>
          {/* ── Thông tin dịch vụ ── */}
          <div className={styles['section-label']}>Thông tin dịch vụ</div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-name">Tiêu đề <span className={styles['required']}>*</span></label>
            <input
              id="svc-item-name"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="VD: Chỉnh thước lái (độ chụm)"
              disabled={isSubmitting}
            />
            {errors.itemName && <span className={styles['field-error']}>{errors.itemName}</span>}
          </div>

          <div className={styles['field-row']}>
            <div className={styles['field']}>
              <label htmlFor="svc-item-sku">Mã dịch vụ <span className={styles['required']}>*</span></label>
              <div className={styles['field']} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <input
                  id="svc-item-sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="VD: DV-CHINH-THUOC-LAI-928"
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className={styles['auto-gen-button']}
                  onClick={handleRandomServiceCode}
                  disabled={isSubmitting}
                >
                  Random mã
                </button>
              </div>
              {errors.sku && <span className={styles['field-error']}>{errors.sku}</span>}
            </div>
          </div>

          <div className={styles['field-row']}>
            <div className={styles['field']}>
              <label>Loại giá</label>
              <div className={styles['price-mode-row']}>
                <label className={styles['price-choice']}>
                  <input
                    type="radio"
                    name="svc-price-mode"
                    value="contact"
                    checked={priceMode === 'contact'}
                    onChange={() => setPriceMode('contact')}
                    disabled={isSubmitting}
                  />
                  Liên hệ
                </label>
                <label className={styles['price-choice']}>
                  <input
                    type="radio"
                    name="svc-price-mode"
                    value="fixed"
                    checked={priceMode === 'fixed'}
                    onChange={() => setPriceMode('fixed')}
                    disabled={isSubmitting}
                  />
                  Nhập giá
                </label>
              </div>
            </div>
            <div className={styles['field']}>
              <label htmlFor="svc-item-price">Giá dịch vụ</label>
              {priceMode === 'fixed' ? (
                <>
                  <input
                    id="svc-item-price"
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="VD: 450000"
                    disabled={isSubmitting}
                  />
                  {errors.price && <span className={styles['field-error']}>{errors.price}</span>}
                </>
              ) : (
                <div className={styles['readonly-value']}>Liên hệ</div>
              )}
            </div>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-unit">Đơn vị <span className={styles['required']}>*</span></label>
            <input
              id="svc-item-unit"
              type="text"
              value={unit}
              onChange={(e) => { setUnit(e.target.value); setErrors((p) => ({ ...p, unit: undefined })); }}
              placeholder="VD: Lần"
              disabled={isSubmitting}
            />
            {errors.unit && <span className={styles['field-error']}>{errors.unit}</span>}
          </div>

          <div className={styles['field-row']}>
            <div className={styles['field']}>
              <label htmlFor="svc-item-estimate-time">Thời gian dự kiến (phút)</label>
              <input
                id="svc-item-estimate-time"
                type="number"
                min="0"
                value={estimateTime}
                onChange={(e) => setEstimateTime(e.target.value)}
                placeholder="VD: 60"
                disabled={isSubmitting}
              />
            </div>
            <div className={styles['field']}>
              <label htmlFor="svc-item-status">Trạng thái</label>
              <select
                id="svc-item-status"
                value={String(isActive)}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                disabled={isSubmitting}
              >
                <option value="true">Hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
            </div>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-thumb">Ảnh đại diện</label>
            <input
              id="svc-item-thumb"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              disabled={isSubmitting}
            />
            {thumbnailPreview && (
              <div className={styles['thumb-preview-wrap']}>
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail"
                  className={styles['thumb-preview-large']}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          <div className={styles['auto-gen-row']} style={{ display: 'none' }}>
            <button
              type="button"
              className={styles['auto-gen-button']}
              onClick={() => autoGenerateContentFromImage(thumbnailFile, { force: true })}
              disabled={isSubmitting || isAutoGenerating || !thumbnailFile}
            >
              {isAutoGenerating ? 'Đang phân tích ảnh...' : 'Tạo lại Giới thiệu & Chi tiết từ ảnh'}
            </button>
            <span className={styles['auto-gen-hint']}>
              {autoGenHint || 'Nội dung sẽ được tự động gợi ý sau khi chọn ảnh đại diện.'}
            </span>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-intro-text">Giới thiệu</label>
            <textarea
              id="svc-intro-text"
              rows={4}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="Mô tả ngắn về lợi ích dịch vụ..."
              disabled={isSubmitting}
            />
          </div>

          <div className={styles['field']}>
            <label>Chi tiết dịch vụ</label>
            <div className={styles['editor-toolbar']}>
              <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('bold')}>
                <strong>B</strong>
              </button>
              <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('italic')}>
                <em>I</em>
              </button>
              <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('uppercase')}>
                UPPER
              </button>
              <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ol')}>
                OL
              </button>
              <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ul')}>
                UL
              </button>
            </div>
            <div
              ref={editorRef}
              className={styles['rich-editor']}
              contentEditable={!isSubmitting}
              suppressContentEditableWarning
              onInput={syncDetailFromEditor}
              onBlur={syncDetailFromEditor}
            />
            <div className={styles['editor-hint']}>
              Output HTML dùng các thẻ {'<strong>'}, {'<em>'}, span uppercase, {'<ol>'}, {'<ul>'}.
            </div>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-media">Thư viện hình ảnh / video (tùy chọn)</label>
            <input
              id="svc-item-media"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              disabled={isSubmitting}
            />
            {existingMedia.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  Media đã lưu ({existingMedia.length})
                </div>
                <div className={styles['media-grid']}>
                  {existingMedia.map((entry) => (
                    <div key={`existing-${entry.key}`} className={styles['media-thumb']}>
                      {entry.isVideo ? (
                        <video src={entry.mediaUrl} controls className={styles['media-img']} />
                      ) : (
                        <img src={entry.mediaUrl} alt={entry.mediaDescription || 'media'} className={styles['media-img']} />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {mediaFiles.length > 0 && (
              <div className={styles['media-grid']}>
                {mediaFiles.map((entry, index) => (
                  <div key={`${entry.file?.name || 'media'}-${index}`} className={styles['media-thumb']}>
                    {entry.file?.type?.startsWith('video') ? (
                      <video src={entry.previewUrl} controls className={styles['media-img']} />
                    ) : (
                      <img src={entry.previewUrl} alt={entry.file?.name || 'media'} className={styles['media-img']} />
                    )}
                    <button
                      type="button"
                      className={styles['remove-media-btn']}
                      onClick={() => removeMedia(index)}
                      title="Xóa"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Thông tin hệ thống ── */}
          <div className={styles['section-label']}>Thông tin hệ thống</div>

          {isCreateNew && (
            <>
              <div className={styles['field-row']}>
                <div className={styles['field']}>
                  <label htmlFor="svc-brand-id">Brand ID</label>
                  <input
                    id="svc-brand-id"
                    type="number"
                    min="0"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    placeholder="VD: 1"
                    disabled={isSubmitting}
                  />
                </div>
                <div className={styles['field']}>
                  <label htmlFor="svc-product-line-id">Product Line ID</label>
                  <input
                    id="svc-product-line-id"
                    type="number"
                    min="0"
                    value={productLineId}
                    onChange={(e) => setProductLineId(e.target.value)}
                    placeholder="VD: 1"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className={styles['field']}>
                <label>Work Category</label>
                <div className={styles['field']} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <button type="button" className={styles['auto-gen-button']} onClick={() => setCategoryInputMode('select')} disabled={isSubmitting} style={{ opacity: categoryInputMode === 'select' ? 1 : 0.7 }}>Chọn sẵn</button>
                  <button type="button" className={styles['auto-gen-button']} onClick={() => setCategoryInputMode('manual')} disabled={isSubmitting} style={{ opacity: categoryInputMode === 'manual' ? 1 : 0.7 }}>Nhập ID</button>
                  <button type="button" className={styles['auto-gen-button']} onClick={loadWorkCategoryOptions} disabled={isSubmitting || isLoadingWorkCategories}>
                    {isLoadingWorkCategories ? 'Đang tải...' : 'Tải danh sách'}
                  </button>
                </div>
                {categoryInputMode === 'select' ? (
                  <select
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    disabled={isSubmitting || isLoadingWorkCategories}
                  >
                    <option value="">Chọn workCategoryId</option>
                    {workCategories.map((entry) => (
                      <option key={entry.workCategoryId} value={String(entry.workCategoryId)}>
                        #{entry.workCategoryId} - {entry.categoryName || entry.categoryCode || 'Category'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    placeholder="Nhập workCategoryId"
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <div className={styles['field-row']}>
                <div className={styles['field']}>
                  <label htmlFor="svc-new-cat-code">Tạo category mới - Mã</label>
                  <input
                    id="svc-new-cat-code"
                    type="text"
                    value={newWorkCategoryCode}
                    onChange={(e) => setNewWorkCategoryCode(e.target.value)}
                    placeholder="VD: DV-CAN-BANG-DONG"
                    disabled={isSubmitting || isCreatingWorkCategory}
                  />
                </div>
                <div className={styles['field']}>
                  <label htmlFor="svc-new-cat-name">Tên category</label>
                  <div className={styles['field']} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <input
                      id="svc-new-cat-name"
                      type="text"
                      value={newWorkCategoryName}
                      onChange={(e) => setNewWorkCategoryName(e.target.value)}
                      placeholder="VD: Cân bằng động"
                      disabled={isSubmitting || isCreatingWorkCategory}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles['auto-gen-button']}
                      onClick={handleCreateWorkCategory}
                      disabled={isSubmitting || isCreatingWorkCategory}
                    >
                      {isCreatingWorkCategory ? 'Đang tạo...' : 'Tạo category'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

                <div className={styles['modal-body']} style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 0 }}>
          <button type="button" className={styles['cancel-btn']} onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          <button
            type="button"
            className={styles['cancel-btn']}
            onClick={handleClearDraft}
            disabled={isSubmitting || isAutoGenerating}
          >
            Xóa nháp
          </button>
          <button
            type="button"
            className={styles['submit-btn']}
            onClick={handleSubmit}
            disabled={isSubmitting || isAutoGenerating}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceFormModal;



