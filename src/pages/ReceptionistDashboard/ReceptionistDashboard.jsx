import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ReceptionistDashboard.module.css';

const ReceptionistDashboard = () => {
  const [stats] = useState({
    bookingsToday: 18,
    waitingCustomer: 5,
    checkedIn: 12,
    completed: 8
  });

  const [todaySchedule] = useState([
    { id: 1, time: '08:00', customer: 'Nguyen Van A', service: 'Thay lop', status: 'checked_in', plate: '51A-123.45' },
    { id: 2, time: '09:00', customer: 'Tran Thi B', service: 'Bao duong', status: 'waiting', plate: '30G-987.65' },
    { id: 3, time: '10:00', customer: 'Le Van C', service: 'Can chinh dao', status: 'confirmed', plate: '52B-456.78' },
    { id: 4, time: '11:00', customer: 'Pham Thi D', service: 'Thay dau', status: 'waiting', plate: '43C-234.56' },
    { id: 5, time: '14:00', customer: 'Hoang Van E', service: 'Kiem tra', status: 'pending', plate: '60D-789.01' }
  ]);

  const quickActions = [
    { id: 1, title: 'Tiep nhan', desc: 'Tiep nhan khach', link: '/check-in', icon: '✅' },
    { id: 2, title: 'Lich hen', desc: 'Quan ly lich hen', link: '/booking-request-management', icon: '📅' },
    { id: 3, title: 'Tra xe', desc: 'Tra xe cho khach', link: '/check-out', icon: '🚗' },
    { id: 4, title: 'Khach hang', desc: 'Thong tin KH', link: '/customer-list', icon: '👥' }
  ];

  const getStatusClass = (status) => {
    switch(status) {
      case 'checked_in': return styles.statusCheckedIn;
      case 'waiting': return styles.statusWaiting;
      case 'confirmed': return styles.statusConfirmed;
      case 'completed': return styles.statusCompleted;
      case 'pending': return styles.statusPending;
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'checked_in': return 'Da check-in';
      case 'waiting': return 'Dang cho';
      case 'confirmed': return 'Da xac nhan';
      case 'completed': return 'Hoan thanh';
      case 'pending': return 'Cho xac nhan';
      default: return status;
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Le Tan</h1>
          <p className={styles.subtitle}>Cong cu quan ly lich hen va tiep nhan khach</p>
        </div>
        <div className={styles.dateDisplay}>
          <span>Thu 3, 15/01/2025</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#3b82f6' }}>📅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.bookingsToday}</span>
            <span className={styles.statLabel}>Lich hen hom nay</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f59e0b' }}>⏳</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.waitingCustomer}</span>
            <span className={styles.statLabel}>Dang cho</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#10b981' }}>✅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.checkedIn}</span>
            <span className={styles.statLabel}>Da check-in</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#8b5cf6' }}>🏁</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.completed}</span>
            <span className={styles.statLabel}>Hoan thanh</span>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Thao tac nhanh</h2>
        <div className={styles.actionsRow}>
          {quickActions.map((action) => (
            <Link key={action.id} to={action.link} className={styles.actionBtn}>
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionText}>{action.title}</span>
              <span className={styles.actionDesc}>{action.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.scheduleCard}>
          <div className={styles.cardHeader}>
            <h2>Lich hen hom nay</h2>
            <span className={styles.scheduleCount}>{todaySchedule.length} lich</span>
          </div>
          <div className={styles.timeline}>
            {todaySchedule.map((item) => (
              <div key={item.id} className={styles.timelineItem}>
                <div className={styles.timeSlot}>{item.time}</div>
                <div className={styles.timelineContent}>
                  <div className={styles.customerRow}>
                    <span className={styles.customerName}>{item.customer}</span>
                    <span className={styles.plate}>{item.plate}</span>
                  </div>
                  <div className={styles.serviceRow}>
                    <span className={styles.service}>{item.service}</span>
                    <span className={`${styles.status} ${getStatusClass(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.waitingPanel}>
            <h3>Danh sach cho</h3>
            <div className={styles.waitingList}>
              <div className={styles.waitingItem}>
                <span className={styles.waitingNumber}>1</span>
                <div>
                  <h4>Tran Thi B</h4>
                  <p>Bao duong</p>
                </div>
              </div>
              <div className={styles.waitingItem}>
                <span className={styles.waitingNumber}>2</span>
                <div>
                  <h4>Pham Thi D</h4>
                  <p>Thay dau</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.infoPanel}>
            <h3>Thong tin</h3>
            <div className={styles.infoItem}>
              <span>📞</span> Hotline: 1900 xxxx
            </div>
            <div className={styles.infoItem}>
              <span>📧</span> Email: info@michelin.com
            </div>
            <div className={styles.infoItem}>
              <span>📍</span> Dia chi: 123 ABC, Q.XYZ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
