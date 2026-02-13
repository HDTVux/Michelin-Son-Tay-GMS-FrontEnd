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
        <div className="booking-page">
            <div className="booking-layout">
                <div className="booking-left">
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
        <section className={`booking-card booking-card--${tone}`}>
            <div className="booking-card__header">
                <div className="booking-card__title">{icon} {title}</div>
                <button className="ghost-button">{actionLabel}</button>
            </div>

            <div className="pending-filters">
                <div className="filter-card__controls">
                    <select>
                        <option>Loại khách hàng</option>
                        <option>Tất cả</option>
                        <option>Vãng Lai</option>
                        <option>có tài khoản</option>
                    </select>
                    <select>
                        <option>Thời gian gửi yêu cầu</option>
                        <option>Hôm nay</option>
                        <option>Hôm qua</option>
                        <option>7 ngày qua</option>
                        <option>30 ngày qua</option>
                        <option>Tháng này</option>
                        <option>Tháng trước</option>
                    </select>
                    <select>
                        <option>Trạng thái</option>
                        <option>chờ/xác nhận</option>
                        <option>đã liên hệ</option>
                        <option>hủy lịch</option>
                    </select>
                </div>
                <div className="filter-card__actions">
                    <div className="search-box">
                        <input placeholder="Tìm kiếm..." />
                        <SearchIcon />
                    </div>
                    <button className="ghost-button">Xóa bộ lọc</button>
                </div>
                <p className="filter-card__hint">(tìm kiếm theo cả tên, mã, dịch vụ)</p>
            </div>

            <div className="booking-table__wrapper">
                <table className="booking-table">
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
                                <td className="link-cell">{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.phone}</td>
                                <td>{item.service}</td>
                                <td>
                                    <span className={`status-badge status-badge--${item.statusTone || 'success'}`}>
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

            <div className="booking-card__footer">
                <div className="page-size">
                    <span>Hiển thị:</span>
                    <select>
                        <option>10</option>
                        <option>20</option>
                    </select>
                </div>
                <div className="pagination">
                    <button className="ghost-button" disabled>1</button>
                    <button className="primary-button is-ghost">2</button>
                    <button className="primary-button is-ghost">3</button>
                </div>
            </div>
        </section>
    );
}

function HourglassIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M7 3h10v4l-3 3 3 3v8H7v-8l3-3-3-3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m15.5 15.5 3 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}