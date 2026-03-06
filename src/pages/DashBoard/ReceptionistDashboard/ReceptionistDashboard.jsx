import { useState } from 'react';
import StatCard from '../../../components/Dashboard/StatCard';
import styles from './ReceptionistDashboard.module.css';

const ReceptionistDashboard = () => {
  const [stats] = useState({
    waiting: 3,
    checkedIn: 5,
    completed: 12,
    upcoming: 8
  });

  const [todayBookings] = useState([
    { id: 1, time: '08:00', customer: 'Nguyễn Văn A', service: 'Bảo dưỡng', status: 'waiting', phone: '0912345678' },
    { id: 2, time: '09:30', customer: 'Trần Thị B', service: 'Sửa chữa', status: 'checkedIn', phone: '0923456789' },
    { id: 3, time: '10:00', customer: 'Lê Văn C', service: 'Thay nhớt', status: 'completed', phone: '0934567890' },
    { id: 4, time: '11:00', customer: 'Phạm Thị D', service: 'Kiểm tra', status: 'upcoming', phone: '0945678901' }
  ]);

  const [pendingRequests] = useState([
    { id: 1, customer: 'Hoàng Văn E', phone: '0956789012', service: 'Bảo dưỡng', date: '07/03/2024' },
    { id: 2, customer: 'Võ Thị F', phone: '0967890123', service: 'Sửa phanh', date: '08/03/2024' }
  ]);

  const getStatusColor = (status) => {
    const colors = {
      waiting: 'orange',
      checkedIn: 'blue',
      completed: 'green',
      upcoming: 'purple'
    };
    return colors[status] || 'gray';
  };

  const getStatusText = (status) => {
    const texts = {
      waiting: '⏳ Đang chờ',
      checkedIn: '✓ Đã check-in',
      completed: '✅ Hoàn thành',
      upcoming: '📅 Sắp tới'
    };
    return texts[status] || status;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Lễ tân</h1>
          <p className={styles.subtitle}>Tiếp đón và quản lý khách hàng</p>
        </div>
        <button className={styles.btnPrimary}>➕ Tạo booking mới</button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard title="Đang chờ" value={stats.waiting} icon="⏳" color="orange" />
        <StatCard title="Đã check-in" value={stats.checkedIn} icon="✓" color="blue" />
        <StatCard title="Hoàn thành" value={stats.completed} icon="✅" color="green" />
        <StatCard title="Sắp tới" value={stats.upcoming} icon="📅" color="purple" />
      </div>

      <div className={styles.mainCard}>
        <h2 className={styles.cardTitle}>📅 Lịch hẹn hôm nay</h2>
        <div className={styles.bookingList}>
          {todayBookings.map(booking => (
            <div key={booking.id} className={`${styles.bookingItem} ${styles[getStatusColor(booking.status)]}`}>
              <div className={styles.timeSlot}>{booking.time}</div>
              <div className={styles.bookingInfo}>
                <h3 className={styles.customerName}>{booking.customer}</h3>
                <p className={styles.serviceInfo}>{booking.service} • {booking.phone}</p>
              </div>
              <span className={`${styles.statusBadge} ${styles[booking.status]}`}>
                {getStatusText(booking.status)}
              </span>
              <div className={styles.actions}>
                {booking.status === 'waiting' && (
                  <button className={styles.checkInBtn}>Check-in</button>
                )}
                {booking.status === 'upcoming' && (
                  <button className={styles.callBtn}>📞 Gọi</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>⏳ Booking chờ xác nhận</h2>
          <div className={styles.requestList}>
            {pendingRequests.map(req => (
              <div key={req.id} className={styles.requestItem}>
                <div className={styles.requestInfo}>
                  <h3 className={styles.requestCustomer}>{req.customer}</h3>
                  <p className={styles.requestDetails}>{req.service} • {req.phone}</p>
                  <span className={styles.requestDate}>📅 {req.date}</span>
                </div>
                <div className={styles.requestActions}>
                  <button className={styles.confirmBtn}>✓ Xác nhận</button>
                  <button className={styles.rejectBtn}>✕ Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🔔 Khách sắp đến</h2>
          <div className={styles.upcomingList}>
            <div className={styles.upcomingItem}>
              <span className={styles.upcomingTime}>11:00</span>
              <div>
                <div className={styles.upcomingCustomer}>Phạm Thị D</div>
                <div className={styles.upcomingService}>Kiểm tra định kỳ</div>
              </div>
            </div>
            <div className={styles.upcomingItem}>
              <span className={styles.upcomingTime}>14:00</span>
              <div>
                <div className={styles.upcomingCustomer}>Trần Văn G</div>
                <div className={styles.upcomingService}>Bảo dưỡng</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
