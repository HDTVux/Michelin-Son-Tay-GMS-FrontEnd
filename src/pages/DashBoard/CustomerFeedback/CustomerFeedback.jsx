import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './CustomerFeedback.module.css';

const CustomerFeedback = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Mock data - thay bằng API call thực tế
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData = [
          {
            feedbackId: 'FB001',
            customerName: 'John Doe',
            ticketCode: 'ST001',
            rating: 5,
            createdAt: '2023-01-01',
            status: 'Mới',
            comment: 'Dịch vụ tốt, nhân viên nhiệt tình',
            customerPhone: '0987654321',
            serviceType: 'Bảo dưỡng',
            response: null
          },
          {
            feedbackId: 'FB002',
            customerName: 'Jane Smith',
            ticketCode: 'ST002',
            rating: 4,
            createdAt: '2023-01-02',
            status: 'Mới',
            comment: 'Tốt nhưng hơi chậm',
            customerPhone: '0912345678',
            serviceType: 'Sửa chữa',
            response: null
          },
          {
            feedbackId: 'FB003',
            customerName: 'Peter Jones',
            ticketCode: 'ST003',
            rating: 3,
            createdAt: '2023-01-03',
            status: 'Đã đóng',
            comment: 'Bình thường',
            customerPhone: '0923456789',
            serviceType: 'Thay dầu',
            response: 'Cảm ơn quý khách đã góp ý'
          }
        ];
        
        setFeedbacks(mockData);
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
        toast.error('Không thể tải danh sách phản hồi');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  const stats = {
    total: feedbacks.length,
    averageRating: feedbacks.length > 0 
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
      : 0,
    new: feedbacks.filter(f => f.status === 'Mới').length,
    resolved: feedbacks.filter(f => f.status === 'Đã đóng').length
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const renderStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesStatus = filterStatus === 'all' || feedback.status === filterStatus;
    const matchesRating = filterRating === 'all' || feedback.rating === parseInt(filterRating);
    const matchesSearch = !searchTerm ||
      feedback.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.feedbackId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (!startDate || new Date(feedback.createdAt) >= new Date(startDate)) &&
                             (!endDate || new Date(feedback.createdAt) <= new Date(endDate));
    
    return matchesStatus && matchesRating && matchesSearch && matchesDateRange;
  });

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setShowModal(true);
  };

  const handleRespondFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setShowModal(true);
  };

  const handleMarkResolved = () => {
    toast.success('Đã đánh dấu phản hồi đã giải quyết');
    // Update API call here
  };

  const handleResetFilters = () => {
    setFilterStatus('all');
    setFilterRating('all');
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Danh sách phản hồi khách hàng</h1>
          <p className={styles.subtitle}>Quản lý và theo dõi phản hồi từ khách hàng</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng số phản hồi</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAssigned}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.averageRating}</div>
            <div className={styles.statLabel}>Đánh giá trung bình</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.new}</div>
            <div className={styles.statLabel}>Phản hồi mới</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCompleted}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.resolved}</div>
            <div className={styles.statLabel}>Phản hồi chưa giải quyết</div>
          </div>
        </div>
      </div>

      {/* Toolbar with Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filterRow}>
          <div className={styles.dateFilter}>
            <label>Ngày bắt đầu</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.dateFilter}>
            <label>Ngày kết thúc</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.filterBox}>
            <label>Đánh giá</label>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Tất cả</option>
              <option value="5">5 Sao</option>
              <option value="4">4 Sao</option>
              <option value="3">3 Sao</option>
              <option value="2">2 Sao</option>
              <option value="1">1 Sao</option>
            </select>
          </div>
          <div className={styles.filterBox}>
            <label>Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Tất cả</option>
              <option value="Mới">Mới</option>
              <option value="Đã đóng">Đã đóng</option>
            </select>
          </div>
        </div>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button className={styles.resetButton} onClick={handleResetFilters}>
            Đặt lại
          </button>
          <button className={styles.applyButton}>
            Áp dụng bộ lọc
          </button>
          <button className={styles.searchButton}>
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Feedback Table */}
      <div className={styles.tableContainer}>
        <table className={styles.feedbackTable}>
          <thead>
            <tr>
              <th>ID Phản hồi</th>
              <th>Tên khách hàng</th>
              <th>ID Phiếu</th>
              <th>Đánh giá</th>
              <th>Ngày nhận</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length > 0 ? (
              filteredFeedbacks.map((feedback) => (
                <FeedbackRow
                  key={feedback.feedbackId}
                  feedback={feedback}
                  onView={handleViewFeedback}
                  onRespond={handleRespondFeedback}
                  onMarkResolved={handleMarkResolved}
                  formatDate={formatDate}
                  renderStars={renderStars}
                />
              ))
            ) : (
              <tr>
                <td colSpan="7" className={styles.emptyRow}>
                  Không có phản hồi nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedFeedback && (
        <FeedbackModal
          feedback={selectedFeedback}
          onClose={() => setShowModal(false)}
          formatDate={formatDate}
          renderStars={renderStars}
        />
      )}
    </div>
  );
};

