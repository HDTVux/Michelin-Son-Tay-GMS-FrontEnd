import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import {
  CATEGORY_LABELS,
  MODULE_LABELS,
  REPORTER_TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  exportBugReports,
  fetchBugReportStats,
  fetchBugReportsPaged,
  updateBugReport,
} from '../../../services/bugReportService.js';
import { useBugReportStream } from '../../../hooks/useBugReportStream.js';
import { playNotificationSoundByType } from '../../../utils/notificationSound.js';
import styles from './BugReportManagement.module.css';

const PAGE_SIZE = 10;

function pad2(number) {
  return String(number).padStart(2, '0');
}

function formatTimestampVi(dateTimeString) {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) return '-';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function getSeverityClass(severity) {
  if (severity === 'CRITICAL') return styles.sevCritical;
  if (severity === 'HIGH') return styles.sevHigh;
  if (severity === 'MEDIUM') return styles.sevMedium;
  return styles.sevLow;
}

function getStatusClass(status) {
  if (status === 'NEW') return styles.statusNew;
  if (status === 'IN_PROGRESS') return styles.statusInProgress;
  if (status === 'ACKNOWLEDGED') return styles.statusAcknowledged;
  if (status === 'RESOLVED') return styles.statusResolved;
  return styles.statusRejected;
}

const EMPTY_FILTER = {
  startDate: '',
  endDate: '',
  status: '',
  severity: '',
  category: '',
  module: '',
  reporterType: '',
};

function buildApiParams(filter, search) {
  return {
    startDate: filter.startDate ? `${filter.startDate}T00:00:00` : '',
    endDate: filter.endDate ? `${filter.endDate}T23:59:59` : '',
    status: filter.status,
    severity: filter.severity,
    category: filter.category,
    module: filter.module,
    reporterType: filter.reporterType,
    search,
  };
}

