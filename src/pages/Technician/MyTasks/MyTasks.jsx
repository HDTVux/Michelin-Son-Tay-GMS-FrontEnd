import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTechnicianTickets, fetchTechnicianTicketDetail, startInspection } from '../../../services/technicianService';
import { fetchTicketAssignments } from '../../../services/serviceTicketService';
import { getServiceTicketStatusTextVi, normalizeServiceTicketStatusCode } from '../../../components/statusUtils.js';
import { tryGetJwtPayload } from '../../../services/tokenUtils';
import styles from './MyTasks.module.css';

const getToken = () => {
  const staffToken = localStorage.getItem('staffToken') || '';
  const authToken = localStorage.getItem('authToken') || '';

  const toValidId = (value) => {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  };
  const getStaffIdFromToken = (token) => {
    const payload = tryGetJwtPayload(token);
    return toValidId(payload?.staffId ?? payload?.staff_id ?? null);
  };

  let profileId = null;
  try {
    const profileRaw = localStorage.getItem('staffProfile');
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      profileId = toValidId(profile?.staffId ?? profile?.id ?? null);
    }
  } catch {
    profileId = null;
  }

  if (profileId != null) {
    if (staffToken && getStaffIdFromToken(staffToken) === profileId) return staffToken;
    if (authToken && getStaffIdFromToken(authToken) === profileId) return authToken;
  }

  return staffToken || authToken;
};
const getTodayLocalISO = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};
const shiftLocalISODate = (dateIso, days) => {
  const raw = String(dateIso || '').trim();
  const baseDate = raw ? new Date(`${raw}T00:00:00`) : new Date();
  if (Number.isNaN(baseDate.getTime())) return getTodayLocalISO();
  baseDate.setDate(baseDate.getDate() + Number(days || 0));
  const offsetMs = baseDate.getTimezoneOffset() * 60000;
  return new Date(baseDate.getTime() - offsetMs).toISOString().slice(0, 10);
};
const toLocalISODate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return getTodayLocalISO();
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};
const parseLocalISODate = (dateIso) => {
  const raw = String(dateIso || '').trim();
  const parsed = raw ? new Date(`${raw}T00:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date(`${getTodayLocalISO()}T00:00:00`) : parsed;
};
const getDateRangeForPeriod = (period, anchorDateIso) => {
  const baseDate = parseLocalISODate(anchorDateIso);
  if (period === 'all') {
    return { from: '', to: '' };
  }
  if (period === 'week') {
    const start = new Date(baseDate);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toLocalISODate(start), to: toLocalISODate(end) };
  }
  if (period === 'month') {
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    return { from: toLocalISODate(start), to: toLocalISODate(end) };
  }
  return { from: toLocalISODate(baseDate), to: toLocalISODate(baseDate) };
};
const shiftPeriodAnchorDate = (period, anchorDateIso, direction) => {
  if (period === 'all') return anchorDateIso || getTodayLocalISO();
  const baseDate = parseLocalISODate(anchorDateIso);
  if (period === 'week') {
    baseDate.setDate(baseDate.getDate() + (Number(direction || 0) * 7));
    return toLocalISODate(baseDate);
  }
  if (period === 'month') {
    baseDate.setMonth(baseDate.getMonth() + Number(direction || 0));
    return toLocalISODate(baseDate);
  }
  return shiftLocalISODate(toLocalISODate(baseDate), Number(direction || 0));
};
const formatCalendarDisplay = (dateIso) => {
  const raw = String(dateIso || '').trim();
  if (!raw) return 'Chọn ngày';
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
const formatPeriodDisplay = (period, dateFrom, dateTo) => {
  if (period === 'all') return 'Tất cả';
  if (period === 'week') return `${formatCalendarDisplay(dateFrom)} - ${formatCalendarDisplay(dateTo)}`;
  if (period === 'month') {
    const date = parseLocalISODate(dateFrom || dateTo);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `Tháng ${month}/${date.getFullYear()}`;
  }
  return formatCalendarDisplay(dateFrom || dateTo);
};

const normalizeTicketStatus = (raw) => {
  return normalizeServiceTicketStatusCode(raw) || 'CREATED';
};

const INSPECTION_STATUS_LABELS = {
  PENDING: 'Chờ kiểm tra',
  COMPLETED: 'Đã kiểm tra',
  SKIPPED: 'Đã bỏ qua',
};

const normalizeINSPECTINGStatus = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'WAITING' || raw === 'REPAIRING' || raw === 'INSPECTING') return 'PENDING';
  if (raw === 'DONE' || raw === 'FINISHED' || raw === 'PASSED') return 'COMPLETED';
  if (raw === 'SKIP' || raw === 'DISABLED') return 'SKIPPED';
  if (raw === 'PENDING' || raw === 'COMPLETED' || raw === 'SKIPPED') return raw;
  return null;
};
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const parseTimeParts = (timeStr) => {
  if (!timeStr) return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] != null ? Number(m[3]) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
  return { hour, minute, second };
};
const getCurrentTechnicianId = (tokenArg) => {
  try {
    const profileRaw = localStorage.getItem('staffProfile');
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      const profileStaffId = toPositiveNumber(
        profile?.staffId
        ?? profile?.staffID
        ?? profile?.staff_id
        ?? profile?.id,
      );
      if (profileStaffId != null) return Math.trunc(profileStaffId);
    }
  } catch {
    // Fall back to token payload below.
  }

  const token = tokenArg || getToken();
  if (!token) return null;
  const payload = tryGetJwtPayload(token);
  const tokenStaffId = toPositiveNumber(
    payload?.staffId
    ?? payload?.staffID
    ?? payload?.staff_id
    ?? payload?.id,
  );
  return tokenStaffId != null ? Math.trunc(tokenStaffId) : null;
};
const parseFlexibleDateTime = (dateValue, timeValue) => {
  const rawDate = String(dateValue || '').trim();
  if (!rawDate) return null;
  const rawTime = String(timeValue || '').trim();
  const isoTry = new Date(rawDate);
  if (!Number.isNaN(isoTry.getTime())) {
    const hasTimeInDate = /[T\s]\d{1,2}:\d{2}/.test(rawDate);
    if (hasTimeInDate) return { date: isoTry, hasTime: true };
    const timeParts = parseTimeParts(rawTime);
    if (timeParts) {
      isoTry.setHours(timeParts.hour, timeParts.minute, timeParts.second, 0);
      return { date: isoTry, hasTime: true };
    }
    isoTry.setHours(0, 0, 0, 0);
    return { date: isoTry, hasTime: false };
  }

  // dd/MM/yyyy or dd-MM-yyyy, optional time part in the same string
  const compact = rawDate.replace(/\s+/g, ' ').trim();
  const dmY = compact.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!dmY) return null;

  const day = Number(dmY[1]);
  const month = Number(dmY[2]);
  const year = Number(dmY[3]);
  let hour = dmY[4] != null ? Number(dmY[4]) : 0;
  let minute = dmY[5] != null ? Number(dmY[5]) : 0;
  let second = dmY[6] != null ? Number(dmY[6]) : 0;
  let hasTime = dmY[4] != null;
  if (!hasTime) {
    const timeParts = parseTimeParts(rawTime);
    if (timeParts) {
      hour = timeParts.hour;
      minute = timeParts.minute;
      second = timeParts.second;
      hasTime = true;
    }
  }

  const parsed = new Date(year, month - 1, day, hour, minute, second, 0);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return null;
  return { date: parsed, hasTime };
};

const getTicketScheduleDateTimeInfo = (ticket) => {
  const timeFallback = [
    ticket?.scheduledTime,
    ticket?.appointmentTime,
    ticket?.bookingTime,
    ticket?.timeSlot,
    ticket?.booking?.scheduledTime,
  ].find((item) => String(item || '').trim() !== '');
  const dateCandidates = [
    ticket?.appointmentDate,
    ticket?.scheduledDate,
    ticket?.bookingDate,
    ticket?.booking?.scheduledDate,
    ticket?.dueDate,
    ticket?.receivedAt,
    ticket?.createdAt,
  ];
  for (const candidate of dateCandidates) {
    const parsed = parseFlexibleDateTime(candidate, timeFallback);
    if (parsed?.date) return parsed;
  }
  return null;
};
const formatTicketScheduleDateTime = (ticket) => {
  const info = getTicketScheduleDateTimeInfo(ticket);
  if (!info?.date) return '-';
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(info.date);
  const timePart = info.hasTime
    ? new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(info.date)
    : '--:--';
  return `${datePart} ${timePart}`;
};

const normalizeAssignmentStatus = (value) => String(value || '').trim().toUpperCase();
const isCancelledAssignmentStatus = (value) => {
  const status = normalizeAssignmentStatus(value);
  return status === 'CANCELLED' || status === 'CANCELED' || status === 'REMOVED' || status === 'DELETED';
};
const getTicketIdRaw = (ticket) => toPositiveNumber(
  ticket?.serviceTicketId
  ?? ticket?.serviceTicketID
  ?? ticket?.service_ticket_id
  ?? ticket?.ticketId
  ?? ticket?.ticketID
  ?? ticket?.ticket_id
  ?? ticket?.id
  ?? ticket?.serviceTicket?.serviceTicketId
  ?? ticket?.serviceTicket?.serviceTicketID
  ?? ticket?.serviceTicket?.id
  ?? ticket?.ticket?.serviceTicketId
  ?? ticket?.ticket?.serviceTicketID
  ?? ticket?.ticket?.id,
);
const getDirectTechnicianIdsFromTicket = (ticket) => {
  const ids = new Set();
  const directCandidates = [
    ticket?.technicianId,
    ticket?.technicianID,
    ticket?.technician_id,
    ticket?.assignedTechnicianId,
    ticket?.assignedTechnicianID,
    ticket?.assigned_technician_id,
    ticket?.primaryTechnicianId,
    ticket?.primaryTechnicianID,
    ticket?.primary_technician_id,
    ticket?.technician?.staffId,
    ticket?.technician?.staffID,
    ticket?.technician?.id,
    ticket?.assignedTechnician?.staffId,
    ticket?.assignedTechnician?.staffID,
    ticket?.assignedTechnician?.id,
    ticket?.primaryTechnician?.staffId,
    ticket?.primaryTechnician?.staffID,
    ticket?.primaryTechnician?.id,
    ticket?.serviceTicket?.technicianId,
    ticket?.serviceTicket?.technicianID,
    ticket?.serviceTicket?.assignedTechnicianId,
    ticket?.serviceTicket?.assignedTechnicianID,
    ticket?.serviceTicket?.primaryTechnicianId,
    ticket?.serviceTicket?.primaryTechnicianID,
    ticket?.ticket?.technicianId,
    ticket?.ticket?.technicianID,
    ticket?.ticket?.assignedTechnicianId,
    ticket?.ticket?.assignedTechnicianID,
    ticket?.ticket?.primaryTechnicianId,
    ticket?.ticket?.primaryTechnicianID,
  ];
  directCandidates.forEach((candidate) => {
    const parsed = toPositiveNumber(candidate);
    if (parsed != null) ids.add(parsed);
  });

  const assignmentSources = [
    ticket?.assignments,
    ticket?.ticketAssignments,
    ticket?.staffAssignments,
    ticket?.serviceTicketAssignments,
  ];
  assignmentSources.forEach((source) => {
    if (!Array.isArray(source)) return;
    source.forEach((item) => {
      const role = String(item?.roleInTicket || item?.role || '').trim().toUpperCase();
      if (role !== 'TECHNICIAN') return;
      if (isCancelledAssignmentStatus(item?.status || item?.assignmentStatus)) return;
      const parsed = toPositiveNumber(
        item?.staffId
        ?? item?.staffID
        ?? item?.staff_id
        ?? item?.technicianId
        ?? item?.technicianID
        ?? item?.technician?.staffId
        ?? item?.technician?.staffID
        ?? item?.technician?.id,
      );
      if (parsed != null) ids.add(parsed);
    });
  });
  return ids;
};
const hasCurrentTechnicianAssignment = (assignments, technicianId) => {
  const currentTechId = toPositiveNumber(technicianId);
  if (currentTechId == null) return false;
  const rows = Array.isArray(assignments) ? assignments : [];
  return rows.some((assignment) => {
    const role = String(assignment?.roleInTicket || assignment?.role || '').trim().toUpperCase();
    if (role !== 'TECHNICIAN') return false;
    if (isCancelledAssignmentStatus(assignment?.status || assignment?.assignmentStatus)) return false;
    const assignmentStaffId = toPositiveNumber(
      assignment?.staffId
      ?? assignment?.staffID
      ?? assignment?.staff_id
      ?? assignment?.technicianId
      ?? assignment?.technicianID
      ?? assignment?.technician?.staffId
      ?? assignment?.technician?.staffID
      ?? assignment?.technician?.id,
    );
    return assignmentStaffId === currentTechId;
  });
};
const hasAnyActiveTechnicianAssignment = (assignments) => {
  const rows = Array.isArray(assignments) ? assignments : [];
  return rows.some((assignment) => {
    const role = String(assignment?.roleInTicket || assignment?.role || '').trim().toUpperCase();
    if (role !== 'TECHNICIAN') return false;
    return !isCancelledAssignmentStatus(assignment?.status || assignment?.assignmentStatus);
  });
};
const looksLikeTicketRow = (row) =>
  row
  && typeof row === 'object'
  && (
    row.ticketCode != null
    || row.serviceTicketId != null
    || row.ticketId != null
    || row.licensePlate != null
  );
const extractTicketListFromResponse = (response) => {
  const root = response?.data ?? response;
  const directCandidates = [
    root?.content,
    root?.data?.content,
    root?.data?.data?.content,
    root?.data?.data,
    root?.data,
    root,
  ];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate) && candidate.some(looksLikeTicketRow)) return candidate;
  }

  const queue = [{ node: root, depth: 0 }];
  const visited = new Set();
  while (queue.length > 0) {
    const { node, depth } = queue.shift();
    if (!node || typeof node !== 'object' || visited.has(node) || depth > 4) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      if (node.some(looksLikeTicketRow)) return node;
      node.forEach((item) => queue.push({ node: item, depth: depth + 1 }));
      continue;
    }

    Object.values(node).forEach((value) => {
      if (Array.isArray(value) && value.some(looksLikeTicketRow)) {
        queue.unshift({ node: value, depth: depth + 1 });
      } else if (value && typeof value === 'object') {
        queue.push({ node: value, depth: depth + 1 });
      }
    });
  }
  return [];
};
const extractAssignmentListFromResponse = (response) => {
  const root = response?.data ?? response;
  const candidates = [
    root,
    root?.data,
    root?.content,
    root?.data?.content,
    root?.data?.data,
    root?.data?.data?.content,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

function MyTasks() {
  const navigate = useNavigate();
  const initialDate = useMemo(() => getTodayLocalISO(), []);

  // â”€â”€ List state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // â”€â”€ Filter + pagination state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [periodFilter, setPeriodFilter] = useState('today');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // â”€â”€ Modal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const dayPickerRef = useRef(null);

  // â”€â”€ Debounce search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => ({
    date: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  }), [dateFrom, dateTo, statusFilter, debouncedSearch]);

  // â”€â”€ Load ticket list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        const technicianId = getCurrentTechnicianId(token);
        const response = await fetchTechnicianTickets({ ...filters, page: 0, size: 200 }, token);
        const list = extractTicketListFromResponse(response);

        const assignmentChecked = await Promise.all(
          list.map(async (ticket) => {
            const directIds = getDirectTechnicianIdsFromTicket(ticket);
            const ticketId = getTicketIdRaw(ticket);

            if (ticketId == null) {
              if (technicianId != null && directIds.size > 0) {
                return directIds.has(technicianId) ? ticket : null;
              }
              return ticket;
            }

            try {
              const assignmentResponse = await fetchTicketAssignments(ticketId, token);
              const assignments = extractAssignmentListFromResponse(assignmentResponse);
              if (assignments.length > 0) {
                if (technicianId != null) {
                  return hasCurrentTechnicianAssignment(assignments, technicianId) ? ticket : null;
                }
                return hasAnyActiveTechnicianAssignment(assignments) ? ticket : null;
              }
            } catch {
              // Fallback to direct fields if assignment endpoint is temporarily unavailable.
            }

            if (technicianId != null) {
              if (directIds.size === 0) return ticket;
              return directIds.has(technicianId) ? ticket : null;
            }
            return ticket;
          }),
        );
        const visibleTickets = assignmentChecked.filter(Boolean);

        const transformed = visibleTickets.map((t) => {
          const statusRaw = normalizeTicketStatus(t.ticketStatus || t.status);
          let INSPECTINGStatus = null;
          if (t.ticketCode) {
            try {
              const norm = normalizeINSPECTINGStatus(
                t.INSPECTINGStatus || t.safetyINSPECTINGStatus,
              );
              if (norm) INSPECTINGStatus = norm;
            } catch { /* ignore */ }
          }
          return {
            ...t,
            _status: statusRaw,
            _INSPECTINGStatus: INSPECTINGStatus,
          };
        });

        if (!ignore) {
          setTickets(transformed);
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

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    return getServiceTicketStatusTextVi(s, s || '-');
  };

  const getServiceTicketStatusClass = (ticket) => {
    const s = ticket._status || normalizeTicketStatus(ticket?.ticketStatus || ticket?.status);
    if (s === 'CREATED') return styles.statusPending;
    if (s === 'INSPECTING') return styles.statusInspection;
    if (s === 'PENDING') return styles.statusPending;
    if (s === 'REPAIRING') return styles.statusInspection;
    if (s === 'COMPLETED' || s === 'PAID') return styles.statusActive;
    if (s === 'CANCELLED') return styles.statusInactive;
    return styles.statusPending;
  };

  const getINSPECTINGStatusDisplay = (status) =>
    INSPECTION_STATUS_LABELS[status?.toUpperCase()] || status || '-';

  const getINSPECTINGStatusClass = (status) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return styles.statusInspection;
    if (s === 'COMPLETED') return styles.statusActive;
    if (s === 'SKIPPED') return styles.statusInactive;
    return styles.statusPending;
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
        const info = getTicketScheduleDateTimeInfo(t);
        return info?.date ? info.date >= from : false;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        const info = getTicketScheduleDateTimeInfo(t);
        return info?.date ? info.date <= to : false;
      });
    }
    return result;
  }, [tickets, statusFilter, debouncedSearch, dateFrom, dateTo]);

  const filteredTotalElements = filteredTickets.length;
  const computedTotalPages = Math.max(1, Math.ceil(filteredTotalElements / size));
  const safePage = Math.min(Math.max(0, page), computedTotalPages - 1);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pagedTickets = useMemo(() => {
    const start = safePage * size;
    return filteredTickets.slice(start, start + size);
  }, [filteredTickets, safePage, size]);

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stats = useMemo(() => ({
    total: tickets.length,
    inProgress: tickets.filter((t) =>
      t._status === 'INSPECTING' || t._status === 'REPAIRING',
    ).length,
    completed: tickets.filter((t) => t._status === 'COMPLETED' || t._status === 'PAID').length,
    cancelled: tickets.filter((t) => t._status === 'CANCELLED').length,
  }), [tickets]);

  // â”€â”€ Pagination helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pageButtons = useMemo(() => {
    const max = 5;
    const last = computedTotalPages - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const items = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) items.push(i);
    return items;
  }, [safePage, computedTotalPages]);

  const activeDate = dateFrom || dateTo || initialDate;
  const applyPeriodFilter = (period, dateIso) => {
    const next = String(dateIso || '').trim();
    if (!next) return;
    const range = getDateRangeForPeriod(period, next);
    setDateFrom(range.from);
    setDateTo(range.to);
    setPage(0);
  };
  const handlePeriodFilterChange = (period) => {
    setPeriodFilter(period);
    if (period === 'custom') return;
    applyPeriodFilter(period, activeDate);
  };
  const handlePreviousDay = () => applyPeriodFilter(periodFilter, shiftPeriodAnchorDate(periodFilter, activeDate, -1));
  const handleNextDay = () => applyPeriodFilter(periodFilter, shiftPeriodAnchorDate(periodFilter, activeDate, 1));
  const handlePickDay = (value) => applyPeriodFilter(periodFilter, value);
  const handleOpenCalendar = () => {
    const picker = dayPickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
    picker.click();
  };

  const handleResetFilters = () => {
    const today = getTodayLocalISO();
    setPage(0);
    setSize(10);
    setDateFrom(today);
    setDateTo(today);
    setPeriodFilter('today');
    setStatusFilter('');
    setSearch('');
    setDebouncedSearch('');
  };

  // â”€â”€ Start work â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          getTicketCode(t) === code ? { ...t, _status: 'INSPECTING' } : t,
        ),
      );
      navigate(`/technician/safetyinspection-ticket/${encodeURIComponent(code)}`);
    } catch {
      toast.error('Không thể bắt đầu làm việc.');
    }
  };

  const handleOpenSafetyInspection = async (ticket) => {
    const token = getToken();
    const code = String(getTicketCode(ticket) || '').trim();
    if (!token || !code) {
      toast.error('Thiếu thông tin phiếu để mở phiếu kiểm tra an toàn.');
      return;
    }

    const status = normalizeTicketStatus(ticket?._status || ticket?.ticketStatus || ticket?.status);
    const canTrySync = !['INSPECTING', 'INSPECTED', 'REPAIRING', 'COMPLETED', 'PAID', 'CANCELLED'].includes(status);

    if (canTrySync) {
      try {
        await startInspection(code, token);
        setTickets((prev) =>
          prev.map((t) =>
            getTicketCode(t) === code ? { ...t, _status: 'INSPECTING' } : t,
          ),
        );
      } catch {
        // Do not block navigation if the backend rejects a duplicate/unsupported transition.
      }
    }

    navigate(`/technician/safetyinspection-ticket/${encodeURIComponent(code)}`);
  };

  // â”€â”€ View detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    } catch {
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
        <span className={styles.totalCount}>{filteredTotalElements} công việc</span>
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
            <span>Khoảng lọc</span>
            <span>Lịch ngày</span>
            <span>Trạng thái</span>
          </div>
          <div className={styles.filterCardControls}>
            <select
              value={periodFilter}
              onChange={(e) => handlePeriodFilterChange(e.target.value)}
              aria-label="Chọn khoảng lọc công việc"
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="custom">Tùy chọn</option>
            </select>
            <div className={styles.dayNavigator}>
              <button type="button" className={styles.dayNavBtn} onClick={handlePreviousDay}>
                Trước
              </button>
              <button type="button" className={styles.dayCenterBtn} onClick={handleOpenCalendar}>
                {formatPeriodDisplay(periodFilter, dateFrom, dateTo)}
              </button>
              <button type="button" className={styles.dayNavBtn} onClick={handleNextDay}>
                Sau
              </button>
              <input
                ref={dayPickerRef}
                type="date"
                value={activeDate}
                onChange={(e) => handlePickDay(e.target.value)}
                className={styles.hiddenDateInput}
                aria-label="Chọn ngày xử lý"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
            <option value="">Tất cả</option>
            <option value="CREATED">Khởi tạo phiếu</option>
            <option value="INSPECTING">Đang kiểm tra</option>
            <option value="INSPECTED">Đã kiểm tra</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="ESTIMATED">Đã báo giá</option>
            <option value="REPAIRING">Đang sửa chữa</option>
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
            Về hôm nay
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
                const canStart = ticket._status === 'CREATED' && hasSafetyInspection;
                const canWork = ticket._status !== 'CREATED' || !hasSafetyInspection;

                return (
                  <tr key={ticketId || code || idx}>
                    <td>{idx + 1 + safePage * size}</td>
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
                    <td>{formatTicketScheduleDateTime(ticket)}</td>
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
                            onClick={() => handleOpenSafetyInspection(ticket)}
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
              disabled={safePage >= computedTotalPages - 1 || loading}
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
                    {selectedTask._INSPECTINGStatus && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Kiểm tra AT</span>
                        <span className={`${styles.statusBadge} ${getINSPECTINGStatusClass(selectedTask._INSPECTINGStatus)}`}>
                          {getINSPECTINGStatusDisplay(selectedTask._INSPECTINGStatus)}
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
              {selectedTask._status === 'CREATED' && selectedTask.safetyInspectionEnabled !== false && (
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
              {selectedTask._status !== 'CREATED' && selectedTask.safetyInspectionEnabled !== false && (
                <button
                  className={styles.modalActionBtn}
                  onClick={() => {
                    setShowModal(false);
                    handleOpenSafetyInspection(selectedTask);
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

export default MyTasks;
