import { useState } from 'react';
import styles from './BookingManagement.module.css';
import Dayslot from './Dayslot.jsx';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';

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
        id: 'DB-202310 26-002',
        name: 'Trần Thị V',
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

const sampleSlotData = {
    '07:30': { customers: ['Nguyễn A'], current: 1, capacity: 3 },
    '08:00': { customers: ['Phạm B', 'Lạc C'], current: 2, capacity: 3 },
    '08:30': { customers: ['Đông D', 'Vệ E', 'Hoàng F'], current: 3, capacity: 3 },
    '09:00': { customers: ['Nguyễn A', 'Phạm B', 'Lê C', 'Định D'], current: 4, capacity: 3 },
};

const fixedSlots = buildSlots();
const allSlots = buildAllSlots();

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
    useScrollToTop(); // Tự động scroll lên đầu trang khi vào
    const [selectedSlot, setSelectedSlot] = useState(null);

    const handleSlotOpen = (slot) => {
        const approved = approvedBookingsBySlot[slot.time] || [];
        setSelectedSlot({ ...slot, approved });
    };

    const handleSlotClose = () => setSelectedSlot(null);

    return (
        <div className={styles['booking-page']}>
            <div className={styles['booking-layout']}>
                <div className={styles['booking-left']}>
                    <PendingPanel
                        title="Yêu cầu chưa duyệt"
                        icon={<HourglassIcon />}
                        tone="warning"
                        data={pendingBookings}
                        actionLabel="X yêu cầu"
                    />
                </div>

                <SchedulePanel dateLabel="Lịch thời gian & Slot hôm nay" slots={fixedSlots} onOpenSlot={handleSlotOpen} />
            </div>

            {selectedSlot && (
                <Dayslot slot={selectedSlot} onClose={handleSlotClose} />
            )}
        </div>
    );
}

function PendingPanel({ title, icon, tone, data, actionLabel }) {
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
                            <th>DỊCH VỤ</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td className={styles['link-cell']}>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.service}</td>
                                <td>
                                    <span className={`${styles['status-badge']} ${styles['status-badge--' + (item.statusTone || 'success')]}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>
                                    <button className={styles['primary-button']}>Xem chi tiết</button>
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

function SchedulePanel({ dateLabel, slots, onOpenSlot }) {
    const [searchTerm, setSearchTerm] = useState('');
    
    const allDisplaySlots = allSlots;
    const filteredSlots = searchTerm 
        ? allDisplaySlots.filter(slot => 
            slot.time.includes(searchTerm) || 
            slot.customers.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : allDisplaySlots;

    return (
        <section className={styles['schedule-card']}>
            <div className={styles['schedule-card__header']}>
                <div className={styles['schedule-card__title']}>
                    <DotIcon />
                    <span>{dateLabel}</span>
                </div>
                <div className={styles['schedule-card__date']}>
                    <label htmlFor="scheduleDate">Chọn ngày:</label>
                    <input id="scheduleDate" type="date" />
                </div>
            </div>

            <div className={styles['schedule-search-box']}>
                <input 
                    type="text" 
                    placeholder="Tìm kiếm thời gian hoặc khách hàng..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <SearchIcon />
            </div>

            <div className={styles['slot-list']}>
                {filteredSlots.map((slot) => (
                    <button
                        type="button"
                        key={slot.time}
                        className={`${styles['slot-item']} ${styles['slot-item--' + slot.state]}`}
                        onClick={() => onOpenSlot(slot)}
                    >
                        <div className={styles['slot-item__time']}>{slot.time}</div>
                        <div className={styles['slot-item__customers']}>
                            {slot.customers.length === 0 && <span className={styles['slot-item__empty']}>Trống</span>}
                            {slot.customers.map((c) => (
                                <span key={c} className={styles['slot-badge']}>{c}</span>
                            ))}
                        </div>
                        <div className={styles['slot-item__actions']}>
                            <span className={`${styles['slot-item__quota']} ${styles['slot-item__quota--' + slot.state]}`}>{slot.quota}</span>
                            <span className={`${styles['slot-item__stateIcon']} ${styles['slot-item__stateIcon--' + slot.state]}`} aria-hidden>
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


function HourglassIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <path d="M7 3h10v4l-3 3 3 3v8H7v-8l3-3-3-3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="1.5" />
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

function DotIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
    );
}

function CheckIconSmall() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <path d="M6 12.5 10.5 17 18 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function WarnIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
            <path d="M12 3 3 20h18z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 9.5v4.5M12 17v.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function buildSlots() {
    const slots = [];
	for (let hour = 6; hour <= 10; hour++) {
        ['00', '30'].forEach((minute) => {
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

function buildAllSlots() {
    const slots = [];
	for (let hour = 6; hour <= 24; hour++) {
        ['00', '30'].forEach((minute) => {
			// Với 24h chỉ lấy 24:00, bỏ 24:30
			if (hour === 24 && minute === '30') return;
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