import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const [stats] = useState({
    totalBookings: 156,
    totalCustomers: 89,
    totalRevenue: 125000000,
    totalStaff: 12
  });

  const [recentBookings] = useState([
    { id: 1, customer: 'Nguyen Van A', service: 'Thay lop', status: 'PENDING', date: '2024-01-15' },
    { id: 2, customer: 'Tran Thi B', service: 'Can chinh dao', status: 'CONFIRMED', date: '2024-01-15' },
    { id: 3, customer: 'Le Van C', service: 'Bao duong', status: 'COMPLETED', date: '2024-01-14' },
    { id: 4, customer: 'Pham Thi D', service: 'Thay dau', status: 'PENDING', date: '2024-01-14' }
  ]);

  const [staffPerformance] = useState([
    { name: 'Nguyen Van A', role: 'Ky thuat vien', tasks: 24, rating: 4.8 },
    { name: 'Tran Thi B', role: 'Le tan', tasks: 45, rating: 4.9 },
    { name: 'Le Van C', role: 'Tu van', tasks: 32, rating: 4.7 }
  ]);

  const quickActions = [
    { id: 1, icon: 'calendar', title: 'Quan ly lich hen', desc: 'Quan ly tat ca lich hen', link: '/booking-request-management', color: '#3b82f6' },
    { id: 2, icon: 'users', title: 'Quan ly khach hang', desc: 'Xem va chinh sua thong tin', link: '/customer-list', color: '#10b981' },
    { id: 3, icon: 'clipboard', title: 'Quan ly nhan vien', desc: 'Quan ly tai khoan nhan vien', link: '/staff-list', color: '#f59e0b' },
    { id: 4, icon: 'chart', title: 'Thong ke bao cao', desc: 'Xem bao cao thong ke', link: '/reports', color: '#8b5cf6' },
    { id: 5, icon: 'settings', title: 'Cai dat he thong', desc: 'Cau hinh he thong', link: '/system-settings', color: '#ef4444' },
    { id: 6, icon: 'truck', title: 'Quan ly kho', desc: 'Quan ly phu tung va vat tu', link: '/inventory', color: '#06b6d4' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return styles.statusPending;
      case 'CONFIRMED': return styles.statusConfirmed;
      case 'COMPLETED': return styles.statusCompleted;
      case 'CANCELLED': return styles.statusCancelled;
      default: return '';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getIcon = (icon) => {
    switch(icon) {
      case 'calendar': return '📅';
      case 'users': return '👥';
      case 'clipboard': return '📋';
      case 'chart': return '📊';
      case 'settings': return '⚙️';
      case 'truck': return '🚗';
      default: return '📌';
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Admin</h1>
          <p className={styles.subtitle}>Xin chao, Admin! Tong quan he thong</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.notificationBtn}>
            <span className={styles.badge}>3</span>
            Thong bao
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#3b82f6' }}>📅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalBookings}</span>
            <span className={styles.statLabel}>Tong lich hen</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#10b981' }}>👥</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalCustomers}</span>
            <span className={styles.statLabel}>Khach hang</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f59e0b' }}>💰</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
            <span className={styles.statLabel}>Doanh thu thang</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#8b5cf6' }}>👨‍💼</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalStaff}</span>
            <span className={styles.statLabel}>Nhan vien</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thao tac nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Link key={action.id} to={action.link} className={styles.actionCard}>
              <div className={styles.actionIcon} style={{ background: action.color }}>{getIcon(action.icon)}</div>
              <div className={styles.actionContent}>
                <h3>{action.title}</h3>
                <p>{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Lich hen gan day</h2>
            <Link to="/booking-request-management" className={styles.viewAll}>Xem tat ca</Link>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Khach hang</th>
                  <th>Dich vu</th>
                  <th>Ngay</th>
                  <th>Trang thai</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.customer}</td>
                    <td>{booking.service}</td>
                    <td>{booking.date}</td>
                    <td><span className={`${styles.status} ${getStatusColor(booking.status)}`}>{booking.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Hieu qua nhan vien</h2>
            <Link to="/staff-list" className={styles.viewAll}>Xem tat ca</Link>
          </div>
          <div className={styles.staffList}>
            {staffPerformance.map((staff, index) => (
              <div key={index} className={styles.staffItem}>
                <div className={styles.staffAvatar}>{staff.name.charAt(0)}</div>
                <div className={styles.staffInfo}>
                  <h4>{staff.name}</h4>
                  <p>{staff.role}</p>
                </div>
                <div className={styles.staffStats}>
                  <span className={styles.taskCount}>{staff.tasks} cv</span>
                  <span className={styles.rating}>⭐ {staff.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.systemStatus}>
        <div className={styles.statusItem}>
          <span className={styles.statusDot} style={{ background: '#10b981' }}></span>
          <span>Server: Hoat dong</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusDot} style={{ background: '#10b981' }}></span>
          <span>Database: Ket noi</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusDot} style={{ background: '#10b981' }}></span>
          <span>API: Hoat dong</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
