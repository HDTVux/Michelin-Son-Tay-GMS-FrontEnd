import { useMemo } from 'react';
import styles from './Pagination.module.css';

/**
 * Pagination Component - Reusable pagination with page size selector
 * 
 * @param {number} currentPage - Current page (0-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} pageSize - Current page size
 * @param {number} totalElements - Total number of elements
 * @param {function} onPageChange - Callback when page changes
 * @param {function} onPageSizeChange - Callback when page size changes
 * @param {boolean} isLoading - Loading state
 * @param {array} pageSizeOptions - Available page size options (default: [5, 10, 50, 'all'])
 */
const Pagination = ({
  currentPage = 0,
  totalPages = 1,
  pageSize = 10,
  totalElements = 0,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  pageSizeOptions = [5, 10, 50, 'all']
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(0, currentPage), safeTotalPages - 1);

  // Calculate page range to display
  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const current = safePage;
    const last = safeTotalPages - 1;
    const start = Math.max(0, Math.min(current - 2, last - (maxButtons - 1)));
    const end = Math.min(last, start + (maxButtons - 1));
    const items = [];
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    return items;
  }, [safePage, safeTotalPages]);

  // Calculate display range
  const startItem = pageSize === 'all' ? 1 : safePage * pageSize + 1;
  const endItem = pageSize === 'all' 
    ? totalElements 
    : Math.min((safePage + 1) * pageSize, totalElements);

  const handlePageSizeChange = (newSize) => {
    const size = newSize === 'all' ? totalElements : Number(newSize);
    onPageSizeChange?.(size);
  };

  return (
    <div className={styles.paginationContainer}>
      {/* Left: Page size selector */}
      <div className={styles.pageSizeSelector}>
        <span className={styles.label}>Hiển thị:</span>
        <select
          value={pageSize === totalElements ? 'all' : String(pageSize)}
          onChange={(e) => handlePageSizeChange(e.target.value)}
          className={styles.select}
          disabled={isLoading}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'Tất cả' : option}
            </option>
          ))}
        </select>
        <span className={styles.info}>
          {totalElements > 0 
            ? `${startItem}-${endItem} / ${totalElements}` 
            : '0 / 0'}
        </span>
      </div>

      {/* Right: Page navigation */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className={styles.pageNavigation}>
          {/* First page button */}
          <button
            className={styles.navButton}
            disabled={safePage === 0 || isLoading}
            onClick={() => onPageChange?.(0)}
            title="Trang đầu"
          >
            ⟪
          </button>

          {/* Previous page button */}
          <button
            className={styles.navButton}
            disabled={safePage === 0 || isLoading}
            onClick={() => onPageChange?.(safePage - 1)}
            title="Trang trước"
          >
            ‹
          </button>

          {/* Page number buttons */}
          {pageButtons.map((pageNum) => {
            const isActive = pageNum === safePage;
            return (
              <button
                key={pageNum}
                className={`${styles.pageButton} ${isActive ? styles.active : ''}`}
                disabled={isActive || isLoading}
                onClick={() => onPageChange?.(pageNum)}
              >
                {pageNum + 1}
              </button>
            );
          })}

          {/* Next page button */}
          <button
            className={styles.navButton}
            disabled={safePage >= safeTotalPages - 1 || isLoading}
            onClick={() => onPageChange?.(safePage + 1)}
            title="Trang sau"
          >
            ›
          </button>

          {/* Last page button */}
          <button
            className={styles.navButton}
            disabled={safePage >= safeTotalPages - 1 || isLoading}
            onClick={() => onPageChange?.(safeTotalPages - 1)}
            title="Trang cuối"
          >
            ⟫
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
