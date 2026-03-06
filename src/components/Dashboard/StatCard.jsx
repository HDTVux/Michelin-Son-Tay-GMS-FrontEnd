import styles from './StatCard.module.css';

const StatCard = ({ title, value, icon, color, trend, trendValue }) => {
  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{icon}</span>
        </div>
        {trend && (
          <span className={`${styles.trend} ${styles[trend]}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.value}>{value}</h3>
        <p className={styles.title}>{title}</p>
      </div>
    </div>
  );
};

export default StatCard;
