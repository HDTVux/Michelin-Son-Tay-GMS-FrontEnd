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
      const token = localStorage.getItem('authToken');
      
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
          services: bookingData.serviceIds?.map(id => ({
            id: id.toString(),
            name: `Dịch vụ #${id}`,
            description: 'Chi tiết dịch vụ'
          })) || [],
          note: bookingData.description || '',
          customerName: bookingData.customerName || '',
          phone: bookingData.phone || '',
          isGuest: bookingData.isGuest || false,
          rawStatus: bookingData.status,
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
    };
    return textMap[backendStatus?.toUpperCase()] || 'Đang chờ';
  };

  // Chỉ cho phép sửa nếu lịch chưa hoàn tất và chưa bị hủy
  const isCompleted = booking?.status === 'completed';
  const isCancelled = booking?.status === 'cancelled';
  const canEdit = booking && !isCompleted && !isCancelled;

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    const token = localStorage.getItem('authToken');
    
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
            ← Quay lại
          </Link>
          <h1 className="pageTitle">Chi tiết lịch hẹn</h1>
        </div>

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
                  <span className="infoLabel">Ngày & giờ:</span>
                  <span className="infoValue">{booking.date} {booking.time}</span>
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

            {/* Action Buttons */}
            <div className="actionButtons">
              {canEdit ? (
                <>
                  <Link
                    to={`/edit-booking/${booking.bookingId || booking.id}`}
                    className="btnEditBooking"
                  >
                    Sửa lịch
                  </Link>
                  <button
                    className="btnCancelBooking"
                    onClick={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Đang hủy...' : 'Hủy lịch'}
                  </button>
                </>
              ) : (
                <Link
                  to="/booking"
                  className="btnNewBooking"
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
