import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from '../BookingRequestManagement/BookingRequestDetail.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from '../BookingRequestManagement/SchedulePanel.jsx';
import { fetchManagedBookingDetail, fetchManagedBookingsPaged } from '../../../services/bookingService.js';
import { formatDateTimeVi, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, normalizeStatusCode } from '../../../components/statusUtils.js';
import { fetchServiceTicketBookingHistoryByCustomerId } from '../../../services/serviceTicketService.js';

const DEFAULT_SLOT_CAPACITY = 6;

const isConfirmed = (status) => String(status || '').trim().toUpperCase() === 'CONFIRMED';

const queueOrderKey = (item) => {
  const n = Number(item?.queueOrder);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

function getBookingBadgeLabel(item) {
  const plate =
    item?.licensePlate ||
    item?.plateNumber ||
    item?.vehiclePlate ||
    item?.vehicleNumber ||
    item?.carPlate ||
    item?.vehicleLicensePlate;
  if (plate) return String(plate);

  const name = item?.customerName || item?.fullName || item?.customer?.fullName || item?.name;
  if (name) return String(name);

  const code = item?.bookingCode || item?.code;
  if (code) return String(code);

  const id = item?.bookingId || item?.id;
  return id == null ? 'Khách' : `#${id}`;
}

async function fetchManagedBookingsByDate(dateISO, token) {
  const safeDate = String(dateISO || '').trim();
  if (!safeDate) return [];

  const size = 200;
  const maxPages = 10;
  const collected = [];

  for (let page = 0; page < maxPages; page++) {
    const res = await fetchManagedBookingsPaged({ page, size, date: safeDate }, token);
    const pageData = res?.data;
    const content = Array.isArray(pageData?.content) ? pageData.content : [];
    collected.push(...content);

    const totalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
    if (page >= totalPages - 1) break;
    if (content.length === 0) break;
  }

  return collected;
}

function buildSlotDataFromManagedBookings(bookings, capacity = DEFAULT_SLOT_CAPACITY) {
  const list = Array.isArray(bookings) ? bookings : [];
  const byTime = new Map();

  for (const item of list) {
    if (!isConfirmed(item?.status)) continue;
    const timeKey = formatTimeHHmm(item?.scheduledTime);
    if (!timeKey) continue;
    const entry = byTime.get(timeKey) || [];
    entry.push(item);
    byTime.set(timeKey, entry);
  }

  const result = {};
  for (const [timeKey, items] of byTime.entries()) {
    const sorted = [...items].sort((a, b) => {
      const byOrder = queueOrderKey(a) - queueOrderKey(b);
      if (byOrder !== 0) return byOrder;
      return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
    });

    const bookingsView = sorted.map((item) => ({
      bookingId: item?.bookingId ?? item?.id,
      bookingCode: item?.bookingCode ?? item?.booking_code ?? item?.code,
      queueOrder: item?.queueOrder,
      createdAt: item?.createdAt,
      status: item?.status,
      label: getBookingBadgeLabel(item),
    }));

    result[timeKey] = {
      bookings: bookingsView,
      customers: bookingsView.map((b) => b.label).filter(Boolean),
      current: bookingsView.length,
      capacity,
    };
  }

  return result;
}

function InfoRow({ label, value, link, type, extraAction, full }) {
  const safeValue = value == null ? '' : String(value);
  const href = (() => {
    if (!link) return '';
    if (type === 'tel' && safeValue) return `tel:${safeValue}`;
    if (type === 'mailto' && safeValue) return `mailto:${safeValue}`;
    return '';
  })();

  let rendered;
  if (href) rendered = <a className={styles.link} href={href}>{safeValue}</a>;
  else if (link) rendered = <span className={styles.link}>{safeValue}</span>;
  else rendered = <span className={styles.value}>{safeValue}</span>;

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

InfoRow.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  link: PropTypes.bool,
  type: PropTypes.string,
  extraAction: PropTypes.node,
  full: PropTypes.bool,
};

function mapStatusTone(status) {
  const upper = (status || '').toUpperCase();
  if (upper === 'NEW') return 'info';
  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'APPROVED' || upper === 'CONFIRMED' || upper === 'CONFIRM') return 'success';
  if (upper === 'IN_PROGRESS' || upper === 'PROCESSING') return 'info';
  if (upper === 'COMPLETED' || upper === 'DONE') return 'success';
  if (upper === 'CANCEL' || upper === 'CANCELLED' || upper === 'CANCELED') return 'danger';
  return 'info';
}

