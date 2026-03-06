import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './UpdateProgress.module.css';

const UpdateProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [serviceChecklist, setServiceChecklist] = useState([]);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [additionalIssues, setAdditionalIssues] = useState('');
  const [needAdditionalService, setNeedAdditionalService] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('In Progress');
  const [uploadedImages, setUploadedImages] = useState([]);

  useEffect(() => {
    // Mock data - replace with API call
    const mockTicket = {
      id: id || 12345,
      licensePlate: '51F-123.45',
      model: 'Toyota Camry',
      serviceType: 'Bảo dưỡng định kỳ',
      checklist: [
        { id: 1, name: 'Kiểm tra hệ thống phanh', completed: false },
        { id: 2, name: 'Thay dầu động cơ', completed: false },
        { id: 3, name: 'Kiểm tra lốp xe', completed: false }
      ],
      currentStatus: 'In Progress',
      notes: 'Ghi chú quá trình sửa chữa, phát hiện thêm...'
    };

    setTimeout(() => {
      setTicket(mockTicket);
      setServiceChecklist(mockTicket.checklist);
      setTechnicianNotes(mockTicket.notes);
      setSelectedStatus(mockTicket.currentStatus);
      setLoading(false);
    }, 500);
  }, [id]);

  const handleChecklistToggle = (itemId) => {
    setServiceChecklist(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      url: URL.createObjectURL(file),
      file: file
    }));
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleCancel = () => {
    navigate(`/technician/service-ticket/${id}`);
  };

  const handleSave = () => {
    // Save progress logic here
    console.log('Saving progress:', {
      ticketId: id,
      checklist: serviceChecklist,
      notes: technicianNotes,
      additionalIssues,
      needAdditionalService,
      status: selectedStatus,
      images: uploadedImages
    });
    
    alert('Đã lưu cập nhật thành công!');
    navigate(`/technician/service-ticket/${id}`);
  };

  const completedCount = serviceChecklist.filter(item => item.completed).length;
  const totalCount = serviceChecklist.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
        <button onClick={handleCancel} className={styles.backButton}>
          ← Quay lại
        </button>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Cập nhật tiến độ #{ticket.id}</h1>
            <p className={styles.subtitle}>
              {ticket.licensePlate} - {ticket.model} - {ticket.serviceType}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Checklist dịch vụ</h2>
              <div className={styles.progressBadge}>
                {completedCount}/{totalCount} hoàn thành
              </div>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className={styles.checklistItems}>
              {serviceChecklist.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleChecklistToggle(item.id)}
                      className={styles.checkbox}
                    />
                    <span className={item.completed ? styles.completedText : ''}>
                      {item.name}
                    </span>
                  </label>
                  {item.completed && (
                    <span className={styles.completedIcon}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Ghi chú kỹ thuật</h2>
            <textarea
              className={styles.textarea}
              placeholder="Ghi chú quá trình sửa chữa, phát hiện thêm..."
              rows={5}
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
            />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Phát hiện thêm vấn đề</h2>
            <div className={styles.additionalServiceBox}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={needAdditionalService}
                  onChange={(e) => setNeedAdditionalService(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Cần thêm dịch vụ</span>
              </label>
            </div>
            {needAdditionalService && (
              <textarea
                className={styles.textarea}
                placeholder="Mô tả vấn đề phát hiện thêm..."
                rows={4}
                value={additionalIssues}
                onChange={(e) => setAdditionalIssues(e.target.value)}
              />
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Upload ảnh</h2>
            <div className={styles.uploadBox}>
              <input
                type="file"
                id="imageUpload"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.fileInput}
              />
              <label htmlFor="imageUpload" className={styles.uploadLabel}>
                <div className={styles.uploadIcon}>📷</div>
                <div className={styles.uploadText}>Kéo và thả ảnh hoặc click để chọn</div>
                <div className={styles.uploadSubtext}>Hỗ trợ: JPG, PNG, GIF (Max 5MB)</div>
              </label>
            </div>
            {uploadedImages.length > 0 && (
              <div className={styles.imageGrid}>
                {uploadedImages.map((image) => (
                  <div key={image.id} className={styles.imageItem}>
                    <img src={image.url} alt={image.name} className={styles.imagePreview} />
                    <button
                      className={styles.removeImageButton}
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      ✕
                    </button>
                    <div className={styles.imageName}>{image.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Cập nhật status</h2>
            <select
              className={styles.statusSelect}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Check-in">Check-in</option>
              <option value="Diagnosis">Diagnosis</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông tin phiếu</h2>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Mã phiếu:</span>
                <span className={styles.infoValue}>#{ticket.id}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Biển số:</span>
                <span className={styles.infoValue}>{ticket.licensePlate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Model:</span>
                <span className={styles.infoValue}>{ticket.model}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Loại dịch vụ:</span>
                <span className={styles.infoValue}>{ticket.serviceType}</span>
              </div>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button className={styles.cancelButton} onClick={handleCancel}>
              Hủy
            </button>
            <button className={styles.saveButton} onClick={handleSave}>
              Lưu cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateProgress;
