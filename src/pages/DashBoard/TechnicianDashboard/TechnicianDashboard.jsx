import { useState } from 'react';
import StatCard from '../../../components/Dashboard/StatCard';
import styles from './TechnicianDashboard.module.css';

const TechnicianDashboard = () => {
  const [stats] = useState({
    inProgress: 2,
    completed: 8,
    waiting: 3,
    weekTotal: 45
  });

  const [tasks] = useState([
    { id: 1, vehicle: '29A-12345', customer: 'Nguyễn Văn A', service: 'Thay nhớt động cơ', status: 'inProgress', progress: 60, startTime: '08:00' },
    { id: 2, vehicle: '30B-67890', customer: 'Trần Thị B', service: 'Sửa phanh', status: 'waiting', progress: 0, startTime: '10:00' },
    { id: 3, vehicle: '31C-11111', customer: 'Lê Văn C', service: 'Kiểm tra hệ thống', status: 'inProgress', progress: 30, startTime: '09:00' }
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Kỹ thuật viên</h1>
          <p className={styles.subtitle}>Quản lý công việc kỹ thuật</p>
        </div>
        <button className={styles.btnPrimary}>⏰ Chấm công</button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard title="Đang làm" value={stats.inProgress} icon="🔧" color="orange" />
        <StatCard title="Hoàn thành hôm nay" value={stats.completed} icon="✅" color="green" trend="up" trendValue="+2" />
        <StatCard title="Chờ phụ tùng" value={stats.waiting} icon="⏳" color="blue" />
        <StatCard title="Tuần này" value={stats.weekTotal} icon="📊" color="purple" />
      </div>

      <div className={styles.mainCard}>
        <h2 className={styles.cardTitle}>🔧 Công việc hôm nay</h2>
        <div className={styles.taskList}>
          {tasks.map(task => (
            <div key={task.id} className={`${styles.taskItem} ${styles[task.status]}`}>
              <div className={styles.taskHeader}>
                <div className={styles.vehicleInfo}>
                  <span className={styles.vehicleNumber}>🚗 {task.vehicle}</span>
                  <span className={styles.customerName}>{task.customer}</span>
                </div>
                <span className={`${styles.statusBadge} ${styles[task.status]}`}>
                  {task.status === 'inProgress' ? '🔧 Đang xử lý' : '⏳ Chờ xử lý'}
                </span>
              </div>
              <div className={styles.taskService}>{task.service}</div>
              <div className={styles.taskProgress}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${task.progress}%` }}></div>
                </div>
                <span className={styles.progressText}>{task.progress}%</span>
              </div>
              <div className={styles.taskFooter}>
                <span className={styles.startTime}>Bắt đầu: {task.startTime}</span>
                <div className={styles.taskActions}>
                  {task.status === 'inProgress' && (
                    <>
                      <button className={styles.updateBtn}>📝 Cập nhật</button>
                      <button className={styles.completeBtn}>✓ Hoàn thành</button>
                    </>
                  )}
                  {task.status === 'waiting' && (
                    <button className={styles.startBtn}>▶ Bắt đầu</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.statsCard}>
        <h2 className={styles.cardTitle}>📊 Thống kê tuần này</h2>
        <div className={styles.weekStats}>
          <div className={styles.statBox}>
            <span className={styles.statIcon}>✅</span>
            <div className={styles.statValue}>45</div>
            <div className={styles.statLabel}>Công việc hoàn thành</div>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statIcon}>⏱️</span>
            <div className={styles.statValue}>38h</div>
            <div className={styles.statLabel}>Tổng thời gian</div>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statIcon}>⭐</span>
            <div className={styles.statValue}>4.9</div>
            <div className={styles.statLabel}>Đánh giá trung bình</div>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statIcon}>🎯</span>
            <div className={styles.statValue}>95%</div>
            <div className={styles.statLabel}>Hoàn thành đúng hạn</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
