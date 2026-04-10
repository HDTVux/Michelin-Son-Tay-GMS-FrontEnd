import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTimeViNoSeconds, formatTimeHHmm } from '../../../components/timeUtils.js';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchFeedbackPaged } from '../../../services/feedbackService.js';
import {
  fetchServiceTicketDetail,
  fetchServiceTicketsPaged,
  fetchTicketAssignments,
} from '../../../services/serviceTicketService.js';
import styles from './FeedbackManagement.module.css';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const TICKET_STATUS_LABELS = {
  DRAFT: 'Nháp',
  INSPECTION: 'Đang kiểm tra',
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang sửa chữa',
  COMPLETED: 'Hoàn tất',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const ASSIGNMENT_STATUS_LABELS = {
  PENDING: 'Chờ bắt đầu',
  ACTIVE: 'Đang làm',
  DONE: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const ROLE_LABELS = {
  ADVISOR: 'Cố vấn',
  TECHNICIAN: 'Kỹ thuật viên',
  RECEPTIONIST: 'Lễ tân',
  MANAGER: 'Quản lý',
  ADMIN: 'Admin',
};

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;

const toSafePositiveInt = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
};

const toIsoDayStart = (value) => {
  const text = String(value || '').trim();
  return text ? `${text}T00:00:00` : undefined;
};

const toIsoDayEnd = (value) => {
  const text = String(value || '').trim();
  return text ? `${text}T23:59:59` : undefined;
};

const normalizeTicketStatus = (value) => {
  const code = String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, '_');
  if (!code) return '';
  if (code === 'CREATED') return 'DRAFT';
  if (code === 'INSPECTING' || code === 'DIAGNOSIS') return 'INSPECTION';
  if (code === 'INPROGRESS') return 'IN_PROGRESS';
  if (code === 'CANCELED') return 'CANCELLED';
  return code;
};

const toTicketStatusLabel = (value) => {
  const normalized = normalizeTicketStatus(value);
  return TICKET_STATUS_LABELS[normalized] || normalized || '-';
};

const normalizeFeedbackPage = (response) => {
  const payload = extractPayload(response) ?? {};
  const content = Array.isArray(payload?.content) ? payload.content : [];
  const totalElements = Number(payload?.totalElements ?? content.length);
  const totalPages = Number(payload?.totalPages ?? (content.length > 0 ? 1 : 0));
  const pageNumber = Number(payload?.number ?? 0);

  return {
    content,
    totalElements: Number.isFinite(totalElements) ? totalElements : content.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    pageNumber: Number.isFinite(pageNumber) && pageNumber >= 0 ? pageNumber : 0,
  };
};

const normalizeAssignments = (response) => {
  const payload = extractPayload(response);
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.content) ? payload.content : [];
  return rows.map((item, idx) => {
    const staffId = toSafePositiveInt(item?.staffId);
    const roleCode = String(item?.roleInTicket || item?.role || '').trim().toUpperCase();
    const statusCode = String(item?.status || item?.assignmentStatus || '').trim().toUpperCase();
    const status = statusCode === 'IN_PROGRESS' ? 'ACTIVE' : statusCode;
    return {
      id: toSafePositiveInt(item?.assignmentId) || idx + 1,
      staffId,
      fullName: String(item?.fullName || item?.staffName || '').trim(),
      role: roleCode,
      status,
      isPrimary: Boolean(item?.isPrimary),
      assignedAt: item?.assignedAt || item?.createdAt || null,
    };
  });
};

const getRoleLabel = (value) => {
  const code = String(value || '').trim().toUpperCase();
  return ROLE_LABELS[code] || code || '-';
};

const getAssignmentStatusLabel = (value) => {
  const code = String(value || '').trim().toUpperCase();
  return ASSIGNMENT_STATUS_LABELS[code] || code || '-';
};

