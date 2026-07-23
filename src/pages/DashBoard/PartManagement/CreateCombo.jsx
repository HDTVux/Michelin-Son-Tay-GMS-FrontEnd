import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchCatalogItems, createServiceForCatalog } from '../../../services/blogService.js';
import { saveComboItems } from '../../../services/comboService.js';
import {
  createWarehouseCatalogItem,
  searchWarehouseCatalogItemsDetail,
  fetchWarehouseItemCategories,
  fetchWarehouseBrands,
  fetchWarehouseProductLines,
} from '../../../services/warehouseService.js';
import { sendAiMessage } from '../../../services/aiAssistantService.js';
import styles from './ServiceManagement.module.css';
import { Search, X, Plus, Trash2, Layers, Sparkles } from 'lucide-react';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
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

const getLotsForCatalogItem = (catalogItem) => {
  if (!catalogItem) return [];
  const warehouses = catalogItem.warehouseDetails || [];
  const lots = [];
  warehouses.forEach((w) => {
    if (Array.isArray(w.lots)) {
      w.lots.forEach((lot) => {
        if ((lot.remainingQuantity || 0) > 0) {
          lots.push({
            ...lot,
            warehouseId: w.warehouseId,
            warehouseName: w.warehouseName || w.warehouseCode || `Kho #${w.warehouseId}`,
          });
        }
      });
    }
  });
  return lots;
};

