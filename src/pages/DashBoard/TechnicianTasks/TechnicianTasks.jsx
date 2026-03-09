import { useState } from 'react';
import styles from './TechnicianTasks.module.css';

const TechnicianTasks = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data - sẽ thay bằng API
  const tasks = [
    {
      id: '51F-123.45',
      licensePlate: '51F-123.45',
      model: 'Toyota Camry',
      service: 'Bảo dưỡng định kỳ',
      serviceType: 'Combo',
      timeSlot: '09:00 - 10:00',
      status: 'in_progress',
      priority: 'high',
      customer: 'Nguyễn Văn A',
      phone: '0912345678',
      assignedAt: '2024-02-20 08:30',
      estimatedTime: '60 phút',
      progress: 45
    },
    {
      id: '51G-678.90',
      licensePlate: '51G-678.90',
      model: 'Honda Civic',
      service: 'Sửa chữa phanh',
      serviceType: 'Urgent',
      timeSlot: '10:00 - 11:00',
      status: 'in_progress',
      priority: 'urgent',
      customer: 'Trần Thị B',
      phone: '0987654321',
      assignedAt: '2024-02-20 09:45',
      estimatedTime: '90 phút',
      progress: 20
    },
    {
      id: '51H-112.23',
      licensePlate: '51H-112.23',
      model: 'Mercedes-Benz C-Class',
      service: 'Thay dầu',
      serviceType: 'Critical',
      timeSlot: '11:00 - 12:00',
      status: 'pending',
      priority: 'medium',
      customer: 'Lê Văn C',
      phone: '0901234567',
      assignedAt: '2024-02-20 10:30',
      estimatedTime: '45 phút',
      progress: 0
    },
    {
      id: '51K-456.78',
      licensePlate: '51K-456.78',
      model: 'BMW X5',
      service: 'Kiểm tra tổng quát',
      serviceType: 'Combo',
      timeSlot: '14:00 - 15:00',
      status: 'completed',
      priority: 'low',
      customer: 'Phạm Thị D',
      phone: '0938765432',
      assignedAt: '2024-02-20 13:00',
      estimatedTime: '120 phút',
      progress: 100
    }
  ];

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Đã giao',
      'in_progress': 'Đang tiến hành',
      'completed': 'Đã giao',
      'paused': 'Tạm dừng'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'in_progress': return styles.statusInProgress;
      case 'completed': return styles.statusCompleted;
      case 'paused': return styles.statusPaused;
      default: return '';
    }
  };

  const getPriorityText = (priority) => {
    const priorityMap = {
      'urgent': 'Khẩn cấp',
      'high': 'Cao',
      'medium': 'Trung bình',
      'low': 'Thấp'
    };
    return priorityMap[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return styles.priorityUrgent;
      case 'high': return styles.priorityHigh;
      case 'medium': return styles.priorityMedium;
      case 'low': return styles.priorityLow;
      default: return '';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchSearch = task.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       task.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       task.customer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const handleViewDetail = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleStartTask = (taskId) => {
    console.log('Start task:', taskId);
    // TODO: Call API to start task
  };

  const handleCompleteTask = (taskId) => {
    console.log('Complete task:', taskId);
    // TODO: Call API to complete task
  };

  const handlePauseTask = (taskId) => {
    console.log('Pause task:', taskId);
    // TODO: Call API to pause task
  };

  // Statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Công việc của tôi</h1>
          <p className={styles.subtitle}>Quản lý và theo dõi các công việc được giao</p>
        </div>
        <button className={styles.viewAssignedBtn}>
          View Assigned Tasks (Technician)
        </button>
      </div>

      {/* Statistics */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng công việc</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statPending}`}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Chờ bắt đầu</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statInProgress}`}>
          <div className={styles.statIcon}>🔧</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.inProgress}</div>
            <div className={styles.statLabel}>Đang thực hiện</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCompleted}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterLeft}>
          <select 
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Lọc theo trạng thái</option>
            <option value="pending">Chờ bắt đầu</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="completed">Hoàn thành</option>
            <option value="paused">Tạm dừng</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">Lọc theo độ ưu tiên</option>
            <option value="urgent">Khẩn cấp</option>
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
        </div>

        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo biển số, model, khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Task List */}
      <div className={styles.taskList}>
        {filteredTasks.map((task) => (
          <div key={task.id} className={styles.taskCard}>
            <div className={styles.taskHeader}>
              <div className={styles.taskHeaderLeft}>
                <div className={styles.licensePlate}>{task.licensePlate}</div>
                <div className={styles.model}>{task.model}</div>
              </div>
              <div className={styles.taskHeaderRight}>
                <span className={`${styles.priorityBadge} ${getPriorityColor(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
                <span className={`${styles.statusBadge} ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
              </div>
            </div>

            <div className={styles.taskBody}>
              <div className={styles.taskInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Loại dịch vụ:</span>
                  <span className={styles.infoValue}>{task.service}</span>
                  <span className={`${styles.serviceTypeBadge} ${styles[`type${task.serviceType}`]}`}>
                    {task.serviceType}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Time slot:</span>
                  <span className={styles.infoValue}>{task.timeSlot}</span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Thời gian ước tính:</span>
                  <span className={styles.infoValue}>{task.estimatedTime}</span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Khách hàng:</span>
                  <span className={styles.infoValue}>{task.customer} - {task.phone}</span>
                </div>
              </div>

              {task.status === 'in_progress' && (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span>Tiến độ</span>
                    <span className={styles.progressPercent}>{task.progress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.taskActions}>
              <button 
                className={styles.btnDetail}
                onClick={() => handleViewDetail(task)}
              >
                Chi tiết
              </button>

              {task.status === 'pending' && (
                <button 
                  className={styles.btnStart}
                  onClick={() => handleStartTask(task.id)}
                >
                  Bắt đầu
                </button>
              )}

              {task.status === 'in_progress' && (
                <>
                  <button 
                    className={styles.btnPause}
                    onClick={() => handlePauseTask(task.id)}
                  >
                    Tạm dừng
                  </button>
                  <button 
                    className={styles.btnComplete}
                    onClick={() => handleCompleteTask(task.id)}
                  >
                    Hoàn thành
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <p className={styles.emptyText}>Không có công việc nào</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Chi tiết công việc</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Thông tin xe</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Biển số:</span>
                    <span className={styles.detailValue}>{selectedTask.licensePlate}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Model:</span>
                    <span className={styles.detailValue}>{selectedTask.model}</span>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Thông tin dịch vụ</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Loại dịch vụ:</span>
                    <span className={styles.detailValue}>{selectedTask.service}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Time slot:</span>
                    <span className={styles.detailValue}>{selectedTask.timeSlot}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Thời gian ước tính:</span>
                    <span className={styles.detailValue}>{selectedTask.estimatedTime}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Trạng thái:</span>
                    <span className={`${styles.detailValue} ${getStatusColor(selectedTask.status)}`}>
                      {getStatusText(selectedTask.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Thông tin khách hàng</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tên khách hàng:</span>
                    <span className={styles.detailValue}>{selectedTask.customer}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Số điện thoại:</span>
                    <span className={styles.detailValue}>{selectedTask.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.btnModalClose}
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianTasks;
