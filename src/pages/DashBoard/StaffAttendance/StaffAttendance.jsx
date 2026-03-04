import { useState, useEffect } from 'react';
import styles from './StaffAttendance.module.css';
import { fetchStaffAttendance } from '../../../services/staffService.js';

// Mock data when API is not available - matching DB structure exactly
const mockAttendanceData = [
  { idstaff_attendance: 1, staff_id: 1, attendance_date: '2024-03-01', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-01 08:00:00', updated_at: '2024-03-01 17:30:00' },
  { idstaff_attendance: 2, staff_id: 1, attendance_date: '2024-03-02', morning_status: 'LATE', afternoon_status: 'PRESENT', created_at: '2024-03-02 08:15:00', updated_at: '2024-03-02 17:30:00' },
  { idstaff_attendance: 3, staff_id: 1, attendance_date: '2024-03-03', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-03 08:00:00', updated_at: '2024-03-03 17:30:00' },
  { idstaff_attendance: 4, staff_id: 1, attendance_date: '2024-03-04', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-04 08:00:00', updated_at: '2024-03-04 17:30:00' },
  { idstaff_attendance: 5, staff_id: 1, attendance_date: '2024-03-05', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-05 08:00:00', updated_at: '2024-03-05 17:30:00' },
  { idstaff_attendance: 6, staff_id: 1, attendance_date: '2024-03-06', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-06 08:00:00', updated_at: '2024-03-06 17:30:00' },
  { idstaff_attendance: 7, staff_id: 1, attendance_date: '2024-03-07', morning_status: 'OFF', afternoon_status: 'OFF', created_at: '2024-03-07 00:00:00', updated_at: '2024-03-07 00:00:00' },
  { idstaff_attendance: 8, staff_id: 1, attendance_date: '2024-03-08', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-08 08:00:00', updated_at: '2024-03-08 17:30:00' },
  { idstaff_attendance: 9, staff_id: 1, attendance_date: '2024-03-09', morning_status: 'LATE', afternoon_status: 'PRESENT', created_at: '2024-03-09 08:10:00', updated_at: '2024-03-09 17:30:00' },
  { idstaff_attendance: 10, staff_id: 1, attendance_date: '2024-03-10', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-10 08:00:00', updated_at: '2024-03-10 17:30:00' },
  { idstaff_attendance: 11, staff_id: 1, attendance_date: '2024-03-11', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-11 08:00:00', updated_at: '2024-03-11 17:30:00' },
  { idstaff_attendance: 12, staff_id: 1, attendance_date: '2024-03-12', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-12 08:00:00', updated_at: '2024-03-12 17:30:00' },
  { idstaff_attendance: 13, staff_id: 1, attendance_date: '2024-03-13', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-13 08:00:00', updated_at: '2024-03-13 17:30:00' },
  { idstaff_attendance: 14, staff_id: 1, attendance_date: '2024-03-14', morning_status: 'ABSENT', afternoon_status: 'ABSENT', created_at: '2024-03-14 00:00:00', updated_at: '2024-03-14 00:00:00' },
  { idstaff_attendance: 15, staff_id: 1, attendance_date: '2024-03-15', morning_status: 'PRESENT', afternoon_status: 'PRESENT', created_at: '2024-03-15 08:00:00', updated_at: '2024-03-15 17:30:00' },
];

const StaffAttendance = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [staffInfo, setStaffInfo] = useState({
    id: null,
    name: '',
    position: '',
    avatar: '👤'
  });

  // Get status display info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'PRESENT':
        return { text: 'Co mat', className: styles.statusPresent };
      case 'LATE':
        return { text: 'Muon', className: styles.statusLate };
      case 'ABSENT':
        return { text: 'Vang', className: styles.statusAbsent };
      case 'OFF':
        return { text: 'Nghi', className: styles.statusOff };
      case 'NOT_YET':
        return { text: 'Chua diem', className: styles.statusNotYet };
      default:
        return { text: status, className: '' };
    }
  };

  // Transform API response to display format
  const transformAttendanceData = (data) => {
    return data.map((item, index) => {
      // Backend returns: attendanceDate, morningStatus, afternoonStatus
      // Convert to format matching our display needs
      return {
        idstaff_attendance: index + 1,
        staff_id: staffInfo.id || 1,
        attendance_date: item.attendanceDate, // Backend uses attendanceDate (camelCase)
        morning_status: item.morningStatus, // Backend uses morningStatus (camelCase)
        afternoon_status: item.afternoonStatus, // Backend uses afternoonStatus (camelCase)
        created_at: `${item.attendanceDate} 08:00:00`,
        updated_at: `${item.attendanceDate} 17:30:00`,
      };
    });
  };

  // Fetch attendance data on mount
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        
        // Try to get staff token from localStorage
        const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
        
        if (!token) {
          console.warn('No token found, using mock data');
          setAttendanceData(mockAttendanceData);
          setStaffInfo({
            id: '1',
            name: 'Nguyen Van A',
            position: 'Nhan vien',
            avatar: '👤'
          });
          setLoading(false);
          return;
        }
        
        // Get staffId from localStorage or use default
        const staffId = localStorage.getItem('staffId') || '1';
        
        console.log('Fetching attendance for staffId:', staffId);
        
        const response = await fetchStaffAttendance(staffId, token);
        
        console.log('API Response:', response);

        if (response && response.success && response.data) {
          const attendanceList = Array.isArray(response.data) ? response.data : [];
          
          if (attendanceList.length > 0) {
            const transformedData = transformAttendanceData(attendanceList);
            setAttendanceData(transformedData);
            console.log('Loaded attendance data:', transformedData);
          } else {
            console.warn('No attendance data found, using mock data');
            setAttendanceData(mockAttendanceData);
          }

          // Set staff info if available
          setStaffInfo({
            id: staffId,
            name: localStorage.getItem('staffName') || 'Nhan vien',
            position: localStorage.getItem('staffPosition') || 'Nhan vien',
            avatar: '👤'
          });
        } else {
          console.warn('Invalid API response, using mock data');
          setAttendanceData(mockAttendanceData);
          setStaffInfo({
            id: staffId,
            name: 'Nguyen Van A',
            position: 'Nhan vien',
            avatar: '👤'
          });
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
        console.error('Error details:', err.message);
        
        // Use mock data when API fails
        setAttendanceData(mockAttendanceData);
        setStaffInfo({
          id: '1',
          name: 'Nguyen Van A',
          position: 'Nhan vien',
          avatar: '👤'
        });
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

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

  const getAttendanceForDate = (date) => {
    if (!date) return null;
    const dateStr = formatDate(date);
    return attendanceData.find(a => a.attendance_date === dateStr);
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

  const getDayStatusClass = (attendance) => {
    if (!attendance) return '';
    if (attendance.morning_status === 'ABSENT' || attendance.afternoon_status === 'ABSENT') {
      return styles.statusAbsent;
    }
    if (attendance.morning_status === 'LATE' || attendance.afternoon_status === 'LATE') {
      return styles.statusLate;
    }
    if (attendance.morning_status === 'OFF' || attendance.afternoon_status === 'OFF') {
      return styles.statusOff;
    }
    if (attendance.morning_status === 'PRESENT' || attendance.afternoon_status === 'PRESENT') {
      return styles.statusPresent;
    }
    return styles.statusNotYet;
  };

  // Statistics based on DB fields
  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter(a => a.morning_status === 'PRESENT' || a.afternoon_status === 'PRESENT').length;
  const lateDays = attendanceData.filter(a => a.morning_status === 'LATE' || a.afternoon_status === 'LATE').length;
  const absentDays = attendanceData.filter(a => a.morning_status === 'ABSENT' || a.afternoon_status === 'ABSENT').length;
  const offDays = attendanceData.filter(a => a.morning_status === 'OFF' || a.afternoon_status === 'OFF').length;

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const filteredAttendance = filterStatus === 'all' 
    ? attendanceData 
    : attendanceData.filter(a => a.morning_status === filterStatus || a.afternoon_status === filterStatus);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Dang tai du lieu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.staffAvatar}>{staffInfo.avatar}</div>
          <div className={styles.staffInfo}>
            <h1 className={styles.title}>Diem danh cua toi</h1>
            <p className={styles.subtitle}>
              {staffInfo.name || 'Nhan vien'} - {staffInfo.position} - ID: {staffInfo.id}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton}>Xuat bao cao</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalDays}</div>
            <div className={styles.statLabel}>Tong ngay</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{presentDays}</div>
            <div className={styles.statLabel}>Co mat</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>!</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{lateDays}</div>
            <div className={styles.statLabel}>Muon</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statIcon}>✗</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{absentDays}</div>
            <div className={styles.statLabel}>Vang mat</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statIcon}>○</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{offDays}</div>
            <div className={styles.statLabel}>Nghi</div>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewButton} ${viewMode === 'calendar' ? styles.active : ''}`} onClick={() => setViewMode('calendar')}>📅 Lich</button>
            <button className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`} onClick={() => setViewMode('list')}>📋 Danh sach</button>
          </div>
          <div className={styles.monthNavigation}>
            <button className={styles.navButton} onClick={goToPreviousMonth}>◀ Thang truoc</button>
            <button className={styles.currentButton} onClick={goToCurrentMonth}>{monthName}</button>
            <button className={styles.navButton} onClick={goToNextMonth}>Thang sau ▶</button>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Tat ca</option>
            <option value="PRESENT">Co mat</option>
            <option value="LATE">Muon</option>
            <option value="ABSENT">Vang mat</option>
            <option value="OFF">Nghi</option>
            <option value="NOT_YET">Chua diem</option>
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
                const attendance = getAttendanceForDate(day);
                const isCurrentDay = isToday(day);
                const isWeekendDay = isWeekend(day);
                return (
                  <div key={index} className={`${styles.dayCell} ${!day ? styles.emptyCell : ''} ${isCurrentDay ? styles.today : ''} ${isWeekendDay ? styles.weekend : ''} ${attendance ? getDayStatusClass(attendance) : ''}`}>
                    {day && (
                      <>
                        <div className={styles.dayNumber}>{day.getDate()}</div>
                        {attendance && (
                          <div className={styles.dayContent}>
                            <div className={styles.dayStatus}>
                              <span className={styles.statusBadge}>{getStatusInfo(attendance.morning_status).text}</span>
                            </div>
                            <div className={styles.dayStatus}>
                              <span className={styles.statusBadge}>{getStatusInfo(attendance.afternoon_status).text}</span>
                              </div>
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
            <div className={styles.listHeaderCell}>Ngay</div>
            <div className={styles.listHeaderCell}>Gio vao (sang)</div>
            <div className={styles.listHeaderCell}>Gio ra (chieu)</div>
            <div className={styles.listHeaderCell}>Trang thai sang</div>
            <div className={styles.listHeaderCell}>Trang thai chieu</div>
          </div>
          <div className={styles.listBody}>
            {filteredAttendance.map((record, index) => (
              <div key={index} className={`${styles.listRow} ${getDayStatusClass(record)}`}>
                <div className={styles.listCell}><strong>{new Date(record.attendance_date).toLocaleDateString('vi-VN')}</strong></div>
                <div className={styles.listCell}>{record.created_at ? record.created_at.split(' ')[1]?.substring(0, 5) : '-'}</div>
                <div className={styles.listCell}>{record.updated_at ? record.updated_at.split(' ')[1]?.substring(0, 5) : '-'}</div>
                <div className={styles.listCell}>
                  <span className={styles.statusBadge}>{getStatusInfo(record.morning_status).text}</span>
                </div>
                <div className={styles.listCell}>
                  <span className={styles.statusBadge}>{getStatusInfo(record.afternoon_status).text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chu thich:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusPresent}`}></span><span>Co mat</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusLate}`}></span><span>Muon</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusAbsent}`}></span><span>Vang mat</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusOff}`}></span><span>Nghi</span></div>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;
