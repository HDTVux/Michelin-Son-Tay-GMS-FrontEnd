import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RankingHistory.module.css';
import RankBadge from '../../components/RankBadge/RankBadge.jsx';
import { fetchMyRanking, fetchMyPointsHistory } from '../../services/customerService.js';

const getToken = () => localStorage.getItem('customerToken') || localStorage.getItem('authToken');

const decodeCustomerId = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.customerId ?? null;
  } catch {
    return null;
  }
};

const REASON_LABELS = {
  SERVICE_PAYMENT: '🔧 Thanh toán dịch vụ',
  MANUAL_ADJUST:   '✏️ Điều chỉnh thủ công',
  RESET:           '🔄 Reset hàng năm',
};

const RANK_THRESHOLDS = [
  { rank: 'BRONZE',   min: 0,    color: '#f0b96b' },
  { rank: 'SILVER',   min: 500,  color: '#94a3b8' },
  { rank: 'GOLD',     min: 2000, color: '#f59e0b' },
  { rank: 'PLATINUM', min: 5000, color: '#22d3ee' },
];

const formatCurrency = (v) =>
  v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—';

const formatDate = (dt) =>
  dt ? new Date(dt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const RankingHistory = () => {
  const navigate = useNavigate();

  const [ranking, setRanking] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const token = getToken();
  const customerId = token ? decodeCustomerId(token) : null;

  // Load ranking data
  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    fetchMyRanking(customerId, token)
      .then((res) => setRanking(res?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId, token]);

  // Load history page
  const loadHistory = useCallback(async (pageNum) => {
    if (!customerId) return;
    if (pageNum === 0) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetchMyPointsHistory(customerId, token, pageNum, 15);
      const data = res?.data;
      setHistory((prev) => pageNum === 0 ? (data?.content || []) : [...prev, ...(data?.content || [])]);
      setTotalPages(data?.totalPages || 0);
      setPage(pageNum);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [customerId, token]);

  useEffect(() => { loadHistory(0); }, [loadHistory]);

  // Progress bar
  const renderProgress = () => {
    if (!ranking) return null;
    const rank = ranking.currentRank || 'BRONZE';
    const total = ranking.totalPoints || 0;

    if (rank === 'PLATINUM') {
      return (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '100%', background: '#22d3ee' }} />
          </div>
          <p className={styles.progressText}>🎉 Bạn đã đạt hạng cao nhất — Bạch Kim</p>
        </div>
      );
    }

    const thresholds = RANK_THRESHOLDS;
    const cur = thresholds.find((t) => t.rank === rank);
    const next = thresholds[thresholds.indexOf(cur) + 1];
    const pct = Math.min(100, Math.round(((total - cur.min) / (next.min - cur.min)) * 100));

    return (
      <div className={styles.progressSection}>
        <div className={styles.progressLabels}>
          <span>{cur.min.toLocaleString()} điểm</span>
          <span>{next.min.toLocaleString()} điểm</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%`, background: next.color }} />
        </div>
        <p className={styles.progressText}>
          Còn <strong>{ranking.pointsToNextRank?.toLocaleString()}</strong> điểm để lên hạng <strong>{ranking.nextRank}</strong>
        </p>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Quay lại</button>
        <div>
          <h1 className={styles.title}>Tích điểm & Hạng thành viên</h1>
          <p className={styles.subtitle}>Theo dõi điểm tích lũy và lịch sử hoạt động của bạn</p>
        </div>
      </div>

      {/* ── Ranking Card ──────────────────────────────────────────────────────── */}
      {loading && !ranking ? (
        <div className={styles.skeletonCard} />
      ) : ranking ? (
        <div className={`${styles.rankCard} ${styles[`rank_${ranking.currentRank?.toLowerCase()}`]}`}>
          {/* Thresholds timeline */}
          <div className={styles.rankTimeline}>
            {RANK_THRESHOLDS.map((t) => (
              <div key={t.rank} className={`${styles.rankStep} ${ranking.currentRank === t.rank ? styles.rankStepActive : ''} ${RANK_THRESHOLDS.findIndex(r => r.rank === ranking.currentRank) >= RANK_THRESHOLDS.findIndex(r => r.rank === t.rank) ? styles.rankStepDone : ''}`}>
                <div className={styles.rankStepDot} style={{ background: t.color }} />
                <RankBadge rank={t.rank} size="sm" />
                <span className={styles.rankStepMin}>{t.min.toLocaleString()}đ</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className={styles.rankStats}>
            <div className={styles.rankStatItem}>
              <span className={styles.rankStatVal}>{(ranking.totalPoints || 0).toLocaleString()}</span>
              <span className={styles.rankStatLbl}>Điểm năm {ranking.pointsResetYear}</span>
            </div>
            <div className={styles.rankStatDivider} />
            <div className={styles.rankStatItem}>
              <span className={styles.rankStatVal}>{(ranking.lifetimePoints || 0).toLocaleString()}</span>
              <span className={styles.rankStatLbl}>Tổng điểm toàn thời gian</span>
            </div>
            <div className={styles.rankStatDivider} />
            <div className={styles.rankStatItem}>
              <RankBadge rank={ranking.currentRank} size="md" />
              <span className={styles.rankStatLbl}>Hạng hiện tại</span>
            </div>
          </div>

          {/* Progress */}
          {renderProgress()}

          {/* Note */}
          <p className={styles.rankNote}>
            ℹ️ Điểm trong năm sẽ được làm mới vào ngày 01/01 năm sau nếu bạn không sử dụng dịch vụ trong 12 tháng.
          </p>
        </div>
      ) : (
        <div className={styles.emptyCard}>Không có dữ liệu tích điểm</div>
      )}

      {/* ── Earning Rules ──────────────────────────────────────────────────────── */}
      <div className={styles.rulesCard}>
        <h2 className={styles.rulesTitle}>Cách tích điểm</h2>
        <div className={styles.rulesGrid}>
          <div className={styles.ruleItem}>
            <span className={styles.ruleIcon}>💰</span>
            <div>
              <strong>Thanh toán dịch vụ</strong>
              <p>1 điểm / 1.000 VNĐ (x hệ số hạng)</p>
            </div>
          </div>
          <div className={styles.ruleItem}>
            <span className={styles.ruleIcon}>🔧</span>
            <div>
              <strong>Mỗi lượt sử dụng dịch vụ</strong>
              <p>+10 đến +30 điểm bonus (theo hạng)</p>
            </div>
          </div>
          <div className={styles.ruleItem}>
            <span className={styles.ruleIcon}>⬆️</span>
            <div>
              <strong>Hệ số nhân điểm theo hạng</strong>
              <p>Đồng ×1.0 · Bạc ×1.2 · Vàng ×1.5 · Bạch Kim ×2.0</p>
            </div>
          </div>
          <div className={styles.ruleItem}>
            <span className={styles.ruleIcon}>🔄</span>
            <div>
              <strong>Reset hàng năm</strong>
              <p>Điểm năm = 0 nếu không dùng dịch vụ trong 12 tháng</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── History Table ──────────────────────────────────────────────────────── */}
      <div className={styles.historySection}>
        <h2 className={styles.sectionTitle}>Lịch sử tích điểm</h2>
        {loading ? (
          <div className={styles.loadingMsg}>Đang tải...</div>
        ) : history.length === 0 ? (
          <div className={styles.emptyMsg}>Chưa có lịch sử tích điểm</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Lý do</th>
                    <th>Booking</th>
                    <th>Số tiền</th>
                    <th>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.historyId}>
                      <td>{formatDate(h.createdAt)}</td>
                      <td>{REASON_LABELS[h.reason] || h.reason}</td>
                      <td>{h.refBookingId ? `#${h.refBookingId}` : '—'}</td>
                      <td>{formatCurrency(h.amountSpent)}</td>
                      <td className={h.pointsDelta >= 0 ? styles.positive : styles.negative}>
                        {h.pointsDelta >= 0 ? '+' : ''}{h.pointsDelta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {page + 1 < totalPages && (
              <button
                className={styles.loadMoreBtn}
                onClick={() => loadHistory(page + 1)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Đang tải...' : 'Xem thêm'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RankingHistory;
