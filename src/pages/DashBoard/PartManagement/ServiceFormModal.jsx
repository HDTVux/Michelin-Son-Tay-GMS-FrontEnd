import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ServiceManagement.module.css';
import {
  createServiceForCatalog,
  fetchCatalogItemDetail,
  updateServiceById,
} from '../../../services/blogService.js';
import { createWarehouseCatalogItem, createWarehouseItemCategory, fetchWarehouseItemCategories } from '../../../services/warehouseService.js';
import { fetchHomeProductDetail, fetchHomeServiceDetail } from '../../../services/homeService.js';

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
    /<h3[^>]*>\s*(?:Giá»›i thiá»‡u|Gioi thieu)\s*<\/h3>([\s\S]*?)(?=<h3[^>]*>\s*(?:Chi tiáº¿t dá»‹ch vá»¥|Chi tiet dich vu)\s*<\/h3>|$)/i,
  );
  const detailMatch = source.match(/<h3[^>]*>\s*(?:Chi tiáº¿t dá»‹ch vá»¥|Chi tiet dich vu)\s*<\/h3>([\s\S]*)$/i);
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
    sections.push('<h3>Giá»›i thiá»‡u</h3>');
    sections.push(introParagraphs);
  }
  const normalizedDetail = normalizeEditorHtml(detailHtml);
  if (stripHtml(normalizedDetail)) {
    sections.push('<h3>Chi tiáº¿t dá»‹ch vá»¥</h3>');
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
        const orientation = img.naturalWidth >= img.naturalHeight ? 'ngang' : 'dá»c';
        const lightLevel =
          avgBrightness >= 170 ? 'sÃ¡ng rÃµ' : avgBrightness >= 120 ? 'Ã¡nh sÃ¡ng trung bÃ¬nh' : 'Ã¡nh sÃ¡ng tháº¥p';
        resolve({ width: img.naturalWidth, height: img.naturalHeight, orientation, lightLevel });
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('KhÃ´ng thá»ƒ Ä‘á»c áº£nh Ä‘Ã£ chá»n.'));
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
        'Xe bá»‹ lá»‡ch lÃ¡i, vÃ´ lÄƒng khÃ´ng tháº³ng hoáº·c mÃ²n lá»‘p báº¥t thÆ°á»ng? Dá»‹ch vá»¥ chá»‰nh thÆ°á»›c lÃ¡i giÃºp xe váº­n hÃ nh á»•n Ä‘á»‹nh vÃ  an toÃ n hÆ¡n.',
      detailQuestion: 'Xe bá»‹ lá»‡ch lÃ¡i, vÃ´ lÄƒng khÃ´ng tháº³ng hoáº·c mÃ²n lá»‘p báº¥t thÆ°á»ng?',
      detailAnswer:
        'ÄÃ¢y lÃ  dáº¥u hiá»‡u phá»• biáº¿n cho tháº¥y há»‡ thá»‘ng gÃ³c Ä‘áº·t bÃ¡nh xe Ä‘ang sai lá»‡ch. Cáº§n cÃ¢n chá»‰nh láº¡i Ä‘Ãºng thÃ´ng sá»‘ Ä‘á»ƒ xe cháº¡y Ãªm vÃ  bÃ¡m Ä‘Æ°á»ng tá»‘t hÆ¡n.',
      checklist: [
        'Kiá»ƒm tra Ä‘á»™ chá»¥m vÃ  gÃ³c Ä‘áº·t bÃ¡nh xe báº±ng thiáº¿t bá»‹ chuyÃªn dá»¥ng.',
        'CÃ¢n chá»‰nh vÃ´ lÄƒng vá» vá»‹ trÃ­ cÃ¢n báº±ng khi xe Ä‘i tháº³ng.',
        'ÄÃ¡nh giÃ¡ Ä‘á»™ mÃ²n lá»‘p trÆ°á»›c/sau Ä‘á»ƒ phÃ¡t hiá»‡n lá»‡ch gÃ³c Ä‘áº·t.',
      ],
      process: [
        'Tiáº¿p nháº­n xe vÃ  kiá»ƒm tra nhanh tÃ¬nh tráº¡ng váº­n hÃ nh.',
        'Äo thÃ´ng sá»‘ gÃ³c Ä‘áº·t bÃ¡nh xe trÃªn mÃ¡y cÃ¢n chá»‰nh.',
        'Hiá»‡u chá»‰nh theo thÃ´ng sá»‘ chuáº©n cá»§a nhÃ  sáº£n xuáº¥t.',
        'Cháº¡y thá»­ vÃ  xÃ¡c nháº­n xe Ä‘i tháº³ng, vÃ´ lÄƒng cÃ¢n.',
      ],
    },
    {
      id: 'general-maintenance',
      keywords: ['bao duong', 'maintenance', 'kiem tra tong quat', 'service'],
      intro:
        'Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³ giÃºp xe váº­n hÃ nh á»•n Ä‘á»‹nh, tÄƒng tuá»•i thá» linh kiá»‡n vÃ  háº¡n cháº¿ sá»± cá»‘ phÃ¡t sinh trong quÃ¡ trÃ¬nh sá»­ dá»¥ng.',
      detailQuestion: 'VÃ¬ sao nÃªn thá»±c hiá»‡n báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³?',
      detailAnswer:
        'Báº£o dÆ°á»¡ng Ä‘Ãºng lá»‹ch giÃºp phÃ¡t hiá»‡n sá»›m hao mÃ²n, giáº£m rá»§i ro há»ng hÃ³c lá»›n vÃ  Ä‘áº£m báº£o xe luÃ´n trong tráº¡ng thÃ¡i váº­n hÃ nh an toÃ n.',
      checklist: [
        'Kiá»ƒm tra nhanh cÃ¡c háº¡ng má»¥c an toÃ n cÆ¡ báº£n cá»§a xe.',
        'ÄÃ¡nh giÃ¡ cÃ¡c bá»™ pháº­n cÃ³ dáº¥u hiá»‡u hao mÃ²n theo thá»i gian sá»­ dá»¥ng.',
        'TÆ° váº¥n phÆ°Æ¡ng Ã¡n xá»­ lÃ½ tá»‘i Æ°u theo tÃ¬nh tráº¡ng thá»±c táº¿.',
      ],
      process: [
        'Tiáº¿p nháº­n thÃ´ng tin tÃ¬nh tráº¡ng xe tá»« khÃ¡ch hÃ ng.',
        'Kiá»ƒm tra tá»•ng quÃ¡t theo quy trÃ¬nh ká»¹ thuáº­t cá»§a xÆ°á»Ÿng.',
        'Thá»±c hiá»‡n háº¡ng má»¥c cáº§n thiáº¿t vÃ  ghi nháº­n káº¿t quáº£.',
        'BÃ n giao xe kÃ¨m khuyáº¿n nghá»‹ theo dÃµi Ä‘á»‹nh ká»³ tiáº¿p theo.',
      ],
    },
    {
      id: 'default',
      keywords: [],
      intro: 'Dá»‹ch vá»¥ giÃºp xe váº­n hÃ nh á»•n Ä‘á»‹nh hÆ¡n, háº¡n cháº¿ hao mÃ²n vÃ  nÃ¢ng cao Ä‘á»™ an toÃ n khi sá»­ dá»¥ng hÃ ng ngÃ y.',
      detailQuestion: 'Khi nÃ o nÃªn kiá»ƒm tra háº¡ng má»¥c nÃ y?',
      detailAnswer:
        'Khi xe cÃ³ dáº¥u hiá»‡u váº­n hÃ nh báº¥t thÆ°á»ng hoáº·c Ä‘Ã£ Ä‘áº¿n má»‘c báº£o dÆ°á»¡ng, báº¡n nÃªn kiá»ƒm tra sá»›m Ä‘á»ƒ trÃ¡nh phÃ¡t sinh lá»—i lá»›n.',
      checklist: [
        'Kiá»ƒm tra tÃ¬nh tráº¡ng thá»±c táº¿ cá»§a há»‡ thá»‘ng liÃªn quan.',
        'ÄÃ¡nh giÃ¡ má»©c Ä‘á»™ hao mÃ²n vÃ  nguy cÆ¡ áº£nh hÆ°á»Ÿng váº­n hÃ nh.',
        'Äá» xuáº¥t phÆ°Æ¡ng Ã¡n xá»­ lÃ½ phÃ¹ há»£p vÃ  minh báº¡ch chi phÃ­.',
      ],
      process: [
        'Tiáº¿p nháº­n vÃ  kiá»ƒm tra ban Ä‘áº§u.',
        'Äo/Ä‘Ã¡nh giÃ¡ thÃ´ng sá»‘ ká»¹ thuáº­t cáº§n thiáº¿t.',
        'Thá»±c hiá»‡n xá»­ lÃ½ theo Ä‘Ãºng quy trÃ¬nh.',
        'Kiá»ƒm tra láº¡i vÃ  bÃ n giao xe.',
      ],
    },
  ];
  const matched = SERVICE_TEMPLATES.find((template) =>
    template.keywords.length > 0 && template.keywords.some((kw) => contextKey.includes(kw)),
  );
  return matched || SERVICE_TEMPLATES[SERVICE_TEMPLATES.length - 1];
};

