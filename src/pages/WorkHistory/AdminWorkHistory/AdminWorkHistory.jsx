import { useState } from 'react';
import styles from './AdminWorkHistory.module.css';

const AdminWorkHistory = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('thisMonth');

  const [activities] = useState([
    { id: 1, type: 'system', action: 'Cập nhật cấu hình hệ thống', details: 'Thay đổi giờ làm việc', date: '06/03/2024', time: '14:30', user: 'Admin' },
    { id: 2, type: 'staff', action: 'Thêm nhân viên mới', details: 'Nguyễn Văn A - Kỹ thuật viên', date: '05/03/2024', time: '10:15', user: 'Admin' },
    { id: 3, type: 'approval', action: 'Duyệt yêu cầu nghỉ phép', details: 'Trần Thị B - 2 ngày', date: '05/03/2024', time: '09:00', user: 'Admin' },
    { id: 4, type: 'report', action: 'Xuất báo cáo doanh thu', details: 'Báo cáo tháng 2/2024', date: '04/03/2024', time: '16:45', user: 'Admin' },
    { id: 5, type: 'customer', action: 'Xử lý khiếu nại khách hàng', details: 'Ticket #1234', date: '04/03/2024', time: '11:20', user: 'Admin' }
  ]);

  const getTypeIcon = (type) => {
    const icons = {
      system: '⚙️',
      staff: '👤',
      approval: '✅',
      report: '📊',
      customer: '👥'
    };
    return icons[type] || '📝';
  };

  const getTypeColor = (type) => {
    const colors = {
      system: 'blue',
      staff: 'green',
      approval: 'purple',
      report: 'orange',
      customer: 'cyan'
    };
    return colors[type] || 'gray';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử hoạt động</h1>
          <p className={styles.subtitle}>Theo dõi các thao tác quản trị</p>
        </div>
        <button className={styles.exportBtn}>📥 Xuất báo cáo</button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm hoạt động..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select className={styles.select} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Hôm nay</option>
          <option value="thisWeek">Tuần này</option>
          <option value="thisMonth">Tháng này</option>
          <option value="lastMonth">Tháng trước</option>
          <option value="custom">Tùy chỉnh</option>
        </select>

        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="system">Hệ thống</option>
          <option value="staff">Nhân viên</option>
          <option value="approval">Phê duyệt</option>
          <option value="report">Báo cáo</option>
          <option value="customer">Khách hàng</option>
        </select>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div>
            <div className={styles.statValue}>45</div>
            <div className={styles.statLabel}>Hoạt động tháng này</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>⚙️</span>
          <div>
            <div className={styles.statValue}>12</div>
            <div className={styles.statLabel}>Cấu hình hệ thống</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div>
            <div className={styles.statValue}>28</div>
            <div className={styles.statLabel}>Phê duyệt</div>
          </div>
        </div>
      </div>

      <div className={styles.timeline}>
        {activities.map(activity => (
          <div key={activity.id} className={`${styles.timelineItem} ${styles[getTypeColor(activity.type)]}`}>
            <div className={styles.timelineIcon}>
              {getTypeIcon(activity.type)}
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <h3 className={styles.activityAction}>{activity.action}</h3>
                <span className={styles.activityTime}>{activity.date} • {activity.time}</span>
              </div>
              <p className={styles.activityDetails}>{activity.details}</p>
              <span className={styles.activityUser}>Bởi: {activity.user}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminWorkHistory;
