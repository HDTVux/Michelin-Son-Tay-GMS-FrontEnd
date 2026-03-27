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
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(false);
    setForm(defaultForm);
  };

  const handleSubmit = async () => {
    const token = getAuthToken();
    if (!token) return;
    const submitType = normalizeTypeValue(form.type);

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
      const payload = { ...form, type: submitType };
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
                      className={styles.input}
                      placeholder="Ví dụ: SUMMER2026"
                      value={form.code}
                      onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    />
                    <button
                      type="button"
                      className={styles.generateBtn}
                      onClick={() => setForm((p) => ({ ...p, code: generateRandomCode() }))}
                      title="Tạo mã ngẫu nhiên"
                    >
                      🎲 Tạo mã
                    </button>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên chương trình <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    placeholder="Ví dụ: Khuyến mãi mùa hè 2026"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Loại <span className={styles.required}>*</span></label>
                  <select
                    className={styles.select}
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: normalizeTypeValue(e.target.value) }))}
                  >
                    <option value="PERCENT">Giảm theo phần trăm</option>
                    <option value="BUY_X_GET_Y">Mua X tặng Y</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giảm (%)</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ví dụ: 15"
                    value={form.discountPercent}
                    onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
                    disabled={!isPercentType}
                  />
                </div>
                {isBuyXGetY && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mã sản phẩm mua (tuỳ chọn)</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 101"
                        value={form.buyItemId}
                        onChange={(e) => setForm((p) => ({ ...p, buyItemId: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Số lượng mua (X) <span className={styles.required}>*</span></label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 2"
                        value={form.buyQuantity}
                        onChange={(e) => setForm((p) => ({ ...p, buyQuantity: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mã sản phẩm tặng (tuỳ chọn)</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 102"
                        value={form.getItemId}
                        onChange={(e) => setForm((p) => ({ ...p, getItemId: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Số lượng tặng (Y) <span className={styles.required}>*</span></label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Ví dụ: 1"
                        value={form.getQuantity}
                        onChange={(e) => setForm((p) => ({ ...p, getQuantity: e.target.value }))}
                      />
                    </div>
                  </>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày bắt đầu</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.startDate || ''}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày kết thúc</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.endDate || ''}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giá trị đơn tối thiểu</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 100000"
                    value={form.minOrderValue}
                    onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giới hạn lượt dùng</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 100"
                    value={form.usageLimit}
                    onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Áp dụng cho</label>
                  <select
                    className={styles.select}
                    value={form.applyTo}
                    onChange={(e) => setForm((p) => ({ ...p, applyTo: e.target.value }))}
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
                    onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value }))}
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
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'ACTIVE' }))}
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
