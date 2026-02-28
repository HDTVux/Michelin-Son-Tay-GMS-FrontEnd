import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from '../BookingRequestManagement/BookingRequestDetail.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from '../BookingRequestManagement/SchedulePanel.jsx';
import { fetchManagedBookingDetail } from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi } from '../../../components/statusUtils.js';

function InfoRow({ label, value, link, type, extraAction, full }) {
  const rendered = link ? (
    <a className={styles.link} href={type === 'tel' ? `tel:${value}` : type === 'mailto' ? `mailto:${value}` : '#'}>
      {value}
    </a>
  ) : (
    <span className={styles.value}>{value}</span>
  );

  return (
    <div className={`${styles.infoBox} ${full ? styles.full : ''}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.infoRow}>
        {rendered}
        {extraAction}
      </div>
    </div>
  );
}

function mapStatusTone(status) {
  const upper = (status || '').toUpperCase();
  if (upper === 'NEW') return 'info';
  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'APPROVED' || upper === 'CONFIRMED' || upper === 'CONFIRM') return 'success';
  if (upper === 'IN_PROGRESS' || upper === 'PROCESSING') return 'info';
  if (upper === 'COMPLETED' || upper === 'DONE') return 'success';
  if (upper === 'CANCELLED' || upper === 'CANCELED' || upper === 'REJECTED' || upper === 'DECLINED') return 'danger';
  return 'info';
}

function mapBooking(apiData) {
  if (!apiData) return null;

  const items = Array.isArray(apiData.items) ? apiData.items : [];
  const services = items.map((s) => s?.itemName || s?.itemType).filter(Boolean);

  const status = apiData.status || 'NEW';
  const statusTone = mapStatusTone(status);

  return {
    id: apiData.bookingId?.toString() || '',
    name: apiData.customer?.fullName || '',
    phone: apiData.customer?.phone || '',
    customerType: apiData.isGuest ? 'Khách vãng lai' : 'Khách có tài khoản',
    history: apiData.customer?.firstBookingAt ? 'Đã có lịch sử' : 'Chưa có lịch sử',
    services,
    servicesDisplay: services.length ? services.join(', ') : apiData.serviceCategory || 'Không có dịch vụ',
    status,
    statusTone,
    scheduledDate: apiData.scheduledDate || '',
    scheduledTime: formatTimeHHmm(apiData.scheduledTime),
    note: apiData.description || '',
    slotData: {},
  };
}

export default function ConfirmedBookingDetail() {
  useScrollToTop();

  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = async (token, bookingId) => {
    try {
      setIsLoading(true);
      const response = await fetchManagedBookingDetail(bookingId, token);
      const mapped = mapBooking(response?.data);
      setBooking(mapped);
      setError('');
    } catch (err) {
      const msg = err?.message || 'Không thể tải chi tiết booking.';
      const isUnauthorized = err?.status === 401 || err?.status === 403 || msg.toLowerCase().includes('token');

      if (isUnauthorized) {
        localStorage.removeItem('authToken');
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError(msg);
      }
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!id) {
      setError('Không tìm thấy mã booking.');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Vui lòng đăng nhập để xem chi tiết booking.');
      setIsLoading(false);
      return;
    }

    loadDetail(token, id);
  }, [id]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/booking-management')}>
          ← Quay lại
        </button>
        <div className={styles.headerTitle}>Chi tiết booking</div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {isLoading && <div className={styles.loadingBox}>Đang tải chi tiết booking...</div>}

      {!isLoading && !booking && !error && (
        <div className={styles.emptyBox}>Không tìm thấy dữ liệu booking.</div>
      )}

      {!isLoading && booking && (
        <div className={styles.layout}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.label}>Mã booking</div>
                <div className={styles.requestId}>{booking.id || '-'}</div>
              </div>
              <span className={`${styles.statusPill} ${styles['statusPill--' + booking.statusTone]}`}>
                {getBookingStatusTextVi(booking.status)}
              </span>
            </div>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Thông tin khách hàng</h3>
              <div className={styles.infoGrid}>
                <InfoRow label="Họ và tên" value={booking.name || '-'} link />
                <InfoRow
                  label="Số điện thoại"
                  value={booking.phone || '-'}
                  link
                  type="tel"
                  extraAction={
                    booking.phone ? (
                      <a className={styles.callButton} href={`tel:${booking.phone}`}>
                        Gọi ngay
                      </a>
                    ) : null
                  }
                />
                <InfoRow label="Loại khách hàng" value={booking.customerType || '-'} />
                <InfoRow label="Lịch sử" value={booking.history || '-'} link />
                <InfoRow label="Dịch vụ đã chọn" value={booking.servicesDisplay} full />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Lịch hẹn</h3>
              <div className={styles.scheduleRow}>
                <div className={styles.scheduleBox}>
                  <div className={styles.label}>Ngày hẹn</div>
                  <div className={styles.value}>{booking.scheduledDate || '-'}</div>
                </div>
                <div className={styles.scheduleBox}>
                  <div className={styles.label}>Khung giờ</div>
                  <div className={styles.timePill}>{booking.scheduledTime || '-'}</div>
                </div>
              </div>

              <div className={styles.noteBlock}>
                <div className={styles.label}>Ghi chú</div>
                <div className={styles.noteBox}>{booking.note || 'Không có ghi chú'}</div>
              </div>
            </section>
          </div>

          <SchedulePanel
            dateLabel={booking.scheduledDate}
            pickedTime={booking.scheduledTime}
            slotData={booking.slotData}
            subtitlePrefix="Khung giờ hẹn:"
          />
        </div>
      )}
    </div>
  );
}
