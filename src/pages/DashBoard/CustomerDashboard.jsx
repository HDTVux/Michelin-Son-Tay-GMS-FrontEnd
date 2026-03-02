import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './CustomerDashboard.module.css';

const CustomerDashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    loyaltyPoints: 0
  });
  
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Call API to fetch dashboard data
      // const token = localStorage.getItem('customerToken');
      // const response = await fetchCustomerDashboard(token);
      
      // Mock data
      setStats({
        totalBookings: 15,
        pendingBookings: 2,
        completedBookings: 13,
        totalSpent: 8500000,
        loyaltyPoints: 850
      });
      
      setRecentBookings([
        {
          id: 'BK001',
          serviceName: 'Bảo dưỡng định kỳ',
          date: '2024-03-15',
          time: '09:00',
          status: 'CONFIRMED',
          amount: 500000
        },
        {
          id: 'BK002',
          serviceName: 'Thay lốp xe',
          date: '2024-03-10',
          time: '14:00',
          status: 'COMPLETED',
          amount: 1200000
        },
        {
          id: 'BK003',
          serviceName: 'Kiểm tra tổng quát',
          date: '2024-03-05',
          time: '10:30',
          status: 'COMPLETED',
          amount: 300000
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { id: 1, icon: '📅', title: 'Đặt lịch mới', description: 'Đặt lịch bảo dưỡng xe', link: '/booking', color: '#667eea' },
    { id: 2, icon: '📋', title: 'Lịch hẹn của tôi', description: 'Xem các lịch hẹn đã đặt', link: '/my-bookings', color: '#48bb78' },
    { id: 3, icon: '👤', title: 'Thông tin cá nhân', description: 'Cập nhật thông tin', link: '/user-profile', color: '#ed8936' },
    { id: 4, icon: '🎁', title: 'Ưu đãi', description: 'Xem ưu đãi dành cho bạn', link: '/promotions', color: '#9f7aea' }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { label: 'Chờ xác nhận', className: styles.statusPending },
      'CONFIRMED': { label: 'Đã xác nhận', className: styles.statusConfirmed },
      'COMPLETED': { label: 'Hoàn thành', className: styles.statusCompleted },
      'CANCELLED': { label: 'Đã hủy', className: styles.statusCancelled }
    };
    
    const config = statusConfig[status] || statusConfig['PENDING'];
    return <span className={`${styles.statusBadge} ${config.className}`}>{config.label}</span>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Chào mừng bạn quay trở lại!</p>
        </div>
        <Link to="/" className={styles.homeButton}>
          🏠 Trang chủ
        </Link>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Tổng số booking</div>
            <div className={styles.statValue}>{stats.totalBookings}</div>
          </div>
        </div>
        
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Đang chờ</div>
            <div className={styles.statValue}>{stats.pendingBookings}</div>
          </div>
        </div>
        
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Hoàn thành</div>
            <div className={styles.statValue}>{stats.completedBookings}</div>
          </div>
        </div>
        
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Tổng chi tiêu</div>
            <div className={styles.statValue}>{formatCurrency(stats.totalSpent)}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map(action => (
            <Link key={action.id} to={action.link} className={styles.actionCard}>
              <div className={styles.actionIcon} style={{ background: action.color }}>
                {action.icon}
              </div>
              <h3 className={styles.actionTitle}>{action.title}</h3>
              <p className={styles.actionDesc}>{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Lịch hẹn gần đây</h2>
          <Link to="/my-bookings" className={styles.viewAllLink}>
            Xem tất cả →
          </Link>
        </div>
        
        <div className={styles.bookingsTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã booking</th>
                <th>Dịch vụ</th>
                <th>Ngày hẹn</th>
                <th>Giờ</th>
                <th>Trạng thái</th>
                <th>Số tiền</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(booking => (
                <tr key={booking.id}>
                  <td className={styles.bookingId}>{booking.id}</td>
                  <td>{booking.serviceName}</td>
                  <td>{formatDate(booking.date)}</td>
                  <td>{booking.time}</td>
                  <td>{getStatusBadge(booking.status)}</td>
                  <td className={styles.amount}>{formatCurrency(booking.amount)}</td>
                  <td>
                    <Link to={`/booking-detail/${booking.id}`} className={styles.viewButton}>
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
