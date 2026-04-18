import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchServiceTicketReminders,
  updateServiceTicketReminderStatus,
} from '../../../services/serviceTicketService.js';
import styles from './MaintenanceReminder.module.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ nhắc' },
  { value: 'NOTIFIED', label: 'Đã nhắc' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SKIPPED', label: 'Đã bỏ qua' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_ACTIONS = [
  { value: 'NOTIFIED', label: 'Đã nhắc' },
  { value: 'CONFIRMED', label: 'Xác nhận' },
  { value: 'SKIPPED', label: 'Bỏ qua' },
  { value: 'CANCELLED', label: 'Hủy' },
];

const statusMeta = {
  PENDING: { label: 'Chờ nhắc', className: styles.statusPending },
  NOTIFIED: { label: 'Đã nhắc', className: styles.statusNotified },
  CONFIRMED: { label: 'Đã xác nhận', className: styles.statusConfirmed },
  SKIPPED: { label: 'Đã bỏ qua', className: styles.statusSkipped },
  CANCELLED: { label: 'Đã hủy', className: styles.statusCancelled },
};

const normalizeStatus = (value) => String(value ?? '').trim().toUpperCase();
const canCreateBookingFromStatus = (value) => normalizeStatus(value) === 'CONFIRMED';

const getStatusLabel = (value) => {
  const key = normalizeStatus(value);
  return statusMeta[key]?.label || key || '-';
};

const formatDate = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return raw;
};

const formatTime = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return raw;
};

const formatReminderDateTime = (date, time) => {
  const dateText = formatDate(date);
  const timeText = formatTime(time);
  if (dateText === '-' && timeText === '-') return '-';
  if (dateText === '-') return timeText;
  if (timeText === '-') return dateText;
  return `${timeText} ${dateText}`;
};

const getPageData = (response) => {
  const data = response?.data ?? response;
  const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
  return {
    content,
    totalElements: Number(data?.totalElements ?? content.length),
    totalPages: Math.max(1, Number(data?.totalPages ?? 1)),
  };
};

