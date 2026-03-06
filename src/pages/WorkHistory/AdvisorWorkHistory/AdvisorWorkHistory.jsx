import { useState } from 'react';
import styles from '../TechnicianWorkHistory/TechnicianWorkHistory.module.css';

const AdvisorWorkHistory = () => {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('thisMonth');

  const [consultations] = useState([
    { id: 1, customer: 'Nguyễn Văn A', phone: '0912345678', service: 'Tư vấn bảo dưỡng', result: 'Đặt lịch thành công', date: '06/03/2024', duration: '15 phút', revenue: '2,500,000' },
    { id: 2, customer: 'Trần Thị B', phone: '0923456789', service: 'Tư vấn sửa chữa', result: 'Đặt lịch thành công', date: '06/03/2024', duration: '20 phút', revenue: '3,200,000' },
    { id: 3, customer: 'Lê Văn C', phone: '0934567890', service: 'Tư vấn dịch vụ', result: 'Chưa quyết định', date: '05/03/2024', duration: '10 phút', revenue: '0' },
    { id: 4, customer: 'Phạm Thị D', phone: '0945678901', service: 'Tư vấn bảo dưỡng', result: 'Đặt lịch thành công', date: '05/03/2024', duration: '12 phút', revenue: '1,800,000' }
  ]);

  const stats = {
    totalConsultations: 38,
    successRate: 85,
    totalRevenue: '25,000,000',
    avgRating: 4.8
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử tư vấn</h1>
          <p className={styles.subtitle}>Theo dõi các buổi tư vấn khách hàng</p>
        </div>
        <button className={styles.exportBtn} style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>📥 Xuất báo cáo</button>
      </div>

      <div className={styles.filterBar}>
        <select className={styles.select} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Hôm nay</option>
          <option value="thisWeek">Tuần này</option>
          <option value="thisMonth">Tháng này</option>
        </select>

        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="success">Thành công</option>
          <option value="pending">Chưa quyết định</option>
        </select>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💬</span>
          <div>
            <div className={styles.statValue} style={{ color: '#7c3aed' }}>{stats.totalConsultations}</div>
            <div className={styles.statLabel}>Lượt tư vấn</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div>
            <div className={styles.statValue} style={{ color: '#7c3aed' }}>{stats.successRate}%</div>
            <div className={styles.statLabel}>Tỷ lệ thành công</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💰</span>
          <div>
            <div className={styles.statValue} style={{ color: '#7c3aed' }}>{stats.totalRevenue}đ</div>
            <div className={styles.statLabel}>Doanh thu mang lại</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>⭐</span>
          <div>
            <div className={styles.statValue} style={{ color: '#7c3aed' }}>{stats.avgRating}</div>
            <div className={styles.statLabel}>Đánh giá</div>
          </div>
        </div>
      </div>

      <div className={styles.workList}>
        {consultations.map(item => (
          <div key={item.id} className={styles.workItem} style={{ borderLeftColor: '#7c3aed' }}>
            <div className={styles.workHeader}>
              <div className={styles.vehicleInfo}>
                <span className={styles.vehicleNumber} style={{ color: '#7c3aed' }}>👤 {item.customer}</span>
                <span className={styles.customerName}>{item.phone}</span>
              </div>
              <span className={`${styles.statusBadge} ${styles.completed}`}>
                {item.result}
              </span>
            </div>
            <div className={styles.workBody}>
              <h3 className={styles.serviceName}>{item.service}</h3>
              <div className={styles.workMeta}>
                <span className={styles.metaItem}>📅 {item.date}</span>
                <span className={styles.metaItem}>⏱️ {item.duration}</span>
                <span className={styles.metaItem}>💰 {item.revenue}đ</span>
              </div>
            </div>
            <button className={styles.detailBtn} style={{ color: '#7c3aed', borderColor: '#7c3aed' }}>Xem chi tiết</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdvisorWorkHistory;
