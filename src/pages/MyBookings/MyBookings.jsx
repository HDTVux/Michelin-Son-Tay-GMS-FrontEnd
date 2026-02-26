import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchMyBookings } from '../../services/bookingService.js';
import './MyBookings.css';

const MyBookings = () => {
  useScrollToTop();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load bookings from API
  useEffect(() => {
    const loadBookings = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Vui lòng đăng nhập để xem lịch hẹn.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetchMyBookings(token);
        
        // Map backend response to frontend format
        const mappedBookings = (response?.data || []).map(booking => ({
          id: booking.bookingCode || booking.bookingId?.toString() || '',
          bookingId: booking.bookingId,
          date: booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('vi-VN') : '',
          time: booking.scheduledTime || '',
          status: mapStatus(booking.status),
          statusText: getStatusText(booking.status),
          services: booking.serviceIds?.map(id => `Dịch vụ #${id}`) || [],
          description: booking.description || '',
          customerName: booking.customerName || '',
          phone: booking.phone || '',
          isGuest: booking.isGuest || false,
          rawDate: booking.scheduledDate,
          rawTime: booking.scheduledTime,
        }));

        setBookings(mappedBookings);
        setError('');
      } catch (err) {
        const msg = err?.message || 'Không thể tải danh sách lịch hẹn.';
        const isUnauthorized = err?.status === 401 || err?.status === 403;

        if (isUnauthorized) {
          localStorage.removeItem('authToken');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError(msg);
        }
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  // Map backend status to frontend status
  const mapStatus = (backendStatus) => {
    const statusMap = {
      'PENDING': 'pending',
      'CONFIRMED': 'confirmed',
      'CANCELLED': 'cancelled',
      'COMPLETED': 'confirmed',
      'IN_PROGRESS': 'confirmed',
    };
    return statusMap[backendStatus?.toUpperCase()] || 'pending';
  };

  // Get status text in Vietnamese
  const getStatusText = (backendStatus) => {
    const textMap = {
      'PENDING': 'Đang chờ',
      'CONFIRMED': 'Xác nhận',
      'CANCELLED': 'Đã hủy',
      'COMPLETED': 'Hoàn thành',
      'IN_PROGRESS': 'Đang thực hiện',
    };
    return textMap[backendStatus?.toUpperCase()] || 'Đang chờ';
  };

  const statusFilters = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Đang chờ' },
    { value: 'confirmed', label: 'Xác nhận' },
    { value: 'cancelled', label: 'Đã hủy' }
  ];

  const parseDateTime = (date, time) => {
    // Handle both string date format (dd/mm/yyyy) and ISO date
    if (!date) return 0;
    
    let dateObj;
    if (typeof date === 'string' && date.includes('/')) {
      // Format: dd/mm/yyyy
      const [day, month, year] = date.split('/').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      // ISO format or Date object
      dateObj = new Date(date);
    }
    
    // Add time if available
    if (time) {
      const timeStr = typeof time === 'string' ? time : time.toString();
      const [hour, minute] = timeStr.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        dateObj.setHours(hour, minute);
      }
    }
    
    return dateObj.getTime();
  };

  const filteredBookings = useMemo(() => {
    let result = selectedStatus === 'all'
      ? bookings 
      : bookings.filter((booking) => booking.status === selectedStatus);

    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase();
      result = result.filter((booking) => {
        const servicesText = booking.services.join(' ').toLowerCase();
        const descText = (booking.description || '').toLowerCase();
        return (
          booking.id.toLowerCase().includes(keyword) ||
          servicesText.includes(keyword) ||
          descText.includes(keyword) ||
          (booking.customerName || '').toLowerCase().includes(keyword)
        );
      });
    }

    result = [...result].sort((a, b) => {
      const timeA = parseDateTime(a.rawDate || a.date, a.rawTime || a.time);
      const timeB = parseDateTime(b.rawDate || b.date, b.rawTime || b.time);
      if (sortBy === 'date-asc') return timeA - timeB;
      if (sortBy === 'status') return a.status.localeCompare(b.status) || timeB - timeA;
      // mặc định: mới nhất lên trước
      return timeB - timeA;
    });

    return result;
  }, [bookings, selectedStatus, searchTerm, sortBy]);

  const getStatusClass = (status) => {
    const statusMap = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      cancelled: 'status-cancelled'
    };
    return statusMap[status] || '';
  };

  return (
    <div className="myBookingsPage">
      <div className="bookingsContainer">
        {/* Header */}
        <div className="bookingsHeader">
          <Link to="/user-profile" className="backButton">
            ← Quay lại
          </Link>
          <h1 className="pageTitle">Lịch hẹn của tôi</h1>
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
            Đang tải danh sách lịch hẹn...
          </div>
        )}

        {/* Content - Only show when not loading */}
        {!isLoading && (
          <>
            {/* Filter Tabs */}
            <div className="bookingStatusFilter">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  className={`filterTab ${selectedStatus === filter.value ? 'active' : ''}`}
                  onClick={() => setSelectedStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div className="bookingSearchSort">
              <div className="bookingSearch">
                <input
                  type="text"
                  placeholder="Tìm theo mã lịch, dịch vụ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="bookingSort">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date-desc">Mới nhất</option>
                  <option value="date-asc">Cũ nhất</option>
                  <option value="status">Theo trạng thái</option>
                </select>
              </div>
            </div>

            {/* Booking List */}
            <div className="bookingList">
              {filteredBookings.length === 0 ? (
                <div className="emptyState">
                  <p>{searchTerm || selectedStatus !== 'all' ? 'Không tìm thấy lịch hẹn nào' : 'Bạn chưa có lịch hẹn nào'}</p>
                </div>
              ) : (
                filteredBookings.map((booking) => (
                  <div key={booking.id} className="bookingCard">
                    <div className="bookingCardHeader">
                      <div className="bookingCode">Mã lịch: {booking.id}</div>
                      <div className={`bookingStatus ${getStatusClass(booking.status)}`}>
                        {booking.statusText}
                      </div>
                    </div>
                    
                    <div className="bookingCardBody">
                      <div className="bookingInfoLeft">
                        <div className="bookingInfoRow">
                          <span className="infoLabel">Dịch vụ:</span>
                          <span className="infoValue">
                            {booking.services.length > 0 ? booking.services.join(', ') : 'Chưa có dịch vụ'}
                          </span>
                        </div>
                        {booking.description && (
                          <div className="bookingInfoRow">
                            <span className="infoLabel">Ghi chú:</span>
                            <span className="infoValue">{booking.description}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bookingInfoRight">
                        <div className="bookingDateTime">
                          <div className="bookingDate">{booking.date || 'Chưa có ngày'}</div>
                          <div className="bookingTime">{booking.time || 'Chưa có giờ'}</div>
                        </div>
                        <Link 
                          to={`/booking-detail/${booking.bookingId || booking.id}`}
                          className="btnViewDetail"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
