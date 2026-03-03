import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BookingRequestManagement.module.css';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchBookingRequests } from '../../../services/bookingService.js';
import { combineDateTime, formatDateTimeVi, formatTimeHHmm } from '../../../components/timeUtils.js';
import { getBookingStatusTextVi, getBookingStatusTone } from '../../../components/statusUtils.js';

export default function BookingManagement() {
    // Tự động cuộn trang lên đầu khi component này được mount
    useScrollToTop(); 
    
    const navigate = useNavigate();
    const [pendingBookings, setPendingBookings] = useState([]); // Danh sách yêu cầu
    const [isLoading, setIsLoading] = useState(true);           // Trạng thái chờ API phản hồi
    const [error, setError] = useState('');                      // Lưu thông báo lỗi nếu có

    // Query state (backend paging/filtering)
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [date, setDate] = useState(''); // yyyy-mm-dd
    const [status, setStatus] = useState('PENDING');
    const [isGuest, setIsGuest] = useState(''); // '' | 'true' | 'false'
    const [search, setSearch] = useState('');

    // Server paging metadata
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    // Debounce search to avoid spamming API
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const filters = useMemo(() => {
        const parsedIsGuest = isGuest === '' ? undefined : isGuest === 'true';
        return {
            page,
            size,
            date: date || undefined,
            status: status || undefined,
            isGuest: parsedIsGuest,
            search: debouncedSearch || undefined,
        };
    }, [page, size, date, status, isGuest, debouncedSearch]);

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
                const response = await fetchBookingRequests(filters, token);

                const pageData = response?.data;
                const list = Array.isArray(pageData?.content) ? pageData.content : [];
                const apiTotalPages = Number.isFinite(pageData?.totalPages) ? pageData.totalPages : 1;
                const apiTotalElements = Number.isFinite(pageData?.totalElements) ? pageData.totalElements : list.length;

                setPendingBookings(list);
                setTotalPages(Math.max(1, apiTotalPages));
                setTotalElements(Math.max(0, apiTotalElements));

                // If the current page is out of range after filtering, clamp it and refetch.
                if (apiTotalPages > 0 && filters.page > apiTotalPages - 1) {
                    setPage(Math.max(0, apiTotalPages - 1));
                }
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
                setTotalPages(1);
                setTotalElements(0);
            } finally {
                setIsLoading(false); // Kết thúc quá trình tải (dù thành công hay thất bại)
            }
        };

        loadData();
    }, [filters]);

    const handleResetFilters = () => {
        setPage(0);
        setSize(10);
        setDate('');
        setStatus('PENDING');
        setIsGuest('');
        setSearch('');
    };

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
                        page={page}
                        size={size}
                        totalPages={totalPages}
                        totalElements={totalElements}
                        date={date}
                        status={status}
                        isGuest={isGuest}
                        search={search}
                        onChangePage={setPage}
                        onChangeSize={(next) => {
                            setSize(next);
                            setPage(0);
                        }}
                        onChangeDate={(next) => {
                            setDate(next);
                            setPage(0);
                        }}
                        onChangeStatus={(next) => {
                            setStatus(next);
                            setPage(0);
                        }}
                        onChangeIsGuest={(next) => {
                            setIsGuest(next);
                            setPage(0);
                        }}
                        onChangeSearch={(next) => {
                            setSearch(next);
                            setPage(0);
                        }}
                        onResetFilters={handleResetFilters}
                        // Hàm xử lý khi bấm xem chi tiết: Chuyển hướng tới trang chi tiết ID
                        onViewDetail={(id) => navigate(`/booking-request-management/${id}`)}
                        actionLabel={`${totalElements} yêu cầu`}
                    />
                </div>
            </div>
        </div>
    );
}


