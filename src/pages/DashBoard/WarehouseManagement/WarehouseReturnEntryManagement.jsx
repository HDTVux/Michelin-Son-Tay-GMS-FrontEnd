import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import { fetchWarehouseReturnEntries } from '../../../services/warehouseService.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseReturnEntryManagement.module.css';

const DEFAULT_WAREHOUSE_ID = 1;
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: getStatusTextVi('DRAFT') },
  { value: 'CONFIRMED', label: getStatusTextVi('CONFIRMED') },
  { value: 'CANCELLED', label: getStatusTextVi('CANCELLED') },
];

const extractEntries = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  return [];
};

const formatDate = (value) => {
  if (!value) return '-';
  const text = String(value).trim();
  if (!text) return '-';
  return text;
};

const badgeClassByStatus = (status) => {
  const tone = getStatusTone(status, 'info');
  if (tone === 'success') return commonStyles.badgeSuccess;
  if (tone === 'warning') return commonStyles.badgeWarning;
  if (tone === 'danger') return commonStyles.badgeDanger;
  return commonStyles.badgeMuted;
};

export default function WarehouseReturnEntryManagement() {
  useScrollToTop();
  const navigate = useNavigate();

  const [warehouseIdInput] = useState(String(DEFAULT_WAREHOUSE_ID));
  const [status, setStatus] = useState('ALL');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchList = async () => {
    try {
      setLoading(true);
      setError('');
      const warehouseId = String(warehouseIdInput || '').trim();
      const params = {};
      if (warehouseId) params.warehouseId = warehouseId;
      if (status && status !== 'ALL') params.status = status;
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const res = await fetchWarehouseReturnEntries(params, token);
      setEntries(extractEntries(res));
    } catch (err) {
      setEntries([]);
      setError(err?.message || 'Không thể tải danh sách phiếu trả hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = entries.length;
    const draft = entries.filter((row) => String(row?.status || '').toUpperCase() === 'DRAFT').length;
    const confirmed = entries.filter((row) => String(row?.status || '').toUpperCase() === 'CONFIRMED').length;
    return { total, draft, confirmed };
  }, [entries]);

  return (
    <div className={commonStyles.page}>
      <div className={styles.wrapper}>
        <header className={commonStyles.header}>
          <div>
            <h1 className={commonStyles.title}>Quản lý phiếu trả hàng</h1>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={() => navigate('/warehouse-return-entry')}
          >
            Tạo phiếu trả hàng
          </button>
        </header>

        <section className={commonStyles.statsGrid}>
          <article className={commonStyles.statCard}>
            <p className={commonStyles.statLabel}>Tổng phiếu</p>
            <p className={commonStyles.statValue}>{stats.total}</p>
          </article>
          <article className={commonStyles.statCard}>
            <p className={commonStyles.statLabel}>Nháp</p>
            <p className={commonStyles.statValue}>{stats.draft}</p>
          </article>
          <article className={commonStyles.statCard}>
            <p className={commonStyles.statLabel}>Đã xác nhận</p>
            <p className={commonStyles.statValue}>{stats.confirmed}</p>
          </article>
          <article className={commonStyles.statCard}>
            <p className={commonStyles.statLabel}>Kho đang lọc</p>
            <p className={commonStyles.statValue}>{String(warehouseIdInput || '').trim() || '-'}</p>
          </article>
        </section>

        <section className={commonStyles.toolbar}>
          <div className={commonStyles.field}>
            <label htmlFor="return-entry-warehouse">Kho</label>
            <select
              id="return-entry-warehouse"
              className={commonStyles.select}
              value={warehouseIdInput}
              disabled
            >
              <option value="1">Kho Michelin Son Tay</option>
            </select>
          </div>
          <div className={commonStyles.field}>
            <label htmlFor="return-entry-status">Trạng thái</label>
            <select
              id="return-entry-status"
              className={commonStyles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={commonStyles.actions}>
            <button type="button" className="ui-btn ui-btn--primary" onClick={fetchList} disabled={loading}>
              {loading ? 'Đang tải...' : 'Lọc dữ liệu'}
            </button>
          </div>
        </section>

        {error ? <div className={commonStyles.error}>{error}</div> : null}

        <div className={commonStyles.tableWrap}>
          <table className={commonStyles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã phiếu</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {!loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Không có dữ liệu phiếu trả hàng.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const id = entry?.returnId ?? 0;
                  const statusValue = String(entry?.status || '-').toUpperCase();
                  const statusLabel = getStatusTextVi(statusValue, statusValue || '-');
                  return (
                    <tr key={String(id)}>
                      <td>{id || '-'}</td>
                      <td>{entry?.returnCode || '-'}</td>
                      <td>{formatDate(entry?.createdAt)}</td>
                      <td>
                        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ui-btn ui-btn--ghost"
                          onClick={() => navigate(`/warehouse-return-entries/${id}`, { state: { entry } })}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
