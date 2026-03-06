import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './TechnicianDashboard.module.css';

const TechnicianDashboard = () => {
  const [dateRange, setDateRange] = useState('week');
  
  const kpis = {
    inProgress: 2,
    completed: 8,
    waiting: 3,
    avgRating: 4.9,
    progressChange: 0,
    completedChange: 2,
    waitingChange: -1,
    ratingChange: 0.1
  };

  const weeklyPerformance = [
    { day: 'T2', completed: 6, hours: 7.5 },
    { day: 'T3', completed: 8, hours: 8.0 },
    { day: 'T4', completed: 7, hours: 7.8 },
    { day: 'T5', completed: 9, hours: 8.2 },
    { day: 'T6', completed: 10, hours: 8.5 },
    { day: 'T7', completed: 5, hours: 6.0 },
    { day: 'CN', completed: 0, hours: 0 }
  ];

  const skillsData = [
    { skill: 'Động cơ', value: 90 },
    { skill: 'Hệ thống phanh', value: 85 },
    { skill: 'Điện', value: 75 },
    { skill: 'Gầm xe', value: 80 },
    { skill: 'Điều hòa', value: 70 }
  ];

  const tasks = [
    { id: 1, vehicle: '29A-12345', customer: 'Nguyễn Văn A', service: 'Thay nhớt động cơ', status: 'inProgress', progress: 60, startTime: '08:00', priority: 'normal' },
    { id: 2, vehicle: '30B-67890', customer: 'Trần Thị B', service: 'Sửa phanh', status: 'waiting', progress: 0, startTime: '10:00', priority: 'high' },
    { id: 3, vehicle: '31C-11111', customer: 'Lê Văn C', service: 'Kiểm tra hệ thống', status: 'inProgress', progress: 30, startTime: '09:00', priority: 'normal' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🔧 Dashboard Kỹ thuật viên</h1>
          <p className={styles.subtitle}>Quản lý công việc và hiệu suất cá nhân</p>
        </div>
        <div className={styles.filters}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filterSelect}>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
          </select>
          <button className={styles.clockBtn}>⏰ Chấm công</button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>🔧</span>
            <span className={`${styles.kpiTrend} ${styles.neutral}`}>{kpis.progressChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.inProgress}</div>
          <div className={styles.kpiLabel}>Đang làm</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>✅</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.completedChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.completed}</div>
          <div className={styles.kpiLabel}>Hoàn thành hôm nay</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⏳</span>
            <span className={`${styles.kpiTrend} ${styles.down}`}>↓ {Math.abs(kpis.waitingChange)}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.waiting}</div>
          <div className={styles.kpiLabel}>Chờ xử lý</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiIcon}>⭐</span>
            <span className={`${styles.kpiTrend} ${styles.up}`}>↑ {kpis.ratingChange}</span>
          </div>
          <div className={styles.kpiValue}>{kpis.avgRating}</div>
          <div className={styles.kpiLabel}>Đánh giá TB</div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>📊 Hiệu suất tuần này</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="completed" fill="#ea580c" name="Công việc hoàn thành" />
              <Bar yAxisId="right" dataKey="hours" fill="#3b82f6" name="Giờ làm việc" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>🎯 Kỹ năng chuyên môn</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={skillsData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="skill" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Kỹ năng" dataKey="value" stroke="#ea580c" fill="#ea580c" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.taskSection}>
        <h2 className={styles.sectionTitle}>🔧 Công việc hôm nay</h2>
        <div className={styles.taskList}>
          {tasks.map(task => (
            <div key={task.id} className={`${styles.taskCard} ${styles[task.priority]}`}>
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
    </div>
  );
};

export default TechnicianDashboard;