const buildAutoContentFromImage = ({ template, imageStats, itemName }) => {
  const safeName = String(itemName || '').trim() || 'dá»‹ch vá»¥ nÃ y';
  const imageHint = imageStats
    ? `Dá»±a trÃªn áº£nh Ä‘áº¡i diá»‡n (${imageStats.width}x${imageStats.height}, khung ${imageStats.orientation}, ${imageStats.lightLevel}), ká»¹ thuáº­t viÃªn Ä‘ang thao tÃ¡c trá»±c tiáº¿p theo quy trÃ¬nh táº¡i xÆ°á»Ÿng.`
    : 'Dá»±a trÃªn áº£nh Ä‘áº¡i diá»‡n Ä‘Ã£ chá»n, ká»¹ thuáº­t viÃªn Ä‘ang thao tÃ¡c trá»±c tiáº¿p theo quy trÃ¬nh táº¡i xÆ°á»Ÿng.';
  const introText = `${template.intro}\n${imageHint}`;
  const checklistHtml = template.checklist.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  const processHtml = template.process.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  const detailHtml = [
    `<p><strong>${escapeHtml(template.detailQuestion)}</strong> ${escapeHtml(template.detailAnswer)}</p>`,
    `<p>${escapeHtml(`Äá»‘i vá»›i ${safeName}, xÆ°á»Ÿng sáº½ kiá»ƒm tra vÃ  xá»­ lÃ½ theo Ä‘Ãºng tiÃªu chuáº©n ká»¹ thuáº­t.`)}</p>`,
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

function ServiceFormModal({ item, mode = 'create', onClose, onSaved }) {
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
  const [priceMode, setPriceMode] = useState(baseItem.showPrice !== false ? 'fixed' : 'contact');
  const [price, setPrice] = useState(baseItem.price != null ? String(baseItem.price) : '');
  const [introText, setIntroText] = useState(initialDescription.introText);
  const [detailHtml, setDetailHtml] = useState(initialDescription.detailHtml);
  const [unit, setUnit] = useState(baseItem.unit || '');
  const [warrantyMonths, setWarrantyMonths] = useState(
    baseItem.warrantyDurationMonths != null ? String(baseItem.warrantyDurationMonths) : '',
  );
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
    baseItem.thumbnailUrl || baseItem.imageUrl || '',
  );
  const [existingMedia, setExistingMedia] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenHint, setAutoGenHint] = useState('');
  const [errors, setErrors] = useState({});

  const editorRef = useRef(null);
  const thumbnailPreviewRef = useRef('');
  const mediaFilesRef = useRef([]);

  const modalTitle = 'Táº¡o bÃ i viáº¿t';
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

      const mergedDescription =
        detail.fullDescription
        || detail.descriptionHtml
        || detail.description
        || '';
      const splitSections = splitDescriptionSections(mergedDescription);

      setItemName(detail.title || detail.itemName || '');
      setSku(detail.sku || '');
      setPriceMode(detail.showPrice !== false ? 'fixed' : 'contact');
      setPrice(detail.price != null ? String(detail.price) : '');
      setIntroText(splitSections.introText || String(detail.shortDescription || '').trim());
      setDetailHtml(splitSections.detailHtml || normalizeEditorHtml(detail.fullDescription || detail.descriptionHtml || ''));
      setUnit(detail.unit || '');
      setWarrantyMonths(
        detail.warrantyDurationMonths != null
          ? String(detail.warrantyDurationMonths)
          : detail.estimateTime != null
            ? String(detail.estimateTime)
            : '',
      );
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
      setExistingMedia(normalizeExistingMedia(detail?.media ?? detail?.mediaList));

      const draft = readDraft();
      if (draft) {
        if (typeof draft.itemName === 'string') setItemName(draft.itemName);
        if (typeof draft.sku === 'string') setSku(draft.sku);
        if (draft.priceMode === 'fixed' || draft.priceMode === 'contact') setPriceMode(draft.priceMode);
        if (typeof draft.price === 'string') setPrice(draft.price);
        if (typeof draft.introText === 'string') setIntroText(draft.introText);
        if (typeof draft.detailHtml === 'string') setDetailHtml(draft.detailHtml);
        if (typeof draft.unit === 'string') setUnit(draft.unit);
        if (typeof draft.warrantyMonths === 'string') setWarrantyMonths(draft.warrantyMonths);
        if (typeof draft.isActive === 'boolean') setIsActive(draft.isActive);
        if (typeof draft.brandId === 'string') setBrandId(draft.brandId);
        if (typeof draft.productLineId === 'string') setProductLineId(draft.productLineId);
        if (typeof draft.itemCategoryId === 'string') setItemCategoryId(draft.itemCategoryId);
      }
    } catch {
      // Keep local values.
      setExistingMedia([]);
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
    if (!draft) return;
    if (typeof draft.itemName === 'string') setItemName(draft.itemName);
    if (typeof draft.sku === 'string') setSku(draft.sku);
    if (draft.priceMode === 'fixed' || draft.priceMode === 'contact') setPriceMode(draft.priceMode);
    if (typeof draft.price === 'string') setPrice(draft.price);
    if (typeof draft.introText === 'string') setIntroText(draft.introText);
    if (typeof draft.detailHtml === 'string') setDetailHtml(draft.detailHtml);
    if (typeof draft.unit === 'string') setUnit(draft.unit);
    if (typeof draft.warrantyMonths === 'string') setWarrantyMonths(draft.warrantyMonths);
    if (typeof draft.isActive === 'boolean') setIsActive(draft.isActive);
    if (typeof draft.brandId === 'string') setBrandId(draft.brandId);
    if (typeof draft.productLineId === 'string') setProductLineId(draft.productLineId);
    if (typeof draft.itemCategoryId === 'string') setItemCategoryId(draft.itemCategoryId);
  }, [isCreateNew, readDraft]);

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
        notify('Vui lÃ²ng chá»n áº£nh Ä‘áº¡i diá»‡n Ä‘á»ƒ tá»± Ä‘á»™ng táº¡o ná»™i dung tá»« áº£nh.', 'info');
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
          setAutoGenHint('ÄÃ£ cÃ³ ná»™i dung sáºµn. Nháº¥n "Táº¡o láº¡i tá»« áº£nh" náº¿u báº¡n muá»‘n ghi Ä‘Ã¨.');
          notify('ÄÃ£ phÃ¢n tÃ­ch áº£nh. Ná»™i dung hiá»‡n táº¡i Ä‘Æ°á»£c giá»¯ nguyÃªn.', 'info');
          return;
        }
        setAutoGenHint(
          `ÄÃ£ táº¡o ná»™i dung theo áº£nh (${stats?.width || '-'}x${stats?.height || '-'}, khung ${stats?.orientation || '-'}).`,
        );
        notify(force ? 'ÄÃ£ táº¡o láº¡i ná»™i dung tá»« áº£nh.' : 'ÄÃ£ tá»± Ä‘á»™ng táº¡o ná»™i dung tá»« áº£nh.', 'success');
      } catch (err) {
        notify(err?.message || 'KhÃ´ng thá»ƒ tá»± Ä‘á»™ng táº¡o ná»™i dung tá»« áº£nh.', 'error');
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
        setThumbnailPreview(baseItem.thumbnailUrl || baseItem.imageUrl || '');
        setAutoGenHint('');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      thumbnailPreviewRef.current = objectUrl;
      setThumbnailFile(file);
      setThumbnailPreview(objectUrl);
      setAutoGenHint('ÄÃ£ nháº­n áº£nh. Báº¡n cÃ³ thá»ƒ báº¥m "Táº¡o láº¡i tá»« áº£nh" Ä‘á»ƒ cáº­p nháº­t ná»™i dung.');
      void autoGenerateContentFromImage(file, { force: false });
    },
    [autoGenerateContentFromImage, baseItem.imageUrl, baseItem.thumbnailUrl],
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
    const snapshot = {
      itemName,
      sku,
      priceMode,
      price,
      introText,
      detailHtml,
      unit,
      warrantyMonths,
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
    isActive,
    itemCategoryId,
    itemName,
    price,
    priceMode,
    productLineId,
    sku,
    unit,
    warrantyMonths,
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
    setPriceMode(baseItem.showPrice !== false ? 'fixed' : 'contact');
    setPrice(baseItem.price != null ? String(baseItem.price) : '');
    setIntroText(initialDescription.introText);
    setDetailHtml(initialDescription.detailHtml);
    setUnit(baseItem.unit || '');
    setWarrantyMonths(baseItem.warrantyDurationMonths != null ? String(baseItem.warrantyDurationMonths) : '');
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
    setThumbnailPreview(baseItem.thumbnailUrl || baseItem.imageUrl || '');
  }, [baseItem, clearDraft, initialDescription.detailHtml, initialDescription.introText, isEdit, loadDetail]);

  const buildDescriptionHtml = useCallback(
    () => composeDescriptionHtml(introText, detailHtml),
    [detailHtml, introText],
  );

  const buildServiceFormData = useCallback(() => {
    const formData = new FormData();
    const showPrice = priceMode === 'fixed';
    const priceNum = Number(String(price || '').trim());
    const resolvedPrice =
      showPrice && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : 0;
    const warrantyNum = Number(String(warrantyMonths || '').trim());
    const serviceStatus = isActive ? 'ACTIVE' : 'INACTIVE';
    const fullDescription = buildDescriptionHtml();
    const shortDescription = String(introText || '').trim();
    const title = String(itemName || '').trim();

    formData.append('title', title);
    formData.append('shortDescription', shortDescription);
    formData.append('fullDescription', fullDescription);
    formData.append('showPrice', showPrice ? 'true' : 'false');
    formData.append('displayPrice', String(resolvedPrice));
    formData.append('status', serviceStatus);
    if (Number.isFinite(warrantyNum) && warrantyNum >= 0) {
      formData.append('estimateTime', String(Math.trunc(warrantyNum)));
    }
    if (thumbnailFile) formData.append('thumbnailFile', thumbnailFile);
    mediaFiles.forEach((entry) => {
      if (entry?.file) formData.append('mediaFiles', entry.file);
    });
    return formData;
  }, [
    buildDescriptionHtml,
    introText,
    isActive,
    itemName,
    mediaFiles,
    price,
    priceMode,
    thumbnailFile,
    warrantyMonths,
  ]);

  const buildCatalogPayload = useCallback(() => {
    const priceNum = Number(String(price || '').trim());
    const showPrice = priceMode === 'fixed';
    const resolvedPrice = Number.isFinite(priceNum) ? priceNum : 0;
    const description = stripHtml(buildDescriptionHtml());
    const parsedItemCategoryId = toNullablePositiveNumber(itemCategoryId);
    return {
      itemName: String(itemName || '').trim() || undefined,
      itemType: 'SERVICE',
      sku: String(sku || '').trim(),
      price: resolvedPrice,
      showPrice,
      unit: String(unit || '').trim(),
      description: description || undefined,
      warrantyDurationMonths: toNullablePositiveNumber(warrantyMonths) ?? undefined,
      serviceServiceId: 0,
      comboDurationMonths: 0,
      comboDescription: '',
      isRecurring: false,
      isActive,
      is_active: 1,
      workCategoryId: parsedItemCategoryId ?? 0,
    };
  }, [buildDescriptionHtml, isActive, itemCategoryId, itemName, price, priceMode, sku, unit, warrantyMonths]);

  const validateBeforeSubmit = useCallback(() => {
    const nextErrors = {};
    if (!String(itemName || '').trim()) nextErrors.itemName = 'Vui lÃ²ng nháº­p tiÃªu Ä‘á» dá»‹ch vá»¥.';
    if (!String(sku || '').trim()) nextErrors.sku = 'Vui lÃ²ng nháº­p mÃ£ dá»‹ch vá»¥.';
    if (!String(unit || '').trim()) nextErrors.unit = 'Vui lÃ²ng nháº­p Ä‘Æ¡n vá»‹.';
    if (priceMode === 'fixed') {
      const priceNum = Number(String(price || '').trim());
      if (!Number.isFinite(priceNum) || priceNum < 0) nextErrors.price = 'Vui lÃ²ng nháº­p giÃ¡ há»£p lá»‡.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [itemName, price, priceMode, sku, unit]);

  const handleCreateWorkCategory = useCallback(async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) { notify('Vui lÃ²ng Ä‘Äƒng nháº­p.', 'error'); return; }
    const categoryCode = String(newWorkCategoryCode || '').trim();
    const categoryName = String(newWorkCategoryName || '').trim();
    if (!categoryCode) { notify('Vui lÃ²ng nháº­p mÃ£ category.', 'error'); return; }
    if (!categoryName) { notify('Vui lÃ²ng nháº­p tÃªn category.', 'error'); return; }
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
      if (createdId == null) throw new Error('KhÃ´ng nháº­n Ä‘Æ°á»£c ID.');
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
      notify(`ÄÃ£ táº¡o category #${createdId}.`, 'success');
    } catch (err) {
      notify(err?.message || 'KhÃ´ng thá»ƒ táº¡o category.', 'error');
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
    if (!token) { notify('Vui long dang nhap.', 'error'); return; }
    try {
      setIsSubmitting(true);
      if (isEdit) {
        const catalogItemId = toNullablePositiveNumber(baseItem.itemId);
        const serviceId = getServiceServiceId(baseItem);
        if (!serviceId) {
          notify('Khong tim thay serviceId de cap nhat. Vui long tao bai viet truoc.', 'error');
          return;
        }
        await updateServiceById(serviceId, buildServiceFormData(), token);
        notify('Cap nhat dich vu thanh cong!', 'success');
        clearDraft();
        onSaved({ catalogItemId: catalogItemId ?? baseItem.itemId, serviceServiceId: serviceId });
        return;
      }

      let catalogItemId = toNullablePositiveNumber(baseItem.itemId);
      let serviceServiceId = getServiceServiceId(baseItem);
      if (isCreateNew) {
        const createCatalogRes = await createWarehouseCatalogItem(buildCatalogPayload(), token);
        const createdCatalog = extractPayload(createCatalogRes);
        catalogItemId = toNullablePositiveNumber(
          createdCatalog?.itemId ?? createdCatalog?.catalogItemId ?? createdCatalog?.id,
        );
        serviceServiceId = getServiceServiceId(createdCatalog) || serviceServiceId;
        if (!catalogItemId) throw new Error('Khong nhan duoc catalogItemId sau khi tao catalog.');
      }

      const createRes = await createServiceForCatalog(catalogItemId, buildServiceFormData(), token);
      serviceServiceId = getServiceServiceId(extractPayload(createRes)) || serviceServiceId;
      if (isCreateFromCatalog && !serviceServiceId) {
        throw new Error('Da tao dich vu nhung chua nhan duoc serviceId.');
      }
      notify('Tao dich vu thanh cong!', 'success');
      clearDraft();
      onSaved({ catalogItemId, serviceServiceId });
    } catch (err) {
      notify(err?.message || 'Thao tac that bai. Vui long thu lai.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    baseItem,
    buildCatalogPayload,
    buildServiceFormData,
    isCreateFromCatalog,
    isCreateNew,
    isEdit,
    notify,
    onSaved,
    validateBeforeSubmit,
    clearDraft,
  ]);
  return (
    <div className={styles['modal-overlay']} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles['modal-box']}>
        <div className={styles['modal-header']}>
          <h3>{modalTitle}</h3>
          <button type="button" className={styles['modal-close']} onClick={onClose} aria-label="ÄÃ³ng">x</button>
        </div>
        <div className={styles['modal-body']}>
          {/* â”€â”€ ThÃ´ng tin dá»‹ch vá»¥ â”€â”€ */}
          <div className={styles['section-label']}>ThÃ´ng tin dá»‹ch vá»¥</div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-name">TiÃªu Ä‘á» <span className={styles['required']}>*</span></label>
            <input
              id="svc-item-name"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="VD: Chá»‰nh thÆ°á»›c lÃ¡i (Ä‘á»™ chá»¥m)"
              disabled={isSubmitting || isCreateFromCatalog}
            />
            {errors.itemName && <span className={styles['field-error']}>{errors.itemName}</span>}
          </div>

          <div className={styles['field-row']}>
            <div className={styles['field']}>
              <label htmlFor="svc-item-sku">MÃ£ dá»‹ch vá»¥ <span className={styles['required']}>*</span></label>
              <div className={styles['field']} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <input
                  id="svc-item-sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="VD: DV-CHINH-THUOC-LAI-928"
                  disabled={isSubmitting || isCreateFromCatalog}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className={styles['auto-gen-button']}
                  onClick={handleRandomServiceCode}
                  disabled={isSubmitting || isCreateFromCatalog}
                >
                  Random mÃ£
                </button>
              </div>
              {errors.sku && <span className={styles['field-error']}>{errors.sku}</span>}
            </div>
          </div>

          <div className={styles['field-row']}>
            <div className={styles['field']}>
              <label>Loáº¡i giÃ¡</label>
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
                  LiÃªn há»‡
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
                  Nháº­p giÃ¡
                </label>
              </div>
            </div>
            <div className={styles['field']}>
              <label htmlFor="svc-item-price">GiÃ¡ dá»‹ch vá»¥</label>
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
                <div className={styles['readonly-value']}>LiÃªn há»‡</div>
              )}
            </div>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-unit">ÄÆ¡n vá»‹ <span className={styles['required']}>*</span></label>
            <input
              id="svc-item-unit"
              type="text"
              value={unit}
              onChange={(e) => { setUnit(e.target.value); setErrors((p) => ({ ...p, unit: undefined })); }}
              placeholder="VD: Láº§n"
              disabled={isSubmitting}
            />
            {errors.unit && <span className={styles['field-error']}>{errors.unit}</span>}
          </div>

          <div className={styles['field-row']}>
            <div className={styles['field']}>
              <label htmlFor="svc-item-warranty">Báº£o hÃ nh (thÃ¡ng)</label>
              <input
                id="svc-item-warranty"
                type="number"
                min="0"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="VD: 12"
                disabled={isSubmitting}
              />
            </div>
            <div className={styles['field']}>
              <label htmlFor="svc-item-status">Tráº¡ng thÃ¡i</label>
              <select
                id="svc-item-status"
                value={String(isActive)}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                disabled={isSubmitting}
              >
                <option value="true">Hoáº¡t Ä‘á»™ng</option>
                <option value="false">KhÃ´ng hoáº¡t Ä‘á»™ng</option>
              </select>
            </div>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-thumb">áº¢nh Ä‘áº¡i diá»‡n</label>
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

          <div className={styles['auto-gen-row']}>
            <button
              type="button"
              className={styles['auto-gen-button']}
              onClick={() => autoGenerateContentFromImage(thumbnailFile, { force: true })}
              disabled={isSubmitting || isAutoGenerating || !thumbnailFile}
            >
              {isAutoGenerating ? 'Äang phÃ¢n tÃ­ch áº£nh...' : 'Táº¡o láº¡i Giá»›i thiá»‡u & Chi tiáº¿t tá»« áº£nh'}
            </button>
            <span className={styles['auto-gen-hint']}>
              {autoGenHint || 'Ná»™i dung sáº½ Ä‘Æ°á»£c tá»± Ä‘á»™ng gá»£i Ã½ sau khi chá»n áº£nh Ä‘áº¡i diá»‡n.'}
            </span>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-intro-text">Giá»›i thiá»‡u</label>
            <textarea
              id="svc-intro-text"
              rows={4}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="MÃ´ táº£ ngáº¯n vá» lá»£i Ã­ch dá»‹ch vá»¥..."
              disabled={isSubmitting}
            />
          </div>

          <div className={styles['field']}>
            <label>Chi tiáº¿t dá»‹ch vá»¥</label>
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
              Output HTML dÃ¹ng cÃ¡c tháº» {'<strong>'}, {'<em>'}, span uppercase, {'<ol>'}, {'<ul>'}.
            </div>
          </div>

          <div className={styles['field']}>
            <label htmlFor="svc-item-media">ThÆ° viá»‡n hÃ¬nh áº£nh / video (tÃ¹y chá»n)</label>
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
                  Media da luu ({existingMedia.length})
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
                      title="XÃ³a"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* â”€â”€ ThÃ´ng tin há»‡ thá»‘ng â”€â”€ */}
          <div className={styles['section-label']}>ThÃ´ng tin há»‡ thá»‘ng</div>

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
                  <button type="button" className={styles['auto-gen-button']} onClick={() => setCategoryInputMode('select')} disabled={isSubmitting} style={{ opacity: categoryInputMode === 'select' ? 1 : 0.7 }}>Chá»n sáºµn</button>
                  <button type="button" className={styles['auto-gen-button']} onClick={() => setCategoryInputMode('manual')} disabled={isSubmitting} style={{ opacity: categoryInputMode === 'manual' ? 1 : 0.7 }}>Nháº­p ID</button>
                  <button type="button" className={styles['auto-gen-button']} onClick={loadWorkCategoryOptions} disabled={isSubmitting || isLoadingWorkCategories}>
                    {isLoadingWorkCategories ? 'Äang táº£i...' : 'Táº£i danh sÃ¡ch'}
                  </button>
                </div>
                {categoryInputMode === 'select' ? (
                  <select
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    disabled={isSubmitting || isLoadingWorkCategories}
                  >
                    <option value="">Chá»n workCategoryId</option>
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
                    placeholder="Nháº­p workCategoryId"
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <div className={styles['field-row']}>
                <div className={styles['field']}>
                  <label htmlFor="svc-new-cat-code">Táº¡o category má»›i - MÃ£</label>
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
                  <label htmlFor="svc-new-cat-name">TÃªn category</label>
                  <div className={styles['field']} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <input
                      id="svc-new-cat-name"
                      type="text"
                      value={newWorkCategoryName}
                      onChange={(e) => setNewWorkCategoryName(e.target.value)}
                      placeholder="VD: CÃ¢n báº±ng Ä‘á»™ng"
                      disabled={isSubmitting || isCreatingWorkCategory}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles['auto-gen-button']}
                      onClick={handleCreateWorkCategory}
                      disabled={isSubmitting || isCreatingWorkCategory}
                    >
                      {isCreatingWorkCategory ? 'Äang táº¡o...' : 'Táº¡o category'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

                <div className={styles['modal-body']} style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 0 }}>
          <button type="button" className={styles['cancel-btn']} onClick={onClose} disabled={isSubmitting}>
            Huy
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



