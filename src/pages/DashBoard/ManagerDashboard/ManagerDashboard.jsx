import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './ManagerDashboard.module.css';

const ManagerDashboard = () => {
  const [dateRange, setDateRange] = useState('week');
  
  const kpis = {
    totalStaff: 24,
    activeBookings: 45,
    completionRate: 92,
    customerSatisfaction: 4.7,
    staffGrowth: 4.3,
    bookingGrowth: 12.5,
    completionChange: 3.2,
    satisfactionChange: 0.3
  };

  const dailyPerformance = [
    { day: 'T2', bookings: 18, completed: 16, revenue: 15000000 },
    { day: 'T3', bookings: 22, completed: 20, revenue: 18000000 },
    { day: 'T4', bookings: 25, completed: 23, revenue: 22000000 },
    { day: 'T5', bookings: 20, completed: 19, revenue: 19000000 },
    { day: 'T6', bookings: 28, completed: 26, revenue: 25000000 },
    { day: 'T7', bookings: 30, completed: 28, revenue: 26000000 },
    { day: 'CN', bookings: 23, completed: 21, revenue: 20000000 }
  ];

  const staffUtilization = [
    { name: 'Kỹ thuật viên', utilized: 85, available: 15 },
    { name: 'Tư vấn viên', utilized: 78, available: 22 },
    { name: 'Lễ tân', utilized: 92, available: 8 },
    { name: 'Kế toán', utilized: 70, available: 30 }
  ];

  const pendingApprovals = [
    { id: 1, type: 'Booking', customer: 'Nguyễn Văn A', service: 'Bảo dưỡng định kỳ', time: '10 phút trước', priority: 'high' },
    { id: 2, type: 'Nghỉ phép', staff: 'Trần Văn B', date: '15/03/2024', time: '30 phút trước', priority: 'medium' },
    { id: 3, type: 'Mua phụ tùng', item: 'Dầu nhớt Mobil 1', quantity: '20 lít', time: '1 giờ trước', priority: 'high' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📊 Dashboard Quản lý</h1>
          <p className={styles.subtitle}>Giám sát vận hành và hiệu suất</p>
        </div>
        <div className={styles.filters}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filterSelect}>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
          </select>
          <button className={styles.exportBtn}>📊 Xuất báo cáo</button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>👥</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.staffGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.totalStaff}</div>
          <div className={styles.kpiLabel}>Tổng nhân viên</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>📅</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.bookingGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.activeBookings}</div>
          <div className={styles.kpiLabel}>Booking đang xử lý</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>✅</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.completionChange}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.completionRate}%</div>
          <div className={styles.kpiLabel}>Tỷ lệ hoàn thành</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⭐</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.satisfactionChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.customerSatisfaction}</div>
          <div className={styles.kpiLabel}>Hài lòng KH</div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📈 Hiệu suất theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="bookings" stackId="1" stroke="#2563eb" fill="#2563eb" name="Booking" />
              <Area type="monotone" dataKey="completed" stackId="2" stroke="#10b981" fill="#10b981" name="Hoàn thành" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>👨‍💼 Tỷ lệ sử dụng nhân viên</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={staffUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilized" fill="#2563eb" name="Đang làm việc" />
              <Bar dataKey="available" fill="#e5e7eb" name="Rảnh" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>⏳ Chờ phê duyệt ({pendingApprovals.length})</h3>
          <div className={styles.approvalList}>
            {pendingApprovals.map(item => (
              <div key={item.id} className={`${styles.approvalItem} ${styles[item.priority]}`}>
                <div className={styles.approvalHeader}>
                  <span className={styles.approvalType}>{item.type}</span>
                  <span className={styles.approvalTime}>{item.time}</span>
                </div>
                <div className={styles.approvalContent}>
                  {item.customer && <div><strong>Khách hàng:</strong> {item.customer}</div>}
                  {item.staff && <div><strong>Nhân viên:</strong> {item.staff}</div>}
                  {item.service && <div><strong>Dịch vụ:</strong> {item.service}</div>}
                  {item.item && <div><strong>Phụ tùng:</strong> {item.item} - {item.quantity}</div>}
                  {item.date && <div><strong>Ngày:</strong> {item.date}</div>}
                </div>
                <div className={styles.approvalActions}>
                  <button className={styles.approveBtn}>✓ Duyệt</button>
                  <button className={styles.rejectBtn}>✗ Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📋 Lịch làm việc hôm nay</h3>
          <div className={styles.scheduleList}>
            <div className={styles.scheduleItem}>
              <div className={styles.scheduleTime}>08:00 - 09:00</div>
              <div className={styles.scheduleContent}>
                <div className={styles.scheduleTitle}>Họp team buổi sáng</div>
                <div className={styles.scheduleDesc}>Tất cả nhân viên</div>
              </div>
            </div>
            <div className={styles.scheduleItem}>
              <div className={styles.scheduleTime}>10:00 - 11:00</div>
              <div className={styles.scheduleContent}>
                <div className={styles.scheduleTitle}>Kiểm tra kho phụ tùng</div>
                <div className={styles.scheduleDesc}>Với kế toán</div>
              </div>
            </div>
            <div className={styles.scheduleItem}>
              <div className={styles.scheduleTime}>14:00 - 15:00</div>
              <div className={styles.scheduleContent}>
                <div className={styles.scheduleTitle}>Đánh giá hiệu suất</div>
                <div className={styles.scheduleDesc}>Kỹ thuật viên A, B</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
