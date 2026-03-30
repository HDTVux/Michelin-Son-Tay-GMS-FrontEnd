import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTickets, fetchTechnicianTicketDetail, startInspection } from '../../../services/technicianService';
import styles from './MyTasks.module.css';

const getToken = () => localStorage.getItem('staffToken') || localStorage.getItem('authToken');

const SERVICE_TICKET_STATUS_LABELS = {
  DRAFT: 'Nháp',
  INSPECTION: 'Đang kiểm tra',
  PENDING: 'Chờ duyệt',
  IN_PROGRESS: 'Đang sửa chữa',
  COMPLETED: 'Hoàn tất',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const normalizeTicketStatus = (raw) => {
  const s = String(raw || '').trim().toUpperCase();
  if (!s || s === 'CREATED') return 'DRAFT';
  if (s === 'INSPECTING' || s === 'DIAGNOSIS') return 'INSPECTION';
  return s;
};

const INSPECTION_STATUS_LABELS = {
  PENDING: 'Chờ kiểm tra',
  COMPLETED: 'Đã kiểm tra',
  SKIPPED: 'Đã bỏ qua',
};

const normalizeInspectionStatus = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'WAITING' || raw === 'IN_PROGRESS' || raw === 'INSPECTION') return 'PENDING';
  if (raw === 'DONE' || raw === 'FINISHED' || raw === 'PASSED') return 'COMPLETED';
  if (raw === 'SKIP' || raw === 'DISABLED') return 'SKIPPED';
  if (raw === 'PENDING' || raw === 'COMPLETED' || raw === 'SKIPPED') return raw;
  return null;
};

