import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { getStatusTextVi, getStatusTone } from '../../../components/statusUtils.js';
import { fetchWarehousesAll, fetchWarehouseReturnEntries } from '../../../services/warehouseService.js';
import styles from './WarehouseReturnEntryManagement.module.css';

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
  { value: 'SUBMITTED', label: getStatusTextVi('SUBMITTED') },
  { value: 'CONFIRMED', label: getStatusTextVi('CONFIRMED') },
  { value: 'CANCELLED', label: getStatusTextVi('CANCELLED') },
];

const extractEntries = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) {
    return {
      content: payload,
      totalElements: payload.length,
      totalPages: 1,
    };
  }
  const content = payload?.content ?? payload?.data?.content ?? payload?.data;
  if (Array.isArray(content)) {
    return {
      content,
      totalElements: Number(payload?.totalElements ?? payload?.data?.totalElements ?? content.length) || content.length,
      totalPages: Math.max(1, Number(payload?.totalPages ?? payload?.data?.totalPages ?? 1) || 1),
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
  if (tone === 'success') return styles.statusSuccess;
  if (tone === 'warning') return styles.statusWarning;
  if (tone === 'danger') return styles.statusDanger;
  return styles.statusMuted;
};

export default function WarehouseReturnEntryManagement() {
  useScrollToTop();
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [warehouseIdInput, setWarehouseIdInput] = useState(String(DEFAULT_WAREHOUSE_ID));
  const [status, setStatus] = useState('ALL');
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
      const params = {};
      if (warehouseId && warehouseId !== 'ALL') params.warehouseId = warehouseId;
      if (status && status !== 'ALL') params.status = status;
      params.page = nextPage;
      params.size = nextSize;
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const res = await fetchWarehouseReturnEntries(params, token);
      const pageData = extractEntries(res);
      setEntries(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
    } catch (err) {
      setEntries([]);
      setTotalElements(0);
      setTotalPages(1);
      setError(err?.message || 'Không thể tải danh sách phiếu trả hàng.');
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

    fetchList({ warehouseIdOverride: warehouseId, pageOverride: page, sizeOverride: size });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseIdInput, status, page, size]);

  const stats = useMemo(() => {
    const total = totalElements;
    const submitted = entries.filter((row) => String(row?.status || '').toUpperCase() === 'SUBMITTED').length;
    const confirmed = entries.filter((row) => String(row?.status || '').toUpperCase() === 'CONFIRMED').length;
    return { total, submitted, confirmed };
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
    const warehouse = warehouses.find((row) => getWarehouseIdText(row) === idText);
    if (!warehouse) return idText;
    return (
      String(
        warehouse?.warehouseName ||
          warehouse?.warehouseCode ||
          warehouse?.name ||
          warehouse?.warehouseId ||
          warehouse?.warehouseID ||
          warehouse?.id ||
          idText,
      ).trim() || idText
    );
  }, [warehouseIdInput, warehouses]);

  return (
    <div className={styles.bookingPage}>
      <div className={styles.wrapper}>
        <header className={styles.bookingHeader}>
          <div className={styles.bookingHeaderTitle}>
            <span className={styles.headerIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="M12 22V12M3.3 7 12 12l8.7-5" />
                <path d="m9 9-4 4 4 4M5 13h10" />
              </svg>
            </span>
            <div>
              <h1>Quản lý phiếu trả hàng</h1>
              <p className={styles.helper}>Theo dõi phiếu trả hàng theo kho và trạng thái.</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.totalCount}>{stats.total} phiếu</span>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => {
                const confirmed = window.confirm(
                  '⚠️ CẢNH BÁO: Bạn đang tạo phiếu hoàn KHÔNG có nguồn gốc từ phiếu xuất.\n\n' +
                  'Quy trình chuẩn:\n' +
                  '1. Vào "Quản lý phiếu xuất kho"\n' +
                  '2. Chọn phiếu xuất đã CONFIRMED\n' +
                  '3. Bấm "Tạo phiếu hoàn từ phiếu xuất này"\n\n' +
                  'Phiếu hoàn thủ công sẽ THIẾU context: không biết phiếu dịch vụ, allocation, KTV nào chịu trách nhiệm.\n\n' +
                  'Bạn có chắc muốn tiếp tục?'
                );
                if (confirmed) navigate('/warehouse-return-entry');
              }}
              title="Không khuyến nghị: tạo phiếu hoàn không có nguồn gốc"
            >
              ⚠️ Tạo phiếu thủ công (không khuyến nghị)
            </button>
          </div>
        </header>

        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <p className={styles.statLabel}>Tổng phiếu</p>
            <p className={styles.statValue}>{stats.total}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statLabel}>Đã gửi</p>
            <p className={styles.statValue}>{stats.submitted}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statLabel}>Đã xác nhận</p>
            <p className={styles.statValue}>{stats.confirmed}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statLabel}>Kho đang lọc</p>
            <p className={styles.statValue}>{selectedWarehouseLabel}</p>
          </article>
        </section>

        <section className={styles.pendingFilters}>
          <div className={styles.filterCardControls}>
          <div className={styles.field}>
            <label htmlFor="return-entry-warehouse">Kho</label>
            <select
              id="return-entry-warehouse"
              className={styles.select}
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
                  .map((warehouse) => {
                    const idText = getWarehouseIdText(warehouse);
                    if (!idText) return null;
                    return (
                      <option key={idText} value={idText}>
                        {String(
                          warehouse?.warehouseName ||
                            warehouse?.warehouseCode ||
                            warehouse?.name ||
                            warehouse?.warehouseId ||
                            warehouse?.warehouseID ||
                            warehouse?.id ||
                            '',
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
          <div className={styles.field}>
            <label htmlFor="return-entry-status">Trạng thái</label>
            <select
              id="return-entry-status"
              className={styles.select}
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
          </div>
        </section>

        {warehouseError ? <div className={styles.errorBanner}>{warehouseError}</div> : null}
        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.bookingCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
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
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Đang tải danh sách phiếu trả hàng...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
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
                        <span className={`${styles.statusBadge} ${badgeClassByStatus(statusValue)}`}>{statusLabel}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
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
        <div className={styles.bookingFooter}>
          <div className={styles.pageSize}>
            <span>Hiển thị:</span>
            <select id="return-entry-page-size" value={String(size)} onChange={(e) => changePageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className={styles.pagination}>
            <button type="button" className={styles.primaryButton} disabled={safePage <= 0 || loading} onClick={() => goToPage(safePage - 1)}>
              Trước
            </button>
            {pageButtons.map((p) => (
              <button
                type="button"
                key={p}
                className={p === safePage ? styles.ghostButton : `${styles.primaryButton} ${styles.isGhost}`}
                disabled={p === safePage || loading}
                onClick={() => goToPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button type="button" className={styles.primaryButton} disabled={safePage >= Math.max(1, totalPages) - 1 || loading} onClick={() => goToPage(safePage + 1)}>
              Sau
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
