import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './VehicleStatus.module.css';

const VehicleStatus = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data - sẽ thay bằng API call
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData = [
          {
            vehicleId: 1,
            licensePlate: '30A12345',
            make: 'Honda',
            model: 'City',
            year: 2020,
            ticketCode: 'ST001',
            ticketStatus: 'IN_PROGRESS',
            progress: 60,
            tasks: [
              { name: 'Kiểm tra an toàn', status: 'COMPLETED', completedAt: '2026-03-22T08:30:00' },
              { name: 'Thay dầu động cơ', status: 'IN_PROGRESS', startedAt: '2026-03-22T09:00:00' },
              { name: 'Kiểm tra phanh', status: 'PENDING' },
              { name: 'Rửa xe', status: 'PENDING' }
            ],
            technician: {
              name: 'Nguyễn Văn A',
              phone: '0987654321',
              avatar: null
            },
            receivedAt: '2026-03-22T08:00:00',
            estimatedCompletion: '2026-03-22T15:00:00',
            customerRequest: 'Kiểm tra tiếng kêu ở bánh trước',
            technicianNotes: 'Đã phát hiện má phanh mòn, cần thay mới',
            estimatedCost: 2500000,
            photos: []
          },
          {
            vehicleId: 2,
            licensePlate: '51B67890',
            make: 'Toyota',
            model: 'Vios',
            year: 2019,
            ticketCode: 'ST002',
            ticketStatus: 'COMPLETED',
            progress: 100,
            tasks: [
              { name: 'Bảo dưỡng định kỳ', status: 'COMPLETED', completedAt: '2026-03-22T12:00:00' },
              { name: 'Thay dầu', status: 'COMPLETED', completedAt: '2026-03-22T13:00:00' },
              { name: 'Kiểm tra lốp', status: 'COMPLETED', completedAt: '2026-03-22T14:00:00' }
            ],
            technician: {
              name: 'Trần Văn B',
              phone: '0912345678',
              avatar: null
            },
            receivedAt: '2026-03-22T09:00:00',
            estimatedCompletion: '2026-03-22T14:00:00',
            completedAt: '2026-03-22T14:30:00',
            customerRequest: 'Bảo dưỡng định kỳ 10,000km',
            actualCost: 1800000,
            photos: []
          },
          {
            vehicleId: 3,
            licensePlate: '29C11111',
            make: 'Mazda',
            model: 'CX-5',
            year: 2021,
            ticketCode: 'ST003',
            ticketStatus: 'CREATED',
            progress: 10,
            tasks: [
              { name: 'Tiếp nhận xe', status: 'COMPLETED', completedAt: '2026-03-22T10:00:00' },
              { name: 'Kiểm tra sơ bộ', status: 'IN_PROGRESS', startedAt: '2026-03-22T10:15:00' }
            ],
            technician: {
              name: 'Lê Văn C',
              phone: '0923456789',
              avatar: null
            },
            receivedAt: '2026-03-22T10:00:00',
            estimatedCompletion: '2026-03-22T16:00:00',
            customerRequest: 'Kiểm tra hệ thống điều hòa',
            estimatedCost: 3000000,
            photos: []
          }
        ];
        
        setVehicles(mockData);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Không thể tải danh sách xe');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: vehicles.length,
    inProgress: vehicles.filter(v => v.ticketStatus === 'IN_PROGRESS').length,
    completed: vehicles.filter(v => v.ticketStatus === 'COMPLETED').length,
    ready: vehicles.filter(v => v.ticketStatus === 'COMPLETED' && !v.deliveredAt).length
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Chưa có';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusText = (status) => {
    const statusMap = {
      'CREATED': 'Mới tiếp nhận',
      'IN_PROGRESS': 'Đang sửa chữa',
      'COMPLETED': 'Hoàn thành',
      'DELIVERED': 'Đã giao xe'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'CREATED': styles.statusCreated,
      'IN_PROGRESS': styles.statusInProgress,
      'COMPLETED': styles.statusCompleted,
      'DELIVERED': styles.statusDelivered
    };
    return classMap[status] || '';
  };

  const getTaskIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return '✅';
      case 'IN_PROGRESS':
        return '🔧';
      case 'PENDING':
        return '⏳';
      default:
        return '○';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesStatus = filterStatus === 'all' || vehicle.ticketStatus === filterStatus;
    const matchesSearch = !searchTerm ||
      vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewDetail = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailModal(true);
  };

  const handleContactTechnician = (vehicle) => {
    if (vehicle.technician?.phone) {
      window.location.href = `tel:${vehicle.technician.phone}`;
    } else {
      toast.info('Không có thông tin liên hệ KTV');
    }
  };

  const handleViewInvoice = () => {
    toast.info('Chức năng xem hóa đơn đang được phát triển');
    // TODO: Navigate to invoice page or open invoice modal
  };

  const handleRateService = () => {
    toast.info('Chuyển đến trang đánh giá dịch vụ');
    // TODO: Navigate to feedback form
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
          <h1 className={styles.title}>Trạng thái xe của tôi</h1>
          <p className={styles.subtitle}>Theo dõi tiến độ sửa chữa và bảo dưỡng xe</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng số xe</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.inProgress}</div>
            <div className={styles.statLabel}>Đang sửa chữa</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCompleted}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statReady}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.ready}</div>
            <div className={styles.statLabel}>Chờ lấy xe</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Tìm kiếm theo biển số, mã phiếu, model..."
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
            <option value="CREATED">Mới tiếp nhận</option>
            <option value="IN_PROGRESS">Đang sửa chữa</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="DELIVERED">Đã giao xe</option>
          </select>
        </div>
      </div>

      {/* Vehicle List */}
      <div className={styles.vehiclesList}>
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.vehicleId}
              vehicle={vehicle}
              onViewDetail={handleViewDetail}
              onContactTechnician={handleContactTechnician}
              onViewInvoice={handleViewInvoice}
              onRateService={handleRateService}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              getStatusText={getStatusText}
              getStatusClass={getStatusClass}
              getTaskIcon={getTaskIcon}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Không có xe nào</p>
            <p className={styles.emptySubtext}>Bạn chưa có xe nào đang được sửa chữa hoặc bảo dưỡng</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setShowDetailModal(false)}
          getStatusText={getStatusText}
          getStatusClass={getStatusClass}
          getTaskIcon={getTaskIcon}
        />
      )}
    </div>
  );
};

