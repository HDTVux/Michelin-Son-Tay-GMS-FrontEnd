import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import { fetchWarehousesAll, fetchWarehouseStockEntries } from '../../../services/warehouseService.js';
import commonStyles from '../common/ManagementCommon.module.css';
import styles from './WarehouseStockEntryManagement.module.css';

const DEFAULT_WAREHOUSE_ID = 1;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const toWarehouseIdText = (value) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
};

const getWarehouseIdText = (warehouse) =>
  toWarehouseIdText(warehouse?.warehouseId ?? warehouse?.warehouseID ?? warehouse?.id);

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: getStatusTextVi('DRAFT') },
  { value: 'CONFIRMED', label: getStatusTextVi('CONFIRMED') },
  { value: 'CANCELLED', label: getStatusTextVi('CANCELLED') },
];

const extractEntryPage = (response) => {
  // apiClient.request() already returns parsed JSON.
  // Backend may wrap list payloads as: { success, message, data: { content: [] } }
  const root = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(root)) {
    return {
      content: root,
      totalElements: root.length,
      totalPages: 1,
    };
  }

  const content = root?.content ?? root?.data?.content ?? root?.data;
  if (Array.isArray(content)) {
    return {
      content,
      totalElements: Number(root?.totalElements ?? root?.data?.totalElements ?? content.length) || content.length,
      totalPages: Math.max(1, Number(root?.totalPages ?? root?.data?.totalPages ?? 1) || 1),
    };
  }
  return {
    content: [],
    totalElements: 0,
    totalPages: 1,
  };
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

