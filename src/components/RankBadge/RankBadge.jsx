import styles from './RankBadge.module.css';

const RANK_CONFIG = {
  BRONZE:   { label: 'Đồng',     emoji: '🥉', className: 'bronze' },
  SILVER:   { label: 'Bạc',      emoji: '🥈', className: 'silver' },
  GOLD:     { label: 'Vàng',     emoji: '🥇', className: 'gold'   },
  PLATINUM: { label: 'Bạch Kim', emoji: '💎', className: 'platinum' },
  DIAMOND:  { label: 'Kim Cương', emoji: '👑', className: 'diamond' },
};

/**
 * Badge hiển thị hạng khách hàng.
 * @param {string} rank - BRONZE | SILVER | GOLD | PLATINUM
 * @param {boolean} showLabel - hiển thị nhãn chữ
 */
const RankBadge = ({ rank, showLabel = true, size = 'md' }) => {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.BRONZE;
  return (
    <span className={`${styles.badge} ${styles[config.className]} ${styles[size]}`}>
      <span className={styles.emoji}>{config.emoji}</span>
      {showLabel && <span className={styles.label}>{config.label}</span>}
    </span>
  );
};

export default RankBadge;
