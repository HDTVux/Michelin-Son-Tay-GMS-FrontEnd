import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getSafetyInspectionByTicketCode, updateAdvisorNote } from '../../../services/safetyInspectionService';
import styles from './AdvisorInspection.module.css';

const AdvisorInspection = () => {
  const { ticketCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [inspectionData, setInspectionData] = useState(null);
  const [items, setItems] = useState([]);
  const [inspectionStatus, setInspectionStatus] = useState('');
  const [ticketInfo, setTicketInfo] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch inspection data
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        navigate('/login');
        return;
      }

      if (!ticketCode) {
        toast.error('Thiếu mã phiếu dịch vụ');
        setLoading(false);
        return;
      }

      try {
        const response = await getSafetyInspectionByTicketCode(ticketCode, token);
        if (response?.data) {
          const data = response.data;
          setInspectionData(data);
          setInspectionStatus(data.inspectionStatus || 'PENDING');

          // Map items từ API
          if (data.items && data.items.length > 0) {
            setItems(data.items.map(item => ({
              id: item.itemId,
              workCategoryId: item.workCategoryId,
              name: item.categoryName || item.workCategoryName || 'Không có tên',
              note: item.advisorNote || ''
            })));
          }

          // Lấy thông tin ticket từ API
          setTicketInfo({
            serviceTicketId: data.serviceTicketId,
            ticketCode: ticketCode,
            licensePlate: data.licensePlate || '',
            customerName: data.customerName || '',
            serviceName: data.serviceName || ''
          });
        }
      } catch (error) {
        console.error('Error fetching inspection:', error);
        if (error.status === 404) {
          toast.info('Phiếu kiểm tra chưa được tạo cho phiếu dịch vụ này');
        } else {
          toast.error('Không thể tải dữ liệu kiểm tra: ' + (error.message || 'Lỗi không xác định'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticketCode, navigate]);

  // Xử lý thay đổi ghi chú
  const handleNoteChange = (itemId, note) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, note } : item
    ));
  };

  // Lưu ghi chú cho một hạng mục
  const handleSaveNote = async (item) => {
    const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập');
      return;
    }

    if (!inspectionData?.inspectionId) {
      toast.error('Không tìm thấy ID phiếu kiểm tra');
      return;
    }

    setSaving(true);
    try {
      await updateAdvisorNote(inspectionData.inspectionId, item.id, item.note, token);
      toast.success('Đã lưu ghi chú');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Lỗi khi lưu ghi chú: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setSaving(false);
    }
  };

  // Lưu tất cả ghi chú
  const handleSaveAll = async () => {
    const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập');
      return;
    }

    if (!inspectionData?.inspectionId) {
      toast.error('Không tìm thấy ID phiếu kiểm tra');
      return;
    }

    setSaving(true);
    try {
      for (const item of items) {
        if (item.note && item.note.trim() !== '') {
          await updateAdvisorNote(inspectionData.inspectionId, item.id, item.note, token);
        }
      }
      toast.success('Đã lưu tất cả ghi chú thành công!');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Lỗi khi lưu ghi chú: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setSaving(false);
    }
  };

  // Quay lại danh sách
  const handleBack = () => {
    navigate('/advisor/inspection/list');
  };

  // Get status display text
  const getStatusText = (status) => {
    const statusMap = {
      'PENDING': 'Có kiểm tra an toàn',
      'SKIPPED': 'Không kiểm tra an toàn',
      'COMPLETED': 'Đã hoàn thành'
    };
    return statusMap[status] || status;
  };

  // Get status class
  const getStatusClass = (status) => {
    const classMap = {
      'PENDING': styles.statusPending,
      'SKIPPED': styles.statusInactive,
      'COMPLETED': styles.statusActive
    };
    return classMap[status] || styles.statusInactive;
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
        <h1 className={styles.title}>Phiếu kiểm tra - Cố vấn viên</h1>
        <button className={styles.backButton} onClick={handleBack}>
          ← Quay lại
        </button>
      </div>

      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 className={styles.sectionTitle}>Mã phiếu: {ticketCode}</h2>
            <p className={styles.subtitle}>Ghi chú các hạng mục cần kiểm tra cho kỹ thuật viên</p>
          </div>
          <span className={`${styles.statusBadge} ${getStatusClass(inspectionStatus)}`}>
            {getStatusText(inspectionStatus)}
          </span>
        </div>

        {/* Thông tin phiếu */}
        {ticketInfo && (
          <div className={styles.ticketInfo}>
            {ticketInfo.licensePlate && (
              <div className={styles.ticketInfoItem}>
                <span className={styles.ticketInfoLabel}>Biển số:</span>
                <span className={styles.ticketInfoValue}>{ticketInfo.licensePlate}</span>
              </div>
            )}
            {ticketInfo.customerName && (
              <div className={styles.ticketInfoItem}>
                <span className={styles.ticketInfoLabel}>Khách hàng:</span>
                <span className={styles.ticketInfoValue}>{ticketInfo.customerName}</span>
              </div>
            )}
            {ticketInfo.serviceName && (
              <div className={styles.ticketInfoItem}>
                <span className={styles.ticketInfoLabel}>Dịch vụ:</span>
                <span className={styles.ticketInfoValue}>{ticketInfo.serviceName}</span>
              </div>
            )}
          </div>
        )}

        {/* Bảng hạng mục kiểm tra */}
        <h3 className={styles.sectionTitle} style={{ marginTop: '24px' }}>Danh sách hạng mục kiểm tra</h3>

        {items.length > 0 ? (
          <>
            <div className={styles.tableCard}>
              <div className={styles.safetyTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>HẠNG MỤC KIỂM TRA</th>
                      <th style={{ width: '40%' }}>GHI CHÚ</th>
                      <th style={{ width: '15%' }}>HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className={styles.itemName}>
                          {item.name}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleNoteChange(item.id, e.target.value)}
                            className={styles.noteInput}
                            placeholder="Nhập ghi chú cho hạng mục này..."
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => handleSaveNote(item)}
                            disabled={saving || !item.note || item.note.trim() === ''}
                            className={styles.saveBtn}
                          >
                            Lưu
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className={styles.saveAllBtn}
                onClick={handleSaveAll}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu tất cả ghi chú'}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>Không có hạng mục kiểm tra nào.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorInspection;
