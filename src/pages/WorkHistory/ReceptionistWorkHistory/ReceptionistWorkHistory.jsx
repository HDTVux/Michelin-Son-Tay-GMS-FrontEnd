import { useState } from 'react';
import styles from '../TechnicianWorkHistory/TechnicianWorkHistory.module.css';

const ReceptionistWorkHistory = () => {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('thisMonth');

  const [activities] = useState([
    { id: 1, type: 'checkin', customer: 'Nguyễn Văn A', service: 'Bảo dưỡng', time: '08:00', date: '06/03/2024', status: 'completed' },
    { id: 2, type: 'booking', customer: 'Trần Thị B', service: 'Sửa chữa', time: '09:30', date: '06/03/2024', status: 'completed' },
    { id: 3, type: 'confirm', customer: 'Lê Văn C', service: 'Kiểm tra', time: '10:00', date: '06/03/2024', status: 'completed' },
    { id: 4, type: 'checkin', customer: 'Phạm Thị D', service: 'Thay nhớt', time: '11:00', date: '05/03/2024', status: 'completed' }
  ]);

  const stats = {
    totalCheckIns: 45,
    bookingsCreated: 28,
    confirmations: 32,
    avgWaitTime: '5 phút'
  };

  const getTypeText = (type) => {
    const texts = {
      checkin: 'Check-in khách hàng',
      booking: 'Tạo booking mới',
      confirm: 'Xác nhận booking'
    };
    return texts[type] || type;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử tiếp đón</h1>
          <p className={styles.subtitle}>Theo dõi hoạt động lễ tân</p>
        </div>
        <button className={styles.exportBtn} style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>📥 Xuất báo cáo</button>
      </div>

      <div className={styles.filterBar}>
        <select className={styles.select} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Hôm nay</option>
          <option value="thisWeek">Tuần này</option>
          <option value="thisMonth">Tháng này</option>
        </select>

        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="checkin">Check-in</option>
          <option value="booking">Booking</option>
          <option value="confirm">Xác nhận</option>
        </select>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✓</span>
          <div>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>{stats.totalCheckIns}</div>
            <div className={styles.statLabel}>Check-in</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <div>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>{stats.bookingsCreated}</div>
            <div className={styles.statLabel}>Booking tạo mới</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>{stats.confirmations}</div>
            <div className={styles.statLabel}>Xác nhận</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>⏱️</span>
          <div>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>{stats.avgWaitTime}</div>
            <div className={styles.statLabel}>Thời gian chờ TB</div>
          </div>
        </div>
      </div>

      <div className={styles.workList}>
        {activities.map(item => (
          <div key={item.id} className={styles.workItem} style={{ borderLeftColor: '#16a34a' }}>
            <div className={styles.workHeader}>
              <div className={styles.vehicleInfo}>
                <span className={styles.vehicleNumber} style={{ color: '#16a34a' }}>{getTypeText(item.type)}</span>
                <span className={styles.customerName}>{item.customer}</span>
              </div>
              <span className={`${styles.statusBadge} ${styles.completed}`}>
                ✓ Hoàn thành
              </span>
            </div>
            <div className={styles.workBody}>
              <h3 className={styles.serviceName}>{item.service}</h3>
              <div className={styles.workMeta}>
                <span className={styles.metaItem}>📅 {item.date}</span>
                <span className={styles.metaItem}>⏰ {item.time}</span>
              </div>
            </div>
            <button className={styles.detailBtn} style={{ color: '#16a34a', borderColor: '#16a34a' }}>Xem chi tiết</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReceptionistWorkHistory;
