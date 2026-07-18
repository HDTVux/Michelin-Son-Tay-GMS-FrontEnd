import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import {
  ACTION_LABELS,
  MODULE_LABELS,
  ROLE_LABELS,
  SEVERITY_LABELS,
  exportSystemLogs,
  fetchSystemLogStats,
  fetchSystemLogsPaged,
} from '../../../services/systemLogService.js';
import styles from './SystemLogManagement.module.css';

const PAGE_SIZE = 10;

function pad2(number) {
  return String(number).padStart(2, '0');
}

function formatTimestampVi(dateTimeString) {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) return '-';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function getSeverityClass(severityCode) {
  if (severityCode === 'CRITICAL') return styles.sevCritical;
  if (severityCode === 'WARNING') return styles.sevWarning;
  return styles.sevInfo;
}

function getActionToneClass(log) {
  if (log?.action === 'DELETE' || log?.severity === 'CRITICAL') return styles.tone_critical;
  if (log?.action === 'PRICE_OVERRIDE' || log?.severity === 'WARNING') return styles.tone_warning;
  return styles.tone_info;
}

const EMPTY_FILTER = { startDate: '', endDate: '', role: '', action: '', severity: '' };

function buildApiParams(filter, search) {
  return {
    startDate: filter.startDate ? `${filter.startDate}T00:00:00` : '',
    endDate: filter.endDate ? `${filter.endDate}T23:59:59` : '',
    role: filter.role,
    action: filter.action,
    severity: filter.severity,
    search,
  };
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

  const [filterDraft, setFilterDraft] = useState(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_FILTER);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState([]);
  const [pageMeta, setPageMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [stats, setStats] = useState({ total: 0, loginFailedCount: 0, dataChangeCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [detailLog, setDetailLog] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = buildApiParams(appliedFilter, appliedSearch);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetchSystemLogsPaged({ ...params, page, size: PAGE_SIZE }),
        fetchSystemLogStats(params),
      ]);
      const pageData = listRes?.data ?? listRes;
      setLogs(Array.isArray(pageData?.content) ? pageData.content : []);
      setPageMeta({
        totalPages: Number(pageData?.totalPages) || 0,
        totalElements: Number(pageData?.totalElements) || 0,
      });
      const statsData = statsRes?.data ?? statsRes;
      setStats({
        total: Number(statsData?.total) || 0,
        loginFailedCount: Number(statsData?.loginFailedCount) || 0,
        dataChangeCount: Number(statsData?.dataChangeCount) || 0,
      });
    } catch (err) {
      setError(err?.message || 'Không tải được nhật ký hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilter, appliedSearch, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nếu tổng số trang giảm (do filter), kéo page về trang cuối hợp lệ
  useEffect(() => {
    if (pageMeta.totalPages > 0 && page >= pageMeta.totalPages) {
      setPage(pageMeta.totalPages - 1);
    }
  }, [pageMeta.totalPages, page]);

  const onApplyFilter = () => {
    setPage(0);
    setAppliedFilter(filterDraft);
  };

  const onReset = () => {
    setFilterDraft(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    setSearchDraft('');
    setAppliedSearch('');
    setPage(0);
  };

  const onSearch = (e) => {
    e?.preventDefault?.();
    setPage(0);
    setAppliedSearch(searchDraft);
  };

  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportSystemLogs(buildApiParams(appliedFilter, appliedSearch));
      toast.success('Đã xuất dữ liệu nhật ký (CSV).');
    } catch (err) {
      toast.error(err?.message || 'Xuất dữ liệu nhật ký thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = pageMeta.totalPages || 1;

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
          <div className={styles.statValue}>{stats.loginFailedCount.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Số lần thay đổi dữ liệu</div>
          <div className={styles.statValue}>{stats.dataChangeCount.toLocaleString('vi-VN')}</div>
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
              <option value="">Tất cả</option>
              {Object.entries(ROLE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.actionType}>Loại hành động</label>
            <select
              id={controlIds.actionType}
              value={filterDraft.action}
              onChange={(e) => setFilterDraft((p) => ({ ...p, action: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {Object.entries(ACTION_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
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
              <option value="">Tất cả</option>
              {Object.entries(SEVERITY_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
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
              placeholder="Tìm theo tên, mô tả, mã đối tượng"
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
              {loading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    {error}{' '}
                    <button type="button" className="ui-btn" onClick={loadData}>
                      Thử lại
                    </button>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    Không có nhật ký phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.logId}>
                    <td className={styles.mono}>{formatTimestampVi(log.createdAt)}</td>
                    <td>{log.actorName || 'Không rõ'}</td>
                    <td>{ROLE_LABELS[log.actorRole] || log.actorRole || '-'}</td>
                    <td>
                      <span className={`${styles.severityBadge} ${getSeverityClass(log.severity)}`}>
                        {SEVERITY_LABELS[log.severity] || log.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.actionBadge} ${getActionToneClass(log)}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <div className={styles.subText}>{MODULE_LABELS[log.module] || log.module}</div>
                    </td>
                    <td className={styles.mono}>
                      {log.targetType || log.targetId
                        ? `${log.targetType || ''}${log.targetType && log.targetId ? ': ' : ''}${log.targetId || ''}`
                        : '-'}
                    </td>
                    <td>
                      <div className={styles.mono}>{log.ipAddress || '-'}</div>
                      <div className={styles.subText}>{log.userAgent ? log.userAgent.slice(0, 40) : ''}</div>
                    </td>
                    <td>
                      <button type="button" className="ui-btn" onClick={() => setDetailLog(log)}>
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footerRow}>
          <div className={styles.pagination}>
            <button
              type="button"
              className="ui-btn"
              disabled={page <= 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trang trước
            </button>
            <span className={styles.pageInfo}>
              Trang {page + 1} / {totalPages} · {pageMeta.totalElements.toLocaleString('vi-VN')} bản ghi
            </span>
            <button
              type="button"
              className="ui-btn"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>

          <div className="ui-actions ui-actions--end">
            <button type="button" className="ui-btn ui-btn--primary" onClick={onExport} disabled={exporting}>
              {exporting ? 'Đang xuất...' : 'Xuất dữ liệu nhật ký (CSV)'}
            </button>
          </div>
        </div>
      </div>

      {detailLog && (
        <div className={styles.modalOverlay} onClick={() => setDetailLog(null)} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết nhật ký"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Chi tiết nhật ký #{detailLog.logId}</h3>
              <button type="button" className="ui-btn" onClick={() => setDetailLog(null)}>
                Đóng
              </button>
            </div>
            <dl className={styles.detailList}>
              <dt>Thời gian</dt>
              <dd>{formatTimestampVi(detailLog.createdAt)}</dd>
              <dt>Người dùng</dt>
              <dd>
                {detailLog.actorName || 'Không rõ'}
                {detailLog.actorStaffId ? ` (mã NV: ${detailLog.actorStaffId})` : ''}
              </dd>
              <dt>Vai trò</dt>
              <dd>{ROLE_LABELS[detailLog.actorRole] || detailLog.actorRole || '-'}</dd>
              <dt>Hành động</dt>
              <dd>{ACTION_LABELS[detailLog.action] || detailLog.action}</dd>
              <dt>Phân hệ</dt>
              <dd>{MODULE_LABELS[detailLog.module] || detailLog.module}</dd>
              <dt>Mức độ</dt>
              <dd>{SEVERITY_LABELS[detailLog.severity] || detailLog.severity}</dd>
              <dt>Mô tả</dt>
              <dd>{detailLog.description || '-'}</dd>
              <dt>Đối tượng</dt>
              <dd>
                {detailLog.targetType || detailLog.targetId
                  ? `${detailLog.targetType || ''}${detailLog.targetType && detailLog.targetId ? ': ' : ''}${detailLog.targetId || ''}`
                  : '-'}
              </dd>
              <dt>Địa chỉ IP</dt>
              <dd className={styles.mono}>{detailLog.ipAddress || '-'}</dd>
              <dt>Trình duyệt / Thiết bị</dt>
              <dd className={styles.breakAll}>{detailLog.userAgent || '-'}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
