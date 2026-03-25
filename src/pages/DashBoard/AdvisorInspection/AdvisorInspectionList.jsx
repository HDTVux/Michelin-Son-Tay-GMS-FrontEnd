import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchServiceTicketsPaged } from '../../../services/serviceTicketService';
import styles from './AdvisorInspection.module.css';

const AdvisorInspectionList = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        const params = {
          page: currentPage - 1,
          size: itemsPerPage,
          search: searchTerm || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        };

        const response = await fetchServiceTicketsPaged(params, token);
        if (response?.data) {
          setTickets(response.data.content || response.data || []);
          setTotalItems(response.data.totalElements || response.data.totalItems || 0);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Không thể tải danh sách phiếu');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [currentPage, searchTerm, statusFilter, navigate]);

  // Handle view inspection
  const handleViewInspection = (ticketCode) => {
    navigate(`/advisor/inspection/${ticketCode}`);
  };

  // Get status display
  const getStatusDisplay = (status) => {
    const statusMap = {
      'PENDING_CHECKIN': 'Chờ check-in',
      'CHECKED_IN': 'Đã check-in',
      'IN_PROGRESS': 'Đang xử lý',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  // Get status class
  const getStatusClass = (status) => {
    const classMap = {
      'PENDING_CHECKIN': styles.statusPending,
      'CHECKED_IN': styles.statusActive,
      'IN_PROGRESS': styles.statusActive,
      'COMPLETED': styles.statusCompleted,
      'CANCELLED': styles.statusInactive
    };
    return classMap[status] || styles.statusInactive;
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  let mainContent = null;
  if (loading) {
    mainContent = (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  } else if (tickets.length === 0) {
    mainContent = (
      <div className={styles.emptyState}>
        <p>Không có phiếu nào</p>
      </div>
    );
  } else {
    mainContent = (
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã phiếu</th>
              <th>Biển số xe</th>
              <th>Tên khách hàng</th>
              <th>Tên dịch vụ</th>
              <th>Ngày đặt</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, index) => (
              <tr key={ticket.ticketCode || ticket.id}>
                <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td style={{ fontWeight: 600, color: '#1268d3' }}>{ticket.ticketCode || ticket.code}</td>
                <td>{ticket.licensePlate || '-'}</td>
                <td>{ticket.customerName || ticket.fullName || '-'}</td>
                <td>{ticket.serviceName || ticket.service || '-'}</td>
                <td>{ticket.appointmentDate || ticket.bookingDate || '-'}</td>
                <td>
                  <span className={`${styles.statusBadge} ${getStatusClass(ticket.status)}`}>
                    {getStatusDisplay(ticket.status)}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      className={`${styles.actionBtn} ${styles.viewBtn}`}
                      onClick={() => handleViewInspection(ticket.ticketCode || ticket.code)}
                    >
                      Xem
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Phiếu kiểm tra - Cố vấn viên</h1>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã phiếu, biển số, khách hàng..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_CHECKIN">Chờ check-in</option>
            <option value="CHECKED_IN">Đã check-in</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="COMPLETED">Hoàn thành</option>
          </select>
        </div>
      </div>

      {mainContent}

      {!loading && tickets.length > 0 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Trước
          </button>
          <span className={styles.paginationInfo}>
            Trang {currentPage} / {totalPages || 1}
          </span>
          <button
            className={styles.paginationBtn}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvisorInspectionList;
