import { useState } from 'react';
import styles from './StaffAttendance.module.css';

const StaffAttendance = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('calendar'); // calendar or list

  // Mock data - thay bằng API call thực tế
  const staffInfo = {
    id: 'ST001',
    name: 'Nguyễn Văn A',
    position: 'Lễ tân',
    department: 'Dịch vụ khách hàng',
    avatar: '👤'
  };

  const attendanceData = [
    {
      date: '2024-02-01',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-02',
      checkIn: '08:15',
      checkOut: '17:45',
      status: 'late',
      workHours: 9.5,
      note: 'Đến muộn 15 phút'
    },
    {
      date: '2024-02-03',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-05',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-06',
      checkIn: null,
      checkOut: null,
      status: 'absent',
      workHours: 0,
      note: 'Nghỉ phép'
    },
    {
      date: '2024-02-07',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-08',
      checkIn: '08:05',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.4,
      note: ''
    },
    {
      date: '2024-02-09',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-12',
      checkIn: '08:20',
      checkOut: '17:30',
      status: 'late',
      workHours: 9.2,
      note: 'Đến muộn 20 phút'
    },
    {
      date: '2024-02-13',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-14',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-15',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-16',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-19',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    },
    {
      date: '2024-02-20',
      checkIn: '08:00',
      checkOut: '17:30',
      status: 'ontime',
      workHours: 9.5,
      note: ''
    }
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
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

  const getAttendanceForDate = (date) => {
    if (!date) return null;
    const dateStr = formatDate(date);
    return attendanceData.find(a => a.date === dateStr);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'ontime': return styles.statusOntime;
      case 'late': return styles.statusLate;
      case 'absent': return styles.statusAbsent;
      case 'leave': return styles.statusLeave;
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ontime': return 'Đúng giờ';
      case 'late': return 'Muộn';
      case 'absent': return 'Vắng';
      case 'leave': return 'Nghỉ phép';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ontime': return '✓';
      case 'late': return '⚠';
      case 'absent': return '✗';
      case 'leave': return '📅';
      default: return '';
    }
  };

  // Calculate statistics
  const totalDays = attendanceData.length;
  const ontimeDays = attendanceData.filter(a => a.status === 'ontime').length;
  const lateDays = attendanceData.filter(a => a.status === 'late').length;
  const absentDays = attendanceData.filter(a => a.status === 'absent').length;
  const totalWorkHours = attendanceData.reduce((sum, a) => sum + a.workHours, 0);

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const filteredAttendance = filterStatus === 'all' 
    ? attendanceData 
    : attendanceData.filter(a => a.status === filterStatus);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffAvatar}>{staffInfo.avatar}</div>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Điểm danh của tôi</h1>
            <p className={styles.subtitle}>
              {staffInfo.name} • {staffInfo.position} • ID: {staffInfo.id}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton}>
            📊 Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalDays}</div>
            <div className={styles.statLabel}>Tổng ngày làm việc</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{ontimeDays}</div>
            <div className={styles.statLabel}>Đúng giờ</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>⚠</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{lateDays}</div>
            <div className={styles.statLabel}>Đến muộn</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statIcon}>✗</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{absentDays}</div>
            <div className={styles.statLabel}>Vắng mặt</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statIcon}>⏰</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalWorkHours.toFixed(1)}h</div>
            <div className={styles.statLabel}>Tổng giờ làm</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.viewButton} ${viewMode === 'calendar' ? styles.active : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Lịch
            </button>
            <button 
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Danh sách
            </button>
          </div>

          <div className={styles.monthNavigation}>
            <button className={styles.navButton} onClick={goToPreviousMonth}>
              ← Tháng trước
            </button>
            <button className={styles.currentButton} onClick={goToCurrentMonth}>
              {monthName}
            </button>
            <button className={styles.navButton} onClick={goToNextMonth}>
              Tháng sau →
            </button>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <select 
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ontime">Đúng giờ</option>
            <option value="late">Đến muộn</option>
            <option value="absent">Vắng mặt</option>
            <option value="leave">Nghỉ phép</option>
          </select>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className={styles.calendarCard}>
          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
                <div key={index} className={styles.weekDay}>{day}</div>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                const attendance = getAttendanceForDate(day);
                const isCurrentDay = isToday(day);
                const isWeekendDay = isWeekend(day);

                return (
                  <div
                    key={index}
                    className={`
                      ${styles.dayCell}
                      ${!day ? styles.emptyCell : ''}
                      ${isCurrentDay ? styles.today : ''}
                      ${isWeekendDay ? styles.weekend : ''}
                      ${attendance ? getStatusColor(attendance.status) : ''}
                    `}
                  >
                    {day && (
                      <>
                        <div className={styles.dayNumber}>{day.getDate()}</div>
                        {attendance && (
                          <div className={styles.dayContent}>
                            <div className={styles.dayStatus}>
                              {getStatusIcon(attendance.status)}
                            </div>
                            <div className={styles.dayTime}>
                              {attendance.checkIn && `${attendance.checkIn} - ${attendance.checkOut}`}
                            </div>
                            {attendance.workHours > 0 && (
                              <div className={styles.dayHours}>
                                {attendance.workHours}h
                              </div>
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
      {viewMode === 'list' && (
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <div className={styles.listHeaderCell}>Ngày</div>
            <div className={styles.listHeaderCell}>Giờ vào</div>
            <div className={styles.listHeaderCell}>Giờ ra</div>
            <div className={styles.listHeaderCell}>Giờ làm</div>
            <div className={styles.listHeaderCell}>Trạng thái</div>
            <div className={styles.listHeaderCell}>Ghi chú</div>
          </div>

          <div className={styles.listBody}>
            {filteredAttendance.map((record, index) => (
              <div key={index} className={`${styles.listRow} ${getStatusColor(record.status)}`}>
                <div className={styles.listCell}>
                  <strong>{new Date(record.date).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div className={styles.listCell}>{record.checkIn || '-'}</div>
                <div className={styles.listCell}>{record.checkOut || '-'}</div>
                <div className={styles.listCell}>
                  <strong>{record.workHours}h</strong>
                </div>
                <div className={styles.listCell}>
                  <span className={styles.statusBadge}>
                    {getStatusIcon(record.status)} {getStatusText(record.status)}
                  </span>
                </div>
                <div className={styles.listCell}>
                  <span className={styles.noteText}>{record.note || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusOntime}`}></span>
            <span>Đúng giờ</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusLate}`}></span>
            <span>Đến muộn</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusAbsent}`}></span>
            <span>Vắng mặt</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.statusLeave}`}></span>
            <span>Nghỉ phép</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;
