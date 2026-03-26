import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchTechnicianTickets } from '../../../services/technicianService.js';
import styles from './DailySchedule.module.css';

const getAuthToken = () =>
  localStorage.getItem('staffToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  '';

const getStatusInfo = (status) => {
  switch (status) {
    case 'CONFIRMED': return { text: 'Đã xác nhận', cls: styles.statusConfirmed };
    case 'PENDING_CHECKIN': return { text: 'Chờ check-in', cls: styles.statusPending };
    case 'CHECKED_IN': return { text: 'Đã check-in', cls: styles.statusCheckedIn };
    case 'IN_PROGRESS': return { text: 'Đang xử lý', cls: styles.statusInProgress };
    case 'COMPLETED': return { text: 'Hoàn thành', cls: styles.statusCompleted };
    case 'CANCELLED': return { text: 'Đã hủy', cls: styles.statusCancelled };
    default: return { text: status || '-', cls: styles.statusDefault };
  }
};

export default function DailySchedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');

  const today = useMemo(() => new Date(), []);

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập để xem lịch làm việc.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

      const response = await fetchTechnicianTickets({ from: firstDay, to: lastDay, size: 200 }, token);
      const list = Array.isArray(response?.data) ? response.data
        : Array.isArray(response?.data?.content) ? response.data.content
        : [];
      setTickets(list);
    } catch (err) {
      console.error('Lỗi tải lịch làm việc:', err);
      setTickets([]);
      toast.error('Không tải được dữ liệu lịch làm việc.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê
  const stats = useMemo(() => {
    const total = tickets.length;
    const confirmed = tickets.filter(t => t.status === 'CONFIRMED').length;
    const pending = tickets.filter(t => ['PENDING_CHECKIN', 'PENDING'].includes(t.status)).length;
    const completed = tickets.filter(t => t.status === 'COMPLETED').length;
    const cancelled = tickets.filter(t => t.status === 'CANCELLED').length;
    const checkedIn = tickets.filter(t => t.status === 'CHECKED_IN' || t.status === 'IN_PROGRESS').length;
    return { total, confirmed, pending, completed, cancelled, checkedIn };
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (filterStatus !== 'ALL') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t =>
        `${t.ticketCode ?? ''} ${t.customerName ?? ''} ${t.fullName ?? ''} ${t.serviceName ?? ''} ${t.licensePlate ?? ''}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, filterStatus, search]);

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const getTicketsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().slice(0, 10);
    return filteredTickets.filter(t => {
      const ticketDate = t.appointmentDate || t.bookingDate || t.scheduledDate;
      return ticketDate === dateStr;
    });
  };

  const isToday = (date) => date && date.toDateString() === today.toDateString();
  const isWeekend = (date) => date && (date.getDay() === 0 || date.getDay() === 6);

  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToToday = () => setCurrentMonth(new Date());

  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);

  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Lịch làm việc của tôi</h1>
            <p className={styles.subtitle}>Quản lý và theo dõi lịch hẹn hàng ngày</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton} onClick={loadData}>↻ Làm mới</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng lịch hẹn</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.confirmed}</div>
            <div className={styles.statLabel}>Đã xác nhận</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Chờ xác nhận</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.checkedIn}</div>
            <div className={styles.statLabel}>Đã check-in</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewButton} ${viewMode === 'calendar' ? styles.active : ''}`} onClick={() => setViewMode('calendar')}>📅 Lịch</button>
            <button className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`} onClick={() => setViewMode('list')}>📋 Danh sách</button>
          </div>
          <div className={styles.monthNavigation}>
            <button className={styles.navButton} onClick={goToPrevMonth}>◀ Tháng trước</button>
            <button className={styles.currentButton} onClick={goToToday}>{monthName}</button>
            <button className={styles.navButton} onClick={goToNextMonth}>Tháng sau ▶</button>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <input
            className={styles.searchInput}
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_CHECKIN">Chờ check-in</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CHECKED_IN">Đã check-in</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu lịch làm việc...</p>
        </div>
      )}

      {/* Calendar View */}
      {!loading && viewMode === 'calendar' && (
        <div className={styles.calendarCard}>
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {weekDays.map((day, i) => (<div key={i} className={styles.weekDay}>{day}</div>))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                const dayAppointments = getTicketsForDate(day);
                return (
                  <div
                    key={index}
                    className={`${styles.dayCell} ${!day ? styles.emptyCell : ''} ${isToday(day) ? styles.today : ''} ${isWeekend(day) ? styles.weekend : ''}`}
                  >
                    {day && (
                      <>
                        <div className={styles.dayNumber}>{day.getDate()}</div>
                        {dayAppointments.length > 0 && (
                          <div className={styles.dayContent}>
                            {dayAppointments.slice(0, 3).map((apt) => {
                              const info = getStatusInfo(apt.status);
                              return (
                                <div key={apt.ticketCode || apt.id} className={`${styles.appointmentBadge} ${info.cls}`}>
                                  <div className={styles.aptTime}>
                                    {apt.appointmentTime || apt.startTime || '-'}
                                  </div>
                                  <div className={styles.aptCustomer}>{apt.customerName || apt.fullName || 'Khách hàng'}</div>
                                </div>
                              );
                            })}
                            {dayAppointments.length > 3 && (
                              <div className={styles.moreCount}>+{dayAppointments.length - 3} lịch hẹn</div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <div className={styles.tableCard}>
          {filteredTickets.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyTitle}>Không có lịch hẹn nào</div>
              <div className={styles.emptyMessage}>Thử thay đổi bộ lọc hoặc tìm kiếm.</div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Mã phiếu</th>
                  <th>Khách hàng</th>
                  <th>Biển số xe</th>
                  <th>Dịch vụ</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const info = getStatusInfo(ticket.status);
                  return (
                    <tr key={ticket.ticketCode || ticket.id}>
                      <td>{ticket.appointmentDate || ticket.bookingDate || '-'}</td>
                      <td>{ticket.appointmentTime || ticket.startTime || '-'}</td>
                      <td style={{ fontWeight: '600', color: '#1E90FF' }}>{ticket.ticketCode || '-'}</td>
                      <td>{ticket.customerName || ticket.fullName || '-'}</td>
                      <td>{ticket.licensePlate || '-'}</td>
                      <td>{ticket.serviceName || '-'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${info.cls}`}>{info.text}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#6b7280' }}>{ticket.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusConfirmed}`}></span><span>Đã xác nhận</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusPending}`}></span><span>Chờ xác nhận</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCheckedIn}`}></span><span>Đã check-in</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusInProgress}`}></span><span>Đang xử lý</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCompleted}`}></span><span>Hoàn thành</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCancelled}`}></span><span>Đã hủy</span></div>
        </div>
      </div>
    </div>
  );
}
