import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './AdvisorDashboard.module.css';

const AdvisorDashboard = () => {
  const [dateRange, setDateRange] = useState('week');
  
  const kpis = {
    totalCustomers: 45,
    consultations: 28,
    conversionRate: 75,
    avgRevenue: 2500000,
    customerGrowth: 12.5,
    consultationGrowth: 8.3,
    conversionChange: 5.2,
    revenueGrowth: 15.8
  };

  const weeklyConsultations = [
    { day: 'T2', consultations: 6, converted: 4 },
    { day: 'T3', consultations: 8, converted: 6 },
    { day: 'T4', consultations: 5, converted: 4 },
    { day: 'T5', consultations: 7, converted: 5 },
    { day: 'T6', consultations: 9, converted: 7 },
    { day: 'T7', consultations: 4, converted: 3 },
    { day: 'CN', consultations: 2, converted: 1 }
  ];

  const serviceRecommendations = [
    { name: 'Bảo dưỡng', value: 35, color: '#3b82f6' },
    { name: 'Sửa chữa', value: 25, color: '#ef4444' },
    { name: 'Thay thế', value: 20, color: '#f59e0b' },
    { name: 'Kiểm tra', value: 20, color: '#10b981' }
  ];

  const customerContacts = [
    { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', vehicle: '29A-12345', lastContact: '2 giờ trước', status: 'hot', note: 'Quan tâm bảo dưỡng định kỳ' },
    { id: 2, name: 'Trần Thị B', phone: '0912345678', vehicle: '30B-67890', lastContact: '1 ngày trước', status: 'warm', note: 'Cần tư vấn sửa phanh' },
    { id: 3, name: 'Lê Văn C', phone: '0923456789', vehicle: '31C-11111', lastContact: '3 ngày trước', status: 'cold', note: 'Hỏi giá thay nhớt' }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>💼 Dashboard Tư vấn viên</h1>
          <p className={styles.subtitle}>Quản lý khách hàng và tư vấn dịch vụ</p>
        </div>
        <div className={styles.filters}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filterSelect}>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
          </select>
          <button className={styles.newContactBtn}>➕ Liên hệ mới</button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>👥</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.customerGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.totalCustomers}</div>
          <div className={styles.kpiLabel}>Tổng khách hàng</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💬</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.consultationGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.consultations}</div>
          <div className={styles.kpiLabel}>Tư vấn tuần này</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>🎯</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.conversionChange}%</span>
          </div>
          <div className={styles.kpiValue}>{kpis.conversionRate}%</div>
          <div className={styles.kpiLabel}>Tỷ lệ chuyển đổi</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>💰</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.revenueGrowth}%</span>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.avgRevenue)}</div>
          <div className={styles.kpiLabel}>Doanh thu TB/KH</div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📈 Tư vấn & Chuyển đổi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyConsultations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="consultations" fill="#7c3aed" name="Tư vấn" />
              <Bar dataKey="converted" fill="#10b981" name="Chuyển đổi" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>🔧 Dịch vụ được đề xuất</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={serviceRecommendations} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                {serviceRecommendations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.contactSection}>
        <h2 className={styles.sectionTitle}>📞 Danh sách liên hệ</h2>
        <div className={styles.contactList}>
          {customerContacts.map(contact => (
            <div key={contact.id} className={`${styles.contactCard} ${styles[contact.status]}`}>
              <div className={styles.contactHeader}>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{contact.name}</div>
                  <div className={styles.contactDetails}>
                    <span>📞 {contact.phone}</span>
                    <span>🚗 {contact.vehicle}</span>
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${styles[contact.status]}`}>
                  {contact.status === 'hot' && '🔥 Hot'}
                  {contact.status === 'warm' && '🌤️ Warm'}
                  {contact.status === 'cold' && '❄️ Cold'}
                </span>
              </div>
              <div className={styles.contactNote}>
                <strong>Ghi chú:</strong> {contact.note}
              </div>
              <div className={styles.contactFooter}>
                <span className={styles.lastContact}>Liên hệ: {contact.lastContact}</span>
                <div className={styles.contactActions}>
                  <button className={styles.callBtn}>📞 Gọi</button>
                  <button className={styles.consultBtn}>💬 Tư vấn</button>
                  <button className={styles.bookBtn}>📅 Đặt lịch</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;
