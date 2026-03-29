import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTickets, fetchTechnicianTicketDetail, startInspection } from '../../../services/technicianService';
import { getSafetyInspectionByTicketCode } from '../../../services/safetyInspectionService';
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

        const transformedTasks = await Promise.all(tickets.map(async (ticket) => {
          const hasSafetyInspection = ticket.safetyInspectionEnabled !== false;
          let inspectionStatus = null;

          if (ticket.ticketCode) {
            try {
              const inspectionRes = await getSafetyInspectionByTicketCode(ticket.ticketCode, token);
              inspectionStatus = inspectionRes?.data?.inspectionStatus || null;
            } catch {
              inspectionStatus = null;
            }
          }

          const normalizedInspectionStatus = String(inspectionStatus || '').toUpperCase();
          const requiresSafetyInspection = hasSafetyInspection && normalizedInspectionStatus !== 'SKIPPED';

          return {
            id: ticket.serviceTicketId,
            ticketCode: ticket.ticketCode,
            // List API returns flat structure
            licensePlate: ticket.licensePlate || '',
            make: ticket.vehicleMake || '',
            model: ticket.vehicleModel || '',
            serviceType: ticket.serviceCategory || '',
            priority: ticket.priority || 'Normal',
            timeSlot: ticket.scheduledTime || '',
            status: ticket.ticketStatus ? ticket.ticketStatus.toUpperCase() : 'DRAFT',
            customerRequest: ticket.customerRequest || '',
            customerName: ticket.customerName || '',
            customerPhone: ticket.customerPhone || '',
            assignedDate: ticket.receivedAt || ticket.createdAt || '',
            dueDate: ticket.scheduledDate || '',
            technicianNotes: ticket.technicianNotes,
            hasSafetyInspection,
            requiresSafetyInspection,
            inspectionStatus,
            // Services will be loaded from detail API
            services: [],
          };
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

  // Map inspection status to Vietnamese display
  const mapInspectionStatus = (status) => {
    if (!status) return '';
    const statusMap = {
      PENDING: 'Chờ kiểm tra',
      COMPLETED: 'Đã kiểm tra',
      SKIPPED: 'Đã bỏ qua',
    };
    return statusMap[status.toUpperCase()] || status;
  };

  // Get CSS class for inspection status
  const getInspectionStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return styles.statusInProgress;
      case 'COMPLETED':
        return styles.statusCompleted;
      case 'SKIPPED':
        return styles.statusPaused;
      default:
        return '';
    }
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
    const inspectionStatus = String(task.inspectionStatus || '').toUpperCase();
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'no_inspection' && !task.requiresSafetyInspection) ||
      (filterStatus === inspectionStatus);
    const matchesSearch = !searchTerm ||
      (task.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.model?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleStartWork = async (task) => {
    const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
    const ticketCode = String(task?.ticketCode || '').trim();
    if (!token || !ticketCode) {
      toast.error('Thiếu thông tin phiếu để bắt đầu làm việc.');
      return;
    }

    try {
      await startInspection(ticketCode, token);
      setTasks((prev) =>
        prev.map((t) =>
          t.ticketCode === ticketCode
            ? {
              ...t,
              status: 'INSPECTION',
              inspectionStatus: 'PENDING',
            }
            : t,
        ),
      );
      navigate(`/technician/safetyinspection-ticket/${ticketCode}`);
    } catch (error) {
      toast.error(error?.message || 'Không thể bắt đầu làm việc.');
    }
  };

  const handleViewTask = async (task) => {
    try {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      const response = await fetchTechnicianTicketDetail(task.ticketCode || task.id, token);
      console.log('Task Detail Response:', response.data);
      
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
    assigned: tasks.length,
    inProgress: tasks.filter(t => t.hasSafetyInspection && String(t.inspectionStatus || '').toUpperCase() === 'PENDING').length,
    completed: tasks.filter(t => t.hasSafetyInspection && String(t.inspectionStatus || '').toUpperCase() === 'COMPLETED').length,
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
            <option value="no_inspection">Không kiểm tra an toàn</option>
            <option value="PENDING">Chờ kiểm tra</option>
            <option value="COMPLETED">Đã kiểm tra</option>
            <option value="SKIPPED">Đã bỏ qua</option>
          </select>
        </div>
      </div>

      {/* Two columns layout */}
      <div className={styles.twoColumns}>
        {/* Column 1: Có kiểm tra an toàn */}
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Có kiểm tra an toàn</h3>
          <div className={styles.tasksList}>
            {filteredTasks.filter(t => t.requiresSafetyInspection).length > 0 ? (
              filteredTasks.filter(t => t.requiresSafetyInspection).map((task) => (
                <TaskCard key={task.id} task={task} onView={handleViewTask} onNavigate={navigate} onStartWork={handleStartWork} getPriorityClass={getPriorityClass} formatDate={formatDate} mapInspectionStatus={mapInspectionStatus} getInspectionStatusClass={getInspectionStatusClass} />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Không có phiếu</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Không kiểm tra an toàn */}
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Không kiểm tra an toàn</h3>
          <div className={styles.tasksList}>
            {filteredTasks.filter(t => !t.requiresSafetyInspection).length > 0 ? (
              filteredTasks.filter(t => !t.requiresSafetyInspection).map((task) => (
                <TaskCard key={task.id} task={task} onView={handleViewTask} onNavigate={navigate} onStartWork={handleStartWork} getPriorityClass={getPriorityClass} formatDate={formatDate} mapInspectionStatus={mapInspectionStatus} getInspectionStatusClass={getInspectionStatusClass} />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Không có phiếu</p>
              </div>
            )}
          </div>
        </div>
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
                    <span className={styles.infoLabel}>Trạng thái kiểm tra:</span>
                    <span className={`${styles.statusBadge} ${getInspectionStatusClass(selectedTask.inspectionStatus)}`}>
                      {mapInspectionStatus(selectedTask.inspectionStatus) || 'Chưa kiểm tra'}
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
                <h4 className={styles.sectionTitle}>Yêu cầu khách hàng</h4>
                <p className={styles.customerRequestFull}>{selectedTask.customerRequest || 'Không có yêu cầu đặc biệt'}</p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalActionBtn}
                onClick={async () => {
                  setShowModal(false);
                  const isDraft = String(selectedTask?.status || '').toUpperCase() === 'DRAFT';
                  const isCompletedInspection = String(selectedTask?.inspectionStatus || '').toUpperCase() === 'COMPLETED';
                  if (isDraft && !isCompletedInspection) {
                    await handleStartWork(selectedTask);
                    return;
                  }
                  navigate(`/technician/safetyinspection-ticket/${selectedTask.ticketCode || selectedTask.id}`);
                }}
              >
                {(() => {
                  const isDraft = String(selectedTask?.status || '').toUpperCase() === 'DRAFT';
                  const isCompletedInspection = String(selectedTask?.inspectionStatus || '').toUpperCase() === 'COMPLETED';
                  if (isDraft && !isCompletedInspection) return 'Bắt đầu làm việc';
                  return selectedTask.hasSafetyInspection ? 'Xem phiếu kiểm tra' : 'Làm việc (không kiểm tra an toàn)';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// TaskCard component
const TaskCard = ({ task, onView, onNavigate, onStartWork, getPriorityClass, formatDate, mapInspectionStatus, getInspectionStatusClass }) => (
  <div className={styles.taskCard}>
    <div className={styles.taskHeader}>
      <div className={styles.taskHeaderLeft}>
        <h3 className={styles.taskTitle}>Phiếu #{task.id}</h3>
        <span className={`${styles.priorityBadge} ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <div className={styles.taskHeaderRight}>
        {task.hasSafetyInspection && task.inspectionStatus ? (
          <span className={`${styles.statusBadge} ${getInspectionStatusClass(task.inspectionStatus)}`}>
            {mapInspectionStatus(task.inspectionStatus)}
          </span>
        ) : (
          <span className={`${styles.statusBadge}`} style={{ backgroundColor: '#6c757d' }}>
            Chưa kiểm tra
          </span>
        )}
      </div>
    </div>

    <div className={styles.taskBody}>
      <div className={styles.taskRow}>
        <div className={styles.taskField}>
          <span className={styles.fieldLabel}>Biển số:</span>
          <span className={styles.fieldValue}>{task.licensePlate}</span>
        </div>
        <div className={styles.taskField}>
          <span className={styles.fieldLabel}>Loại xe:</span>
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
          <span className={styles.fieldLabel}>Ngày nhận xe:</span>
          <span className={styles.fieldValue}>{formatDate(task.dueDate)}</span>
        </div>
        <div className={styles.taskField}>
          <span className={styles.fieldLabel}>Giờ nhận xe:</span>
          <span className={styles.fieldValue}>{task.timeSlot}</span>
        </div>
      </div>
      <div className={styles.taskRow}>
        <div className={styles.taskField}>
          <span className={styles.fieldLabel}>Ngày giao xe:</span>
          <span className={styles.fieldValue}>{formatDate(task.dueDate)}</span>
        </div>
        <div className={styles.taskField}>
          <span className={styles.fieldLabel}>Giờ giao xe:</span>
          <span className={styles.fieldValue}>{task.timeSlot}</span>
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
        onClick={() => {
          const isDraft = String(task?.status || '').toUpperCase() === 'DRAFT';
          const isCompletedInspection = String(task?.inspectionStatus || '').toUpperCase() === 'COMPLETED';
          if (isDraft && !isCompletedInspection) {
            onStartWork(task);
            return;
          }
          onNavigate(`/technician/safetyinspection-ticket/${task.ticketCode || task.id}`);
        }}
      >
        {(() => {
          const isDraft = String(task?.status || '').toUpperCase() === 'DRAFT';
          const isCompletedInspection = String(task?.inspectionStatus || '').toUpperCase() === 'COMPLETED';
          if (isDraft && !isCompletedInspection) return 'Bắt đầu làm việc';
          return task.hasSafetyInspection ? 'Xem phiếu kiểm tra' : 'Làm việc';
        })()}
      </button>
      <button
        className={styles.secondaryButton}
        onClick={() => onView(task)}
      >
        Chi tiết
      </button>
    </div>
  </div>
);

export default MyTasks;
