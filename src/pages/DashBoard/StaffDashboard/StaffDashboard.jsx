import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import styles from './StaffDashboard.module.css';

const StaffDashboard = () => {
  useScrollToTop();
  const navigate = useNavigate();

  // Mock data KPIs
  const [kpis] = useState({
    todayBookings: 12,
    pendingBookings: 5,
    completedBookings: 156,
    totalCustomers: 89,
    revenue: 45000000,
    avgRating: 4.8,
  });

  // Mock data for charts
  const [chartData] = useState({
    monthlyBookings: [
      { month: 'T1', value: 120 },
      { month: 'T2', value: 145 },
      { month: 'T3', value: 132 },
    ],
    serviceDistribution: [
      { name: 'Thay lốp', value: 35, color: '#667eea' },
      { name: 'Bảo dưỡng', value: 28, color: '#48bb78' },
      { name: 'Sửa chữa', value: 20, color: '#ed8936' },
      { name: 'Kiểm tra', value: 17, color: '#4299e1' },
    ],
    weeklyRevenue: [
      { day: 'T2', value: 12000000 },
      { day: 'T3', value: 15000000 },
      { day: 'T4', value: 11000000 },
      { day: 'T5', value: 18000000 },
      { day: 'T6', value: 22000000 },
      { day: 'T7', value: 25000000 },
      { day: 'CN', value: 8000000 },
    ],
  });

  const [recentBookings] = useState([
    { id: 1, customerName: 'Nguyễn Văn A', service: 'Thay lốp xe', time: '09:00', status: 'confirmed', price: 1200000 },
    { id: 2, customerName: 'Trần Thị B', service: 'Bảo dưỡng định kỳ', time: '10:30', status: 'pending', price: 2500000 },
    { id: 3, customerName: 'Lê Văn C', service: 'Kiểm tra phanh', time: '14:00', status: 'confirmed', price: 800000 },
    { id: 4, customerName: 'Phạm Thị D', service: 'Thay dầu', time: '15:30', status: 'completed', price: 650000 },
    { id: 5, customerName: 'Hoàng Văn E', service: 'Cân xe', time: '16:00', status: 'confirmed', price: 200000 },
  ]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return { text: 'Đã xác nhận', className: styles.statusConfirmed };
      case 'pending':
        return { text: 'Chờ xác nhận', className: styles.statusPending };
      case 'completed':
        return { text: 'Hoàn thành', className: styles.statusCompleted };
      default:
        return { text: status, className: '' };
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  };

  const maxBookingValue = Math.max(...chartData.monthlyBookings.map(d => d.value));
  const maxRevenueValue = Math.max(...chartData.weeklyRevenue.map(d => d.value));

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Bảng điều khiển</h1>
          <p className={styles.subtitle}>Tổng quan hệ thống - Cập nhật thời gian thực</p>
        </div>
        <div className={styles.headerDate}>
          <span className={styles.dateIcon}>📅</span>
          <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>📅</span>
            <span className={styles.kpiTrend}>+12%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.todayBookings}</div>
          <div className={styles.kpiLabel}>Lịch hẹn hôm nay</div>
          <div className={styles.kpiProgress}>
            <div className={styles.kpiProgressBar} style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⏳</span>
            <span className={styles.kpiTrend}>+3</span>
          </div>
          <div className={styles.kpiValue}>{kpis.pendingBookings}</div>
          <div className={styles.kpiLabel}>Chờ xác nhận</div>
          <div className={styles.kpiSubtext}>Cần xử lý ngay</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>✓</span>
            <span className={styles.kpiTrend}>+8%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.completedBookings}</div>
          <div className={styles.kpiLabel}>Hoàn thành tháng</div>
          <div className={styles.kpiProgress}>
            <div className={styles.kpiProgressBar} style={{ width: '85%' }}></div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>👥</span>
            <span className={styles.kpiTrend}>+5</span>
          </div>
          <div className={styles.kpiValue}>{kpis.totalCustomers}</div>
          <div className={styles.kpiLabel}>Tổng khách hàng</div>
          <div className={styles.kpiSubtext}>Tháng này</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💰</span>
            <span className={styles.kpiTrend}>+15%</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.revenue)}</div>
          <div className={styles.kpiLabel}>Doanh thu tháng</div>
          <div className={styles.kpiProgress}>
            <div className={styles.kpiProgressBar} style={{ width: '70%' }}></div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiOrange}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⭐</span>
          </div>
          <div className={styles.kpiValue}>{kpis.avgRating}<span className={styles.kpiMax}>/5.0</span></div>
          <div className={styles.kpiLabel}>Đánh giá trung bình</div>
          <div className={styles.kpiStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={star <= Math.floor(kpis.avgRating) ? styles.starFilled : styles.starEmpty}>★</span>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Bar Chart - Monthly Bookings */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Lịch hẹn theo tháng</h3>
            <span className={styles.chartPeriod}>Quý I/2024</span>
          </div>
          <div className={styles.barChart}>
            {chartData.monthlyBookings.map((item, index) => (
              <div key={index} className={styles.barItem}>
                <div className={styles.barValue}>{item.value}</div>
                <div className={styles.barContainer}>
                  <div className={styles.bar} style={{ height: `${(item.value / maxBookingValue) * 100}%` }}></div>
                </div>
                <div className={styles.barLabel}>{item.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart - Service Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Phân bố dịch vụ</h3>
            <span className={styles.chartPeriod}>Tỷ lệ %</span>
          </div>
          <div className={styles.pieChartContainer}>
            <div className={styles.pieChart}>
              {chartData.serviceDistribution.map((item, index) => {
                const total = chartData.serviceDistribution.reduce((sum, d) => sum + d.value, 0);
                const percentage = (item.value / total) * 100;
                let cumulativePercent = 0;
                chartData.serviceDistribution.slice(0, index).forEach(d => {
                  cumulativePercent += (d.value / total) * 100;
                });
                return (
                  <div key={index} className={styles.pieSlice} style={{
                    background: `conic-gradient(${item.color} ${cumulativePercent}% ${cumulativePercent + percentage}%),
                      #f0f0f0 ${cumulativePercent + percentage}% 100%)`,
                  }}></div>
                );
              })}
              <div className={styles.pieCenter}>
                <span className={styles.pieCenterValue}>{chartData.serviceDistribution.reduce((s, d) => s + d.value, 0)}</span>
                <span className={styles.pieCenterLabel}>Tổng</span>
              </div>
            </div>
            <div className={styles.pieLegend}>
              {chartData.serviceDistribution.map((item, index) => (
                <div key={index} className={styles.pieLegendItem}>
                  <span className={styles.pieLegendDot} style={{ background: item.color }}></span>
                  <span className={styles.pieLegendName}>{item.name}</span>
                  <span className={styles.pieLegendValue}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line Chart - Weekly Revenue */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Doanh thu tuần</h3>
            <span className={styles.chartPeriod}>Tuần này</span>
          </div>
          <div className={styles.lineChart}>
            <div className={styles.lineChartYAxis}>
              <span>25M</span>
              <span>20M</span>
              <span>15M</span>
              <span>10M</span>
              <span>5M</span>
              <span>0</span>
            </div>
            <div className={styles.lineChartContent}>
              <svg className={styles.lineSvg} viewBox="0 0 400 150">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#667eea', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path className={styles.lineArea} d={`M0,${150 - (chartData.weeklyRevenue[0].value / maxRevenueValue) * 130} ${chartData.weeklyRevenue.map((d, i) => `L${(i + 1) * (400 / 7)},${150 - (d.value / maxRevenueValue) * 130}`).join(' ')} L${400},150 L0,150 Z`} fill="url(#lineGradient)" />
                <path className={styles.linePath} d={`M0,${150 - (chartData.weeklyRevenue[0].value / maxRevenueValue) * 130} ${chartData.weeklyRevenue.map((d, i) => `L${(i + 1) * (400 / 7)},${150 - (d.value / maxRevenueValue) * 130}`).join(' ')}`} fill="none" stroke="#667eea" strokeWidth="3" />
                {chartData.weeklyRevenue.map((d, i) => (
                  <circle key={i} cx={(i + 1) * (400 / 7)} cy={150 - (d.value / maxRevenueValue) * 130} r="5" fill="#667eea" />
                ))}
              </svg>
              <div className={styles.lineChartXAxis}>
                {chartData.weeklyRevenue.map((d, i) => (
                  <span key={i}>{d.day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Lịch hẹn gần đây</h2>
          <button className={styles.viewAllBtn} onClick={() => navigate('/booking-management')}>
            Xem tất cả →
          </button>
        </div>
        <div className={styles.recentBookings}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Khách hàng</th>
                <th>Dịch vụ</th>
                <th>Giờ</th>
                <th>Giá tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking, index) => (
                <tr key={booking.id}>
                  <td className={styles.sttCell}>{index + 1}</td>
                  <td className={styles.customerCell}>
                    <div className={styles.customerAvatar}>{booking.customerName.charAt(0)}</div>
                    {booking.customerName}
                  </td>
                  <td>{booking.service}</td>
                  <td>{booking.time}</td>
                  <td className={styles.priceCell}>{formatCurrency(booking.price)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadge(booking.status).className}`}>
                      {getStatusBadge(booking.status).text}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Truy cập nhanh</h2>
        <div className={styles.quickActions}>
          <div className={styles.actionCard} onClick={() => navigate('/booking-request-management')}>
            <div className={styles.actionIcon}>📋</div>
            <div className={styles.actionContent}>
              <h3>Yêu cầu đặt lịch</h3>
              <p>Quản lý yêu cầu đặt lịch từ khách hàng</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/booking-management')}>
            <div className={styles.actionIcon}>📆</div>
            <div className={styles.actionContent}>
              <h3>Lịch hẹn</h3>
              <p>Xem và quản lý lịch hẹn đã xác nhận</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/check-in')}>
            <div className={styles.actionIcon}>✅</div>
            <div className={styles.actionContent}>
              <h3>Check-in</h3>
              <p>Check-in khách hàng khi đến</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/staff-attendance')}>
            <div className={styles.actionIcon}>🕐</div>
            <div className={styles.actionContent}>
              <h3>Chấm công</h3>
              <p>Theo dõi giờ làm việc hàng ngày</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/customer-manager')}>
            <div className={styles.actionIcon}>👤</div>
            <div className={styles.actionContent}>
              <h3>Khách hàng</h3>
              <p>Quản lý thông tin khách hàng</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/daily-schedule')}>
            <div className={styles.actionIcon}>📅</div>
            <div className={styles.actionContent}>
              <h3>Lịch làm việc</h3>
              <p>Xem lịch làm việc cá nhân</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
