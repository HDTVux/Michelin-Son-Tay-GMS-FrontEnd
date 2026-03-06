import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const [dateRange, setDateRange] = useState('week');
  
  // KPIs
  const kpis = {
    totalRevenue: 125000000,
    totalBookings: 156,
    totalCustomers: 89,
    avgRating: 4.8,
    revenueGrowth: 12.5,
    bookingGrowth: 8.3,
    customerGrowth: 15.2,
    ratingChange: 0.2
  };

  // Revenue trend data
  const revenueData = [
    { name: 'T2', revenue: 15000000, bookings: 18 },
    { name: 'T3', revenue: 18000000, bookings: 22 },
    { name: 'T4', revenue: 22000000, bookings: 25 },
    { name: 'T5', revenue: 19000000, bookings: 20 },
    { name: 'T6', revenue: 25000000, bookings: 28 },
    { name: 'T7', revenue: 26000000, bookings: 30 },
    { name: 'CN', revenue: 20000000, bookings: 23 }
  ];

  // Service distribution
  const serviceData = [
    { name: 'Bảo dưỡng', value: 45, color: '#3b82f6' },
    { name: 'Sửa chữa', value: 30, color: '#ef4444' },
    { name: 'Thay thế', value: 15, color: '#f59e0b' },
    { name: 'Kiểm tra', value: 10, color: '#10b981' }
  ];

  // Staff performance
  const staffData = [
    { name: 'Kỹ thuật viên', completed: 85, pending: 15 },
    { name: 'Tư vấn viên', completed: 92, pending: 8 },
    { name: 'Lễ tân', completed: 98, pending: 2 },
    { name: 'Kế toán', completed: 88, pending: 12 }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎯 Dashboard Quản trị</h1>
          <p className={styles.subtitle}>Tổng quan hệ thống và hiệu suất kinh doanh</p>
        </div>
        <div className={styles.filters}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filterSelect}>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm nay</option>
          </select>
          <button className={styles.exportBtn}>📊 Xuất báo cáo</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💰</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.revenueGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.totalRevenue)}</div>
          <div className={styles.kpiLabel}>Doanh thu</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>📅</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.bookingGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.totalBookings}</div>
          <div className={styles.kpiLabel}>Tổng booking</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>👥</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.customerGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.totalCustomers}</div>
          <div className={styles.kpiLabel}>Khách hàng</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⭐</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.ratingChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.avgRating}</div>
          <div className={styles.kpiLabel}>Đánh giá TB</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📈 Xu hướng doanh thu & Booking</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Doanh thu' : 'Booking']} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} name="Doanh thu" />
              <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={2} name="Booking" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>🔧 Phân bố dịch vụ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={serviceData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                {serviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>👨‍💼 Hiệu suất nhân viên</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={staffData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" name="Hoàn thành" />
              <Bar dataKey="pending" fill="#f59e0b" name="Đang xử lý" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>🚨 Cảnh báo & Thông báo</h3>
          <div className={styles.alertList}>
            <div className={`${styles.alertItem} ${styles.warning}`}>
              <span className={styles.alertIcon}>⚠️</span>
              <div className={styles.alertContent}>
                <div className={styles.alertTitle}>Phụ tùng sắp hết</div>
                <div className={styles.alertText}>Dầu nhớt Mobil 1 còn 5 lít</div>
              </div>
              <span className={styles.alertTime}>10 phút trước</span>
            </div>
            <div className={`${styles.alertItem} ${styles.info}`}>
              <span className={styles.alertIcon}>ℹ️</span>
              <div className={styles.alertContent}>
                <div className={styles.alertTitle}>Booking mới</div>
                <div className={styles.alertText}>3 booking chờ xác nhận</div>
              </div>
              <span className={styles.alertTime}>30 phút trước</span>
            </div>
            <div className={`${styles.alertItem} ${styles.success}`}>
              <span className={styles.alertIcon}>✅</span>
              <div className={styles.alertContent}>
                <div className={styles.alertTitle}>Hoàn thành xuất sắc</div>
                <div className={styles.alertText}>Kỹ thuật viên A hoàn thành 10 công việc</div>
              </div>
              <span className={styles.alertTime}>1 giờ trước</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