export default function MaintenanceReminder() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date: '',
    sortBy: 'asc',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState('');

  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;

  const activeFilterText = useMemo(() => {
    const parts = [];
    if (appliedFilters.search.trim()) parts.push(`Từ khóa: ${appliedFilters.search.trim()}`);
    if (appliedFilters.status) parts.push(`Trạng thái: ${getStatusLabel(appliedFilters.status)}`);
    if (appliedFilters.date) parts.push(`Ngày hẹn: ${formatDate(appliedFilters.date)}`);
    parts.push(appliedFilters.sortBy === 'desc' ? 'Ngày hẹn giảm dần' : 'Ngày hẹn tăng dần');
    return parts.join(' • ');
  }, [appliedFilters]);

  const loadReminders = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập để xem nhắc lịch bảo dưỡng.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchServiceTicketReminders(
        {
          ...appliedFilters,
          page,
          size,
        },
        token,
      );
      const data = getPageData(response);
      setRows(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (error) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      toast.error(error?.message || 'Không thể tải danh sách nhắc lịch bảo dưỡng.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, size]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitFilters = (event) => {
    event.preventDefault();
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const next = {
      search: '',
      status: '',
      date: '',
      sortBy: 'asc',
    };
    setFilters(next);
    setPage(0);
    setAppliedFilters(next);
  };

  const handleStatusChange = async (row, status) => {
    const reminderId = row?.reminderId;
    const nextStatus = normalizeStatus(status);
    if (!reminderId || !nextStatus || normalizeStatus(row?.status) === nextStatus) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập để cập nhật nhắc lịch bảo dưỡng.');
      return;
    }

    setUpdatingId(reminderId);
    setUpdatingStatus(nextStatus);
    try {
      await updateServiceTicketReminderStatus(reminderId, nextStatus, '', token);
      setRows((prev) => prev.map((item) => (
        item?.reminderId === reminderId
          ? { ...item, status: nextStatus, statusReason: item?.statusReason || '' }
          : item
      )));
      toast.success(`Đã cập nhật trạng thái: ${getStatusLabel(nextStatus)}.`);
    } catch (error) {
      toast.error(error?.message || 'Không thể cập nhật trạng thái nhắc lịch.');
    } finally {
      setUpdatingId(null);
      setUpdatingStatus('');
    }
  };

  const handleOpenTicket = (ticketCode) => {
    const code = String(ticketCode ?? '').trim();
    if (!code) {
      toast.error('Phiếu này chưa có mã phiếu để mở.');
      return;
    }
    navigate(`/service-ticket-detail/${encodeURIComponent(code)}`);
  };

  const handleCreateBookingFromReminder = (row) => {
    const reminderId = row?.reminderId;
    if (!reminderId) {
      toast.error('Lời nhắc này chưa có ID để tạo lịch.');
      return;
    }
    if (!canCreateBookingFromStatus(row?.status)) {
      toast.error('Chỉ có thể tạo lịch khi lời nhắc đã xác nhận.');
      return;
    }
    navigate('/create-booking', {
      state: {
        reminderId,
        maintenanceReminder: row,
      },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Nhắc lịch bảo dưỡng</h1>
          <p className={styles.subtitle}>Theo dõi lịch hẹn bảo dưỡng, cập nhật trạng thái nhắc và mở phiếu dịch vụ liên quan.</p>
        </div>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={loadReminders} disabled={loading} data-gms-no-global-loading="true">
          {loading ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      <section className={`ui-card ${styles.filterCard}`}>
        <form className={styles.filterGrid} onSubmit={handleSubmitFilters}>
          <div className={styles.field}>
            <label htmlFor="maintenance-reminder-search">Tìm kiếm</label>
            <input
              id="maintenance-reminder-search"
              type="search"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              placeholder="Tên khách hàng hoặc biển số..."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="maintenance-reminder-status">Trạng thái</label>
            <select
              id="maintenance-reminder-status"
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="maintenance-reminder-date">Ngày hẹn</label>
            <input
              id="maintenance-reminder-date"
              type="date"
              value={filters.date}
              onChange={(event) => handleFilterChange('date', event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="maintenance-reminder-sort">Sắp xếp ngày hẹn</label>
            <select
              id="maintenance-reminder-sort"
              value={filters.sortBy}
              onChange={(event) => handleFilterChange('sortBy', event.target.value)}
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>

          <div className={styles.filterActions}>
            <button type="button" className="ui-btn ui-btn--ghost" onClick={handleResetFilters} disabled={loading}>
              Xóa lọc
            </button>
            <button type="submit" className="ui-btn ui-btn--primary" disabled={loading} data-gms-no-global-loading="true">
              {loading ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
              {loading ? 'Đang lọc...' : 'Lọc'}
            </button>
          </div>
        </form>
      </section>

      <section className={`ui-card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Danh sách nhắc lịch</h2>
            <p className={styles.tableMeta}>{activeFilterText}</p>
          </div>
          <div className={styles.totalBadge}>{totalElements} lịch nhắc</div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>Biển số</th>
                <th>Ngày hẹn</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Lý do</th>
                <th>Cố vấn</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>Đang tải dữ liệu...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>Không có lịch nhắc phù hợp.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const currentStatus = normalizeStatus(row?.status);
                  const meta = statusMeta[currentStatus] || { className: styles.statusDefault, label: getStatusLabel(currentStatus) };
                  const rowUpdating = updatingId === row?.reminderId;
                  const statusLocked = currentStatus && currentStatus !== 'PENDING';
                  const canCreateBooking = Boolean(row?.reminderId) && canCreateBookingFromStatus(currentStatus);
                  return (
                    <tr key={row?.reminderId || `${row?.ticketCode || 'ticket'}-${row?.reminderDate || ''}-${row?.reminderTime || ''}`}>
                      <td className={styles.ticketCode}>{row?.ticketCode || '-'}</td>
                      <td className={styles.customerCell}>{row?.customerName || '-'}</td>
                      <td className={styles.nowrap}>{row?.customerPhone || '-'}</td>
                      <td className={styles.plate}>{row?.licensePlate || '-'}</td>
                      <td className={styles.nowrap}>{formatReminderDateTime(row?.reminderDate, row?.reminderTime)}</td>
                      <td className={styles.noteCell}>{row?.note || '-'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className={styles.noteCell}>{row?.statusReason || '-'}</td>
                      <td>{row?.advisorName || '-'}</td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={`${styles.smallBtn} ${styles.openBtn}`}
                            onClick={() => handleOpenTicket(row?.ticketCode)}
                            disabled={!row?.ticketCode}
                          >
                            Mở phiếu
                          </button>
                          <button
                            type="button"
                            className={`${styles.smallBtn} ${styles.createBtn}`}
                            onClick={() => handleCreateBookingFromReminder(row)}
                            disabled={!canCreateBooking}
                            title={canCreateBooking ? 'Tạo lịch từ lời nhắc đã xác nhận' : 'Chỉ tạo lịch khi lời nhắc đã xác nhận'}
                          >
                            Tạo lịch
                          </button>
                          {STATUS_ACTIONS.map((action) => (
                            (() => {
                              const buttonUpdating = rowUpdating && updatingStatus === action.value;
                              return (
                                <button
                                  key={action.value}
                                  type="button"
                                  className={styles.smallBtn}
                                  onClick={() => handleStatusChange(row, action.value)}
                                  disabled={rowUpdating || statusLocked || currentStatus === action.value}
                                  data-gms-no-global-loading="true"
                                >
                                  {buttonUpdating ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
                                  {buttonUpdating ? 'Đang lưu...' : action.label}
                                </button>
                              );
                            })()
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <div className={styles.pageSize}>
            <span>Hiển thị:</span>
            <select
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(0);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className={styles.pageActions}>
            <button type="button" className="ui-btn ui-btn--ghost" disabled={!canGoPrev || loading} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
              Trước
            </button>
            <span className={styles.pageText}>{page + 1} / {totalPages}</span>
            <button type="button" className="ui-btn ui-btn--primary" disabled={!canGoNext || loading} onClick={() => setPage((prev) => prev + 1)}>
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
