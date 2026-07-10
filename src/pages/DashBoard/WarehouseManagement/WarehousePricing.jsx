import { useEffect, useMemo, useState } from 'react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  fetchWarehousesAll,
  fetchWarehousePricing,
  deleteWarehousePricing,
} from '../../../services/warehouseService.js';
import { formatCurrencyVnd } from '../PartManagement/itemFormatters.js';
import styles from '../AdvisorInspection/AdvisorInspection.module.css';
import WarehousePricingCreateModal from './WarehousePricingCreateModal.jsx';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;

const extractPageObject = (raw) => {
  if (!raw) return raw;
  if (raw?.content) return raw;
  if (raw?.data?.content) return raw.data;
  return raw;
};

const extractPagedContent = (payload) => {
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload)) return payload;
  return [];
};

const formatVnd = (value) => {
  const text = formatCurrencyVnd(value);
  if (!text || text === '-') return '-';
  return `${text} ₫`;
};

const buildPageButtons = (page, totalPages, maxButtons = 5) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.min(Math.max(0, Number(page) || 0), safeTotal - 1);
  const count = Math.min(maxButtons, safeTotal);

  const half = Math.floor(count / 2);
  let start = Math.max(0, safePage - half);
  let end = start + count - 1;
  if (end > safeTotal - 1) {
    end = safeTotal - 1;
    start = Math.max(0, end - (count - 1));
  }

  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return { safePage, pages };
};

