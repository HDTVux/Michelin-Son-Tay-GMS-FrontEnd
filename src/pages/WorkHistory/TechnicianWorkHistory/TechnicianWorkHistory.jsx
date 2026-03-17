import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TechnicianWorkHistory.module.css';
import { fetchTechnicianWorkHistory } from '../../../services/workHistoryService';

const TechnicianWorkHistory = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [workHistory, setWorkHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');

  const fetchWorkHistory = async (page = 0) => {
    if (!startDate || !endDate) {
      alert('Vui lòng chọn ngày bắt đầu và ngày kết thúc');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchTechnicianWorkHistory(
        { startDate, endDate, licensePlate: searchTerm, page, size: 20 },
        token
      );

      console.log('API Response:', response);
      const data = response.data?.content || response.data?.data?.content || response.data || [];
      setWorkHistory(data);

      // Calculate total pages from response
      const total = response.data?.totalPages || 1;
      setTotalPages(total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching work history:', error);
      console.log('Error response:', error.response?.data);
      alert('Lỗi khi tải dữ liệu: ' + (error.response?.data?.message || error.message));
      setWorkHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchWorkHistory(0);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setWorkHistory([]);
    setTotalPages(0);
    setCurrentPage(0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchWorkHistory(newPage);
    }
  };

  const filteredHistory = workHistory.filter(item => {
    const matchSearch = searchTerm === '' ||
      (item.licensePlate && item.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.ticketCode && item.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchSearch;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lịch sử công việc của tôi</h1>
      </div>

      {/* Filter Section */}
      <div className={styles.filterSection}>
        <div className={styles.dateFilters}>
          <div className={styles.dateGroup}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
              placeholder="mm/dd/yyyy"
            />
            <span className={styles.dateSeparator}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
              placeholder="mm/dd/yyyy"
            />
          </div>
        </div>

        <div className={styles.searchRow}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo biển số"
            className={styles.searchInput}
          />

          <button onClick={handleSearch} className={styles.searchBtn} disabled={loading}>
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>

          <button onClick={handleReset} className={styles.resetBtn}>
            Reset
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Biển số</th>
              <th>Mã phiếu</th>
              <th>Loại dịch vụ</th>
              <th>Ghi chú</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className={styles.noData}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((item, index) => (
                <tr key={item.serviceTicketId || index}>
                  <td>{item.completedDate || '-'}</td>
                  <td>{item.licensePlate || '-'}</td>
                  <td className={styles.ticketCode}>{item.ticketCode || '-'}</td>
                  <td>{item.serviceType || '-'}</td>
                  <td>{item.technicianNotes || item.customerRequest || '-'}</td>
                  <td>
                    <button
                      className={styles.viewBtn}
                      onClick={() => navigate(`/technician/safetyinspection-ticket/${item.ticketCode}`)}
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className={styles.noData}>
                  {startDate && endDate ? 'Không tìm thấy dữ liệu' : 'Vui lòng chọn ngày để tìm kiếm'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Trang {currentPage + 1} / {totalPages}
          </span>
          <div className={styles.pageButtons}>
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
