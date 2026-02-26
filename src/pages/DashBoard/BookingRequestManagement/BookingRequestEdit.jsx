import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './BookingRequestEdit.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import SchedulePanel from './SchedulePanel.jsx';
import { buildAllSlots } from './scheduleUtils.js';

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
    desiredDate: '2024-10-26',
    desiredTime: '09:30',
    note: 'Khách muốn xong trước 10h',
    slotData: {
      '08:30': { customers: ['Khách khác'], current: 1, capacity: 3 },
      '09:00': { customers: ['Khách khác'], current: 2, capacity: 3 },
      '09:30': { customers: ['Nguyễn Văn A', 'Khách khác'], current: 2, capacity: 3 },
      '10:00': { customers: ['Khách lẻ'], current: 1, capacity: 3 },
      '10:30': { customers: [], current: 0, capacity: 3 },
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
    desiredDate: '2024-10-26',
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
    desiredDate: '2024-10-26',
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


export default function BookingRequestEdit() {
  // Đảm bảo trang luôn hiển thị từ đầu khi chuyển hướng tới
  useScrollToTop();
  
  const navigate = useNavigate();
  const { id } = useParams(); 

  /**
   * useMemo: Lấy dữ liệu gốc của yêu cầu.
   * Làm dữ liệu nền (base data) để khởi tạo form. 
   * Tránh việc tính toán lại danh sách mẫu trừ khi ID thay đổi.
   */
  const booking = useMemo(() => {
    return sampleRequests.find((b) => b.id === id) || sampleRequests[0];
  }, [id]);

  /**
   * useState (form): Quản lý trạng thái các ô nhập liệu.
   * Tạo một bản sao dữ liệu để chỉnh sửa độc lập, 
   * chỉ khi nhấn "Lưu" thì dữ liệu mới thực sự được gửi đi.
   */
  const [form, setForm] = useState({
    desiredDate: booking.desiredDate,
    desiredTime: booking.desiredTime,
    services: booking.services.join(', '), 
    note: booking.note || '',
  });

  /**
   * Hàm handleChange: Cập nhật giá trị vào state form.
   * @param {string} key: Tên trường dữ liệu (ví dụ: 'note')
   * @param {any} value: Giá trị mới người dùng nhập vào
   */
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Hàm handleSave: Xử lý lưu dữ liệu.
   * Gom toàn bộ dữ liệu đã sửa để gọi API. 
   * Sau khi lưu thành công sẽ điều hướng người dùng quay lại trang chi tiết.
   */
  const handleSave = () => {
    // TODO: Thực hiện gọi API cập nhật tại đây 
    console.log('Đang lưu thay đổi cho mã:', { id: booking.id, ...form });
    
    // Quay lại trang chi tiết yêu cầu sau khi sửa xong
    navigate(`/booking-management/${booking.id}`);
  };

  /**
   * useMemo (slotDataWithPicked): Xử lý dữ liệu khung giờ (slots).
   * 1. buildAllSlots: Tạo ra danh sách các khung giờ từ 7h sáng đến 20h tối dựa trên cấu hình Garage.
   * 2. Logic .map: Kiểm tra nếu khung giờ nào trùng với giờ đang chọn trong `form.desiredTime`, 
   * nó sẽ chuyển trạng thái sang 'selected' để hiển thị màu sắc khác biệt trên giao diện lịch.
   */
  const slotDataWithPicked = useMemo(() => {
    // Xây dựng tất cả các khung giờ với sức chứa mặc định là 3 xe/giờ
    const built = buildAllSlots({ 
      slotData: booking.slotData || {}, 
      startHour: 7, 
      endHour: 20, 
      defaultCapacity: 3 
    });

    return built.map((slot) => ({
      ...slot,
      // Đánh dấu 'selected' nếu giờ của slot trùng với giờ nhân viên đang chọn trong form
      state: slot.time === form.desiredTime ? 'selected' : slot.state,
    }));
  }, [booking, form.desiredTime]); // Chạy lại khi dữ liệu gốc hoặc giờ được chọn thay đổi

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>← Quay lại</button>
        <div className={styles.headerTitle}>Chỉnh sửa yêu cầu</div>
      </div>

      <div className={styles.layout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.label}>Mã yêu cầu</div>
              <div className={styles.requestId}>{booking.id}</div>
            </div>
            <span className={`${styles.statusPill} ${styles['statusPill--' + booking.statusTone]}`}>{booking.status}</span>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin khách hàng</h3>
            <div className={styles.infoGrid}>
              <InfoRow label="Họ và tên" value={booking.name} link />
              <InfoRow label="Số điện thoại" value={booking.phone} link type="tel" extraAction={<a className={styles.callButton} href={`tel:${booking.phone}`}>Gọi ngay</a>} />
              <InfoRow label="Loại khách hàng" value={booking.customerType} />
              <InfoRow label="Lịch sử" value={booking.history} link />
              <InfoRow label="Dịch vụ đã chọn" value={booking.services.join(', ')} full />
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Điều chỉnh lịch</h3>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="desiredDate">Ngày mong muốn</label>
                <input
                  id="desiredDate"
                  type="date"
                  value={form.desiredDate}
                  onChange={(e) => handleChange('desiredDate', e.target.value)}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="desiredTime">Khung giờ</label>
                <input
                  id="desiredTime"
                  type="time"
                  value={form.desiredTime}
                  onChange={(e) => handleChange('desiredTime', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="services">Dịch vụ</label>
              <input
                id="services"
                type="text"
                value={form.services}
                onChange={(e) => handleChange('services', e.target.value)}
                placeholder="Nhập dịch vụ, phân tách bằng dấu phẩy"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="note">Yêu cầu thêm</label>
              <textarea
                id="note"
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Ghi chú thêm"
                rows={3}
              />
            </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={() => navigate(`/booking-management/${booking.id}`)}>Hủy</button>
          <button className={styles.primaryBtn} onClick={handleSave}>Lưu thay đổi</button>
        </div>
          </section>
        </div>

        <SchedulePanel
          dateLabel={form.desiredDate}
          pickedTime={form.desiredTime}
          slotData={booking.slotData}
          title="Lịch ngày"
          subtitlePrefix="Khung giờ đang chọn:"
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, link, type, extraAction, full }) {
  const rendered = link ? (
    <a className={styles.link} href={type === 'tel' ? `tel:${value}` : type === 'mailto' ? `mailto:${value}` : '#'}>{value}</a>
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
