import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../BookingRequestManagement/BookingRequestManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchManagedBookingsPaged } from '../../../services/bookingService.js';
import { combineDateTime, formatDateTimeVi, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, getBookingStatusTone, normalizeStatusCode } from '../../../components/statusUtils.js';

export default function ConfirmedBookingManagement() {
  useScrollToTop();

  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Query state (backend paging/filtering)
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [date, setDate] = useState(''); // yyyy-mm-dd
  const [status, setStatus] = useState('CONFIRMED');
  const [isGuest, setIsGuest] = useState(''); // '' | 'true' | 'false'
  const [search, setSearch] = useState('');

  // Server paging metadata
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => {
    const parsedIsGuest = isGuest === '' ? undefined : isGuest === 'true';
    return {
      page,
      size,
      date: date || undefined,
      status: status || undefined,
      isGuest: parsedIsGuest,
      search: debouncedSearch || undefined,
    };
  }, [page, size, date, status, isGuest, debouncedSearch]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setError('Vui lòng đăng nhập để xem danh sách booking.');
      setBookings([]);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await fetchManagedBookingsPaged(filters, token);
        const pageData = response?.data;
        const list = Array.isArray(pageData?.content) ? pageData.content : [];
        const apiTotalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
        const apiTotalElements = Number.isFinite(pageData?.totalElements) ? pageData.totalElements : list.length;

        setBookings(list);
        setTotalPages(Math.max(1, apiTotalPages));
        setTotalElements(Math.max(0, apiTotalElements));

        if (apiTotalPages > 0 && filters.page > apiTotalPages - 1) {
          setPage(Math.max(0, apiTotalPages - 1));
        }
        setError('');
      } catch (err) {
        const msg = err?.message || 'Không thể tải danh sách booking.';
        const isUnauthorized = err?.status === 401 || err?.status === 403;

        if (isUnauthorized) {
          localStorage.removeItem('authToken');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError(msg);
        }
        setBookings([]);
        setTotalPages(1);
        setTotalElements(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleResetFilters = () => {
    setPage(0);
    setSize(10);
    setDate('');
    setStatus('CONFIRMED');
    setIsGuest('');
    setSearch('');
  };

  return (
    <div className={styles['booking-page']}>
      <div className={styles['booking-layout']}>
        <div className={styles['booking-left']}>
          <BookingPanel
            title="Booking đã confirm"
            icon={<CheckIcon />}
            tone="success"
            data={bookings}
            isLoading={isLoading}
            error={error}
            page={page}
            size={size}
            totalPages={totalPages}
            totalElements={totalElements}
            date={date}
            status={status}
            isGuest={isGuest}
            search={search}
            onChangePage={setPage}
            onChangeSize={(next) => {
              setSize(next);
              setPage(0);
            }}
            onChangeDate={(next) => {
              setDate(next);
              setPage(0);
            }}
            onChangeStatus={(next) => {
              setStatus(next);
              setPage(0);
            }}
            onChangeIsGuest={(next) => {
              setIsGuest(next);
              setPage(0);
            }}
            onChangeSearch={(next) => {
              setSearch(next);
              setPage(0);
            }}
            onResetFilters={handleResetFilters}
            onViewDetail={(bookingCode, state) => {
              const code = bookingCode == null ? '' : String(bookingCode).trim();
              if (!code) {
                setError('Booking này chưa có mã bookingCode nên không thể xem chi tiết.');
                return;
              }
              navigate(`/booking-management/${code}`, { state });
            }}
            onCheckIn={(payload) => {
              navigate('/check-in', { state: payload });
            }}
            actionLabel={`${totalElements} booking`}
          />
        </div>
      </div>
    </div>
  );
}

function BookingPanel({
  title,
  icon,
  tone,
  data,
  actionLabel,
  onViewDetail,
  onCheckIn,
  isLoading,
  error,
  page,
  size,
  totalPages,
  date,
  status,
  isGuest,
  search,
  onChangePage,
  onChangeSize,
  onChangeDate,
  onChangeStatus,
  onChangeIsGuest,
  onChangeSearch,
  onResetFilters,
}) {
  const toneClass = styles['booking-card--' + tone];

  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1;
  const safePage = Number.isFinite(page) ? Math.min(Math.max(0, page), safeTotalPages - 1) : 0;

  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const current = safePage;
    const last = safeTotalPages - 1;
    const start = Math.max(0, Math.min(current - 2, last - (maxButtons - 1)));
    const end = Math.min(last, start + (maxButtons - 1));
    const items = [];
    for (let i = start; i <= end; i += 1) items.push(i);
    return items;
  }, [safePage, safeTotalPages]);

  return (
    <section className={`${styles['booking-card']} ${toneClass}`}>
      <div className={styles['booking-card__header']}>
        <div className={styles['booking-card__title']}>{icon} {title}</div>
        <button className={styles['ghost-button']}>{actionLabel}</button>
      </div>

      {error && <div className={styles['error-banner']}>{error}</div>}

      <div className={styles['pending-filters']}>
        <div className={styles['filter-card__labels']}>
          <label>Loại khách hàng</label>
          <label>Ngày hẹn</label>
          <label>Trạng thái</label>
        </div>
        <div className={styles['filter-card__controls']}>
          <select value={isGuest} onChange={(e) => onChangeIsGuest?.(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="true">Vãng lai</option>
            <option value="false">Có tài khoản</option>
          </select>
          <input type="date" value={date} onChange={(e) => onChangeDate?.(e.target.value)} />
          <select value={status} onChange={(e) => onChangeStatus?.(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="DONE">Hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="NOT_ARRIVED">Chưa đến</option>
          </select>
        </div>
        <div className={styles['filter-card__actions']}>
          <div className={styles['search-box']}>
            <input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => onChangeSearch?.(e.target.value)}
            />
            <SearchIcon />
          </div>
          <button className={styles['ghost-button']} onClick={onResetFilters}>Xóa bộ lọc</button>
        </div>
        <p className={styles['filter-card__hint']}>(tìm kiếm theo cả tên, mã, dịch vụ)</p>
      </div>

      <div className={styles['booking-table__wrapper']}>
        <table className={styles['booking-table']}>
          <thead>
            <tr>
              <th>STT</th>
              <th>TÊN KHÁCH HÀNG</th>
              <th>SỐ ĐIỆN THOẠI</th>
              <th>DỊCH VỤ</th>
              <th>TRẠNG THÁI</th>
               <th>THỜI GIAN GỬI YÊU CẦU</th>
              <th>THỜI GIAN HẸN</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="8" className={styles['empty-row']}>Đang tải dữ liệu...</td></tr>
            )}

            {!isLoading && data.length === 0 && (
              <tr><td colSpan="8" className={styles['empty-row']}>Không có booking nào.</td></tr>
            )}

            {!isLoading && data.map((item, idx) => {
              const rawStatus = item?.status;
              const statusKey = String(normalizeStatusCode(rawStatus) || '').toUpperCase();
              const tone = getBookingStatusTone(statusKey, 'info');
              const bookingId = item?.bookingId ?? item?.id;
              const bookingCode = item?.bookingCode;

              const customerName = item?.customer?.fullName || item?.fullName || item?.name || '-';
              const customerPhone = item?.customer?.phone || item?.phone || '-';
              const service = item?.serviceCategory || item?.service || '-';

              const appointmentAt = (item?.scheduledDate && item?.scheduledTime)
                ? `${String(item.scheduledDate).trim()}T${String(item.scheduledTime).trim()}`
                : (item?.appointmentAt || null);

              const rowKey = bookingId ?? `${item?.createdAt || 'row'}-${idx}`;

              return (
                <tr key={rowKey}>
                  <td className={styles['link-cell']}>{bookingId ?? '-'}</td>
                  <td>{customerName}</td>
                  <td>{customerPhone}</td>
                  <td>{service}</td>
                  <td>
                    <span className={`${styles['status-badge']} ${styles['status-badge--' + tone]}`}>
                      {getBookingStatusTextVi(rawStatus, '-')}
                    </span>
                  </td>
                  <td>{formatDateTimeVi(item?.createdAt, '-') }</td>
                  <td>{combineDateTime(item?.scheduledDate, formatTimeHHmm(item?.scheduledTime)) || '-'}</td>
                  
                  <td>
                    <div className={styles.pagination}>
                      <button
                        className={styles['primary-button']}
                        disabled={!bookingCode}
                        onClick={() =>
                          onViewDetail?.(bookingCode, {
                            customerName,
                            customerPhone,
                          })
                        }
                      >
                        Xem chi tiết
                      </button>
                      {rawStatus === 'CONFIRMED' && (
                      <button
                        className={`${styles['primary-button']} ${styles['is-ghost']}`}
                        onClick={() => onCheckIn?.({
                          bookingCode,
                          bookingId,
                          booking: {
                            bookingId,
                            bookingCode,
                            customerName,
                            customerPhone,
                            serviceName: service,
                            appointmentAt,
                          },
                        })}
                      >
                        Check-in
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

      <div className={styles['booking-card__footer']}>
        <div className={styles['page-size']}>
          <span>Hiển thị:</span>
          <select value={String(size)} onChange={(e) => onChangeSize?.(Number(e.target.value))}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <div className={styles.pagination}>
          <button
            className={styles['primary-button']}
            disabled={safePage <= 0 || isLoading}
            onClick={() => onChangePage?.(safePage - 1)}
          >
            Trước
          </button>

          {pageButtons.map((p) => {
            const isActive = p === safePage;
            return (
              <button
                key={p}
                className={isActive ? styles['ghost-button'] : `${styles['primary-button']} ${styles['is-ghost']}`}
                disabled={isActive || isLoading}
                onClick={() => onChangePage?.(p)}
              >
                {p + 1}
              </button>
            );
          })}

          <button
            className={styles['primary-button']}
            disabled={safePage >= safeTotalPages - 1 || isLoading}
            onClick={() => onChangePage?.(safePage + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() { /* ... SVG Code ... */ }
