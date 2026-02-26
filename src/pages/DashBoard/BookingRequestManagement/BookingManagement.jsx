import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BookingManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchPendingBookingRequests } from '../../../services/bookingService.js';
import { combineDateTime } from '../../../components/timeUtils.js';

export default function BookingManagement() {
    // Tự động cuộn trang lên đầu khi component này được mount
    useScrollToTop(); 
    
    const navigate = useNavigate();
    const [pendingBookings, setPendingBookings] = useState([]); // Danh sách yêu cầu chờ duyệt
    const [isLoading, setIsLoading] = useState(true);           // Trạng thái chờ API phản hồi
    const [error, setError] = useState('');                      // Lưu thông báo lỗi nếu có

    useEffect(() => {
        // 1. Kiểm tra quyền truy cập: Lấy token từ bộ nhớ trình duyệt
        const token = localStorage.getItem('authToken');

        if (!token) {
            setError('Vui lòng đăng nhập để xem danh sách yêu cầu.');
            setPendingBookings([]);
            setIsLoading(false);
            return; // Dừng thực thi nếu không có token
        }

        // 2. Hàm gọi API lấy dữ liệu
        const loadData = async () => {
            try {
                setIsLoading(true);
                const response = await fetchPendingBookingRequests(token);
                
                // Kiểm tra nếu dữ liệu trả về là mảng thì lưu vào state, nếu không thì để mảng rỗng
                const list = Array.isArray(response?.data) ? response.data : [];

                setPendingBookings(list);
                setError(''); // Xóa lỗi cũ nếu tải thành công
            } catch (err) {
                const msg = err?.message || 'Không thể tải danh sách yêu cầu.';
                const isUnauthorized = err?.status === 401 || err?.status === 403;

                if (isUnauthorized) {
                    // Nếu lỗi 401/403: Token hết hạn hoặc sai, xóa token và báo đăng nhập lại
                    localStorage.removeItem('authToken');
                    setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    setError(msg);
                }
                setPendingBookings([]);
            } finally {
                setIsLoading(false); // Kết thúc quá trình tải (dù thành công hay thất bại)
            }
        };

        loadData();
    }, []); // Chạy 1 lần duy nhất khi component vừa hiển thị

    return (
        <div className={styles['booking-page']}>
            <div className={styles['booking-layout']}>
                <div className={styles['booking-left']}>
                    {/* Truyền dữ liệu và các hàm xử lý xuống Component hiển thị */}
                    <PendingPanel
                        title="Yêu cầu chưa duyệt"
                        icon={<HourglassIcon />}
                        tone="warning" // Màu sắc chủ đạo (vàng/cảnh báo)
                        data={pendingBookings}
                        isLoading={isLoading}
                        error={error}
                        // Hàm xử lý khi bấm xem chi tiết: Chuyển hướng tới trang chi tiết ID
                        onViewDetail={(id) => navigate(`/booking-management/${id}`)}
                        actionLabel={`${pendingBookings.length} yêu cầu`}
                    />
                </div>
            </div>
        </div>
    );
}


function PendingPanel({ title, icon, tone, data, actionLabel, onViewDetail, isLoading, error }) {
    // Tạo class CSS động dựa trên "tone" (ví dụ: booking-card--warning)
    const toneClass = styles['booking-card--' + tone];

    // Dùng useMemo để tránh tạo lại object này mỗi khi component render lại
    const statusToneMap = useMemo(() => ({
        PENDING: 'warning',
        CONTACTED: 'info',
    }), []);

    return (
        <section className={`${styles['booking-card']} ${toneClass}`}>
            {/* --- HEADER CỦA CARD --- */}
            <div className={styles['booking-card__header']}>
                <div className={styles['booking-card__title']}>{icon} {title}</div>
                <button className={styles['ghost-button']}>{actionLabel}</button>
            </div>

            {/* Hiển thị banner thông báo lỗi nếu có */}
            {error && <div className={styles['error-banner']}>{error}</div>}

            {/* --- BỘ LỌC (FILTERS) --- */}
            <div className={styles['pending-filters']}>
                <div className={styles['filter-card__labels']}>
                    <label>Loại khách hàng</label>
                    <label>Thời gian gửi yêu cầu</label>
                    <label>Trạng thái</label>
                </div>
                <div className={styles['filter-card__controls']}>
                    {/* Lưu ý: Các select này hiện tại chưa được gắn logic xử lý onChange */}
                    <select>
                        <option>Tất cả</option>
                        <option>Vãng Lai</option>
                        <option>có tài khoản</option>
                    </select>
                    <select><option>Hôm nay</option>...</select>
                    <select><option>Tất cả</option>...</select>
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
                        {/* 1. Hiển thị khi đang tải */}
                        {isLoading && (
                            <tr><td colSpan="7" className={styles['empty-row']}>Đang tải dữ liệu...</td></tr>
                        )}
                        
                        {/* 2. Hiển thị khi không có dữ liệu */}
                        {!isLoading && data.length === 0 && (
                            <tr><td colSpan="7" className={styles['empty-row']}>Không có yêu cầu nào.</td></tr>
                        )}
                        
                        {/* 3. Render danh sách yêu cầu */}
                        {!isLoading && data.map((item) => {
                            // Lấy màu sắc badge dựa trên trạng thái của item
                            const tone = statusToneMap[item?.status] || statusToneMap.DEFAULT;
                            return (
                                <tr key={item.requestId || item.id}>
                                    <td className={styles['link-cell']}>{item.requestId || item.id || '-'}</td>
                                    <td>{item.fullName || item.name || '-'}</td>
                                    <td>{item.phone || '-'}</td>
                                    <td>{item.serviceCategory || item.service || '-'}</td>
                                    <td>
                                        <span className={`${styles['status-badge']} ${styles['status-badge--' + tone]}`}>
                                            {item.status || 'PENDING'}
                                        </span>
                                    </td>
                                    <td>{combineDateTime(item.createdAt)? new Date(item.createdAt+ "Z").toLocaleString('vi-VN') : '-'}</td>
                                    <td>
                                        <button
                                            className={styles['primary-button']}
                                            onClick={() => onViewDetail?.(item.requestId || item.id)}
                                        >
                                            Xem chi tiết
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- PHÂN TRANG (PAGINATION) --- */}
            <div className={styles['booking-card__footer']}>
                <div className={styles['page-size']}>
                    <span>Hiển thị:</span>
                    <select><option>10</option><option>20</option></select>
                </div>
                <div className={styles.pagination}>
                    {/*Đang render nút tĩnh, cần bổ sung logic phân trang thực tế */}
                    <button className={styles['ghost-button']} disabled>1</button>
                    <button className={`${styles['primary-button']} ${styles['is-ghost']}`}>2</button>
                    <button className={`${styles['primary-button']} ${styles['is-ghost']}`}>3</button>
                </div>
            </div>
        </section>
    );
}

// Các Component Icon dạng SVG để giảm phụ thuộc thư viện ngoài
function HourglassIcon() { /* ... SVG Code ... */ }
function SearchIcon() { /* ... SVG Code ... */ }