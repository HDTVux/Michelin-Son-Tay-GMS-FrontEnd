import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../../components/Dashboard/StatCard';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats] = useState({
    revenue: '125,500,000',
    bookings: 156,
    customers: 1234,
    staff: 45
  });

  const [recentActivities] = useState([
    { id: 1, type: 'booking', message: 'Booking mới từ Nguyễn Văn A', time: '5 phút trước', icon: '📅' },
    { id: 2, type: 'staff', message: 'Nhân viên Trần Thị B đã check-in', time: '10 phút trước', icon: '👤' },
    { id: 3, type: 'payment', message: 'Thanh toán 2,500,000đ hoàn tất', time: '15 phút trước', icon: '💰' },
    { id: 4, type: 'customer', message: 'Khách hàng mới đăng ký', time: '20 phút trước', icon: '✨' }
  ]);

  const [alerts] = useState([
    { id: 1, type: 'warning', message: 'Có 5 booking chờ xác nhận', action: 'Xem ngay' },
    { id: 2, type: 'info', message: 'Báo cáo tháng đã sẵn sàng', action: 'Tải xuống' },
    { id: 3, type: 'error', message: '2 nhân viên chưa chấm công', action: 'Kiểm tra' }
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Quản trị viên</h1>
          <p className={styles.subtitle}>Tổng quan hệ thống</p>
        </div>
        <button className={styles.exportBtn}>
          📊 Xuất báo cáo
        </button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Doanh thu tháng này"
          value={`${stats.revenue}đ`}
          icon="💰"
          color="red"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Tổng booking"
          value={stats.bookings}
          icon="📅"
          color="blue"
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          title="Khách hàng"
          value={stats.customers}
          icon="👥"
          color="purple"
          trend="up"
          trendValue="+15%"
        />
        <StatCard
          title="Nhân viên"
          value={stats.staff}
          icon="👤"
          color="green"
        />
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📈 Doanh thu theo tháng</h2>
            <select className={styles.select}>
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.barChart}>
              {[65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88, 92].map((height, i) => (
                <div key={i} className={styles.bar}>
                  <div className={styles.barFill} style={{ height: `${height}%` }}>
                    <span className={styles.barValue}>{height}M</span>
                  </div>
                  <span className={styles.barLabel}>T{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🔔 Hoạt động gần đây</h2>
            <div className={styles.activityList}>
              {recentActivities.map(activity => (
                <div key={activity.id} className={styles.activityItem}>
                  <span className={styles.activityIcon}>{activity.icon}</span>
                  <div className={styles.activityContent}>
                    <p className={styles.activityMessage}>{activity.message}</p>
                    <span className={styles.activityTime}>{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>⚠️ Cảnh báo hệ thống</h2>
            <div className={styles.alertList}>
              {alerts.map(alert => (
                <div key={alert.id} className={`${styles.alertItem} ${styles[alert.type]}`}>
                  <p className={styles.alertMessage}>{alert.message}</p>
                  <button className={styles.alertAction}>{alert.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>⚡ Thao tác nhanh</h2>
        <div className={styles.actionGrid}>
          <button className={styles.actionCard} onClick={() => navigate('/customer-manager')}>
            <span className={styles.actionIcon}>👥</span>
            <span className={styles.actionLabel}>Quản lý khách hàng</span>
          </button>
          <button className={styles.actionCard} onClick={() => navigate('/staff-management')}>
            <span className={styles.actionIcon}>👤</span>
            <span className={styles.actionLabel}>Quản lý nhân viên</span>
          </button>
          <button className={styles.actionCard} onClick={() => navigate('/booking-management')}>
            <span className={styles.actionIcon}>📅</span>
            <span className={styles.actionLabel}>Quản lý booking</span>
          </button>
          <button className={styles.actionCard}>
            <span className={styles.actionIcon}>⚙️</span>
            <span className={styles.actionLabel}>Cấu hình hệ thống</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