export default function MyTasks() {
  const navigate = useNavigate();

  // ── List state ────────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Filter + pagination state ────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // ── Modal state ────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Debounce search ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => ({
    page,
    size,
    date: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  }), [page, size, dateFrom, dateTo, statusFilter, debouncedSearch]);

  // ── Load ticket list ───────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập');
      setLoading(false);
      return;
    }

    let ignore = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetchTechnicianTickets({ page: 0, size: 200 }, token);

        const rawTickets = response.data?.content || response.data || [];
        const list = Array.isArray(rawTickets) ? rawTickets : [];

        const transformed = list.map((t) => {
          const statusRaw = normalizeTicketStatus(t.ticketStatus || t.status);
          let inspectionStatus = null;
          if (t.ticketCode) {
            try {
              const norm = normalizeInspectionStatus(
                t.inspectionStatus || t.safetyInspectionStatus,
              );
              if (norm) inspectionStatus = norm;
            } catch { /* ignore */ }
          }
          return {
            ...t,
            _status: statusRaw,
            _inspectionStatus: inspectionStatus,
          };
        });

        if (!ignore) {
          setTickets(transformed);
          setTotalElements(transformed.length);
          setTotalPages(Math.max(1, Math.ceil(transformed.length / size)));
        }
      } catch (err) {
        if (!ignore) {
          setError(err?.message || 'Không thể tải danh sách công việc.');
          setTickets([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();
    return () => { ignore = true; };
  }, [filters]);

  // ── Helpers ──────────────────────────────────────────
  const getTicketCode = (ticket) =>
    ticket?.ticketCode || ticket?.code || '';

  const getTicketId = (ticket) => {
    if (ticket?.serviceTicketId != null) return Number(ticket.serviceTicketId);
    if (ticket?.ticketId != null) return Number(ticket.ticketId);
    if (ticket?.id != null) return Number(ticket.id);
    return null;
  };

  const getServiceTicketStatusDisplay = (ticket) => {
    const s = ticket._status || normalizeTicketStatus(ticket?.ticketStatus || ticket?.status);
    return SERVICE_TICKET_STATUS_LABELS[s] || s || '-';
  };

  const getServiceTicketStatusClass = (ticket) => {
    const s = ticket._status || normalizeTicketStatus(ticket?.ticketStatus || ticket?.status);
    if (s === 'DRAFT') return styles.statusPending;
    if (s === 'INSPECTION') return styles.statusInspection;
    if (s === 'PENDING') return styles.statusPending;
    if (s === 'IN_PROGRESS') return styles.statusInspection;
    if (s === 'COMPLETED' || s === 'PAID') return styles.statusActive;
    if (s === 'CANCELLED') return styles.statusInactive;
    return styles.statusPending;
  };

  const getInspectionStatusDisplay = (status) =>
    INSPECTION_STATUS_LABELS[status?.toUpperCase()] || status || '-';

  const getInspectionStatusClass = (status) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return styles.statusInspection;
    if (s === 'COMPLETED') return styles.statusActive;
    if (s === 'SKIPPED') return styles.statusInactive;
    return styles.statusPending;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('vi-VN');
  };

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter) {
      result = result.filter((t) => (t._status || '') === statusFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((t) =>
        (t.ticketCode || '').toLowerCase().includes(q)
        || (t.licensePlate || '').toLowerCase().includes(q)
        || (t.customerName || '').toLowerCase().includes(q)
        || (t.customerPhone || '').toLowerCase().includes(q)
        || (t.model || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((t) => {
        const d = new Date(t.receivedAt || t.createdAt || t.scheduledDate || '');
        return d >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        const d = new Date(t.receivedAt || t.createdAt || t.scheduledDate || '');
        return d <= to;
      });
    }
    return result;
  }, [tickets, statusFilter, debouncedSearch, dateFrom, dateTo]);

  const pagedTickets = useMemo(() => {
    const start = page * size;
    return filteredTickets.slice(start, start + size);
  }, [filteredTickets, page, size]);

  // ── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: tickets.length,
    inProgress: tickets.filter((t) =>
      t._status === 'INSPECTION' || t._status === 'IN_PROGRESS',
    ).length,
    completed: tickets.filter((t) => t._status === 'COMPLETED' || t._status === 'PAID').length,
    cancelled: tickets.filter((t) => t._status === 'CANCELLED').length,
  }), [tickets]);

  // ── Pagination helpers ─────────────────────────────────
  const safePage = Math.min(Math.max(0, page), Math.max(1, totalPages) - 1);
  const pageButtons = useMemo(() => {
    const max = 5;
    const last = Math.max(1, totalPages) - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const items = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) items.push(i);
    return items;
  }, [safePage, totalPages]);

  const handleResetFilters = () => {
    setPage(0);
    setSize(10);
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
    setSearch('');
    setDebouncedSearch('');
  };

  // ── Start work ────────────────────────────────────────
  const handleStartWork = async (ticket) => {
    const token = getToken();
    const code = String(getTicketCode(ticket) || '').trim();
    if (!token || !code) {
      toast.error('Thiếu thông tin phiếu để bắt đầu làm việc.');
      return;
    }
    try {
      await startInspection(code, token);
      setTickets((prev) =>
        prev.map((t) =>
          getTicketCode(t) === code ? { ...t, _status: 'INSPECTION' } : t,
        ),
      );
      navigate(`/technician/safetyinspection-ticket/${encodeURIComponent(code)}`);
    } catch (err) {
      toast.error(err?.message || 'Không thể bắt đầu làm việc.');
    }
  };

  // ── View detail ───────────────────────────────────────
  const handleViewTask = async (ticket) => {
    const token = getToken();
    const code = getTicketCode(ticket);
    if (!code) return;

    setModalLoading(true);
    try {
      const res = await fetchTechnicianTicketDetail(code, token);
      const d = res.data;
      setSelectedTask({
        ...ticket,
        serviceTicketId: d.serviceTicketId,
        ticketCode: d.ticketCode,
        ticketStatus: d.ticketStatus,
        licensePlate: d.vehicle?.licensePlate || ticket.licensePlate,
        make: d.vehicle?.make || ticket.make || '',
        model: d.vehicle?.model || ticket.model,
        year: d.vehicle?.year,
        customerName: d.customer?.fullName || '',
        customerPhone: d.customer?.phone || '',
        customerEmail: d.customer?.email || '',
        serviceType: d.serviceCategory || ticket.serviceType,
        customerRequest: d.customerRequest || ticket.customerRequest,
        services: d.services || [],
        timeSlot: d.booking?.scheduledTime || ticket.timeSlot,
        scheduledDate: d.booking?.scheduledDate,
        assignedDate: d.receivedAt || d.createdAt || ticket.assignedDate,
        dueDate: d.booking?.scheduledDate || ticket.dueDate,
        technicianNotes: d.technicianNotes,
        checkInNotes: d.checkInNotes,
        odometerReading: d.odometerReading,
        photos: d.photos,
      });
      setShowModal(true);
    } catch (err) {
      toast.error('Không thể tải chi tiết công việc.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className={styles.bookingPage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bookingPage}>
      {/* Header */}
      <div className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <span className={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </span>
          <h1>Công việc của tôi</h1>
        </div>
        <span className={styles.totalCount}>{totalElements} công việc</span>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E90FF" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          </div>
          <div className={styles.statTextContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng công việc</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAssigned}`}>
          <div className={styles.statIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.statTextContent}>
            <div className={styles.statValue}>{stats.inProgress}</div>
            <div className={styles.statLabel}>Đang xử lý</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statProgress}`}>
          <div className={styles.statIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className={styles.statTextContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCancelled}`}>
          <div className={styles.statIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className={styles.statTextContent}>
            <div className={styles.statValue}>{stats.cancelled}</div>
            <div className={styles.statLabel}>Đã hủy</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.pendingFilters}>
        <div className={styles.filterCardLabels}>
          <span>Ngày hẹn từ</span>
          <span>Ngày hẹn đến</span>
          <span>Trạng thái</span>
        </div>
        <div className={styles.filterCardControls}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="">Tất cả</option>
            <option value="DRAFT">Nháp</option>
            <option value="INSPECTION">Đang kiểm tra</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="IN_PROGRESS">Đang sửa chữa</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
        <div className={styles.filterCardActions}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Tìm mã phiếu, biển số, khách hàng, SĐT..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <button className={styles.ghostButton} onClick={handleResetFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Table */}
      <div className={styles.bookingCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>MÃ PHIẾU</th>
                <th>TÊN KHÁCH HÀNG</th>
                <th>SĐT</th>
                <th>BIỂN SỐ</th>
                <th>TRẠNG THÁI</th>
                <th>NGÀY HẸN</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="8" className={styles.emptyRow}>Đang tải...</td></tr>
              )}
              {!loading && pagedTickets.length === 0 && (
                <tr><td colSpan="8" className={styles.emptyRow}>Không có công việc nào.</td></tr>
              )}
              {!loading && pagedTickets.map((ticket, idx) => {
                const code = getTicketCode(ticket);
                const ticketId = getTicketId(ticket);
                const hasSafetyInspection = ticket.safetyInspectionEnabled !== false;
                const canStart = ticket._status === 'DRAFT' && hasSafetyInspection;
                const canWork = ticket._status !== 'DRAFT' || !hasSafetyInspection;

                return (
                  <tr key={ticketId || code || idx}>
                    <td>{idx + 1 + page * size}</td>
                    <td className={styles.ticketCodeCell}>{code || '-'}</td>
                    <td>{ticket.customerName || '-'}</td>
                    <td>{ticket.customerPhone || '-'}</td>
                    <td>
                      <span className={styles.licensePlate}>
                        {ticket.licensePlate || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getServiceTicketStatusClass(ticket)}`}>
                        {getServiceTicketStatusDisplay(ticket)}
                      </span>
                    </td>
                    <td>{formatDate(ticket.scheduledDate || ticket.bookingDate || ticket.appointmentDate)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {/* Chi tiết */}
                        <button
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => handleViewTask(ticket)}
                        >
                          Chi tiết
                        </button>
                        {/* Bắt đầu / Làm việc */}
                        {canStart && (
                          <button
                            className={`${styles.actionBtn} ${styles.assignBtn}`}
                            onClick={() => handleStartWork(ticket)}
                          >
                            Bắt đầu làm việc
                          </button>
                        )}
                        {canWork && hasSafetyInspection && (
                          <button
                            className={`${styles.actionBtn} ${styles.viewAssignBtn}`}
                            onClick={() => navigate(`/technician/safetyinspection-ticket/${encodeURIComponent(code)}`)}
                          >
                            Phiếu KT an toàn
                          </button>
                        )}
                        {canWork && !hasSafetyInspection && (
                          <button
                            className={`${styles.actionBtn} ${styles.assignBtn}`}
                            onClick={() => handleViewTask(ticket)}
                          >
                            Làm việc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: page size + pagination */}
        <div className={styles.bookingFooter}>
          <div className={styles.pageSize}>
            <span>Hiển thị:</span>
            <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className={styles.pagination}>
            <button
              className={styles.primaryButton}
              disabled={safePage <= 0 || loading}
              onClick={() => setPage(safePage - 1)}
            >
              Trước
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                className={p === safePage ? styles.ghostButton : `${styles.primaryButton} ${styles.isGhost}`}
                disabled={p === safePage || loading}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button
              className={styles.primaryButton}
              disabled={safePage >= Math.max(1, totalPages) - 1 || loading}
              onClick={() => setPage(safePage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết */}
      {showModal && selectedTask && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Chi tiết công việc</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>×</button>
            </div>

            {modalLoading ? (
              <div className={styles.loadingContainer} style={{ minHeight: 200 }}>
                <div className={styles.spinner}></div>
              </div>
            ) : (
              <div className={styles.modalBody}>
                {/* Thông tin phiếu */}
                <div className={styles.modalSection}>
                  <h4 className={styles.sectionTitle}>Thông tin phiếu</h4>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Mã phiếu</span>
                      <span className={styles.infoValue}>{getTicketCode(selectedTask) || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Trạng thái</span>
                      <span className={`${styles.statusBadge} ${getServiceTicketStatusClass(selectedTask)}`}>
                        {getServiceTicketStatusDisplay(selectedTask)}
                      </span>
                    </div>
                    {selectedTask._inspectionStatus && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Kiểm tra AT</span>
                        <span className={`${styles.statusBadge} ${getInspectionStatusClass(selectedTask._inspectionStatus)}`}>
                          {getInspectionStatusDisplay(selectedTask._inspectionStatus)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin xe */}
                <div className={styles.modalSection}>
                  <h4 className={styles.sectionTitle}>Thông tin xe</h4>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Biển số</span>
                      <span className={styles.infoValue}>{selectedTask.licensePlate || 'N/A'}</span>
                    </div>
                    {selectedTask.make && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Hãng xe</span>
                        <span className={styles.infoValue}>{selectedTask.make}</span>
                      </div>
                    )}
                    {selectedTask.model && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Model</span>
                        <span className={styles.infoValue}>{selectedTask.model}</span>
                      </div>
                    )}
                    {selectedTask.year && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Năm SX</span>
                        <span className={styles.infoValue}>{selectedTask.year}</span>
                      </div>
                    )}
                    {selectedTask.odometerReading && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Số km</span>
                        <span className={styles.infoValue}>{Number(selectedTask.odometerReading).toLocaleString('vi-VN')} km</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin khách hàng */}
                {(selectedTask.customerName || selectedTask.customerPhone) && (
                  <div className={styles.modalSection}>
                    <h4 className={styles.sectionTitle}>Thông tin khách hàng</h4>
                    <div className={styles.infoGrid}>
                      {selectedTask.customerName && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Tên khách hàng</span>
                          <span className={styles.infoValue}>{selectedTask.customerName}</span>
                        </div>
                      )}
                      {selectedTask.customerPhone && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>SĐT</span>
                          <span className={styles.infoValue}>{selectedTask.customerPhone}</span>
                        </div>
                      )}
                      {selectedTask.customerEmail && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Email</span>
                          <span className={styles.infoValue}>{selectedTask.customerEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Yêu cầu KH */}
                {selectedTask.customerRequest && (
                  <div className={styles.modalSection}>
                    <h4 className={styles.sectionTitle}>Yêu cầu khách hàng</h4>
                    <p className={styles.customerRequestText}>{selectedTask.customerRequest}</p>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalFooter}>
              <button className={styles.modalCloseBtn} onClick={() => setShowModal(false)}>
                Đóng
              </button>
              {selectedTask._status === 'DRAFT' && selectedTask.safetyInspectionEnabled !== false && (
                <button
                  className={styles.modalActionBtn}
                  onClick={() => {
                    setShowModal(false);
                    handleStartWork(selectedTask);
                  }}
                >
                  Bắt đầu làm việc
                </button>
              )}
              {selectedTask._status !== 'DRAFT' && selectedTask.safetyInspectionEnabled !== false && (
                <button
                  className={styles.modalActionBtn}
                  onClick={() => {
                    setShowModal(false);
                    navigate(`/technician/safetyinspection-ticket/${encodeURIComponent(getTicketCode(selectedTask))}`);
                  }}
                >
                  Phiếu kiểm tra AT
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
