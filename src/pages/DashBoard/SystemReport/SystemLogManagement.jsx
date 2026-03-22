import { useMemo, useState } from 'react';

import styles from './SystemLogManagement.module.css';

const SEVERITY = {
  INFO: 'Thông tin',
  WARNING: 'Cảnh báo',
  CRITICAL: 'Nghiêm trọng',
};

const ACTION_TYPES = {
  LOGIN: 'Đăng nhập',
  FAILED_LOGIN: 'Đăng nhập thất bại',
  VIEW: 'Xem dữ liệu',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  PERMISSION: 'Phân quyền',
  PRICE_OVERRIDE: 'Ghi đè giá',
};

const SAMPLE_LOGS = [
  {
    id: 'log-001',
    timestamp: '2026-03-22T10:15:30',
    userName: 'John Doe',
    role: 'Quản trị',
    severity: SEVERITY.INFO,
    actionType: ACTION_TYPES.LOGIN,
    actionPerformed: 'Đăng nhập thành công',
    module: 'Xác thực',
    targetId: 'Người dùng: JohnDoe',
    ipAddress: '192.168.1.10',
    device: 'Chrome (Windows)',
  },
  {
    id: 'log-002',
    timestamp: '2026-03-22T10:17:02',
    userName: 'Jane Doe',
    role: 'Người dùng',
    severity: SEVERITY.INFO,
    actionType: ACTION_TYPES.VIEW,
    actionPerformed: 'Xem hồ sơ',
    module: 'Hồ sơ',
    targetId: 'Người dùng: JaneDoe',
    ipAddress: '192.168.1.21',
    device: 'Safari (iOS)',
  },
  {
    id: 'log-003',
    timestamp: '2026-03-22T10:20:11',
    userName: 'Peter Pan',
    role: 'Biên tập',
    severity: SEVERITY.WARNING,
    actionType: ACTION_TYPES.UPDATE,
    actionPerformed: 'Chỉnh sửa tài liệu',
    module: 'Tài liệu',
    targetId: 'Tài liệu: POL-2026-03',
    ipAddress: '10.0.2.15',
    device: 'Edge (Windows)',
  },
  {
    id: 'log-004',
    timestamp: '2026-03-22T10:22:45',
    userName: 'Alice',
    role: 'Người xem',
    severity: SEVERITY.INFO,
    actionType: ACTION_TYPES.VIEW,
    actionPerformed: 'Xem báo cáo',
    module: 'Báo cáo',
    targetId: 'Báo cáo: System-Weekly',
    ipAddress: '172.16.0.8',
    device: 'Chrome (macOS)',
  },
  {
    id: 'log-005',
    timestamp: '2026-03-22T10:25:09',
    userName: 'VuHDT',
    role: 'Quản trị',
    severity: SEVERITY.CRITICAL,
    actionType: ACTION_TYPES.PERMISSION,
    actionPerformed: 'Đổi quyền thành Admin',
    module: 'Người dùng',
    targetId: 'Người dùng: TranMinhK',
    ipAddress: '192.168.5.9',
    device: 'Chrome (Windows)',
  },
  {
    id: 'log-006',
    timestamp: '2026-03-22T10:28:58',
    userName: 'Hệ thống',
    role: 'Hệ thống',
    severity: SEVERITY.CRITICAL,
    actionType: ACTION_TYPES.PRICE_OVERRIDE,
    actionPerformed: 'Ghi đè giá (BR010)',
    module: 'Danh mục',
    targetId: 'Dịch vụ: OilChange#101',
    ipAddress: '127.0.0.1',
    device: 'Job Runner',
  },
  {
    id: 'log-007',
    timestamp: '2026-03-22T10:33:41',
    userName: 'John Doe',
    role: 'Quản trị',
    severity: SEVERITY.CRITICAL,
    actionType: ACTION_TYPES.DELETE,
    actionPerformed: 'Đã xóa phiếu',
    module: 'Phiếu',
    targetId: 'Phiếu #8899',
    ipAddress: '192.168.1.10',
    device: 'Chrome (Windows)',
  },
  {
    id: 'log-008',
    timestamp: '2026-03-22T10:35:10',
    userName: 'Không rõ',
    role: 'Khách',
    severity: SEVERITY.WARNING,
    actionType: ACTION_TYPES.FAILED_LOGIN,
    actionPerformed: 'Đăng nhập thất bại',
    module: 'Xác thực',
    targetId: 'Người dùng: (không rõ)',
    ipAddress: '203.0.113.88',
    device: 'Android WebView',
  },
];