export default function WarehousePricing() {
  useScrollToTop();

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [deletingPricingId, setDeletingPricingId] = useState(null);

  // Create pricing modal
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // create modal handles its own search debounce

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const res = await fetchWarehousesAll(token);
        const payload = extractPayload(res);
        const list = Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setWarehouses(list);

        if (!selectedWarehouseId) {
          const firstActive = list.find((w) => w?.isActive === true) || list[0] || null;
          if (firstActive?.warehouseId != null) setSelectedWarehouseId(String(firstActive.warehouseId));
        }
      } catch {
        if (!cancelled) setWarehouses([]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // selectedWarehouseId intentionally excluded to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(0);
  }, [selectedWarehouseId, debouncedSearch, size]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedWarehouseId) {
        setRows([]);
        setTotalElements(0);
        setTotalPages(1);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const params = {
          warehouseId: selectedWarehouseId,
          isActive: true,
          page,
          size,
        };
        if (debouncedSearch) params.search = debouncedSearch;

        const res = await fetchWarehousePricing(params, token);
        const raw = extractPayload(res);
        const pageObj = extractPageObject(raw);
        const content = extractPagedContent(pageObj);
        const totalEl = Number(pageObj?.totalElements ?? content.length);
        const totalPg = Number(
          pageObj?.totalPages ?? Math.max(1, Math.ceil(totalEl / Math.max(1, Number(size) || 10))),
        );

        if (cancelled) return;
        setRows(content);
        setTotalElements(Number.isFinite(totalEl) ? totalEl : content.length);
        setTotalPages(Number.isFinite(totalPg) ? totalPg : 1);
      } catch (err) {
        if (cancelled) return;
        const message = err?.message || 'Không thể tải danh sách giá theo kho.';
        setError(message);
        setRows([]);
        setTotalElements(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedWarehouseId, debouncedSearch, page, size, reloadKey]);

  const { safePage, pages: pageButtons } = useMemo(
    () => buildPageButtons(page, totalPages, 5),
    [page, totalPages],
  );

  const openCreate = () => setCreateOpen(true);

  const handleDelete = async (row) => {
    const pricingId = row?.pricingId ?? row?.id ?? null;
    if (pricingId == null) return;

    try {
      setDeletingPricingId(String(pricingId));
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      await deleteWarehousePricing(pricingId, token);
      setReloadKey((v) => v + 1);
    } catch (err) {
      const message = err?.message || 'Không thể xóa giá theo kho.';
      setError(message);
    } finally {
      setDeletingPricingId(null);
    }
  };

  return (
    <div className={styles.bookingPage}>
      <div className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <span className={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
          </span>
          <h1>Quản lý giá theo kho</h1>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.totalCount}>{totalElements} dòng</span>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={openCreate}
            title={selectedWarehouseId ? 'Tạo giá mới' : 'Vui lòng chọn kho trước'}
          >
            Tạo giá mới
          </button>
        </div>
      </div>

      <div className={styles.pendingFilters}>
        <div className={`${styles.filterCardLabels} ${styles.filterCardLabelsTwo}`}>
          <span>Kho</span>
          <span />
        </div>
        <div className={`${styles.filterCardControls} ${styles.filterCardControlsTwo}`}>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            aria-label="Chọn kho"
          >
            <option value="">-- Chọn kho --</option>
            {warehouses
              .filter((w) => w?.isActive === true)
              .map((w) => (
                <option
                  key={w?.warehouseId ?? w?.id ?? String(w?.warehouseName ?? '')}
                  value={String(w?.warehouseId ?? '')}
                >
                  {w?.warehouseName || w?.name || `Kho #${w?.warehouseId}`}
                </option>
              ))}
          </select>
          <div />
        </div>

        <div className={styles.filterCardActions}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Tìm theo tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.bookingCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
            <thead>
              <tr>
                <th>TÊN SẢN PHẨM</th>
                <th>KHO</th>
                <th>GIÁ GỐC</th>
                <th>GIÁ BÁN LẺ</th>
                <th>GIÁ BÁN BUÔN</th>
                <th>HIỆU LỰC TỪ</th>
                <th>HIỆU LỰC ĐẾN</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" className={styles.emptyRow}>Đang tải...</td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="8" className={styles.emptyRow}>
                    {selectedWarehouseId ? 'Không có dữ liệu.' : 'Vui lòng chọn kho để xem giá.'}
                  </td>
                </tr>
              )}

              {!loading && rows.map((r, idx) => {
                const key = r?.pricingId ?? r?.id ?? `${r?.itemName ?? ''}-${r?.warehouseName ?? ''}-${r?.effectiveFrom ?? ''}-${idx}`;
                const pricingId = r?.pricingId ?? r?.id ?? null;
                const isDeleting = pricingId != null && deletingPricingId === String(pricingId);
                return (
                  <tr key={String(key)}>
                    <td>{r?.itemName ?? '-'}</td>
                    <td>{r?.warehouseName ?? '-'}</td>
                    <td>{formatVnd(r?.basePrice)}</td>
                    <td>
                      {formatVnd(r?.sellingPrice)}
                      {r?.markupMultiplier != null && (
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px', fontStyle: 'italic' }}>
                          (x{Number(r.markupMultiplier).toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td>
                      {formatVnd(r?.sellingPriceWholesale)}
                      {r?.markupMultiplierWholesale != null && (
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px', fontStyle: 'italic' }}>
                          (x{Number(r.markupMultiplierWholesale).toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td>{r?.effectiveFrom ?? '-'}</td>
                    <td>{r?.effectiveTo ?? '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        disabled={loading || isDeleting || pricingId == null}
                        onClick={() => handleDelete(r)}
                        title={pricingId == null ? 'Thiếu pricingId' : 'Xóa'}
                      >
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.bookingFooter}>
          <div className={styles.pageSize}>
            <span>Hiển thị:</span>
            <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className={styles.pagination}>
            <button
              className={styles.primaryButton}
              disabled={safePage <= 0 || loading}
              onClick={() => setPage(safePage - 1)}
            >
              Trước
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                className={p === safePage ? styles.ghostButton : `${styles.primaryButton} ${styles.isGhost}`}
                disabled={p === safePage || loading}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button
              className={styles.primaryButton}
              disabled={safePage >= Math.max(1, totalPages) - 1 || loading}
              onClick={() => setPage(safePage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <WarehousePricingCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        warehouses={warehouses}
        initialWarehouseId={selectedWarehouseId}
        onCreated={({ warehouseId }) => {
          if (warehouseId != null) setSelectedWarehouseId(String(warehouseId));
          setReloadKey((v) => v + 1);
        }}
      />
    </div>
  );
}
