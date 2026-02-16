import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './BookingRequestDetail.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from './SchedulePanel.jsx';
import ConfirmContact from './ConfirmContact.jsx';
import ConfirmBooking from './ConfirmBooking.jsx';
import DeclineBooking from './DeclineBooking.jsx';
import { Link } from 'react-router-dom';
import MarkSpam from './MarkSpam.jsx';
import { confirmBookingRequest, fetchBookingRequestDetail } from '../../../services/bookingService.js';
import { formatTimeHHmm } from '../../../components/timeUtils.js';

/**
 * Hiển thị một dòng thông tin gồm nhãn (label) và giá trị (value).
 * Tái sử dụng code, giúp giao diện đồng nhất và dễ quản lý link (tel, mail).
 */
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
        {extraAction} {/* Hiển thị thêm các nút như "Gọi ngay" nếu cần */}
      </div>
    </div>
  );
}

function mapBooking(apiData) {
  if (!apiData) return null;

  const services = Array.isArray(apiData.services)
    ? apiData.services.map((s) => s?.itemName || s?.itemType).filter(Boolean)
    : [];

  const status = apiData.status || 'PENDING';
  const statusTone = mapStatusTone(status);

  return {
    id: apiData.requestId?.toString() || '',
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
    note: apiData.description || apiData.rejectionReason || '',
    slotData: {}, // Chưa có dữ liệu slot từ API, giữ trống để tránh lỗi
  };
}

function mapStatusTone(status) {
  const upper = (status || '').toUpperCase();
  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'APPROVED' ||  upper === 'CONFIRMED') return 'success';
  if (upper === 'CANCELLED' || upper === 'REJECTED') return 'danger';
  return 'info';
}
export default function BookingRequestDetail() {
  //Đảm bảo khi vào trang luôn hiển thị từ đầu trang
  useScrollToTop();

  const navigate = useNavigate();
  const { id } = useParams(); // Lấy id yêu cầu từ URL để truy vấn dữ liệu

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  //Tách biệt các hành động để tránh nhầm lẫn và yêu cầu xác nhận trước khi thay đổi dữ liệu quan trọng.
  const [openContact, setOpenContact] = useState(false); // Modal đánh dấu đã liên hệ
  const [openConfirm, setOpenConfirm] = useState(false); // Modal duyệt yêu cầu
  const [openDecline, setOpenDecline] = useState(false); // Modal hủy lịch
  const [openSpam, setOpenSpam] = useState(false);       // Modal đánh dấu spam

  const loadDetail = async (token, requestId) => {
    try {
      setIsLoading(true);
      const response = await fetchBookingRequestDetail(requestId, token);
      const mapped = mapBooking(response?.data);
      setBooking(mapped);
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
      await confirmBookingRequest(booking.id, token);
      await loadDetail(token, booking.id);
      setOpenConfirm(false);
    } catch (err) {
      const msg = err?.message || 'Duyệt yêu cầu thất bại.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!id) {
      setError('Không tìm thấy mã yêu cầu.');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Vui lòng đăng nhập để xem chi tiết yêu cầu.');
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
                <div className={styles.requestId}>{booking.id || '-'}</div>
              </div>
              <span className={`${styles.statusPill} ${styles['statusPill--' + booking.statusTone]}`}>
                {booking.status}
              </span>
            </div>

            {/* SECTION: Thông tin khách hàng */}
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
                <InfoRow label="Loại khách hàng" value={booking.customerType || '-'} />
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
              <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setOpenDecline(true)}>Hủy lịch</button>
              <Link className={`${styles.actionBtn} ${styles.purple}`} to={`/booking-management/${booking.id}/edit`}>Chỉnh sửa</Link>
              <button className={`${styles.actionBtn} ${styles.warning}`} onClick={() => setOpenSpam(true)}>Đánh dấu spam</button>
              <button className={`${styles.actionBtn} ${styles.info}`} onClick={() => setOpenContact(true)}>Đánh dấu đã liên hệ</button>
              <button className={`${styles.actionBtn} ${styles.success}`} onClick={() => setOpenConfirm(true)}>Duyệt yêu cầu</button>
            </div>
          </div>

          <SchedulePanel
            dateLabel={booking.desiredDate}
            pickedTime={booking.desiredTime}
            slotData={booking.slotData}
          />
        </div>
      )}

      

      <ConfirmContact
        open={openContact}
        onClose={() => setOpenContact(false)}
        onConfirm={(note) => {
          console.log('Đã lưu ghi chú liên hệ:', note);
          setOpenContact(false);
        }}
      />

      {booking && (
        <ConfirmBooking
          open={openConfirm}
          onClose={() => setOpenConfirm(false)}
          request={{
            code: booking.id,
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
        onConfirm={(data) => {
          console.log('Lý do hủy:', data);
          setOpenDecline(false);
        }}
      />


      <MarkSpam
        open={openSpam}
        onClose={() => setOpenSpam(false)}
        onConfirm={(data) => {
          console.log('Đã đánh dấu spam:', data);
          setOpenSpam(false);
        }}
      />
    </div>
  );
}