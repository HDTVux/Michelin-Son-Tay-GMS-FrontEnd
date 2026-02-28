import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../BookingRequestManagement/BookingRequestManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchManagedBookings } from '../../../services/bookingService.js';
import { combineDateTime, formatDateTimeVi, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi } from '../../../components/statusUtils.js';

export default function ConfirmedBookingManagement() {
  useScrollToTop();

  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        const response = await fetchManagedBookings(token);
        const list = Array.isArray(response?.data) ? response.data : [];
        setBookings(list);
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
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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
            onViewDetail={(id) => {
              if (id != null) navigate(`/booking-management/${id}`);
            }}
            onCheckIn={(payload) => {
              navigate('/check-in', { state: payload });
            }}
            actionLabel={`${bookings.length} booking`}
          />
        </div>
      </div>
    </div>
  );
}

function BookingPanel({ title, icon, tone, data, actionLabel, onViewDetail, onCheckIn, isLoading, error }) {
  const toneClass = styles['booking-card--' + tone];

  const statusToneMap = useMemo(
    () => ({
      NEW: 'info',
      CONFIRMED: 'success',
      CONFIRM: 'success',
      APPROVED: 'success',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger',
      REJECTED: 'danger',
      DEFAULT: 'info',
    }),
    []
  );

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
          <label>Thời gian hẹn</label>
          <label>Trạng thái</label>
        </div>
        <div className={styles['filter-card__controls']}>
          <select>
            <option>Tất cả</option>
            <option>Vãng Lai</option>
            <option>có tài khoản</option>
          </select>
          <select><option>Hôm nay</option>...</select>
          <select><option>Tất cả</option>...</select>
        </div>
        <div className={styles['filter-card__actions']}>
          <div className={styles['search-box']}>
            <input placeholder="Tìm kiếm..." />
            <SearchIcon />
          </div>
          <button className={styles['ghost-button']}>Xóa bộ lọc</button>
        </div>
        <p className={styles['filter-card__hint']}>(tìm kiếm theo cả tên, mã, dịch vụ)</p>
      </div>

      <div className={styles['booking-table__wrapper']}>
        <table className={styles['booking-table']}>
          <thead>
            <tr>
              <th>MÃ BOOKING</th>
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
              const tone = statusToneMap[String(rawStatus || '').toUpperCase()] || statusToneMap.DEFAULT;
              const bookingId = item?.bookingId ?? item?.id;

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
                        onClick={() => onViewDetail?.(bookingId)}
                      >
                        Xem chi tiết
                      </button>
                      <button
                        className={`${styles['primary-button']} ${styles['is-ghost']}`}
                        onClick={() => onCheckIn?.({
                          bookingId,
                          booking: {
                            bookingId,
                            customerName,
                            customerPhone,
                            serviceName: service,
                            appointmentAt,
                          },
                        })}
                      >
                        Check-in
                      </button>
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
          <select><option>10</option><option>20</option></select>
        </div>
        <div className={styles.pagination}>
          <button className={styles['ghost-button']} disabled>1</button>
          <button className={`${styles['primary-button']} ${styles['is-ghost']}`}>2</button>
          <button className={`${styles['primary-button']} ${styles['is-ghost']}`}>3</button>
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