export default function BugReportManagement() {
  const controlIds = useMemo(
    () => ({
      startDate: 'bug-start-date',
      endDate: 'bug-end-date',
      status: 'bug-status',
      severity: 'bug-severity',
      category: 'bug-category',
      module: 'bug-module',
      reporterType: 'bug-reporter-type',
    }),
    [],
  );

  const [filterDraft, setFilterDraft] = useState(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_FILTER);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [page, setPage] = useState(0);
  const [reports, setReports] = useState([]);
  const [pageMeta, setPageMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [stats, setStats] = useState({
    total: 0,
    newCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    criticalOpenCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [handling, setHandling] = useState({ status: 'NEW', assignedStaffName: '', resolutionNote: '' });
  const [saving, setSaving] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = buildApiParams(appliedFilter, appliedSearch);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetchBugReportsPaged({ ...params, page, size: PAGE_SIZE }),
        fetchBugReportStats(params),
      ]);
      const pageData = listRes?.data ?? listRes;
      setReports(Array.isArray(pageData?.content) ? pageData.content : []);
      setPageMeta({
        totalPages: Number(pageData?.totalPages) || 0,
        totalElements: Number(pageData?.totalElements) || 0,
      });
      const statsData = statsRes?.data ?? statsRes;
      setStats({
        total: Number(statsData?.total) || 0,
        newCount: Number(statsData?.newCount) || 0,
        inProgressCount: Number(statsData?.inProgressCount) || 0,
        resolvedCount: Number(statsData?.resolvedCount) || 0,
        criticalOpenCount: Number(statsData?.criticalOpenCount) || 0,
      });
    } catch (err) {
      setError(err?.message || 'Không tải được danh sách báo lỗi.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilter, appliedSearch, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (pageMeta.totalPages > 0 && page >= pageMeta.totalPages) {
      setPage(pageMeta.totalPages - 1);
    }
  }, [pageMeta.totalPages, page]);

  // Realtime: phiếu mới được chèn thẳng lên đầu bảng khi đang ở trang 1 và
  // không lọc gì; các trường hợp khác chỉ hiện nhắc "có phiếu mới" để admin tự tải lại.
  const handleIncomingReport = useCallback(
    (report) => {
      if (!report?.reportId) return;

      playNotificationSoundByType(report.severity === 'CRITICAL' ? 'URGENT' : 'INFO');
      toast.info(`Báo lỗi mới #${report.reportId}: ${report.title}`, { containerId: 'app-toast' });

      const isDefaultView =
        page === 0 &&
        !appliedSearch &&
        Object.values(appliedFilter).every((value) => !value);

      if (!isDefaultView) {
        setLiveCount((count) => count + 1);
        return;
      }

      setReports((prev) => {
        if (prev.some((item) => item.reportId === report.reportId)) return prev;
        return [report, ...prev].slice(0, PAGE_SIZE);
      });
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        newCount: prev.newCount + 1,
        criticalOpenCount: prev.criticalOpenCount + (report.severity === 'CRITICAL' ? 1 : 0),
      }));
      setPageMeta((prev) => ({ ...prev, totalElements: prev.totalElements + 1 }));
    },
    [appliedFilter, appliedSearch, page],
  );

  const { connected } = useBugReportStream(handleIncomingReport);

  const onApplyFilter = () => {
    setPage(0);
    setAppliedFilter(filterDraft);
    setLiveCount(0);
  };

  const onReset = () => {
    setFilterDraft(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    setSearchDraft('');
    setAppliedSearch('');
    setPage(0);
    setLiveCount(0);
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
      await exportBugReports(buildApiParams(appliedFilter, appliedSearch));
      toast.success('Đã xuất danh sách báo lỗi (CSV).', { containerId: 'app-toast' });
    } catch (err) {
      toast.error(err?.message || 'Xuất dữ liệu thất bại.', { containerId: 'app-toast' });
    } finally {
      setExporting(false);
    }
  };

  const openDetail = (report) => {
    setDetail(report);
    setHandling({
      status: report.status || 'NEW',
      assignedStaffName: report.assignedStaffName || '',
      resolutionNote: report.resolutionNote || '',
    });
  };

  const onSaveHandling = async () => {
    if (!detail || saving) return;
    setSaving(true);
    try {
      const response = await updateBugReport(detail.reportId, {
        status: handling.status,
        assignedStaffId: detail.assignedStaffId ?? null,
        assignedStaffName: handling.assignedStaffName.trim() || null,
        resolutionNote: handling.resolutionNote.trim() || null,
      });
      const updated = response?.data ?? response;
      setReports((prev) =>
        prev.map((item) => (item.reportId === updated.reportId ? { ...item, ...updated } : item)),
      );
      toast.success('Đã cập nhật phiếu báo lỗi.', { containerId: 'app-toast' });
      setDetail(null);
      loadData();
    } catch (err) {
      toast.error(err?.message || 'Cập nhật phiếu báo lỗi thất bại.', { containerId: 'app-toast' });
    } finally {
      setSaving(false);
    }
  };

  const onReloadLive = () => {
    setLiveCount(0);
    loadData();
  };

  const totalPages = pageMeta.totalPages || 1;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Báo lỗi phần mềm &amp; Cải tiến liên tục</h2>
        <span className={`${styles.liveBadge} ${connected ? styles.liveOn : styles.liveOff}`}>
          {connected ? 'Đang nhận realtime' : 'Mất kết nối realtime'}
        </span>
      </div>

      {liveCount > 0 && (
        <button type="button" className={styles.liveBanner} onClick={onReloadLive}>
          Có {liveCount} phiếu báo lỗi mới — bấm để tải lại danh sách
        </button>
      )}

      <div className={styles.statsGrid}>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Tổng phiếu</div>
          <div className={styles.statValue}>{stats.total.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Chờ tiếp nhận</div>
          <div className={styles.statValue}>{stats.newCount.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Đang xử lý</div>
          <div className={styles.statValue}>{stats.inProgressCount.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Đã xử lý</div>
          <div className={styles.statValue}>{stats.resolvedCount.toLocaleString('vi-VN')}</div>
        </div>
        <div className={`ui-card ${styles.statCard} ${styles.statCardAlert}`}>
          <div className={styles.statLabel}>Nghiêm trọng chưa đóng</div>
          <div className={styles.statValue}>{stats.criticalOpenCount.toLocaleString('vi-VN')}</div>
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
            <label htmlFor={controlIds.status}>Trạng thái</label>
            <select
              id={controlIds.status}
              value={filterDraft.status}
              onChange={(e) => setFilterDraft((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {Object.entries(STATUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.severity}>Mức độ</label>
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

          <div className="ui-field">
            <label htmlFor={controlIds.category}>Loại phản hồi</label>
            <select
              id={controlIds.category}
              value={filterDraft.category}
              onChange={(e) => setFilterDraft((p) => ({ ...p, category: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.module}>Phân hệ</label>
            <select
              id={controlIds.module}
              value={filterDraft.module}
              onChange={(e) => setFilterDraft((p) => ({ ...p, module: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {Object.entries(MODULE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor={controlIds.reporterType}>Người gửi</label>
            <select
              id={controlIds.reporterType}
              value={filterDraft.reporterType}
              onChange={(e) => setFilterDraft((p) => ({ ...p, reporterType: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {Object.entries(REPORTER_TYPE_LABELS).map(([code, label]) => (
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
              placeholder="Tìm theo tiêu đề, mô tả, người gửi"
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
                <th>Mã</th>
                <th>Thời gian</th>
                <th>Tiêu đề</th>
                <th>Loại / Phân hệ</th>
                <th>Mức độ</th>
                <th>Người gửi</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    Đang tải danh sách báo lỗi...
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
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    Không có phiếu báo lỗi phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.reportId}>
                    <td className={styles.mono}>#{report.reportId}</td>
                    <td className={styles.mono}>{formatTimestampVi(report.createdAt)}</td>
                    <td>
                      <div className={styles.titleCell}>{report.title}</div>
                      {report.attachmentUrls?.length > 0 && (
                        <div className={styles.subText}>{report.attachmentUrls.length} ảnh đính kèm</div>
                      )}
                    </td>
                    <td>
                      <div>{CATEGORY_LABELS[report.category] || report.category}</div>
                      <div className={styles.subText}>
                        {MODULE_LABELS[report.module] || report.module || 'Không xác định'}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getSeverityClass(report.severity)}`}>
                        {SEVERITY_LABELS[report.severity] || report.severity}
                      </span>
                    </td>
                    <td>
                      <div>{report.reporterName || 'Không rõ'}</div>
                      <div className={styles.subText}>
                        {REPORTER_TYPE_LABELS[report.reporterType] || report.reporterType}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getStatusClass(report.status)}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="ui-btn" onClick={() => openDetail(report)}>
                        Xem &amp; xử lý
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
              Trang {page + 1} / {totalPages} · {pageMeta.totalElements.toLocaleString('vi-VN')} phiếu
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
              {exporting ? 'Đang xuất...' : 'Xuất danh sách (CSV)'}
            </button>
          </div>
        </div>
      </div>

      {detail && (
        <div className={styles.modalOverlay} onClick={() => setDetail(null)} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết phiếu báo lỗi"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                Phiếu báo lỗi #{detail.reportId}
                <span className={`${styles.badge} ${getSeverityClass(detail.severity)}`}>
                  {SEVERITY_LABELS[detail.severity] || detail.severity}
                </span>
              </h3>
              <button type="button" className="ui-btn" onClick={() => setDetail(null)}>
                Đóng
              </button>
            </div>

            <dl className={styles.detailList}>
              <dt>Tiêu đề</dt>
              <dd>{detail.title}</dd>
              <dt>Mô tả</dt>
              <dd className={styles.preWrap}>{detail.description}</dd>
              <dt>Loại phản hồi</dt>
              <dd>{CATEGORY_LABELS[detail.category] || detail.category}</dd>
              <dt>Phân hệ</dt>
              <dd>{MODULE_LABELS[detail.module] || detail.module || 'Không xác định'}</dd>
              <dt>Người gửi</dt>
              <dd>
                {detail.reporterName || 'Không rõ'} ·{' '}
                {REPORTER_TYPE_LABELS[detail.reporterType] || detail.reporterType}
                {detail.reporterRole ? ` (${detail.reporterRole})` : ''}
              </dd>
              <dt>Liên hệ lại</dt>
              <dd>{detail.reporterContact || '-'}</dd>
              <dt>Thời điểm gửi</dt>
              <dd>{formatTimestampVi(detail.createdAt)}</dd>
              <dt>Trang phát sinh</dt>
              <dd className={styles.breakAll}>{detail.pageUrl || '-'}</dd>
              <dt>Thiết bị</dt>
              <dd className={styles.breakAll}>
                {[detail.screenSize, detail.appVersion, detail.ipAddress].filter(Boolean).join(' · ') || '-'}
                {detail.userAgent ? ` — ${detail.userAgent}` : ''}
              </dd>
            </dl>

            {detail.attachmentUrls?.length > 0 && (
              <div className={styles.attachmentGrid}>
                {detail.attachmentUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className={styles.attachmentItem}>
                    <img src={url} alt="Ảnh đính kèm phiếu báo lỗi" />
                  </a>
                ))}
              </div>
            )}

            <div className={styles.handleBox}>
              <h4>Xử lý</h4>
              <div className={styles.handleGrid}>
                <div className="ui-field">
                  <label htmlFor="bug-handle-status">Trạng thái</label>
                  <select
                    id="bug-handle-status"
                    value={handling.status}
                    onChange={(e) => setHandling((p) => ({ ...p, status: e.target.value }))}
                  >
                    {Object.entries(STATUS_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ui-field">
                  <label htmlFor="bug-handle-assignee">Người phụ trách</label>
                  <input
                    id="bug-handle-assignee"
                    type="text"
                    maxLength={150}
                    placeholder="Tên người/đội xử lý"
                    value={handling.assignedStaffName}
                    onChange={(e) => setHandling((p) => ({ ...p, assignedStaffName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ui-field">
                <label htmlFor="bug-handle-note">Ghi chú xử lý</label>
                <textarea
                  id="bug-handle-note"
                  rows={3}
                  maxLength={1000}
                  placeholder="Nguyên nhân, cách khắc phục, phiên bản đã sửa..."
                  value={handling.resolutionNote}
                  onChange={(e) => setHandling((p) => ({ ...p, resolutionNote: e.target.value }))}
                />
              </div>
              <div className="ui-actions ui-actions--end">
                <button
                  type="button"
                  className="ui-btn ui-btn--primary"
                  onClick={onSaveHandling}
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
