import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './AccountantDashboard.module.css';

const AccountantDashboard = () => {
  const [dateRange, setDateRange] = useState('month');
  
  const kpis = {
    totalRevenue: 450000000,
    totalExpenses: 180000000,
    netProfit: 270000000,
    pendingInvoices: 25,
    revenueGrowth: 18.5,
    expenseChange: -5.2,
    profitGrowth: 25.3,
    invoiceChange: -3
  };

  const monthlyFinance = [
    { month: 'T1', revenue: 380000000, expenses: 150000000, profit: 230000000 },
    { month: 'T2', revenue: 420000000, expenses: 170000000, profit: 250000000 },
    { month: 'T3', revenue: 450000000, expenses: 180000000, profit: 270000000 }
  ];

  const revenueByService = [
    { service: 'Bảo dưỡng', revenue: 180000000 },
    { service: 'Sửa chữa', revenue: 150000000 },
    { service: 'Thay thế', revenue: 80000000 },
    { service: 'Kiểm tra', revenue: 40000000 }
  ];

  const pendingPayments = [
    { id: 1, invoice: 'INV-2024-001', customer: 'Nguyễn Văn A', amount: 5000000, dueDate: '15/03/2024', status: 'overdue' },
    { id: 2, invoice: 'INV-2024-002', customer: 'Trần Thị B', amount: 3500000, dueDate: '20/03/2024', status: 'pending' },
    { id: 3, invoice: 'INV-2024-003', customer: 'Lê Văn C', amount: 7200000, dueDate: '25/03/2024', status: 'pending' }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>💰 Dashboard Kế toán</h1>
          <p className={styles.subtitle}>Quản lý tài chính và báo cáo</p>
        </div>
        <div className={styles.filters}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filterSelect}>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
          <button className={styles.exportBtn}>📊 Xuất báo cáo</button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💵</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.revenueGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.totalRevenue)}</div>
          <div className={styles.kpiLabel}>Tổng doanh thu</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💸</span>
            <span className={`${styles.kpiTrend} ${styles.down}`}>↓ {Math.abs(kpis.expenseChange)}%</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.totalExpenses)}</div>
          <div className={styles.kpiLabel}>Tổng chi phí</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>📈</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.profitGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.netProfit)}</div>
          <div className={styles.kpiLabel}>Lợi nhuận ròng</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>📄</span>
            <span className={`${styles.kpiTrend} ${styles.down}`}>↓ {Math.abs(kpis.invoiceChange)}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.pendingInvoices}</div>
          <div className={styles.kpiLabel}>Hóa đơn chờ thanh toán</div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📊 Tài chính theo tháng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyFinance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0891b2" fill="#0891b2" name="Doanh thu" />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" name="Chi phí" />
              <Area type="monotone" dataKey="profit" stackId="3" stroke="#10b981" fill="#10b981" name="Lợi nhuận" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>💰 Doanh thu theo dịch vụ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByService} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="service" type="category" />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#0891b2" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.invoiceSection}>
        <h2 className={styles.sectionTitle}>📄 Hóa đơn chờ thanh toán</h2>
        <div className={styles.invoiceList}>
          {pendingPayments.map(payment => (
            <div key={payment.id} className={`${styles.invoiceCard} ${styles[payment.status]}`}>
              <div className={styles.invoiceHeader}>
                <div className={styles.invoiceInfo}>
                  <div className={styles.invoiceNumber}>{payment.invoice}</div>
                  <div className={styles.customerName}>{payment.customer}</div>
                </div>
                <span className={`${styles.statusBadge} ${styles[payment.status]}`}>
                  {payment.status === 'overdue' && '⚠️ Quá hạn'}
                  {payment.status === 'pending' && '⏳ Chờ thanh toán'}
                </span>
              </div>
              <div className={styles.invoiceDetails}>
                <div className={styles.invoiceAmount}>
                  <span className={styles.amountLabel}>Số tiền:</span>
                  <span className={styles.amountValue}>{formatCurrency(payment.amount)}</span>
                </div>
                <div className={styles.invoiceDue}>
                  <span className={styles.dueLabel}>Hạn thanh toán:</span>
                  <span className={styles.dueValue}>{payment.dueDate}</span>
                </div>
              </div>
              <div className={styles.invoiceActions}>
                <button className={styles.viewBtn}>👁️ Xem</button>
                <button className={styles.remindBtn}>📧 Nhắc nhở</button>
                <button className={styles.confirmBtn}>✓ Xác nhận thanh toán</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
