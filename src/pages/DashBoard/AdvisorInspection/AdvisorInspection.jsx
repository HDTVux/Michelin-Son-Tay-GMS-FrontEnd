import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ServiceTicketDetail from '../ServiceTicketManagement/ServiceTicketDetail.jsx';
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
import { getSafetyInspectionByTicketCode } from '../../../services/safetyInspectionService';
import { fetchCheckInAdvisors } from '../../../services/checkInService';
import styles from './AdvisorInspection.module.css';

const ITEMS_PER_PAGE = 10;
const STAFF_ROLE = {
  ADVISOR: 'ADVISOR',
};

const getToken = () => localStorage.getItem('staffToken') || localStorage.getItem('authToken');
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
const readStaffIdFromProfile = () => {
  try {
    const raw = localStorage.getItem('staffProfile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const staffId = Number(parsed?.staffId);
    return Number.isFinite(staffId) && staffId > 0 ? staffId : null;
  } catch {
    return null;
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

const getInspectionStatusFromTicket = (ticket) =>
  normalizeInspectionStatus(
    ticket?.inspectionStatus ||
      ticket?.safetyInspectionStatus ||
      ticket?.safetyInspection?.inspectionStatus ||
      ticket?.safetyInspection?.status,
  );

const toAvailableStaffList = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  return [];
};


const STATUS_LABELS = {
  PENDING: 'Chờ bắt đầu',
  ACTIVE: 'Đang làm',
  DONE: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
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
  const currentStaffId = useMemo(() => readStaffIdFromProfile(), []);
  const canChangeAdvisorByRole = staffRoles.includes(STAFF_ROLE.ADVISOR);

  // --- Ticket list state ---
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // --- Inspection status map ---
  const [inspectionByTicket, setInspectionByTicket] = useState({});

  // --- Workload map (staffId → { isBusy, currentTicketCount, fullName }) ---
  const [workloadMap, setWorkloadMap] = useState({});
  const [staffNameMap, setStaffNameMap] = useState({});

  // --- Selected ticket to open inspection panel ---
  const [selectedTicketCode, setSelectedTicketCode] = useState('');

  // --- Modal state ---
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  // Assignments trong modal (chỉ dùng khi modal mở)
  const [modalAssignments, setModalAssignments] = useState([]);
  // Danh sách KTV khả dụng (backend lọc sẵn: chưa được assign vào ticket này)
  const [modalTechList, setModalTechList] = useState([]);
  // Advisor đang phụ trách ticket này (từ /assignments)
  const [modalAdvisor, setModalAdvisor] = useState(null);
  const [advisorOptions, setAdvisorOptions] = useState([]);
  const [selectedNewAdvisorId, setSelectedNewAdvisorId] = useState('');
  const [techReplacementByAssignment, setTechReplacementByAssignment] = useState({});

  // --- Assignments ở page-level (keyed theo ticketId) ---
  // Dùng cho cột "Phân công" trong bảng — vì backend không có GET /{ticketId}/assignments
  const [pageAssignments, setPageAssignments] = useState(new Map());
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // --- Computed ---
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return normalizeServiceTicketStatus(t) === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const isInspectionOpen = Boolean(selectedTicketCode);

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

  const getInspectionStatusDisplay = (status) =>
    INSPECTION_STATUS_LABELS[status?.toUpperCase()] || status || 'Chưa có';

  const getInspectionStatusClass = (status) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return styles.statusInspection;
    if (s === 'COMPLETED') return styles.statusCompleted;
    if (s === 'SKIPPED') return styles.statusInactive;
    return styles.statusPending;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('vi-VN');
  };

  const getInspectionStatusForTicket = (ticket) => {
    const code = getTicketCode(ticket);
    return normalizeInspectionStatus(
      inspectionByTicket[code]?.inspectionStatus || getInspectionStatusFromTicket(ticket),
    );
  };

  /**
   * Lấy tên hiển thị từ staffId — lookup trong workloadMap
   */
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
        if (next[staffId] !== fullName) {
          next[staffId] = fullName;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  // Helper: gọi safety inspection không throw khi 400
  const safeGetInspection = async (code, token) => {
    try {
      const res = await getSafetyInspectionByTicketCode(code, token);
      return {
        inspectionStatus: normalizeInspectionStatus(res?.data?.inspectionStatus),
        safetyInspectionEnabled: Boolean(res?.data),
      };
    } catch {
      return null;
    }
  };

  // --- Load ticket list ---
  useEffect(() => {
    const fetchTickets = async () => {
      const token = getToken();
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const backendParams = {
          page: 0,
          size: 200,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchTerm || undefined,
        };

        const response = await fetchAdvisorMyTickets(backendParams, token);
        const list = Array.isArray(response?.data?.content)
          ? response.data.content
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setTickets(list);
        cacheStaffNames(
          list.map((t) => ({
            staffId: t?.advisorId || t?.assignedAdvisorId,
            fullName: t?.advisorName || t?.assignedAdvisorName || t?.advisor?.fullName,
          })),
        );

        // Load inspection status cho từng ticket
        const inspectionMap = {};
        for (const t of list) {
          const code = getTicketCode(t);
          if (!code) continue;
          const statusFromTicket = getInspectionStatusFromTicket(t);
          // eslint-disable-next-line no-await-in-loop
          const result = await safeGetInspection(code, token);
          if (result?.inspectionStatus) {
            inspectionMap[code] = result;
          } else {
            inspectionMap[code] = {
              inspectionStatus: statusFromTicket,
              safetyInspectionEnabled: Boolean(t?.safetyInspectionEnabled),
            };
          }
        }
        setInspectionByTicket(inspectionMap);

      } catch (error) {
        console.error(error);
        toast.error('Không thể tải danh sách phiếu');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, reloadKey]);

  // --- Load workload map (fullName, isBusy, currentTicketCount) ---
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchTechniciansWorkload(token)
      .then((res) => {
        const map = {};
        const list = Array.isArray(res?.data) ? res.data : [];
        for (const tech of list) {
          map[tech.staffId] = tech;
        }
        setWorkloadMap(map);
        cacheStaffNames(list);
      })
      .catch(() => {
        // Không có workload vẫn hoạt động
      });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchCheckInAdvisors(token)
      .then((res) => {
        const advisors = Array.isArray(res?.data) ? res.data : [];
        setAdvisorOptions(advisors);
        cacheStaffNames(advisors);
      })
      .catch(() => {});
  }, []);


  // Reset selected ticket nếu không còn trong list
  useEffect(() => {
    if (!selectedTicketCode) return;
    if (tickets.some((t) => getTicketCode(t) === selectedTicketCode)) return;
    setSelectedTicketCode('');
  }, [tickets, selectedTicketCode]);


  useEffect(() => {
    const token = getToken();
    if (!token || loading) return;

    const ticketIds = pagedTickets
      .map((ticket) => getTicketId(ticket))
      .filter((id) => Number.isFinite(id) && id > 0);
    const missingTicketIds = ticketIds.filter((id) => !pageAssignments.has(id));
    if (missingTicketIds.length === 0) return;

    Promise.all(
      missingTicketIds.map(async (ticketId) => {
        try {
          const res = await fetchTicketAssignments(ticketId, token);
          const normalized = (Array.isArray(res?.data) ? res.data : [])
            .map(normalizeAssignment)
            .filter(Boolean);
          return { ticketId, assignments: normalized };
        } catch {
          return { ticketId, assignments: [] };
        }
      }),
    ).then((rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      const nameRows = rows.flatMap((row) => row.assignments);
      cacheStaffNames(nameRows);
      setPageAssignments((prev) => {
        const next = new Map(prev);
        for (const row of rows) {
          const techAssignments = row.assignments.filter(
            (a) => a?.roleInTicket === 'TECHNICIAN' && a?.status !== 'CANCELLED',
          );
          next.set(row.ticketId, techAssignments);
        }
        return next;
      });
    });
  }, [loading, pagedTickets, pageAssignments]);

  // --- Mở modal: load assignments thực tế + KTV khả dụng ---
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
      // 1. Fetch assignments THỰC TẾ của ticket
      const cachedTechAssigns = pageAssignments.get(ticketId) || [];
      let existingAssignments = [];
      try {
        const assignRes = await fetchTicketAssignments(ticketId, token);
        existingAssignments = (Array.isArray(assignRes?.data) ? assignRes.data : [])
          .map(normalizeAssignment)
          .filter(Boolean);
        cacheStaffNames(existingAssignments);
      } catch {
        existingAssignments = [];
      }

      // Phân tách advisor và technician
      const advisorAssign = existingAssignments.find(
        (a) => a?.roleInTicket === 'ADVISOR' && a?.status !== 'CANCELLED',
      );
      const techAssignsFromApi = existingAssignments.filter(
        (a) => a?.roleInTicket === 'TECHNICIAN' && a?.status !== 'CANCELLED',
      );
      const techAssigns =
        techAssignsFromApi.length > 0 ? techAssignsFromApi : cachedTechAssigns;
      setModalAdvisor(advisorAssign || null);
      setSelectedNewAdvisorId(advisorAssign?.staffId ? String(advisorAssign.staffId) : '');
      setModalAssignments(techAssigns);

      // Cập nhật pageAssignments để bảng hiển thị đúng tên KTV
      if (techAssigns.length > 0) {
        setPageAssignments((prev) => {
          const next = new Map(prev);
          next.set(ticketId, techAssigns);
          return next;
        });
      }

      // 2. Fetch KTV khả dụng (backend tự lọc: chưa assign vào ticket này)
      const techRes = await fetchAvailableStaff(ticketId, 'TECHNICIAN', token);
      const techList = toAvailableStaffList(techRes);

      // Cho phép advisor hiện tại tự assign làm technician nếu chưa có TECHNICIAN PENDING/ACTIVE trên ticket
      const assignedTechIds = new Set(
        techAssigns
          .filter((a) => a?.roleInTicket === 'TECHNICIAN' && a?.status !== 'CANCELLED')
          .map((a) => Number(a?.staffId))
          .filter((id) => Number.isFinite(id) && id > 0),
      );
      setModalTechList(
        techList.filter((s) => !assignedTechIds.has(Number(s?.staffId))),
      );
    } catch (err) {
      setModalError(err?.message || 'Không tải được dữ liệu phân công.');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCloseModal = () => {
    // Lưu modalAssignments vào pageAssignments trước khi đóng
    const ticketId = selectedTicket ? getTicketId(selectedTicket) : null;
    if (ticketId && modalAssignments.length > 0) {
      setPageAssignments((prev) => {
        const next = new Map(prev);
        next.set(ticketId, [...modalAssignments]);
        return next;
      });
    }

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

  // --- Gán KTV ---
  const handleChangeAdvisor = async () => {
    const token = getToken();
    const ticketCode = getTicketCode(selectedTicket);
    const currentAdvisorId = Number(modalAdvisor?.staffId);
    const newAdvisorId = Number(selectedNewAdvisorId);

    if (!token || !ticketCode || !Number.isFinite(currentAdvisorId) || currentAdvisorId <= 0) {
      setModalError('Khong du du lieu de doi advisor.');
      return;
    }
    if (!canChangeAdvisorByRole) {
      setModalError('Chi advisor moi co quyen doi advisor.');
      return;
    }
    if (modalAdvisor?.status !== 'PENDING' && modalAdvisor?.status !== 'ACTIVE') {
      setModalError('Chi duoc doi advisor khi assignment hien tai dang PENDING hoac ACTIVE.');
      return;
    }
    if (!Number.isFinite(newAdvisorId) || newAdvisorId <= 0 || newAdvisorId === currentAdvisorId) {
      return;
    }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);
    try {
      await changeAdvisorByAdvisor(
        ticketCode,
        newAdvisorId,
        'Doi advisor tu man advisor',
        token,
      );
      const selectedTicketId = getTicketId(selectedTicket);
      const shouldHideFromCurrentAdvisor =
        Number.isFinite(currentStaffId) && currentStaffId > 0 && newAdvisorId !== currentStaffId;

      if (shouldHideFromCurrentAdvisor && Number.isFinite(selectedTicketId)) {
        setTickets((prev) =>
          prev.filter((t) => Number(getTicketId(t)) !== Number(selectedTicketId)),
        );
        setPageAssignments((prev) => {
          const next = new Map(prev);
          next.delete(Number(selectedTicketId));
          return next;
        });
        setShowAssignModal(false);
        setSelectedTicket(null);
        setModalTechList([]);
        setModalAssignments([]);
        setModalAdvisor(null);
        setSelectedNewAdvisorId('');
        setTechReplacementByAssignment({});
        toast.success('Da doi advisor. Phieu da duoc chuyen sang advisor moi.');
      } else {
        await handleOpenModal(selectedTicket);
        setModalSuccess('Da doi advisor.');
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err?.message || 'Doi advisor that bai.');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleChangeTechnician = async (assignment) => {
    const token = getToken();
    const ticketCode = getTicketCode(selectedTicket);
    const oldTechnicianId = Number(assignment?.staffId);
    const newTechnicianId = Number(
      techReplacementByAssignment[String(assignment?.assignmentId)] || 0,
    );

    if (!token || !ticketCode || !Number.isFinite(oldTechnicianId) || oldTechnicianId <= 0) {
      setModalError('Khong du du lieu de doi KTV.');
      return;
    }
    if (assignment?.status !== 'PENDING') {
      setModalError('Chi duoc doi KTV khi assignment hien tai dang PENDING.');
      return;
    }
    if (!Number.isFinite(newTechnicianId) || newTechnicianId <= 0 || newTechnicianId === oldTechnicianId) {
      return;
    }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);
    try {
      await changeTechnicianByAdvisor(
        ticketCode,
        oldTechnicianId,
        newTechnicianId,
        'Doi KTV tu man advisor',
        token,
      );
      await handleOpenModal(selectedTicket);
      setModalSuccess('Da doi ky thuat vien.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err?.message || 'Doi ky thuat vien that bai.');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleAssign = async (tech, isPrimary) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    if (!ticketId) {
      setModalError('Không tìm thấy ticketId.');
      return;
    }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);

    try {
      const res = await assignStaff(
        ticketId,
        {
          staffId: tech.staffId,
          roleInTicket: 'TECHNICIAN',
          isPrimary,
          note: '',
        },
        token,
      );

      const newAssignmentRaw = normalizeAssignment(res?.data);
      const newAssignment = newAssignmentRaw
        ? {
            ...newAssignmentRaw,
            fullName:
              newAssignmentRaw.fullName || tech.fullName || `NV-${tech.staffId}`,
          }
        : null;
      if (newAssignment) {
        setModalAssignments((prev) => [...prev, { ...newAssignment }]);
      }

      // Xóa KTV khỏi danh sách khả dụng
      setModalTechList((prev) => prev.filter((t) => t.staffId !== tech.staffId));

      // Cập nhật pageAssignments để bảng hiển thị đúng tên KTV
      setPageAssignments((prev) => {
        const next = new Map(prev);
        const current = next.get(ticketId) || [];
        next.set(ticketId, [...current, ...(newAssignment ? [newAssignment] : [])]);
        return next;
      });

      const label = isPrimary ? 'KTV chính' : 'KTV phụ';
      setModalSuccess(`Đã phân công ${label}: ${tech.fullName || `NV-${tech.staffId}`}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = err?.message || 'Phân công thất bại.';
      setModalError(msg);
    } finally {
      setLoadingModal(false);
    }
  };

  // --- Hủy phân công KTV ---
  const handleCancelTech = async (assignment) => {
    const token = getToken();
    const ticketId = getTicketId(selectedTicket);
    const name = getStaffDisplayName(assignment.staffId);

    // eslint-disable-next-line no-alert
    if (!window.confirm(`Hủy phân công ${name}?`)) return;

    if (!ticketId) {
      setModalError('Không tìm thấy ticketId.');
      return;
    }

    setModalError('');
    setModalSuccess('');
    setLoadingModal(true);

    try {
      // Sửa: dùng ticketId + assignmentId thay vì ticketCode + staffId
      await cancelAssignmentById(ticketId, assignment.assignmentId, token);

      // Xóa khỏi local state
      setModalAssignments((prev) =>
        prev.map((a) =>
          a.assignmentId === assignment.assignmentId
            ? { ...a, status: 'CANCELLED' }
            : a,
        ),
      );

      // Thêm lại KTV vào danh sách khả dụng (optimistic)
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

      setModalSuccess(`Đã hủy phân công ${name}.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err?.message || 'Hủy phân công thất bại.');
    } finally {
      setLoadingModal(false);
    }
  };

  // --- Helpers ---
  const hasPrimaryTechnician = modalAssignments.some(
    (a) =>
      a?.roleInTicket === 'TECHNICIAN' &&
      a?.isPrimary === true &&
      (a?.status === 'PENDING' || a?.status === 'ACTIVE'),
  );

  const getAdvisorDisplayName = (ticket) =>
    modalAdvisor?.fullName ||
    (modalAdvisor?.staffId ? getStaffDisplayName(modalAdvisor.staffId) : '') ||
    ticket?.advisorName ||
    ticket?.advisor?.fullName ||
    ticket?.assignedAdvisorName ||
    (ticket?.advisorId ? getStaffDisplayName(ticket.advisorId) : '') ||
    '-';
  const canChangeModalAdvisor = modalAdvisor?.status === 'PENDING' || modalAdvisor?.status === 'ACTIVE';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Điều phối kỹ thuật viên & Phiếu kiểm tra an toàn
        </h1>
      </div>

      <div
        className={`${styles.splitLayout} ${
          isInspectionOpen ? styles.splitLayoutOpen : styles.splitLayoutClosed
        }`}
      >
        {/* LEFT: Danh sách phiếu */}
        <div
          className={`${styles.leftPanel} ${
            isInspectionOpen ? styles.leftPanelCompact : styles.leftPanelExpanded
          }`}
        >
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Tìm mã phiếu, biển số, khách hàng..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Tất cả</option>
                <option value="DRAFT">Nháp</option>
                <option value="INSPECTION">Đang kiểm tra</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="IN_PROGRESS">Đang sửa chữa</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Không có phiếu nào</p>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã phiếu</th>
                    <th>Biển số</th>
                    <th>Khách hàng</th>
                    <th>Yêu cầu KH</th>
                    <th>Ngày đặt</th>
                    <th>Trạng thái</th>
                    <th>KT An toàn</th>
                    <th>KTV phân công</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTickets.map((ticket, index) => {
                    const code = getTicketCode(ticket);
                    const ticketId = getTicketId(ticket);
                    const selected = selectedTicketCode === code;
                    // Ưu tiên pageAssignments (đã fetch ở mở modal)
                    // Nếu chưa có thì dùng modalAssignments (khi modal của ticket này đang mở)
                    const pageAssigns = pageAssignments.get(ticketId) || [];
                    const modalAssigns =
                      selectedTicket && getTicketId(selectedTicket) === ticketId
                        ? modalAssignments
                        : [];
                    const allAssigns = [...pageAssigns, ...modalAssigns];

                    const assignedTech = allAssigns.find(
                      (a) =>
                        a?.roleInTicket === 'TECHNICIAN' &&
                        a?.status !== 'CANCELLED',
                    );
                    const hasAnyTech = Boolean(assignedTech);

                    return (
                      <tr
                        key={code || ticketId || index}
                        className={selected ? styles.selectedRow : ''}
                      >
                        <td>{startIndex + index + 1}</td>
                        <td>{code || '-'}</td>
                        <td>
                          <span className={styles.licensePlate}>
                            {ticket.licensePlate || '-'}
                          </span>
                        </td>
                        <td>{ticket.customerName || ticket.fullName || '-'}</td>
                        <td title={ticket.customerRequest || ticket.requestNote || ''}>
                          {ticket.customerRequest || ticket.requestNote || '-'}
                        </td>
                        <td>
                          {formatDate(
                            ticket.appointmentDate ||
                              ticket.bookingDate ||
                              ticket.scheduledDate,
                          )}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${getServiceTicketStatusClass(ticket)}`}
                          >
                            {getServiceTicketStatusDisplay(ticket)}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const inspectionStatus = getInspectionStatusForTicket(ticket);
                            return (
                              <span
                                className={`${styles.statusBadge} ${getInspectionStatusClass(
                                  inspectionStatus,
                                )}`}
                              >
                                {getInspectionStatusDisplay(inspectionStatus)}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          {hasAnyTech ? (
                            <button
                              className={styles.techNameBtn}
                              onClick={() => handleOpenModal(ticket)}
                            >
                              {getStaffDisplayName(assignedTech?.staffId)}
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
                        </td>
                        <td>
                          <button
                            className={`${styles.actionBtn} ${
                              selected ? styles.viewBtnActive : styles.viewBtn
                            }`}
                            onClick={() =>
                              setSelectedTicketCode(selected ? '' : code)
                            }
                            disabled={!code}
                          >
                            {selected ? 'Đóng' : 'Mở'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredTickets.length > 0 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Trước
              </button>
              <span className={styles.paginationInfo}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Service Ticket Detail + phiếu kiểm tra an toàn chỉnh sửa được */}
        {selectedTicketCode && (
          <div className={styles.rightPanel}>
            <ServiceTicketDetail
              key={selectedTicketCode}
              ticketCodeOverride={selectedTicketCode}
              embedded
              onClose={() => setSelectedTicketCode('')}
            />
          </div>
        )}
      </div>

      {/* Modal phân công KTV */}
      {showAssignModal && selectedTicket && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Phân công KTV — {getTicketCode(selectedTicket) || '-'}
              </h3>
              <button className={styles.modalClose} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Trạng thái phiếu:{' '}
                <strong>{getServiceTicketStatusDisplay(selectedTicket)}</strong>
              </p>

              {getInspectionStatusForTicket(selectedTicket)?.toUpperCase() ===
                'COMPLETED' && (
                <div style={{ marginBottom: 12 }}>
                  <button
                    className={styles.modalActionBtn}
                    onClick={() => {
                      const code = getTicketCode(selectedTicket);
                      if (!code) return;
                      handleCloseModal();
                      navigate(
                        `/service-ticket-detail/${encodeURIComponent(code)}`,
                      );
                    }}
                  >
                    Sang báo giá (Service Ticket Detail)
                  </button>
                </div>
              )}

              {modalSuccess && (
                <div className={styles.successBanner}>{modalSuccess}</div>
              )}
              {modalError && <div className={styles.errorBanner}>{modalError}</div>}

              {/* PHẦN ADVISOR */}
              <div className={styles.assignSection}>
                <h4 className={styles.sectionTitle}>TƯ VẤN VIÊN PHỤ TRÁCH</h4>
                {loadingModal ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Đang tải...</p>
                ) : modalAdvisor ? (
                  <div className={styles.assignCard}>
                    <div className={styles.assignInfo}>
                      <span className={styles.assignName}>
                        {getAdvisorDisplayName(selectedTicket)}
                      </span>
                      <span className={styles.assignRole}>
                        Cố vấn viên &bull;{' '}
                        {STATUS_LABELS[modalAdvisor.status] || modalAdvisor.status}
                      </span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <select
                          value={selectedNewAdvisorId}
                          onChange={(e) => setSelectedNewAdvisorId(e.target.value)}
                          disabled={loadingModal}
                          style={{ flex: 1 }}
                        >
                          <option value="">Chon advisor moi</option>
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
                            loadingModal ||
                            !canChangeAdvisorByRole ||
                            !canChangeModalAdvisor ||
                            !selectedNewAdvisorId ||
                            Number(selectedNewAdvisorId) === Number(modalAdvisor?.staffId)
                          }
                        >
                          Doi advisor
                        </button>
                      </div>
                      {!canChangeModalAdvisor && (
                        <span className={styles.assignRole}>
                          Chi duoc doi khi advisor hien tai dang PENDING hoac ACTIVE.
                        </span>
                      )}
                      {!canChangeAdvisorByRole && (
                        <span className={styles.assignRole}>
                          Chi advisor moi co quyen doi advisor.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.assignCard}>
                    <div className={styles.assignInfo}>
                      <span className={styles.assignName}>
                        {getAdvisorDisplayName(selectedTicket)}
                      </span>
                      <span className={styles.assignRole}>Cố vấn viên</span>
                    </div>
                  </div>
                )}
              </div>

              {loadingModal && !modalSuccess && (
                <div className={styles.loadingContainer} style={{ minHeight: 80 }}>
                  <div className={styles.spinner}></div>
                  <p>Đang tải...</p>
                </div>
              )}

              {/* KTV ĐÃ PHÂN CÔNG — gộp tất cả (PENDING / ACTIVE / DONE / CANCELLED) */}
              {!loadingModal && modalAssignments.length > 0 && (
                <div className={styles.assignSection}>
                  <h4 className={styles.sectionTitle}>KTV ĐÃ PHÂN CÔNG</h4>
                  {modalAssignments.map((a) => {
                    const isCancelled = a?.status === 'CANCELLED';
                    const isPrimary = a?.isPrimary;
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
                            {STATUS_LABELS[a.status] || a.status}
                          </span>
                          {a?.status === 'PENDING' && (
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
                                <option value="">Chon KTV thay the</option>
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
                                  loadingModal ||
                                  !techReplacementByAssignment[String(a?.assignmentId)]
                                }
                              >
                                Doi KTV
                              </button>
                            </div>
                          )}
                        </div>
                        {!isCancelled && (
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleCancelTech(a)}
                            disabled={loadingModal}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* KTV chính: luôn gửi isPrimary = true */}
              {!loadingModal && modalTechList.length > 0 && (
                <div className={styles.assignSection}>
                  <h4 className={styles.sectionTitle}>Phân công kỹ thuật viên chính</h4>
                  {hasPrimaryTechnician && (
                    <p className={styles.sectionHint}>
                      Ticket đã có KTV chính đang PENDING/ACTIVE.
                    </p>
                  )}
                  <div className={styles.techRow}>
                    {modalTechList.map((tech) => {
                      const workload = workloadMap[tech.staffId];
                      const isBusy = workload?.isBusy || false;
                      const ticketCount = workload?.currentTicketCount ?? 0;

                      return (
                        <div key={`primary-${tech.staffId}`} className={styles.techCard}>
                          <div className={styles.techInfo}>
                            <span className={styles.techName}>
                              {tech.fullName || `NV-${tech.staffId}`}
                            </span>
                            <span className={styles.techPhone}>
                              {tech.phone || ''}
                            </span>
                          </div>
                          <div className={styles.workloadBadge}>
                            <span className={isBusy ? styles.busy : styles.available}>
                              {ticketCount} phiếu — {isBusy ? 'bận' : 'rảnh'}
                            </span>
                          </div>
                          <button
                            className={styles.assignBtn}
                            onClick={() => handleAssign(tech, true)}
                            disabled={loadingModal || hasPrimaryTechnician}
                          >
                            Chọn KTV chính
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* KTV phụ: luôn gửi isPrimary = false */}
              {!loadingModal && modalTechList.length > 0 && (
                <div className={styles.assignSection}>
                  <h4 className={styles.sectionTitle}>Phân công kỹ thuật viên phụ</h4>
                  <div className={styles.techRow}>
                    {modalTechList.map((tech) => {
                      const workload = workloadMap[tech.staffId];
                      const isBusy = workload?.isBusy || false;
                      const ticketCount = workload?.currentTicketCount ?? 0;

                      return (
                        <div key={`secondary-${tech.staffId}`} className={styles.techCard}>
                          <div className={styles.techInfo}>
                            <span className={styles.techName}>
                              {tech.fullName || `NV-${tech.staffId}`}
                            </span>
                            <span className={styles.techPhone}>
                              {tech.phone || ''}
                            </span>
                          </div>
                          <div className={styles.workloadBadge}>
                            <span className={isBusy ? styles.busy : styles.available}>
                              {ticketCount} phiếu — {isBusy ? 'bận' : 'rảnh'}
                            </span>
                          </div>
                          <button
                            className={styles.assignBtn}
                            onClick={() => handleAssign(tech, false)}
                            disabled={loadingModal}
                          >
                            Thêm KTV phụ
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!loadingModal && modalTechList.length === 0 && (
                <div className={styles.emptyState}>
                  <p>
                    {modalAssignments.length > 0
                      ? 'Không còn KTV khả dụng nào để phân công thêm.'
                      : 'Chưa có KTV nào được phân công.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
