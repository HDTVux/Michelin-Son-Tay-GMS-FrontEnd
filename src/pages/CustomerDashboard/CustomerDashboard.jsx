import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CustomerDashboard.module.css';

const CustomerDashboard = () => {
  const navigate = useNavigate();

  // Mock data KPIs
  const [kpis] = useState({
    totalBookings: 12,
    completedBookings: 9,
    pendingBookings: 3,
    totalSpent: 25000000,
    avgRating: 4.9,
    loyaltyPoints: 2500,
  });

  // Mock data for charts
  const [chartData] = useState({
    monthlyVisits: [
      { month: 'T10', value: 1 },
      { month: 'T11', value: 2 },
      { month: 'T12', value: 3 },
      { month: 'T1', value: 2 },
      { month: 'T2', value: 2 },
      { month: 'T3', value: 2 },
    ],
    serviceUsage: [
      { name: 'Thay lốp', value: 40, color: '#48bb78' },
      { name: 'Bảo dưỡng', value: 35, color: '#667eea' },
      { name: 'Sửa chữa', value: 15, color: '#ed8936' },
      { name: 'Khác', value: 10, color: '#4299e1' },
    ],
    spendingHistory: [
      { month: 'T10', value: 2000000 },
      { month: 'T11', value: 3500000 },
      { month: 'T12', value: 5000000 },
      { month: 'T1', value: 3000000 },
      { month: 'T2', value: 4500000 },
      { month: 'T3', value: 7000000 },
    ],
  });

  const [recentBookings] = useState([
    { id: 1, service: 'Thay lốp xe', date: '2024-03-15', time: '09:00', status: 'completed', price: 1200000 },
    { id: 2, service: 'Bảo dưỡng định kỳ', date: '2024-03-20', time: '10:30', status: 'pending', price: 2500000 },
    { id: 3, service: 'Kiểm tra phanh', date: '2024-03-10', time: '14:00', status: 'completed', price: 800000 },
    { id: 4, service: 'Thay dầu', date: '2024-02-28', time: '15:30', status: 'completed', price: 650000 },
    { id: 5, service: 'Cân xe', date: '2024-02-15', time: '11:00', status: 'completed', price: 200000 },
  ]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { text: 'Hoàn thành', className: styles.statusCompleted };
      case 'pending':
        return { text: 'Chờ xác nhận', className: styles.statusPending };
      case 'confirmed':
        return { text: 'Đã xác nhận', className: styles.statusConfirmed };
      case 'cancelled':
        return { text: 'Đã hủy', className: styles.statusCancelled };
      default:
        return { text: status, className: '' };
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  };

  const maxVisitValue = Math.max(...chartData.monthlyVisits.map(d => d.value));
  const maxSpendingValue = Math.max(...chartData.spendingHistory.map(d => d.value));

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Bảng điều khiển</h1>
          <p className={styles.subtitle}>Tổng quan hoạt động của bạn</p>
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
          </div>
          <div className={styles.kpiValue}>{kpis.totalBookings}</div>
          <div className={styles.kpiLabel}>Tổng lịch hẹn</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>✓</span>
          </div>
          <div className={styles.kpiValue}>{kpis.completedBookings}</div>
          <div className={styles.kpiLabel}>Hoàn thành</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⏳</span>
          </div>
          <div className={styles.kpiValue}>{kpis.pendingBookings}</div>
          <div className={styles.kpiLabel}>Chờ xác nhận</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💰</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.totalSpent)}</div>
          <div className={styles.kpiLabel}>Tổng chi tiêu</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiOrange}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⭐</span>
          </div>
          <div className={styles.kpiValue}>{kpis.avgRating}<span className={styles.kpiMax}>/5</span></div>
          <div className={styles.kpiLabel}>Đánh giá</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>🎁</span>
          </div>
          <div className={styles.kpiValue}>{kpis.loyaltyPoints.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Điểm tích lũy</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Bar Chart - Monthly Visits */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Lượt đến theo tháng</h3>
            <span className={styles.chartPeriod}>6 tháng gần nhất</span>
          </div>
          <div className={styles.barChart}>
            {chartData.monthlyVisits.map((item, index) => (
              <div key={index} className={styles.barItem}>
                <div className={styles.barValue}>{item.value}</div>
                <div className={styles.barContainer}>
                  <div className={styles.bar} style={{ height: `${(item.value / maxVisitValue) * 100}%` }}></div>
                </div>
                <div className={styles.barLabel}>{item.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart - Service Usage */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Tỷ lệ sử dụng dịch vụ</h3>
            <span className={styles.chartPeriod}>Theo năm</span>
          </div>
          <div className={styles.pieChartContainer}>
            <div className={styles.pieChart}>
              {chartData.serviceUsage.map((item, index) => {
                const total = chartData.serviceUsage.reduce((sum, d) => sum + d.value, 0);
                const percentage = (item.value / total) * 100;
                let cumulativePercent = 0;
                chartData.serviceUsage.slice(0, index).forEach(d => {
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
                <span className={styles.pieCenterValue}>100%</span>
                <span className={styles.pieCenterLabel}>Tổng</span>
              </div>
            </div>
            <div className={styles.pieLegend}>
              {chartData.serviceUsage.map((item, index) => (
                <div key={index} className={styles.pieLegendItem}>
                  <span className={styles.pieLegendDot} style={{ background: item.color }}></span>
                  <span className={styles.pieLegendName}>{item.name}</span>
                  <span className={styles.pieLegendValue}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line Chart - Spending History */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Lịch sử chi tiêu</h3>
            <span className={styles.chartPeriod}>6 tháng gần nhất</span>
          </div>
          <div className={styles.lineChart}>
            <div className={styles.lineChartYAxis}>
              <span>7M</span>
              <span>5M</span>
              <span>3M</span>
              <span>1M</span>
              <span>0</span>
            </div>
            <div className={styles.lineChartContent}>
              <svg className={styles.lineSvg} viewBox="0 0 300 120">
                <defs>
                  <linearGradient id="customerLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#48bb78', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#48bb78', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path className={styles.lineArea} d={`M0,${120 - (chartData.spendingHistory[0].value / maxSpendingValue) * 100} ${chartData.spendingHistory.map((d, i) => `L${(i + 1) * (300 / 6)},${120 - (d.value / maxSpendingValue) * 100}`).join(' ')} L${300},120 L0,120 Z`} fill="url(#customerLineGradient)" />
                <path className={styles.linePath} d={`M0,${120 - (chartData.spendingHistory[0].value / maxSpendingValue) * 100} ${chartData.spendingHistory.map((d, i) => `L${(i + 1) * (300 / 6)},${120 - (d.value / maxSpendingValue) * 100}`).join(' ')}`} fill="none" stroke="#48bb78" strokeWidth="3" />
                {chartData.spendingHistory.map((d, i) => (
                  <circle key={i} cx={(i + 1) * (300 / 6)} cy={120 - (d.value / maxSpendingValue) * 100} r="4" fill="#48bb78" />
                ))}
              </svg>
              <div className={styles.lineChartXAxis}>
                {chartData.spendingHistory.map((d, i) => (
                  <span key={i}>{d.month}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Lịch sử đặt lịch</h2>
          <button className={styles.viewAllBtn} onClick={() => navigate('/my-bookings')}>
            Xem tất cả →
          </button>
        </div>
        <div className={styles.recentBookings}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Dịch vụ</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Giá tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking, index) => (
                <tr key={booking.id} onClick={() => navigate(`/booking-detail/${booking.id}`)}>
                  <td className={styles.sttCell}>{index + 1}</td>
                  <td>{booking.service}</td>
                  <td>{new Date(booking.date).toLocaleDateString('vi-VN')}</td>
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
          <div className={styles.actionCard} onClick={() => navigate('/booking')}>
            <div className={styles.actionIcon}>📅</div>
            <div className={styles.actionContent}>
              <h3>Đặt lịch ngay</h3>
              <p>Đặt lịch dịch vụ bảo dưỡng xe</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/my-bookings')}>
            <div className={styles.actionIcon}>📋</div>
            <div className={styles.actionContent}>
              <h3>Lịch hẹn của tôi</h3>
              <p>Xem lịch sử đặt lịch</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/user-profile')}>
            <div className={styles.actionIcon}>👤</div>
            <div className={styles.actionContent}>
              <h3>Tài khoản</h3>
              <p>Quản lý thông tin cá nhân</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/services')}>
            <div className={styles.actionIcon}>🔧</div>
            <div className={styles.actionContent}>
              <h3>Dịch vụ</h3>
              <p>Xem các dịch vụ của Michelin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
