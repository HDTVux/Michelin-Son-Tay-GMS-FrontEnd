import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './BookingRequestDetail.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from './SchedulePanel.jsx';
import ConfirmContact from './ConfirmContact.jsx';
import ConfirmBooking from './ConfirmBooking.jsx';
import DeclineBooking from './DeclineBooking.jsx';
import MarkSpam from './MarkSpam.jsx';
import { toast } from 'react-toastify';
import {
  cancelBookingRequest,
  confirmBookingRequest,
  contactedBookingRequest,
  fetchBookingRequestDetail,
  fetchManagedBookingsPaged,
  spamBookingRequest,
} from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, normalizeStatusCode } from '../../../components/statusUtils.js';

const DEFAULT_SLOT_CAPACITY = 6;

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

  const code = item?.bookingCode || item?.booking_code || item?.code;
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
  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'APPROVED' || upper === 'CONFIRM' || upper === 'CONFIRMED') return 'success';
  if (upper === 'REJECTED' || upper === 'CANCEL' || upper === 'CANCELLED' || upper === 'CANCELED' || upper === 'SPAM') return 'danger';
  return 'info';
}

function mapBooking(apiData) {
  if (!apiData) return null;

  const services = Array.isArray(apiData.services)
    ? apiData.services.map((s) => s?.itemName || s?.itemType).filter(Boolean)
    : [];

  const rawStatus = apiData.status || 'PENDING';
  const status = normalizeStatusCode(rawStatus) || 'PENDING';
  const statusTone = mapStatusTone(status);

  return {
    id: apiData.requestId?.toString() || '',
    code: apiData.requestCode?.toString() || '',
    name: apiData.fullName || apiData.customer?.fullName || '',
    phone: apiData.phone || apiData.customer?.phone || '',
    email: apiData.customer?.email || '',
    customerType: apiData.isGuest ? 'Khách vãng lai' : 'Khách có tài khoản',
    history: apiData.customer?.firstBookingAt ? 'Đã có lịch sử' : 'Chưa có lịch sử',
    services,
    servicesDisplay: services.length ? services.join(', ') : (apiData.serviceCategory || 'Không có dịch vụ'),
    status,
    statusTone,
    desiredDate: apiData.scheduledDate || '',
    desiredTime: formatTimeHHmm(apiData.scheduledTime),
    note: apiData.note || apiData.description || apiData.rejectionReason || '',
    slotData: {},
  };
}

