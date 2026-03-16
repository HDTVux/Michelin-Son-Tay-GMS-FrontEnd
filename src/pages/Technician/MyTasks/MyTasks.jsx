import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTickets, fetchTechnicianTicketDetail } from '../../../services/technicianService';
import styles from './MyTasks.module.css';

const MyTasks = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
          id: ticket.serviceTicketId,
          ticketCode: ticket.ticketCode,
          // List API returns flat structure
          licensePlate: ticket.licensePlate || '',
          make: ticket.vehicleMake || '',
          model: ticket.vehicleModel || '',
          serviceType: ticket.serviceCategory || '',
          priority: ticket.priority || 'Normal',
          timeSlot: ticket.scheduledTime || '',
          status: mapStatus(ticket.ticketStatus),
          customerRequest: ticket.customerRequest || '',
          customerName: ticket.customerName || '',
          customerPhone: ticket.customerPhone || '',
          assignedDate: ticket.receivedAt || ticket.createdAt || '',
          dueDate: ticket.scheduledDate || '',
          technicianNotes: ticket.technicianNotes,
          // Services will be loaded from detail API
          services: []
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
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchTickets, 30000);
    
    return () => clearInterval(interval);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
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

  const handleViewTask = async (task) => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      const response = await fetchTechnicianTicketDetail(task.ticketCode || task.id, token);
      console.log('📋 Task Detail Response:', response.data);
      
      const data = response.data;
      
      // Map nested objects correctly
      setSelectedTask({
        ...task,
        // Service ticket info
        serviceTicketId: data.serviceTicketId,
        ticketCode: data.ticketCode,
        ticketStatus: data.ticketStatus,
        
        // Vehicle info (nested)
        licensePlate: data.vehicle?.licensePlate || task.licensePlate,
        make: data.vehicle?.make || task.make || '',
        model: data.vehicle?.model || task.model,
        year: data.vehicle?.year,
        
        // Customer info (nested)
        customerName: data.customer?.fullName || '',
        customerPhone: data.customer?.phone || '',
        customerEmail: data.customer?.email || '',
        
        // Service info
        serviceType: data.serviceCategory || task.serviceType,
        customerRequest: data.customerRequest || task.customerRequest,
        services: data.services || [], // Add services array
        
        // Booking info (nested)
        timeSlot: data.booking?.scheduledTime || task.timeSlot,
        scheduledDate: data.booking?.scheduledDate,
        
        // Dates
        assignedDate: data.receivedAt || data.createdAt || task.assignedDate,
        dueDate: data.booking?.scheduledDate || task.dueDate,
        
        // Notes
        technicianNotes: data.technicianNotes,
        checkInNotes: data.checkInNotes,
        
        // Other
        odometerReading: data.odometerReading,
        photos: data.photos
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast.error('Không thể tải chi tiết công việc');
    }
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
            placeholder="Tìm kiếm theo biển số, model, loại dịch vụ..."
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

                {task.customerName && (
                  <div className={styles.taskRow}>
                    <div className={styles.taskField}>
                      <span className={styles.fieldLabel}>Khách hàng:</span>
                      <span className={styles.fieldValue}>{task.customerName}</span>
                    </div>
                    {task.customerPhone && (
                      <div className={styles.taskField}>
                        <span className={styles.fieldLabel}>SĐT:</span>
                        <span className={styles.fieldValue}>{task.customerPhone}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.taskRow}>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Time slot:</span>
                    <span className={styles.fieldValue}>{task.timeSlot}</span>
                  </div>
                  <div className={styles.taskField}>
                    <span className={styles.fieldLabel}>Ngày hẹn:</span>
                    <span className={styles.fieldValue}>{formatDate(task.dueDate)}</span>
                  </div>
                </div>

                <div className={styles.taskRow}>
                  <div className={styles.taskField} style={{ width: '100%' }}>
                    <span className={styles.fieldLabel}>Yêu cầu khách hàng:</span>
                    <p className={styles.customerRequest}>{task.customerRequest}</p>
                  </div>
                </div>
              </div>

              <div className={styles.taskFooter}>
                <button 
                  className={styles.primaryButton}
                  onClick={() => navigate(`/technician/service-ticket/${task.ticketCode || task.id}`)}
                >
                  {task.status === 'Đã giao' ? 'Bắt đầu làm việc' : 'Xem phiếu kiểm tra'}
                </button>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleViewTask(task)}
                >
                  Chi tiết
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Không tìm thấy công việc nào</p>
            <p className={styles.emptySubtext}>Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
          </div>
        )}
      </div>

      {/* Modal Popup */}
      {showModal && selectedTask && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Chi tiết công việc</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Thông tin phiếu</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ID Phiếu:</span>
                    <span className={styles.infoValue}>#{selectedTask.id}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Trạng thái:</span>
                    <span className={`${styles.statusBadge} ${getStatusClass(selectedTask.status)}`}>
                      {selectedTask.status}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Độ ưu tiên:</span>
                    <span className={`${styles.priorityBadge} ${getPriorityClass(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Thông tin xe</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Biển số:</span>
                    <span className={styles.infoValue}>{selectedTask.licensePlate || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Hãng xe:</span>
                    <span className={styles.infoValue}>{selectedTask.make || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Model:</span>
                    <span className={styles.infoValue}>{selectedTask.model || 'N/A'}</span>
                  </div>
                  {selectedTask.year && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Năm sản xuất:</span>
                      <span className={styles.infoValue}>{selectedTask.year}</span>
                    </div>
                  )}
                  {selectedTask.odometerReading && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Số km:</span>
                      <span className={styles.infoValue}>{selectedTask.odometerReading.toLocaleString('vi-VN')} km</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedTask.customerName || selectedTask.customerPhone) && (
                <div className={styles.modalSection}>
                  <h4 className={styles.sectionTitle}>Thông tin khách hàng</h4>
                  <div className={styles.infoGrid}>
                    {selectedTask.customerName && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Tên khách hàng:</span>
                        <span className={styles.infoValue}>{selectedTask.customerName}</span>
                      </div>
                    )}
                    {selectedTask.customerPhone && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Số điện thoại:</span>
                        <span className={styles.infoValue}>{selectedTask.customerPhone}</span>
                      </div>
                    )}
                    {selectedTask.customerEmail && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span className={styles.infoValue}>{selectedTask.customerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Thông tin dịch vụ</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Loại dịch vụ:</span>
                    <span className={styles.infoValue}>{selectedTask.serviceType || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Time slot:</span>
                    <span className={styles.infoValue}>{selectedTask.timeSlot || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Ngày giao:</span>
                    <span className={styles.infoValue}>{formatDate(selectedTask.assignedDate)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Hạn hoàn thành:</span>
                    <span className={styles.infoValue}>{formatDate(selectedTask.dueDate)}</span>
                  </div>
                </div>
                
                {selectedTask.services && selectedTask.services.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <span className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>
                      Danh sách dịch vụ:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedTask.services.map((service, index) => (
                        <span 
                          key={index}
                          style={{
                            padding: '6px 12px',
                            background: '#eff6ff',
                            color: '#1e40af',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            border: '1px solid #bfdbfe'
                          }}
                        >
                          {service.serviceName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>Yêu cầu khách hàng</h4>
                <p className={styles.customerRequestFull}>{selectedTask.customerRequest || 'Không có yêu cầu đặc biệt'}</p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.modalActionBtn}
                onClick={() => {
                  setShowModal(false);
                  navigate(`/technician/service-ticket/${selectedTask.ticketCode || selectedTask.id}`);
                }}
              >
                {selectedTask.status === 'Đã giao' ? 'Bắt đầu làm việc' : 'Xem phiếu kiểm tra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;
