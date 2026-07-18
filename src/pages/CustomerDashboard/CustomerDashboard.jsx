import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CustomerDashboard.module.css';
import RankBadge from '../../components/RankBadge/RankBadge.jsx';
import { fetchCustomerProfile, fetchMyRanking, fetchMyPointsHistory } from '../../services/customerService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCustomerToken = () =>
  localStorage.getItem('customerToken') || localStorage.getItem('authToken');

const decodeCustomerId = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.customerId ?? null;
  } catch {
    return null;
  }
};

const RANK_PROGRESS = {
  BRONZE:   { next: 500,  color: '#d97706' },
  SILVER:   { next: 2000, color: '#64748b' },
  GOLD:     { next: 5000, color: '#f59e0b' },
  PLATINUM: { next: null, color: '#22d3ee' },
};

const RANK_LABELS = { BRONZE: 'Đồng', SILVER: 'Bạc', GOLD: 'Vàng', PLATINUM: 'Bạch Kim' };

const REASON_LABELS = {
  SERVICE_PAYMENT: 'Thanh toán dịch vụ',
  MANUAL_ADJUST: 'Điều chỉnh thủ công',
  RESET: 'Reset hàng năm',
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const getStatusBadge = (status) => {
  const map = {
    completed: { text: 'Hoàn thành', cls: styles.statusCompleted },
    pending:   { text: 'Chờ xác nhận', cls: styles.statusPending },
    confirmed: { text: 'Đã xác nhận', cls: styles.statusConfirmed },
    cancelled: { text: 'Đã hủy', cls: styles.statusCancelled },
  };
  return map[status] || { text: status, cls: '' };
};

// ─── Component ────────────────────────────────────────────────────────────────

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingRank, setLoadingRank] = useState(true);
  const [rankError, setRankError] = useState(false);

  // KPIs vẫn dùng mock cho đến khi có API booking thống kê
  const kpis = {
    totalBookings: 12,
    completedBookings: 9,
    pendingBookings: 3,
    totalSpent: 25000000,
  };

  const chartData = {
    monthlyVisits: [
      { month: 'T10', value: 1 }, { month: 'T11', value: 2 }, { month: 'T12', value: 3 },
      { month: 'T1', value: 2 },  { month: 'T2', value: 2 },  { month: 'T3', value: 2 },
    ],
    serviceUsage: [
      { name: 'Thay lốp', value: 40, color: '#48bb78' },
      { name: 'Bảo dưỡng', value: 35, color: '#667eea' },
      { name: 'Sửa chữa', value: 15, color: '#ed8936' },
      { name: 'Khác', value: 10, color: '#4299e1' },
    ],
    spendingHistory: [
      { month: 'T10', value: 2000000 }, { month: 'T11', value: 3500000 }, { month: 'T12', value: 5000000 },
      { month: 'T1', value: 3000000 },  { month: 'T2', value: 4500000 },  { month: 'T3', value: 7000000 },
    ],
  };

  const recentBookings = [
    { id: 1, service: 'Thay lốp xe', date: '2024-03-15', time: '09:00', status: 'completed', price: 1200000 },
    { id: 2, service: 'Bảo dưỡng định kỳ', date: '2024-03-20', time: '10:30', status: 'pending', price: 2500000 },
    { id: 3, service: 'Kiểm tra phanh', date: '2024-03-10', time: '14:00', status: 'completed', price: 800000 },
    { id: 4, service: 'Thay dầu', date: '2024-02-28', time: '15:30', status: 'completed', price: 650000 },
    { id: 5, service: 'Cân xe', date: '2024-02-15', time: '11:00', status: 'completed', price: 200000 },
  ];

  // Load ranking từ API
  useEffect(() => {
    const load = async () => {
      const token = getCustomerToken();
      if (!token) { setLoadingRank(false); return; }

      const customerId = decodeCustomerId(token);
      if (!customerId) { setLoadingRank(false); return; }

      try {
        const [profileRes, rankRes, historyRes] = await Promise.allSettled([
          fetchCustomerProfile(token),
          fetchMyRanking(customerId, token),
          fetchMyPointsHistory(customerId, token, 0, 5),
        ]);

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value?.data || null);
        if (rankRes.status === 'fulfilled')    setRanking(rankRes.value?.data || null);
        if (historyRes.status === 'fulfilled') setHistory(historyRes.value?.data?.content || []);
        if (rankRes.status === 'rejected')     setRankError(true);
      } catch {
        setRankError(true);
      } finally {
        setLoadingRank(false);
      }
    };
    load();
  }, []);

  const maxVisitValue    = Math.max(...chartData.monthlyVisits.map((d) => d.value));
  const maxSpendingValue = Math.max(...chartData.spendingHistory.map((d) => d.value));

  // Progress bar tới hạng tiếp theo
  const renderRankProgress = () => {
    if (!ranking) return null;
    const rank = ranking.currentRank || 'BRONZE';
    const total = ranking.totalPoints || 0;
    const cfg = RANK_PROGRESS[rank];

    if (!cfg.next) {
      // PLATINUM — hiển thị đã đạt đỉnh
      return (
        <div className={styles.rankProgressWrap}>
          <div className={styles.rankProgressBar}>
            <div className={styles.rankProgressFill} style={{ width: '100%', background: cfg.color }} />
          </div>
          <p className={styles.rankProgressText}>Bạn đã đạt hạng cao nhất 🎉</p>
        </div>
      );
    }

    const prevMin = RANK_PROGRESS[
      ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].find((r, i, arr) => arr[i + 1] === rank) || 'BRONZE'
    ]?.next ?? 0;

    const pct = Math.min(100, Math.round(((total - (prevMin ?? 0)) / (cfg.next - (prevMin ?? 0))) * 100));

    return (
      <div className={styles.rankProgressWrap}>
        <div className={styles.rankProgressBar}>
          <div className={styles.rankProgressFill} style={{ width: `${pct}%`, background: cfg.color }} />
        </div>
        <p className={styles.rankProgressText}>
          Còn <strong>{ranking.pointsToNextRank?.toLocaleString()}</strong> điểm để lên hạng <strong>{ranking.nextRank}</strong>
        </p>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Bảng điều khiển</h1>
          <p className={styles.subtitle}>Tổng quan hoạt động của bạn</p>
        </div>
        <div className={styles.headerDate}>
          <span className={styles.dateIcon}>📅</span>
          <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Ranking Card ──────────────────────────────────────────────────────── */}
      <div className={styles.rankingSection}>
        {loadingRank ? (
          <div className={styles.rankCardSkeleton}>
            <div className={styles.skeletonLine} style={{ width: 120 }} />
            <div className={styles.skeletonLine} style={{ width: 200 }} />
          </div>
        ) : rankError || !ranking ? (
          <div className={styles.rankCard}>
            <div className={styles.rankCardLeft}>
              <span className={styles.rankCardTitle}>Hạng thành viên</span>
              <RankBadge rank="BRONZE" size="lg" />
              <p className={styles.rankNoData}>Chưa có dữ liệu tích điểm</p>
            </div>
          </div>
        ) : (
          <div className={`${styles.rankCard} ${styles[`rankCard_${ranking.currentRank?.toLowerCase()}`]}`}>
            {/* Left: rank info */}
            <div className={styles.rankCardLeft}>
              <span className={styles.rankCardTitle}>Hạng thành viên</span>
              <RankBadge rank={ranking.currentRank} size="lg" />
              {renderRankProgress()}
            </div>

            {/* Divider */}
            <div className={styles.rankDivider} />

            {/* Right: points */}
            <div className={styles.rankCardRight}>
              <div className={styles.rankStat}>
                <span className={styles.rankStatValue}>{(ranking.totalPoints || 0).toLocaleString()}</span>
                <span className={styles.rankStatLabel}>Điểm năm {ranking.pointsResetYear || new Date().getFullYear()}</span>
              </div>
              <div className={styles.rankStat}>
                <span className={styles.rankStatValue}>{(ranking.lifetimePoints || 0).toLocaleString()}</span>
                <span className={styles.rankStatLabel}>Tổng điểm tích lũy</span>
              </div>
              <button className={styles.rankHistoryBtn} onClick={() => navigate('/ranking-history')}>
                Xem lịch sử điểm →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs Grid ─────────────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiHeader}><span className={styles.kpiIcon}>📅</span></div>
          <div className={styles.kpiValue}>{kpis.totalBookings}</div>
          <div className={styles.kpiLabel}>Tổng lịch hẹn</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiHeader}><span className={styles.kpiIcon}>✓</span></div>
          <div className={styles.kpiValue}>{kpis.completedBookings}</div>
          <div className={styles.kpiLabel}>Hoàn thành</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <div className={styles.kpiHeader}><span className={styles.kpiIcon}>⏳</span></div>
          <div className={styles.kpiValue}>{kpis.pendingBookings}</div>
          <div className={styles.kpiLabel}>Chờ xác nhận</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
          <div className={styles.kpiHeader}><span className={styles.kpiIcon}>💰</span></div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.totalSpent)}</div>
          <div className={styles.kpiLabel}>Tổng chi tiêu</div>
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────────── */}
      <div className={styles.chartsGrid}>
        {/* Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Lượt đến theo tháng</h3>
            <span className={styles.chartPeriod}>6 tháng gần nhất</span>
          </div>
          <div className={styles.barChart}>
            {chartData.monthlyVisits.map((item, index) => (
              <div key={index} className={styles.barItem}>
                <div className={styles.barValue}>{item.value}</div>
                <div className={styles.barContainer}>
                  <div className={styles.bar} style={{ height: `${(item.value / maxVisitValue) * 100}%` }} />
                </div>
                <div className={styles.barLabel}>{item.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Tỷ lệ sử dụng dịch vụ</h3>
            <span className={styles.chartPeriod}>Theo năm</span>
          </div>
          <div className={styles.pieChartContainer}>
            <div className={styles.pieChart}>
              {chartData.serviceUsage.map((item, index) => {
                const total = chartData.serviceUsage.reduce((s, d) => s + d.value, 0);
                const pct = (item.value / total) * 100;
                let cum = 0;
                chartData.serviceUsage.slice(0, index).forEach((d) => { cum += (d.value / total) * 100; });
                return (
                  <div key={index} className={styles.pieSlice} style={{
                    background: `conic-gradient(${item.color} ${cum}% ${cum + pct}%, #f0f0f0 ${cum + pct}% 100%)`,
                  }} />
                );
              })}
              <div className={styles.pieCenter}>
                <span className={styles.pieCenterValue}>100%</span>
                <span className={styles.pieCenterLabel}>Tổng</span>
              </div>
            </div>
            <div className={styles.pieLegend}>
              {chartData.serviceUsage.map((item, index) => (
                <div key={index} className={styles.pieLegendItem}>
                  <span className={styles.pieLegendDot} style={{ background: item.color }} />
                  <span className={styles.pieLegendName}>{item.name}</span>
                  <span className={styles.pieLegendValue}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Lịch sử chi tiêu</h3>
            <span className={styles.chartPeriod}>6 tháng gần nhất</span>
          </div>
          <div className={styles.lineChart}>
            <div className={styles.lineChartYAxis}>
              <span>7M</span><span>5M</span><span>3M</span><span>1M</span><span>0</span>
            </div>
            <div className={styles.lineChartContent}>
              <svg className={styles.lineSvg} viewBox="0 0 300 120">
                <defs>
                  <linearGradient id="custLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#48bb78', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#48bb78', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path className={styles.lineArea}
                  d={`M0,${120 - (chartData.spendingHistory[0].value / maxSpendingValue) * 100} ${chartData.spendingHistory.map((d, i) => `L${(i + 1) * (300 / 6)},${120 - (d.value / maxSpendingValue) * 100}`).join(' ')} L${300},120 L0,120 Z`}
                  fill="url(#custLineGrad)" />
                <path className={styles.linePath}
                  d={`M0,${120 - (chartData.spendingHistory[0].value / maxSpendingValue) * 100} ${chartData.spendingHistory.map((d, i) => `L${(i + 1) * (300 / 6)},${120 - (d.value / maxSpendingValue) * 100}`).join(' ')}`}
                  fill="none" stroke="#48bb78" strokeWidth="3" />
                {chartData.spendingHistory.map((d, i) => (
                  <circle key={i} cx={(i + 1) * (300 / 6)} cy={120 - (d.value / maxSpendingValue) * 100} r="4" fill="#48bb78" />
                ))}
              </svg>
              <div className={styles.lineChartXAxis}>
                {chartData.spendingHistory.map((d, i) => <span key={i}>{d.month}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Points History ─────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Lịch sử tích điểm gần nhất</h2>
            <button className={styles.viewAllBtn} onClick={() => navigate('/ranking-history')}>Xem tất cả →</button>
          </div>
          <div className={styles.recentBookings}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Lý do</th>
                  <th>Điểm</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.historyId}>
                    <td>{new Date(h.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>{REASON_LABELS[h.reason] || h.reason}</td>
                    <td style={{ color: h.pointsDelta >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      {h.pointsDelta >= 0 ? '+' : ''}{h.pointsDelta}
                    </td>
                    <td>{h.amountSpent ? formatCurrency(h.amountSpent) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Bookings ───────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Lịch sử đặt lịch</h2>
          <button className={styles.viewAllBtn} onClick={() => navigate('/my-bookings')}>Xem tất cả →</button>
        </div>
        <div className={styles.recentBookings}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th><th>Dịch vụ</th><th>Ngày</th><th>Giờ</th><th>Giá tiền</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b, i) => {
                const badge = getStatusBadge(b.status);
                return (
                  <tr key={b.id} onClick={() => navigate(`/booking-detail/${b.id}`)}>
                    <td className={styles.sttCell}>{i + 1}</td>
                    <td>{b.service}</td>
                    <td>{new Date(b.date).toLocaleDateString('vi-VN')}</td>
                    <td>{b.time}</td>
                    <td className={styles.priceCell}>{formatCurrency(b.price)}</td>
                    <td><span className={`${styles.statusBadge} ${badge.cls}`}>{badge.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Truy cập nhanh</h2>
        <div className={styles.quickActions}>
          {[
            { icon: '📅', title: 'Đặt lịch ngay', desc: 'Đặt lịch dịch vụ bảo dưỡng xe', path: '/booking' },
            { icon: '📋', title: 'Lịch hẹn của tôi', desc: 'Xem lịch sử đặt lịch', path: '/my-bookings' },
            { icon: '👤', title: 'Tài khoản', desc: 'Quản lý thông tin cá nhân', path: '/user-profile' },
            { icon: '🔧', title: 'Dịch vụ', desc: 'Xem các dịch vụ của Michelin', path: '/services' },
          ].map((a) => (
            <div key={a.path} className={styles.actionCard} onClick={() => navigate(a.path)}>
              <div className={styles.actionIcon}>{a.icon}</div>
              <div className={styles.actionContent}>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
