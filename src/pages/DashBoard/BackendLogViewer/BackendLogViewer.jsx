import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Trash2, RefreshCw, Terminal } from 'lucide-react';
import { fetchBackendLogs } from '../../../services/backendLogService.js';
import styles from './BackendLogViewer.module.css';

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả level' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'WARN', label: 'WARN' },
  { value: 'INFO', label: 'INFO' },
  { value: 'DEBUG', label: 'DEBUG' },
];

const POLL_INTERVAL_MS = 3000;
const MAX_CLIENT_LOGS = 3000;

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

// Rút gọn tên logger dạng com.g42.platform.gms.chat.Service → c.g.p.g.chat.Service
const shortLogger = (logger) => {
  const parts = String(logger || '').split('.');
  if (parts.length <= 3) return logger || '';
  return parts.map((p, i) => (i < parts.length - 2 ? (p[0] || '') : p)).join('.');
};

export default function BackendLogViewer() {
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const lastIdRef = useRef(null);
  const consoleRef = useRef(null);
  const autoScrollRef = useRef(true);
  const filtersRef = useRef({ level: '', search: '' });
  filtersRef.current = { level, search };

  const loadLogs = useCallback(async ({ reset = false } = {}) => {
    try {
      const token = localStorage.getItem('authToken');
      const { level: lvl, search: q } = filtersRef.current;
      const res = await fetchBackendLogs(
        {
          level: lvl || undefined,
          search: q.trim() || undefined,
          afterId: reset ? undefined : lastIdRef.current ?? undefined,
        },
        token,
      );
      const payload = res?.data?.data ?? res?.data ?? res;
      const incoming = Array.isArray(payload?.logs) ? payload.logs : [];
      const lastId = payload?.lastId;
      if (lastId != null) lastIdRef.current = lastId;

      setLogs((prev) => {
        const merged = reset ? incoming : [...prev, ...incoming];
        return merged.length > MAX_CLIENT_LOGS ? merged.slice(merged.length - MAX_CLIENT_LOGS) : merged;
      });
      setError('');
    } catch (err) {
      setError(err?.message || 'Không thể tải log backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tải lần đầu + tải lại khi đổi bộ lọc (reset buffer phía client)
  useEffect(() => {
    setIsLoading(true);
    lastIdRef.current = null;
    const timer = setTimeout(() => loadLogs({ reset: true }), 250);
    return () => clearTimeout(timer);
  }, [level, search, loadLogs]);

  // Auto-refresh khi đang ở chế độ live
  useEffect(() => {
    if (!isLive) return undefined;
    const timer = setInterval(() => loadLogs(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLive, loadLogs]);

  // Tự cuộn xuống cuối khi có log mới (trừ khi user đã chủ động cuộn lên xem)
  useEffect(() => {
    if (!autoScrollRef.current) return;
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleConsoleScroll = () => {
    const el = consoleRef.current;
    if (!el) return;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const levelCounts = useMemo(() => {
    const counts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
    logs.forEach((log) => {
      if (counts[log.level] != null) counts[log.level] += 1;
    });
    return counts;
  }, [logs]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Terminal size={22} />
          <div>
            <h1 className={styles.title}>Log Backend</h1>
            <p className={styles.subtitle}>
              Log ứng dụng máy chủ theo thời gian thực (giữ tối đa 2000 dòng gần nhất)
            </p>
          </div>
        </div>
        <div className={styles.levelStats}>
          <span className={`${styles.statChip} ${styles.statError}`}>ERROR {levelCounts.ERROR}</span>
          <span className={`${styles.statChip} ${styles.statWarn}`}>WARN {levelCounts.WARN}</span>
          <span className={`${styles.statChip} ${styles.statInfo}`}>INFO {levelCounts.INFO}</span>
          <span className={`${styles.statChip} ${styles.statDebug}`}>DEBUG {levelCounts.DEBUG}</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select
          className={styles.levelSelect}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          aria-label="Lọc theo level"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm trong message / logger..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${isLive ? styles.actionBtnLive : ''}`}
            onClick={() => setIsLive((prev) => !prev)}
            title={isLive ? 'Tạm dừng auto-refresh' : 'Tiếp tục auto-refresh'}
          >
            {isLive ? <Pause size={15} /> : <Play size={15} />}
            {isLive ? 'Đang live' : 'Đã dừng'}
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => loadLogs()}
            title="Tải thêm log mới ngay"
          >
            <RefreshCw size={15} />
            Làm mới
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setLogs([])}
            title="Xóa log trên màn hình (không ảnh hưởng server)"
          >
            <Trash2 size={15} />
            Xóa màn hình
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div
        className={styles.console}
        ref={consoleRef}
        onScroll={handleConsoleScroll}
        role="log"
        aria-live="polite"
      >
        {isLoading ? (
          <div className={styles.consoleEmpty}>Đang tải log...</div>
        ) : logs.length === 0 ? (
          <div className={styles.consoleEmpty}>Chưa có log phù hợp bộ lọc.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`${styles.logLine} ${styles[`level${log.level}`] || ''}`}>
              <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
              <span className={styles.logLevel}>{log.level}</span>
              <span className={styles.logLogger} title={log.logger}>{shortLogger(log.logger)}</span>
              <span className={styles.logMessage}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
