import { useState } from 'react';
import StatCard from '../../../components/Dashboard/StatCard';
import styles from './ManagerDashboard.module.css';

const ManagerDashboard = () => {
  const [stats] = useState({
    todayBookings: 24,
    staff: 12,
    revenue: '8,500,000',
    pending: 5
  });

  const [weekSchedule] = useState([
    { day: 'T2', date: '04/03', staff: 10, bookings: 18 },
    { day: 'T3', date: '05/03', staff: 12, bookings: 24 },
    { day: 'T4', date: '06/03', staff: 11, bookings: 20 },
    { day: 'T5', date: '07/03', staff: 12, bookings: 22 },
    { day: 'T6', date: '08/03', staff: 10, bookings: 19 },
    { day: 'T7', date: '09/03', staff: 8, bookings: 15 },
    { day: 'CN', date: '10/03', staff: 6, bookings: 10 }
  ]);

  const [pendingBookings] = useState([
    { id: 1, customer: 'Nguyễn Văn A', service: 'Bảo dưỡng định kỳ', time: '09:00', status: 'pending' },
    { id: 2, customer: 'Trần Thị B', service: 'Thay nhớt', time: '10:30', status: 'pending' },
    { id: 3, customer: 'Lê Văn C', service: 'Sửa phanh', time: '14:00', status: 'pending' }
  ]);

  const [staffPerformance] = useState([
    { name: 'Nguyễn Văn D', role: 'Kỹ thuật viên', completed: 45, rating: 4.8 },
    { name: 'Trần Thị E', role: 'Cố vấn', completed: 38, rating: 4.9 },
    { name: 'Lê Văn F', role: 'Kỹ thuật viên', completed: 42, rating: 4.7 }
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Quản lý</h1>
          <p className={styles.subtitle}>Tổng quan hoạt động</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btn}>📊 Báo cáo</button>
          <button className={styles.btnPrimary}>➕ Tạo lịch</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Booking hôm nay"
          value={stats.todayBookings}
          icon="📅"
          color="blue"
          trend="up"
          trendValue="+5"
        />
        <StatCard
          title="Nhân viên làm việc"
          value={stats.staff}
          icon="👥"
          color="green"
        />
        <StatCard
          title="Doanh thu hôm nay"
          value={`${stats.revenue}đ`}
          icon="💰"
          color="purple"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Chờ duyệt"
          value={stats.pending}
          icon="⏳"
          color="orange"
        />
      </div>

      <div className={styles.scheduleCard}>
        <h2 className={styles.cardTitle}>📅 Lịch làm việc tuần này</h2>
        <div className={styles.weekGrid}>
          {weekSchedule.map((day, index) => (
            <div key={index} className={styles.dayCard}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{day.day}</span>
                <span className={styles.dayDate}>{day.date}</span>
              </div>
              <div className={styles.dayStats}>
                <div className={styles.dayStat}>
                  <span className={styles.statIcon}>👥</span>
                  <span className={styles.statValue}>{day.staff}</span>
                </div>
                <div className={styles.dayStat}>
                  <span className={styles.statIcon}>📋</span>
                  <span className={styles.statValue}>{day.bookings}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>⏳ Booking chờ duyệt</h2>
            <button className={styles.viewAllBtn}>Xem tất cả</button>
          </div>
          <div className={styles.bookingList}>
            {pendingBookings.map(booking => (
              <div key={booking.id} className={styles.bookingItem}>
                <div className={styles.bookingInfo}>
                  <h3 className={styles.customerName}>{booking.customer}</h3>
                  <p className={styles.serviceName}>{booking.service}</p>
                </div>
                <div className={styles.bookingTime}>{booking.time}</div>
                <div className={styles.bookingActions}>
                  <button className={styles.approveBtn}>✓ Duyệt</button>
                  <button className={styles.rejectBtn}>✕ Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📊 Hiệu suất nhân viên</h2>
          <div className={styles.performanceList}>
            {staffPerformance.map((staff, index) => (
              <div key={index} className={styles.performanceItem}>
                <div className={styles.staffInfo}>
                  <div className={styles.avatar}>{staff.name.charAt(0)}</div>
                  <div>
                    <h3 className={styles.staffName}>{staff.name}</h3>
                    <p className={styles.staffRole}>{staff.role}</p>
                  </div>
                </div>
                <div className={styles.performanceStats}>
                  <div className={styles.performanceStat}>
                    <span className={styles.statLabel}>Hoàn thành</span>
                    <span className={styles.statNumber}>{staff.completed}</span>
                  </div>
                  <div className={styles.performanceStat}>
                    <span className={styles.statLabel}>Đánh giá</span>
                    <span className={styles.statNumber}>⭐ {staff.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
