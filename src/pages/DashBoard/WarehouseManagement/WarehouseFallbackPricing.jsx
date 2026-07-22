import { useEffect, useMemo, useState } from 'react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  fetchFallbackPricingConfigs,
  createFallbackPricingConfig,
  updateFallbackPricingConfig,
  deleteFallbackPricingConfig,
  activateFallbackPricingConfig,
} from '../../../services/warehouseService.js';
import styles from './WarehouseConfig.module.css';

const getToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') ||
  '';

const ITEM_TYPES = ['PART', 'EQUIPMENT', 'MACHINERY', 'COMBO', 'MAINTENANCE_PACKAGE', 'SERVICE'];

const TYPE_LABEL = {
  PART: 'Linh kiện (PART)',
  EQUIPMENT: 'Thiết bị (EQUIPMENT)',
  MACHINERY: 'Máy móc (MACHINERY)',
  COMBO: 'Gói Combo (COMBO)',
  MAINTENANCE_PACKAGE: 'Gói bảo dưỡng (MAINTENANCE_PACKAGE)',
  SERVICE: 'Dịch vụ (SERVICE)',
};

const EMPTY_FORM = {
  name: '',
  itemType: '',
  markupMultiplier: '1.2',
  markupMultiplierWholesale: '1.1',
  description: '',
};

function FormModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const mult = Number(form.markupMultiplier);
    const multWholesale = Number(form.markupMultiplierWholesale);
    
    if (!Number.isFinite(mult) || mult <= 0) {
      setError('Hệ số lẻ phải là số lớn hơn 0');
      return;
    }
    if (!Number.isFinite(multWholesale) || multWholesale <= 0) {
      setError('Hệ số sỉ phải là số lớn hơn 0');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const payload = {
        name: form.name.trim(),
        itemType: form.itemType ? form.itemType : null,
        markupMultiplier: mult,
        markupMultiplierWholesale: multWholesale,
        description: form.description.trim() || undefined,
      };

      if (mode === 'create') {
        await createFallbackPricingConfig(payload, token);
      } else {
        await updateFallbackPricingConfig(initial.id, payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'Tạo cấu hình markup mới' : 'Chỉnh sửa cấu hình markup'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Tên quy tắc cấu hình <span className={styles.req}>*</span></label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="VD: Cấu hình mặc định Phụ tùng"
              required
              maxLength={100}
            />
          </div>

          <div className={styles.field}>
            <label>Loại sản phẩm áp dụng</label>
            <select value={form.itemType} onChange={set('itemType')}>
              <option value="">-- Mặc định (Áp dụng chung toàn hệ thống) --</option>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
            <span className={styles.hint}>Quy tắc trùng Loại sản phẩm cũ hơn sẽ tự động bị deactive.</span>
          </div>

          <div className={styles.field}>
            <label>Hệ số markup lẻ fallback <span className={styles.req}>*</span></label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.markupMultiplier}
              onChange={set('markupMultiplier')}
              placeholder="VD: 1.3000"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Hệ số markup sỉ fallback <span className={styles.req}>*</span></label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.markupMultiplierWholesale}
              onChange={set('markupMultiplierWholesale')}
              placeholder="VD: 1.1500"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Mô tả chi tiết</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Mô tả công dụng hoặc phạm vi áp dụng..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1.5px solid #d1d5db',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Huỷ
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo cấu hình' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehouseFallbackPricing() {
  useScrollToTop();

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [reloadKey, setReloadKey] = useState(0);

  // Modal control
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedConfig, setSelectedConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const params = {
          page,
          size,
        };
        if (search.trim()) params.search = search.trim();
        if (filterActive !== '') params.isActive = filterActive === 'true';

        const res = await fetchFallbackPricingConfigs(params, token);
        const data = res?.data?.data ?? res?.data ?? res;
        
        if (cancelled) return;
        
        if (data) {
          setConfigs(data.content || []);
          setTotalElements(data.totalElements || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Không thể tải danh sách cấu hình markup mặc định.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, size, search, filterActive, reloadKey]);

  const handleCreate = () => {
    setSelectedConfig(EMPTY_FORM);
    setModalMode('create');
  };

  const handleEdit = (item) => {
    setSelectedConfig({
      id: item.id,
      name: item.name || '',
      itemType: item.itemType || '',
      markupMultiplier: String(item.markupMultiplier ?? '1.0'),
      markupMultiplierWholesale: String(item.markupMultiplierWholesale ?? '1.0'),
      description: item.description || '',
    });
    setModalMode('edit');
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Bạn có chắc muốn tắt kích hoạt quy tắc markup này?')) return;
    try {
      const token = getToken();
      await deleteFallbackPricingConfig(id, token);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleActivate = async (id) => {
    try {
      const token = getToken();
      await activateFallbackPricingConfig(id, token);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleSaved = () => {
    setModalMode(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h1>Cấu hình hệ số markup mặc định (Fallback)</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>{totalElements} quy tắc</span>
          <button className={styles.primaryBtn} onClick={handleCreate}>
            Thêm quy tắc mới
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="search-input">Tìm kiếm</label>
          <input
            id="search-input"
            className={styles.filterInput}
            placeholder="Tìm theo tên cấu hình..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="status-select">Trạng thái</label>
          <select
            id="status-select"
            className={styles.filterSelect}
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(0); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang kích hoạt</option>
            <option value="false">Đã vô hiệu hóa</option>
          </select>
        </div>
      </div>

      {error && <div className={styles.errorMsg} style={{ marginBottom: '16px' }}>{error}</div>}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TÊN CẤU HÌNH</th>
                <th>LOẠI SẢN PHẨM</th>
                <th style={{ textAlign: 'right' }}>HỆ SỐ LẺ</th>
                <th style={{ textAlign: 'right' }}>HỆ SỐ SỈ</th>
                <th>MÔ TẢ VÀ GHI CHÚ</th>
                <th>TRẠNG THÁI</th>
                <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className={styles.loadingRow}>Đang tải cấu hình...</td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyRow}>Không tìm thấy quy tắc cấu hình nào.</td>
                </tr>
              ) : (
                configs.map((item) => (
                  <tr key={item.id} className={!item.isActive ? styles.inactiveRow : ''}>
                    <td style={{ fontWeight: '500' }}>{item.name}</td>
                    <td>
                      {item.itemType ? (
                        <span className={styles.typeBadge} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '12px', fontSize: '12px' }}>
                          {TYPE_LABEL[item.itemType] || item.itemType}
                        </span>
                      ) : (
                        <span className={styles.typeBadge} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '12px', fontSize: '12px' }}>
                          Mặc định toàn hệ thống
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>x{Number(item.markupMultiplier).toFixed(4)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>x{Number(item.markupMultiplierWholesale).toFixed(4)}</td>
                    <td style={{ color: '#666', fontSize: '13px' }}>{item.description || '-'}</td>
                    <td>
                      {item.isActive ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>● Đang hoạt động</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>○ Vô hiệu hóa</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <button
                        className={styles.ghostBtn}
                        style={{ padding: '6px 12px', fontSize: '13px', marginRight: '6px' }}
                        onClick={() => handleEdit(item)}
                      >
                        Sửa
                      </button>
                      {item.isActive ? (
                        <button
                          className={styles.ghostBtn}
                          style={{ padding: '6px 12px', fontSize: '13px', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => handleDeactivate(item.id)}
                        >
                          Tắt
                        </button>
                      ) : (
                        <button
                          className={styles.primaryBtn}
                          style={{ padding: '6px 12px', fontSize: '13px', background: '#16a34a', boxShadow: 'none' }}
                          onClick={() => handleActivate(item.id)}
                        >
                          Bật
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.tableFooter}>
            <div className={styles.pageSize}>
              <span>Hiển thị:</span>
              <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                <option value="10">10 bản ghi</option>
                <option value="20">20 bản ghi</option>
                <option value="50">50 bản ghi</option>
              </select>
            </div>
            <div className={styles.pagination}>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</button>
              <span>Trang {page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau</button>
            </div>
          </div>
        )}
      </div>

      {modalMode && (
        <FormModal
          mode={modalMode}
          initial={selectedConfig}
          onClose={() => setModalMode(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
