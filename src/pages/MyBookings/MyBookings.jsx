import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './MyBookings.css';
import './MyBookings.header.css';
import './MyBookings.filter.css';
import './MyBookings.list.css';

const MyBookings = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  // Dữ liệu mẫu - sau này sẽ lấy từ API
  const [bookings] = useState([
    {
      id: 'LH001',
      date: '23/10/2023',
      time: '10:00',
      status: 'confirmed', // pending, confirmed, cancelled
      statusText: 'Xác nhận',
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
      status: 'pending',
      statusText: 'Đang chờ',
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
      status: 'pending',
      statusText: 'Đang chờ',
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
      status: 'confirmed',
      statusText: 'Xác nhận',
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
    { value: 'pending', label: 'Đang chờ' },
    { value: 'confirmed', label: 'Xác nhận' },
    { value: 'cancelled', label: 'Đã hủy' }
  ];

  const parseDateTime = (date, time) => {
    // date: dd/mm/yyyy, time: HH:MM
    const [day, month, year] = date.split('/').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute).getTime();
  };

  const filteredBookings = useMemo(() => {
    let result = selectedStatus === 'all'
      ? bookings
      : bookings.filter((booking) => booking.status === selectedStatus);

    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase();
      result = result.filter((booking) => {
        const servicesText = booking.services.join(' ').toLowerCase();
        const workshopText = `${booking.workshop.name} ${booking.workshop.address}`.toLowerCase();
        return (
          booking.id.toLowerCase().includes(keyword) ||
          servicesText.includes(keyword) ||
          workshopText.includes(keyword)
        );
      });
    }

    result = [...result].sort((a, b) => {
      const timeA = parseDateTime(a.date, a.time);
      const timeB = parseDateTime(b.date, b.time);
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
              placeholder="Tìm theo mã lịch, dịch vụ hoặc xưởng..."
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