function pad2(number) {
  return String(number).padStart(2, '0');
}

function formatTimestampVi(dateTimeString) {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) return '-';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function getActionTone(log) {
  const action = String(log?.actionPerformed || '').toLowerCase();
  const actionType = String(log?.actionType || '').toLowerCase();

  if (action.includes('xóa') || actionType.includes('xóa')) return 'critical';
  if (action.includes('ghi đè giá') || action.includes('br010') || actionType.includes('ghi đè')) return 'warning';

  if (log?.severity === SEVERITY.CRITICAL) return 'critical';
  if (log?.severity === SEVERITY.WARNING) return 'warning';
  return 'info';
}

function toDayStart(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDayEnd(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getSeverityClass(severity, styles) {
  if (severity === SEVERITY.CRITICAL) return styles.sevCritical;
  if (severity === SEVERITY.WARNING) return styles.sevWarning;
  return styles.sevInfo;
}

function matchesDateRange(log, start, end) {
  if (!start && !end) return true;
  const t = new Date(log.timestamp);
  if (Number.isNaN(t.getTime())) return false;
  if (start && t < start) return false;
  if (end && t > end) return false;
  return true;
}

function matchesSelectFilters(log, filters) {
  const isAll = (value) => value === 'Tất cả' || value === 'All' || value == null || value === '';

  if (!isAll(filters.role) && log.role !== filters.role) return false;
  if (!isAll(filters.actionType) && log.actionType !== filters.actionType) return false;
  if (!isAll(filters.severity) && log.severity !== filters.severity) return false;
  return true;
}

function matchesSearch(log, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${log.userName} ${log.role} ${log.actionPerformed} ${log.module} ${log.targetId} ${log.ipAddress} ${log.device}`
    .toLowerCase()
    .trim();
  return hay.includes(q);
}

export default function SystemLogManagement() {
  const controlIds = useMemo(
    () => ({
      startDate: 'syslog-start-date',
      endDate: 'syslog-end-date',
      role: 'syslog-role',
      actionType: 'syslog-action-type',
      severity: 'syslog-severity',
    }),
    [],
  );

  const [filterDraft, setFilterDraft] = useState({
    startDate: '',
    endDate: '',
    role: 'Tất cả',
    actionType: 'Tất cả',
    severity: 'Tất cả',
  });
  const [appliedFilter, setAppliedFilter] = useState(filterDraft);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const roles = useMemo(() => {
    const unique = Array.from(new Set(SAMPLE_LOGS.map((l) => l.role).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return ['Tất cả', ...unique];
  }, []);

  const actionTypes = useMemo(() => {
    const unique = Array.from(new Set(SAMPLE_LOGS.map((l) => l.actionType).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return ['Tất cả', ...unique];
  }, []);

  const severities = useMemo(() => ['Tất cả', SEVERITY.INFO, SEVERITY.WARNING, SEVERITY.CRITICAL], []);

  const actionToneClassMap = useMemo(
    () => ({
      info: styles.tone_info,
      warning: styles.tone_warning,
      critical: styles.tone_critical,
    }),
    [],
  );

  const filteredLogs = useMemo(() => {
    const start = toDayStart(appliedFilter.startDate);
    const end = toDayEnd(appliedFilter.endDate);
    return SAMPLE_LOGS.filter((log) => {
      if (!matchesDateRange(log, start, end)) return false;
      if (!matchesSelectFilters(log, appliedFilter)) return false;
      if (!matchesSearch(log, appliedSearch)) return false;
      return true;
    });
  }, [appliedFilter, appliedSearch]);

  const stats = useMemo(() => {
    const total = SAMPLE_LOGS.length;
    const failedLoginAttempts = SAMPLE_LOGS.filter((l) => l.actionType === ACTION_TYPES.FAILED_LOGIN).length;
    const dataModifications = SAMPLE_LOGS.filter((l) =>
      [ACTION_TYPES.UPDATE, ACTION_TYPES.DELETE, ACTION_TYPES.PERMISSION, ACTION_TYPES.PRICE_OVERRIDE].includes(
        l.actionType,
      ),
    ).length;
    return { total, failedLoginAttempts, dataModifications };
  }, []);

  const onApplyFilter = () => {
    setAppliedFilter(filterDraft);
  };

  const onReset = () => {
    const reset = { startDate: '', endDate: '', role: 'Tất cả', actionType: 'Tất cả', severity: 'Tất cả' };
    setFilterDraft(reset);
    setAppliedFilter(reset);
    setSearchDraft('');
    setAppliedSearch('');
  };

  const onSearch = (e) => {
    e?.preventDefault?.();
    setAppliedSearch(searchDraft);
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Nhật ký hệ thống &amp; Tạo báo cáo</h2>

      <div className={styles.statsGrid}>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Tổng hoạt động hệ thống</div>
          <div className={styles.statValue}>{stats.total.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Số lần đăng nhập thất bại</div>
          <div className={styles.statValue}>{stats.failedLoginAttempts.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Số lần thay đổi dữ liệu</div>
          <div className={styles.statValue}>{stats.dataModifications.toLocaleString('vi-VN')}</div>
        </div>
      </div>

      <div className={`ui-card ${styles.filterCard}`}>
        <div className={styles.filterGrid}>
          <div className={styles.dateRange}>
            <div className="ui-field">
              <label htmlFor={controlIds.startDate}>Khoảng thời gian</label>
              <div className={styles.dateRow}>
                <input
                  id={controlIds.startDate}
                  type="date"
                  value={filterDraft.startDate}
                  onChange={(e) => setFilterDraft((p) => ({ ...p, startDate: e.target.value }))}
                  aria-label="Từ ngày"
                />
                <span className={styles.toText}>đến</span>
                <input
                  id={controlIds.endDate}
                  type="date"
                  value={filterDraft.endDate}
                  onChange={(e) => setFilterDraft((p) => ({ ...p, endDate: e.target.value }))}
                  aria-label="Đến ngày"
                />
              </div>
            </div>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.role}>Vai trò người dùng</label>
            <select
              id={controlIds.role}
              value={filterDraft.role}
              onChange={(e) => setFilterDraft((p) => ({ ...p, role: e.target.value }))}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.actionType}>Loại hành động</label>
            <select
              id={controlIds.actionType}
              value={filterDraft.actionType}
              onChange={(e) => setFilterDraft((p) => ({ ...p, actionType: e.target.value }))}
            >
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.severity}>Mức độ nghiêm trọng</label>
            <select
              id={controlIds.severity}
              value={filterDraft.severity}
              onChange={(e) => setFilterDraft((p) => ({ ...p, severity: e.target.value }))}
            >
              {severities.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterActions}>
            <button type="button" className="ui-btn ui-btn--primary" onClick={onApplyFilter}>
              Áp dụng lọc
            </button>
            <button type="button" className="ui-btn" onClick={onReset}>
              Đặt lại
            </button>
          </div>

          <form className={styles.searchArea} onSubmit={onSearch}>
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              aria-label="Tìm kiếm"
            />
            <button type="submit" className="ui-btn ui-btn--primary">
              Tìm kiếm
            </button>
          </form>
        </div>
      </div>

      <div className={`ui-card ${styles.tableCard}`}>
        <div className="ui-scroll-wrapper">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Mức độ</th>
                <th>Hành động</th>
                <th>Đối tượng tác động</th>
                <th>IP &amp; Thiết bị</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    Không có nhật ký phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionTone = getActionTone(log);
                  const actionToneClass = actionToneClassMap[actionTone] || styles.tone_info;
                  const severityClass = getSeverityClass(log.severity, styles);
                  return (
                    <tr key={log.id}>
                      <td className={styles.mono}>{formatTimestampVi(log.timestamp)}</td>
                      <td>{log.userName}</td>
                      <td>{log.role}</td>
                      <td>
                        <span className={`${styles.severityBadge} ${severityClass}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.actionBadge} ${actionToneClass}`}>
                          {log.actionPerformed}
                        </span>
                        <div className={styles.subText}>{log.module}</div>
                      </td>
                      <td className={styles.mono}>{log.targetId}</td>
                      <td>
                        <div className={styles.mono}>{log.ipAddress}</div>
                        <div className={styles.subText}>{log.device}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ui-btn"
                          onClick={() => console.log('Xem chi tiết:', log)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="ui-actions ui-actions--end">
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => console.log('Tạo báo cáo')}>
            Tạo báo cáo
          </button>
          <button type="button" className="ui-btn" onClick={() => console.log('Xuất dữ liệu nhật ký')}>
            Xuất dữ liệu nhật ký
          </button>
        </div>
      </div>
    </div>
  );
}