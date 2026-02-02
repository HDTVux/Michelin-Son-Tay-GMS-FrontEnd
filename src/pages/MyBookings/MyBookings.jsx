import { useState } from 'react';
import { Link } from 'react-router-dom';
import './MyBookings.css';

const MyBookings = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Dữ liệu mẫu - sau này sẽ lấy từ API
  const [bookings] = useState([
    {
      id: 'LH001',
      date: '23/10/2023',
      time: '10:00',
      status: 'confirmed', // confirmed, processing, completed, cancelled
      statusText: 'Đã xác nhận',
      services: ['Thay dầu', 'Kiểm tra phanh'],
      workshop: {
        name: 'Xưởng sửa chữa ABC',
        address: '123 Đường ABC, Quận 1, TPHCM'
      }
    },
    {
      id: 'LH002',
      date: '19/10/2023',
      time: '14:30',
      status: 'confirmed',
      statusText: 'Đã xác nhận',
      services: ['Sửa chữa động cơ'],
      workshop: {
        name: 'Xưởng sửa chữa XYZ',
        address: '456 Đường XYZ, Quận 2, TPHCM'
      }
    },
    {
      id: 'LH003',
      date: '19/10/2023',
      time: '09:00',
      status: 'processing',
      statusText: 'Đang xử lý',
      services: ['Bảo dưỡng định kỳ'],
      workshop: {
        name: 'Xưởng sửa chữa ABC',
        address: '123 Đường ABC, Quận 1, TPHCM'
      }
    },
    {
      id: 'LH004',
      date: '15/10/2023',
      time: '11:00',
      status: 'completed',
      statusText: 'Hoàn tất',
      services: ['Thay lốp', 'Cân bằng'],
      workshop: {
        name: 'Xưởng sửa chữa ABC',
        address: '123 Đường ABC, Quận 1, TPHCM'
      }
    },
    {
      id: 'LH005',
      date: '10/10/2023',
      time: '15:00',
      status: 'cancelled',
      statusText: 'Đã hủy',
      services: ['Kiểm tra tổng quát'],
      workshop: {
        name: 'Xưởng sửa chữa XYZ',
        address: '456 Đường XYZ, Quận 2, TPHCM'
      }
    }
  ]);

  const statusFilters = [
    { value: 'all', label: 'Tất cả' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã hủy' }
  ];

  const filteredBookings = selectedStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === selectedStatus);

  const getStatusClass = (status) => {
    const statusMap = {
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      completed: 'status-completed',
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

        {/* Booking List */}
        <div className="bookingList">
          {filteredBookings.length === 0 ? (
            <div className="emptyState">
              <p>Không có lịch hẹn nào</p>
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
                      <span className="infoValue">{booking.services.join(', ')}</span>
                    </div>
                    <div className="bookingInfoRow">
                      <span className="infoLabel">Xưởng:</span>
                      <span className="infoValue">{booking.workshop.address}</span>
                    </div>
                  </div>
                  
                  <div className="bookingInfoRight">
                    <div className="bookingDateTime">
                      <div className="bookingDate">{booking.date}</div>
                      <div className="bookingTime">{booking.time}</div>
                    </div>
                    <Link 
                      to={`/booking-detail/${booking.id}`}
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
      </div>
    </div>
  );
};

export default MyBookings;
