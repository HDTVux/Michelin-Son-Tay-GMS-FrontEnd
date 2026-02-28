import { useState } from 'react';
import styles from './DailySchedule.module.css';

const DailySchedule = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');

  // Tạo danh sách 7 ngày trong tuần
  const getWeekDays = (startDate) => {
    const days = [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);

  // Khung giờ từ 07:00 đến 20:00 (30 phút/slot)
  const timeSlots = [];
  for (let hour = 7; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Dữ liệu mẫu lịch hẹn
  const appointments = [
    {
      id: 1,
      customerName: 'Nguyễn Văn A',
      phone: '0912-345-678',
      service: 'Thay lốp xe',
      date: new Date(2023, 9, 23),
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
      date: new Date(2023, 9, 23),
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
      date: new Date(2023, 9, 24),
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
      date: new Date(2023, 9, 25),
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
      date: new Date(2023, 9, 26),
      startTime: '16:00',
      endTime: '17:00',
      status: 'confirmed',
      note: 'Khách hàng VIP'
    }
  ];

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    setCurrentWeekStart(new Date());
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const getDayName = (date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Lọc appointments theo ngày
  const getAppointmentsForDay = (date) => {
    return appointments.filter(apt => 
      apt.date.toDateString() === date.toDateString()
    );
  };

  // Tính vị trí và chiều cao của appointment trong lịch
  const getAppointmentStyle = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = (startHour - 7) * 60 + startMin;
    const endMinutes = (endHour - 7) * 60 + endMin;
    const duration = endMinutes - startMinutes;
    
    const slotHeight = 60; // px per 30 min
    const top = (startMinutes / 30) * slotHeight;
    const height = (duration / 30) * slotHeight - 4;
    
    return { top: `${top}px`, height: `${height}px` };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return styles.statusConfirmed;
      case 'pending': return styles.statusPending;
      case 'completed': return styles.statusCompleted;
      case 'cancelled': return styles.statusCancelled;
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'pending': return 'Chờ xác nhận';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Lịch làm việc của tuần</h1>
          <p className={styles.subtitle}>Quản lý và theo dõi lịch hẹn hàng ngày</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.weekNavigation}>
            <button className={styles.navButton} onClick={goToPreviousWeek}>
              ← Tuần trước
            </button>
            <button className={styles.todayButton} onClick={goToToday}>
              Hôm nay
            </button>
            <button className={styles.navButton} onClick={goToNextWeek}>
              Tuần sau →
            </button>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select 
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
          >
            <option value="all">Tất cả dịch vụ</option>
            <option value="tire">Thay lốp xe</option>
            <option value="maintenance">Bảo dưỡng</option>
            <option value="brake">Kiểm tra phanh</option>
            <option value="oil">Thay dầu</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.statusPending}`}></span>
          <span>Chờ xác nhận</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.statusConfirmed}`}></span>
          <span>Đã xác nhận</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.statusCompleted}`}></span>
          <span>Hoàn thành</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.statusCancelled}`}></span>
          <span>Đã hủy</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarWrapper}>
        <div className={styles.calendar}>
          {/* Time column */}
          <div className={styles.timeColumn}>
            <div className={styles.timeHeader}></div>
            {timeSlots.map((time) => (
              <div key={time} className={styles.timeSlot}>
                {time}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className={styles.dayColumn}>
              <div className={`${styles.dayHeader} ${isToday(day) ? styles.todayHeader : ''}`}>
                <div className={styles.dayName}>{getDayName(day)}</div>
                <div className={styles.dayDate}>{formatDate(day)}</div>
              </div>
              
              <div className={styles.dayContent}>
                {timeSlots.map((time, timeIndex) => (
                  <div 
                    key={timeIndex} 
                    className={`${styles.timeCell} ${isToday(day) ? styles.todayCell : ''}`}
                  ></div>
                ))}
                
                {/* Appointments */}
                <div className={styles.appointmentsLayer}>
                  {getAppointmentsForDay(day).map((apt) => (
                    <div
                      key={apt.id}
                      className={`${styles.appointment} ${getStatusColor(apt.status)}`}
                      style={getAppointmentStyle(apt.startTime, apt.endTime)}
                    >
                      <div className={styles.appointmentTime}>
                        {apt.startTime} - {apt.endTime}
                      </div>
                      <div className={styles.appointmentCustomer}>
                        {apt.customerName}
                      </div>
                      <div className={styles.appointmentPhone}>
                        {apt.phone}
                      </div>
                      <div className={styles.appointmentService}>
                        {apt.service}
                      </div>
                      {apt.note && (
                        <div className={styles.appointmentNote}>
                          📝 {apt.note}
                        </div>
                      )}
                      <div className={styles.appointmentStatus}>
                        {getStatusText(apt.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className={styles.footer}>
        <button className={styles.backButton} onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <div className={styles.footerInfo}>
          <span>Tổng số lịch hẹn: <strong>{appointments.length}</strong></span>
          <span className={styles.separator}>•</span>
          <span>Đã xác nhận: <strong>{appointments.filter(a => a.status === 'confirmed').length}</strong></span>
          <span className={styles.separator}>•</span>
          <span>Chờ xác nhận: <strong>{appointments.filter(a => a.status === 'pending').length}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default DailySchedule;