// Vehicle Card Component
const VehicleCard = ({
  vehicle,
  onViewDetail,
  onContactTechnician,
  onViewInvoice,
  onRateService,
  formatDate,
  formatCurrency,
  getStatusText,
  getStatusClass,
  getTaskIcon
}) => (
  <div className={styles.vehicleCard}>
    <div className={styles.vehicleHeader}>
      <div className={styles.vehicleHeaderLeft}>
        <div className={styles.vehicleIcon}>🚗</div>
        <div className={styles.vehicleInfo}>
          <h3 className={styles.vehicleTitle}>
            {vehicle.licensePlate} - {vehicle.make} {vehicle.model} {vehicle.year}
          </h3>
          <p className={styles.ticketCode}>Mã phiếu: {vehicle.ticketCode}</p>
        </div>
      </div>
      <div className={styles.vehicleHeaderRight}>
        <span className={`${styles.statusBadge} ${getStatusClass(vehicle.ticketStatus)}`}>
          {getStatusText(vehicle.ticketStatus)}
        </span>
      </div>
    </div>

    <div className={styles.vehicleBody}>
      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Tiến độ</span>
          <span className={styles.progressValue}>{vehicle.progress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${vehicle.progress}%` }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className={styles.tasksSection}>
        <h4 className={styles.tasksTitle}>Công việc:</h4>
        <div className={styles.tasksList}>
          {vehicle.tasks.slice(0, 3).map((task, index) => (
            <div key={index} className={styles.taskItem}>
              <span className={styles.taskIcon}>{getTaskIcon(task.status)}</span>
              <span className={styles.taskName}>{task.name}</span>
              {task.status === 'IN_PROGRESS' && (
                <span className={styles.taskBadge}>Đang làm</span>
              )}
            </div>
          ))}
          {vehicle.tasks.length > 3 && (
            <div className={styles.taskMore}>
              +{vehicle.tasks.length - 3} công việc khác
            </div>
          )}
        </div>
      </div>

      {/* Technician */}
      {vehicle.technician && (
        <div className={styles.technicianSection}>
          <div className={styles.technicianInfo}>
            <span className={styles.technicianLabel}>KTV phụ trách:</span>
            <span className={styles.technicianName}>{vehicle.technician.name}</span>
            <span className={styles.technicianPhone}>☎️ {vehicle.technician.phone}</span>
          </div>
        </div>
      )}

      {/* Time & Cost */}
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Ngày nhận xe:</span>
          <span className={styles.infoValue}>{formatDate(vehicle.receivedAt)}</span>
        </div>
        {vehicle.ticketStatus === 'COMPLETED' && vehicle.completedAt ? (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Hoàn thành lúc:</span>
            <span className={styles.infoValue}>{formatDate(vehicle.completedAt)}</span>
          </div>
        ) : (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Dự kiến hoàn thành:</span>
            <span className={styles.infoValue}>{formatDate(vehicle.estimatedCompletion)}</span>
          </div>
        )}
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Chi phí:</span>
          <span className={styles.infoValue}>
            {formatCurrency(vehicle.actualCost || vehicle.estimatedCost)}
          </span>
        </div>
      </div>
    </div>

    <div className={styles.vehicleFooter}>
      <button className={styles.primaryButton} onClick={() => onViewDetail(vehicle)}>
        Xem chi tiết
      </button>
      {vehicle.ticketStatus === 'IN_PROGRESS' && (
        <button className={styles.secondaryButton} onClick={() => onContactTechnician(vehicle)}>
          Liên hệ KTV
        </button>
      )}
      {vehicle.ticketStatus === 'COMPLETED' && (
        <>
          <button className={styles.secondaryButton} onClick={onViewInvoice}>
            Xem hóa đơn
          </button>
          <button className={styles.rateButton} onClick={onRateService}>
            Đánh giá
          </button>
        </>
      )}
    </div>
  </div>
);

// Vehicle Detail Modal Component
const VehicleDetailModal = ({
  vehicle,
  onClose,
  getStatusText,
  getStatusClass,
  getTaskIcon
}) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>
          Chi tiết xe {vehicle.licensePlate}
        </h3>
        <button className={styles.modalClose} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.modalBody}>
        {/* Vehicle Info */}
        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Thông tin xe</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Biển số:</span>
              <span className={styles.infoValue}>{vehicle.licensePlate}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Hãng xe:</span>
              <span className={styles.infoValue}>{vehicle.make}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Model:</span>
              <span className={styles.infoValue}>{vehicle.model}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Năm sản xuất:</span>
              <span className={styles.infoValue}>{vehicle.year}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Trạng thái</h4>
          <div className={styles.statusDisplay}>
            <span className={`${styles.statusBadge} ${getStatusClass(vehicle.ticketStatus)}`}>
              {getStatusText(vehicle.ticketStatus)}
            </span>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${vehicle.progress}%` }}
              />
            </div>
            <span className={styles.progressText}>{vehicle.progress}%</span>
          </div>
        </div>

        {/* Timeline */}
        <div className={styles.modalSection}>
          <h4 className={styles.sectionTitle}>Timeline công việc</h4>
          <div className={styles.timeline}>
            {vehicle.tasks.map((task, index) => (
              <div key={index} className={styles.timelineItem}>
                <div className={styles.timelineIcon}>{getTaskIcon(task.status)}</div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineName}>{task.name}</div>
                  {task.completedAt && (
                    <div className={styles.timelineTime}>
                      Hoàn thành: {task.completedAt}
                    </div>
                  )}
                  {task.startedAt && !task.completedAt && (
                    <div className={styles.timelineTime}>
                      Bắt đầu: {task.startedAt}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Request */}
        {vehicle.customerRequest && (
          <div className={styles.modalSection}>
            <h4 className={styles.sectionTitle}>Yêu cầu khách hàng</h4>
            <p className={styles.requestText}>{vehicle.customerRequest}</p>
          </div>
        )}

        {/* Technician Notes */}
        {vehicle.technicianNotes && (
          <div className={styles.modalSection}>
            <h4 className={styles.sectionTitle}>Ghi chú kỹ thuật viên</h4>
            <p className={styles.notesText}>{vehicle.technicianNotes}</p>
          </div>
        )}

        {/* Technician Info */}
        {vehicle.technician && (
          <div className={styles.modalSection}>
            <h4 className={styles.sectionTitle}>Kỹ thuật viên phụ trách</h4>
            <div className={styles.technicianCard}>
              <div className={styles.technicianName}>{vehicle.technician.name}</div>
              <div className={styles.technicianPhone}>☎️ {vehicle.technician.phone}</div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.modalFooter}>
        <button className={styles.modalCancelBtn} onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  </div>
);

export default VehicleStatus;
