import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAllWarehouses,
  createWarehouse,
  updateWarehouse,
  activateWarehouse,
  deactivateWarehouse,
} from '../../../services/warehouseService.js';
import styles from './WarehouseConfig.module.css';

const getToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') ||
  '';

const WAREHOUSE_TYPES = ['MASTER', 'BRANCH', 'DEFECTIVE'];
const TYPE_LABEL = { MASTER: 'Kho tổng', BRANCH: 'Chi nhánh', DEFECTIVE: 'Kho lỗi' };

const EMPTY_FORM = {
  warehouseCode: '',
  warehouseName: '',
  warehouseType: 'BRANCH',
  parentWarehouseId: '',
  address: '',
  managerStaffId: '',
};

// ─── Form Modal ───────────────────────────────────────────────────────────────
function FormModal({ mode, initial, warehouses, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const needsParent = form.warehouseType === 'BRANCH' || form.warehouseType === 'DEFECTIVE';

  const parentOptions = useMemo(() => {
    if (form.warehouseType === 'DEFECTIVE')
      return warehouses.filter((w) => w.warehouseType === 'BRANCH' && w.isActive);
    if (form.warehouseType === 'BRANCH')
      return warehouses.filter((w) => w.warehouseType === 'MASTER' && w.isActive);
    return [];
  }, [form.warehouseType, warehouses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const token = getToken();
      if (mode === 'create') {
        await createWarehouse({
          warehouseCode: form.warehouseCode.trim().toUpperCase(),
          warehouseName: form.warehouseName.trim(),
          warehouseType: form.warehouseType,
          parentWarehouseId: needsParent && form.parentWarehouseId ? Number(form.parentWarehouseId) : undefined,
          address: form.address.trim() || undefined,
          managerStaffId: form.managerStaffId ? Number(form.managerStaffId) : undefined,
        }, token);
      } else {
        await updateWarehouse(initial.warehouseId, {
          warehouseName: form.warehouseName.trim(),
          address: form.address.trim() || undefined,
          managerStaffId: form.managerStaffId ? Number(form.managerStaffId) : undefined,
        }, token);
      }
      onSaved();
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'Tạo kho mới' : 'Chỉnh sửa kho'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'create' && (
            <>
              <div className={styles.field}>
                <label>Mã kho <span className={styles.req}>*</span></label>
                <input
                  value={form.warehouseCode}
                  onChange={set('warehouseCode')}
                  placeholder="VD: CS_SONTAY"
                  required
                  maxLength={20}
                />
                <span className={styles.hint}>Tự động viết hoa, tối đa 20 ký tự</span>
              </div>
              <div className={styles.field}>
                <label>Loại kho <span className={styles.req}>*</span></label>
                <select value={form.warehouseType} onChange={set('warehouseType')}>
                  {WAREHOUSE_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              {needsParent && (
                <div className={styles.field}>
                  <label>Kho cha <span className={styles.req}>*</span></label>
                  <select value={form.parentWarehouseId} onChange={set('parentWarehouseId')} required>
                    <option value="">-- Chọn kho cha --</option>
                    {parentOptions.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                  {parentOptions.length === 0 && (
                    <span className={styles.hintWarn}>
                      Chưa có {form.warehouseType === 'DEFECTIVE' ? 'kho chi nhánh' : 'kho tổng'} nào đang hoạt động
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          <div className={styles.field}>
            <label>Tên kho <span className={styles.req}>*</span></label>
            <input
              value={form.warehouseName}
              onChange={set('warehouseName')}
              placeholder="VD: Chi nhánh Sơn Tây"
              required
              maxLength={100}
            />
          </div>
          <div className={styles.field}>
            <label>Địa chỉ</label>
            <input
              value={form.address}
              onChange={set('address')}
              placeholder="Địa chỉ kho"
            />
          </div>
          <div className={styles.field}>
            <label>ID Quản lý kho</label>
            <input
              value={form.managerStaffId}
              onChange={set('managerStaffId')}
              placeholder="Staff ID của quản lý"
              type="number"
              min={1}
            />
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Huỷ
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo kho' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WarehouseConfig() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { mode, initial }
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAllWarehouses({}, getToken());
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      setWarehouses(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return warehouses.filter((w) => {
      if (filterActive !== '' && String(w.isActive) !== filterActive) return false;
      if (filterType && w.warehouseType !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !String(w.warehouseName || '').toLowerCase().includes(q) &&
          !String(w.warehouseCode || '').toLowerCase().includes(q) &&
          !String(w.address || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [warehouses, filterActive, filterType, search]);

  const handleToggle = async (w) => {
    setToggling(w.warehouseId);
    try {
      if (w.isActive) {
        await deactivateWarehouse(w.warehouseId, getToken());
      } else {
        await activateWarehouse(w.warehouseId, getToken());
      }
      await load();
    } catch (err) {
      setError(err?.message || 'Lỗi khi thay đổi trạng thái');
    } finally {
      setToggling(null);
    }
  };

  const parentName = (parentId) => {
    if (!parentId) return '—';
    const p = warehouses.find((w) => w.warehouseId === parentId);
    return p ? p.warehouseName : `ID ${parentId}`;
  };

  const openCreate = () => setModal({ mode: 'create', initial: { ...EMPTY_FORM } });
  const openEdit = (w) => setModal({
    mode: 'edit',
    initial: {
      warehouseId: w.warehouseId,
      warehouseCode: w.warehouseCode,
      warehouseName: w.warehouseName,
      warehouseType: w.warehouseType,
      parentWarehouseId: w.parentWarehouseId || '',
      address: w.address || '',
      managerStaffId: w.managerStaffId || '',
    },
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <h1>Cấu hình kho hàng</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>{filtered.length} kho</span>
          <button className={styles.primaryBtn} onClick={openCreate}>+ Tạo kho mới</button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="Tìm theo tên, mã, địa chỉ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tất cả loại</option>
          {WAREHOUSE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select className={styles.select} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã tắt</option>
        </select>
        {(search || filterType || filterActive) && (
          <button className={styles.ghostBtn} onClick={() => { setSearch(''); setFilterType(''); setFilterActive(''); }}>
            Xoá bộ lọc
          </button>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Table */}
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>MÃ KHO</th>
                <th>TÊN KHO</th>
                <th>LOẠI</th>
                <th>KHO CHA</th>
                <th>ĐỊA CHỈ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className={styles.emptyRow}>Đang tải...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className={styles.emptyRow}>Không có kho nào.</td></tr>
              )}
              {!loading && filtered.map((w, idx) => (
                <tr key={w.warehouseId} className={!w.isActive ? styles.rowDimmed : ''}>
                  <td>{idx + 1}</td>
                  <td><code className={styles.code}>{w.warehouseCode}</code></td>
                  <td className={styles.tdName}>{w.warehouseName}</td>
                  <td>
                    <span className={`${styles.typeBadge} ${styles[`type${w.warehouseType}`]}`}>
                      {TYPE_LABEL[w.warehouseType] || w.warehouseType}
                    </span>
                  </td>
                  <td className={styles.tdMuted}>{parentName(w.parentWarehouseId)}</td>
                  <td className={styles.tdMuted}>{w.address || '—'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${w.isActive ? styles.statusOn : styles.statusOff}`}>
                      {w.isActive ? 'Hoạt động' : 'Đã tắt'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => openEdit(w)}>Sửa</button>
                      <button
                        className={w.isActive ? styles.deactivateBtn : styles.activateBtn}
                        onClick={() => handleToggle(w)}
                        disabled={toggling === w.warehouseId}
                      >
                        {toggling === w.warehouseId ? '...' : w.isActive ? 'Tắt' : 'Bật'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <FormModal
          mode={modal.mode}
          initial={modal.initial}
          warehouses={warehouses}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
