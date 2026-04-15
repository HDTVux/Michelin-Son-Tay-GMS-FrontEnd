import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createPromotion,
  fetchAllPromotions,
  fetchAvailablePromotions,
  updatePromotion,
} from '../../../services/promotionService.js';
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
};

const PROMOTION_CODE_PATTERN = /^[A-Z0-9_-]+$/;

const normalizePromotionCode = (value) => String(value ?? '').trim().toUpperCase();

const isPositiveIntegerValue = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
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

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const normalizedFormType = normalizeTypeValue(form.type);
  const isBuyXGetY = normalizedFormType === 'BUY_X_GET_Y';
  const isPercentType = normalizedFormType === 'PERCENT';

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((item) =>
      `${item?.promotionId ?? ''} ${item?.code ?? ''} ${item?.name ?? ''} ${item?.type ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [promotions, search]);

  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p) => p?.isActive).length;
    return { total, active, inactive: total - active };
  }, [promotions]);

  const openCreate = () => {
    setEditing(false);
    setForm(defaultForm);
    setFormErrors({});
    setOpenModal(true);
  };

  const openEdit = (item) => {
    setEditing(true);
    setForm({
      promotionId: item?.promotionId ?? null,
      code: item?.code || '',
      name: item?.name || '',
      type: normalizeTypeValue(item?.type),
      discountPercent: item?.discountPercent ?? '',
      isActive: item?.isActive !== false,
      applyTo: normalizeApplyToValue(item?.applyTo),
      targetType: normalizeTargetTypeValue(item?.targetType),
      minOrderValue: item?.minOrderValue ?? '',
      startDate: item?.startDate || '',
      endDate: item?.endDate || '',
      usageLimit: item?.usageLimit ?? '',
      buyItemId: item?.buyItemId ?? '',
      buyQuantity: item?.buyQuantity ?? '',
      getItemId: item?.getItemId ?? '',
      getQuantity: item?.getQuantity ?? '',
    });
    setFormErrors({});
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(false);
    setForm(defaultForm);
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

  const updateFormField = useCallback((field, value) => {
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

      return {
        ...prev,
        [field]: value,
      };
    });

    if (field === 'type') {
      clearFieldErrors(['type', 'discountPercent', 'buyItemId', 'buyQuantity', 'getItemId', 'getQuantity']);
      return;
    }

    if (field === 'startDate' || field === 'endDate') {
      clearFieldErrors(['startDate', 'endDate']);
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
        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            placeholder="Tìm kiếm theo code, tên, loại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="ADMIN_ALL">Admin - Tất cả</option>
          <option value="AVAILABLE">Khách hàng - Đang khả dụng</option>
        </select>
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
                    <button type="button" className={styles.editBtn} onClick={() => openEdit(item)}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
