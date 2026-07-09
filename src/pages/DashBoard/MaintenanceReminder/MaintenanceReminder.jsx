import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchServiceTicketReminders,
  updateServiceTicketReminderStatus,
  fetchInactiveCustomers,
  createServiceTicketReminder,
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
const FINAL_STATUSES = new Set(['CONFIRMED', 'SKIPPED', 'CANCELLED']);
const REASON_REQUIRED_STATUSES = new Set(['SKIPPED', 'CANCELLED']);

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

const getReminderReason = (row) =>
  String(row?.reason ?? row?.statusReason ?? row?.status_reason ?? '').trim();

const getPageData = (response) => {
  const data = response?.data ?? response;
  const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
  return {
    content,
    totalElements: Number(data?.totalElements ?? content.length),
    totalPages: Math.max(1, Number(data?.totalPages ?? 1)),
  };
};

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysInactive = (dateStr) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const diffTime = Math.abs(new Date() - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function MaintenanceReminder() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    phone: '',
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
  const [reasonDialog, setReasonDialog] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState('');

  // New state variables for inactive customers feature
  const [activeTab, setActiveTab] = useState('reminders');
  const [inactiveCustomers, setInactiveCustomers] = useState([]);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [remindModalData, setRemindModalData] = useState(null);
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('09:00');
  const [newReminderNote, setNewReminderNote] = useState('');
  const [submittingReminder, setSubmittingReminder] = useState(false);

  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;

  const activeFilterText = useMemo(() => {
    const parts = [];
    if (appliedFilters.search.trim()) parts.push(`Từ khóa: ${appliedFilters.search.trim()}`);
    if (appliedFilters.phone.trim()) parts.push(`SĐT: ${appliedFilters.phone.trim()}`);
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

  const loadInactiveCustomers = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      setLoadingInactive(true);
      const res = await fetchInactiveCustomers(30, 60, token);
      const data = res?.data || [];
      setInactiveCustomers(data);
      setInactiveCount(data.length);
    } catch (err) {
      console.error('Error fetching inactive customers:', err);
    } finally {
      setLoadingInactive(false);
    }
  }, []);

  const handleCreateReminder = async () => {
    if (!newReminderDate || !remindModalData) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập để tạo nhắc lịch.');
      return;
    }

    setSubmittingReminder(true);
    try {
      await createServiceTicketReminder({
        serviceTicketId: remindModalData.serviceTicketId,
        vehicleId: remindModalData.vehicleId,
        customerId: remindModalData.customerId,
        reminderDate: newReminderDate,
        reminderTime: newReminderTime,
        note: newReminderNote,
      }, token);

      toast.success('Đã tạo nhắc lịch thành công.');
      setRemindModalData(null);

      // Refresh both lists
      loadReminders();
      loadInactiveCustomers();
    } catch (err) {
      toast.error(err?.message || 'Không thể tạo nhắc lịch.');
    } finally {
      setSubmittingReminder(false);
    }
  };

  const filteredInactive = useMemo(() => {
    return inactiveCustomers.filter((item) => {
      const searchMatch = !appliedFilters.search.trim() || 
        String(item.fullName || '').toLowerCase().includes(appliedFilters.search.trim().toLowerCase()) ||
        String(item.licensePlate || '').toLowerCase().includes(appliedFilters.search.trim().toLowerCase());
      const phoneMatch = !appliedFilters.phone.trim() ||
        String(item.phone || '').includes(appliedFilters.phone.trim());
      return searchMatch && phoneMatch;
    });
  }, [inactiveCustomers, appliedFilters.search, appliedFilters.phone]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    loadInactiveCustomers();
  }, [loadInactiveCustomers]);

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
      phone: '',
      status: '',
      date: '',
      sortBy: 'asc',
    };
    setFilters(next);
    setPage(0);
    setAppliedFilters(next);
  };

  const updateReminderStatus = async (row, status, reason = '') => {
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
      const cleanReason = String(reason ?? '').trim();
      await updateServiceTicketReminderStatus(reminderId, nextStatus, cleanReason, token);
      setRows((prev) => prev.map((item) => (
        item?.reminderId === reminderId
          ? { ...item, status: nextStatus, reason: cleanReason, statusReason: cleanReason }
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

  const handleStatusChange = async (row, status) => {
    const nextStatus = normalizeStatus(status);
    if (REASON_REQUIRED_STATUSES.has(nextStatus)) {
      setReasonDialog({ row, status: nextStatus });
      setReasonText(getReminderReason(row));
      setReasonError('');
      return;
    }
    await updateReminderStatus(row, nextStatus);
  };

  const closeReasonDialog = () => {
    if (updatingId) return;
    setReasonDialog(null);
    setReasonText('');
    setReasonError('');
  };

  const handleConfirmReasonStatus = async () => {
    const reason = String(reasonText || '').trim();
    if (!reason) {
      setReasonError('Vui lòng nhập lý do.');
      return;
    }
    if (reason.length > 500) {
      setReasonError('Lý do tối đa 500 ký tự.');
      return;
    }
    await updateReminderStatus(reasonDialog?.row, reasonDialog?.status, reason);
    setReasonDialog(null);
    setReasonText('');
    setReasonError('');
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
      toast.error('Chỉ có thể hẹn lịch khi lời nhắc đã xác nhận.');
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
    <div className={styles.bookingPage}>
      {inactiveCount > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          borderLeft: '4px solid #2563eb',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📢</span>
            <div>
              <strong style={{ color: '#1e3a8a', fontSize: '15px' }}>Nhắc lịch bảo dưỡng định kỳ</strong>
              <p style={{ color: '#1e40af', margin: '4px 0 0 0', fontSize: '14px' }}>
                Có <strong>{inactiveCount}</strong> khách hàng 30-60 ngày chưa đến xưởng và chưa có lịch nhắc mới.
              </p>
            </div>
          </div>
          {activeTab !== 'inactive' && (
            <button
              type="button"
              className={styles.primaryButton}
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setActiveTab('inactive')}
            >
              Xem danh sách
            </button>
          )}
        </div>
      )}

      <header className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <span className={styles.headerIcon} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1>Nhắc lịch bảo dưỡng</h1>
            <p className={styles.subtitle}>Theo dõi lịch hẹn bảo dưỡng, cập nhật trạng thái nhắc và mở phiếu dịch vụ liên quan.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.totalCount}>
            {activeTab === 'inactive' ? `${filteredInactive.length} khách` : `${totalElements} lịch nhắc`}
          </span>
          <button type="button" className={styles.ghostButton} onClick={activeTab === 'inactive' ? loadInactiveCustomers : loadReminders} disabled={loading || loadingInactive} data-gms-no-global-loading="true">
          {loading || loadingInactive ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
          {loading || loadingInactive ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </header>

      <section className={styles.pendingFilters}>
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
            <label htmlFor="maintenance-reminder-phone">Số điện thoại</label>
            <input
              id="maintenance-reminder-phone"
              type="search"
              value={filters.phone || ''}
              onChange={(event) => handleFilterChange('phone', event.target.value)}
              placeholder="Tìm theo số điện thoại..."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="maintenance-reminder-status">Trạng thái</label>
            <select
              id="maintenance-reminder-status"
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              disabled={activeTab === 'inactive'}
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
              disabled={activeTab === 'inactive'}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="maintenance-reminder-sort">Sắp xếp ngày hẹn</label>
            <select
              id="maintenance-reminder-sort"
              value={filters.sortBy}
              onChange={(event) => handleFilterChange('sortBy', event.target.value)}
              disabled={activeTab === 'inactive'}
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.ghostButton} onClick={handleResetFilters} disabled={loading || loadingInactive}>
              Xóa lọc
            </button>
            <button type="submit" className={styles.primaryButton} disabled={loading || loadingInactive} data-gms-no-global-loading="true">
              {loading || loadingInactive ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
              {loading || loadingInactive ? 'Đang lọc...' : 'Lọc'}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.bookingCard}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '20px',
          padding: '0 24px',
          gap: '24px'
        }}>
          <button
            type="button"
            style={{
              padding: '12px 4px',
              fontWeight: '600',
              fontSize: '15px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'reminders' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'reminders' ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              outline: 'none'
            }}
            onClick={() => setActiveTab('reminders')}
          >
            📋 Lịch nhắc bảo dưỡng ({totalElements})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 4px',
              fontWeight: '600',
              fontSize: '15px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'inactive' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'inactive' ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              outline: 'none'
            }}
            onClick={() => setActiveTab('inactive')}
          >
            ⏰ Khách trễ hẹn (30-60 ngày) ({inactiveCount})
          </button>
        </div>

        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              {activeTab === 'inactive' ? 'Khách hàng 30-60 ngày chưa đến xưởng' : 'Danh sách nhắc lịch'}
            </h2>
            <p className={styles.tableMeta}>{activeFilterText}</p>
          </div>
          <div className={styles.totalBadge}>
            {activeTab === 'inactive' ? `${filteredInactive.length} / ${inactiveCount}` : `${rows.length} / ${totalElements}`} dòng
          </div>
        </div>

        {activeTab === 'inactive' ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Biển số</th>
                  <th>Ngày đến gần nhất</th>
                  <th>Số ngày chưa đến</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingInactive ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>Đang tải dữ liệu...</td>
                  </tr>
                ) : filteredInactive.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>Không có khách hàng trễ hẹn phù hợp.</td>
                  </tr>
                ) : (
                  filteredInactive.map((row) => {
                    const daysInactive = getDaysInactive(row.lastVisitDate);
                    return (
                      <tr key={row.customerId}>
                        <td className={styles.customerCell}>{row.fullName || '-'}</td>
                        <td className={styles.nowrap}>{row.phone || '-'}</td>
                        <td>
                          <span className={styles.plate}>{row.licensePlate || '-'}</span>
                        </td>
                        <td className={styles.nowrap}>
                          {row.lastVisitDate ? new Date(row.lastVisitDate).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td style={{ fontWeight: '600', color: '#dc2626' }}>{daysInactive} ngày</td>
                        <td>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => {
                              setRemindModalData(row);
                              setNewReminderDate(toIsoDate(new Date()));
                              setNewReminderTime('09:00');
                              setNewReminderNote('Khách hàng trễ hẹn 30-60 ngày chưa đến xưởng.');
                            }}
                          >
                            Nhắc lịch
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <>
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
                      const statusLocked = FINAL_STATUSES.has(currentStatus);
                      const canCreateBooking = Boolean(row?.reminderId) && canCreateBookingFromStatus(currentStatus);
                      return (
                        <tr key={row?.reminderId || `${row?.ticketCode || 'ticket'}-${row?.reminderDate || ''}-${row?.reminderTime || ''}`}>
                          <td className={styles.ticketCode}>{row?.ticketCode || '-'}</td>
                          <td className={styles.customerCell}>{row?.customerName || '-'}</td>
                          <td className={styles.nowrap}>{row?.customerPhone || '-'}</td>
                          <td>
                            <span className={styles.plate}>{row?.licensePlate || '-'}</span>
                          </td>
                          <td className={styles.nowrap}>{formatReminderDateTime(row?.reminderDate, row?.reminderTime)}</td>
                          <td className={styles.noteCell}>{row?.note || '-'}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${meta.className}`}>{meta.label}</span>
                          </td>
                          <td className={styles.noteCell}>{getReminderReason(row) || '-'}</td>
                          <td>{row?.advisorName || '-'}</td>
                          <td>
                            <div className={styles.actionGroup}>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.viewBtn}`}
                                onClick={() => handleOpenTicket(row?.ticketCode)}
                                disabled={!row?.ticketCode}
                              >
                                Mở phiếu
                              </button>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.assignBtn}`}
                                onClick={() => handleCreateBookingFromReminder(row)}
                                disabled={!canCreateBooking}
                                title={canCreateBooking ? 'Hẹn lịch từ lời nhắc đã xác nhận' : 'Chỉ hẹn lịch khi lời nhắc đã xác nhận'}
                              >
                                Hẹn lịch
                              </button>
                              {STATUS_ACTIONS.map((action) => {
                                const buttonUpdating = rowUpdating && updatingStatus === action.value;
                                return (
                                  <button
                                    key={action.value}
                                    type="button"
                                    className={`${styles.actionBtn} ${styles.statusActionBtn}`}
                                    onClick={() => handleStatusChange(row, action.value)}
                                    disabled={rowUpdating || statusLocked || currentStatus === action.value}
                                    data-gms-no-global-loading="true"
                                  >
                                    {buttonUpdating ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
                                    {buttonUpdating ? 'Đang lưu...' : action.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.bookingFooter}>
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
                <button type="button" className={styles.ghostButton} disabled={!canGoPrev || loading} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
                  Trước
                </button>
                <span className={styles.pageText}>{page + 1} / {totalPages}</span>
                <button type="button" className={styles.primaryButton} disabled={!canGoNext || loading} onClick={() => setPage((prev) => prev + 1)}>
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {reasonDialog ? (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={closeReasonDialog}>
          <div className={styles.reasonModal} role="dialog" aria-modal="true" aria-labelledby="maintenance-reason-title" onMouseDown={(event) => event.stopPropagation()}>
            <h3 id="maintenance-reason-title" className={styles.modalTitle}>
              {reasonDialog.status === 'SKIPPED' ? 'Lý do bỏ qua' : 'Lý do hủy'}
            </h3>
            <p className={styles.modalHint}>
              Lý do này sẽ được lưu vào cột reason của lịch nhắc bảo dưỡng.
            </p>
            <textarea
              className={styles.reasonInput}
              value={reasonText}
              onChange={(event) => {
                setReasonText(event.target.value);
                if (reasonError) setReasonError('');
              }}
              maxLength={500}
              rows={4}
              placeholder={reasonDialog.status === 'SKIPPED' ? 'Nhập lý do bỏ qua...' : 'Nhập lý do hủy...'}
              autoFocus
            />
            <div className={styles.reasonMeta}>
              <span className={reasonError ? styles.reasonError : styles.reasonHelp}>
                {reasonError || 'Bắt buộc nhập lý do.'}
              </span>
              <span>{String(reasonText || '').length}/500</span>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={closeReasonDialog} disabled={Boolean(updatingId)}>
                Hủy
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleConfirmReasonStatus} disabled={Boolean(updatingId)}>
                {updatingId ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {remindModalData ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.reasonModal} role="dialog" style={{ maxWidth: '480px' }}>
            <h3 className={styles.modalTitle}>Tạo nhắc lịch mới</h3>
            <p className={styles.modalHint}>
              Tạo nhắc lịch cho khách hàng <strong>{remindModalData.fullName}</strong> ({remindModalData.phone}) - Xe <strong>{remindModalData.licensePlate}</strong>
            </p>
            
            <div className={styles.field} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'block', fontWeight: '500', textAlign: 'left' }}>Ngày nhắc</label>
              <input
                type="date"
                className={styles.reasonInput}
                style={{ height: '38px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
              />
            </div>
            
            <div className={styles.field} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'block', fontWeight: '500', textAlign: 'left' }}>Giờ nhắc</label>
              <input
                type="time"
                className={styles.reasonInput}
                style={{ height: '38px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
              />
            </div>
            
            <div className={styles.field} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'block', fontWeight: '500', textAlign: 'left' }}>Ghi chú</label>
              <textarea
                className={styles.reasonInput}
                value={newReminderNote}
                onChange={(e) => setNewReminderNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Nhập ghi chú nhắc lịch..."
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setRemindModalData(null)}
                disabled={submittingReminder}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCreateReminder}
                disabled={submittingReminder || !newReminderDate}
              >
                {submittingReminder ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
