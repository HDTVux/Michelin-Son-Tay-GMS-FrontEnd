import { useState } from 'react';
import styles from '../AdminWorkHistory/AdminWorkHistory.module.css';

const AccountantWorkHistory = () => {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('thisMonth');

  const [transactions] = useState([
    { id: 1, type: 'invoice', action: 'Xuất hóa đơn', details: 'INV-001 - 2,500,000đ', date: '06/03/2024', time: '14:30', status: 'completed' },
    { id: 2, type: 'payment', action: 'Xác nhận thanh toán', details: 'PAY-123 - 3,200,000đ', date: '06/03/2024', time: '10:15', status: 'completed' },
    { id: 3, type: 'report', action: 'Xuất báo cáo tài chính', details: 'Báo cáo tháng 2/2024', date: '05/03/2024', time: '16:00', status: 'completed' },
    { id: 4, type: 'debt', action: 'Theo dõi công nợ', details: 'Khách hàng Nguyễn Văn A', date: '05/03/2024', time: '09:00', status: 'pending' }
  ]);

  const stats = {
    invoices: 45,
    payments: 38,
    reports: 12
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử tài chính</h1>
          <p className={styles.subtitle}>Theo dõi các giao dịch tài chính</p>
        </div>
        <button className={styles.exportBtn} style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }}>📥 Xuất báo cáo</button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span>🔍</span>
          <input type="text" placeholder="Tìm kiếm giao dịch..." />
        </div>

        <select className={styles.select} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Hôm nay</option>
          <option value="thisWeek">Tuần này</option>
          <option value="thisMonth">Tháng này</option>
        </select>

        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="invoice">Hóa đơn</option>
          <option value="payment">Thanh toán</option>
          <option value="report">Báo cáo</option>
          <option value="debt">Công nợ</option>
        </select>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🧾</span>
          <div>
            <div className={styles.statValue} style={{ color: '#0891b2' }}>{stats.invoices}</div>
            <div className={styles.statLabel}>Hóa đơn</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💳</span>
          <div>
            <div className={styles.statValue} style={{ color: '#0891b2' }}>{stats.payments}</div>
            <div className={styles.statLabel}>Thanh toán</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div>
            <div className={styles.statValue} style={{ color: '#0891b2' }}>{stats.reports}</div>
            <div className={styles.statLabel}>Báo cáo</div>
          </div>
        </div>
      </div>

      <div className={styles.timeline}>
        {transactions.map(transaction => (
          <div key={transaction.id} className={`${styles.timelineItem} ${styles.cyan}`}>
            <div className={styles.timelineIcon}>
              {transaction.type === 'invoice' ? '🧾' : transaction.type === 'payment' ? '💳' : transaction.type === 'report' ? '📊' : '💰'}
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <h3 className={styles.activityAction}>{transaction.action}</h3>
                <span className={styles.activityTime}>{transaction.date} • {transaction.time}</span>
              </div>
              <p className={styles.activityDetails}>{transaction.details}</p>
              <span className={styles.activityUser}>
                Trạng thái: {transaction.status === 'completed' ? '✓ Hoàn thành' : '⏳ Đang xử lý'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountantWorkHistory;
