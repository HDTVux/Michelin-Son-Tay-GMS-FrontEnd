import { useState } from 'react';
import styles from '../AdminWorkHistory/AdminWorkHistory.module.css';

const ManagerWorkHistory = () => {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('thisMonth');

  const [activities] = useState([
    { id: 1, type: 'approval', action: 'Duyệt booking', details: 'Booking #1234 - Nguyễn Văn A', date: '06/03/2024', time: '14:30' },
    { id: 2, type: 'schedule', action: 'Phân công nhân viên', details: 'Lịch tuần 10-16/03', date: '06/03/2024', time: '10:00' },
    { id: 3, type: 'report', action: 'Xem báo cáo hiệu suất', details: 'Báo cáo tháng 2/2024', date: '05/03/2024', time: '16:00' },
    { id: 4, type: 'approval', action: 'Duyệt nghỉ phép', details: 'Trần Thị B - 2 ngày', date: '05/03/2024', time: '09:15' }
  ]);

  const stats = {
    approvals: 28,
    schedules: 12,
    reports: 8
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử quản lý</h1>
          <p className={styles.subtitle}>Theo dõi hoạt động quản lý</p>
        </div>
        <button className={styles.exportBtn} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>📥 Xuất báo cáo</button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span>🔍</span>
          <input type="text" placeholder="Tìm kiếm..." />
        </div>

        <select className={styles.select} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Hôm nay</option>
          <option value="thisWeek">Tuần này</option>
          <option value="thisMonth">Tháng này</option>
        </select>

        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="approval">Phê duyệt</option>
          <option value="schedule">Phân công</option>
          <option value="report">Báo cáo</option>
        </select>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div>
            <div className={styles.statValue} style={{ color: '#2563eb' }}>{stats.approvals}</div>
            <div className={styles.statLabel}>Phê duyệt</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <div>
            <div className={styles.statValue} style={{ color: '#2563eb' }}>{stats.schedules}</div>
            <div className={styles.statLabel}>Phân công</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div>
            <div className={styles.statValue} style={{ color: '#2563eb' }}>{stats.reports}</div>
            <div className={styles.statLabel}>Báo cáo</div>
          </div>
        </div>
      </div>

      <div className={styles.timeline}>
        {activities.map(activity => (
          <div key={activity.id} className={`${styles.timelineItem} ${styles.blue}`}>
            <div className={styles.timelineIcon}>
              {activity.type === 'approval' ? '✅' : activity.type === 'schedule' ? '📅' : '📊'}
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <h3 className={styles.activityAction}>{activity.action}</h3>
                <span className={styles.activityTime}>{activity.date} • {activity.time}</span>
              </div>
              <p className={styles.activityDetails}>{activity.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerWorkHistory;
