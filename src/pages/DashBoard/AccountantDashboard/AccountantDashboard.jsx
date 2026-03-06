import { useState } from 'react';
import StatCard from '../../../components/Dashboard/StatCard';
import styles from './AccountantDashboard.module.css';

const AccountantDashboard = () => {
  const [stats] = useState({
    todayRevenue: '15,500,000',
    monthRevenue: '125,000,000',
    pending: '8,500,000',
    profit: '45,000,000'
  });

  const [invoices] = useState([
    { id: 1, code: 'INV-001', customer: 'Nguyễn Văn A', amount: '2,500,000', status: 'pending', date: '06/03/2024' },
    { id: 2, code: 'INV-002', customer: 'Trần Thị B', amount: '3,200,000', status: 'paid', date: '06/03/2024' },
    { id: 3, code: 'INV-003', customer: 'Lê Văn C', amount: '1,800,000', status: 'pending', date: '06/03/2024' }
  ]);

  const [debts] = useState([
    { id: 1, customer: 'Phạm Thị D', amount: '5,000,000', dueDate: '10/03/2024', overdue: false },
    { id: 2, customer: 'Hoàng Văn E', amount: '3,500,000', dueDate: '05/03/2024', overdue: true }
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Kế toán</h1>
          <p className={styles.subtitle}>Quản lý tài chính</p>
        </div>
        <button className={styles.btnPrimary}>📊 Xuất báo cáo</button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard title="Doanh thu hôm nay" value={`${stats.todayRevenue}đ`} icon="💰" color="cyan" trend="up" trendValue="+8%" />
        <StatCard title="Doanh thu tháng" value={`${stats.monthRevenue}đ`} icon="📈" color="blue" trend="up" trendValue="+12%" />
        <StatCard title="Chờ thanh toán" value={`${stats.pending}đ`} icon="⏳" color="orange" />
        <StatCard title="Lợi nhuận" value={`${stats.profit}đ`} icon="💎" color="green" trend="up" trendValue="+15%" />
      </div>

      <div className={styles.chartCard}>
        <h2 className={styles.cardTitle}>💰 Doanh thu hôm nay: 15,500,000đ</h2>
        <div className={styles.revenueChart}>
          <div className={styles.chartBar}>
            <div className={styles.chartSegment} style={{ width: '60%', background: '#0891b2' }}>
              <span>Dịch vụ: 9.3M</span>
            </div>
            <div className={styles.chartSegment} style={{ width: '30%', background: '#06b6d4' }}>
              <span>Phụ tùng: 4.6M</span>
            </div>
            <div className={styles.chartSegment} style={{ width: '10%', background: '#22d3ee' }}>
              <span>Khác: 1.6M</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>🧾 Hóa đơn chờ thanh toán</h2>
            <span className={styles.badge}>{invoices.filter(i => i.status === 'pending').length}</span>
          </div>
          <div className={styles.invoiceList}>
            {invoices.map(invoice => (
              <div key={invoice.id} className={styles.invoiceItem}>
                <div className={styles.invoiceInfo}>
                  <h3 className={styles.invoiceCode}>{invoice.code}</h3>
                  <p className={styles.invoiceCustomer}>{invoice.customer}</p>
                  <span className={styles.invoiceDate}>📅 {invoice.date}</span>
                </div>
                <div className={styles.invoiceAmount}>{invoice.amount}đ</div>
                <span className={`${styles.invoiceStatus} ${styles[invoice.status]}`}>
                  {invoice.status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>💳 Công nợ cần thu</h2>
          <div className={styles.debtList}>
            {debts.map(debt => (
              <div key={debt.id} className={`${styles.debtItem} ${debt.overdue ? styles.overdue : ''}`}>
                <div className={styles.debtInfo}>
                  <h3 className={styles.debtCustomer}>{debt.customer}</h3>
                  <p className={styles.debtAmount}>{debt.amount}đ</p>
                  <span className={`${styles.dueDate} ${debt.overdue ? styles.overdue : ''}`}>
                    {debt.overdue ? '⚠️ Quá hạn' : '📅'} {debt.dueDate}
                  </span>
                </div>
                <button className={styles.contactBtn}>📞 Liên hệ</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