function PendingPanel({
    title,
    icon,
    tone,
    data,
    actionLabel,
    onViewDetail,
    isLoading,
    error,
    page,
    size,
    totalPages,
    date,
    status,
    isGuest,
    search,
    onChangePage,
    onChangeSize,
    onChangeDate,
    onChangeStatus,
    onChangeIsGuest,
    onChangeSearch,
    onResetFilters,
}) {
    // Tạo class CSS động dựa trên "tone" (ví dụ: booking-card--warning)
    const toneClass = styles['booking-card--' + tone];

    const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1;
    const safePage = Number.isFinite(page) ? Math.min(Math.max(0, page), safeTotalPages - 1) : 0;

    const pageButtons = useMemo(() => {
        const maxButtons = 5;
        const current = safePage;
        const last = safeTotalPages - 1;
        const start = Math.max(0, Math.min(current - 2, last - (maxButtons - 1)));
        const end = Math.min(last, start + (maxButtons - 1));
        const items = [];
        for (let i = start; i <= end; i += 1) items.push(i);
        return items;
    }, [safePage, safeTotalPages]);

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
                    <label>Ngày hẹn</label>
                    <label>Trạng thái</label>
                </div>
                <div className={styles['filter-card__controls']}>
                    <select value={isGuest} onChange={(e) => onChangeIsGuest?.(e.target.value)}>
                        <option value="">Tất cả</option>
                        <option value="true">Vãng lai</option>
                        <option value="false">Có tài khoản</option>
                    </select>
                    <input type="date" value={date} onChange={(e) => onChangeDate?.(e.target.value)} />
                    <select value={status} onChange={(e) => onChangeStatus?.(e.target.value)}>
                        <option value="">Tất cả</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="CONFIRMED">Đã xác nhận</option>
                        <option value="REJECTED">Từ chối</option>
                        <option value="EXPIRED">Hết hạn</option>
                        <option value="CONTACTED">Đã liên hệ</option>
                        <option value="SPAM">Spam</option>
                    </select>
                </div>
                <div className={styles['filter-card__actions']}>
                    <div className={styles['search-box']}>
                        <input
                            placeholder="Tìm kiếm..."
                            value={search}
                            onChange={(e) => onChangeSearch?.(e.target.value)}
                        />
                        <SearchIcon />
                    </div>
                    <button className={styles['ghost-button']} onClick={onResetFilters}>Xóa bộ lọc</button>
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
                            <th>THỜI GIAN HẸN</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 1. Hiển thị khi đang tải */}
                        {isLoading && (
                            <tr><td colSpan="8" className={styles['empty-row']}>Đang tải dữ liệu...</td></tr>
                        )}
                        
                        {/* 2. Hiển thị khi không có dữ liệu */}
                        {!isLoading && data.length === 0 && (
                            <tr><td colSpan="8" className={styles['empty-row']}>Không có yêu cầu nào.</td></tr>
                        )}
                        
                        {/* 3. Render danh sách yêu cầu */}
                        {!isLoading && data.map((item) => {
                            // Lấy màu sắc badge dựa trên trạng thái của item (qua statusUtils)
                            const tone = getBookingStatusTone(item?.status, 'info');
                            return (
                                <tr key={item.requestId || item.id}>
                                    <td className={styles['link-cell']}>{item.requestId || item.id || '-'}</td>
                                    <td>{item.fullName || item.name || '-'}</td>
                                    <td>{item.phone || '-'}</td>
                                    <td>{item.serviceCategory || item.service || '-'}</td>
                                    <td>
                                        <span className={`${styles['status-badge']} ${styles['status-badge--' + tone]}`}>
                                            {getBookingStatusTextVi(item?.status)}
                                        </span>
                                    </td>
                                    <td>{formatDateTimeVi(item?.createdAt, '-') }</td>
                                    <td>{combineDateTime(item?.scheduledDate, formatTimeHHmm(item?.scheduledTime)) || '-'}</td>

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
                    <select value={String(size)} onChange={(e) => onChangeSize?.(Number(e.target.value))}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>
                <div className={styles.pagination}>
                    <button
                        className={styles['primary-button']}
                        disabled={safePage <= 0 || isLoading}
                        onClick={() => onChangePage?.(safePage - 1)}
                    >
                        Trước
                    </button>

                    {pageButtons.map((p) => {
                        const isActive = p === safePage;
                        return (
                            <button
                                key={p}
                                className={isActive ? styles['ghost-button'] : `${styles['primary-button']} ${styles['is-ghost']}`}
                                disabled={isActive || isLoading}
                                onClick={() => onChangePage?.(p)}
                            >
                                {p + 1}
                            </button>
                        );
                    })}

                    <button
                        className={styles['primary-button']}
                        disabled={safePage >= safeTotalPages - 1 || isLoading}
                        onClick={() => onChangePage?.(safePage + 1)}
                    >
                        Sau
                    </button>
                </div>
            </div>
        </section>
    );
}

// Các Component Icon dạng SVG để giảm phụ thuộc thư viện ngoài
function HourglassIcon() { /* ... SVG Code ... */ }
function SearchIcon() { /* ... SVG Code ... */ }