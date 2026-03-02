import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdvisorDashboard.module.css';

const AdvisorDashboard = () => {
  const [stats] = useState({
    consultationsToday: 12,
    totalCustomers: 45,
    conversionRate: 78,
    pendingCallbacks: 5
  });

  const [recentCustomers] = useState([
    { id: 1, name: 'Nguyen Van A', service: 'Thay lop xe', status: 'tu_van', note: 'Khach hang quan tam den Michelin', time: '10:30' },
    { id: 2, name: 'Tran Thi B', service: 'Bao duong', status: 'cho_xac_nhan', note: 'Can goi lai xac nhan', time: '11:00' },
    { id: 3, name: 'Le Van C', service: 'Can chinh dao', status: 'da_dat', note: 'Da dat lich hom nay', time: '14:00' },
    { id: 4, name: 'Pham Thi D', service: 'Thay dau', status: 'tu_van', note: 'Khach can tu van them', time: '15:30' }
  ]);

  const [services] = useState([
    { name: 'Thay lop Michelin', price: '500.000', interest: 85 },
    { name: 'Bao duong tong', price: '1.200.000', interest: 72 },
    { name: 'Can chinh dao', price: '350.000', interest: 68 },
    { name: 'Thay dau may', price: '280.000', interest: 55 }
  ]);

  const quickActions = [
    { id: 1, title: 'Tao lich hen', desc: 'Tao lich hen moi', link: '/booking', icon: '📅' },
    { id: 2, title: 'Danh muc dich vu', desc: 'Xem dich vu', link: '/services', icon: '📋' },
    { id: 3, title: 'Khach hang', desc: 'Quan ly KH', link: '/customer-list', icon: '👥' },
    { id: 4, title: 'Lich su tu van', desc: 'Lich su lich hen', link: '/advisor-history', icon: '📜' }
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'tu_van': return { text: 'Dang tu van', class: styles.badgeBlue };
      case 'cho_xac_nhan': return { text: 'Cho xac nhan', class: styles.badgeYellow };
      case 'da_dat': return { text: 'Da dat lich', class: styles.badgeGreen };
      default: return { text: status, class: '' };
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Tu Van Vien</h1>
          <p className={styles.subtitle}>Cong cu ho tro ban trong viec tu van khach hang</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#3b82f6' }}>📞</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.consultationsToday}</span>
            <span className={styles.statLabel}>Tu van hom nay</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#10b981' }}>👥</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalCustomers}</span>
            <span className={styles.statLabel}>Khach hang thang</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#8b5cf6' }}>📈</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.conversionRate}%</span>
            <span className={styles.statLabel}>Ty le chuyen doi</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f59e0b' }}>📲</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.pendingCallbacks}</span>
            <span className={styles.statLabel}>Cho goi lai</span>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Thao tac nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Link key={action.id} to={action.link} className={styles.actionCard}>
              <span className={styles.actionIcon}>{action.icon}</span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Khach hang gan day</h2>
            <Link to="/customer-list" className={styles.viewAll}>Xem tat ca</Link>
          </div>
          <div className={styles.customerList}>
            {recentCustomers.map((customer) => {
              const badge = getStatusBadge(customer.status);
              return (
                <div key={customer.id} className={styles.customerItem}>
                  <div className={styles.customerInfo}>
                    <div className={styles.customerAvatar}>{customer.name.charAt(0)}</div>
                    <div>
                      <h4>{customer.name}</h4>
                      <p>{customer.service}</p>
                    </div>
                  </div>
                  <div className={styles.customerMeta}>
                    <span className={`${styles.badge} ${badge.class}`}>{badge.text}</span>
                    <span className={styles.note}>{customer.note}</span>
                    <span className={styles.time}>{customer.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Dich vu pho bien</h2>
          </div>
          <div className={styles.serviceList}>
            {services.map((service, index) => (
              <div key={index} className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4>{service.name}</h4>
                  <span className={styles.price}>{service.price} VND</span>
                </div>
                <div className={styles.interestBar}>
                  <div className={styles.interestProgress} style={{ width: `${service.interest}%` }}></div>
                </div>
                <span className={styles.interestPercent}>{service.interest}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;
