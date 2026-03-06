import { useState } from 'react';
import styles from './TechnicianWorkHistory.module.css';

const TechnicianWorkHistory = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');

  const [workHistory] = useState([
    { id: 1, date: '2024-01-15', ticketCode: '51F-123.45', service: 'Thay nhớt', notes: 'Kiểm tra lốp xe', vehicle: '29A-12345', customer: 'Nguyễn Văn A', duration: '45 phút' },
    { id: 2, date: '2024-01-10', ticketCode: '50C-187.65', service: 'Sửa phanh', notes: 'Thay má phanh trước', vehicle: '30B-67890', customer: 'Trần Thị B', duration: '2 giờ' },
    { id: 3, date: '2024-01-08', ticketCode: '49A-256.32', service: 'Bảo dưỡng định kỳ', notes: 'Kiểm tra toàn bộ hệ thống', vehicle: '31C-11111', customer: 'Lê Văn C', duration: '1.5 giờ' },
    { id: 4, date: '2024-01-05', ticketCode: '48B-145.78', service: 'Thay lốp xe', notes: 'Thay 4 lốp mới', vehicle: '32D-22222', customer: 'Phạm Thị D', duration: '1 giờ' },
    { id: 5, date: '2024-01-03', ticketCode: '47C-198.45', service: 'Kiểm tra điện', notes: 'Sửa hệ thống đèn', vehicle: '33E-33333', customer: 'Hoàng Văn E', duration: '30 phút' },
    { id: 6, date: '2024-01-02', ticketCode: '46D-234.56', service: 'Thay nhớt', notes: 'Bảo dưỡng nhẹ', vehicle: '34F-44444', customer: 'Võ Thị F', duration: '40 phút' }
  ]);

  const handleSearch = () => {
    console.log('Searching with:', { startDate, endDate, searchTerm, serviceFilter });
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setServiceFilter('all');
  };

  const filteredHistory = workHistory.filter(item => {
    const matchSearch = searchTerm === '' || 
      item.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchService = serviceFilter === 'all' || item.service.includes(serviceFilter);
    
    return matchSearch && matchService;
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
          
          <select 
            value={serviceFilter} 
            onChange={(e) => setServiceFilter(e.target.value)}
            className={styles.serviceSelect}
          >
            <option value="all">Tất cả loại dịch vụ</option>
            <option value="Thay nhớt">Thay nhớt</option>
            <option value="Sửa phanh">Sửa phanh</option>
            <option value="Bảo dưỡng">Bảo dưỡng</option>
            <option value="Kiểm tra">Kiểm tra</option>
            <option value="Thay lốp">Thay lốp</option>
          </select>

          <button onClick={handleSearch} className={styles.searchBtn}>
            Search/View
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
              <th>Loại dịch vụ</th>
              <th>Notes</th>
              <th>Thời gian</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map(item => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td className={styles.ticketCode}>{item.ticketCode}</td>
                  <td>{item.service}</td>
                  <td>{item.notes}</td>
                  <td>{item.duration}</td>
                  <td>
                    <button className={styles.viewBtn}>👁️ Xem</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className={styles.noData}>
                  Không tìm thấy dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          Hiển thị {filteredHistory.length} kết quả
        </span>
        <div className={styles.pageButtons}>
          <button className={styles.pageBtn} disabled>‹ Trước</button>
          <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
          <button className={styles.pageBtn}>2</button>
          <button className={styles.pageBtn}>3</button>
          <button className={styles.pageBtn}>Sau ›</button>
        </div>
      </div>
    </div>
  );
};

export default TechnicianWorkHistory;
