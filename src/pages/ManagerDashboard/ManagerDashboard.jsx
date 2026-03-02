import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ManagerDashboard.module.css';

const ManagerDashboard = () => {
  const [stats] = useState({
    todayBookings: 24,
    weeklyRevenue: 45000000,
    pendingApproval: 8,
    completedThisWeek: 45
  });

  const [upcomingBookings] = useState([
    { id: 1, customer: 'Nguyen Van A', service: 'Thay lop Michelin', time: '09:00', staff: 'Ky thuat Vien A', status: 'CONFIRMED' },
    { id: 2, customer: 'Tran Thi B', service: 'Can chinh dao', time: '10:30', staff: 'Ky thuat Vien B', status: 'CONFIRMED' },
    { id: 3, customer: 'Le Van C', service: 'Bao duong tong', time: '14:00', staff: 'Ky thuat Vien A', status: 'PENDING' },
    { id: 4, customer: 'Pham Thi D', service: 'Thay dau may', time: '15:30', staff: 'Ky thuat Vien C', status: 'PENDING' }
  ]);

  const [staffSchedule] = useState([
    { name: 'Ky thuat Vien A', status: 'dang_lam', currentTask: 'Thay lop xe', timeLeft: '30 phut' },
    { name: 'Ky thuat Vien B', status: 'ranh', currentTask: '-', timeLeft: '-' },
    { name: 'Ky thuat Vien C', status: 'dang_lam', currentTask: 'Bao duong', timeLeft: '1 gio' }
  ]);

  const quickActions = [
    { id: 1, title: 'Duyet lich hen', desc: 'Duyet hoac tu choi lich', link: '/booking-request-management', icon: '✅' },
    { id: 2, title: 'Quan ly nhan vien', desc: 'Phan cong cong viec', link: '/staff-management', icon: '👥' },
    { id: 3, title: 'Bao cao thong ke', desc: 'Xem bao cao doanh thu', link: '/reports', icon: '📊' },
    { id: 4, title: 'Cai dat', desc: 'Cau hinh he thong', link: '/settings', icon: '⚙️' }
  ];

  const getStatusClass = (status) => {
    switch(status) {
      case 'CONFIRMED': return styles.confirmed;
      case 'PENDING': return styles.pending;
      case 'dang_lam': return styles.working;
      case 'ranh': return styles.available;
      default: return '';
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Quan Ly</h1>
          <p className={styles.subtitle}>Tong quan cong viec quan ly</p>
        </div>
        <div className={styles.dateInfo}>
          <span className={styles.date}>Thu 3, 15/01/2025</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#3b82f6' }}>📅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.todayBookings}</span>
            <span className={styles.statLabel}>Lich hom nay</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#10b981' }}>💰</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.weeklyRevenue)}</span>
            <span className={styles.statLabel}>Doanh thu tuan</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f59e0b' }}>⏳</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.pendingApproval}</span>
            <span className={styles.statLabel}>Cho duyet</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#8b5cf6' }}>✅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.completedThisWeek}</span>
            <span className={styles.statLabel}>Hoan thanh tuan</span>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Thao tac nhanh</h2>
        <div className={styles.actionsRow}>
          {quickActions.map((action) => (
            <Link key={action.id} to={action.link} className={styles.actionBtn}>
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionText}>{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Lich hen sap toi</h2>
            <Link to="/booking-management" className={styles.viewAll}>Xem chi tiet</Link>
          </div>
          <div className={styles.bookingList}>
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className={styles.bookingItem}>
                <div className={styles.bookingTime}>{booking.time}</div>
                <div className={styles.bookingInfo}>
                  <h4>{booking.customer}</h4>
                  <p>{booking.service}</p>
                  <span className={styles.bookingStaff}>{booking.staff}</span>
                </div>
                <span className={`${styles.bookingStatus} ${getStatusClass(booking.status)}`}>
                  {booking.status === 'CONFIRMED' ? 'Da xac nhan' : 'Cho xac nhan'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Tinh hinh nhan vien</h2>
          </div>
          <div className={styles.staffGrid}>
            {staffSchedule.map((staff, index) => (
              <div key={index} className={styles.staffCard}>
                <div className={styles.staffHeader}>
                  <div className={styles.staffAvatar}>{staff.name.charAt(0)}</div>
                  <div className={`${styles.staffStatus} ${getStatusClass(staff.status)}`}>
                    {staff.status === 'dang_lam' ? 'Dang lam' : 'Ranh'}
                  </div>
                </div>
                <div className={styles.staffBody}>
                  <h4>{staff.name}</h4>
                  <p className={styles.currentTask}>{staff.currentTask}</p>
                  <span className={styles.timeLeft}>{staff.timeLeft}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerItem}>
          <span>📅</span> Lich trinh hom nay: {stats.todayBookings} lich hen
        </div>
        <div className={styles.footerItem}>
          <span>👥</span> Nhan vien: {staffSchedule.length} nguoi
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