export default function WarehouseStockEntryManagement() {
  useScrollToTop();
  const navigate = useNavigate();
  const location = useLocation();

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  
  const [warehouseIdInput, setWarehouseIdInput] = useState(() => {
    const stateId = location.state?.warehouseId;
    return stateId ? String(stateId) : String(DEFAULT_WAREHOUSE_ID);
  });
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseError, setWarehouseError] = useState('');

  const fetchList = async ({ warehouseIdOverride, pageOverride, sizeOverride } = {}) => {
    try {
      setLoading(true);
      setError('');
      const warehouseIdSource = warehouseIdOverride ?? warehouseIdInput ?? '';
      const warehouseId = warehouseIdSource === 'ALL' ? 'ALL' : toWarehouseIdText(warehouseIdSource);
      if (!warehouseId) {
        setEntries([]);
        setTotalElements(0);
        setTotalPages(1);
        setError('Vui lòng chọn kho.');
        return;
      }
      const nextPage = Number.isFinite(pageOverride) ? pageOverride : page;
      const nextSize = Number.isFinite(sizeOverride) ? sizeOverride : size;
      const params = { page: nextPage, size: nextSize };
      if (warehouseId && warehouseId !== 'ALL') params.warehouseId = warehouseId;
      if (status && status !== 'ALL') params.status = status;
      if (search) params.search = search.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const res = await fetchWarehouseStockEntries(params, token);
      const pageData = extractEntryPage(res);
      setEntries(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
    } catch (err) {
      setEntries([]);
      setTotalElements(0);
      setTotalPages(1);
      setError(err?.message || 'Không thể tải danh sách phiếu nhập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setWarehouseLoading(true);
        setWarehouseError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const res = await fetchWarehousesAll(token);
        const payload = res?.data?.data ?? res?.data ?? res;
        const list = Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setWarehouses(list);

        const currentIdText = toWarehouseIdText(warehouseIdInput);
        const hasCurrent = Boolean(currentIdText) && list.some((w) => getWarehouseIdText(w) === currentIdText);
        if (hasCurrent) {
          return;
        }

        const firstActive =
          list.find((w) => w?.isActive === true && getWarehouseIdText(w)) ||
          list.find((w) => getWarehouseIdText(w)) ||
          null;
        const nextId = getWarehouseIdText(firstActive) || String(DEFAULT_WAREHOUSE_ID);
        setWarehouseIdInput(String(nextId));
      } catch (err) {
        if (cancelled) return;
        setWarehouses([]);
        setWarehouseError(err?.message || 'Không thể tải danh sách kho.');
      } finally {
        if (!cancelled) setWarehouseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const warehouseId = warehouseIdInput === 'ALL' ? 'ALL' : toWarehouseIdText(warehouseIdInput);
    if (!warehouseId) return;

    const timer = setTimeout(() => {
      fetchList({ warehouseIdOverride: warehouseId, pageOverride: page, sizeOverride: size });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseIdInput, status, search, fromDate, toDate, page, size]);

  const stats = useMemo(() => {
    const total = totalElements;
    const draft = entries.filter((row) => String(row?.status || '').toUpperCase() === 'DRAFT').length;
    const confirmed = entries.filter((row) => String(row?.status || '').toUpperCase() === 'CONFIRMED').length;
    return { total, draft, confirmed };
  }, [entries, totalElements]);

  const safePage = Math.min(Math.max(0, page), Math.max(1, totalPages) - 1);
  const pageButtons = useMemo(() => {
    const max = 5;
    const last = Math.max(1, totalPages) - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const result = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) result.push(i);
    return result;
  }, [safePage, totalPages]);

  const goToPage = (nextPage) => {
    const safeNext = Math.min(Math.max(0, nextPage), Math.max(1, totalPages) - 1);
    setPage(safeNext);
    fetchList({ pageOverride: safeNext });
  };

  const changePageSize = (nextSize) => {
    setSize(nextSize);
    setPage(0);
    fetchList({ pageOverride: 0, sizeOverride: nextSize });
  };

  const selectedWarehouseLabel = useMemo(() => {
    if (warehouseIdInput === 'ALL') return 'Tất cả kho';
    const idText = toWarehouseIdText(warehouseIdInput);
    if (!idText) return '-';
    const w = warehouses.find((row) => getWarehouseIdText(row) === idText);
    if (!w) return idText;
    return (
      String(w?.warehouseName || w?.warehouseCode || w?.warehouseId || w?.warehouseID || w?.id || idText).trim() ||
      idText
    );
  }, [warehouseIdInput, warehouses]);

  return (
    <div className={commonStyles.page}>
      <div className={styles.wrapper}>
        <header className={commonStyles.header}>
          <div>
            <h1 className={commonStyles.title}>Quản lý phiếu nhập kho</h1>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={() => navigate('/warehouse-stock-entry')}
          >
            Nhập kho
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
            <p className={commonStyles.statValue}>{selectedWarehouseLabel}</p>
          </article>
        </section>

        <section className={styles.filterGrid}>
          <div className={commonStyles.field}>
            <label htmlFor="stock-entry-warehouse">Kho</label>
            <select
              id="stock-entry-warehouse"
              className={commonStyles.select}
              value={warehouseIdInput}
              onChange={(e) => {
                setWarehouseIdInput(e.target.value);
                setPage(0);
              }}
              disabled={warehouseLoading}
            >
              <option value="ALL">Tất cả kho</option>
              {warehouses.length > 0 ? (
                warehouses
                  .map((w) => {
                    const idText = getWarehouseIdText(w);
                    if (!idText) return null;
                    return (
                      <option key={idText} value={idText}>
                        {String(
                          w?.warehouseName || w?.warehouseCode || w?.name || w?.warehouseId || w?.warehouseID || w?.id || '',
                        ).trim() || '-'}
                      </option>
                    );
                  })
                  .filter(Boolean)
              ) : (
                warehouseIdInput !== 'ALL' && <option value={warehouseIdInput}>{warehouseIdInput || '-'}</option>
              )}
            </select>
          </div>
          <div className={commonStyles.field}>
            <label htmlFor="stock-entry-status">Trạng thái</label>
            <select
              id="stock-entry-status"
              className={commonStyles.select}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={commonStyles.field}>
            <label htmlFor="stock-entry-search">Tìm kiếm</label>
            <input
              type="text"
              id="stock-entry-search"
              className={commonStyles.input}
              placeholder="Mã phiếu, Tên/Mã sản phẩm, Tên KH..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className={commonStyles.field}>
            <label htmlFor="stock-entry-from-date">Từ ngày</label>
            <input
              type="date"
              id="stock-entry-from-date"
              className={commonStyles.input}
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className={commonStyles.field}>
            <label htmlFor="stock-entry-to-date">Đến ngày</label>
            <input
              type="date"
              id="stock-entry-to-date"
              className={commonStyles.input}
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </section>

        {warehouseError ? <div className={commonStyles.error}>{warehouseError}</div> : null}

        {error ? <div className={commonStyles.error}>{error}</div> : null}

        <div className={styles.entryCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.entryTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã phiếu</th>
                <th>Kho nhập</th>
                <th>Nhà cung cấp</th>
                <th>Ngày nhập</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    Đang tải danh sách phiếu nhập...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    Không có dữ liệu phiếu nhập.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const id = entry?.entryId ?? 0;
                  const statusValue = String(entry?.status || '-').toUpperCase();
                  const statusLabel = getStatusTextVi(statusValue, statusValue || '-');
                  return (
                    <tr key={String(id)}>
                      <td>{id || '-'}</td>
                      <td>{entry?.entryCode || '-'}</td>
                      <td>{entry?.warehouseName || '-'}</td>
                      <td>{entry?.supplierName || '-'}</td>
                      <td>{formatDate(entry?.entryDate)}</td>
                      <td>
                        <span className={`${commonStyles.badge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ui-btn ui-btn--ghost"
                          onClick={() => navigate(`/warehouse-stock-entries/${id}`, { state: { entry } })}
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

        <div className={commonStyles.pagination}>
          <div className={styles.pageSize}>
            <span>{'Hi\u1ec3n th\u1ecb:'}</span>
            <select id="stock-entry-page-size" value={String(size)} onChange={(e) => changePageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className={styles.pageButtons}>
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              disabled={safePage <= 0 || loading}
              onClick={() => goToPage(safePage - 1)}
            >
              {'Tr\u01b0\u1edbc'}
            </button>
            {pageButtons.map((p) => (
              <button
                type="button"
                key={p}
                className={p === safePage ? 'ui-btn ui-btn--ghost' : 'ui-btn ui-btn--primary'}
                disabled={p === safePage || loading}
                onClick={() => goToPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              disabled={safePage >= Math.max(1, totalPages) - 1 || loading}
              onClick={() => goToPage(safePage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