export default function CreateCombo() {
  useScrollToTop();
  const navigate = useNavigate();
  const notify = useCallback((msg, type = 'error') => {
    toast[type](msg, { containerId: 'app-toast' });
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combo master fields
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [showPrice, setShowPrice] = useState(true);
  const [comboDurationMonths, setComboDurationMonths] = useState(12);
  const [isRecurring, setIsRecurring] = useState(false);
  const [comboDescription, setComboDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Reference lists (defaults to avoid FK violations, mirrors ComboManagement)
  const [catalogList, setCatalogList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productLines, setProductLines] = useState([]);

  // Sub-items (parts/services in combo)
  const [subItems, setSubItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState(null);
  const [odometerKmToAdd, setOdometerKmToAdd] = useState(0);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [allocationMethodToAdd, setAllocationMethodToAdd] = useState('FIFO');
  const [entryItemIdToAdd, setEntryItemIdToAdd] = useState('');

  // Blog/article fields (created together with the combo, like CreateProduct)
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [introText, setIntroText] = useState('');
  const [detailHtml, setDetailHtml] = useState('');
  const [blogMediaFiles, setBlogMediaFiles] = useState([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTokenUsage, setAiTokenUsage] = useState(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    const loadCatalogData = async () => {
      try {
        const [servicesRes, partsRes, categoriesRes, brandsRes, productLinesRes] = await Promise.all([
          searchWarehouseCatalogItemsDetail({ size: 1000, itemType: 'SERVICE' }, token).catch(() => null),
          searchWarehouseCatalogItemsDetail({ size: 1000, itemType: 'PART' }, token).catch(() => null),
          fetchWarehouseItemCategories(token).catch(() => null),
          fetchWarehouseBrands(token).catch(() => null),
          fetchWarehouseProductLines(token).catch(() => null),
        ]);
        const extractList = (res) => {
          const payload = res?.data?.data ?? res?.data ?? res;
          return Array.isArray(payload?.content) ? payload.content : (Array.isArray(payload) ? payload : []);
        };
        setCatalogList([...extractList(servicesRes), ...extractList(partsRes)]);

        const catsPayload = categoriesRes?.data?.data ?? categoriesRes?.data ?? categoriesRes ?? [];
        setCategories(Array.isArray(catsPayload) ? catsPayload : (Array.isArray(catsPayload?.content) ? catsPayload.content : []));

        const brandsPayload = brandsRes?.data?.data ?? brandsRes?.data ?? brandsRes ?? [];
        setBrands(Array.isArray(brandsPayload) ? brandsPayload : (Array.isArray(brandsPayload?.content) ? brandsPayload.content : []));

        const plsPayload = productLinesRes?.data?.data ?? productLinesRes?.data ?? productLinesRes ?? [];
        setProductLines(Array.isArray(plsPayload) ? plsPayload : (Array.isArray(plsPayload?.content) ? plsPayload.content : []));
      } catch (err) {
        console.error('Failed to load catalog items for combo creation:', err);
      }
    };
    loadCatalogData();
  }, []);

  const catalogMap = useMemo(() => {
    const map = new Map();
    catalogList.forEach((item) => {
      if (item.itemId != null) map.set(Number(item.itemId), item);
    });
    return map;
  }, [catalogList]);

  const filteredCatalog = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    return catalogList.filter((item) => {
      const matchName = String(item.itemName || '').toLowerCase().includes(query);
      const matchSku = String(item.sku || '').toLowerCase().includes(query);
      return matchName || matchSku;
    }).slice(0, 10);
  }, [catalogList, searchQuery]);

  const handleAddLocalItem = () => {
    if (!selectedItemToAdd) return;
    const includedItemId = Number(selectedItemToAdd.itemId);
    const quantity = Number(quantityToAdd) || 1;
    const odometerKm = Number(odometerKmToAdd) || 0;
    const allocationMethod = selectedItemToAdd.itemType === 'PART' ? allocationMethodToAdd : 'FIFO';
    const entryItemId = (selectedItemToAdd.itemType === 'PART' && allocationMethod === 'MANUAL' && entryItemIdToAdd)
      ? Number(entryItemIdToAdd)
      : null;

    const duplicateIndex = subItems.findIndex(
      (item) => Number(item.includedItemId) === includedItemId
        && Number(item.odometerKm || 0) === odometerKm
        && (item.allocationMethod || 'FIFO') === allocationMethod
        && (item.entryItemId || null) === entryItemId,
    );

    if (duplicateIndex !== -1) {
      const next = [...subItems];
      next[duplicateIndex].quantity = (next[duplicateIndex].quantity || 0) + quantity;
      setSubItems(next);
    } else {
      setSubItems([...subItems, { includedItemId, quantity, odometerKm, allocationMethod, entryItemId }]);
    }

    setSelectedItemToAdd(null);
    setSearchQuery('');
    setQuantityToAdd(1);
    setOdometerKmToAdd(0);
    setAllocationMethodToAdd('FIFO');
    setEntryItemIdToAdd('');
  };

  const handleRemoveLocalItem = (index) => {
    const next = [...subItems];
    next.splice(index, 1);
    setSubItems(next);
  };

  const handleQtyChange = (index, value) => {
    const next = [...subItems];
    next[index].quantity = Math.max(1, Number(value) || 1);
    setSubItems(next);
  };

  const handleOdometerChange = (index, value) => {
    const next = [...subItems];
    next[index].odometerKm = Math.max(0, Number(value) || 0);
    setSubItems(next);
  };

  const handleAllocationMethodChange = (index, value) => {
    const next = [...subItems];
    next[index].allocationMethod = value;
    if (value === 'FIFO') {
      next[index].entryItemId = null;
    } else {
      const matchedCatalog = catalogMap.get(Number(next[index].includedItemId));
      const lots = getLotsForCatalogItem(matchedCatalog);
      next[index].entryItemId = lots[0]?.entryItemId || null;
    }
    setSubItems(next);
  };

  const handleEntryItemIdChange = (index, value) => {
    const next = [...subItems];
    next[index].entryItemId = value ? Number(value) : null;
    setSubItems(next);
  };

  // ── Blog editor helpers (mirrors CreateProduct.jsx / BlogFormModal.jsx) ──
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

  // ── AI Article Auto-Generator & Token Calculator ──
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

  const generateFallbackComboArticle = useCallback((promptText = '') => {
    const title = String(itemName || 'Gói Combo bảo dưỡng xe chuyên nghiệp').trim();
    const formattedPrice = price ? `${Number(price).toLocaleString('vi-VN')} VNĐ` : 'Ưu đãi liên hệ';
    const duration = comboDurationMonths ? `${comboDurationMonths} tháng` : 'Theo quy chuẩn nhà sản xuất';

    const subItemsFormatted = subItems.map((item) => {
      const matched = catalogMap.get(Number(item.includedItemId));
      return matched?.itemName ? `${matched.itemName} (Số lượng: ${item.quantity || 1})` : null;
    }).filter(Boolean);

    const intro = `Gói ${title} tại Michelin Sơn Tây giúp xế yêu vận hành êm ái, bền bỉ với chi phí ưu đãi trọn gói chỉ ${formattedPrice}. Quy trình thi công đạt chuẩn quốc tế cùng chính sách bảo hành uy tín ${duration}.`;

    const detailHtmlContent = `
<h3>Giới thiệu gói ${title}</h3>
<p>Dịch vụ <strong>${title}</strong> tại Garage Michelin Sơn Tây là sự kết hợp hoàn hảo giữa các hạng mục chăm sóc xe chuyên sâu và phụ tùng chính hãng. Gói dịch vụ giúp tối ưu hiệu suất động cơ, đảm bảo an toàn tuyệt đối cho hành trình của bạn.</p>

<h3>Các hạng mục nổi bật trong gói Combo</h3>
${subItemsFormatted.length > 0
  ? `<ul>${subItemsFormatted.map((name) => `<li><strong>${name}</strong></li>`).join('')}</ul>`
  : `<p>Combo bao gồm kiểm tra xe tổng thể, thay dầu nhớt động cơ cao cấp, kiểm tra cân chỉnh hệ thống lốp xe, bảo dưỡng hệ thống phanh và kiểm tra bình ắc quy.</p>`
}

<h3>Cam kết chất lượng từ Michelin Sơn Tây</h3>
<p>Tất cả sản phẩm và thiết bị thi công cam kết <strong>chính hãng 100%</strong>. Áp dụng chính sách bảo hành <strong>${duration}</strong>. Đội ngũ kỹ thuật viên giàu kinh nghiệm trực tiếp thực hiện và kiểm định chất lượng trước khi bàn giao xe cho khách hàng.</p>
    `.trim();

    setIntroText(intro);
    setDetailHtml(detailHtmlContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = detailHtmlContent;
    }
    const usage = calculateTokenUsage(promptText, intro, detailHtmlContent, null);
    setAiTokenUsage(usage);
  }, [itemName, price, comboDurationMonths, subItems, catalogMap, calculateTokenUsage]);

  const handleAiGenerateArticle = useCallback(async () => {
    if (isAiGenerating) return;

    const title = String(itemName || '').trim();
    const subItemsFormatted = subItems.map((item) => {
      const matched = catalogMap.get(Number(item.includedItemId));
      return matched?.itemName ? `${matched.itemName} (Số lượng: ${item.quantity || 1})` : null;
    }).filter(Boolean);

    const prompt = `Bạn là chuyên gia truyền thông ô tô của Garage Michelin Sơn Tây. Hãy viết một bài viết giới thiệu thật hấp dẫn, chuyên nghiệp và đầy đủ thông tin cho Gói Combo bảo dưỡng sau:
- Tên gói Combo: ${title || 'Gói bảo dưỡng xe định kỳ'}
- Giá gói Combo: ${price ? Number(price).toLocaleString('vi-VN') + ' VNĐ' : 'Ưu đãi liên hệ'}
- Thời gian bảo hành/hiệu lực: ${comboDurationMonths ? comboDurationMonths + ' tháng' : 'Theo quy định'}
- Các dịch vụ & phụ tùng đi kèm trong gói: ${subItemsFormatted.length > 0 ? subItemsFormatted.join(', ') : 'Kiểm tra xe tổng thể, thay dầu nhớt chính hãng, cân chỉnh lốp và phanh'}
- Ghi chú/Mô tả từ Garage: ${comboDescription || 'Hạng mục bảo dưỡng tối ưu cho xế yêu'}

YÊU CẦU ĐỊNH DẠNG:
Hãy trả về duy nhất 1 đoạn JSON chuẩn không chứa mã markdown backtick với cấu trúc:
{
  "intro": "Phần tóm tắt ngắn 2-3 câu làm nổi bật điểm sáng của gói combo...",
  "detailHtml": "<h3>Giới thiệu gói Combo</h3><p>...</p><h3>Hạng mục chi tiết</h3><ul><li>...</li></ul><h3>Quyền lợi bảo dưỡng</h3><p>...</p>"
}`;

    try {
      setIsAiGenerating(true);

      const res = await sendAiMessage({ message: prompt }).catch(() => null);
      const replyText = res?.reply ?? res?.data?.reply ?? (typeof res === 'string' ? res : '');
      const usageData = res?.usage ?? res?.data?.usage;

      if (replyText) {
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

      generateFallbackComboArticle(prompt);
    } catch {
      generateFallbackComboArticle(prompt);
    } finally {
      setIsAiGenerating(false);
    }
  }, [itemName, price, comboDurationMonths, subItems, comboDescription, catalogMap, isAiGenerating, calculateTokenUsage, generateFallbackComboArticle]);

  useEffect(() => {
    if (!editorRef.current) return;
    const normalized = normalizeEditorHtml(detailHtml);
    if (editorRef.current.innerHTML !== normalized) editorRef.current.innerHTML = normalized;
  }, [detailHtml]);

  const handleThumbnailChange = useCallback((e) => {
    const file = e?.target?.files?.[0] ?? null;
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    if (!file) {
      setThumbnailFile(null);
      setThumbnailPreview('');
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }, [thumbnailPreview]);

  const handleBlogMediaChange = useCallback((e) => {
    const files = Array.from(e?.target?.files ?? []);
    const next = files.map((file) => ({
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setBlogMediaFiles((prev) => [...prev, ...next]);
    e.target.value = '';
  }, []);

  const removeBlogMedia = useCallback((index) => {
    setBlogMediaFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!itemName.trim()) {
      notify('Vui lòng nhập tên gói Combo.');
      return;
    }
    let finalIntroText = String(introText || '').trim();
    let finalDetailHtml = detailHtml;
    if (!finalIntroText && !stripHtml(finalDetailHtml)) {
      const descTrim = String(comboDescription || '').trim();
      if (descTrim) {
        finalIntroText = descTrim;
        finalDetailHtml = `<p>${escapeHtml(descTrim)}</p>`;
      } else {
        notify('Vui lòng nhập mô tả gói Combo hoặc nội dung bài viết (Giới thiệu/Chi tiết).');
        return;
      }
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập.');
      return;
    }

    try {
      setIsSubmitting(true);

      const defaultSku = `CB-${Date.now().toString().slice(-6)}`;
      const firstActiveCategory = categories[0]?.workCategoryId || categories[0]?.itemCategoryId || 1;
      const firstActiveBrand = brands[0]?.brandId || 1;
      const firstActiveProductLine = productLines[0]?.productLineId || 1;

      const masterPayload = {
        itemName: itemName.trim(),
        itemType: 'COMBO',
        sku: defaultSku,
        price: price ? Number(price) : 0,
        showPrice,
        description: comboDescription.trim(),
        comboDescription: comboDescription.trim(),
        comboDurationMonths: Number(comboDurationMonths) || 0,
        isRecurring,
        brandId: firstActiveBrand,
        productLineId: firstActiveProductLine,
        product_line_id: firstActiveProductLine,
        itemCategoryId: firstActiveCategory,
        workCategoryId: firstActiveCategory,
        isActive: isActive ? 1 : 0,
      };

      const createCatalogRes = await createWarehouseCatalogItem(masterPayload, token);
      const createdCatalog = extractPayload(createCatalogRes);
      const catalogItemId = Number(createdCatalog?.itemId ?? createdCatalog?.catalogItemId ?? createdCatalog?.id ?? 0) || null;
      if (!catalogItemId) {
        throw new Error('Không lấy được ID của gói Combo sau khi tạo.');
      }

      if (subItems.length > 0) {
        const subItemsPayload = subItems.map((item) => ({
          comboId: catalogItemId,
          includedItemId: item.includedItemId,
          quantity: item.quantity,
          odometerKm: item.odometerKm || 0,
          allocationMethod: item.allocationMethod || 'FIFO',
          entryItemId: item.entryItemId || null,
        }));
        try {
          await saveComboItems(catalogItemId, subItemsPayload, token);
        } catch (subErr) {
          notify(`Đã tạo Combo nhưng lưu thành phần con thất bại: ${subErr.message}`);
        }
      }

      try {
        const formData = new FormData();
        const title = itemName.trim();
        const resolvedPrice = showPrice ? (Number(price) || 0) : 0;
        const fullDescription = composeDescriptionHtml(finalIntroText, finalDetailHtml);
        formData.append('title', title);
        formData.append('itemName', title);
        formData.append('sku', defaultSku);
        formData.append('itemCode', defaultSku);
        formData.append('comboCode', defaultSku);
        formData.append('price', String(resolvedPrice));
        formData.append('shortDescription', finalIntroText);
        formData.append('fullDescription', fullDescription);
        formData.append('showPrice', showPrice ? 'true' : 'false');
        formData.append('displayPrice', String(resolvedPrice));
        formData.append('status', isActive ? 'ACTIVE' : 'INACTIVE');
        formData.append('catalogItemId', String(catalogItemId));
        const durationNum = Number(comboDurationMonths);
        if (Number.isFinite(durationNum) && durationNum >= 0) {
          formData.append('estimateTime', String(Math.trunc(durationNum)));
        }
        if (thumbnailFile) formData.append('thumbnailFile', thumbnailFile);
        blogMediaFiles.forEach((m) => {
          if (m.file) formData.append('mediaFiles', m.file);
        });

        await createServiceForCatalog(catalogItemId, formData, token);
        notify(`Đã tạo gói Combo "${title}" và bài viết hiển thị trên landing page thành công!`, 'success');
      } catch (blogErr) {
        notify(`Đã tạo gói Combo nhưng tạo bài viết thất bại: ${blogErr.message}`);
      }

      navigate('/combo-management');
    } catch (err) {
      notify(err?.message || 'Không thể tạo gói Combo.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting, itemName, introText, detailHtml, comboDescription, categories, brands, productLines,
    price, showPrice, comboDurationMonths, isRecurring, isActive, subItems, thumbnailFile, blogMediaFiles,
    notify, navigate,
  ]);

  return (
    <div className={styles['service-page']}>
      <div className={styles['service-header']}>
        <div className={styles['service-header-title']}>
          <span className={styles['header-icon']}>
            <Layers size={24} style={{ color: '#9333ea' }} />
          </span>
          <h1>Tạo gói Combo mới</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={styles['ghost-button']}
            onClick={() => navigate('/combo-management')}
            disabled={isSubmitting}
          >
            Quay lại
          </button>
          <button
            type="button"
            className={styles['primary-button']}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo gói Combo'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles['service-card']}>
          {/* Header section: Avatar + Combo Name */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>
            {/* Avatar Image Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '16px',
                  border: thumbnailPreview ? '2px solid #e2e8f0' : '2px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9333ea';
                  e.currentTarget.style.backgroundColor = '#faf5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = thumbnailPreview ? '#e2e8f0' : '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
              >
                {thumbnailPreview ? (
                  <>
                    <img
                      src={thumbnailPreview}
                      alt="Combo Thumbnail Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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
                onChange={handleThumbnailChange}
                style={{ display: 'none' }}
                disabled={isSubmitting}
              />

              {thumbnailPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
                    setThumbnailFile(null);
                    setThumbnailPreview('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
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

            {/* Tên gói Combo */}
            <div className={styles['pending-filters']} style={{ flex: 1, marginBottom: 0, marginTop: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '14px', color: '#1e293b' }}>
                Tên gói Combo bảo dưỡng *
              </div>
              <div className="ui-field" style={{ marginBottom: 0 }}>
                <input
                  id="itemName"
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ví dụ: Gói bảo dưỡng cấp 10.000km cho xe sedan"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 1: Thông tin gói Combo */}
          <div className={styles['pending-filters']} style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '15px', color: '#0f172a' }}>
              1) Thông tin gói Combo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {/* Đơn giá trọn gói (₫) + Toggle Hiển thị giá */}
              <div className="ui-field" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label htmlFor="price" style={{ marginBottom: 0, fontWeight: 500 }}>Giá bán trọn gói (₫)</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#6b7280', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      disabled={isSubmitting}
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
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isSubmitting || !showPrice}
                  placeholder={showPrice ? "Nhập giá bán trọn gói..." : "Liên hệ"}
                />
              </div>

              {/* Thời hạn combo */}
              <div className="ui-field" style={{ marginBottom: 0 }}>
                <label htmlFor="comboDurationMonths" style={{ fontWeight: 500 }}>Thời hạn combo (tháng)</label>
                <input
                  id="comboDurationMonths"
                  type="number"
                  min="0"
                  value={comboDurationMonths}
                  onChange={(e) => setComboDurationMonths(Number(e.target.value))}
                  disabled={isSubmitting}
                  placeholder="12"
                />
              </div>
            </div>

            {/* Dynamic toggles row (Định kỳ & Hoạt động) */}
            <div style={{ display: 'flex', gap: 24, marginTop: 12, alignItems: 'center' }}>
              {/* Toggle: Định kỳ */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={isSubmitting}
                  style={{ display: 'none' }}
                />
                <span style={{
                  width: '32px',
                  height: '18px',
                  backgroundColor: isRecurring ? '#10b981' : '#d1d5db',
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
                    left: isRecurring ? '16px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }} />
                </span>
                <span style={{ fontWeight: 500 }}>Gói định kỳ</span>
              </label>

              {/* Toggle: Hoạt động */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                  style={{ display: 'none' }}
                />
                <span style={{
                  width: '32px',
                  height: '18px',
                  backgroundColor: isActive ? '#3b82f6' : '#d1d5db',
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
                    left: isActive ? '16px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }} />
                </span>
                <span style={{ fontWeight: 500 }}>Trạng thái hoạt động</span>
              </label>
            </div>

            {/* Mô tả gói combo */}
            <div className="ui-field" style={{ marginTop: 12, marginBottom: 0 }}>
              <label htmlFor="comboDescription" style={{ fontWeight: 500 }}>Mô tả ngắn gói Combo</label>
              <textarea
                id="comboDescription"
                rows={2}
                value={comboDescription}
                onChange={(e) => setComboDescription(e.target.value)}
                placeholder="Mô tả các hạng mục kiểm tra, thay thế..."
                disabled={isSubmitting}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Card 2: Thành phần phụ tùng & dịch vụ trong gói Combo */}
          <div className={styles['pending-filters']} style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '15px', color: '#0f172a' }}>
              2) Thành phần phụ tùng & dịch vụ trong gói Combo
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px auto', gap: 12, alignItems: 'end', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                    Tìm kiếm phụ tùng hoặc dịch vụ
                  </label>
                  {selectedItemToAdd ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #c084fc', padding: '6px 12px', borderRadius: 8, background: '#faf5ff' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 280, color: '#7e22ce' }}>
                        [{selectedItemToAdd.itemType === 'SERVICE' ? 'Dịch vụ' : 'Phụ tùng'}] {selectedItemToAdd.itemName}
                      </span>
                      <button type="button" onClick={() => setSelectedItemToAdd(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', display: 'flex', marginLeft: 'auto' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles['search-box']} style={{ padding: '6px 12px', minWidth: 'auto' }}>
                      <Search size={16} color="#94a3b8" />
                      <input
                        placeholder="Gõ tên sản phẩm con để tìm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                  {!selectedItemToAdd && filteredCatalog.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      {filteredCatalog.map((item) => (
                        <div
                          key={item.itemId}
                          onClick={() => { setSelectedItemToAdd(item); setSearchQuery(''); }}
                          style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={(ev) => { ev.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={(ev) => { ev.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>[{item.itemType === 'SERVICE' ? 'DV' : 'PT'}] {item.itemName}</span>
                          <span style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>SKU: {item.sku || '-'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Mốc bảo dưỡng</label>
                  <select
                    value={String(odometerKmToAdd)}
                    onChange={(e) => setOdometerKmToAdd(Number(e.target.value))}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff', outline: 'none' }}
                    disabled={isSubmitting}
                  >
                    <option value="0">Mặc định (Mọi mốc)</option>
                    <option value="5000">5.000 km</option>
                    <option value="10000">10.000 km</option>
                    <option value="20000">20.000 km</option>
                    <option value="40000">40.000 km</option>
                    <option value="80000">80.000 km</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={quantityToAdd}
                    onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }}
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="button"
                  className={styles['primary-button']}
                  onClick={handleAddLocalItem}
                  disabled={!selectedItemToAdd || isSubmitting}
                  style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', fontSize: 13 }}
                >
                  <Plus size={16} /> Thêm
                </button>
              </div>
            </div>

            {subItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', border: '2px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8', fontSize: 13.5 }}>
                Chưa có sản phẩm hoặc dịch vụ con nào được thêm vào gói Combo này.
              </div>
            ) : (
              <div className={styles['table-wrapper']} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <table className={styles['service-table']} style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>STT</th>
                      <th>TÊN PHỤ TÙNG / DỊCH VỤ CON</th>
                      <th style={{ width: 95 }}>LOẠI</th>
                      <th style={{ width: 140 }}>MỐC KM BẢO DƯỠNG</th>
                      <th style={{ width: 150 }}>PHƯƠNG THỨC CẤP PHÁT</th>
                      <th style={{ width: 220 }}>LÔ HÀNG THỦ CÔNG</th>
                      <th style={{ width: 90 }}>SỐ LƯỢNG</th>
                      <th style={{ width: 60, textAlign: 'center' }}>XÓA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subItems.map((item, idx) => {
                      const matchedCatalog = catalogMap.get(Number(item.includedItemId));
                      const isPart = matchedCatalog?.itemType === 'PART';
                      const lots = getLotsForCatalogItem(matchedCatalog);
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {matchedCatalog?.itemName || `Sản phẩm #${item.includedItemId}`}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                              Mã SKU: {matchedCatalog?.sku || '-'}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 600, color: isPart ? '#2563eb' : '#059669', background: isPart ? '#eff6ff' : '#ecfdf5', padding: '2px 8px', borderRadius: 4 }}>
                              {isPart ? 'Phụ tùng' : 'Dịch vụ'}
                            </span>
                          </td>
                          <td>
                            <select
                              value={String(item.odometerKm || 0)}
                              onChange={(e) => handleOdometerChange(idx, e.target.value)}
                              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 6px', fontSize: 12, background: '#fff' }}
                              disabled={isSubmitting}
                            >
                              <option value="0">Mặc định (Mọi mốc)</option>
                              <option value="5000">5.000 km</option>
                              <option value="10000">10.000 km</option>
                              <option value="20000">20.000 km</option>
                              <option value="40000">40.000 km</option>
                              <option value="80000">80.000 km</option>
                            </select>
                          </td>
                          <td>
                            {isPart ? (
                              <select
                                value={item.allocationMethod || 'FIFO'}
                                onChange={(e) => handleAllocationMethodChange(idx, e.target.value)}
                                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 6px', fontSize: 12, background: '#fff' }}
                                disabled={isSubmitting}
                              >
                                <option value="FIFO">FIFO (Tự động)</option>
                                <option value="MANUAL">Chọn lô thủ công</option>
                              </select>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: 12 }}>Tự động (FIFO)</span>
                            )}
                          </td>
                          <td>
                            {isPart && item.allocationMethod === 'MANUAL' ? (
                              <select
                                value={item.entryItemId || ''}
                                onChange={(e) => handleEntryItemIdChange(idx, e.target.value)}
                                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 6px', fontSize: 12, background: '#fff' }}
                                disabled={isSubmitting}
                              >
                                <option value="">-- Chọn lô hàng --</option>
                                {lots.map((lot) => (
                                  <option key={lot.entryItemId} value={lot.entryItemId}>
                                    {lot.entryCode} ({lot.warehouseName} - Còn {lot.remainingQuantity} - Giá {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lot.sellingPrice)})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>Không áp dụng</span>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              style={{ width: 55, border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px', textAlign: 'center', fontSize: 12 }}
                              disabled={isSubmitting}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemoveLocalItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} disabled={isSubmitting}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 3: Bài viết giới thiệu gói Combo (Hiển thị trên landing page) */}
          <div className={styles['pending-filters']} style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
                3) Bài viết giới thiệu gói Combo (hiển thị trên landing page)
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
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}>
                    <Sparkles size={13} style={{ color: '#6366f1' }} />
                    <span>Token sử dụng: <strong>{aiTokenUsage.totalTokens.toLocaleString('vi-VN')}</strong> (Input: {aiTokenUsage.promptTokens} | Output: {aiTokenUsage.responseTokens})</span>
                  </div>
                )}
                <button
                  type="button"
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
                    cursor: isAiGenerating || isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isAiGenerating || isSubmitting ? 0.7 : 1,
                  }}
                  onClick={handleAiGenerateArticle}
                  disabled={isAiGenerating || isSubmitting}
                  title="Tự động đọc thông tin form và sử dụng AI để tạo bài viết giới thiệu"
                >
                  <Sparkles size={16} />
                  <span>{isAiGenerating ? 'AI đang viết bài...' : '✨ AI tự động viết bài'}</span>
                </button>
              </div>
            </div>

            <div className="ui-field" style={{ marginBottom: 16 }}>
              <label htmlFor="introText" style={{ fontWeight: 500 }}>Tóm tắt ngắn (Intro)</label>
              <textarea
                id="introText"
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Nhập phần giới thiệu ngắn hoặc tóm tắt của bài viết..."
                style={{ minHeight: 80, width: '100%', resize: 'vertical' }}
                disabled={isSubmitting}
              />
            </div>

            <div className="ui-field" style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, marginBottom: 6 }}>Chi tiết bài viết gói Combo</label>
              <div className={styles['editor-toolbar']} style={{ marginBottom: 8 }}>
                <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('bold')}><strong>B</strong></button>
                <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('italic')}><em>I</em></button>
                <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('uppercase')}>UPPER</button>
                <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ol')}>OL</button>
                <button type="button" className={styles['editor-tool-btn']} onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbarClick('ul')}>UL</button>
              </div>
              <div
                ref={editorRef}
                className={styles['rich-editor']}
                contentEditable={!isSubmitting}
                suppressContentEditableWarning
                onInput={syncDetailFromEditor}
                onBlur={syncDetailFromEditor}
                style={{ minHeight: 200, border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, backgroundColor: '#fff', overflowY: 'auto' }}
              />
              <div className={styles['editor-hint']} style={{ marginTop: 6, fontSize: '12px', color: '#64748b' }}>
                Output HTML dùng các thẻ {'<strong>'}, {'<em>'}, span uppercase, {'<ol>'}, {'<ul>'}.
              </div>
            </div>

            <div className="ui-field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 500, marginBottom: 6 }}>Tải lên ảnh/video bổ sung cho bài viết (Media)</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleBlogMediaChange}
                style={{ padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, width: '100%', background: '#fff' }}
                disabled={isSubmitting}
              />
              {blogMediaFiles.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  {blogMediaFiles.map((m, idx) => (
                    <div key={m.id || idx} style={{ position: 'relative', width: 84, height: 84, borderRadius: 8, border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      {m.file?.type?.startsWith('video') ? (
                        <video src={m.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={m.previewUrl} alt="media preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => removeBlogMedia(idx)}
                        style={{ position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Bottom Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button
              type="button"
              className={styles['ghost-button']}
              onClick={() => navigate('/combo-management')}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={styles['primary-button']}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo gói Combo & bài viết'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
