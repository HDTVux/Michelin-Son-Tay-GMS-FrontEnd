import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './ReceptionistDashboard.module.css';

const ReceptionistDashboard = () => {
  const [dateRange, setDateRange] = useState('today');
  
  const kpis = {
    checkIns: 12,
    pendingBookings: 8,
    completedToday: 15,
    avgWaitTime: 12,
    checkInChange: 3,
    pendingChange: -2,
    completedChange: 5,
    waitTimeChange: -3
  };

  const bookingStatus = [
    { name: 'Đã check-in', value: 12, color: '#10b981' },
    { name: 'Chờ xác nhận', value: 8, color: '#f59e0b' },
    { name: 'Đã xác nhận', value: 15, color: '#3b82f6' },
    { name: 'Đã hủy', value: 3, color: '#ef4444' }
  ];

  const hourlyCheckIns = [
    { hour: '8h', count: 2 },
    { hour: '9h', count: 4 },
    { hour: '10h', count: 3 },
    { hour: '11h', count: 5 },
    { hour: '13h', count: 3 },
    { hour: '14h', count: 6 },
    { hour: '15h', count: 4 },
    { hour: '16h', count: 2 }
  ];

  const todaySchedule = [
    { id: 1, time: '09:00', customer: 'Nguyễn Văn A', vehicle: '29A-12345', service: 'Bảo dưỡng', status: 'checked-in', phone: '0901234567' },
    { id: 2, time: '10:00', customer: 'Trần Thị B', vehicle: '30B-67890', service: 'Sửa phanh', status: 'confirmed', phone: '0912345678' },
    { id: 3, time: '11:00', customer: 'Lê Văn C', vehicle: '31C-11111', service: 'Thay nhớt', status: 'pending', phone: '0923456789' },
    { id: 4, time: '14:00', customer: 'Phạm Thị D', vehicle: '32D-22222', service: 'Kiểm tra', status: 'confirmed', phone: '0934567890' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📋 Dashboard Lễ tân</h1>
          <p className={styles.subtitle}>Quản lý tiếp nhận và lịch hẹn</p>
        </div>
        <div className={styles.filters}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filterSelect}>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
          </select>
          <button className={styles.newBookingBtn}>➕ Booking mới</button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>✅</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.checkInChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.checkIns}</div>
          <div className={styles.kpiLabel}>Đã check-in</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⏳</span>
            <span className={`${styles.kpiTrend} ${styles.down}`}>↓ {Math.abs(kpis.pendingChange)}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.pendingBookings}</div>
          <div className={styles.kpiLabel}>Chờ xác nhận</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>🎯</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.completedChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.completedToday}</div>
          <div className={styles.kpiLabel}>Hoàn thành hôm nay</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⏱️</span>
            <span className={`${styles.kpiTrend} ${styles.down}`}>↓ {Math.abs(kpis.waitTimeChange)} phút</span>
          </div>
          <div className={styles.kpiValue}>{kpis.avgWaitTime} phút</div>
          <div className={styles.kpiLabel}>Thời gian chờ TB</div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📊 Trạng thái booking</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={bookingStatus} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                {bookingStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📈 Check-in theo giờ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyCheckIns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" name="Số lượng check-in" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.scheduleSection}>
        <h2 className={styles.sectionTitle}>📅 Lịch hẹn hôm nay</h2>
        <div className={styles.scheduleList}>
          {todaySchedule.map(item => (
            <div key={item.id} className={`${styles.scheduleCard} ${styles[item.status]}`}>
              <div className={styles.scheduleTime}>{item.time}</div>
              <div className={styles.scheduleContent}>
                <div className={styles.scheduleHeader}>
                  <div>
                    <div className={styles.customerName}>{item.customer}</div>
                    <div className={styles.vehicleNumber}>🚗 {item.vehicle}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                    {item.status === 'checked-in' && '✅ Đã check-in'}
                    {item.status === 'confirmed' && '📅 Đã xác nhận'}
                    {item.status === 'pending' && '⏳ Chờ xác nhận'}
                  </span>
                </div>
                <div className={styles.scheduleDetails}>
                  <span>📞 {item.phone}</span>
                  <span>🔧 {item.service}</span>
                </div>
              </div>
              <div className={styles.scheduleActions}>
                {item.status === 'pending' && (
                  <>
                    <button className={styles.confirmBtn}>✓ Xác nhận</button>
                    <button className={styles.cancelBtn}>✗ Hủy</button>
                  </>
                )}
                {item.status === 'confirmed' && (
                  <button className={styles.checkInBtn}>✓ Check-in</button>
                )}
                {item.status === 'checked-in' && (
                  <button className={styles.viewBtn}>👁️ Xem chi tiết</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
