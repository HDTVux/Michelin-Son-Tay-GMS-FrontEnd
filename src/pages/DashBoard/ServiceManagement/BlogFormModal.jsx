
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './BlogManagement.module.css';
import { createBlog, fetchCatalogItemDetail, updateBlog } from '../../../services/blogService.js';
import { createWarehouseCatalogItem } from '../../../services/warehouseService.js';

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
const getServiceIdFromUnknownShape = (input, maxDepth = 3) => {
  if (!input || typeof input !== 'object') return null;
  const visited = new Set();
  const queue = [{ node: input, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { node, depth } = current;
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);
    for (const [rawKey, rawValue] of Object.entries(node)) {
      const key = String(rawKey || '').toLowerCase();
      const looksLikeServiceId =
        (key.includes('service') && key.includes('id'))
        || key === 'serviceid'
        || key === 'service_id'
        || key === 'service_service_id';
      if (looksLikeServiceId) {
        if (rawValue && typeof rawValue === 'object') {
          const nestedParsed = toNullablePositiveNumber(
            rawValue.id ?? rawValue.serviceId ?? rawValue.service_id ?? rawValue.service_service_id,
          );
          if (nestedParsed != null) return nestedParsed;
        } else {
          const parsed = toNullablePositiveNumber(rawValue);
          if (parsed != null) return parsed;
        }
      }
      if (depth < maxDepth && rawValue && typeof rawValue === 'object') {
        queue.push({ node: rawValue, depth: depth + 1 });
      }
    }
  }
  return null;
};
const toSearchKey = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const SERVICE_TEMPLATES = [
  {
    id: 'wheel-alignment',
    keywords: ['chinh thuoc lai', 'do chum', 'thuoc lai', 'wheel alignment', 'can chinh goc dat banh'],
    intro: 'Xe bị lệch lái, vô lăng không thẳng hoặc mòn lốp bất thường? Dịch vụ chỉnh thước lái giúp xe vận hành ổn định và an toàn hơn.',
    detailQuestion: 'Xe bị lệch lái, vô lăng không thẳng hoặc mòn lốp bất thường?',
    detailAnswer: 'Đây là dấu hiệu phổ biến cho thấy hệ thống góc đặt bánh xe đang sai lệch. Cần cân chỉnh lại đúng thông số để xe chạy êm và bám đường tốt hơn.',
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
    intro: 'Bảo dưỡng định kỳ giúp xe vận hành ổn định, tăng tuổi thọ linh kiện và hạn chế sự cố phát sinh trong quá trình sử dụng.',
    detailQuestion: 'Vì sao nên thực hiện bảo dưỡng định kỳ?',
    detailAnswer: 'Bảo dưỡng đúng lịch giúp phát hiện sớm hao mòn, giảm rủi ro hỏng hóc lớn và đảm bảo xe luôn trong trạng thái vận hành an toàn.',
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
    detailAnswer: 'Khi xe có dấu hiệu vận hành bất thường hoặc đã đến mốc bảo dưỡng, bạn nên kiểm tra sớm để tránh phát sinh lỗi lớn.',
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

const getServiceServiceId = (item) => {
  if (!item || typeof item !== 'object') return null;
  const candidates = [
    item.id,
    item.service_service_id, item.serviceServiceId, item.service_serviceId, item.serviceServiceID,
    item.serviceId, item.service_id, item?.service?.service_service_id, item?.service?.serviceServiceId,
    item?.service?.service_id, item?.service?.id, item?.serviceInfo?.service_service_id,
    item?.serviceInfo?.serviceServiceId, item?.serviceInfo?.service_id, item?.serviceInfo?.id,
  ];
  for (const value of candidates) {
    const parsed = toNullablePositiveNumber(value);
    if (parsed != null) return parsed;
  }
  return getServiceIdFromUnknownShape(item);
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
  const introMatch = source.match(/<h3[^>]*>\s*(?:Giới thiệu|Gioi thieu)\s*<\/h3>([\s\S]*?)(?=<h3[^>]*>\s*(?:Chi tiết dịch vụ|Chi tiet dich vu)\s*<\/h3>|$)/i);
  const detailMatch = source.match(/<h3[^>]*>\s*(?:Chi tiết dịch vụ|Chi tiet dich vu)\s*<\/h3>([\s\S]*)$/i);
  if (!introMatch && !detailMatch) return { introText: '', detailHtml: normalizeEditorHtml(source) };
  return { introText: introMatch ? stripHtml(introMatch[1]) : '', detailHtml: detailMatch ? normalizeEditorHtml(detailMatch[1]) : '' };
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

const pickPriceMode = (showPrice) => (showPrice ? 'fixed' : 'contact');
const pickTemplateByContext = (itemName, sku, fileName) => {
  const contextKey = toSearchKey(`${itemName || ''} ${sku || ''} ${fileName || ''}`);
  const matched = SERVICE_TEMPLATES.find((template) => template.keywords.length > 0 && template.keywords.some((kw) => contextKey.includes(kw)));
  return matched || SERVICE_TEMPLATES[SERVICE_TEMPLATES.length - 1];
};

const analyzeImageStats = (file) => new Promise((resolve, reject) => {
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
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);
      let sampleCount = 0;
      let brightnessSum = 0;
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        brightnessSum += brightness;
        sampleCount += 1;
      }
      const avgBrightness = sampleCount > 0 ? brightnessSum / sampleCount : 128;
      const orientation = img.naturalWidth >= img.naturalHeight ? 'ngang' : 'dọc';
      const lightLevel = avgBrightness >= 170 ? 'sáng rõ' : avgBrightness >= 120 ? 'ánh sáng trung bình' : 'ánh sáng thấp';
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

export default function BlogFormModal({ item, mode = 'create', onClose, onSaved }) {
  const notify = useCallback((msg, type = 'error') => {
    toast[type](msg, { containerId: 'app-toast' });
  }, []);

  const baseItem = useMemo(() => item || {}, [item]);
  const isEdit = mode === 'edit' && Boolean(baseItem?.itemId);
  const isCreateFromCatalog = mode === 'createFromCatalog' && Boolean(baseItem?.itemId);
  const isCreateNew = !isEdit && !isCreateFromCatalog;
  const initialDescription = useMemo(() => splitDescriptionSections(baseItem.description || ''), [baseItem.description]);

  const [itemName, setItemName] = useState(baseItem.itemName || '');
  const [sku, setSku] = useState(baseItem.sku || '');
  const [priceMode, setPriceMode] = useState(pickPriceMode(baseItem.showPrice ?? true));
  const [price, setPrice] = useState(baseItem.price != null ? String(baseItem.price) : '');
  const [introText, setIntroText] = useState(initialDescription.introText);
  const [detailHtml, setDetailHtml] = useState(initialDescription.detailHtml);
  const [unit, setUnit] = useState(baseItem.unit || '');
  const [warrantyMonths, setWarrantyMonths] = useState(baseItem.warrantyDurationMonths != null ? String(baseItem.warrantyDurationMonths) : '');
  const [isActive, setIsActive] = useState(isEdit ? (baseItem.isActive ?? true) : true);
  const [brandId, setBrandId] = useState(baseItem.brandId != null ? String(baseItem.brandId) : '');
  const [productLineId, setProductLineId] = useState(baseItem.productLineId != null ? String(baseItem.productLineId) : '');
  const [itemCategoryId, setItemCategoryId] = useState(baseItem.itemCategoryId != null ? String(baseItem.itemCategoryId) : '');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(baseItem.thumbnailUrl || baseItem.imageUrl || '');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenHint, setAutoGenHint] = useState('');
  const [errors, setErrors] = useState({});

  const editorRef = useRef(null);
  const thumbnailPreviewRef = useRef('');
  const mediaFilesRef = useRef([]);

  const modalTitle = useMemo(() => {
    if (isEdit) return 'Sửa Blog dịch vụ';
    if (isCreateFromCatalog) return 'Tạo Blog từ Catalog';
    return 'Tạo Blog dịch vụ mới';
  }, [isCreateFromCatalog, isEdit]);

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
      const detail = extractPayload(res);
      const splitSections = splitDescriptionSections(detail.description || '');
      setItemName(detail.itemName || '');
      setSku(detail.sku || '');
      setPriceMode(pickPriceMode(detail.showPrice ?? true));
      setPrice(detail.price != null ? String(detail.price) : '');
      setIntroText(splitSections.introText);
      setDetailHtml(splitSections.detailHtml);
      setUnit(detail.unit || '');
      setWarrantyMonths(detail.warrantyDurationMonths != null ? String(detail.warrantyDurationMonths) : '');
      setIsActive(isEdit ? (detail.isActive ?? true) : true);
      setBrandId(detail.brandId != null ? String(detail.brandId) : '');
      setProductLineId(detail.productLineId != null ? String(detail.productLineId) : '');
      setItemCategoryId(detail.itemCategoryId != null ? String(detail.itemCategoryId) : '');
      if (detail.thumbnailUrl || detail.imageUrl) setThumbnailPreview(detail.thumbnailUrl || detail.imageUrl);
    } catch {
      // Keep local values.
    }
  }, [baseItem?.itemId, isEdit]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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

  const autoGenerateContentFromImage = useCallback(async (file, { force = false } = {}) => {
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
      setAutoGenHint(`Đã tạo nội dung theo ảnh (${stats?.width || '-'}x${stats?.height || '-'}, khung ${stats?.orientation || '-'}).`);
      notify(force ? 'Đã tạo lại nội dung từ ảnh.' : 'Đã tự động tạo nội dung từ ảnh.', 'success');
    } catch (err) {
      notify(err?.message || 'Không thể tự động tạo nội dung từ ảnh.', 'error');
    } finally {
      setIsAutoGenerating(false);
    }
  }, [detailHtml, introText, itemName, notify, sku]);

  const handleThumbnailChange = useCallback((e) => {
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
    setAutoGenHint('Đã nhận ảnh. Bạn có thể bấm "Tạo lại từ ảnh" để cập nhật nội dung.');
    void autoGenerateContentFromImage(file, { force: false });
  }, [autoGenerateContentFromImage, baseItem.imageUrl, baseItem.thumbnailUrl]);

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

  const buildDescriptionHtml = useCallback(() => composeDescriptionHtml(introText, detailHtml), [detailHtml, introText]);

  const buildServiceFormData = useCallback((catalogItemId, serviceServiceId) => {
    const formData = new FormData();
    const showPrice = priceMode === 'fixed';
    const priceNum = Number(String(price || '').trim());
    const resolvedPrice = showPrice && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : 0;
    const warrantyNum = Number(String(warrantyMonths || '').trim());
    const serviceStatus = isActive ? 'ACTIVE' : 'INACTIVE';
    const fullDescription = buildDescriptionHtml();
    const shortDescription = String(introText || '').trim();
    const title = String(itemName || '').trim();
    formData.append('itemName', String(itemName || '').trim());
    formData.append('sku', String(sku || '').trim());
    formData.append('itemType', 'SERVICE');
    formData.append('showPrice', showPrice ? 'true' : 'false');
    formData.append('price', String(resolvedPrice));
    formData.append('description', fullDescription);
    formData.append('unit', String(unit || '').trim());
    formData.append('isActive', isActive ? 'true' : 'false');
    // Service API compatibility fields
    formData.append('status', serviceStatus);
    formData.append('title', title);
    formData.append('shortDescription', shortDescription);
    formData.append('fullDescription', fullDescription);
    formData.append('displayPrice', String(resolvedPrice));
    formData.append('show_price', showPrice ? 'true' : 'false');
    formData.append('display_price', String(resolvedPrice));
    formData.append('short_description', shortDescription);
    formData.append('full_description', fullDescription);
    if (Number.isFinite(warrantyNum) && warrantyNum >= 0) formData.append('warrantyDurationMonths', String(Math.trunc(warrantyNum)));
    if (catalogItemId) {
      formData.append('catalogItemId', String(catalogItemId));
      formData.append('itemId', String(catalogItemId));
    }
    if (serviceServiceId) {
      formData.append('serviceServiceId', String(serviceServiceId));
      formData.append('service_service_id', String(serviceServiceId));
    }
    if (thumbnailFile) formData.append('thumbnailFile', thumbnailFile);
    mediaFiles.forEach((entry) => { if (entry?.file) formData.append('mediaFiles', entry.file); });
    return formData;
  }, [buildDescriptionHtml, introText, isActive, itemName, mediaFiles, price, priceMode, sku, thumbnailFile, unit, warrantyMonths]);

  const buildCatalogPayload = useCallback(() => {
    const warrantyNum = Number(String(warrantyMonths || '').trim());
    const priceNum = Number(String(price || '').trim());
    const showPrice = priceMode === 'fixed';
    return {
      itemName: String(itemName || '').trim(),
      itemType: 'SERVICE',
      warrantyDurationMonths: Number.isFinite(warrantyNum) ? Math.max(0, Math.trunc(warrantyNum)) : 0,
      serviceServiceId: 0,
      sku: String(sku || '').trim(),
      price: showPrice && Number.isFinite(priceNum) ? priceNum : 0,
      showPrice,
      description: stripHtml(buildDescriptionHtml()),
      unit: String(unit || '').trim(),
      comboDurationMonths: 0,
      comboDescription: '',
      isRecurring: false,
      brandId: Number(brandId),
      productLineId: Number(productLineId),
      itemCategoryId: Number(itemCategoryId),
      isActive,
    };
  }, [brandId, buildDescriptionHtml, isActive, itemCategoryId, itemName, price, priceMode, productLineId, sku, unit, warrantyMonths]);

  const validateBeforeSubmit = useCallback(() => {
    const nextErrors = {};
    if (!String(itemName || '').trim()) nextErrors.itemName = 'Vui lòng nhập tên dịch vụ.';
    if (!String(sku || '').trim()) nextErrors.sku = 'Vui lòng nhập SKU.';
    if (!String(introText || '').trim()) nextErrors.introText = 'Vui lòng nhập phần giới thiệu.';
    if (!stripHtml(detailHtml)) nextErrors.detailHtml = 'Vui lòng nhập chi tiết dịch vụ.';
    if (!thumbnailFile && !thumbnailPreview) nextErrors.thumbnailFile = 'Vui lòng chọn ảnh đại diện.';
    if (priceMode === 'fixed') {
      const priceNum = Number(String(price || '').trim());
      if (!Number.isFinite(priceNum) || priceNum < 0) nextErrors.price = 'Vui lòng nhập giá hợp lệ.';
    }
    if (isCreateNew) {
      if (!toNullablePositiveNumber(brandId)) nextErrors.brandId = 'Nhập Brand ID hợp lệ để tạo Catalog.';
      if (!toNullablePositiveNumber(productLineId)) nextErrors.productLineId = 'Nhập Product Line ID hợp lệ để tạo Catalog.';
      if (!toNullablePositiveNumber(itemCategoryId)) nextErrors.itemCategoryId = 'Nhập Category ID hợp lệ để tạo Catalog.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [brandId, detailHtml, introText, isCreateNew, itemCategoryId, itemName, price, priceMode, productLineId, sku, thumbnailFile, thumbnailPreview]);

  const handleSubmit = useCallback(async () => {
    if (!validateBeforeSubmit()) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      if (isEdit) {
        const updateData = buildServiceFormData(baseItem.itemId, getServiceServiceId(baseItem));
        await updateBlog(baseItem.itemId, updateData, token);
        notify('Cập nhật Blog dịch vụ thành công!', 'success');
        onSaved();
        return;
      }
      let catalogItemId = toNullablePositiveNumber(baseItem.itemId);
      let serviceServiceId = getServiceServiceId(baseItem);
      if (isCreateNew) {
        const createCatalogRes = await createWarehouseCatalogItem(buildCatalogPayload(), token);
        const createdCatalog = extractPayload(createCatalogRes);
        catalogItemId = toNullablePositiveNumber(createdCatalog?.itemId ?? createdCatalog?.catalogItemId ?? createdCatalog?.id);
        serviceServiceId = getServiceServiceId(createdCatalog) || serviceServiceId;
        if (!catalogItemId) throw new Error('Không nhận được catalogItemId sau khi tạo Catalog.');
      }
      const serviceFormData = buildServiceFormData(catalogItemId, serviceServiceId);
      if (isCreateFromCatalog && catalogItemId) {
        try {
          const updateRes = await updateBlog(catalogItemId, serviceFormData, token);
          serviceServiceId = getServiceServiceId(extractPayload(updateRes)) || serviceServiceId;
        } catch {
          const createRes = await createBlog(serviceFormData, token);
          serviceServiceId = getServiceServiceId(extractPayload(createRes)) || serviceServiceId;
          if (serviceServiceId) {
            const linkFormData = buildServiceFormData(catalogItemId, serviceServiceId);
            await updateBlog(catalogItemId, linkFormData, token);
          }
        }
      } else {
        const createRes = await createBlog(serviceFormData, token);
        serviceServiceId = getServiceServiceId(extractPayload(createRes)) || serviceServiceId;
        if (catalogItemId && serviceServiceId) {
          const linkFormData = buildServiceFormData(catalogItemId, serviceServiceId);
          try {
            await updateBlog(catalogItemId, linkFormData, token);
          } catch {
            // Keep successful creation result even if link refresh endpoint fails.
          }
        }
      }
      if (catalogItemId) {
        try {
          const verifyRes = await fetchCatalogItemDetail(catalogItemId, token);
          const verifiedServiceId = getServiceServiceId(extractPayload(verifyRes));
          serviceServiceId = verifiedServiceId || serviceServiceId;
        } catch {
          // Keep local service id if detail endpoint is temporarily unavailable.
        }
      }
      if (isCreateFromCatalog && !serviceServiceId) {
        throw new Error('Đã tạo blog nhưng chưa liên kết vào catalog. Vui lòng thử lại.');
      }
      notify('Tạo Blog dịch vụ thành công!', 'success');
      onSaved();
    } catch (err) {
      notify(err?.message || 'Thao tác thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [baseItem, buildCatalogPayload, buildServiceFormData, isCreateFromCatalog, isCreateNew, isEdit, notify, onSaved, validateBeforeSubmit]);

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modalContentWide}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{modalTitle}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Đóng">x</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.sectionTitle}>Thông tin Blog dịch vụ</div>
          <div className={styles.field}>
            <label htmlFor="item-name">Tiêu đề dịch vụ <span className={styles.required}>*</span></label>
            <input id="item-name" type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="VD: Chỉnh thước lái (độ chụm)" disabled={isSubmitting || isCreateFromCatalog} />
            {errors.itemName && <span className={styles.fieldError}>{errors.itemName}</span>}
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="item-sku">SKU <span className={styles.required}>*</span></label>
              <input id="item-sku" type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: BLOG-MICHELIN-001" disabled={isSubmitting || isCreateFromCatalog} />
              {errors.sku && <span className={styles.fieldError}>{errors.sku}</span>}
            </div>
            <div className={styles.field}>
              <label>Loại giá</label>
              <div className={styles.priceModeRow}>
                <label className={styles.priceChoice}><input type="radio" name="price-mode" value="contact" checked={priceMode === 'contact'} onChange={() => setPriceMode('contact')} disabled={isSubmitting} />Liên hệ</label>
                <label className={styles.priceChoice}><input type="radio" name="price-mode" value="fixed" checked={priceMode === 'fixed'} onChange={() => setPriceMode('fixed')} disabled={isSubmitting} />Nhập giá</label>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="item-price">Giá dịch vụ</label>
              {priceMode === 'fixed' ? (
                <><input id="item-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="VD: 450000" disabled={isSubmitting} />{errors.price && <span className={styles.fieldError}>{errors.price}</span>}</>
              ) : (
                <div className={styles.readonlyValue}>Giá: Liên hệ</div>
              )}
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="item-thumb">Ảnh đại diện <span className={styles.required}>*</span></label>
            <input id="item-thumb" type="file" accept="image/*" onChange={handleThumbnailChange} disabled={isSubmitting} />
            {errors.thumbnailFile && <span className={styles.fieldError}>{errors.thumbnailFile}</span>}
            {thumbnailPreview && <div className={styles.thumbPreviewWrap}><img src={thumbnailPreview} alt="Thumbnail" className={styles.thumbPreviewLarge} onError={(e) => { e.target.style.display = 'none'; }} /></div>}
          </div>
          <div className={styles.autoGenRow}>
            <button type="button" className={styles.autoGenButton} onClick={() => autoGenerateContentFromImage(thumbnailFile, { force: true })} disabled={isSubmitting || isAutoGenerating}>
              {isAutoGenerating ? 'Đang phân tích ảnh...' : 'Tạo lại Giới thiệu & Chi tiết từ ảnh'}
            </button>
            <span className={styles.autoGenHint}>{autoGenHint || 'Nội dung sẽ được tự động gợi ý sau khi chọn ảnh đại diện.'}</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="intro-text">Giới thiệu <span className={styles.required}>*</span></label>
            <textarea id="intro-text" rows={4} value={introText} onChange={(e) => setIntroText(e.target.value)} placeholder="Mô tả ngắn về lợi ích dịch vụ..." disabled={isSubmitting} />
            {errors.introText && <span className={styles.fieldError}>{errors.introText}</span>}
          </div>
          <div className={styles.field}>
            <label>Chi tiết dịch vụ <span className={styles.required}>*</span></label>
            <div className={styles.editorToolbar}>
              <button type="button" className={styles.editorToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('bold')}><strong>B</strong></button>
              <button type="button" className={styles.editorToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('italic')}><em>I</em></button>
              <button type="button" className={styles.editorToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('uppercase')}>UPPER</button>
              <button type="button" className={styles.editorToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ol')}>OL</button>
              <button type="button" className={styles.editorToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ul')}>UL</button>
            </div>
            <div ref={editorRef} className={styles.richEditor} contentEditable={!isSubmitting} suppressContentEditableWarning onInput={syncDetailFromEditor} onBlur={syncDetailFromEditor} />
            {errors.detailHtml && <span className={styles.fieldError}>{errors.detailHtml}</span>}
            <div className={styles.editorHint}>Output HTML dùng các thẻ {'<strong>'}, {'<em>'}, span uppercase, {'<ol>'}, {'<ul>'}.</div>
          </div>
          <div className={styles.field}>
            <label htmlFor="item-media">Thư viện hình ảnh / video (tùy chọn)</label>
            <input id="item-media" type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} disabled={isSubmitting} />
            {mediaFiles.length > 0 && <div className={styles.mediaGrid}>{mediaFiles.map((entry, index) => <div key={`${entry.file?.name || 'media'}-${index}`} className={styles.mediaThumb}>{entry.file?.type?.startsWith('video') ? <video src={entry.previewUrl} controls className={styles.mediaImg} /> : <img src={entry.previewUrl} alt={entry.file?.name || 'media'} className={styles.mediaImg} />}<button type="button" className={styles.removeMediaBtn} onClick={() => removeMedia(index)} title="Xóa">x</button></div>)}</div>}
          </div>
          <div className={styles.sectionTitle}>Thông tin hệ thống</div>
          {isCreateNew && <div className={styles.fieldRow}><div className={styles.field}><label htmlFor="brand-id">Brand ID</label><input id="brand-id" type="number" min="1" value={brandId} onChange={(e) => setBrandId(e.target.value)} placeholder="Nhập brandId" disabled={isSubmitting} />{errors.brandId && <span className={styles.fieldError}>{errors.brandId}</span>}</div><div className={styles.field}><label htmlFor="product-line-id">Product Line ID</label><input id="product-line-id" type="number" min="1" value={productLineId} onChange={(e) => setProductLineId(e.target.value)} placeholder="Nhập productLineId" disabled={isSubmitting} />{errors.productLineId && <span className={styles.fieldError}>{errors.productLineId}</span>}</div><div className={styles.field}><label htmlFor="category-id">Category ID</label><input id="category-id" type="number" min="1" value={itemCategoryId} onChange={(e) => setItemCategoryId(e.target.value)} placeholder="Nhập itemCategoryId" disabled={isSubmitting} />{errors.itemCategoryId && <span className={styles.fieldError}>{errors.itemCategoryId}</span>}</div></div>}
          <div className={styles.fieldRow}>
            <div className={styles.field}><label htmlFor="item-unit">Đơn vị</label><input id="item-unit" type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="VD: Lần" disabled={isSubmitting} /></div>
            <div className={styles.field}><label htmlFor="item-warranty">Bảo hành (tháng)</label><input id="item-warranty" type="number" min="0" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} placeholder="VD: 12" disabled={isSubmitting} /></div>
            <div className={styles.field}><label htmlFor="item-status">Trạng thái</label><select id="item-status" value={String(isActive)} onChange={(e) => setIsActive(e.target.value === 'true')} disabled={isSubmitting}><option value="true">Hoạt động</option><option value="false">Không hoạt động</option></select></div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Hủy</button>
          <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting || isAutoGenerating}>{isSubmitting ? 'Đang xử lý...' : isEdit ? 'Lưu thay đổi' : 'Tạo mới'}</button>
        </div>
      </div>
    </div>
  );
}
