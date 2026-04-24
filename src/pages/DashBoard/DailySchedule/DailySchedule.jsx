import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchStaffSchedule } from '../../../services/staffDashboardService.js';
import styles from './DailySchedule.module.css';

const getAuthToken = () =>
  localStorage.getItem('staffToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  '';

const STATUS_GROUPS = {
  active: ['SCHEDULED', 'CONFIRMED', 'NOT_CHECKED_IN'],
  present: ['PRESENT', 'CHECKED_IN', 'COMPLETED'],
  late: ['LATE', 'EARLY_LEAVE'],
  off: ['OFF', 'ABSENT', 'CANCELLED'],
};

const getStatusInfo = (status) => {
  switch (status) {
    case 'SCHEDULED':
      return { text: 'Có lịch', cls: styles.statusPending };
    case 'CONFIRMED':
      return { text: 'Đã xác nhận', cls: styles.statusConfirmed };
    case 'NOT_CHECKED_IN':
      return { text: 'Chưa check-in', cls: styles.statusPending };
    case 'PRESENT':
    case 'CHECKED_IN':
      return { text: 'Đã chấm công', cls: styles.statusCheckedIn };
    case 'COMPLETED':
      return { text: 'Hoàn thành', cls: styles.statusCompleted };
    case 'LATE':
      return { text: 'Đi muộn', cls: styles.statusInProgress };
    case 'EARLY_LEAVE':
      return { text: 'Về sớm', cls: styles.statusInProgress };
    case 'OFF':
      return { text: 'Nghỉ', cls: styles.statusDefault };
    case 'ABSENT':
      return { text: 'Vắng', cls: styles.statusCancelled };
    case 'CANCELLED':
      return { text: 'Đã hủy', cls: styles.statusCancelled };
    default:
      return { text: status || '-', cls: styles.statusDefault };
  }
};

const formatDayOfWeek = (value) => {
  const normalized = String(value || '').toUpperCase();
  const map = {
    MONDAY: 'Thứ 2',
    TUESDAY: 'Thứ 3',
    WEDNESDAY: 'Thứ 4',
    THURSDAY: 'Thứ 5',
    FRIDAY: 'Thứ 6',
    SATURDAY: 'Thứ 7',
    SUNDAY: 'Chủ nhật',
  };
  return map[normalized] || value || '-';
};

const getScheduleKey = (item) => item.date || item.attendanceDate || item.id;

export default function DailySchedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
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

      const response = await fetchStaffSchedule(firstDay, lastDay, token);
      const list = Array.isArray(response?.data) ? response.data : [];
      setSchedules(list);
    } catch (err) {
      console.error('Lỗi tải lịch làm việc:', err);
      setSchedules([]);
      toast.error(err?.status === 403
        ? 'Tài khoản hiện tại không có quyền xem lịch làm việc cá nhân.'
        : 'Không tải được dữ liệu lịch làm việc.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((item) => STATUS_GROUPS.active.includes(item.status)).length;
    const present = schedules.filter((item) => STATUS_GROUPS.present.includes(item.status)).length;
    const late = schedules.filter((item) => STATUS_GROUPS.late.includes(item.status)).length;
    const off = schedules.filter((item) => STATUS_GROUPS.off.includes(item.status)).length;
    return { total, active, present, late, off };
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    let result = schedules;
    if (filterStatus !== 'ALL') {
      result = result.filter((item) => item.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) =>
        `${item.date ?? ''} ${formatDayOfWeek(item.dayOfWeek)} ${item.shiftName ?? ''} ${item.status ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return result;
  }, [schedules, filterStatus, search]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i += 1) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d += 1) days.push(new Date(year, month, d));
    return days;
  };

  const getSchedulesForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().slice(0, 10);
    return filteredSchedules.filter((item) => item.date === dateStr);
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
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Lịch làm việc của tôi</h1>
            <p className={styles.subtitle}>Theo dõi ca làm cá nhân theo dữ liệu từ Staff Dashboard API</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton} onClick={loadData}>↻ Làm mới</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng ca</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.active}</div>
            <div className={styles.statLabel}>Có lịch</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.present}</div>
            <div className={styles.statLabel}>Đã chấm công</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.late}</div>
            <div className={styles.statLabel}>Muộn / về sớm</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.off}</div>
            <div className={styles.statLabel}>Nghỉ / vắng</div>
          </div>
        </div>
      </div>

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
            placeholder="Tìm theo ngày, ca, trạng thái..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SCHEDULED">Có lịch</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="NOT_CHECKED_IN">Chưa check-in</option>
            <option value="PRESENT">Đã chấm công</option>
            <option value="LATE">Đi muộn</option>
            <option value="EARLY_LEAVE">Về sớm</option>
            <option value="OFF">Nghỉ</option>
            <option value="ABSENT">Vắng</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu lịch làm việc...</p>
        </div>
      )}

      {!loading && viewMode === 'calendar' && (
        <div className={styles.calendarCard}>
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {weekDays.map((day) => (<div key={day} className={styles.weekDay}>{day}</div>))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                const daySchedules = getSchedulesForDate(day);
                return (
                  <div
                    key={day?.toISOString() || `empty-${index}`}
                    className={`${styles.dayCell} ${!day ? styles.emptyCell : ''} ${isToday(day) ? styles.today : ''} ${isWeekend(day) ? styles.weekend : ''}`}
                  >
                    {day && (
                      <>
                        <div className={styles.dayNumber}>{day.getDate()}</div>
                        {daySchedules.length > 0 && (
                          <div className={styles.dayContent}>
                            {daySchedules.slice(0, 3).map((item) => {
                              const info = getStatusInfo(item.status);
                              return (
                                <div key={getScheduleKey(item)} className={`${styles.appointmentBadge} ${info.cls}`}>
                                  <div className={styles.aptTime}>
                                    {item.startTime || '--:--'} - {item.endTime || '--:--'}
                                  </div>
                                  <div className={styles.aptCustomer}>{item.shiftName || info.text}</div>
                                </div>
                              );
                            })}
                            {daySchedules.length > 3 && (
                              <div className={styles.moreCount}>+{daySchedules.length - 3} ca</div>
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

      {!loading && viewMode === 'list' && (
        <div className={styles.tableCard}>
          {filteredSchedules.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyTitle}>Không có ca làm nào</div>
              <div className={styles.emptyMessage}>Thử đổi tháng, bộ lọc hoặc từ khóa tìm kiếm.</div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Thứ</th>
                  <th>Ca làm</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((item) => {
                  const info = getStatusInfo(item.status);
                  return (
                    <tr key={getScheduleKey(item)}>
                      <td style={{ fontWeight: '600', color: '#1E90FF' }}>{item.date || '-'}</td>
                      <td>{formatDayOfWeek(item.dayOfWeek)}</td>
                      <td>{item.shiftName || '-'}</td>
                      <td>{item.startTime || '-'}</td>
                      <td>{item.endTime || '-'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${info.cls}`}>{info.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusPending}`}></span><span>Có lịch / chưa check-in</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusConfirmed}`}></span><span>Đã xác nhận</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCheckedIn}`}></span><span>Đã chấm công</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusInProgress}`}></span><span>Muộn / về sớm</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCancelled}`}></span><span>Nghỉ / vắng</span></div>
        </div>
      </div>
    </div>
  );
}
