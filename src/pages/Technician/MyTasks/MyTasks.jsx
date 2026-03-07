import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MyTasks.module.css';

const MyTasks = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with API call
  useEffect(() => {
    const mockTasks = [
      {
        id: 12345,
        licensePlate: '51F-123.45',
        model: 'Toyota Camry',
        serviceType: 'Bảo dưỡng định kỳ',
        priority: 'Combo',
        timeSlot: '09:00 - 10:00',
        status: 'Đã giao',
        customerRequest: 'Kiểm tra và sửa chữa hệ thống phanh, thay dầu động cơ',
        assignedDate: '2024-03-06',
        dueDate: '2024-03-06'
      },
      {
        id: 67890,
        licensePlate: '51G-678.90',
        model: 'Honda Civic',
        serviceType: 'Sửa chữa phanh',
        priority: 'Urgent',
        timeSlot: '10:00 - 11:00',
        status: 'Đang tiến hành',
        customerRequest: 'Tiếng kêu lạ khi phanh, cần kiểm tra gấp',
        assignedDate: '2024-03-06',
        dueDate: '2024-03-06'
      },
      {
        id: 11223,
        licensePlate: '51H-112.23',
        model: 'Mercedes-Benz C-Class',
        serviceType: 'Thay dầu',
        priority: 'Critical',
        timeSlot: '11:00 - 12:00',
        status: 'Đã giao',
        customerRequest: 'Thay dầu động cơ và kiểm tra tổng quát',
        assignedDate: '2024-03-06',
        dueDate: '2024-03-06'
      }
    ];
    
    setTimeout(() => {
      setTasks(mockTasks);
      setLoading(false);
    }, 500);
  }, []);

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
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch = task.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className={styles.title}>🔧 Công việc của tôi</h1>
          <p className={styles.subtitle}>Quản lý và theo dõi các phiếu dịch vụ được giao</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.refreshButton} onClick={() => window.location.reload()}>
            🔄 Làm mới
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng công việc</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAssigned}`}>
          <div className={styles.statIcon}>📌</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.assigned}</div>
            <div className={styles.statLabel}>Đã giao</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statIcon}>⚙️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.inProgress}</div>
            <div className={styles.statLabel}>Đang làm</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCompleted}`}>
          <div className={styles.statIcon}>✅</div>
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
            placeholder="🔍 Tìm kiếm theo biển số, model, loại dịch vụ..."
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
                  👁️ Xem chi tiết
                </button>
                {task.status === 'Đã giao' && (
                  <button 
                    className={styles.startButton}
                    onClick={() => navigate(`/technician/service-ticket/${task.id}`)}
                  >
                    ▶️ Bắt đầu làm việc
                  </button>
                )}
                {task.status === 'Đang tiến hành' && (
                  <button 
                    className={styles.updateButton}
                    onClick={() => navigate(`/technician/update-progress/${task.id}`)}
                  >
                    📝 Cập nhật tiến độ
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <p className={styles.emptyText}>Không tìm thấy công việc nào</p>
            <p className={styles.emptySubtext}>Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasks;
