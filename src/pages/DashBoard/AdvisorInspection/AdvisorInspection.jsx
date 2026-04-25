import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAdvisorMyTickets,
  fetchServiceTicketDetail,
  fetchAvailableStaff,
  assignStaff,
  cancelAssignmentById,
  changeAdvisorByAdvisor,
  changeTechnicianByAdvisor,
  fetchTechniciansWorkload,
  fetchTicketAssignments,
  swapServiceTicketQueue,
  fetchAdvisorTicketRepairHistory,
  fetchSafetyInspectionCurrentRecommend,
} from '../../../services/serviceTicketService';
import { fetchCheckInAdvisors } from '../../../services/checkInService';
import { formatTimeHHmm, parseBackendDateTime } from '../../../components/timeUtils.js';
import { getServiceTicketStatusTextVi, normalizeServiceTicketStatusCode } from '../../../components/statusUtils.js';
import { tryGetJwtPayload } from '../../../services/tokenUtils';
import styles from './AdvisorInspection.module.css';

const STAFF_ROLE = { ADVISOR: 'ADVISOR' };
const ADVISOR_INSPECTION_DAY_STORAGE_KEY = 'advisorInspection.activeDay';
const SOFT_REFRESH_THROTTLE_MS = 15000;
const ADVISOR_TICKET_LOOKUP_SIZE = 200;

