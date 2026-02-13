<<<<<<< Updated upstream
import { useState } from 'react';
import './BookingManagement.css';
import Dayslot from './Dayslot.jsx';
=======
import { useNavigate } from 'react-router-dom';
import styles from './BookingManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
const sampleSlotData = {
    '07:30': { customers: ['Nguyễn A'], current: 1, capacity: 3 },
    '08:00': { customers: ['Phạm B', 'Lạc C'], current: 2, capacity: 3 },
    '08:30': { customers: ['Đông D', 'Vệ E', 'Hoàng F'], current: 3, capacity: 3 },
    '09:00': { customers: ['Nguyễn A', 'Phạm B', 'Lê C', 'Định D'], current: 4, capacity: 3 },
};

const fixedSlots = buildSlots();

const approvedBookingsBySlot = {
    '08:30': [
        {
            id: 'DB-20240720-001',
            name: 'Phạm D',
            phone: '0901234567',
            service: 'Thay lốp',
            note: 'Không có ghi chú',
            status: 'Đã duyệt',
        },
        {
            id: 'DB-20240720-002',
            name: 'Vũ E',
            phone: '0901234568',
            service: 'Sửa phanh',
            note: 'Kiểm tra kỹ',
            status: 'Đã duyệt',
        },
    ],
};

export default function BookingManagement() {
    const [selectedSlot, setSelectedSlot] = useState(null);

    const handleSlotOpen = (slot) => {
        const approved = approvedBookingsBySlot[slot.time] || [];
        setSelectedSlot({ ...slot, approved });
    };

    const handleSlotClose = () => setSelectedSlot(null);
=======
export default function BookingManagement() {
    useScrollToTop(); // Tự động scroll lên đầu trang khi vào
    const navigate = useNavigate();
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
function PendingPanel({ title, icon, tone, data, actionLabel }) {
=======
function PendingPanel({ title, icon, tone, data, actionLabel, onViewDetail }) {
    const toneClass = styles['booking-card--' + tone];
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                                    <button className="primary-button">Xem chi tiết</button>
=======
                                    <button
                                        className={styles['primary-button']}
                                        onClick={() => onViewDetail?.(item.id)}
                                    >
                                        Xem chi tiết
                                    </button>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

function SchedulePanel({ dateLabel, slots, onOpenSlot }) {
    return (
        <section className="schedule-card">
            <div className="schedule-card__header">
                <div className="schedule-card__title">
                    <DotIcon />
                    <span>{dateLabel}</span>
                </div>
                <div className="schedule-card__date">
                    <label htmlFor="scheduleDate">Chọn ngày:</label>
                    <input id="scheduleDate" type="date" />
                </div>
            </div>

            <div className="slot-list">
                {slots.map((slot) => (
                    <button
                        type="button"
                        key={slot.time}
                        className={`slot-item slot-item--${slot.state}`}
                        onClick={() => onOpenSlot(slot)}
                    >
                        <div className="slot-item__time">{slot.time}</div>
                        <div className="slot-item__customers">
                            {slot.customers.length === 0 && <span className="slot-item__empty">Trống</span>}
                            {slot.customers.map((c) => (
                                <span key={c} className="slot-badge">{c}</span>
                            ))}
                        </div>
                        <div className="slot-item__actions">
                            <span className={`slot-item__quota slot-item__quota--${slot.state}`}>{slot.quota}</span>
                            <span className={`slot-item__stateIcon slot-item__stateIcon--${slot.state}`} aria-hidden>
                                {slot.state === 'ok' && <CheckIconSmall />}
                                {slot.state === 'full' && <CloseIcon />}
                                {slot.state === 'over' && <WarnIcon />}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}


=======
>>>>>>> Stashed changes
function HourglassIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M7 3h10v4l-3 3 3 3v8H7v-8l3-3-3-3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

<<<<<<< Updated upstream
function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

=======
>>>>>>> Stashed changes
function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m15.5 15.5 3 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}
<<<<<<< Updated upstream

function DotIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
    );
}

function CheckIconSmall() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M6 12.5 10.5 17 18 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function WarnIcon() {
    return (
        <svg viewBox="0 0 24 24" className="icon" aria-hidden>
            <path d="M12 3 3 20h18z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 9.5v4.5M12 17v.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function buildSlots() {
    const slots = [];
    for (let hour = 6; hour <= 18; hour++) {
        ['00', '30'].forEach((minute) => {
            if (hour === 18 && minute === '30') return;
            const time = `${String(hour).padStart(2, '0')}:${minute}`;
            const data = sampleSlotData[time] || { customers: [], current: 0, capacity: 3 };
            const { current, capacity } = data;
            let state = 'ok';
            if (current === capacity) state = 'full';
            if (current > capacity) state = 'over';
            slots.push({
                time,
                customers: data.customers,
                quota: `${current}/${capacity}`,
                state,
            });
        });
    }
    return slots;
}
=======
>>>>>>> Stashed changes