// Feedback Row Component
const FeedbackRow = ({ feedback, onView, onRespond, onMarkResolved, formatDate, renderStars }) => (
  <tr>
    <td>{feedback.feedbackId}</td>
    <td>{feedback.customerName}</td>
    <td>{feedback.ticketCode}</td>
    <td>
      <span className={styles.ratingStars}>{renderStars(feedback.rating)}</span>
    </td>
    <td>{formatDate(feedback.createdAt)}</td>
    <td>
      <span className={`${styles.statusBadge} ${feedback.status === 'Mới' ? styles.statusNew : styles.statusResolved}`}>
        {feedback.status}
      </span>
    </td>
    <td>
      <div className={styles.actionButtons}>
        <button className={styles.viewBtn} onClick={() => onView(feedback)}>
          Xem
        </button>
        <button className={styles.respondBtn} onClick={() => onRespond(feedback)}>
          Phản hồi
        </button>
        {feedback.status === 'Mới' && (
          <button className={styles.resolveBtn} onClick={() => onMarkResolved(feedback.feedbackId)}>
            Đánh dấu đã giải quyết
          </button>
        )}
      </div>
    </td>
  </tr>
);

// Feedback Modal Component
const FeedbackModal = ({ feedback, onClose, formatDate, renderStars }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>Chi tiết phản hồi — {feedback.feedbackId}</h3>
        <button className={styles.modalClose} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.modalBody}>
        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Thông tin khách hàng</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tên khách hàng</span>
              <span className={styles.infoValue}>{feedback.customerName}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Số điện thoại</span>
              <span className={styles.infoValue}>{feedback.customerPhone}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ID Phiếu</span>
              <span className={styles.infoValue}>{feedback.ticketCode}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Loại dịch vụ</span>
              <span className={styles.infoValue}>{feedback.serviceType}</span>
            </div>
          </div>
        </div>

        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Đánh giá</h4>
          <div className={styles.ratingDisplay}>
            <span className={styles.ratingStarsLarge}>{renderStars(feedback.rating)}</span>
            <span className={styles.ratingText}>{feedback.rating}/5</span>
          </div>
        </div>

        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Nội dung phản hồi</h4>
          <p className={styles.feedbackComment}>{feedback.comment}</p>
        </div>

        {feedback.response && (
          <div className={styles.modalSection}>
            <h4 className={styles.sectionTitle}>Phản hồi của garage</h4>
            <p className={styles.garageResponse}>{feedback.response}</p>
          </div>
        )}

        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Thông tin khác</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ngày nhận</span>
              <span className={styles.infoValue}>{formatDate(feedback.createdAt)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Trạng thái</span>
              <span className={`${styles.statusBadge} ${feedback.status === 'Mới' ? styles.statusNew : styles.statusResolved}`}>
                {feedback.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        <button className={styles.modalCancelBtn} onClick={onClose}>
          Đóng
        </button>
        <button className={styles.modalActionBtn}>
          Gửi phản hồi
        </button>
      </div>
    </div>
  </div>
);

export default CustomerFeedback;
