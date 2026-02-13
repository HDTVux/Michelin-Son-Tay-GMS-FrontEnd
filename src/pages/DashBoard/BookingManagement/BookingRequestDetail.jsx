import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './BookingRequestDetail.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from './SchedulePanel.jsx';
import ConfirmContact from './ConfirmContact.jsx';
import ConfirmBooking from './ConfirmBooking.jsx';
import DeclineBooking from './DeclineBooking.jsx';
import { Link } from 'react-router-dom';
import MarkSpam from './MarkSpam.jsx';

const sampleRequests = [
  {
    id: 'DB-202310-26-001',
    name: 'Nguyễn Văn A',
    phone: '0912345678',
    email: 'vana@example.com',
    customerType: 'Có tài khoản',
    account: 'Tài khoản thành viên',
    history: 'Đã dùng dịch vụ',
    services: ['Làm lốp', 'Vệ sinh phanh'],
    status: 'Chờ xác nhận',
    statusTone: 'warning',
    desiredDate: '26/10/2024',
    desiredTime: '09:30',
    note: 'Khách muốn xong trước 10h',
    slotData: {
      '08:30': { customers: ['Khách khác'], current: 1, capacity: 3 },
      '09:00': { customers: ['Khách khác'], current: 1, capacity: 3 },
      '09:30': { customers: ['Nguyễn Văn A'], current: 1, capacity: 3 },
      '10:00': { customers: ['Khách lẻ'], current: 1, capacity: 3 },
      '10:30': { customers: [], current: 0, capacity: 3 },
      '11:00': { customers: ['Lê Văn C'], current: 1, capacity: 3 },
    },
  },
  {
    id: 'DB-202310-26-002',
    name: 'Trần Thị B',
    phone: '0912345679',
    email: 'thib@example.com',
    customerType: 'Vãng lai',
    account: 'Khách vãng lai',
    history: 'Chưa có lịch sử',
    services: ['Vá xăm'],
    status: 'Đã liên hệ',
    statusTone: 'info',
    desiredDate: '26/10/2024',
    desiredTime: '10:00',
    note: '',
    slotData: {
      '09:00': { customers: ['Khách khác'], current: 1, capacity: 3 },
      '09:30': { customers: ['Nguyễn Văn A'], current: 1, capacity: 3 },
      '10:00': { customers: ['Trần Thị B'], current: 1, capacity: 3 },
      '10:30': { customers: [], current: 0, capacity: 3 },
      '11:00': { customers: ['Lê Văn C'], current: 1, capacity: 3 },
    },
  },
  {
    id: 'DB-202310-26-003',
    name: 'Lê Văn C',
    phone: '0912345681',
    email: 'levanc@example.com',
    customerType: 'Có tài khoản',
    account: 'Thành viên bạc',
    history: '2 lần đặt gần đây',
    services: ['Thay lốp'],
    status: 'Hủy lịch',
    statusTone: 'danger',
    desiredDate: '26/10/2024',
    desiredTime: '11:00',
    note: 'Đổi lịch do bận công việc',
    slotData: {
      '09:30': { customers: ['Nguyễn Văn A'], current: 1, capacity: 3 },
      '10:00': { customers: ['Trần Thị B'], current: 1, capacity: 3 },
      '10:30': { customers: [], current: 0, capacity: 3 },
      '11:00': { customers: ['Lê Văn C'], current: 1, capacity: 3 },
      '11:30': { customers: [], current: 0, capacity: 3 },
    },
  },
];


export default function BookingRequestDetail() {
  //Đảm bảo khi vào trang luôn hiển thị từ đầu trang
  useScrollToTop();

  const navigate = useNavigate();
  const { id } = useParams(); // Lấy id yêu cầu từ URL để truy vấn dữ liệu

  //Tách biệt các hành động để tránh nhầm lẫn và yêu cầu xác nhận trước khi thay đổi dữ liệu quan trọng.
  const [openContact, setOpenContact] = useState(false); // Modal đánh dấu đã liên hệ
  const [openConfirm, setOpenConfirm] = useState(false); // Modal duyệt yêu cầu
  const [openDecline, setOpenDecline] = useState(false); // Modal hủy lịch
  const [openSpam, setOpenSpam] = useState(false);       // Modal đánh dấu spam

  /**
   * useMemo: Tìm kiếm thông tin booking từ danh sách mẫu dựa trên ID.
   * Tối ưu hiệu năng, chỉ tính toán lại khi id thay đổi. 
   */
  const booking = useMemo(() => {
    return sampleRequests.find((b) => b.id === id) || sampleRequests[0];
  }, [id]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/booking-management')}>
          ← Quay lại
        </button>
        <div className={styles.headerTitle}>Chi tiết yêu cầu</div>
      </div>

      <div className={styles.layout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.label}>Mã yêu cầu</div>
              <div className={styles.requestId}>{booking.id}</div>
            </div>
            <span className={`${styles.statusPill} ${styles['statusPill--' + booking.statusTone]}`}>
              {booking.status}
            </span>
          </div>

          {/* SECTION: Thông tin khách hàng */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin khách hàng</h3>
            <div className={styles.infoGrid}>
              <InfoRow label="Họ và tên" value={booking.name} link />
              {/* InfoRow với extraAction: Cho phép nhân viên nhấn gọi điện trực tiếp trên di động */}
              <InfoRow 
                label="Số điện thoại" 
                value={booking.phone} 
                link 
                type="tel" 
                extraAction={<a className={styles.callButton} href={`tel:${booking.phone}`}>Gọi ngay</a>} 
              />
              <InfoRow label="Loại khách hàng" value={booking.customerType} />
              <InfoRow label="Lịch sử" value={booking.history} link />
              <InfoRow label="Dịch vụ đã chọn" value={booking.services.join(', ')} full />
            </div>
          </section>

 
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Lịch mong muốn</h3>
            <div className={styles.scheduleRow}>
              <div className={styles.scheduleBox}>
                <div className={styles.label}>Ngày mong muốn</div>
                <div className={styles.value}>{booking.desiredDate}</div>
              </div>
              <div className={styles.scheduleBox}>
                <div className={styles.label}>Khung giờ</div>
                <div className={styles.timePill}>{booking.desiredTime}</div>
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

      

      <ConfirmContact
        open={openContact}
        onClose={() => setOpenContact(false)}
        onConfirm={(note) => {
          console.log('Đã lưu ghi chú liên hệ:', note);
          setOpenContact(false);
        }}
      />

      <ConfirmBooking
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        request={{
          code: booking.id,
          customerName: booking.name,
          bookingTime: `${booking.desiredDate} ${booking.desiredTime}`,
          service: booking.services.join(', '),
        }}
        onConfirm={(payload) => {
          console.log('Dữ liệu duyệt lịch:', payload);
          setOpenConfirm(false);
        }}
      />

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