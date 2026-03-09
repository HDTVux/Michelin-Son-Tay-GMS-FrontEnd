import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { uploadImage } from '../../../services/imageService.js';
import styles from './UpdateProgress.module.css';

const UpdateProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data from ServiceTicket
  const [recommendedTireSize, setRecommendedTireSize] = useState('');
  const [tireData, setTireData] = useState({
    frontLeft: { mm: '', pressure: '' },
    frontRight: { mm: '', pressure: '' },
    rearLeft: { mm: '', pressure: '' },
    rearRight: { mm: '', pressure: '' }
  });
  const [safetyChecks, setSafetyChecks] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  // Update Progress specific data
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [additionalIssues, setAdditionalIssues] = useState('');
  const [needAdditionalService, setNeedAdditionalService] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('In Progress');
  const [uploadedImages, setUploadedImages] = useState([]);

  useEffect(() => {
    // Load data from localStorage (saved from ServiceTicket)
    const savedData = localStorage.getItem(`ticket_${id}`);
    
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setRecommendedTireSize(data.recommendedTireSize || '');
        setTireData(data.tireData || tireData);
        setSafetyChecks(data.safetyChecks || []);
        setServiceItems(data.serviceItems || []);
        setNotes(data.notes || '');
      } catch (error) {
        console.error('Error loading ticket data:', error);
        toast.error('Không thể tải dữ liệu phiếu dịch vụ');
      }
    } else {
      toast.warning('Chưa có dữ liệu kiểm tra ban đầu');
    }
    
    // Load progress data if exists
    const progressData = localStorage.getItem(`progress_${id}`);
    if (progressData) {
      try {
        const data = JSON.parse(progressData);
        setTechnicianNotes(data.technicianNotes || '');
        setAdditionalIssues(data.additionalIssues || '');
        setNeedAdditionalService(data.needAdditionalService || false);
        setSelectedStatus(data.selectedStatus || 'In Progress');
        setUploadedImages(data.uploadedImages || []);
      } catch (error) {
        console.error('Error loading progress data:', error);
      }
    }
    
    setLoading(false);
  }, [id]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    const uploadingToast = toast.info('Đang upload ảnh...', { autoClose: false });

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      const uploadPromises = files.map(async (file) => {
        try {
          const response = await uploadImage(file, token);
          
          if (response?.success && response?.data?.imageUrl) {
            return {
              id: Date.now() + Math.random(),
              name: file.name,
              url: response.data.imageUrl,
              publicId: response.data.publicId,
              file: file
            };
          }
          return null;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Không thể upload ${file.name}`);
          return null;
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadedResults.filter(result => result !== null);

      if (successfulUploads.length > 0) {
        setUploadedImages(prev => [...prev, ...successfulUploads]);
        toast.update(uploadingToast, {
          render: `Upload thành công ${successfulUploads.length} ảnh!`,
          type: 'success',
          autoClose: 3000
        });
      } else {
        toast.update(uploadingToast, {
          render: 'Không có ảnh nào được upload thành công',
          type: 'error',
          autoClose: 3000
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.update(uploadingToast, {
        render: 'Lỗi khi upload ảnh',
        type: 'error',
        autoClose: 3000
      });
    }
  };

  const handleRemoveImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleCancel = () => {
    navigate(`/technician/service-ticket/${id}`);
  };

  const handleSave = () => {
    // Save progress data
    const progressData = {
      technicianNotes,
      additionalIssues,
      needAdditionalService,
      selectedStatus,
      uploadedImages,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`progress_${id}`, JSON.stringify(progressData));
    toast.success('Đã lưu cập nhật thành công!');
  };

  const handleComplete = () => {
    handleSave();
    toast.success('Đã hoàn thành công việc!');
    navigate('/technician/my-tasks');
  };

  const completedSafetyCount = safetyChecks.filter(item => 
    item.good || item.warning || item.replace
  ).length;
  const completedServiceCount = serviceItems.filter(item => item.confirmed).length;

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
        <button onClick={handleCancel} className={styles.backButton}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>Cập nhật tiến độ #{id}</h1>
      </div>

      <div className={styles.content}>
        {/* Display Tire Data (Read-only) */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Thông tin lốp xe (Đã kiểm tra)</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Size lốp khuyến cáo:</span>
              <span className={styles.infoValue}>{recommendedTireSize || 'Chưa nhập'}</span>
            </div>
          </div>
          <div className={styles.tireDataGrid}>
            <div>
              <strong>Trước trái:</strong> {tireData.frontLeft.mm}mm, {tireData.frontLeft.pressure}kg/cm³
            </div>
            <div>
              <strong>Trước phải:</strong> {tireData.frontRight.mm}mm, {tireData.frontRight.pressure}kg/cm³
            </div>
            <div>
              <strong>Sau trái:</strong> {tireData.rearLeft.mm}mm, {tireData.rearLeft.pressure}kg/cm³
            </div>
            <div>
              <strong>Sau phải:</strong> {tireData.rearRight.mm}mm, {tireData.rearRight.pressure}kg/cm³
            </div>
          </div>
        </div>

        {/* Display Safety Checks (Read-only) */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Kiểm tra an toàn ({completedSafetyCount}/{safetyChecks.length} đã kiểm tra)
          </h2>
          <div className={styles.safetyList}>
            {safetyChecks.map((item) => (
              <div key={item.id} className={styles.safetyItem}>
                <span className={styles.safetyName}>{item.name}:</span>
                <span className={styles.safetyStatus}>
                  {item.good && '✓ Tốt'}
                  {item.warning && '⚠ Lưu ý'}
                  {item.replace && '✕ Thay'}
                  {!item.good && !item.warning && !item.replace && '-'}
                </span>
                {item.note && <span className={styles.safetyNote}>({item.note})</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Display Service Items (Read-only) */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Dịch vụ đã xác nhận ({completedServiceCount}/{serviceItems.length})
          </h2>
          <div className={styles.serviceList}>
            {serviceItems.map((item, index) => (
              <div key={item.id} className={styles.serviceItem}>
                <div className={styles.serviceHeader}>
                  <span className={styles.serviceNumber}>{index + 1}.</span>
                  <span className={styles.serviceName}>{item.name || 'Chưa đặt tên'}</span>
                  {item.confirmed && <span className={styles.confirmedBadge}>✓ Đã xác nhận</span>}
                </div>
                {item.description && (
                  <div className={styles.serviceDescription}>{item.description}</div>
                )}
                {item.quantity && item.unitPrice && (
                  <div className={styles.servicePrice}>
                    SL: {item.quantity} × {item.unitPrice} = {item.total}đ
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Technician Notes */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Ghi chú kỹ thuật viên</h2>
          <textarea
            className={styles.textarea}
            placeholder="Ghi chú quá trình sửa chữa, phát hiện thêm..."
            rows={5}
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
          />
        </div>

        {/* Additional Issues */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Phát hiện thêm vấn đề</h2>
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

        {/* Upload Images */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Upload ảnh</h2>
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

        {/* Status Update */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Cập nhật trạng thái</h2>
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

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Quay lại
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Lưu cập nhật
          </button>
          <button className={styles.completeButton} onClick={handleComplete}>
            Hoàn thành
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateProgress;