function mapBooking(apiData) {
  if (!apiData) return null;

  const customer = apiData.customer || apiData.customerInfo || apiData.customerProfile || {};
  const customerIdRaw = customer?.customerId ?? customer?.id ?? apiData.customerId ?? apiData.customer_id;
  const customerIdNum = typeof customerIdRaw === 'number' ? customerIdRaw : Number(customerIdRaw);
  const customerId = Number.isFinite(customerIdNum) && customerIdNum > 0 ? customerIdNum : null;
  const customerName = customer?.fullName || apiData.fullName || apiData.customerName || apiData.name || '';
  const customerPhone = customer?.phone || apiData.phone || apiData.customerPhone || '';
  const firstBookingAt = customer?.firstBookingAt || apiData.firstBookingAt || apiData.customerFirstBookingAt;

  const items = Array.isArray(apiData.items) ? apiData.items : [];
  const services = items.map((s) => s?.itemName || s?.itemType).filter(Boolean);

  const rawStatus = apiData.status || 'NEW';
  const status = normalizeStatusCode(rawStatus) || 'NEW';
  const statusTone = mapStatusTone(status);

  return {
    bookingId: apiData.bookingId?.toString() || '',
    customerId,
    name: customerName,
    phone: customerPhone,
    customerType: apiData.isGuest ? 'Khách vãng lai' : 'Khách có tài khoản',
    history: firstBookingAt ? 'Đã có lịch sử' : 'Chưa có lịch sử',
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
  const location = useLocation();
  const params = useParams();
  const bookingCode = params?.bookingCode ?? params?.id;

  const fallbackCustomerName = location?.state?.customerName;
  const fallbackCustomerPhone = location?.state?.customerPhone;

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [repairHistory, setRepairHistory] = useState([]);
  const [repairHistoryLoading, setRepairHistoryLoading] = useState(false);
  const [repairHistoryError, setRepairHistoryError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!bookingCode) {
      setError('Không tìm thấy mã booking.');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Vui lòng đăng nhập để xem chi tiết booking.');
      setIsLoading(false);
      return;
    }

    const loadDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetchManagedBookingDetail(bookingCode, token);
        const payload = response?.data?.data ?? response?.data;
        const mapped = mapBooking(payload);

        let slotData = {};
        const dateISO = mapped?.scheduledDate;
        if (dateISO) {
          try {
            const dayBookings = await fetchManagedBookingsByDate(dateISO, token);
            slotData = buildSlotDataFromManagedBookings(dayBookings, DEFAULT_SLOT_CAPACITY);
          } catch {
            slotData = {};
          }
        }

        setBooking(
          mapped
            ? {
                ...mapped,
                id: String(bookingCode || ''),
                name: mapped.name || fallbackCustomerName || '',
                phone: mapped.phone || fallbackCustomerPhone || '',
                slotData,
              }
            : null,
        );
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

    loadDetail();
  }, [bookingCode, fallbackCustomerName, fallbackCustomerPhone]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const customerId = booking?.customerId;

    if (!token || !customerId) {
      setRepairHistory([]);
      setRepairHistoryError('');
      setRepairHistoryLoading(false);
      return;
    }

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setRepairHistoryLoading(true);
      setRepairHistoryError('');
    });

    fetchServiceTicketBookingHistoryByCustomerId(customerId, token)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setRepairHistory(list);
      })
      .catch((err) => {
        if (!active) return;
        setRepairHistory([]);
        setRepairHistoryError(err?.message || 'Không thể tải lịch sử sửa chữa.');
      })
      .finally(() => {
        if (active) setRepairHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [booking?.customerId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <div className={styles.headerTitle}>Chi tiết lịch hẹn</div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {isLoading && <div className={styles.loadingBox}>Đang tải chi tiết lịch hẹn...</div>}

      {!isLoading && !booking && !error && (
        <div className={styles.emptyBox}>Không tìm thấy dữ liệu lịch hẹn.</div>
      )}

      {!isLoading && booking && (
        <div className={styles.layout}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.label}>Mã lịch hẹn</div>
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
                <InfoRow label="Dịch vụ đã chọn" value={booking.servicesDisplay} full />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Lịch sử sửa chữa</h3>

              {repairHistoryError ? <div className={styles.errorBanner}>{repairHistoryError}</div> : null}
              {repairHistoryLoading ? <div className={styles.value}>Đang tải lịch sử sửa chữa...</div> : null}

              {!repairHistoryLoading && !repairHistoryError && repairHistory.length === 0 ? (
                <div className={styles.value}>Chưa có lịch sử sửa chữa.</div>
              ) : null}

              {!repairHistoryLoading && !repairHistoryError && repairHistory.length > 0 ? (
                <div className={`${styles.infoGrid} ${styles.historyGrid}`}>
                  {repairHistory.map((t, idx) => (
                    <div
                      key={t?.serviceTicketId ?? t?.ticketCode ?? String(idx)}
                      className={`${styles.infoBox} ${styles.historyBox}`}
                    >
                      <div className={styles.label}>Mã phiếu</div>
                      <div className={styles.value}>{t?.ticketCode || '-'}</div>
                      <div className={styles.label}>Ngày tạo</div>
                      <div className={styles.value}>{formatDateTimeVi(t?.createdAt, '-')}</div>
                    </div>
                  ))}
                </div>
              ) : null}
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
            showPickedTag={false}
            onBookingClick={(b) => {
              const targetId = b?.bookingCode ?? b?.bookingId;
              if (!targetId) return;
              navigate(`/booking-management/${encodeURIComponent(String(targetId))}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
