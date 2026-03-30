import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAdvisorMyTickets,
  fetchAvailableStaff,
  assignStaff,
  cancelAssignmentById,
  changeAdvisorByAdvisor,
  changeTechnicianByAdvisor,
  fetchTechniciansWorkload,
  fetchTicketAssignments,
} from '../../../services/serviceTicketService';
import { fetchCheckInAdvisors } from '../../../services/checkInService';
import styles from './AdvisorInspection.module.css';

const STAFF_ROLE = { ADVISOR: 'ADVISOR' };

const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('staffToken');

const readStaffRolesFromStorage = () => {
  try {
    const raw = localStorage.getItem('staffRoles');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => typeof r === 'string')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const getTicketCode = (ticket) => ticket?.ticketCode || ticket?.code || '';
const getTicketId = (ticket) => {
  if (ticket?.serviceTicketId != null) return Number(ticket.serviceTicketId);
  if (ticket?.ticketId != null) return Number(ticket.ticketId);
  if (ticket?.id != null) return Number(ticket.id);
  return null;
};
const getTicketStatus = (ticket) => ticket?.status || ticket?.ticketStatus || '';

const SERVICE_TICKET_STATUS_LABELS = {
  DRAFT: 'Nháp',
  INSPECTION: 'Đang kiểm tra',
  PENDING: 'Chờ duyệt',
  IN_PROGRESS: 'Đang sửa chữa',
  COMPLETED: 'Hoàn tất',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const normalizeServiceTicketStatus = (ticket) => {
  const raw = String(getTicketStatus(ticket) || '').trim().toUpperCase();
  if (!raw || raw === 'CREATED') return 'DRAFT';
  if (raw === 'INSPECTING' || raw === 'DIAGNOSIS') return 'INSPECTION';
  return raw;
};

const toAvailableStaffList = (response) => {
  const rows = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.data)
      ? response.data.data
      : [];
  return rows;
};

const STATUS_LABELS = {
  PENDING: 'Chờ bắt đầu',
  ACTIVE: 'Đang làm',
  DONE: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const computeDisplayStatus = (assignmentStatus, ticketStatus) => {
  const tStatus = normalizeServiceTicketStatus({ status: ticketStatus });
  if (tStatus === 'INSPECTION') return 'ACTIVE';
  if (tStatus === 'COMPLETED' || tStatus === 'PAID') return 'DONE';
  if (tStatus === 'CANCELLED') return 'CANCELLED';
  return assignmentStatus || 'PENDING';
};

const normalizeAssignment = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const assignmentId = Number(raw.assignmentId);
  const staffId = Number(raw.staffId);
  return {
    ...raw,
    assignmentId: Number.isFinite(assignmentId) ? assignmentId : null,
    staffId: Number.isFinite(staffId) ? staffId : null,
    roleInTicket: String(raw.roleInTicket || raw.role || '').trim().toUpperCase(),
    status: String(raw.status || raw.assignmentStatus || '').trim().toUpperCase(),
    isPrimary: Boolean(raw.isPrimary),
    fullName:
      typeof raw.fullName === 'string'
        ? raw.fullName
        : typeof raw.staffName === 'string'
          ? raw.staffName
          : '',
  };
};

export default function AdvisorInspection() {
  const navigate = useNavigate();
  const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
  const canChangeAdvisorByRole = staffRoles.includes(STAFF_ROLE.ADVISOR);

  // ── Ticket list state ──────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // ── Workload map ──────────────────────────────────────────
  const [workloadMap, setWorkloadMap] = useState({});
  const [staffNameMap, setStaffNameMap] = useState({});

  // ── Modal state ──────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalAssignments, setModalAssignments] = useState([]);
  const [modalTechList, setModalTechList] = useState([]);
  const [modalAdvisor, setModalAdvisor] = useState(null);
  const [advisorOptions, setAdvisorOptions] = useState([]);
  const [selectedNewAdvisorId, setSelectedNewAdvisorId] = useState('');
  const [techReplacementByAssignment, setTechReplacementByAssignment] = useState({});
  const [techSortBy, setTechSortBy] = useState('ticket_asc'); // 'ticket_asc' | 'ticket_desc' | 'free_first' | 'busy_first'
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalPageAssignments, setModalPageAssignments] = useState(new Map());

  // ── Debounce search ───────────────────────────────────────
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

  // ── Load ticket list (paginated) ─────────────────────────
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
        const response = await fetchAdvisorMyTickets(filters, token);
        if (ignore) return;

        const pageData = response?.data;
        const list = Array.isArray(pageData?.content)
          ? pageData.content
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setTickets(list);
        setTotalPages(Math.max(1, Number(pageData?.totalPages) || 1));
        setTotalElements(Math.max(0, Number(pageData?.totalElements) || 0));
        cacheStaffNames(
          list.map((t) => ({
            staffId: t?.advisorId || t?.assignedAdvisorId,
            fullName: t?.advisorName || t?.assignedAdvisorName || t?.advisor?.fullName,
          })),
        );
      } catch (err) {
        if (ignore) return;
        setError(err?.message || 'Không thể tải danh sách phiếu.');
        setTickets([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();
    return () => { ignore = true; };
  }, [filters, reloadKey]);

  // ── Load page-level assignments (for "has technician" check) ──
  useEffect(() => {
    const token = getToken();
    if (!token || loading || tickets.length === 0) return;

    const ticketIds = tickets
      .map((t) => getTicketId(t))
      .filter((id) => Number.isFinite(id) && id > 0);

    setModalPageAssignments((prev) => {
      const missing = ticketIds.filter((id) => !prev.has(id));
      if (missing.length === 0) return prev;

      Promise.all(
        missing.map(async (ticketId) => {
          try {
            const res = await fetchTicketAssignments(ticketId, token);
            const rawList = Array.isArray(res?.data) ? res.data : [];
            const hasTech = rawList.some(
              (a) =>
                String(a?.roleInTicket || a?.role || '').toUpperCase() === 'TECHNICIAN'
                && String(a?.status || '').toUpperCase() !== 'CANCELLED',
            );
            return { ticketId, hasTech };
          } catch {
            return { ticketId, hasTech: false };
          }
        }),
      ).then((rows) => {
        setModalPageAssignments((current) => {
          const next = new Map(current);
          for (const row of rows) next.set(row.ticketId, row.hasTech);
          return next;
        });
      });

      const next = new Map(prev);
      for (const id of missing) next.set(id, false);
      return next;
    });
  }, [loading, tickets]);

  // ── Load workload + advisor list ───────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetchTechniciansWorkload(token)
      .then((res) => {
        const map = {};
        const list = Array.isArray(res?.data) ? res.data : [];
        for (const tech of list) map[tech.staffId] = tech;
        setWorkloadMap(map);
        cacheStaffNames(list);
      })
      .catch(() => {});

    fetchCheckInAdvisors(token)
      .then((res) => {
        const advisors = Array.isArray(res?.data) ? res.data : [];
        setAdvisorOptions(advisors);
        cacheStaffNames(advisors);
      })
      .catch(() => {});
  }, []);

  // Reset selected ticket when navigating away
  useEffect(() => {
    if (!selectedTicket) return;
    if (tickets.some((t) => getTicketCode(t) === getTicketCode(selectedTicket))) return;
    setSelectedTicket(null);
  }, [tickets, selectedTicket]);

  // ── Helpers ──────────────────────────────────────────────
  const getServiceTicketStatusDisplay = (ticket) => {
    const status = normalizeServiceTicketStatus(ticket);
    return SERVICE_TICKET_STATUS_LABELS[status] || status || '-';
  };

  const getServiceTicketStatusClass = (ticket) => {
    const status = normalizeServiceTicketStatus(ticket);
    if (status === 'DRAFT') return styles.statusPending;
    if (status === 'INSPECTION') return styles.statusInspection;
    if (status === 'PENDING') return styles.statusPending;
    if (status === 'IN_PROGRESS') return styles.statusInspection;
    if (status === 'COMPLETED' || status === 'PAID') return styles.statusActive;
    if (status === 'CANCELLED') return styles.statusInactive;
    return styles.statusPending;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('vi-VN');
  };

  const getStaffDisplayName = (staffId, fallbackName = '') => {
    if (!staffId) return '-';
    if (fallbackName) return fallbackName;
    const mappedName = staffNameMap[Number(staffId)];
    if (mappedName) return mappedName;
    const workload = workloadMap[Number(staffId)];
    if (workload?.fullName) return workload.fullName;
    return `NV-${staffId}`;
  };

  const cacheStaffNames = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return;
    setStaffNameMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of list) {
        const staffId = Number(row?.staffId);
        const fullName = String(
          row?.fullName || row?.staffName || row?.advisorName || '',
        ).trim();
        if (!Number.isFinite(staffId) || staffId <= 0 || !fullName) continue;
        if (next[staffId] !== fullName) { next[staffId] = fullName; changed = true; }
      }
      return changed ? next : prev;
    });
  };

  // ── Open modal ────────────────────────────────────────────
  const handleOpenModal = async (ticket) => {
    setSelectedTicket(ticket);
    setShowAssignModal(true);
    setModalError('');
    setModalSuccess('');
    setModalTechList([]);
    setModalAssignments([]);
    setModalAdvisor(null);
    setSelectedNewAdvisorId('');
    setTechReplacementByAssignment({});
    setLoadingModal(true);

    const token = getToken();
    const ticketId = getTicketId(ticket);

    if (!ticketId) {
      setModalError('Không tìm thấy ticketId.');
      setLoadingModal(false);
      return;
    }

    try {
      const [assignRes, techRes] = await Promise.all([
        fetchTicketAssignments(ticketId, token),
        fetchAvailableStaff(ticketId, 'TECHNICIAN', token),
      ]);

      const existingAssignments = (Array.isArray(assignRes?.data) ? assignRes.data : [])
        .map(normalizeAssignment)
        .filter(Boolean);
      cacheStaffNames(existingAssignments);

      const advisorAssign = existingAssignments.find(
        (a) => a?.roleInTicket === 'ADVISOR' && a?.status !== 'CANCELLED',
      );
      const techAssigns = existingAssignments.filter(
        (a) =>
          a?.roleInTicket === 'TECHNICIAN' && a?.status !== 'CANCELLED',
      );

      setModalAdvisor(advisorAssign || null);
      setSelectedNewAdvisorId(advisorAssign?.staffId ? String(advisorAssign.staffId) : '');
      setModalAssignments(techAssigns);

      if (techAssigns.length > 0) {
        setModalPageAssignments((prev) => {
          const next = new Map(prev);
          next.set(ticketId, true);
          return next;
        });
      }

      const techList = toAvailableStaffList(techRes);
      const assignedTechIds = new Set(
        techAssigns
          .map((a) => Number(a?.staffId))
          .filter((id) => Number.isFinite(id) && id > 0),
      );
      setModalTechList(techList.filter((s) => !assignedTechIds.has(Number(s?.staffId))));
    } catch (err) {
      setModalError(err?.message || 'Không tải được dữ liệu phân công.');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCloseModal = () => {
    setReloadKey((k) => k + 1);
    setShowAssignModal(false);
    setSelectedTicket(null);
    setModalTechList([]);
    setModalAssignments([]);
    setModalAdvisor(null);
    setSelectedNewAdvisorId('');
    setTechReplacementByAssignment({});
    setModalError('');
    setModalSuccess('');
  };

  // ── Change advisor ─────────────────────────────────────────
  const handleChangeAdvisor = async () => {
    const token = getToken();
    const ticketCode = getTicketCode(selectedTicket);
    const currentAdvisorId = Number(modalAdvisor?.staffId);
    const newAdvisorId = Number(selectedNewAdvisorId);

    if (!token || !ticketCode || !Number.isFinite(currentAdvisorId) || currentAdvisorId <= 0) {
      setModalError('Không đủ dữ liệu để đổi advisor.'); return;
    }
    if (!canChangeAdvisorByRole) { setModalError('Chỉ advisor mới có quyền đổi advisor.'); return; }
    if (modalAdvisor?.status !== 'PENDING' && modalAdvisor?.status !== 'ACTIVE') {
      setModalError('Chỉ được đổi advisor khi assignment hiện tại đang PENDING hoặc ACTIVE.'); return;
    }
    if (!Number.isFinite(newAdvisorId) || newAdvisorId <= 0 || newAdvisorId === currentAdvisorId) return;

    setModalError('');
    setModalSuccess('');
    const newAdvisorName = advisorOptions.find(
      (a) => Number(a.staffId) === newAdvisorId,
    )?.fullName || `NV-${newAdvisorId}`;

    if (!window.confirm(`Bạn có chắc chắn muốn đổi cố vấn viên?\n\nCố vấn viên mới: ${newAdvisorName}`)) return;

    setLoadingModal(true);
    try {
      await changeAdvisorByAdvisor(ticketCode, newAdvisorId, 'Đổi advisor từ trang advisor', token);
      const selectedTicketId = getTicketId(selectedTicket);
      if (Number.isFinite(selectedTicketId)) {
        setTickets((prev) => prev.filter((t) => Number(getTicketId(t)) !== Number(selectedTicketId)));
      }
      toast.success('Đã đổi cố vấn viên. Phiếu đã được chuyển sang cố vấn viên mới.');
      handleCloseModal();
    } catch (err) {
      setModalError(err?.message || 'Đổi cố vấn viên thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Change technician ──────────────────────────────────────
  const handleChangeTechnician = async (assignment) => {
    const token = getToken();
    const ticketCode = getTicketCode(selectedTicket);
    const oldTechnicianId = Number(assignment?.staffId);
    const newTechnicianId = Number(techReplacementByAssignment[String(assignment?.assignmentId)] || 0);

    if (!token || !ticketCode || !Number.isFinite(oldTechnicianId) || oldTechnicianId <= 0) {
      setModalError('Không đủ dữ liệu để đổi KTV.'); return;
    }
    if (assignment?.status !== 'PENDING') {
      setModalError('Chỉ được đổi KTV khi assignment hiện tại đang PENDING.'); return;
    }
    if (!Number.isFinite(newTechnicianId) || newTechnicianId <= 0 || newTechnicianId === oldTechnicianId) return;

    setModalError('');
    setModalSuccess('');
    const oldTechName = getStaffDisplayName(oldTechnicianId);
    const newTechName = modalTechList.find(
      (t) => Number(t.staffId) === newTechnicianId,
    )?.fullName || `NV-${newTechnicianId}`;

    if (!window.confirm(`Bạn có muốn đổi KTV?\n\nKTV cũ: ${oldTechName}\nKTV mới: ${newTechName}`)) return;

    setLoadingModal(true);
    try {
      await changeTechnicianByAdvisor(ticketCode, oldTechnicianId, newTechnicianId, 'Đổi KTV từ trang advisor', token);
      await handleOpenModal(selectedTicket);
      setModalSuccess('Đã đổi kỹ thuật viên.');
    } catch (err) {
      setModalError(err?.message || 'Đổi kỹ thuật viên thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Assign technician ──────────────────────────────────────
  const handleAssign = async (tech, isPrimary) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    if (!ticketId) { setModalError('Không tìm thấy ticketId.'); return; }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);

    try {
      const res = await assignStaff(ticketId, {
        staffId: tech.staffId,
        roleInTicket: 'TECHNICIAN',
        isPrimary,
        note: '',
      }, token);

      const newAssignmentRaw = normalizeAssignment(res?.data);
      const newAssignment = newAssignmentRaw
        ? { ...newAssignmentRaw, fullName: newAssignmentRaw.fullName || tech.fullName || `NV-${tech.staffId}` }
        : null;

      if (newAssignment) {
        setModalAssignments((prev) => [...prev, { ...newAssignment }]);
      }

      setModalTechList((prev) => prev.filter((t) => t.staffId !== tech.staffId));
      setModalPageAssignments((prev) => {
        const next = new Map(prev);
        next.set(ticketId, true);
        return next;
      });

      const label = isPrimary ? 'KTV chính' : 'KTV phụ';
      setModalSuccess(`Đã phân công ${label}: ${tech.fullName || `NV-${tech.staffId}`}`);
    } catch (err) {
      setModalError(err?.message || 'Phân công thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Cancel technician ──────────────────────────────────────
  const handleCancelTech = async (assignment) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    const name = getStaffDisplayName(assignment.staffId, assignment.fullName);

    if (!window.confirm(`Bạn có muốn hủy phân công KTV ${name} không?`)) return;
    if (!ticketId) { setModalError('Không tìm thấy ticketId.'); return; }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);

    try {
      await cancelAssignmentById(ticketId, assignment.assignmentId, token);

      setModalAssignments((prev) =>
        prev.map((a) =>
          a.assignmentId === assignment.assignmentId
            ? { ...a, status: 'CANCELLED' }
            : a,
        ),
      );

      const cancelled = modalAssignments.find(
        (a) => a.assignmentId === assignment.assignmentId,
      );
      if (cancelled) {
        const techData = workloadMap[cancelled.staffId];
        if (techData) {
          setModalTechList((prev) => [
            ...prev,
            {
              staffId: cancelled.staffId,
              fullName: techData.fullName,
              phone: techData.phone,
              avatar: techData.avatar,
              roles: techData.roles,
            },
          ]);
        }
      }

      const stillHasTech = modalAssignments.some(
        (a) =>
          a.assignmentId !== assignment.assignmentId
          && String(a?.roleInTicket).toUpperCase() === 'TECHNICIAN'
          && String(a?.status).toUpperCase() !== 'CANCELLED',
      );
      setModalPageAssignments((prev) => {
        const next = new Map(prev);
        next.set(ticketId, stillHasTech);
        return next;
      });

      setModalSuccess(`Đã hủy phân công ${name}.`);
    } catch (err) {
      setModalError(err?.message || 'Hủy phân công thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────
  const hasPrimaryTechnician = modalAssignments.some(
    (a) =>
      a?.roleInTicket === 'TECHNICIAN' && a?.isPrimary === true
      && (a?.status === 'PENDING' || a?.status === 'ACTIVE'),
  );

  const getAdvisorDisplayName = (ticket) =>
    modalAdvisor?.fullName
    || (modalAdvisor?.staffId ? getStaffDisplayName(modalAdvisor.staffId) : '')
    || ticket?.advisorName
    || ticket?.advisor?.fullName
    || ticket?.assignedAdvisorName
    || (ticket?.advisorId ? getStaffDisplayName(ticket.advisorId) : '')
    || '-';

  const getTechWorkloadDisplay = (tech) => {
    const workload = workloadMap[Number(tech?.staffId)];
    const rawBusy = tech?.isBusy ?? tech?.busy ?? tech?.is_busy;
    const busyFromAvailableStaff =
      typeof rawBusy === 'boolean'
        ? rawBusy
        : typeof rawBusy === 'number'
          ? rawBusy === 1
          : typeof rawBusy === 'string'
            ? ['true', '1', 'yes', 'y'].includes(rawBusy.trim().toLowerCase())
            : undefined;
    const busyNote = String(tech?.busyNote ?? tech?.busy_note ?? '').trim();
    const hasBusyInfo = busyFromAvailableStaff !== undefined || busyNote.length > 0;
    const isBusy = hasBusyInfo
      ? (busyFromAvailableStaff ?? busyNote.length > 0)
      : Boolean(workload?.isBusy);
    const ticketCount = Number.isFinite(workload?.currentTicketCount) ? workload.currentTicketCount : 0;

    return {
      isBusy,
      text: busyNote || (hasBusyInfo ? (isBusy ? 'Bận' : 'Rảnh') : `${ticketCount} phiếu — ${isBusy ? 'bận' : 'rảnh'}`),
    };
  };

  const canChangeModalAdvisor =
    modalAdvisor?.status === 'PENDING' || modalAdvisor?.status === 'ACTIVE';

  // ── Pagination helpers ─────────────────────────────────────
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

  return (
    <div className={styles.bookingPage}>
      {/* Header */}
      <div className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <span className={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
          </span>
          <h1>Danh sách phiếu dịch vụ</h1>
        </div>
        <span className={styles.totalCount}>{totalElements} phiếu</span>
      </div>

      <div className={styles.splitLayout}>
        {/* LEFT: Table */}
        <div className={styles.leftPanel}>

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
                  {!loading && tickets.length === 0 && (
                    <tr><td colSpan="8" className={styles.emptyRow}>Không có phiếu nào.</td></tr>
                  )}
                  {!loading && tickets.map((ticket, idx) => {
                    const code = getTicketCode(ticket);
                    const ticketId = getTicketId(ticket);
                    const hasTech = modalPageAssignments.get(ticketId) ?? false;

                    return (
                      <tr key={code || ticketId || idx}>
                        <td>{idx + 1 + page * size}</td>
                        <td className={styles.ticketCodeCell}>{code || '-'}</td>
                        <td>{ticket.customerName || ticket.fullName || '-'}</td>
                        <td>{ticket.customerPhone || ticket.phone || '-'}</td>
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
                        <td>{formatDate(ticket.appointmentDate || ticket.bookingDate || ticket.scheduledDate)}</td>
                        <td>
                          <div className={styles.actionButtons}>
                            {/* Nút Mở — chỉ mở được khi đã phân công KTV */}
                            <button
                              className={styles.actionBtn}
                              onClick={() => {
                                if (!code || !hasTech) return;
                                navigate(`/service-ticket-detail/${encodeURIComponent(code)}`, { state: { ticket } });
                              }}
                              disabled={!code || !hasTech}
                              title={!hasTech ? 'Cần phân công KTV trước khi mở phiếu' : 'Mở chi tiết phiếu dịch vụ'}
                            >
                              Mở
                            </button>
                            {/* Phân công / Xem phân công */}
                            {hasTech ? (
                              <button
                                className={`${styles.actionBtn} ${styles.viewAssignBtn}`}
                                onClick={() => handleOpenModal(ticket)}
                              >
                                Xem phân công
                              </button>
                            ) : (
                              <button
                                className={`${styles.actionBtn} ${styles.assignBtn}`}
                                onClick={() => handleOpenModal(ticket)}
                                disabled={!ticketId}
                              >
                                Phân công
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
        </div>

      </div>

      {/* Modal phân công KTV */}
      {showAssignModal && selectedTicket && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Phân công KTV — {getTicketCode(selectedTicket) || '-'}
              </h3>
              <button className={styles.modalClose} onClick={handleCloseModal}>×</button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Trạng thái phiếu:{' '}
                <strong>{getServiceTicketStatusDisplay(selectedTicket)}</strong>
              </p>

              {modalSuccess && <div className={styles.successBanner}>{modalSuccess}</div>}
              {modalError && <div className={styles.errorBanner}>{modalError}</div>}

              {/* Kiểm tra trạng thái phiếu — không cho thay đổi khi hoàn tất/đã thanh toán/hủy */}
              {(() => {
                const ticketStatus = normalizeServiceTicketStatus(selectedTicket);
                const isFinalized = ['COMPLETED', 'PAID', 'CANCELLED'].includes(ticketStatus);

                return (
                  <>
                    {/* Advisor */}
                    <div className={styles.assignSection}>
                      <h4 className={styles.sectionTitle}>TƯ VẤN VIÊN PHỤ TRÁCH</h4>
                      {loadingModal ? (
                        <p style={{ color: '#9ca3af', fontSize: 13 }}>Đang tải...</p>
                      ) : modalAdvisor ? (
                        <div className={styles.assignCard}>
                          <div className={styles.assignInfo}>
                            <span className={styles.assignName}>{getAdvisorDisplayName(selectedTicket)}</span>
                            <span className={styles.assignRole}>
                              Cố vấn viên &bull;{' '}
                              {STATUS_LABELS[computeDisplayStatus(
                                modalAdvisor.status,
                                selectedTicket?.ticketStatus || selectedTicket?.status,
                              )]
                              || computeDisplayStatus(modalAdvisor.status, selectedTicket?.ticketStatus || selectedTicket?.status)}
                            </span>
                            {!isFinalized && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <select
                                  value={selectedNewAdvisorId}
                                  onChange={(e) => setSelectedNewAdvisorId(e.target.value)}
                                  disabled={loadingModal}
                                  style={{ flex: 1 }}
                                >
                                  <option value="">Chọn advisor mới</option>
                                  {advisorOptions.map((advisor) => (
                                    <option key={advisor.staffId} value={advisor.staffId}>
                                      {advisor.fullName || advisor.staffName || `NV-${advisor.staffId}`}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className={styles.modalActionBtn}
                                  onClick={handleChangeAdvisor}
                                  disabled={
                                    loadingModal
                                    || !canChangeAdvisorByRole
                                    || !canChangeModalAdvisor
                                    || !selectedNewAdvisorId
                                    || Number(selectedNewAdvisorId) === Number(modalAdvisor?.staffId)
                                  }
                                >
                                  Đổi advisor
                                </button>
                              </div>
                            )}
                            {!canChangeModalAdvisor && !isFinalized && (
                              <span className={styles.assignRole}>
                                Chỉ được đổi khi advisor hiện tại đang PENDING hoặc ACTIVE.
                              </span>
                            )}
                            {!canChangeAdvisorByRole && !isFinalized && (
                              <span className={styles.assignRole}>
                                Chỉ advisor mới có quyền đổi advisor.
                              </span>
                            )}
                            {isFinalized && (
                              <span className={styles.assignRole}>
                                Không thể thay đổi khi phiếu đã hoàn tất / đã thanh toán / đã hủy.
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.assignCard}>
                          <div className={styles.assignInfo}>
                            <span className={styles.assignName}>{getAdvisorDisplayName(selectedTicket)}</span>
                            <span className={styles.assignRole}>Chưa có cố vấn viên</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KTV đã phân công */}
                    {!loadingModal && modalAssignments.length > 0 && (
                      <div className={styles.assignSection}>
                        <h4 className={styles.sectionTitle}>KTV ĐÃ PHÂN CÔNG</h4>
                        {modalAssignments.map((a) => {
                          const isCancelled = a?.status === 'CANCELLED';
                          const isPrimary = a?.isPrimary;
                          const isPending = a?.status === 'PENDING';
                          const ticketStatusRaw = selectedTicket?.ticketStatus || selectedTicket?.status;
                          const displayStatus = computeDisplayStatus(a.status, ticketStatusRaw);
                          return (
                            <div key={a.assignmentId} className={styles.assignCard}>
                              <div className={styles.assignInfo}>
                                <span
                                  className={styles.assignName}
                                  style={isCancelled ? { color: '#9ca3af', textDecoration: 'line-through' } : {}}
                                >
                                  {getStaffDisplayName(a.staffId, a.fullName)}
                                </span>
                                <span className={styles.assignRole}>
                                  {isPrimary ? 'KTV chính' : 'KTV phụ'} &bull;{' '}
                                  {STATUS_LABELS[displayStatus] || displayStatus}
                                </span>
                                {/* Nút Đổi KTV / Hủy — chỉ khi PENDING và phiếu chưa finalized */}
                                {isPending && !isCancelled && !isFinalized && (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <select
                                      value={techReplacementByAssignment[String(a?.assignmentId)] || ''}
                                      onChange={(e) =>
                                        setTechReplacementByAssignment((prev) => ({
                                          ...prev,
                                          [String(a?.assignmentId)]: e.target.value,
                                        }))
                                      }
                                      disabled={loadingModal}
                                      style={{ flex: 1 }}
                                    >
                                      <option value="">Chọn KTV thay thế</option>
                                      {modalTechList.map((tech) => (
                                        <option key={tech.staffId} value={tech.staffId}>
                                          {tech.fullName || `NV-${tech.staffId}`}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      className={styles.modalActionBtn}
                                      onClick={() => handleChangeTechnician(a)}
                                      disabled={
                                        loadingModal
                                        || !techReplacementByAssignment[String(a?.assignmentId)]
                                      }
                                    >
                                      Đổi KTV
                                    </button>
                                    <button
                                      className={styles.cancelBtn}
                                      onClick={() => handleCancelTech(a)}
                                      disabled={loadingModal}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Danh sách KTV khả dụng — chỉ khi chưa finalized */}
                    {!isFinalized && !loadingModal && modalTechList.length > 0 && (
                      <div className={styles.assignSection}>
                        <h4 className={styles.sectionTitle}>PHÂN CÔNG KỸ THUẬT VIÊN</h4>

                        {/* Bộ lọc sắp xếp */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                          <label style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Sắp xếp:</label>
                          <select
                            value={techSortBy}
                            onChange={(e) => setTechSortBy(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: '2px solid #e5e7eb',
                              fontSize: 13,
                              color: '#1a1a1a',
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="ticket_asc">Số phiếu: ít → nhiều</option>
                            <option value="ticket_desc">Số phiếu: nhiều → ít</option>
                            <option value="free_first">Rảnh trước</option>
                            <option value="busy_first">Bận trước</option>
                          </select>
                        </div>

                        {/* Danh sách dọc */}
                        <div className={styles.techListVertical}>
                          {(() => {
                            const sorted = [...modalTechList].sort((a, b) => {
                              const wA = workloadMap[Number(a?.staffId)]?.currentTicketCount ?? 0;
                              const wB = workloadMap[Number(b?.staffId)]?.currentTicketCount ?? 0;
                              const busyA = workloadMap[Number(a?.staffId)]?.isBusy ?? false;
                              const busyB = workloadMap[Number(b?.staffId)]?.isBusy ?? false;
                              if (techSortBy === 'ticket_asc') return wA - wB;
                              if (techSortBy === 'ticket_desc') return wB - wA;
                              if (techSortBy === 'free_first') {
                                if (busyA !== busyB) return busyA ? 1 : -1;
                                return wA - wB;
                              }
                              if (techSortBy === 'busy_first') {
                                if (busyA !== busyB) return busyA ? -1 : 1;
                                return wA - wB;
                              }
                              return 0;
                            });

                            return sorted.map((tech) => {
                              const workload = getTechWorkloadDisplay(tech);
                              return (
                                <div key={tech.staffId} className={styles.techListItem}>
                                  <div className={styles.techListInfo}>
                                    <span className={styles.techName}>
                                      {tech.fullName || `NV-${tech.staffId}`}
                                    </span>
                                    <span className={styles.techPhone}>{tech.phone || ''}</span>
                                  </div>
                                  <div className={styles.workloadBadge}>
                                    <span className={workload.isBusy ? styles.busy : styles.available}>
                                      {workload.text}
                                    </span>
                                  </div>
                                  <button
                                    className={styles.assignBtn}
                                    onClick={() => handleAssign(tech, true)}
                                    disabled={loadingModal}
                                  >
                                    Phân công
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {!loadingModal && modalTechList.length === 0 && !isFinalized && (
                      <div className={styles.emptyState}>
                        <p>
                          {modalAssignments.length > 0
                            ? 'Không còn KTV khả dụng nào để phân công thêm.'
                            : 'Chưa có KTV nào khả dụng.'}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className={styles.modalFooter}>
                <button
                  className={styles.modalActionBtn}
                  onClick={handleCloseModal}
                  disabled={loadingModal}
                >
                  Lưu & Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
