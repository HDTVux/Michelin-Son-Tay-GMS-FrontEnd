import { useNavigate } from 'react-router-dom';
import styles from './BookingManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';

const pendingBookings = [
    {
        id: 'DB-202310-26-001',
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        service: 'Làm lốp',
        status: 'Chờ xác nhận',
        statusTone: 'warning',
        time: '2024-10-26 09:30',
    },
    {
        id: 'DB-202310-26-002',
        name: 'Trần Thị B',
        phone: '0912345679',
        service: 'Vá xăm',
        status: 'Đã liên hệ',
        statusTone: 'info',
        time: '2024-10-26 10:00',
    },
    {
        id: 'DB-202310-26-003',
        name: 'Lê Văn C',
        phone: '0912345681',
        service: 'Thay lốp',
        status: 'Hủy lịch',
        statusTone: 'danger',
        time: '2024-10-26 11:00',
    },
];

export default function BookingManagement() {
    useScrollToTop(); // Tự động scroll lên đầu trang khi vào
    const navigate = useNavigate();

    return (
        <div className={styles['booking-page']}>
            <div className={styles['booking-layout']}>
                <div className={styles['booking-left']}>
                    <PendingPanel
                        title="Yêu cầu chưa duyệt"
                        icon={<HourglassIcon />}
                        tone="warning"
                        data={pendingBookings}
                        onViewDetail={(id) => navigate(`/booking-management/${id}`)}
                        actionLabel={`${pendingBookings.length} yêu cầu`}
                    />
                </div>

            </div>


        </div>
    );
}

function PendingPanel({ title, icon, tone, data, actionLabel, onViewDetail }) {
    const toneClass = styles['booking-card--' + tone];
    return (
        <section className={`${styles['booking-card']} ${toneClass}`}>
            <div className={styles['booking-card__header']}>
                <div className={styles['booking-card__title']}>{icon} {title}</div>
                <button className={styles['ghost-button']}>{actionLabel}</button>
            </div>

            <div className={styles['pending-filters']}>
                <div className={styles['filter-card__labels']}>
                    <label>Loại khách hàng</label>
                    <label>Thời gian gửi yêu cầu</label>
                    <label>Trạng thái</label>
                </div>
                <div className={styles['filter-card__controls']}>
                    <select>
                        <option>Tất cả</option>
                        <option>Vãng Lai</option>
                        <option>có tài khoản</option>
                    </select>
                    <select>
                        <option>Hôm nay</option>
                        <option>Hôm qua</option>
                        <option>Tuần này</option>
                        <option>Tuần trước</option>
                        <option>Tháng này</option>
                        <option>Tháng trước</option>
                    </select>
                    <select>
                        <option>Tất cả</option>
                        <option>chờ/xác nhận</option>
                        <option>đã liên hệ</option>
                        <option>hủy lịch</option>
                        <option>spam</option>
                    </select>
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
                            <th>MÃ YÊU CẦU</th>
                            <th>TÊN KHÁCH HÀNG</th>
                            <th>SỐ ĐIỆN THOẠI</th>
                            <th>DỊCH VỤ</th>
                            <th>TRẠNG THÁI</th>
                            <th>THỜI GIAN GỬI YÊU CẦU</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td className={styles['link-cell']}>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.phone}</td>
                                <td>{item.service}</td>
                                <td>
                                    <span className={`${styles['status-badge']} ${styles['status-badge--' + (item.statusTone || 'success')]}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>{item.time}</td>
                                <td>
                                    <button
                                        className={styles['primary-button']}
                                        onClick={() => onViewDetail?.(item.id)}
                                    >
                                        Xem chi tiết
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={styles['booking-card__footer']}>
                <div className={styles['page-size']}>
                    <span>Hiển thị:</span>
                    <select>
                        <option>10</option>
                        <option>20</option>
                    </select>
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
function HourglassIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <path d="M7 3h10v4l-3 3 3 3v8H7v-8l3-3-3-3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m15.5 15.5 3 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}