const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('staffToken');
const toPositiveStaffId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? Math.trunc(id) : null;
};
const getCurrentStaffId = (tokenArg) => {
  let profileId = null;
  try {
    const raw = localStorage.getItem('staffProfile');
    if (raw) {
      const profile = JSON.parse(raw);
      profileId = toPositiveStaffId(profile?.staffId ?? profile?.id);
    }
  } catch {
    profileId = null;
  }
  if (profileId != null) return profileId;

  const payload = tryGetJwtPayload(tokenArg || getToken());
  return toPositiveStaffId(payload?.staffId ?? payload?.staff_id ?? payload?.id);
};
const getAuthFingerprint = () => {
  const token = getToken();
  if (!token) return '';
  return String(token).slice(-24);
};
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
const readPersistedActiveDay = () => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(ADVISOR_INSPECTION_DAY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const storedFingerprint = String(parsed?.authFingerprint || '');
    const currentFingerprint = getAuthFingerprint();
    const storedDate = String(parsed?.date || '').trim();
    if (!storedFingerprint || storedFingerprint !== currentFingerprint) return null;
    if (!isIsoDate(storedDate)) return null;
    return storedDate;
  } catch {
    return null;
  }
};
const persistActiveDay = (dateIso) => {
  try {
    if (typeof window === 'undefined') return;
    const nextDate = String(dateIso || '').trim();
    if (!isIsoDate(nextDate)) return;
    const payload = {
      authFingerprint: getAuthFingerprint(),
      date: nextDate,
    };
    sessionStorage.setItem(ADVISOR_INSPECTION_DAY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage write failure
  }
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
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
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
  if (ticket?.serviceTicketID != null) return Number(ticket.serviceTicketID);
  if (ticket?.service_ticket_id != null) return Number(ticket.service_ticket_id);
  if (ticket?.ticketId != null) return Number(ticket.ticketId);
  if (ticket?.ticketID != null) return Number(ticket.ticketID);
  if (ticket?.ticket_id != null) return Number(ticket.ticket_id);
  if (ticket?.id != null) return Number(ticket.id);
  if (ticket?.serviceTicket?.serviceTicketId != null) return Number(ticket.serviceTicket.serviceTicketId);
  if (ticket?.serviceTicket?.id != null) return Number(ticket.serviceTicket.id);
  if (ticket?.ticket?.serviceTicketId != null) return Number(ticket.ticket.serviceTicketId);
  if (ticket?.ticket?.id != null) return Number(ticket.ticket.id);
  return null;
};
const getTicketCustomerId = (ticket) => {
  const candidates = [
    ticket?.customerId,
    ticket?.customerID,
    ticket?.customer_id,
    ticket?.customer?.customerId,
    ticket?.customer?.id,
    ticket?.serviceTicket?.customerId,
    ticket?.serviceTicket?.customer?.customerId,
    ticket?.serviceTicket?.customer?.id,
    ticket?.ticket?.customerId,
    ticket?.ticket?.customer?.customerId,
    ticket?.ticket?.customer?.id,
  ];
  for (const value of candidates) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
};
const getTicketVehicleId = (ticket) => {
  const candidates = [
    ticket?.vehicleId,
    ticket?.vehicleID,
    ticket?.vehicle_id,
    ticket?.vehicle?.vehicleId,
    ticket?.vehicle?.id,
    ticket?.serviceTicket?.vehicleId,
    ticket?.serviceTicket?.vehicle?.vehicleId,
    ticket?.serviceTicket?.vehicle?.id,
    ticket?.ticket?.vehicleId,
    ticket?.ticket?.vehicle?.vehicleId,
    ticket?.ticket?.vehicle?.id,
  ];
  for (const value of candidates) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
};
const getTicketStatus = (ticket) => ticket?.status || ticket?.ticketStatus || ticket?.statusCode || '';
const getTicketCustomerPhone = (ticket) =>
  ticket?.customerPhone
  || ticket?.phone
  || ticket?.customer?.phone
  || ticket?.checkInPhone
  || ticket?.checkIn?.phone
  || '-';
const toDateKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const viMatch = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
  if (viMatch) {
    const day = String(viMatch[1]).padStart(2, '0');
    const month = String(viMatch[2]).padStart(2, '0');
    return `${viMatch[3]}-${month}-${day}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10);
};
const getTicketAppointmentDateRaw = (ticket) =>
  ticket?.appointmentDate
  || ticket?.bookingDate
  || ticket?.scheduledDate
  || ticket?.booking?.scheduledDate
  || ticket?.serviceTicket?.appointmentDate
  || ticket?.serviceTicket?.bookingDate
  || ticket?.serviceTicket?.scheduledDate
  || ticket?.serviceTicket?.booking?.scheduledDate
  || '';
const getTicketAppointmentTimeRaw = (ticket) =>
  ticket?.appointmentTime
  || ticket?.bookingTime
  || ticket?.scheduledTime
  || ticket?.booking?.scheduledTime
  || ticket?.serviceTicket?.appointmentTime
  || ticket?.serviceTicket?.bookingTime
  || ticket?.serviceTicket?.scheduledTime
  || ticket?.serviceTicket?.booking?.scheduledTime
  || '';
const getTicketAppointmentDateKey = (ticket) => toDateKey(getTicketAppointmentDateRaw(ticket));
const getTicketAppointmentDateTimeLabel = (ticket) => {
  const date = String(getTicketAppointmentDateRaw(ticket)).trim();
  const time = formatTimeHHmm(getTicketAppointmentTimeRaw(ticket));
  return date ? `${date} ${time || ''}`.trim() : time || '-';
};
const isFutureAppointmentTicket = (ticket) => {
  const appointmentKey = getTicketAppointmentDateKey(ticket);
  if (!isIsoDate(appointmentKey)) return false;
  return appointmentKey > getTodayLocalISO();
};
const getFutureAppointmentTicketMessage = (ticket) => {
  const code = String(getTicketCode(ticket) || '').trim();
  const prefix = code ? `Phiếu ${code} ` : 'Phiếu này ';
  return `${prefix}có lịch hẹn ${getTicketAppointmentDateTimeLabel(ticket)}. Đến đúng ngày hẹn mới được điều phối phiếu này.`;
};
const filterTicketsByAppointmentDate = (rows, fromDate, toDate) => {
  const list = Array.isArray(rows) ? rows : [];
  const startKey = toDateKey(fromDate);
  const endKey = toDateKey(toDate || fromDate);
  if (!startKey && !endKey) return list;

  return list.filter((ticket) => {
    const appointmentKey = getTicketAppointmentDateKey(ticket);
    if (!appointmentKey) return false;
    if (startKey && appointmentKey < startKey) return false;
    if (endKey && appointmentKey > endKey) return false;
    return true;
  });
};
const getTicketCreateDateKey = (ticket) =>
  toDateKey(
    ticket?.createdAt
    || ticket?.createDate
    || ticket?.createdDate
    || ticket?.created_at
    || ticket?.serviceTicket?.createdAt
    || '',
  );
const toPositiveQueueNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const getTicketQueueNumber = (ticket) => {
  const keys = [
    'queueNumber',
    'queue_number',
    'queueNo',
    'queue_no',
    'queueOrder',
    'queue_order',
    'orderInQueue',
    'order_in_queue',
  ];

  for (const key of keys) {
    const direct = toPositiveQueueNumber(ticket?.[key]);
    if (direct != null) return direct;
  }

  const nestedSources = [
    ticket?.checkIn,
    ticket?.checkin,
    ticket?.checkInInfo,
    ticket?.reception,
    ticket?.receptionInfo,
    ticket?.booking,
    ticket?.serviceTicket,
    ticket?.ticket,
  ];

  for (const nested of nestedSources) {
    for (const key of keys) {
      const nestedValue = toPositiveQueueNumber(nested?.[key]);
      if (nestedValue != null) return nestedValue;
    }
  }
  return null;
};
const getTicketQueueTime = (ticket) => {
  const raw =
    ticket?.checkInTime
    || ticket?.checkinTime
    || ticket?.checkedInAt
    || ticket?.createdAt
    || ticket?.updatedAt
    || '';
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : null;
};
const sortTicketsByQueueOrder = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  return [...list].sort((a, b) => {
    const aq = getTicketQueueNumber(a);
    const bq = getTicketQueueNumber(b);
    const aHasQueue = Number.isFinite(aq) && aq > 0;
    const bHasQueue = Number.isFinite(bq) && bq > 0;
    if (aHasQueue && bHasQueue) return aq - bq;
    if (aHasQueue) return -1;
    if (bHasQueue) return 1;

    const at = getTicketQueueTime(a);
    const bt = getTicketQueueTime(b);
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    if (Number.isFinite(at)) return -1;
    if (Number.isFinite(bt)) return 1;

    const aid = Number(getTicketId(a) || 0);
    const bid = Number(getTicketId(b) || 0);
    return aid - bid;
  });
};
const compactText = (value, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};
const unwrapApiPayload = (response) => response?.data?.data ?? response?.data ?? response;
const extractRepairHistoryRows = (response) => {
  const payload = unwrapApiPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.histories)) return payload.histories;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  if (Array.isArray(payload?.serviceTickets)) return payload.serviceTickets;
  if (payload && typeof payload === 'object') return [payload];
  return [];
};
const extractRecommendationText = (response) => {
  const payload = unwrapApiPayload(response);
  if (payload == null) return '';

  if (typeof payload === 'string') {
    const text = payload.trim();
    return ['SUCCESS', 'OK', 'FAILED', 'FAILURE', 'ERROR'].includes(text.toUpperCase()) ? '' : text;
  }

  if (typeof payload === 'object') {
    const value =
      payload?.recommend
      ?? payload?.recommendation
      ?? payload?.recommendationText
      ?? payload?.currentRecommend
      ?? payload?.advisorRecommendation
      ?? payload?.data?.recommend
      ?? payload?.data?.recommendation
      ?? payload?.data?.recommendationText
      ?? payload?.data?.currentRecommend;
    return typeof value === 'string' ? value.trim() : '';
  }

  return '';
};
const getHistoryTicketCode = (row) =>
  compactText(row?.ticketCode || row?.serviceTicketCode || row?.code || row?.serviceTicket?.ticketCode || row?.ticket?.ticketCode);
const getHistoryDateTime = (row) =>
  row?.completedAt
  || row?.handoverAt
  || row?.receivedAt
  || row?.createdAt
  || row?.serviceDate
  || row?.date
  || row?.serviceTicket?.completedAt
  || row?.serviceTicket?.receivedAt
  || '';
const getRepairHistoryCompareDateTime = (row) => {
  const scheduledDate = String(
    row?.scheduledDate
    || row?.appointmentDate
    || row?.bookingDate
    || row?.booking?.scheduledDate
    || '',
  ).trim();
  const scheduledTime = formatTimeHHmm(
    row?.scheduledTime
    || row?.appointmentTime
    || row?.bookingTime
    || row?.booking?.scheduledTime
    || '',
  );
  const scheduledRaw = scheduledDate ? `${scheduledDate} ${scheduledTime || ''}`.trim() : '';

  return row?.receivedAt
    || row?.createdAt
    || row?.serviceTicket?.receivedAt
    || row?.serviceTicket?.createdAt
    || scheduledRaw
    || row?.completedAt
    || row?.handoverAt
    || row?.date
    || '';
};
const hasTimeComponent = (value) => /(?:T|\s)\d{1,2}:\d{2}/.test(String(value || '').trim());
const getRepairHistoryTimestampFromRaw = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = parseBackendDateTime(raw);
  if (parsed) return parsed.getTime();
  const fallback = Date.parse(raw);
  return Number.isFinite(fallback) ? fallback : null;
};
const getRepairHistoryTimestamp = (row) => getRepairHistoryTimestampFromRaw(getRepairHistoryCompareDateTime(row));
const getRepairHistoryBestTimestamp = (...rows) => {
  const candidates = rows
    .map((row) => getRepairHistoryCompareDateTime(row))
    .map((raw) => ({ raw, timestamp: getRepairHistoryTimestampFromRaw(raw) }))
    .filter((item) => item.timestamp != null);

  const timedCandidate = candidates.find((item) => hasTimeComponent(item.raw));
  return timedCandidate?.timestamp ?? candidates[0]?.timestamp ?? null;
};
const formatHistoryDateTime = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const parsed = parseBackendDateTime(raw);
  if (!parsed) return raw;
  return parsed.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};
const getRepairHistoryRecommendation = (row) =>
  compactText(
    row?.recommend
    || row?.recommendation
    || row?.recommendationText
    || row?.currentRecommend
    || row?.advisorRecommendation
    || row?.safetyInspection?.recommend
    || row?.safetyInspection?.recommendation,
    '',
  );
const getRepairHistoryRowKey = (row, index) =>
  String(getTicketId(row) || getHistoryTicketCode(row) || index);
const getSwappedTicketOrder = (rows, sourceTicketId, targetTicketId) => {
  const list = Array.isArray(rows) ? rows : [];
  const fromIndex = list.findIndex((t) => Number(getTicketId(t)) === Number(sourceTicketId));
  const toIndex = list.findIndex((t) => Number(getTicketId(t)) === Number(targetTicketId));
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};
const withQueueNumber = (ticket, queueNumber) => {
  const num = Number(queueNumber);
  if (!Number.isFinite(num) || num <= 0) {
    return {
      ...ticket,
      queueNumber: null,
      queue_number: null,
      queueNo: null,
      queue_no: null,
      queueOrder: null,
      queue_order: null,
      orderInQueue: null,
      order_in_queue: null,
    };
  }
  return {
    ...ticket,
    queueNumber: num,
    queue_number: num,
    queueNo: num,
    queue_no: num,
    queueOrder: num,
    queue_order: num,
    orderInQueue: num,
    order_in_queue: num,
  };
};

const normalizeServiceTicketStatus = (ticket) => {
  return normalizeServiceTicketStatusCode(getTicketStatus(ticket)) || 'CREATED';
};

const toAvailableStaffList = (response) => {
  const rows = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.data)
      ? response.data.data
      : [];
  return rows;
};

const extractAdvisorTicketRows = (response) => {
  const pageData = response?.data;
  if (Array.isArray(pageData?.content)) return pageData.content;
  if (Array.isArray(pageData?.data)) return pageData.data;
  if (Array.isArray(pageData)) return pageData;
  return [];
};

const getAdvisorTicketTotalPages = (response) => {
  const totalPages = Number(response?.data?.totalPages);
  return Number.isFinite(totalPages) && totalPages > 0 ? Math.ceil(totalPages) : 1;
};

const fetchAdvisorTicketsForAppointmentDate = async (params, token) => {
  const baseParams = {
    size: ADVISOR_TICKET_LOOKUP_SIZE,
    status: params?.status,
    search: params?.search,
  };
  const firstResponse = await fetchAdvisorMyTickets({ ...baseParams, page: 0 }, token);
  const totalPages = getAdvisorTicketTotalPages(firstResponse);
  if (totalPages <= 1) return extractAdvisorTicketRows(firstResponse);

  const restResponses = await Promise.allSettled(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdvisorMyTickets({ ...baseParams, page: index + 1 }, token),
    ),
  );

  return [
    ...extractAdvisorTicketRows(firstResponse),
    ...restResponses.flatMap((row) => (
      row.status === 'fulfilled' ? extractAdvisorTicketRows(row.value) : []
    )),
  ];
};

const STATUS_LABELS = {
  CREATED: getServiceTicketStatusTextVi('CREATED'),
  INSPECTING: getServiceTicketStatusTextVi('INSPECTING'),
  PENDING: getServiceTicketStatusTextVi('PENDING'),
  INSPECTED: getServiceTicketStatusTextVi('INSPECTED'),
  ESTIMATED: getServiceTicketStatusTextVi('ESTIMATED'),
  REPAIRING: getServiceTicketStatusTextVi('REPAIRING'),
  CANCELLED: getServiceTicketStatusTextVi('CANCELLED'),
  COMPLETED: getServiceTicketStatusTextVi('COMPLETED'),
  PAID: getServiceTicketStatusTextVi('PAID'),
  ACTIVE: 'Đang làm',
  DONE: 'Hoàn thành',
};

const SERVICE_TICKET_STATUS_FILTER_OPTIONS = [
  'CREATED',
  'INSPECTING',
  'PENDING',
  'INSPECTED',
  'ESTIMATED',
  'REPAIRING',
  'CANCELLED',
  'COMPLETED',
  'PAID',
].map((status) => ({
  value: status,
  label: getServiceTicketStatusTextVi(status, status),
}));

const SERVICE_TICKET_STATUS_FILTER_VALUES = new Set(
  SERVICE_TICKET_STATUS_FILTER_OPTIONS.map((option) => option.value),
);

const normalizeAssignmentDisplayStatus = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  if (raw === 'IN_PROGRESS' || raw === 'INPROGRESS' || raw === 'WORKING') return 'ACTIVE';
  if (raw === 'COMPLETED' || raw === 'DONE' || raw === 'FINISHED') return 'DONE';
  if (raw === 'CANCELED') return 'CANCELLED';
  return raw;
};

const computeDisplayStatus = (assignmentStatus, ticketStatus) => {
  const tStatus = normalizeServiceTicketStatus({ status: ticketStatus });
  if (SERVICE_TICKET_STATUS_FILTER_VALUES.has(tStatus)) return tStatus;
  return normalizeAssignmentDisplayStatus(assignmentStatus) || 'PENDING';
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
    status: normalizeAssignmentDisplayStatus(raw.status || raw.assignmentStatus),
    isPrimary: Boolean(raw.isPrimary),
    fullName:
      typeof raw.fullName === 'string'
        ? raw.fullName
        : typeof raw.staffName === 'string'
          ? raw.staffName
          : '',
  };
};

const isActiveTechnicianAssignment = (assignment) =>
  String(assignment?.roleInTicket || assignment?.role || '').trim().toUpperCase() === 'TECHNICIAN'
  && String(assignment?.status || '').trim().toUpperCase() !== 'CANCELLED';

const isActiveAdvisorAssignment = (assignment) =>
  String(assignment?.roleInTicket || assignment?.role || '').trim().toUpperCase() === 'ADVISOR'
  && String(assignment?.status || '').trim().toUpperCase() !== 'CANCELLED';

const hasTechnicianInfoOnTicket = (ticket) => {
  if (!ticket || typeof ticket !== 'object') return false;

  const directStaffIdCandidates = [
    ticket?.technicianId,
    ticket?.assignedTechnicianId,
    ticket?.technician?.staffId,
    ticket?.technician?.id,
    ticket?.assignedTechnician?.staffId,
    ticket?.assignedTechnician?.id,
  ];

  if (directStaffIdCandidates.some((value) => {
    const id = Number(value);
    return Number.isFinite(id) && id > 0;
  })) {
    return true;
  }

  const directNameCandidates = [
    ticket?.technicianName,
    ticket?.assignedTechnicianName,
    ticket?.technician?.fullName,
    ticket?.assignedTechnician?.fullName,
  ];

  if (directNameCandidates.some((value) => String(value || '').trim())) {
    return true;
  }

  const assignmentLists = [
    ticket?.assignments,
    ticket?.ticketAssignments,
    ticket?.staffAssignments,
  ];

  return assignmentLists.some((list) =>
    Array.isArray(list) && list.some((assignment) => isActiveTechnicianAssignment(normalizeAssignment(assignment))),
  );
};

const getTicketHasTechnician = (ticket, assignmentMap) => {
  const ticketId = getTicketId(ticket);
  if (Number.isFinite(ticketId) && assignmentMap instanceof Map && assignmentMap.has(ticketId)) {
    return Boolean(assignmentMap.get(ticketId));
  }
  return hasTechnicianInfoOnTicket(ticket);
};

const getTicketAdvisorId = (ticket) => toPositiveStaffId(
  ticket?.advisorId
  ?? ticket?.assignedAdvisorId
  ?? ticket?.advisor?.staffId
  ?? ticket?.advisor?.id
  ?? ticket?.assignedAdvisor?.staffId
  ?? ticket?.assignedAdvisor?.id,
);

const filterTicketsByCurrentAdvisor = async (list, token, currentAdvisorId) => {
  if (!currentAdvisorId) return Array.isArray(list) ? list : [];

  const rows = await Promise.allSettled(
    (Array.isArray(list) ? list : []).map(async (ticket) => {
      const ticketId = getTicketId(ticket);
      if (!Number.isFinite(ticketId) || ticketId <= 0) {
        const directAdvisorId = getTicketAdvisorId(ticket);
        return {
          ticket,
          keep: directAdvisorId == null || directAdvisorId === currentAdvisorId,
          hasTech: hasTechnicianInfoOnTicket(ticket),
        };
      }

      const res = await fetchTicketAssignments(ticketId, token);
      const assignments = (Array.isArray(res?.data) ? res.data : [])
        .map(normalizeAssignment)
        .filter(Boolean);
      const activeAdvisor = assignments.find(isActiveAdvisorAssignment);
      const hasTech = assignments.some(isActiveTechnicianAssignment);

      if (!activeAdvisor) {
        const directAdvisorId = getTicketAdvisorId(ticket);
        return {
          ticket,
          keep: directAdvisorId == null || directAdvisorId === currentAdvisorId,
          hasTech,
        };
      }

      return {
        ticket,
        keep: Number(activeAdvisor.staffId) === Number(currentAdvisorId),
        hasTech,
      };
    }),
  );

  return rows
    .map((row, index) => (
      row.status === 'fulfilled'
        ? row.value
        : { ticket: list[index], keep: true, hasTech: hasTechnicianInfoOnTicket(list[index]) }
    ))
    .filter((row) => row.keep);
};

export default function AdvisorInspection() {
  const navigate = useNavigate();
  const staffRoles = useMemo(() => readStaffRolesFromStorage(), []);
  const canChangeAdvisorByRole = staffRoles.includes(STAFF_ROLE.ADVISOR);
  const initialDate = useMemo(() => readPersistedActiveDay() || getTodayLocalISO(), []);
  const dayPickerRef = useRef(null);

  // Ticket list state
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [periodFilter, setPeriodFilter] = useState('day');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [transferredOutTicketCodes, setTransferredOutTicketCodes] = useState(() => new Set());
  const [dragTicketId, setDragTicketId] = useState(null);
  const [swapping, setSwapping] = useState(false);

  // Lịch sử sửa chữa modal
  const [showRepairHistoryModal, setShowRepairHistoryModal] = useState(false);
  const [repairHistoryTicket, setRepairHistoryTicket] = useState(null);
  const [repairHistoryRows, setRepairHistoryRows] = useState([]);
  const [repairHistoryLoading, setRepairHistoryLoading] = useState(false);
  const [repairHistoryError, setRepairHistoryError] = useState('');

  // Workload map
  const [workloadMap, setWorkloadMap] = useState({});
  const [staffNameMap, setStaffNameMap] = useState({});

  // Modal state
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
  const hasLoadedTicketsRef = useRef(false);
  const lastSoftRefreshAtRef = useRef(0);
  const softRefreshRequestedRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => ({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  }), [statusFilter, debouncedSearch]);

  // Load ticket list (paginated)
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập');
      setLoading(false);
      return;
    }

    let ignore = false;
    const run = async () => {
      const isSoftRefresh = softRefreshRequestedRef.current && hasLoadedTicketsRef.current;
      softRefreshRequestedRef.current = false;
      try {
        if (isSoftRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError('');
        const list = await fetchAdvisorTicketsForAppointmentDate(filters, token);
        if (ignore) return;

        const sessionVisibleList = list.filter((ticket) => {
          const code = String(getTicketCode(ticket) || '').trim();
          return !code || !transferredOutTicketCodes.has(code);
        });
        const currentAdvisorId = getCurrentStaffId(token);
        const visibleRows = await filterTicketsByCurrentAdvisor(sessionVisibleList, token, currentAdvisorId);
        const visibleList = visibleRows.map((row) => row.ticket);
        const appointmentVisibleList = filterTicketsByAppointmentDate(visibleList, dateFrom, dateTo);
        if (ignore) return;
        const assignmentMap = new Map();
        visibleRows.forEach((row) => {
          const ticketId = getTicketId(row.ticket);
          if (Number.isFinite(ticketId) && ticketId > 0) {
            assignmentMap.set(ticketId, Boolean(row.hasTech));
          }
        });
        setModalPageAssignments((prev) => {
          const next = new Map(prev);
          assignmentMap.forEach((value, key) => {
            next.set(key, value);
          });
          return next;
        });
        const sortedAllRows = sortTicketsByQueueOrder(appointmentVisibleList);
        const nextTotalPages = Math.max(1, Math.ceil(sortedAllRows.length / size));
        const safePage = Math.min(page, nextTotalPages - 1);
        const sortedList = sortedAllRows.slice(safePage * size, (safePage + 1) * size);
        if (safePage !== page) setPage(safePage);
        setTickets(sortedList);
        setTotalPages(nextTotalPages);
        setTotalElements(sortedAllRows.length);
        cacheStaffNames(
          appointmentVisibleList.map((t) => ({
            staffId: t?.advisorId || t?.assignedAdvisorId,
            fullName: t?.advisorName || t?.assignedAdvisorName || t?.advisor?.fullName,
          })),
        );
        hasLoadedTicketsRef.current = true;

      } catch (err) {
        if (ignore) return;
        if (!isSoftRefresh) {
          setError(err?.message || 'Không thể tải danh sách phiếu.');
          setTickets([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    run();
    return () => { ignore = true; };
  }, [filters, reloadKey, transferredOutTicketCodes, dateFrom, dateTo, page, size]);

  useEffect(() => {
    const requestSoftRefresh = () => {
      const now = Date.now();
      if (!hasLoadedTicketsRef.current) return;
      if (now - lastSoftRefreshAtRef.current < SOFT_REFRESH_THROTTLE_MS) return;
      if (showAssignModal || showRepairHistoryModal || loadingModal || repairHistoryLoading || swapping || dragTicketId != null) return;
      if (loading || refreshing) return;

      lastSoftRefreshAtRef.current = now;
      softRefreshRequestedRef.current = true;
      setReloadKey((key) => key + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestSoftRefresh();
    };

    window.addEventListener('focus', requestSoftRefresh);
    window.addEventListener('service-ticket-created', requestSoftRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', requestSoftRefresh);
      window.removeEventListener('service-ticket-created', requestSoftRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    dragTicketId,
    loading,
    loadingModal,
    refreshing,
    repairHistoryLoading,
    showAssignModal,
    showRepairHistoryModal,
    swapping,
  ]);

  // Load workload + advisor list
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

  // Helpers
  const getServiceTicketStatusDisplay = (ticket) => {
    const status = normalizeServiceTicketStatus(ticket);
    return getServiceTicketStatusTextVi(status, status || '-');
  };

  const getServiceTicketStatusClass = (ticket) => {
    const status = normalizeServiceTicketStatus(ticket);
    if (status === 'CREATED' || status === 'PENDING') return styles.statusPending;
    if (status === 'INSPECTING' || status === 'INSPECTED' || status === 'ESTIMATED' || status === 'REPAIRING') {
      return styles.statusInspection;
    }
    if (status === 'COMPLETED' || status === 'PAID') return styles.statusActive;
    if (status === 'CANCELLED') return styles.statusInactive;
    return styles.statusPending;
  };

  const getQueueStatusInfo = (ticket) => {
    const queueNumber = getTicketQueueNumber(ticket);
    if (Number.isFinite(queueNumber) && queueNumber > 0) {
      return { label: String(queueNumber), className: styles.queueNumber };
    }

    return { label: '-', className: styles.queueUnassigned };
  };

  const formatAppointmentDateTime = (ticket) => {
    const dateRaw = String(getTicketAppointmentDateRaw(ticket)).trim();
    const timeRaw = formatTimeHHmm(getTicketAppointmentTimeRaw(ticket));

    if (!dateRaw && !timeRaw) return '-';

    const hasTimeInDate = /(?:T|\s)\d{2}:\d{2}/.test(dateRaw);
    const dateTimeRaw = dateRaw && !hasTimeInDate && timeRaw
      ? `${dateRaw} ${timeRaw}`
      : dateRaw;
    const parsed = parseBackendDateTime(dateTimeRaw);

    if (!parsed) {
      if (dateRaw && timeRaw) return `${dateRaw} ${timeRaw}`;
      return dateRaw || timeRaw || '-';
    }

    if (hasTimeInDate || timeRaw) {
      return parsed.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return parsed.toLocaleDateString('vi-VN');
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

  const handleOpenRepairHistory = async (ticket) => {
    const token = getToken();
    const code = getTicketCode(ticket);
    const ticketId = getTicketId(ticket);
    let historyTicket = { ...ticket, ticketCode: code, ticketId };
    let customerId = getTicketCustomerId(ticket);
    let vehicleId = getTicketVehicleId(ticket);

    setRepairHistoryTicket(historyTicket);
    setRepairHistoryRows([]);
    setRepairHistoryError('');
    setRepairHistoryLoading(true);
    setShowRepairHistoryModal(true);

    if (!token) {
      setRepairHistoryError('Vui lòng đăng nhập để xem lịch sử sửa chữa.');
      setRepairHistoryLoading(false);
      return;
    }

    try {
      if ((!customerId || !vehicleId) && code) {
        try {
          const detailRes = await fetchServiceTicketDetail(code, token);
          const detail = unwrapApiPayload(detailRes);
          if (detail && typeof detail === 'object') {
            historyTicket = { ...historyTicket, ...detail, ticketCode: code, ticketId };
            customerId = getTicketCustomerId(detail) || customerId;
            vehicleId = getTicketVehicleId(detail) || vehicleId;
            setRepairHistoryTicket(historyTicket);
          }
        } catch {
          // Vẫn thử gọi history bằng ticketCode/serviceTicketId nếu detail không tải được.
        }
      }

      if (!customerId || !vehicleId) {
        setRepairHistoryRows([]);
        setRepairHistoryError('Không đủ customerId hoặc vehicleId để tải lịch sử sửa chữa.');
        return;
      }

      const response = await fetchAdvisorTicketRepairHistory({
        customerId,
        vehicleId,
      }, token);
      const currentCode = String(code || '').trim();
      const currentTimestamp = getRepairHistoryBestTimestamp(historyTicket, ticket);
      const rows = extractRepairHistoryRows(response)
        .filter((row) => {
          if (normalizeServiceTicketStatus(row) !== 'PAID') return false;

          const rowTicketId = getTicketId(row);
          const rowCode = String(getTicketCode(row) || '').trim();
          if (ticketId && rowTicketId && Number(rowTicketId) === Number(ticketId)) return false;
          if (currentCode && rowCode && rowCode === currentCode) return false;

          const rowTimestamp = getRepairHistoryTimestamp(row);
          if (currentTimestamp != null && rowTimestamp != null) {
            if (rowTimestamp > currentTimestamp) return false;
            if (
              rowTimestamp === currentTimestamp
              && ticketId
              && rowTicketId
              && Number(rowTicketId) >= Number(ticketId)
            ) {
              return false;
            }
          }

          return true;
        })
        .sort((a, b) => (getRepairHistoryTimestamp(b) ?? 0) - (getRepairHistoryTimestamp(a) ?? 0));

      const rowsWithRecommendations = await Promise.all(rows.map(async (row) => {
        const rowTicketId = getTicketId(row);
        if (!rowTicketId) return row;
        try {
          const recommendRes = await fetchSafetyInspectionCurrentRecommend(rowTicketId, token);
          return {
            ...row,
            currentRecommend: extractRecommendationText(recommendRes),
          };
        } catch {
          return {
            ...row,
            currentRecommend: getRepairHistoryRecommendation(row),
          };
        }
      }));
      setRepairHistoryRows(rowsWithRecommendations);
    } catch (err) {
      setRepairHistoryRows([]);
      setRepairHistoryError(err?.message || 'Không tải được lịch sử sửa chữa.');
    } finally {
      setRepairHistoryLoading(false);
    }
  };

  // Open modal
  const handleOpenModal = async (ticket) => {
    if (isFutureAppointmentTicket(ticket)) {
      toast.info(getFutureAppointmentTicketMessage(ticket));
      return;
    }
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

  // Change advisor
  const handleChangeAdvisor = async () => {
    const token = getToken();
    const ticketCode = getTicketCode(selectedTicket);
    const normalizedTicketCode = String(ticketCode || '').trim();
    const currentAdvisorId = Number(modalAdvisor?.staffId);
    const newAdvisorId = Number(selectedNewAdvisorId);

    if (!token || !normalizedTicketCode || !Number.isFinite(currentAdvisorId) || currentAdvisorId <= 0) {
      setModalError('Không đủ dữ liệu để đổi cố vấn viên.');
      return;
    }
    if (!canChangeAdvisorByRole) {
      setModalError('Chỉ advisor mới có quyền đổi advisor.');
      return;
    }
    if (modalAdvisor?.status !== 'PENDING' && modalAdvisor?.status !== 'ACTIVE') {
      setModalError('Chỉ được đổi advisor khi assignment hiện tại đang PENDING hoặc ACTIVE.');
      return;
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
      await changeAdvisorByAdvisor(normalizedTicketCode, newAdvisorId, 'đổi advisor từ trang advisor', token);
      const selectedTicketId = getTicketId(selectedTicket);
      setTransferredOutTicketCodes((prev) => {
        const next = new Set(prev);
        next.add(normalizedTicketCode);
        return next;
      });
      setTickets((prev) => prev.filter((ticketItem) => {
        const sameCode = String(getTicketCode(ticketItem) || '').trim() === normalizedTicketCode;
        const ticketItemId = getTicketId(ticketItem);
        const sameId = Number.isFinite(selectedTicketId)
          && Number.isFinite(ticketItemId)
          && Number(ticketItemId) === Number(selectedTicketId);
        return !(sameCode || sameId);
      }));
      setTotalElements((prev) => Math.max(0, Number(prev || 0) - 1));
      if (Number.isFinite(selectedTicketId)) {
        setModalPageAssignments((prev) => {
          const next = new Map(prev);
          next.delete(Number(selectedTicketId));
          return next;
        });
      }
      setReloadKey((prev) => prev + 1);
      toast.success('Đã đổi cố vấn viên. Phiếu đã được chuyển sang cố vấn viên mới.');
      handleCloseModal();
    } catch (err) {
      setModalError(err?.message || 'Đổi cố vấn viên thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // Change technician
  const handleChangeTechnician = async (assignment) => {
    const token = getToken();
    const ticketCode = getTicketCode(selectedTicket);
    const oldTechnicianId = Number(assignment?.staffId);
    const newTechnicianId = Number(techReplacementByAssignment[String(assignment?.assignmentId)] || 0);

    if (!token || !ticketCode || !Number.isFinite(oldTechnicianId) || oldTechnicianId <= 0) {
      setModalError('Không đủ dữ liệu để đổi kỹ thuật viên.');
      return;
    }
    if (assignment?.status !== 'PENDING') {
      setModalError('Chỉ được đổi kỹ thuật viên khi assignment hiện tại đang PENDING.');
      return;
    }
    if (!Number.isFinite(newTechnicianId) || newTechnicianId <= 0 || newTechnicianId === oldTechnicianId) return;

    setModalError('');
    setModalSuccess('');
    const oldTechName = getStaffDisplayName(oldTechnicianId);
    const newTechName = modalTechList.find(
      (techItem) => Number(techItem.staffId) === newTechnicianId,
    )?.fullName || `NV-${newTechnicianId}`;

    if (!window.confirm(`Bạn có muốn đổi kỹ thuật viên?\n\nKTV cũ: ${oldTechName}\nKTV mới: ${newTechName}`)) return;

    setLoadingModal(true);
    try {
      await changeTechnicianByAdvisor(ticketCode, oldTechnicianId, newTechnicianId, 'đổi KTV từ trang advisor', token);
      await handleOpenModal(selectedTicket);
      setModalSuccess('Đã đổi kỹ thuật viên.');
    } catch (err) {
      setModalError(err?.message || 'Đổi kỹ thuật viên thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // Assign technician
  const handleAssign = async (tech, isPrimary) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    if (!ticketId) {
      setModalError('Không tìm thấy ticketId.');
      return;
    }
    const hasAssignedTechnician = modalAssignments.some(isActiveTechnicianAssignment);
    if (hasAssignedTechnician) {
      setModalError('Phiếu đã có kỹ thuật viên chính. Vui lòng dùng nút đổi KTV nếu cần thay đổi.');
      return;
    }

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

      setModalTechList((prev) => prev.filter((techItem) => techItem.staffId !== tech.staffId));
      setModalPageAssignments((prev) => {
        const next = new Map(prev);
        next.set(ticketId, true);
        return next;
      });

      const label = 'Kỹ thuật viên';
      setModalSuccess(`Đã phân công ${label}: ${tech.fullName || `NV-${tech.staffId}`}`);
    } catch (err) {
      setModalError(err?.message || 'Phân công thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // Cancel technician
  const handleCancelTech = async (assignment) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    const name = getStaffDisplayName(assignment.staffId, assignment.fullName);

    if (!window.confirm(`Bạn có muốn hủy phân công KTV ${name} không?`)) return;
    if (!ticketId) {
      setModalError('Không tìm thấy ticketId.');
      return;
    }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);

    try {
      await cancelAssignmentById(ticketId, assignment.assignmentId, token);

      setModalAssignments((prev) =>
        prev.map((item) =>
          item.assignmentId === assignment.assignmentId
            ? { ...item, status: 'CANCELLED' }
            : item,
        ),
      );

      const cancelled = modalAssignments.find(
        (item) => item.assignmentId === assignment.assignmentId,
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
        (item) =>
          item.assignmentId !== assignment.assignmentId
          && String(item?.roleInTicket).toUpperCase() === 'TECHNICIAN'
          && String(item?.status).toUpperCase() !== 'CANCELLED',
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
      text: busyNote || (hasBusyInfo ? (isBusy ? 'Bận' : 'Rảnh') : `${ticketCount} phiếu ⬢ ${isBusy ? 'bận' : 'rảnh'}`),
    };
  };

  const canChangeModalAdvisor =
    modalAdvisor?.status === 'PENDING' || modalAdvisor?.status === 'ACTIVE';

  // Pagination helpers
  const safePage = Math.min(Math.max(0, page), Math.max(1, totalPages) - 1);
  const pageButtons = useMemo(() => {
    const max = 5;
    const last = Math.max(1, totalPages) - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - max + 1));
    const items = [];
    for (let i = start; i <= Math.min(last, start + max - 1); i += 1) items.push(i);
    return items;
  }, [safePage, totalPages]);

  const activeDate = dateFrom || dateTo || initialDate;
  useEffect(() => {
    const nextActiveDate = dateFrom || dateTo || initialDate;
    if (!isIsoDate(nextActiveDate)) return;
    persistActiveDay(nextActiveDate);
  }, [dateFrom, dateTo, initialDate]);

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
    setPeriodFilter('day');
    setStatusFilter('');
    setSearch('');
    setDebouncedSearch('');
  };
  const handleSwapTickets = async (sourceTicketId, targetTicketId) => {
    if (swapping) return;
    if (!Number.isFinite(Number(sourceTicketId)) || !Number.isFinite(Number(targetTicketId))) return;
    if (Number(sourceTicketId) === Number(targetTicketId)) return;

    const token = getToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập để đổi thứ tự phiếu.');
      return;
    }

    const sourceTicket = tickets.find((t) => Number(getTicketId(t)) === Number(sourceTicketId));
    const targetTicket = tickets.find((t) => Number(getTicketId(t)) === Number(targetTicketId));
    if (isFutureAppointmentTicket(sourceTicket) || isFutureAppointmentTicket(targetTicket)) {
      toast.info('Đến đúng ngày hẹn mới được đổi thứ tự phiếu này.');
      return;
    }
    const sourceQueueNumber = getTicketQueueNumber(sourceTicket);
    const targetQueueNumber = getTicketQueueNumber(targetTicket);
    const sourceCreateDate = getTicketCreateDateKey(sourceTicket);
    const targetCreateDate = getTicketCreateDateKey(targetTicket);
    if (sourceCreateDate && targetCreateDate && sourceCreateDate !== targetCreateDate) {
      toast.error('Chỉ được đổi thứ tự các phiếu cùng ngày tạo.');
      return;
    }

    let rollbackTickets = null;
    setTickets((prev) => {
      rollbackTickets = prev;
      const reordered = getSwappedTicketOrder(prev, sourceTicketId, targetTicketId);
      // Sau khi đổi vị trí, hoán đổi luôn số STT giữa 2 phiếu.
      return reordered.map((ticket) => {
        const ticketId = Number(getTicketId(ticket));
        if (ticketId === Number(sourceTicketId)) return withQueueNumber(ticket, targetQueueNumber);
        if (ticketId === Number(targetTicketId)) return withQueueNumber(ticket, sourceQueueNumber);
        return ticket;
      });
    });

    setSwapping(true);
    try {
      const response = await swapServiceTicketQueue(sourceTicketId, targetTicketId, token);
      const swapped = Array.isArray(response?.data) ? response.data : [];
      const queueByTicketId = new Map(
        swapped
          .map((row) => [Number(row?.serviceTicketId), row])
          .filter(([id]) => Number.isFinite(id) && id > 0),
      );

      if (queueByTicketId.size > 0) {
        setTickets((prev) => prev.map((ticket) => {
          const ticketId = Number(getTicketId(ticket));
          const swappedRow = queueByTicketId.get(ticketId);
          if (!swappedRow) return ticket;
          const nextStatus =
            swappedRow?.ticketStatus
            || swappedRow?.status
            || ticket?.ticketStatus
            || ticket?.status;
          return {
            ...ticket,
            ticketStatus: nextStatus,
            status: nextStatus,
          };
        }));
      }

      toast.success(response?.message || 'Đã lưu thứ tự phiếu.');
    } catch (err) {
      if (Array.isArray(rollbackTickets) && rollbackTickets.length > 0) setTickets(rollbackTickets);
      toast.error(err?.message || 'Không thể lưu thứ tự phiếu.');
    } finally {
      setSwapping(false);
    }
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
        <div className={styles.headerMeta}>
          {refreshing ? <span className={styles.refreshingBadge}>Đang cập nhật...</span> : null}
          <span className={styles.totalCount}>{totalElements} phiếu</span>
        </div>
      </div>

      <div className={styles.splitLayout}>
        {/* LEFT: Table */}
        <div className={styles.leftPanel}>

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
                aria-label="Chọn khoảng lọc phiếu"
              >
                <option value="day">Theo ngày</option>
                <option value="all">Tất cả</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
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
                {SERVICE_TICKET_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
      <th>STT HÀNG ĐỢI</th>
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
      const hasTech = getTicketHasTechnician(ticket, modalPageAssignments);
      const queueInfo = getQueueStatusInfo(ticket);
      const customerPhone = getTicketCustomerPhone(ticket);
      const isFutureTicket = isFutureAppointmentTicket(ticket);
      const rowDraggable = Number.isFinite(ticketId) && ticketId > 0 && !swapping && !isFutureTicket;
      const isDraggingSource = rowDraggable && Number(ticketId) === Number(dragTicketId);
      const rowClassName = [
        isDraggingSource ? styles.draggingRow : '',
        isFutureTicket ? styles.futureTicketRow : '',
      ].filter(Boolean).join(' ');

      return (
        <tr
          key={code || ticketId || idx}
          className={rowClassName}
          draggable={rowDraggable}
          onDragStart={(e) => {
            if (!rowDraggable) return;
            setDragTicketId(ticketId);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(ticketId));
          }}
          onDragOver={(e) => {
            if (!rowDraggable) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const sourceRaw = e.dataTransfer.getData('text/plain') || String(dragTicketId || '');
            const sourceId = Number(sourceRaw);
            const targetId = Number(ticketId);
            setDragTicketId(null);
            if (!Number.isFinite(sourceId) || !Number.isFinite(targetId)) return;
            handleSwapTickets(sourceId, targetId);
          }}
          onDragEnd={() => setDragTicketId(null)}
        >
          <td>
            <span className={`${styles.queueBadge} ${queueInfo.className}`}>
              {queueInfo.label}
            </span>
          </td>
          <td className={styles.ticketCodeCell}>{code || '-'}</td>
          <td>{ticket.customerName || ticket.fullName || '-'}</td>
          <td>{customerPhone}</td>
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
          <td>
            <span>{formatAppointmentDateTime(ticket)}</span>
            {isFutureTicket && (
              <span className={styles.futureTicketNote}>Chờ đến ngày hẹn</span>
            )}
          </td>
          <td>
            <div className={styles.actionButtons}>
              {isFutureTicket ? (
                <button
                  className={`${styles.actionBtn} ${styles.futureActionBtn}`}
                  type="button"
                  title={getFutureAppointmentTicketMessage(ticket)}
                  onClick={() => toast.info(getFutureAppointmentTicketMessage(ticket))}
                >
                  Chưa đến ngày
                </button>
              ) : (
                <>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      if (!code) return;
                      navigate(`/service-ticket-detail/${encodeURIComponent(code)}`, {
                        state: { ticket, source: 'advisor-inspection' },
                      });
                    }}
                    disabled={!code || swapping}
                    title="Mở chi tiết phiếu dịch vụ"
                  >
                    Mở
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.historyBtn}`}
                    onClick={() => handleOpenRepairHistory(ticket)}
                    disabled={swapping || (!code && !ticketId)}
                    title="Xem lịch sử sửa chữa của xe"
                  >
                    Lịch sử sửa chữa
                  </button>
                  {hasTech ? (
                    <button
                      className={`${styles.actionBtn} ${styles.viewAssignBtn}`}
                      onClick={() => handleOpenModal(ticket)}
                      disabled={swapping}
                    >
                      Xem phân công
                    </button>
                  ) : (
                    <button
                      className={`${styles.actionBtn} ${styles.assignBtn}`}
                      onClick={() => handleOpenModal(ticket)}
                      disabled={!ticketId || swapping}
                    >
                      Phân công
                    </button>
                  )}
                </>
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
                Phân công KTV - {getTicketCode(selectedTicket) || '-'}
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

                        {/* Kiểm tra trạng thái phiếu: không cho thay đổi khi hoàn tất/đã thanh toán/hủy */}
              {(() => {
                const ticketStatus = normalizeServiceTicketStatus(selectedTicket);
                const isFinalized = ['COMPLETED', 'PAID', 'CANCELLED'].includes(ticketStatus);
                const hasAssignedTechnician = modalAssignments.some(isActiveTechnicianAssignment);

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
                                  {a?.isPrimary ? 'Kỹ thuật viên chính' : 'Kỹ thuật viên'} &bull;{' '}
                                  {STATUS_LABELS[displayStatus] || displayStatus}
                                </span>
                                {/* NÃºt đổi KTV / Hủy: chỉ khi PENDING và phiếu chưa finalized */}
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

                    {/* Danh sách KTV khả dụng: chỉ khi chưa finalized */}
                    {!isFinalized && !loadingModal && !hasAssignedTechnician && modalTechList.length > 0 && (
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
                            <option value="ticket_asc">Số phiếu: ít đến nhiều</option>
                            <option value="ticket_desc">Số phiếu: nhiều đến ít</option>
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
                              const busyA = Boolean(workloadMap[Number(a?.staffId)]?.isBusy);
                              const busyB = Boolean(workloadMap[Number(b?.staffId)]?.isBusy);
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

                    {!loadingModal && !isFinalized && (hasAssignedTechnician || modalTechList.length === 0) && (
                      <div className={styles.emptyState}>
                        <p>
                          {hasAssignedTechnician
                            ? 'Phiếu đã có 1 kỹ thuật viên chính. Nếu cần thay đổi, hãy dùng nút đổi KTV.'
                            : modalAssignments.length > 0
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
                  Lưu & đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem lịch sử sửa chữa */}
      {showRepairHistoryModal && repairHistoryTicket && (
        <div className={styles.modalOverlay} onClick={() => setShowRepairHistoryModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Lịch sử sửa chữa</h3>
              <button className={styles.modalClose} onClick={() => setShowRepairHistoryModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.historySummary}>
                <div>
                  <span>Phiếu hiện tại</span>
                  <strong>{repairHistoryTicket.ticketCode || getTicketCode(repairHistoryTicket) || '-'}</strong>
                </div>
                <div>
                  <span>Biển số</span>
                  <strong>{repairHistoryTicket.licensePlate || repairHistoryTicket.vehicle?.licensePlate || '-'}</strong>
                </div>
                <div>
                  <span>Vehicle ID</span>
                  <strong>{getTicketVehicleId(repairHistoryTicket) || '-'}</strong>
                </div>
              </div>

              {repairHistoryLoading && (
                <div className={styles.emptyState}>
                  <p>Đang tải lịch sử sửa chữa...</p>
                </div>
              )}

              {!repairHistoryLoading && repairHistoryError && (
                <div className={styles.errorBanner}>{repairHistoryError}</div>
              )}

              {!repairHistoryLoading && !repairHistoryError && repairHistoryRows.length === 0 && (
                <div className={styles.emptyState}>
                  <p>Chưa có phiếu sửa chữa đã thanh toán trước đó cho xe này.</p>
                </div>
              )}

              {!repairHistoryLoading && !repairHistoryError && repairHistoryRows.length > 0 && (
                <div className={styles.historyList}>
                  {repairHistoryRows.map((row, index) => {
                    const recommendation = getRepairHistoryRecommendation(row);
                    const rowKey = getRepairHistoryRowKey(row, index);
                    const detailCode = getTicketCode(row);

                    return (
                      <div key={rowKey} className={styles.historyCard}>
                        <div className={styles.historyCardHeader}>
                          <div>
                            <strong>{getHistoryTicketCode(row)}</strong>
                            <span>{formatHistoryDateTime(getHistoryDateTime(row))}</span>
                          </div>
                          <span className={styles.historyStatus}>
                            {getServiceTicketStatusTextVi(row?.status || row?.ticketStatus || row?.statusCode, row?.statusLabel || row?.status || '-')}
                          </span>
                        </div>

                        {recommendation ? (
                          <div className={styles.historyNote}>
                            <span>Khuyến nghị</span>
                            <p>{recommendation}</p>
                          </div>
                        ) : null}

                        <div className={styles.historyDetailActions}>
                          <button
                            type="button"
                            className={styles.historyDetailBtn}
                            onClick={() => {
                              if (!detailCode) return;
                              setShowRepairHistoryModal(false);
                              navigate(`/service-ticket-detail/${encodeURIComponent(detailCode)}`, {
                                state: { ticket: row, source: 'advisor-inspection' },
                              });
                            }}
                            disabled={!detailCode}
                            title="Mở chi tiết phiếu dịch vụ"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  className={styles.modalActionBtn}
                  onClick={() => setShowRepairHistoryModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
