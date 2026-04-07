import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './FeedbackManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchFeedbackPaged } from '../../../services/feedbackService.js';
import { fetchServiceTicketDetail, fetchServiceTicketsPaged } from '../../../services/serviceTicketService.js';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;

const toPositiveInt = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
};

const toStartDateTime = (dateText) => {
  const date = String(dateText || '').trim();
  return date ? `${date}T00:00:00` : '';
};

const toEndDateTime = (dateText) => {
  const date = String(dateText || '').trim();
  return date ? `${date}T23:59:59` : '';
};

const renderStars = (value) => {
  const star = Number(value);
  if (!Number.isFinite(star) || star <= 0) return '-';
  const safe = Math.max(1, Math.min(5, Math.trunc(star)));
  return `${'\u2605'.repeat(safe)}${'\u2606'.repeat(5 - safe)} (${safe})`;
};

export default function FeedbackManagement() {
  useScrollToTop();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(null);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [starRating, setStarRating] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const ticketCodeCacheRef = useRef(new Map());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const notify = useCallback((message, type = 'info') => {
    toast[type](message, { containerId: 'app-toast' });
  }, []);

  const loadFeedback = useCallback(async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
      setError('Vui lòng đăng nhập để xem feedback.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      if (startDate && endDate && startDate > endDate) {
        setItems([]);
        setTotalElements(0);
        setTotalPages(1);
        setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
        return;
      }

      const params = {
        page,
        size,
        search: debouncedSearch || undefined,
        starRating: starRating || undefined,
        startDate: toStartDateTime(startDate) || undefined,
        endDate: toEndDateTime(endDate) || undefined,
      };

      const res = await fetchFeedbackPaged(params, token);
      const payload = extractPayload(res);
      const content = Array.isArray(payload?.content) ? payload.content : [];

      setItems(content);
      setTotalElements(Number(payload?.totalElements ?? content.length));
      setTotalPages(Number(payload?.totalPages ?? 1) || 1);
    } catch (err) {
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
      setError(err?.message || 'Không thể tải danh sách feedback.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, endDate, page, size, starRating, startDate]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));

  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const last = totalPages - 1;
    const start = Math.max(0, Math.min(safePage - 2, last - (maxButtons - 1)));
    const end = Math.min(last, start + (maxButtons - 1));
    const result = [];
    for (let i = start; i <= end; i += 1) result.push(i);
    return result;
  }, [safePage, totalPages]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStarRating('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  }, []);

  const resolveTicketCodeByServiceTicketId = useCallback(async (serviceTicketId, token) => {
    const id = toPositiveInt(serviceTicketId);
    if (!id) return '';

    const cached = ticketCodeCacheRef.current.get(id);
    if (cached) return cached;

    const PAGE_SIZE = 50;
    let pageIndex = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      const listRes = await fetchServiceTicketsPaged(
        { page: pageIndex, size: PAGE_SIZE, search: String(id) },
        token,
      );
      const listPayload = extractPayload(listRes);
      const content = Array.isArray(listPayload?.content) ? listPayload.content : [];

      const matched = content.find((item) => Number(item?.serviceTicketId) === id) || null;
      if (matched) {
        const code = String(matched?.ticketCode || '').trim();
        if (code) ticketCodeCacheRef.current.set(id, code);
        return code;
      }

      // Check if there is a next page
      const totalPages = Number(listPayload?.totalPages ?? 0);
      hasNextPage = pageIndex + 1 < totalPages;
      pageIndex += 1;
    }

    return '';
  }, []);

  const openServiceTicket = useCallback(async (feedback) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để xem phiếu dịch vụ.', 'error');
      return;
    }

    const serviceTicketId = toPositiveInt(feedback?.serviceTicketId);
    if (!serviceTicketId) {
      notify('Feedback không có serviceTicketId hợp lệ.', 'error');
      return;
    }

    try {
      setIsResolvingTicket(serviceTicketId);
      const directTicketCode = String(feedback?.ticketCode || '').trim();
      const ticketCode = directTicketCode || await resolveTicketCodeByServiceTicketId(serviceTicketId, token);
      if (!ticketCode) {
        notify(`Không tìm thấy ticketCode cho phiếu #${serviceTicketId}.`, 'error');
        return;
      }

      // Theo yêu cầu: dùng API chi tiết phiếu dịch vụ để mở xem phiếu.
      const detailRes = await fetchServiceTicketDetail(ticketCode, token);
      const detail = extractPayload(detailRes);

      navigate(`/service-ticket-detail/${encodeURIComponent(ticketCode)}`, {
        state: { ticket: detail },
      });
    } catch (err) {
      notify(err?.message || 'Không thể mở phiếu dịch vụ.', 'error');
    } finally {
      setIsResolvingTicket(null);
    }
  }, [navigate, notify, resolveTicketCodeByServiceTicketId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Quản lý feedback</h1>
        <span className={styles.totalCount}>{totalElements} phản hồi</span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Tìm theo comment..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />

        <select
          value={starRating}
          onChange={(e) => {
            setStarRating(e.target.value);
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

        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(0);
          }}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(0);
          }}
        />

        <button type="button" className={styles.ghostButton} onClick={resetFilters}>
          Xóa lọc
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã phiếu</th>
              <th>Số sao</th>
              <th>Comment</th>
              <th>Chi tiết phản hồi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>Đang tải dữ liệu...</td>
              </tr>
            )}

            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>Không có feedback phù hợp.</td>
              </tr>
            )}

            {!isLoading && items.map((item, idx) => {
              const serviceTicketId = toPositiveInt(item?.serviceTicketId);
              return (
                <tr key={`${serviceTicketId || 'feedback'}-${idx}`}>
                  <td>{safePage * size + idx + 1}</td>
                  <td>{serviceTicketId || '-'}</td>
                  <td>{renderStars(item?.starRating)}</td>
                  <td className={styles.leftCell}>{item?.comment || '-'}</td>
                  <td className={styles.leftCell}>{item?.detailFeedback || '-'}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.viewButton}
                      disabled={!serviceTicketId || isResolvingTicket === serviceTicketId}
                      onClick={() => openServiceTicket(item)}
                    >
                      {isResolvingTicket === serviceTicketId ? 'Đang mở...' : 'Xem phiếu dịch vụ'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isLoading && totalElements > 0 && (
        <div className={styles.footer}>
          <div className={styles.pageSize}>
            <span>Hiển thị:</span>
            <select
              value={String(size)}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className={styles.pagination}>
            <button type="button" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}>
              Trước
            </button>

            {pageButtons.map((p) => (
              <button
                type="button"
                key={p}
                disabled={p === safePage}
                className={p === safePage ? styles.currentPage : ''}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}

            <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
