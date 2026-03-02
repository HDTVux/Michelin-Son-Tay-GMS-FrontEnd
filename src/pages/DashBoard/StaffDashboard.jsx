import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './StaffDashboard.module.css';

const StaffDashboard = () => {
  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingRequests: 0,
    completedToday: 0,
    totalRevenue: 0
  });
  
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Call API to fetch staff dashboard data
      // const token = localStorage.getItem('staffToken');
      // const response = await fetchStaffDashboard(token);
      
      // Mock data
      setStats({
        todayBookings: 12,
        pendingRequests: 5,
        completedToday: 7,
        totalRevenue: 15000000
      });
      
      setTodaySchedule([
        {
          id: 'BK001',
          time: '09:00',
          customerName: 'Nguyễn Văn A',
          service: 'Bảo dưỡng định kỳ',
          status: 'CONFIRMED'
        },
        {
          id: 'BK002',
          time: '10:30',
          customerName: 'Trần Thị B',
          service: 'Thay lốp xe',
          status: 'IN_PROGRESS'
        },
        {
          id: 'BK003',
          time: '14:00',
          customerName: 'Lê Văn C',
          service: 'Kiểm tra tổng quát',
          status: 'CONFIRMED'
        }
      ]);
      
      setPendingRequests([
        {
          id: 'REQ001',
          customerName: 'Phạm Thị D',
          phone: '0912345678',
          service: 'Sửa chữa động cơ',
          requestDate: '2024-03-15'
        },
        {
          id: 'REQ002',
          customerName: 'Hoàng Văn E',
          phone: '0923456789',
          service: 'Bảo dưỡng định kỳ',
          requestDate: '2024-03-15'
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { id: 1, icon: '📋', title: 'Yêu cầu booking', description: 'Xử lý yêu cầu mới', link: '/booking-request-management', color: '#f093fb' },
    { id: 2, icon: '✅', title: 'Booking đã duyệt', description: 'Quản lý booking', link: '/booking-management', color: '#4facfe' },
    { id: 3, icon: '📅', title: 'Lịch hôm nay', description: 'Xem lịch làm việc', link: '/daily-schedule', color: '#43e97b' },
    { id: 4, icon: '👥', title: 'Khách hàng', description: 'Quản lý khách hàng', link: '/customer-profile', color: '#fa709a' },
    { id: 5, icon: '⏰', title: 'Chấm công', description: 'Xem lịch sử chấm công', link: '/staff-attendance', color: '#667eea' },
    { id: 6, icon: '👤', title: 'Hồ sơ', description: 'Thông tin cá nhân', link: '/staff-profile', color: '#ed8936' }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'CONFIRMED': { label: 'Đã xác nhận', className: styles.statusConfirmed },
      'IN_PROGRESS': { label: 'Đang thực hiện', className: styles.statusInProgress },
      'COMPLETED': { label: 'Hoàn thành', className: styles.statusCompleted }
    };
    
    const config = statusConfig[status] || statusConfig['CONFIRMED'];
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
          <h1 className={styles.title}>Dashboard Nhân Viên</h1>
          <p className={styles.subtitle}>Tổng quan công việc hôm nay</p>
        </div>
        <div className={styles.dateTime}>
          <div className={styles.date}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Booking hôm nay</div>
            <div className={styles.statValue}>{stats.todayBookings}</div>
          </div>
        </div>
        
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Yêu cầu chờ duyệt</div>
            <div className={styles.statValue}>{stats.pendingRequests}</div>
          </div>
        </div>
        
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Hoàn thành hôm nay</div>
            <div className={styles.statValue}>{stats.completedToday}</div>
          </div>
        </div>
        
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Doanh thu hôm nay</div>
            <div className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</div>
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

      <div className={styles.contentGrid}>
        {/* Today's Schedule */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Lịch làm việc hôm nay</h2>
            <Link to="/daily-schedule" className={styles.viewAllLink}>
              Xem chi tiết →
            </Link>
          </div>
          
          <div className={styles.scheduleList}>
            {todaySchedule.map(item => (
              <div key={item.id} className={styles.scheduleItem}>
                <div className={styles.scheduleTime}>{item.time}</div>
                <div className={styles.scheduleContent}>
                  <div className={styles.scheduleHeader}>
                    <span className={styles.bookingId}>{item.id}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className={styles.customerName}>{item.customerName}</div>
                  <div className={styles.serviceName}>{item.service}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Requests */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Yêu cầu chờ xử lý</h2>
            <Link to="/booking-request-management" className={styles.viewAllLink}>
              Xem tất cả →
            </Link>
          </div>
          
          <div className={styles.requestsList}>
            {pendingRequests.map(request => (
              <div key={request.id} className={styles.requestItem}>
                <div className={styles.requestHeader}>
                  <span className={styles.requestId}>{request.id}</span>
                  <span className={styles.requestDate}>{formatDate(request.requestDate)}</span>
                </div>
                <div className={styles.requestCustomer}>{request.customerName}</div>
                <div className={styles.requestPhone}>{request.phone}</div>
                <div className={styles.requestService}>{request.service}</div>
                <Link to={`/booking-request-management/${request.id}`} className={styles.processButton}>
                  Xử lý
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
