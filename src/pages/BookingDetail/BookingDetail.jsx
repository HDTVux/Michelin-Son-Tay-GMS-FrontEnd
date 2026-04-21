import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchBookingDetail, cancelCustomerBooking } from '../../services/bookingService.js';
import './BookingDetail.css';

const normalizeStatus = (status) => String(status || '').trim().toUpperCase();

const isTicketCompletedStatus = (status) => (
  ['COMPLETED', 'PAID', 'FINISHED'].includes(normalizeStatus(status))
);

const isBookingCompletedStatus = (status) => (
  ['COMPLETED', 'FINISHED'].includes(normalizeStatus(status))
);

const isCancelledStatus = (status) => (
  ['CANCELLED', 'CANCELED', 'CANCEL'].includes(normalizeStatus(status))
);

const hasCompletedWorkflow = (bookingData) => (
  bookingData?.ticketStatus
    ? isTicketCompletedStatus(bookingData.ticketStatus)
    : isBookingCompletedStatus(bookingData?.rawStatus || bookingData?.status)
);

const mapStatus = (backendStatus) => {
  const statusMap = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    CANCELED: 'cancelled',
    CANCEL: 'cancelled',
    COMPLETED: 'completed',
    IN_PROGRESS: 'processing',
    DONE: 'processing',
    FINISHED: 'completed',
    PAID: 'completed',
    CREATED: 'processing',
    INSPECTING: 'processing',
    INSPECTED: 'processing',
    ESTIMATED: 'processing',
    REPAIRING: 'processing',
  };
  return statusMap[normalizeStatus(backendStatus)] || 'pending';
};

const mapDisplayStatus = (bookingStatus, ticketStatus) => (
  ticketStatus ? mapStatus(ticketStatus) : mapStatus(bookingStatus)
);

const getStatusText = (backendStatus) => {
  const textMap = {
    PENDING: 'Đang chờ',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã hủy',
    CANCELED: 'Đã hủy',
    CANCEL: 'Đã hủy',
    COMPLETED: 'Hoàn tất',
    IN_PROGRESS: 'Đang xử lý',
    DONE: 'Đang thực hiện',
    FINISHED: 'Hoàn thành',
    PAID: 'Hoàn thành',
    CREATED: 'Đã tạo phiếu',
    INSPECTING: 'Đang kiểm tra',
    INSPECTED: 'Đã kiểm tra',
    ESTIMATED: 'Đã báo giá',
    REPAIRING: 'Đang sửa chữa',
  };
  return textMap[normalizeStatus(backendStatus)] || 'Đang chờ';
};

const getDisplayStatusText = (bookingStatus, ticketStatus) => (
  ticketStatus ? getStatusText(ticketStatus) : getStatusText(bookingStatus)
);

