import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchBookingDetail, cancelCustomerBooking } from '../../services/bookingService.js';
import './BookingDetail.css';

const BookingDetail = () => {
  useScrollToTop();
  const { id } = useParams();
  const navigate = useNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Load booking detail from API
  useEffect(() => {
    const loadBookingDetail = async () => {
      let token = localStorage.getItem('customerToken') || localStorage.getItem('authToken');
      
      if (!token) {
        setError('Vui lòng đăng nhập để xem chi tiết lịch hẹn.');
        setIsLoading(false);
        return;
      }

      if (!id) {
        setError('Không tìm thấy mã lịch hẹn.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetchBookingDetail(id, token);
        
        // Map backend response to frontend format
        const bookingData = response?.data;
        if (!bookingData) {
          setError('Không tìm thấy thông tin lịch hẹn.');
          return;
        }

        const mappedBooking = {
          id: bookingData.bookingCode || bookingData.bookingId?.toString() || '',
          bookingId: bookingData.bookingId,
          date: bookingData.scheduledDate ? new Date(bookingData.scheduledDate).toLocaleDateString('vi-VN') : '',
          time: bookingData.scheduledTime || '',
          status: mapStatus(bookingData.status),
          statusText: getStatusText(bookingData.status),
          services: bookingData.services?.map(svc => ({
            id: svc.itemId?.toString() || svc.id?.toString() || '',
            name: svc.itemName || svc.name || 'Dịch vụ',
            description: svc.description || ''
          })) || bookingData.serviceIds?.map(id => ({
            id: id.toString(),
            name: `Dịch vụ #${id}`,
            description: 'Chi tiết dịch vụ'
          })) || [],
          note: bookingData.description || '',
          customerName: bookingData.customerName || '',
          phone: bookingData.phone || '',
          isGuest: bookingData.isGuest || false,
          rawStatus: bookingData.status,
          // Progress steps từ API
          progressSteps: bookingData.progressSteps || null,
          technicianNotes: bookingData.technicianNotes || '',
          ticketStatus: bookingData.ticketStatus || null,
        };

        setBooking(mappedBooking);
        setError('');
      } catch (err) {
        const msg = err?.message || 'Không thể tải chi tiết lịch hẹn.';
        const isUnauthorized = err?.status === 401 || err?.status === 403;

        if (isUnauthorized) {
          localStorage.removeItem('authToken');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError(msg);
        }
        setBooking(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookingDetail();
  }, [id]);

  // Map backend status to frontend status
  const mapStatus = (backendStatus) => {
    const statusMap = {
      'PENDING': 'pending',
      'CONFIRMED': 'confirmed',
      'CANCELLED': 'cancelled',
      'COMPLETED': 'completed',
      'IN_PROGRESS': 'processing',
      'DONE': 'completed',  // DONE = Hoàn thành
    };
    return statusMap[backendStatus?.toUpperCase()] || 'pending';
  };

  // Get status text in Vietnamese
  const getStatusText = (backendStatus) => {
    const textMap = {
      'PENDING': 'Đang chờ',
      'CONFIRMED': 'Đã xác nhận',
      'CANCELLED': 'Đã hủy',
      'COMPLETED': 'Hoàn tất',
      'IN_PROGRESS': 'Đang xử lý',
      'DONE': 'Hoàn thành',  // DONE = Hoàn thành
    };
    return textMap[backendStatus?.toUpperCase()] || 'Đang chờ';
  };

  // Timeline steps - ưu tiên dùng API nếu có, không thì dùng mặc định
  const timelineSteps = booking?.progressSteps?.map((step, index) => ({
    key: step.label?.toLowerCase().replace(/\s+/g, '_') || `step_${index}`,
    label: step.label,
    status: step.status // COMPLETED, ACTIVE, PENDING
  })) || [
    { key: 'scheduled', label: 'Đã đặt lịch' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'processing', label: 'Đang thực hiện' },
    { key: 'completed', label: 'Hoàn thành' },
  ];

  // Get current step index - ưu tiên dùng progressSteps từ API
  const getCurrentStep = () => {
    // Nếu có progressSteps từ API, tìm step đang ACTIVE
    if (booking?.progressSteps && booking.progressSteps.length > 0) {
      const activeIndex = booking.progressSteps.findIndex(step => step.status === 'ACTIVE');
      if (activeIndex >= 0) return activeIndex;
      // Nếu không có ACTIVE, tìm step cuối cùng COMPLETED
      const completedIndex = booking.progressSteps.findIndex(step => step.status === 'PENDING');
      if (completedIndex >= 0) return completedIndex - 1;
      // Tất cả đã hoàn thành
      if (booking.progressSteps.every(step => step.status === 'COMPLETED')) {
        return booking.progressSteps.length - 1;
      }
    }

    // Fallback: dùng rawStatus
    const rawStatus = booking?.rawStatus || booking?.status;
    const stepMap = {
      'PENDING': 0,
      'CONFIRMED': 1,
      'IN_PROGRESS': 2,
      'DONE': 3,
      'COMPLETED': 3,
      'CANCELLED': -1,
      'pending': 0,
      'confirmed': 1,
      'processing': 2,
      'completed': 3,
    };
    return stepMap[rawStatus?.toUpperCase()] ?? stepMap[rawStatus] ?? 0;
  };

  const currentStep = getCurrentStep();

  // Chỉ cho phép sửa nếu lịch chưa hoàn tất và chưa bị hủy
  const statusToCheck = booking?.rawStatus || booking?.status;
  const isCompleted = statusToCheck === 'COMPLETED' || statusToCheck === 'DONE' || statusToCheck === 'completed';
  const isCancelled = statusToCheck === 'CANCELLED' || statusToCheck === 'CANCELED' || statusToCheck === 'cancelled';
  const canEdit = booking && !isCompleted && !isCancelled;

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    let token = localStorage.getItem('customerToken') || localStorage.getItem('authToken');
    
    if (!token || !booking?.bookingId) {
      alert('Không thể hủy lịch. Vui lòng thử lại.');
      return;
    }

    try {
      setIsCancelling(true);
      await cancelCustomerBooking(booking.bookingId, token);
      alert('Đã hủy lịch hẹn thành công');
      setShowCancelConfirm(false);
      navigate('/my-bookings');
    } catch (err) {
      alert(err?.message || 'Không thể hủy lịch. Vui lòng thử lại.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      pending: 'status-pending'
    };
    return statusMap[status] || '';
  };

  return (
    <div className="bookingDetailPage">
      <div className="detailContainer">
        {/* Header */}
        <div className="detailHeader">
          <Link to="/my-bookings" className="backButton">
            ← Quay lại danh sách
          </Link>
          <h1 className="pageTitle">Chi tiết lịch hẹn #{booking?.id}</h1>
        </div>

        {/* Timeline - Tiến trình phiếu (Style MyTasks) */}
        {!isLoading && booking && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px',
            marginBottom: '24px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              {timelineSteps.map((step, index) => {
                // Ưu tiên dùng status từ API
                const stepStatus = step.status?.toUpperCase();
                const isCompleted = stepStatus === 'COMPLETED' || index < currentStep;
                const isCurrent = stepStatus === 'ACTIVE' || index === currentStep;
                const isLast = index === timelineSteps.length - 1;

                return (
                  <div key={step.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {/* Step Circle with Label */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '80px'
                    }}>
                      {/* Circle */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        backgroundColor: isCompleted || isCurrent ? '#1E90FF' : '#e5e7eb',
                        color: isCompleted || isCurrent ? '#fff' : '#6b7280',
                        transition: 'all 0.3s ease',
                        boxShadow: isCompleted || isCurrent ? '0 2px 8px rgba(30, 144, 255, 0.3)' : 'none'
                      }}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      {/* Label */}
                      <span style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCompleted || isCurrent ? '#1E90FF' : '#9ca3af',
                        textAlign: 'center',
                        maxWidth: '80px'
                      }}>
                        {step.label}
                      </span>
                    </div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div style={{
                        width: '60px',
                        height: '2px',
                        backgroundColor: isCompleted ? '#1E90FF' : '#e5e7eb',
                        marginTop: '-20px',
                        transition: 'all 0.3s ease'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="errorBanner" style={{ 
            padding: '12px 16px', 
            marginBottom: '16px', 
            backgroundColor: '#fee', 
            color: '#c33', 
            borderRadius: '8px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loadingState" style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666' 
          }}>
            Đang tải chi tiết lịch hẹn...
          </div>
        )}

        {/* Content - Only show when not loading and has booking */}
        {!isLoading && booking && (
          <>
            {/* Thông tin lịch hẹn */}
            <section className="detailSection">
              <h2 className="sectionTitle">Thông tin lịch hẹn</h2>
              <div className="infoGrid">
                <div className="infoItem">
                  <span className="infoLabel">Mã lịch:</span>
                  <span className="infoValue">{booking.id}</span>
                </div>
                <div className="infoItem">
                  <span className="infoLabel">Ngày:</span>
                  <span className="infoValue">{booking.date}</span>
                </div>
                <div className="infoItem">
                  <span className="infoLabel">Giờ:</span>
                  <span className="infoValue">{booking.time}</span>
                </div>
                <div className="infoItem">
                  <span className="infoLabel">Trạng thái:</span>
                  <span className={`infoValue status-badge ${getStatusClass(booking.status)}`}>
                    {booking.statusText}
                  </span>
                </div>
              </div>
            </section>

            {/* Dịch vụ đã chọn */}
            <section className="detailSection">
              <h2 className="sectionTitle">Dịch vụ đã chọn</h2>
              <div className="servicesList">
                {booking.services.length > 0 ? (
                  booking.services.map((service, index) => (
                    <div key={service.id} className="serviceItem">
                      <div className="serviceNumber">Dịch vụ {index + 1}:</div>
                      <div className="serviceInfo">
                        <div className="serviceName">{service.name}</div>
                        <div className="serviceDescription">{service.description}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Chưa có dịch vụ nào được chọn</p>
                )}
              </div>
            </section>

            {/* Yêu cầu thêm */}
            {booking.note && (
              <section className="detailSection">
                <h2 className="sectionTitle">Yêu cầu thêm</h2>
                <div className="noteContent">
                  <p>{booking.note}</p>
                </div>
              </section>
            )}

            {/* Ghi chú từ KTV - từ API */}
            {booking.technicianNotes && (
              <section className="detailSection">
                <h2 className="sectionTitle">Ghi chú từ Kỹ thuật viên</h2>
                <div className="noteContent" style={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderLeft: '4px solid #1E90FF',
                  padding: '16px',
                  borderRadius: '8px'
                }}>
                  <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>{booking.technicianNotes}</p>
                </div>
              </section>
            )}

            {/* Trạng thái phiếu dịch vụ */}
            {booking.ticketStatus && (
              <section className="detailSection">
                <h2 className="sectionTitle">Trạng thái phiếu dịch vụ</h2>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: booking.ticketStatus === 'COMPLETED' ? '#d1fae5' : 
                                   booking.ticketStatus === 'IN_PROGRESS' ? '#dbeafe' : '#fef3c7',
                  color: booking.ticketStatus === 'COMPLETED' ? '#059669' : 
                         booking.ticketStatus === 'IN_PROGRESS' ? '#2563eb' : '#d97706',
                  fontWeight: '600'
                }}>
                  {booking.ticketStatus === 'COMPLETED' ? '✓ Đã hoàn thành' :
                   booking.ticketStatus === 'IN_PROGRESS' ? '🔧 Đang xử lý' :
                   booking.ticketStatus === 'PENDING' ? '⏳ Chờ xử lý' : booking.ticketStatus}
                </div>
              </section>
            )}

            {/* Action Buttons - Style MyTasks */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '2px solid #f3f4f6'
            }}>
              {canEdit ? (
                <>
                  <Link
                    to={`/edit-booking/${booking.bookingId || booking.id}`}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: '#1E90FF',
                      color: '#fff',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '15px',
                      display: 'inline-block',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 8px rgba(30, 144, 255, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1873CC';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(30, 144, 255, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#1E90FF';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 144, 255, 0.3)';
                    }}
                  >
                    Sửa lịch
                  </Link>
                  <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '15px',
                      cursor: isCancelling ? 'not-allowed' : 'pointer',
                      opacity: isCancelling ? 0.6 : 1,
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      if (!isCancelling) {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isCancelling) {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                      }
                    }}
                  >
                    {isCancelling ? 'Đang hủy...' : 'Hủy lịch'}
                  </button>
                </>
              ) : (
                <Link
                  to="/booking"
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#1E90FF',
                    color: '#fff',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '15px',
                    display: 'inline-block',
                    transition: 'all 0.3s',
                    boxShadow: '0 2px 8px rgba(30, 144, 255, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#1873CC';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(30, 144, 255, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#1E90FF';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 144, 255, 0.3)';
                  }}
                >
                  Đặt lịch mới
                </Link>
              )}
            </div>
          </>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="modalOverlay" onClick={() => !isCancelling && setShowCancelConfirm(false)}>
            <div className="modalContent" onClick={(e) => e.stopPropagation()}>
              <h3 className="modalTitle">Xác nhận hủy lịch</h3>
              <p className="modalMessage">
                Bạn có chắc chắn muốn hủy lịch hẹn này không?
              </p>
              <div className="modalActions">
                <button
                  className="btnModalCancel"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isCancelling}
                >
                  Không
                </button>
                <button
                  className="btnModalConfirm"
                  onClick={confirmCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Đang xử lý...' : 'Có, hủy lịch'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetail;