const renderStars = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 'Chưa đánh giá';
  const safe = Math.max(1, Math.min(5, Math.trunc(num)));
  return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)} (${safe}/5)`;
};

const compactText = (value, fallback = '-') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const buildModalTicketInfo = (detail, ticketCodeFallback, serviceTicketIdFallback) => {
  const payload = extractPayload(detail) ?? {};
  const serviceTicketId = toSafePositiveInt(payload?.serviceTicketId) || serviceTicketIdFallback || null;
  const ticketCode = compactText(payload?.ticketCode || ticketCodeFallback, '-');
  const bookingDate = compactText(payload?.booking?.scheduledDate || payload?.scheduledDate, '');
  const bookingTime = formatTimeHHmm(payload?.booking?.scheduledTime || payload?.scheduledTime || '');

  return {
    serviceTicketId,
    ticketCode,
    ticketStatusLabel: toTicketStatusLabel(payload?.ticketStatus || payload?.status),
    customerName: compactText(payload?.customer?.fullName || payload?.customerName),
    customerPhone: compactText(payload?.customer?.phone || payload?.customerPhone),
    licensePlate: compactText(payload?.vehicle?.licensePlate || payload?.licensePlate),
    vehicleModel: compactText(payload?.vehicle?.model || payload?.vehicleModel),
    receivedAt: payload?.receivedAt || payload?.checkInAt || payload?.createdAt || null,
    bookingSchedule: bookingDate && bookingTime ? `${bookingDate} ${bookingTime}` : bookingDate || bookingTime || '-',
    requestNote: compactText(payload?.customerRequest || payload?.checkInNotes || payload?.requestNote),
    advisorName: compactText(payload?.advisorName, ''),
    advisorId: toSafePositiveInt(payload?.advisorId),
  };
};

function FeedbackManagement() {
  useScrollToTop();
  const navigate = useNavigate();
  const ticketLookupCacheRef = useRef(new Map());

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [starRating, setStarRating] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [ticketAssignments, setTicketAssignments] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const getToken = useCallback(
    () =>
      localStorage.getItem('authToken') ||
      localStorage.getItem('staffToken') ||
      localStorage.getItem('adminToken'),
    [],
  );

  const resolveTicketInfoByServiceTicketId = useCallback(async (serviceTicketId, token) => {
    const ticketId = toSafePositiveInt(serviceTicketId);
    if (!ticketId) return null;

    if (ticketLookupCacheRef.current.has(ticketId)) {
      return ticketLookupCacheRef.current.get(ticketId);
    }

    const PAGE_SIZE = 50;
    let pageIndex = 0;
    let totalPageCount = 1;

    while (pageIndex < totalPageCount) {
      const response = await fetchServiceTicketsPaged(
        { page: pageIndex, size: PAGE_SIZE, search: String(ticketId) },
        token,
      );
      const payload = extractPayload(response) ?? {};
      const content = Array.isArray(payload?.content) ? payload.content : [];
      const matched = content.find((item) => toSafePositiveInt(item?.serviceTicketId) === ticketId) || null;
      if (matched) {
        const result = {
          serviceTicketId: ticketId,
          ticketCode: compactText(matched?.ticketCode, ''),
          raw: matched,
        };
        ticketLookupCacheRef.current.set(ticketId, result);
        return result;
      }

      totalPageCount = Number(payload?.totalPages ?? 0);
      if (!Number.isFinite(totalPageCount) || totalPageCount <= 0) break;
      pageIndex += 1;
    }

    ticketLookupCacheRef.current.set(ticketId, null);
    return null;
  }, []);

  const loadFeedback = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
      setError('Vui lòng đăng nhập để xem dữ liệu feedback.');
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const safePageNumber = Number.isFinite(page) && page >= 0 ? Math.trunc(page) : 0;
      const safePageSize = Number.isFinite(size) && size >= 1 ? Math.trunc(size) : DEFAULT_PAGE_SIZE;

      if (safePageNumber !== page) setPage(safePageNumber);
      if (safePageSize !== size) setSize(safePageSize);

      const params = {
        page: safePageNumber,
        size: safePageSize,
        search: debouncedSearch || undefined,
        starRating: starRating || undefined,
        startDate: toIsoDayStart(startDate),
        endDate: toIsoDayEnd(endDate),
      };
      const response = await fetchFeedbackPaged(params, token);
      const pageData = normalizeFeedbackPage(response);
      setItems(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
      setPage(pageData.pageNumber);
    } catch (err) {
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
      setError(err?.message || 'Không thể tải danh sách feedback.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, endDate, getToken, page, size, starRating, startDate]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
  const safeSize = Number.isFinite(size) && size >= 1 ? Math.trunc(size) : DEFAULT_PAGE_SIZE;

  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const last = Math.max(0, totalPages - 1);
    const start = Math.max(0, Math.min(safePage - 2, last - (maxButtons - 1)));
    const end = Math.min(last, start + (maxButtons - 1));
    const list = [];
    for (let idx = start; idx <= end; idx += 1) list.push(idx);
    return list;
  }, [safePage, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setStarRating('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError('');
    setSelectedFeedback(null);
    setTicketInfo(null);
    setTicketAssignments([]);
  };

  const openTicketDetailModal = useCallback(async (feedback) => {
    const token = getToken();
    const serviceTicketId = toSafePositiveInt(feedback?.serviceTicketId);

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setSelectedFeedback(feedback);
    setTicketInfo(null);
    setTicketAssignments([]);

    if (!token) {
      setDetailError('Vui lòng đăng nhập để xem chi tiết phiếu dịch vụ.');
      setDetailLoading(false);
      return;
    }

    if (!serviceTicketId) {
      setDetailError('Feedback không có serviceTicketId hợp lệ.');
      setDetailLoading(false);
      return;
    }

    const localErrors = [];

    try {
      const [assignmentResult, ticketLookupResult] = await Promise.allSettled([
        fetchTicketAssignments(serviceTicketId, token),
        resolveTicketInfoByServiceTicketId(serviceTicketId, token),
      ]);

      let assignments = [];
      if (assignmentResult.status === 'fulfilled') {
        assignments = normalizeAssignments(assignmentResult.value);
      } else {
        localErrors.push('Không thể tải danh sách nhân viên phụ trách.');
      }
      setTicketAssignments(assignments);

      const ticketCode = ticketLookupResult.status === 'fulfilled' ? ticketLookupResult.value?.ticketCode : '';
      if (!ticketCode) {
        localErrors.push(`Không tìm thấy ticketCode cho phiếu #${serviceTicketId}.`);
        setTicketInfo(
          buildModalTicketInfo(
            null,
            '',
            serviceTicketId,
          ),
        );
      } else {
        try {
          const detailResponse = await fetchServiceTicketDetail(ticketCode, token);
          setTicketInfo(buildModalTicketInfo(detailResponse, ticketCode, serviceTicketId));
        } catch {
          localErrors.push('Không thể tải chi tiết phiếu dịch vụ.');
          setTicketInfo(buildModalTicketInfo(null, ticketCode, serviceTicketId));
        }
      }
    } finally {
      setDetailError(localErrors.join(' '));
      setDetailLoading(false);
    }
  }, [getToken, resolveTicketInfoByServiceTicketId]);

  const activeAssignments = useMemo(
    () => ticketAssignments.filter((item) => String(item?.status || '').toUpperCase() !== 'CANCELLED'),
    [ticketAssignments],
  );

  const responsibleStaffRows = useMemo(() => {
    const list = [...activeAssignments];

    const hasAdvisorAssignment = list.some((item) => String(item?.role || '').toUpperCase() === 'ADVISOR');
    const advisorName = compactText(ticketInfo?.advisorName, '');
    if (!hasAdvisorAssignment && advisorName) {
      list.unshift({
        id: `advisor-${ticketInfo?.advisorId || advisorName}`,
        staffId: ticketInfo?.advisorId || null,
        fullName: advisorName,
        role: 'ADVISOR',
        status: 'ACTIVE',
        isPrimary: true,
        assignedAt: null,
      });
    }

    if (list.length === 0) return [];
    return list;
  }, [activeAssignments, ticketInfo?.advisorId, ticketInfo?.advisorName]);

  return (
    <div className={styles.bookingPage}>
      <header className={styles.bookingHeader}>
        <div className={styles.bookingHeaderTitle}>
          <span className={styles.headerIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 5h16v10H7l-3 3z" />
              <path d="M8 8h8M8 11h5" />
            </svg>
          </span>
          <h1>Quản lý feedback</h1>
        </div>
        <span className={styles.totalCount}>{totalElements.toLocaleString('vi-VN')} phản hồi</span>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.pendingFilters}>
        <div className={styles.filterCardLabels}>
          <span>Từ ngày</span>
          <span>Đến ngày</span>
          <span>Số sao</span>
          <span>Hiển thị</span>
        </div>

        <div className={`${styles.filterCardControls} ${styles.filterCardControlsFour}`}>
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPage(0);
            }}
          />

          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPage(0);
            }}
          />

          <select
            value={starRating}
            onChange={(event) => {
              setStarRating(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả số sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>

          <select
            value={String(safeSize)}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setSize(Number.isFinite(nextSize) && nextSize >= 1 ? Math.trunc(nextSize) : DEFAULT_PAGE_SIZE);
              setPage(0);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} / trang
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterCardActions}>
          <label className={styles.searchBox}>
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M11 4a7 7 0 1 0 4.9 12l4 4 1.4-1.4-4-4A7 7 0 0 0 11 4m0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm theo comment hoặc chi tiết feedback..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>

          <button type="button" className={styles.primaryButton} onClick={loadFeedback} disabled={isLoading}>
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>

          <button type="button" className={styles.ghostButton} onClick={resetFilters} disabled={isLoading}>
            Đặt lại
          </button>
        </div>
      </section>

      <section className={styles.bookingCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.bookingTable}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã phiếu</th>
                <th>Số sao</th>
                <th>Nhận xét</th>
                <th>Chi tiết phản hồi</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    Không có feedback phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const ticketId = toSafePositiveInt(item?.serviceTicketId);
                  return (
                    <tr key={`${ticketId || 'feedback'}-${index}`}>
                      <td>{safePage * safeSize + index + 1}</td>
                      <td className={styles.ticketCodeCell}>{ticketId || '-'}</td>
                      <td>{renderStars(item?.starRating)}</td>
                      <td className={styles.leftCell}>{compactText(item?.comment)}</td>
                      <td className={styles.leftCell}>{compactText(item?.detailFeedback)}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.viewBtn}`}
                            onClick={() => openTicketDetailModal(item)}
                          >
                            Xem chi tiết phiếu
                          </button>
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
            <span>
              Trang <strong>{safePage + 1}</strong> / {Math.max(1, totalPages)}
            </span>
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.ghostButton}
              disabled={safePage <= 0 || isLoading}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            >
              Trước
            </button>

            {pageButtons.map((value) => (
              <button
                type="button"
                key={value}
                className={`${styles.primaryButton} ${value === safePage ? '' : styles.isGhost}`}
                disabled={isLoading}
                onClick={() => setPage(value)}
              >
                {value + 1}
              </button>
            ))}

            <button
              type="button"
              className={styles.ghostButton}
              disabled={safePage >= totalPages - 1 || isLoading}
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {detailOpen && (
        <div className={styles.modalOverlay} onClick={closeDetailModal}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Chi tiết phiếu {ticketInfo?.ticketCode && ticketInfo.ticketCode !== '-' ? `#${ticketInfo.ticketCode}` : ''}
              </h3>
              <button className={styles.modalClose} onClick={closeDetailModal} aria-label="Đóng">
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {detailLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner} />
                  <p>Đang tải chi tiết phiếu...</p>
                </div>
              ) : (
                <>
                  {detailError && <div className={styles.errorBanner}>{detailError}</div>}

                  <div className={styles.assignSection}>
                    <h4 className={styles.sectionTitle}>Feedback</h4>
                    <div className={styles.detailCard}>
                      <div className={styles.detailRow}>
                        <span>Số sao:</span>
                        <strong>{renderStars(selectedFeedback?.starRating)}</strong>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Nhận xét:</span>
                        <strong>{compactText(selectedFeedback?.comment)}</strong>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Chi tiết phản hồi:</span>
                        <strong>{compactText(selectedFeedback?.detailFeedback)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.assignSection}>
                    <h4 className={styles.sectionTitle}>Thông tin phiếu dịch vụ</h4>
                    <div className={styles.detailCard}>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span>Mã phiếu</span>
                          <strong>{ticketInfo?.ticketCode || '-'}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>Trạng thái</span>
                          <strong>{ticketInfo?.ticketStatusLabel || '-'}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>Khách hàng</span>
                          <strong>{ticketInfo?.customerName || '-'}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>SĐT</span>
                          <strong>{ticketInfo?.customerPhone || '-'}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>Biển số xe</span>
                          <strong>{ticketInfo?.licensePlate || '-'}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>Model xe</span>
                          <strong>{ticketInfo?.vehicleModel || '-'}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>Ngày tiếp nhận</span>
                          <strong>{formatDateTimeViNoSeconds(ticketInfo?.receivedAt, '-')}</strong>
                        </div>
                        <div className={styles.detailItem}>
                          <span>Lịch hẹn</span>
                          <strong>{ticketInfo?.bookingSchedule || '-'}</strong>
                        </div>
                      </div>
                      <div className={styles.requestNote}>
                        <span>Yêu cầu khách hàng</span>
                        <strong>{ticketInfo?.requestNote || '-'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.assignSection}>
                    <h4 className={styles.sectionTitle}>Nhân viên phụ trách</h4>
                    {responsibleStaffRows.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>Phiếu này chưa có thông tin phân công nhân viên.</p>
                      </div>
                    ) : (
                      responsibleStaffRows.map((staff) => (
                        <div key={staff.id} className={styles.assignCard}>
                          <div className={styles.assignInfo}>
                            <span className={styles.assignName}>
                              {staff.fullName || (staff.staffId ? `NV-${staff.staffId}` : 'Chưa có tên')}
                            </span>
                            <span className={styles.assignRole}>
                              {getRoleLabel(staff.role)}
                              {staff.isPrimary ? ' • Chính' : ''}
                              {' • '}
                              {getAssignmentStatusLabel(staff.status)}
                            </span>
                            <span className={styles.assignedAt}>
                              {staff.assignedAt ? `Phân công: ${formatDateTimeViNoSeconds(staff.assignedAt, '-')}` : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              {ticketInfo?.ticketCode && ticketInfo.ticketCode !== '-' && (
                <button
                  type="button"
                  className={styles.modalActionBtn}
                  onClick={() =>
                    navigate(`/service-ticket-detail/${encodeURIComponent(ticketInfo.ticketCode)}`, {
                      state: { ticketCode: ticketInfo.ticketCode },
                    })
                  }
                >
                  Mở trang chi tiết phiếu
                </button>
              )}
              <button type="button" className={styles.modalActionBtn} onClick={closeDetailModal}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export { FeedbackManagement };
export default FeedbackManagement;