const BookingDetail = () => {
  useScrollToTop();
  const { id } = useParams();
  const navigate = useNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const defaultTimelineSteps = [
    { key: 'scheduled', label: 'Đã đặt lịch' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'processing', label: 'Đang thực hiện' },
    { key: 'completed', label: 'Hoàn thành' },
  ];

  const normalizeStatus = (status) => String(status || '').trim().toUpperCase();
  const isTicketCompletedStatus = (status) => (
    ['COMPLETED', 'PAID', 'FINISHED'].includes(normalizeStatus(status))
  );
  const isBookingCompletedStatus = (status) => (
    ['COMPLETED', 'FINISHED'].includes(normalizeStatus(status))
  );
  const isCancelledStatus = (status) => (
    ['CANCELLED', 'CANCELED', 'CANCEL'].includes(normalizeStatus(status))
  );
  const hasCompletedWorkflow = (bookingData) => (
    bookingData?.ticketStatus
      ? isTicketCompletedStatus(bookingData.ticketStatus)
      : isBookingCompletedStatus(bookingData?.rawStatus || bookingData?.status)
  );

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
          status: mapDisplayStatus(bookingData.status, bookingData.ticketStatus),
          statusText: getDisplayStatusText(bookingData.status, bookingData.ticketStatus),
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
      'CANCELED': 'cancelled',
      'CANCEL': 'cancelled',
      'COMPLETED': 'completed',
      'IN_PROGRESS': 'processing',
      'DONE': 'processing',
      'FINISHED': 'completed',
      'PAID': 'completed',
      'CREATED': 'processing',
      'INSPECTING': 'processing',
      'INSPECTED': 'processing',
      'ESTIMATED': 'processing',
      'REPAIRING': 'processing',
    };
    return statusMap[normalizeStatus(backendStatus)] || 'pending';
  };

  const mapDisplayStatus = (bookingStatus, ticketStatus) => (
    ticketStatus ? mapStatus(ticketStatus) : mapStatus(bookingStatus)
  );

  // Get status text in Vietnamese
  const getStatusText = (backendStatus) => {
    const textMap = {
      'PENDING': 'Đang chờ',
      'CONFIRMED': 'Đã xác nhận',
      'CANCELLED': 'Đã hủy',
      'CANCELED': 'Đã hủy',
      'CANCEL': 'Đã hủy',
      'COMPLETED': 'Hoàn tất',
      'IN_PROGRESS': 'Đang xử lý',
      'DONE': 'Đang thực hiện',
      'FINISHED': 'Hoàn thành',
      'PAID': 'Hoàn thành',
      'CREATED': 'Đã tạo phiếu',
      'INSPECTING': 'Đang kiểm tra',
      'INSPECTED': 'Đã kiểm tra',
      'ESTIMATED': 'Đã báo giá',
      'REPAIRING': 'Đang sửa chữa',
    };
    return textMap[normalizeStatus(backendStatus)] || 'Đang chờ';
  };

  const getDisplayStatusText = (bookingStatus, ticketStatus) => (
    ticketStatus ? getStatusText(ticketStatus) : getStatusText(bookingStatus)
  );

  // Timeline steps - ưu tiên dùng API nếu có, không thì dùng mặc định
  const baseTimelineSteps = Array.isArray(booking?.progressSteps) && booking.progressSteps.length > 0
    ? booking.progressSteps.map((step, index) => ({
    key: step.label?.toLowerCase().replace(/\s+/g, '_') || `step_${index}`,
    label: step.label,
    status: step.status // COMPLETED, ACTIVE, PENDING
  }))
    : defaultTimelineSteps;

  const timelineSteps = hasCompletedWorkflow(booking)
    ? baseTimelineSteps.map(step => ({ ...step, status: 'COMPLETED' }))
    : baseTimelineSteps;

  // Get current step index - ưu tiên dùng progressSteps từ API
  const getCurrentStep = () => {
    if (hasCompletedWorkflow(booking)) {
      return Math.max(0, timelineSteps.length - 1);
    }

    // Nếu có progressSteps từ API, tìm step đang ACTIVE
    if (booking?.progressSteps && booking.progressSteps.length > 0) {
      const activeIndex = booking.progressSteps.findIndex(step => normalizeStatus(step.status) === 'ACTIVE');
      if (activeIndex >= 0) return activeIndex;
      // Nếu không có ACTIVE, tìm step cuối cùng COMPLETED
      const completedIndex = booking.progressSteps.findIndex(step => normalizeStatus(step.status) === 'PENDING');
      if (completedIndex >= 0) return Math.max(0, completedIndex - 1);
      // Tất cả đã hoàn thành
      if (booking.progressSteps.every(step => normalizeStatus(step.status) === 'COMPLETED')) {
        return booking.progressSteps.length - 1;
      }
    }

    // Fallback: dùng rawStatus
    const rawStatus = normalizeStatus(booking?.rawStatus || booking?.status);
    const stepMap = {
      'PENDING': 0,
      'CONFIRMED': 1,
      'CONFIRM': 1,
      'IN_PROGRESS': 2,
      'PROCESSING': 2,
      'DONE': 2,
      'COMPLETED': 3,
      'CANCELLED': -1,
    };
    return stepMap[rawStatus] ?? 0;
  };

  const currentStep = getCurrentStep();

  // Chỉ cho phép sửa nếu lịch chưa hoàn tất và chưa bị hủy
  const statusToCheck = booking?.rawStatus || booking?.status;
  const isCompleted = hasCompletedWorkflow(booking);
  const isCancelled = isCancelledStatus(statusToCheck);
  const bookingStatus = normalizeStatus(statusToCheck);
  const hasServiceTicket = Boolean(booking?.ticketStatus);
  const canEdit = booking
    && !isCompleted
    && !isCancelled
    && !hasServiceTicket
    && ['PENDING', 'CONFIRMED'].includes(bookingStatus);

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
                const stepStatus = normalizeStatus(step.status);
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
                        backgroundColor: isCompleted || isCurrent ? '#1a1a1a' : '#e5e7eb',
                        color: isCompleted || isCurrent ? '#fff' : '#6b7280',
                        transition: 'all 0.3s ease'
                      }}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      {/* Label */}
                      <span style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCompleted || isCurrent ? '#1a1a1a' : '#9ca3af',
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
                        backgroundColor: isCompleted ? '#1a1a1a' : '#e5e7eb',
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
                <div className="noteContent" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <p>{booking.technicianNotes}</p>
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
                  backgroundColor: isTicketCompletedStatus(booking.ticketStatus) ? '#dcfce7' : '#fef3c7',
                  color: isTicketCompletedStatus(booking.ticketStatus) ? '#166534' : '#92400e',
                  fontWeight: '500'
                }}>
                  {isTicketCompletedStatus(booking.ticketStatus) ? '✓ Hoàn thành' : getStatusText(booking.ticketStatus)}
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
              borderTop: '1px solid #e5e7eb'
            }}>
              {canEdit ? (
                <>
                  <Link
                    to={`/edit-booking/${booking.id || booking.bookingId}`}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: '#0066FF',
                      color: '#fff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'inline-block',
                      transition: 'all 0.2s'
                    }}
                  >
                    Sửa lịch
                  </Link>
                  <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: '#0066FF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: isCancelling ? 'not-allowed' : 'pointer',
                      opacity: isCancelling ? 0.6 : 1,
                      transition: 'all 0.2s'
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
                    backgroundColor: '#0066FF',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px'
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