export default function BookingRequestDetail() {
  useScrollToTop();

  const navigate = useNavigate();
  const params = useParams();
  const requestCode = params?.requestCode ?? params?.id;

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const notify = (message) => toast(message, { containerId: 'app-toast' });

  const statusUpper = useMemo(() => String(booking?.status || '').toUpperCase(), [booking?.status]);

  const isSpam = useMemo(() => statusUpper === 'SPAM', [statusUpper]);

  const isCancelled = useMemo(() => {
    return ['REJECTED', 'CANCEL', 'CANCELLED', 'CANCELED'].includes(statusUpper);
  }, [statusUpper]);

  const isConfirmed = useMemo(() => {
    return ['CONFIRM', 'CONFIRMED', 'APPROVED'].includes(statusUpper);
  }, [statusUpper]);

  const isContacted = useMemo(() => {
    return statusUpper === 'CONTACTED';
  }, [statusUpper]);

  const canConfirm = useMemo(() => {
    return !['CONFIRM', 'CONFIRMED', 'APPROVED'].includes(statusUpper);
  }, [statusUpper]);

  const [openContact, setOpenContact] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openDecline, setOpenDecline] = useState(false);
  const [openSpam, setOpenSpam] = useState(false);

  const loadDetail = async (token, code) => {
    try {
      setIsLoading(true);
      const response = await fetchBookingRequestDetail(code, token);
      const payload = response?.data?.data ?? response?.data;
      const mapped = mapBooking(payload);

      let slotData = {};
      const dateISO = mapped?.desiredDate;
      if (dateISO) {
        try {
          const dayBookings = await fetchManagedBookingsByDate(dateISO, token);
          slotData = buildSlotDataFromManagedBookings(dayBookings, DEFAULT_SLOT_CAPACITY);
        } catch {
          slotData = {};
        }
      }

      setBooking(mapped ? { ...mapped, code: mapped.code || String(code || ''), slotData } : null);
      setError('');
    } catch (err) {
      const msg = err?.message || 'Không thể tải chi tiết yêu cầu.';
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

  const handleConfirmBooking = async () => {
    if (!booking?.id) return;
    const token = localStorage.getItem('authToken');

    if (!token) {
      setError('Vui lòng đăng nhập để duyệt yêu cầu.');
      return;
    }

    try {
      setIsSubmitting(true);
      await confirmBookingRequest(requestCode, token);
      await loadDetail(token, requestCode);
      setOpenConfirm(false);
    } catch (err) {
      setError(err?.message || 'Duyệt yêu cầu thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async ({ reason, detail }) => {
    if (!booking?.id) return;
    const token = localStorage.getItem('authToken');

    if (!token) {
      setError('Vui lòng đăng nhập để hủy yêu cầu.');
      return;
    }

    const payload = {
      reason: String(reason || '').trim(),
      note: String(detail || '').trim(),
    };

    if (!payload.reason) return;

    try {
      setIsSubmitting(true);
      setError('');
      const res = await cancelBookingRequest(requestCode, payload, token);
      notify(res?.message || res?.data?.message || 'Hủy yêu cầu thành công.');
      setOpenDecline(false);
      await loadDetail(token, requestCode);
    } catch (err) {
      setError(err?.message || 'Hủy yêu cầu thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpamRequest = async ({ reason, detail }) => {
    if (!booking?.id || isSubmitting) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Vui lòng đăng nhập để đánh dấu spam.');
      return;
    }

    const payload = {
      reason: String(reason || '').trim(),
      note: String(detail || '').trim(),
    };

    if (!payload.reason) return;

    try {
      setIsSubmitting(true);
      setError('');
      const res = await spamBookingRequest(requestCode, payload, token);
      notify(res?.message || res?.data?.message || 'Đã đánh dấu spam.');
      setOpenSpam(false);
      await loadDetail(token, requestCode);
    } catch (err) {
      setError(err?.message || 'Đánh dấu spam thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactedRequest = async (note) => {
    if (!booking?.id || isSubmitting) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Vui lòng đăng nhập để đánh dấu đã liên hệ.');
      return;
    }

    const payload = {
      reason: 'Đã liên hệ',
      note: String(note || '').trim(),
    };

    try {
      setIsSubmitting(true);
      setError('');
      const res = await contactedBookingRequest(requestCode, payload, token);
      notify(res?.message || res?.data?.message || 'Đã đánh dấu đã liên hệ.');
      setOpenContact(false);
      await loadDetail(token, requestCode);
    } catch (err) {
      setError(err?.message || 'Đánh dấu đã liên hệ thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!requestCode) {
      setError('Không tìm thấy mã yêu cầu (requestCode).');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Vui lòng đăng nhập để xem chi tiết yêu cầu.');
      setIsLoading(false);
      return;
    }

    loadDetail(token, requestCode);
  }, [requestCode]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/booking-request-management')}>
          ← Quay lại
        </button>
        <div className={styles.headerTitle}>Chi tiết yêu cầu</div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {isLoading && <div className={styles.loadingBox}>Đang tải chi tiết yêu cầu...</div>}

      {!isLoading && !booking && !error && (
        <div className={styles.emptyBox}>Không tìm thấy dữ liệu yêu cầu.</div>
      )}

      {!isLoading && booking && (
        <div className={styles.layout}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.label}>Mã yêu cầu</div>
                <div className={styles.requestId}>{booking.code || '-'}</div>
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
                  extraAction={booking.phone ? <a className={styles.callButton} href={`tel:${booking.phone}`}>Gọi ngay</a> : null}
                />

                <InfoRow label="Email" value={booking.email || '-'} link type="mailto" />
                <InfoRow label="Lịch sử" value={booking.history || '-'} link />
                <InfoRow label="Dịch vụ đã chọn" value={booking.servicesDisplay} full />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Lịch mong muốn</h3>
              <div className={styles.scheduleRow}>
                <div className={styles.scheduleBox}>
                  <div className={styles.label}>Ngày mong muốn</div>
                  <div className={styles.value}>{booking.desiredDate || '-'}</div>
                </div>
                <div className={styles.scheduleBox}>
                  <div className={styles.label}>Khung giờ</div>
                  <div className={styles.timePill}>{booking.desiredTime || '-'}</div>
                </div>
              </div>

              <div className={styles.noteBlock}>
                <div className={styles.label}>Yêu cầu thêm</div>
                <div className={styles.noteBox}>{booking.note || 'Không có yêu cầu thêm'}</div>
              </div>
            </section>

            <div className={styles.actionsRow}>
              {!isSpam && isCancelled && (
                <button className={`${styles.actionBtn} ${styles.warning}`} onClick={() => setOpenSpam(true)}>
                  Đánh dấu spam
                </button>
              )}


              {!isSpam && !isCancelled && !isConfirmed && (
                <>
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => setOpenDecline(true)}
                    disabled={isSubmitting}
                  >
                    Hủy lịch
                  </button>
                  {canConfirm && (
                    <Link
                      className={`${styles.actionBtn} ${styles.purple}`}
                      to={`/booking-request-management/${encodeURIComponent(String(requestCode))}/edit`}
                    >
                      Chỉnh sửa
                    </Link>
                  )}
                  <button className={`${styles.actionBtn} ${styles.warning}`} onClick={() => setOpenSpam(true)}>
                    Đánh dấu spam
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.info}`}
                    onClick={() => setOpenContact(true)}
                    disabled={isSubmitting || isContacted}
                  >
                    {isContacted ? 'Đã liên hệ' : 'Đánh dấu đã liên hệ'}
                  </button>
                  {canConfirm && (
                    <button
                      className={`${styles.actionBtn} ${styles.success}`}
                      onClick={() => setOpenConfirm(true)}
                      disabled={isSubmitting}
                    >
                      Duyệt yêu cầu
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <SchedulePanel
            dateLabel={booking.desiredDate}
            pickedTime={booking.desiredTime}
            slotData={booking.slotData}
            onBookingClick={(b) => {
              const targetId = b?.bookingCode ?? b?.bookingId;
              if (!targetId) return;
              navigate(`/booking-management/${encodeURIComponent(String(targetId))}`);
            }}
          />
        </div>
      )}

      <ConfirmContact
        key={`${booking?.id || 'req'}:${openContact ? 'open' : 'closed'}`}
        open={openContact}
        onClose={() => setOpenContact(false)}
        onConfirm={handleContactedRequest}
      />

      {booking && (
        <ConfirmBooking
          open={openConfirm}
          onClose={() => setOpenConfirm(false)}
          request={{
            code: booking.code,
            customerName: booking.name,
            bookingTime: `${booking.desiredDate || ''} ${booking.desiredTime || ''}`.trim(),
            service: (booking.services || []).join(', '),
          }}
          onConfirm={handleConfirmBooking}
        />
      )}

      <DeclineBooking
        open={openDecline}
        onClose={() => setOpenDecline(false)}
        onConfirm={handleCancelRequest}
      />

      <MarkSpam
        open={openSpam}
        onClose={() => setOpenSpam(false)}
        onConfirm={handleSpamRequest}
      />
    </div>
  );
}
