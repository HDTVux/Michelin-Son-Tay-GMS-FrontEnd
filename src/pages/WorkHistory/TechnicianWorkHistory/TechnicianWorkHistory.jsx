import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TechnicianWorkHistory.module.css';
import { fetchTechnicianWorkHistory } from '../../../services/workHistoryService';

const TechnicianWorkHistory = () => {
  const navigate = useNavigate();
  const [activeDate, setActiveDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workHistory, setWorkHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const dayPickerRef = useRef(null);

  const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

  // ─── Date helpers ─────────────────────────────────────────────────
  const formatCalendarDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handlePreviousDay = () => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() - 1);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() + 1);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  const handlePickDay = (val) => {
    setActiveDate(val);
    if (dayPickerRef.current) dayPickerRef.current.value = '';
  };

  const handleOpenCalendar = () => {
    if (dayPickerRef.current) {
      dayPickerRef.current.showPicker?.();
      dayPickerRef.current.focus();
    }
  };

  const handleReset = () => {
    setActiveDate(new Date().toISOString().split('T')[0]);
    setSearchTerm('');
    setStatusFilter('');
    setWorkHistory([]);
    setTotalPages(0);
    setCurrentPage(0);
  };

  // ─── Fetch ────────────────────────────────────────────────────────
  const fetchWorkHistory = async (page = 0) => {
    setLoading(true);
    try {
      const response = await fetchTechnicianWorkHistory(
        { startDate: activeDate, endDate: activeDate, licensePlate: searchTerm, status: statusFilter, page, size: 20 },
        token
      );

      // Parse response: hỗ trợ nhiều shape khác nhau từ backend
      // Shape: { success, data: { content: [], totalPages: n } } → apiClient trả nguyên body
      const raw = response?.data ?? response ?? {};
      const content = Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(raw?.data?.content)
        ? raw.data.content
        : Array.isArray(raw)
        ? raw
        : [];

      setWorkHistory(content);

      const total = Number(raw?.totalPages ?? raw?.data?.totalPages ?? 1);
      setTotalPages(Math.max(1, total));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching work history:', error);
      console.log('Error response:', error.response?.data);
      setWorkHistory([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchWorkHistory(0);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchWorkHistory(newPage);
    }
  };

  // Filter client-side by searchTerm (biển số / mã phiếu)
  const filteredHistory = workHistory.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      term === '' ||
      (item.licensePlate && item.licensePlate.toLowerCase().includes(term)) ||
      (item.ticketCode && item.ticketCode.toLowerCase().includes(term))
    );
  });

  // ─── Status helpers ───────────────────────────────────────────────
  const getStatusDisplay = (status) => {
    const map = {
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
      PENDING: 'Chờ xử lý',
      IN_PROGRESS: 'Đang thực hiện',
    };
    return map[status] || status || '-';
  };

  const getStatusClass = (status) => {
    const map = {
      COMPLETED: styles.statusActive,
      CANCELLED: styles.statusInactive,
      PENDING: styles.statusPending,
      IN_PROGRESS: styles.statusPending,
    };
    return map[status] || styles.statusInactive;
  };

  // ─── Render ────────────────────────────────────────────────────────
  let mainContent;

  if (loading) {
    mainContent = (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  } else if (filteredHistory.length > 0) {
    mainContent = (
      <div className={styles.bookingCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Biển số</th>
                <th>Mã phiếu</th>
                <th>Loại dịch vụ</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item, index) => (
                <tr key={item.serviceTicketId || index}>
                  <td>{item.completedDate || '-'}</td>
                  <td>
                    {item.licensePlate ? (
                      <span className={styles.licensePlate}>{item.licensePlate}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className={styles.ticketCodeCell}>{item.ticketCode || '-'}</td>
                  <td>{item.serviceType || '-'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(item.status)}`}>
                      {getStatusDisplay(item.status)}
                    </span>
                  </td>
                  <td>{item.technicianNotes || item.customerRequest || '-'}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={`${styles.actionBtn} ${styles.viewBtn}`}
                        onClick={() =>
                          navigate(`/technician/safetyinspection-ticket/${item.ticketCode}`)
                        }
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } else {
    mainContent = (
      <div className={styles.bookingCard}>
        <div className={styles.emptyState}>
          <p>Không tìm thấy dữ liệu</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bookingPage}>
      {/* ── Header ── */}
      <div className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <div className={styles.headerIcon}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h1>Lịch sử công việc của tôi</h1>
        </div>
      </div>

      {/* ── Filter ── */}
      <div className={styles.pendingFilters}>
        {/* Labels */}
        <div className={`${styles.filterCardLabels} ${styles.filterCardLabelsTwo}`}>
          <span>Lịch ngày</span>
          <span>Trạng thái</span>
        </div>

        {/* Controls: day navigator + status select */}
        <div className={`${styles.filterCardControls} ${styles.filterCardControlsTwo}`}>
          <div className={styles.dayNavigator}>
            <button type="button" className={styles.dayNavBtn} onClick={handlePreviousDay}>
              Trước
            </button>
            <button type="button" className={styles.dayCenterBtn} onClick={handleOpenCalendar}>
              {formatCalendarDisplay(activeDate)}
            </button>
            <button type="button" className={styles.dayNavBtn} onClick={handleNextDay}>
              Sau
            </button>
            <input
              ref={dayPickerRef}
              type="date"
              value={activeDate}
              onChange={(e) => handlePickDay(e.target.value)}
              className={styles.hiddenDateInput}
              aria-label="Chọn ngày"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {/* Search + Reset */}
        <div className={styles.filterCardActions}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã phiếu, biển số..."
            />
          </div>

          <button
            className={styles.primaryButton}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>

          <button className={styles.ghostButton} onClick={handleReset}>
            Về hôm nay
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {mainContent}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.bookingFooter}>
          <span className={styles.pageInfo}>
            Trang {currentPage + 1} / {totalPages}
          </span>
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              ‹ Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`${styles.pageBtn} ${currentPage === i ? styles.active : ''}`}
                onClick={() => handlePageChange(i)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
            >
              Sau ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianWorkHistory;
