import './BookingManagement.css';

const pendingBookings = [
    {
        id: 'DB-202310 26-001',
        name: 'Nguyễn Văn A',
        service: 'Làm lốp',
        status: 'Chờ xác nhận',
        statusTone: 'warning',
    },
    {
        id: 'DB-202310 26-002',
        name: 'Trần Thị B',
        service: 'vá xăm',
        status: 'Đã liên hệ',
        statusTone: 'info',
    },
        {
        id: 'DB-202310 26-002',
        name: 'Trần Thị V',
        service: 'vá xăm',
        status: 'Đã liên hệ',
        statusTone: 'info',
    },
    {
        id: 'DB-202310 26-003',
        name: 'Lê Văn C',
        service: 'vá lốp',
        status: 'Hủy lịch',
        statusTone: 'danger',
    },
];

const approvedBookings = [
    {
        id: 'DB-202310 25-001',
        name: 'Phạm Thị D',
        service: 'thay dầu',
        status: 'Đã duyệt',
    },
    {
        id: 'DB-202310 25-001',
        name: 'Phạm Văn D',
        service: 'thay dầu',
        status: 'Đã duyệt',
    },
    {
        id: 'DB-202310 25-002',
        name: 'Hoàng Văn E',
        service: 'thay phanh',
        status: 'Đã duyệt',
    },
];

export default function BookingManagement() {
    return (
        <div className="booking-page">
            <div className="filter-row">
                <FilterCard title="Bộ lọc - Yêu cầu chưa duyệt" icon={<HourglassIcon />} tone="warning" />
                <FilterCard title="Bộ lọc - Yêu cầu đã duyệt" icon={<CheckIcon />} tone="success" />
            </div>

            <div className="tables-row">
                <BookingTable
                    title="Yêu cầu chưa duyệt"
                    icon={<HourglassIcon />}
                    tone="warning"
                    data={pendingBookings}
                    actionLabel="X yêu cầu"
                />

                <BookingTable
                    title="Yêu cầu đã duyệt"
                    icon={<CheckIcon />}
                    tone="success"
                    data={approvedBookings}
                    actionLabel="X yêu cầu"
                />
            </div>
        </div>
    );
}

function FilterCard({ title, icon, tone }) {
    return (
        <section className={`filter-card filter-card--${tone}`}>
            <div className="filter-card__header">
                <span className="filter-card__title">{icon} {title}</span>
            </div>
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
        </section>
    );
}

function BookingTable({ title, icon, tone, data, actionLabel }) {
    return (
        <section className={`booking-card booking-card--${tone}`}>
            <div className="booking-card__header">
                <div className="booking-card__title">{icon} {title}</div>
                <button className="ghost-button">{actionLabel}</button>
            </div>

            <table className="booking-table">
                <thead>
                    <tr>
                        <th>MÃ YÊU CẦU</th>
                        <th>TÊN KHÁCH HÀNG</th>
                        <th>DỊCH VỤ</th>
                        <th>TRẠNG THÁI</th>
                        <th>THAO TÁC</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.id}>
                            <td className="link-cell">{item.id}</td>
                            <td>{item.name}</td>
                            <td>{item.service}</td>
                            <td>
                                <span className={`status-badge status-badge--${item.statusTone || 'success'}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td>
                                <button className="primary-button">Xem chi tiết</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

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

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="1.5" />
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