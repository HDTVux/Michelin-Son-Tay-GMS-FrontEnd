import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
// Lưu ý: Nếu bạn để CSS chung thì giữ nguyên dòng này. 
// Nếu tách file thì đổi thành import styles from './CatalogPicker.module.css';
import styles from './CatalogPicker.module.css'; 
import { searchWarehouseCatalogItems } from '../../../services/warehouseService.js';
import { formatCurrencyVnd } from './useAdvisorItemsTableHandlers.js';

function CatalogPicker({ open, onClose, onPick, initialSearch = '', initialPage = 0, pageSize = 10, initQuery = '', categoryCode = '' }) {
  const dialogRef = useRef(null); // Tạo ref để điều khiển thẻ dialog

  const [search, setSearch] = useState(initialSearch || initQuery);
  const [page, setPage] = useState(initialPage);
  const [size] = useState(pageSize);
  const [results, setResults] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Effect này bắt sự kiện khi prop 'open' thay đổi để mở/đóng Modal chính giữa màn hình
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal(); // Hàm này giúp Modal ra giữa màn hình và khóa nền
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Khi mở dialog, nếu initQuery khác rỗng và khác search hiện tại thì setSearch(initQuery)
  useEffect(() => {
    if (open && initQuery && search !== initQuery) {
      setSearch(initQuery);
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initQuery]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');
        // Nếu có categoryCode thì truyền vào params tìm kiếm
        const params = { page, size, search };
        if (categoryCode) params.categoryCode = categoryCode;
        const res = await searchWarehouseCatalogItems(params, token);
        const payload = res?.data ?? res;
        const content = Array.isArray(payload?.content) ? payload.content : Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setResults(content);
        setTotalElements(Number(payload?.totalElements ?? content.length));
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setTotalElements(0);
        setError(err?.message || 'Không thể tải danh mục sản phẩm.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, page, size, search, categoryCode]);

  const handlePick = (item) => {
    onPick?.(item);
  };

  // Chỉ render dialog khi `open` = true để tránh reflow/jitter khi không hiển thị
  if (!open) return null;

  return (
    <dialog
      ref={dialogRef} // Gắn ref vào đây
      className={styles.catalogPickerDialog}
      aria-labelledby="catalog-picker-title"
      onCancel={(e) => {
        // Ngăn ESC đóng modal; chỉ đóng qua nút 'Đóng' hoặc '×'
        e.preventDefault();
      }}
      onClick={(e) => {
        // Ngăn click vào backdrop vô tình đóng hoặc gây reflow
        if (e.target === dialogRef.current) {
          e.stopPropagation();
        }
      }}
    >
      <div className={styles.modalHeader}>
        <h3 id="catalog-picker-title" className={styles.modalTitle}>Chọn sản phẩm từ danh mục</h3>
        <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Đóng">×</button>
      </div>
      <div className={styles.modalBody}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => setPage(0)} disabled={loading}>
            Tìm
          </button>
        </div>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        {loading ? (
          <div>Đang tải danh mục...</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>SKU</th>
                    <th>HÃNG</th>
                    <th>Màu sắc</th>
                    <th>Xuất xứ</th>
                    <th>GIÁ</th>
                    <th>ĐV</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(results) && results.length > 0) ? (
                    results.map((it, i) => (
                      <tr key={String(it?.itemId ?? it?.id ?? `res-${i}`)}>
                        <td>{it?.itemId ?? '-'}</td>
                        <td>{it?.itemName || it?.name || '-'}</td>
                        <td>{it?.sku || '-'}</td>
                        <td>{it?.brand || '-'}</td>
                        <td>{it?.color || '-'}</td>
                        <td>{it?.madeIn || '-'}</td>
                        <td className={styles.tdNumber}>{formatCurrencyVnd(it?.price ?? it?.unitPrice)}</td>
                        <td>{it?.unit || '-'}</td>
                        <td>
                          <button  type="button" className="ui-btn ui-btn--primary" onClick={() => handlePick(it)}>
                            Chọn
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className={styles.emptyRow}>
                        Không có kết quả.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.modalFooter}>
              {/* Cụm phân trang bên trái */}
              <div className={styles.pagination}>
                <button 
                  type="button" 
                  className="ui-btn ui-btn--ghost" 
                  onClick={() => setPage(Math.max(0, page - 1))} 
                  disabled={page <= 0 || loading}
                >
                  ← Trước
                </button>
                
                <span className={styles.pageInfo}>
                  Trang {page + 1} / {Math.max(1, Math.ceil(totalElements / size))}
                </span>
                
                <button 
                  type="button" 
                  className="ui-btn ui-btn--ghost" 
                  onClick={() => setPage(page + 1)} 
                  disabled={(page + 1) * size >= totalElements || loading}
                >
                  Tiếp →
                </button>
              </div>

              {/* Nút hành động bên phải */}
              <div className={styles.modalActions}>
                <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
                  Đóng
                </button>
              </div>
            </div>
            {/* KẾT THÚC PHẦN THAY THẾ */}
          </>
        )}
      </div>
    </dialog>
  );
}

CatalogPicker.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onPick: PropTypes.func,
  initialSearch: PropTypes.string,
  initialPage: PropTypes.number,
  pageSize: PropTypes.number,
  initQuery: PropTypes.string,
  categoryCode: PropTypes.string,
};

export default CatalogPicker;