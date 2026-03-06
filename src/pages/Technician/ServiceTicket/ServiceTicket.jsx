import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ServiceTicket.module.css';

const ServiceTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    // Mock data - replace with API call
    const mockTicket = {
      id: id || 12345,
      licensePlate: '51F-123.45',
      model: 'Toyota Camry',
      odometer: '120,000 km',
      customerName: 'Nguyễn Văn A',
      customerPhone: '0901234567',
      customerRequest: 'Kiểm tra và sửa chữa hệ thống phanh, thay dầu động cơ.',
      serviceType: 'Bảo dưỡng định kỳ',
      priority: 'Combo',
      timeSlot: '09:00 - 10:00',
      status: 'Check-in',
      assignedDate: '2024-03-06',
      dueDate: '2024-03-06',
      technicianNotes: '',
      availableServices: [
        { id: 1, name: 'Kiểm tra hệ thống phanh', checked: false },
        { id: 2, name: 'Thay dầu động cơ', checked: false },
        { id: 3, name: 'Kiểm tra lốp xe', checked: false }
      ],
      progressSteps: [
        { id: 1, name: 'Check-in', status: 'completed', timestamp: '2024-03-06 08:30' },
        { id: 2, name: 'Diagnosis', status: 'current', timestamp: null },
        { id: 3, name: 'In Progress', status: 'pending', timestamp: null },
        { id: 4, name: 'Completed', status: 'pending', timestamp: null }
      ]
    };

    setTimeout(() => {
      setTicket(mockTicket);
      setSelectedServices(mockTicket.availableServices);
      setLoading(false);
    }, 500);
  }, [id]);

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev =>
      prev.map(service =>
        service.id === serviceId ? { ...service, checked: !service.checked } : service
      )
    );
  };

  const handleStartWork = () => {
    navigate(`/technician/update-progress/${id}`);
  };

  const getStepClass = (status) => {
    switch (status) {
      case 'completed':
        return styles.stepCompleted;
      case 'current':
        return styles.stepCurrent;
      default:
        return styles.stepPending;
    }
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

  if (!ticket) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p>Không tìm thấy phiếu dịch vụ</p>
          <button onClick={() => navigate('/technician/my-tasks')} className={styles.backButton}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/technician/my-tasks')} className={styles.backButton}>
          ← Quay lại
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Phiếu dịch vụ #{ticket.id}</h1>
          <button className={styles.statusButton}>Status</button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.leftColumn}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông tin xe</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Biển số:</span>
                <span className={styles.infoValue}>{ticket.licensePlate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Model:</span>
                <span className={styles.infoValue}>{ticket.model}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Odometer:</span>
                <span className={styles.infoValue}>{ticket.odometer}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông tin khách hàng</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Họ tên:</span>
                <span className={styles.infoValue}>{ticket.customerName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Số điện thoại:</span>
                <span className={styles.infoValue}>{ticket.customerPhone}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Yêu cầu khách hàng</h2>
            <div className={styles.requestBox}>
              <p>{ticket.customerRequest}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Dịch vụ cần làm</h2>
            <div className={styles.servicesList}>
              {selectedServices.map((service) => (
                <div key={service.id} className={styles.serviceItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={service.checked}
                      onChange={() => handleServiceToggle(service.id)}
                      className={styles.checkbox}
                    />
                    <span>{service.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Ghi chú kỹ thuật</h2>
            <textarea
              className={styles.notesTextarea}
              placeholder="Khách hàng báo phàn kêu khi đạp mạnh. Cần kiểm tra má phanh và đĩa phanh."
              rows={4}
              defaultValue={ticket.technicianNotes}
            />
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Tiến độ công việc</h2>
            <div className={styles.progressTracker}>
              {ticket.progressSteps.map((step, index) => (
                <div key={step.id} className={styles.progressStep}>
                  <div className={`${styles.stepIndicator} ${getStepClass(step.status)}`}>
                    {step.status === 'completed' ? '✓' : index + 1}
                  </div>
                  <div className={styles.stepContent}>
                    <div className={styles.stepName}>{step.name}</div>
                    {step.timestamp && (
                      <div className={styles.stepTime}>{step.timestamp}</div>
                    )}
                  </div>
                  {index < ticket.progressSteps.length - 1 && (
                    <div className={`${styles.stepConnector} ${step.status === 'completed' ? styles.connectorCompleted : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông tin phiếu</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Loại dịch vụ:</span>
                <span className={styles.infoValue}>{ticket.serviceType}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Độ ưu tiên:</span>
                <span className={styles.infoValue}>{ticket.priority}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Time slot:</span>
                <span className={styles.infoValue}>{ticket.timeSlot}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ngày giao:</span>
                <span className={styles.infoValue}>{new Date(ticket.assignedDate).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Hạn hoàn thành:</span>
                <span className={styles.infoValue}>{new Date(ticket.dueDate).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button className={styles.backButtonSecondary} onClick={() => navigate('/technician/my-tasks')}>
              Quay lại
            </button>
            <button className={styles.startWorkButton} onClick={handleStartWork}>
              Bắt đầu làm việc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceTicket;
