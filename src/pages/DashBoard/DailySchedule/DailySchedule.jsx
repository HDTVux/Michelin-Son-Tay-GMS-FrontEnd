import { useState } from 'react';
import styles from './DailySchedule.module.css';

const DailySchedule = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('calendar');

  // Mock data - lịch hẹn mẫu
  const mockAppointments = [
    {
      id: 1,
      customerName: 'Nguyễn Văn A',
      phone: '0912-345-678',
      service: 'Thay lốp xe',
      date: '2024-03-02',
      startTime: '07:00',
      endTime: '08:00',
      status: 'confirmed',
      note: 'Khách yêu cầu kiểm tra kỹ'
    },
    {
      id: 2,
      customerName: 'Trần Thị B',
      phone: '0987-654-321',
      service: 'Bảo dưỡng định kỳ',
      date: '2024-03-02',
      startTime: '09:00',
      endTime: '10:30',
      status: 'pending',
      note: ''
    },
    {
      id: 3,
      customerName: 'Lê Văn C',
      phone: '0901-234-567',
      service: 'Kiểm tra phanh',
      date: '2024-03-05',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
      note: 'Xe cũ cần kiểm tra kỹ'
    },
    {
      id: 4,
      customerName: 'Phạm Thị D',
      phone: '0938-765-432',
      service: 'Thay dầu động cơ',
      date: '2024-03-08',
      startTime: '14:00',
      endTime: '15:00',
      status: 'completed',
      note: ''
    },
    {
      id: 5,
      customerName: 'Hoàng Văn E',
      phone: '0945-678-901',
      service: 'Cân bằng lốp',
      date: '2024-03-10',
      startTime: '16:00',
      endTime: '17:00',
      status: 'confirmed',
      note: 'Khách hàng VIP'
    },
  ];

  const appointments = mockAppointments;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'confirmed':
        return { text: 'Đã xác nhận', className: styles.statusConfirmed };
      case 'pending':
        return { text: 'Chờ xác nhận', className: styles.statusPending };
      case 'completed':
        return { text: 'Hoàn thành', className: styles.statusCompleted };
      case 'cancelled':
        return { text: 'Đã hủy', className: styles.statusCancelled };
      default:
        return { text: status, className: '' };
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAppointmentsForDate = (date) => {
    if (!date) return [];
    const dateStr = formatDate(date);
    return appointments.filter(a => a.date === dateStr);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Statistics
  const totalAppointments = appointments.length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const filteredAppointments = filterStatus === 'all'
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffAvatar}>📅</div>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Lịch làm việc của tôi</h1>
            <p className={styles.subtitle}>Quản lý và theo dõi lịch hẹn</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton}>Xuất báo cáo</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalAppointments}</div>
            <div className={styles.statLabel}>Tổng lịch hẹn</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{confirmedCount}</div>
            <div className={styles.statLabel}>Đã xác nhận</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{pendingCount}</div>
            <div className={styles.statLabel}>Chờ xác nhận</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statIcon}>✔</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{completedCount}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statIcon}>✗</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{cancelledCount}</div>
            <div className={styles.statLabel}>Đã hủy</div>
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
            <button className={styles.navButton} onClick={goToPreviousMonth}>◀ Tháng trước</button>
            <button className={styles.currentButton} onClick={goToCurrentMonth}>{monthName}</button>
            <button className={styles.navButton} onClick={goToNextMonth}>Tháng sau ▶</button>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {viewMode === 'calendar' && (
        <div className={styles.calendarCard}>
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (<div key={index} className={styles.weekDay}>{day}</div>))}
            </div>
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                const dayAppointments = getAppointmentsForDate(day);
                const isCurrentDay = isToday(day);
                const isWeekendDay = isWeekend(day);
                return (
                  <div key={index} className={`${styles.dayCell} ${!day ? styles.emptyCell : ''} ${isCurrentDay ? styles.today : ''} ${isWeekendDay ? styles.weekend : ''}`}>
                    {day && (
                      <>
                        <div className={styles.dayNumber}>{day.getDate()}</div>
                        {dayAppointments.length > 0 && (
                          <div className={styles.dayContent}>
                            {dayAppointments.slice(0, 3).map((apt) => (
                              <div key={apt.id} className={`${styles.appointmentBadge} ${getStatusInfo(apt.status).className}`}>
                                <div className={styles.aptTime}>{apt.startTime}</div>
                                <div className={styles.aptCustomer}>{apt.customerName}</div>
                              </div>
                            ))}
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

      {viewMode === 'list' && (
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <div className={styles.listHeaderCell}>Ngày</div>
            <div className={styles.listHeaderCell}>Giờ</div>
            <div className={styles.listHeaderCell}>Khách hàng</div>
            <div className={styles.listHeaderCell}>Số điện thoại</div>
            <div className={styles.listHeaderCell}>Dịch vụ</div>
            <div className={styles.listHeaderCell}>Trạng thái</div>
          </div>
          <div className={styles.listBody}>
            {filteredAppointments.map((record) => (
              <div key={record.id} className={styles.listRow}>
                <div className={styles.listCell}><strong>{new Date(record.date).toLocaleDateString('vi-VN')}</strong></div>
                <div className={styles.listCell}>{record.startTime} - {record.endTime}</div>
                <div className={styles.listCell}>{record.customerName}</div>
                <div className={styles.listCell}>{record.phone}</div>
                <div className={styles.listCell}>{record.service}</div>
                <div className={styles.listCell}>
                  <span className={`${styles.statusBadge} ${getStatusInfo(record.status).className}`}>
                    {getStatusInfo(record.status).text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusConfirmed}`}></span><span>Đã xác nhận</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusPending}`}></span><span>Chờ xác nhận</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCompleted}`}></span><span>Hoàn thành</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusCancelled}`}></span><span>Đã hủy</span></div>
        </div>
      </div>
    </div>
  );
};

export default DailySchedule;
