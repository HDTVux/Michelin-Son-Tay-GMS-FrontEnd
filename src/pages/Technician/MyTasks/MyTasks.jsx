import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTickets } from '../../../services/technicianService';
import styles from './MyTasks.module.css';

const MyTasks = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
        if (!token) {
          toast.error('Vui lòng đăng nhập để xem công việc');
          setLoading(false);
          return;
        }

        const response = await fetchTechnicianTickets({ page: 0, size: 50 }, token);

        // Transform API response to match component expectations
        const tickets = response.data?.content || response.data || [];
        const transformedTasks = tickets.map(ticket => ({
          id: ticket.ticketCode,
          licensePlate: ticket.licensePlate || '',
          model: ticket.vehicleModel || ticket.vehicleName || '',
          serviceType: ticket.serviceType || ticket.bookingServiceType || '',
          priority: ticket.priority || 'Normal',
          timeSlot: ticket.timeSlot || ticket.appointmentTime || '',
          status: mapStatus(ticket.status),
          customerRequest: ticket.customerRequest || ticket.notes || '',
          assignedDate: ticket.receivedDate || ticket.createdDate || '',
          dueDate: ticket.dueDate || ticket.appointmentDate || ''
        }));

        setTasks(transformedTasks);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Không thể tải danh sách công việc: ' + (error.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Map backend status to frontend status
  const mapStatus = (status) => {
    if (!status) return 'Đã giao';
    const statusMap = {
      'DRAFT': 'Đã giao',
      'CREATED': 'Đã giao',
      'IN_PROGRESS': 'Đang tiến hành',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy'
    };
    return statusMap[status.toUpperCase()] || 'Đã giao';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Đã giao':
        return styles.statusAssigned;
      case 'Đang tiến hành':
        return styles.statusInProgress;
      case 'Hoàn thành':
        return styles.statusCompleted;
      case 'Tạm dừng':
        return styles.statusPaused;
      default:
        return '';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'Critical':
        return styles.priorityCritical;
      case 'Urgent':
        return styles.priorityUrgent;
      case 'Combo':
        return styles.priorityCombo;
      default:
        return styles.priorityNormal;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'Đã giao' && (task.status === 'Đã giao' || !task.status)) ||
      task.status === filterStatus;
    const matchesSearch = !searchTerm ||
      (task.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.model?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleViewTask = (taskId) => {
    navigate(`/technician/service-ticket/${taskId}`);
  };

  const stats = {
    total: tasks.length,
    assigned: tasks.filter(t => t.status === 'Đã giao').length,
    inProgress: tasks.filter(t => t.status === 'Đang tiến hành').length,
    completed: tasks.filter(t => t.status === 'Hoàn thành').length
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
          <h1 className={styles.title}>Công việc của tôi</h1>
          <p className={styles.subtitle}>Quản lý và theo dõi các phiếu dịch vụ được giao</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.refreshButton} onClick={() => window.location.reload()}>
            Lam moi
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng công việc</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAssigned}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.assigned}</div>
            <div className={styles.statLabel}>Đã giao</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.inProgress}</div>
            <div className={styles.statLabel}>Đang làm</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCompleted}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Tim kiem theo bien so, model, loai dich vu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <label>Lọc theo trạng thái:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tất cả</option>
            <option value="Đã giao">Đã giao</option>
            <option value="Đang tiến hành">Đang tiến hành</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Tạm dừng">Tạm dừng</option>
          </select>
        </div>
      </div>

      <div className={styles.tasksList}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskHeader}>
                <div className={styles.taskHeaderLeft}>
                  <h3 className={styles.taskTitle}>Phiếu #{task.id}</h3>
                  <span className={`${styles.priorityBadge} ${getPriorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className={styles.taskHeaderRight}>
                  <span className={`${styles.statusBadge} ${getStatusClass(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>

              <div className={styles.taskBody}>
                <div className={styles.taskRow}>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Biển số:</span>
                    <span className={styles.fieldValue}>{task.licensePlate}</span>
                  </div>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Model:</span>
                    <span className={styles.fieldValue}>{task.model}</span>
                  </div>
                </div>

                <div className={styles.taskRow}>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Loại dịch vụ:</span>
                    <span className={styles.fieldValue}>{task.serviceType}</span>
                  </div>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Time slot:</span>
                    <span className={styles.fieldValue}>{task.timeSlot}</span>
                  </div>
                </div>

                <div className={styles.taskRow}>
                  <div className={styles.taskField} style={{ width: '100%' }}>
                    <span className={styles.fieldLabel}>Yêu cầu khách hàng:</span>
                    <p className={styles.customerRequest}>{task.customerRequest}</p>
                  </div>
                </div>

                <div className={styles.taskRow}>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Ngày giao:</span>
                    <span className={styles.fieldValue}>{new Date(task.assignedDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Hạn hoàn thành:</span>
                    <span className={styles.fieldValue}>{new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              <div className={styles.taskFooter}>
                <button 
                  className={styles.viewButton}
                  onClick={() => handleViewTask(task.id)}
                >
                  Xem chi tiet
                </button>
                {task.status === 'Đã giao' && (
                  <button 
                    className={styles.startButton}
                    onClick={() => navigate(`/technician/service-ticket/${task.id}`)}
                  >
                    Bat dau lam viec
                  </button>
                )}
                {task.status === 'Đang tiến hành' && (
                  <button 
                    className={styles.updateButton}
                    onClick={() => navigate(`/technician/update-progress/${task.id}`)}
                  >
                    Cap nhat tien do
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Khong tim thay cong viec nao</p>
            <p className={styles.emptySubtext}>Thu thay doi bo loc hoac tim kiem khac</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasks;
