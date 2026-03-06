import { useState } from 'react';
import StatCard from '../../../components/Dashboard/StatCard';
import styles from './AdvisorDashboard.module.css';

const AdvisorDashboard = () => {
  const [stats] = useState({
    todayCustomers: 8,
    bookings: 12,
    consultations: 15,
    target: 75
  });

  const [customers] = useState([
    { id: 1, name: 'Nguyễn Văn A', phone: '0912345678', status: 'Cần liên hệ', priority: 'high', time: '09:00' },
    { id: 2, name: 'Trần Thị B', phone: '0923456789', status: 'Đã liên hệ', priority: 'medium', time: '10:30' },
    { id: 3, name: 'Lê Văn C', phone: '0934567890', status: 'Cần liên hệ', priority: 'high', time: '14:00' }
  ]);

  const [appointments] = useState([
    { id: 1, customer: 'Phạm Thị D', service: 'Tư vấn bảo dưỡng', time: '09:00', status: 'confirmed' },
    { id: 2, customer: 'Hoàng Văn E', service: 'Tư vấn sửa chữa', time: '11:00', status: 'pending' },
    { id: 3, customer: 'Võ Thị F', service: 'Tư vấn dịch vụ', time: '15:00', status: 'confirmed' }
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Cố vấn</h1>
          <p className={styles.subtitle}>Quản lý tư vấn khách hàng</p>
        </div>
        <button className={styles.btnPrimary}>📝 Ghi chú mới</button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Khách hàng hôm nay"
          value={stats.todayCustomers}
          icon="👥"
          color="purple"
        />
        <StatCard
          title="Booking của tôi"
          value={stats.bookings}
          icon="📅"
          color="blue"
        />
        <StatCard
          title="Lượt tư vấn"
          value={stats.consultations}
          icon="💬"
          color="green"
          trend="up"
          trendValue="+3"
        />
        <StatCard
          title="Hoàn thành mục tiêu"
          value={`${stats.target}%`}
          icon="🎯"
          color="orange"
          trend="up"
          trendValue="+5%"
        />
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📞 Khách hàng cần liên hệ</h2>
            <span className={styles.badge}>{customers.filter(c => c.status === 'Cần liên hệ').length}</span>
          </div>
          <div className={styles.customerList}>
            {customers.map(customer => (
              <div key={customer.id} className={`${styles.customerItem} ${styles[customer.priority]}`}>
                <div className={styles.customerInfo}>
                  <div className={styles.avatar}>{customer.name.charAt(0)}</div>
                  <div>
                    <h3 className={styles.customerName}>{customer.name}</h3>
                    <p className={styles.customerPhone}>{customer.phone}</p>
                  </div>
                </div>
                <div className={styles.customerMeta}>
                  <span className={styles.time}>{customer.time}</span>
                  <span className={`${styles.status} ${styles[customer.status === 'Cần liên hệ' ? 'pending' : 'contacted']}`}>
                    {customer.status}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button className={styles.callBtn}>📞</button>
                  <button className={styles.noteBtn}>📝</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📅 Lịch hẹn hôm nay</h2>
          <div className={styles.appointmentList}>
            {appointments.map(apt => (
              <div key={apt.id} className={styles.appointmentItem}>
                <div className={styles.timeSlot}>{apt.time}</div>
                <div className={styles.appointmentInfo}>
                  <h3 className={styles.appointmentCustomer}>{apt.customer}</h3>
                  <p className={styles.appointmentService}>{apt.service}</p>
                </div>
                <span className={`${styles.appointmentStatus} ${styles[apt.status]}`}>
                  {apt.status === 'confirmed' ? '✓ Đã xác nhận' : '⏳ Chờ xác nhận'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.statsCard}>
        <h2 className={styles.cardTitle}>📊 Thống kê tư vấn tháng này</h2>
        <div className={styles.monthStats}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>👥</span>
            <div>
              <div className={styles.statValue}>45</div>
              <div className={styles.statLabel}>Khách hàng</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>✅</span>
            <div>
              <div className={styles.statValue}>38</div>
              <div className={styles.statLabel}>Thành công</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>💰</span>
            <div>
              <div className={styles.statValue}>25M</div>
              <div className={styles.statLabel}>Doanh thu</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>⭐</span>
            <div>
              <div className={styles.statValue}>4.8</div>
              <div className={styles.statLabel}>Đánh giá</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;
