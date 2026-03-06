import { useState, useEffect, useCallback } from 'react';
import styles from './StaffAttendance.module.css';
import { fetchStaffAttendance } from '../../../services/staffService.js';

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
        return { text: 'Có mặt', className: styles.statusPresent };
      case 'LATE':
        return { text: 'Muộn', className: styles.statusLate };
      case 'ABSENT':
        return { text: 'Vắng', className: styles.statusAbsent };
      case 'OFF':
        return { text: 'Nghỉ', className: styles.statusOff };
      case 'NOT_YET':
        return { text: 'Chưa điểm', className: styles.statusNotYet };
      default:
        return { text: status, className: '' };
    }
  };

  // Transform API response to display format
  const transformAttendanceData = useCallback((data) => {
    return data.map((item, index) => {
      // Backend returns: attendanceDate (LocalDate), morningStatus, afternoonStatus
      return {
        idstaff_attendance: index + 1,
        staff_id: staffInfo.id || 1,
        attendance_date: item.attendanceDate, // Format: "2024-03-02"
        morning_status: item.morningStatus, // Enum: NOT_YET, PRESENT, ABSENT, LATE, OFF
        afternoon_status: item.afternoonStatus, // Enum: NOT_YET, PRESENT, ABSENT, LATE, OFF
        created_at: `${item.attendanceDate} 08:00:00`,
        updated_at: `${item.attendanceDate} 17:30:00`,
      };
    });
  }, [staffInfo.id]);

  // Fetch attendance data on mount
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        
        // Try to get staff token from localStorage
        const token = localStorage.getItem('staffToken') || localStorage.getItem('authToken');
        
        console.log('=== DEBUG ATTENDANCE API ===');
        console.log('Token found:', token ? 'YES' : 'NO');
        
        if (!token) {
          console.warn('❌ No token found - Please login first');
          setAttendanceData([]);
          setStaffInfo({
            id: '1',
            name: 'Nhân viên',
            position: 'Nhân viên',
            avatar: '👤'
          });
          setLoading(false);
          return;
        }
        
        // Get staffId from localStorage
        const staffId = localStorage.getItem('staffId') || '2';
        
        console.log('📞 Calling API with staffId:', staffId);
        
        const response = await fetchStaffAttendance(staffId, token);
        
        console.log('✅ API Response received:', response);

        if (response && response.success && response.data) {
          const attendanceList = Array.isArray(response.data) ? response.data : [];
          
          console.log('📊 Attendance records:', attendanceList.length);
          
          if (attendanceList.length > 0) {
            const transformedData = transformAttendanceData(attendanceList);
            setAttendanceData(transformedData);
            console.log('✅ Using REAL data from API:', transformedData.length, 'records');
          } else {
            console.warn('⚠️ API returned empty array - No attendance records');
            setAttendanceData([]);
          }

          // Set staff info if available
          setStaffInfo({
            id: staffId,
            name: localStorage.getItem('staffName') || 'Nhân viên',
            position: localStorage.getItem('staffPosition') || 'Nhân viên',
            avatar: '👤'
          });
        } else {
          console.warn('❌ Invalid API response structure');
          setAttendanceData([]);
        }
      } catch (err) {
        console.error('❌ Error fetching attendance:', err);
        console.error('Error message:', err.message);
        setAttendanceData([]);
      } finally {
        setLoading(false);
        console.log('=== END DEBUG ===');
      }
    };

    loadAttendance();
  }, [transformAttendanceData]);

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
          <p>Đang tải dữ liệu...</p>
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
            <h1 className={styles.title}>Điểm danh của tôi</h1>
            <p className={styles.subtitle}>
              {staffInfo.name || 'Nhân viên'} - {staffInfo.position} - ID: {staffInfo.id}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.exportButton}>Xuất báo cáo</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalDays}</div>
            <div className={styles.statLabel}>Tổng ngày</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{presentDays}</div>
            <div className={styles.statLabel}>Có mặt</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>!</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{lateDays}</div>
            <div className={styles.statLabel}>Muộn</div>
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
          <div className={styles.statIcon}>○</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{offDays}</div>
            <div className={styles.statLabel}>Nghỉ</div>
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
            <option value="PRESENT">Có mặt</option>
            <option value="LATE">Muộn</option>
            <option value="ABSENT">Vắng mặt</option>
            <option value="OFF">Nghỉ</option>
            <option value="NOT_YET">Chưa điểm</option>
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
                  <div key={index} className={`${styles.dayCell} ${!day ? styles.emptyCell : ''} ${isCurrentDay ? styles.today : ''} ${isWeekendDay ? styles.weekend : ''}`}>
                    {day && (
                      <>
                        <div className={styles.dayNumber}>{day.getDate()}</div>
                        {attendance && (
                          <div className={styles.dayContent}>
                            <div className={styles.sessionStatus}>
                              <span className={styles.sessionLabel}>Sáng:</span>
                              <span className={`${styles.statusBadge} ${getStatusInfo(attendance.morning_status).className}`}>
                                {getStatusInfo(attendance.morning_status).text}
                              </span>
                            </div>
                            <div className={styles.sessionStatus}>
                              <span className={styles.sessionLabel}>Chiều:</span>
                              <span className={`${styles.statusBadge} ${getStatusInfo(attendance.afternoon_status).className}`}>
                                {getStatusInfo(attendance.afternoon_status).text}
                              </span>
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
            <div className={styles.listHeaderCell}>Ngày</div>
            <div className={styles.listHeaderCell}>Trạng thái sáng</div>
            <div className={styles.listHeaderCell}>Trạng thái chiều</div>
          </div>
          <div className={styles.listBody}>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((record, index) => (
                <div key={index} className={styles.listRow}>
                  <div className={styles.listCell}><strong>{new Date(record.attendance_date).toLocaleDateString('vi-VN')}</strong></div>
                  <div className={styles.listCell}>
                    <span className={`${styles.statusBadge} ${getStatusInfo(record.morning_status).className}`}>
                      {getStatusInfo(record.morning_status).text}
                    </span>
                  </div>
                  <div className={styles.listCell}>
                    <span className={`${styles.statusBadge} ${getStatusInfo(record.afternoon_status).className}`}>
                      {getStatusInfo(record.afternoon_status).text}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>Chưa có dữ liệu điểm danh</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Chú thích:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusPresent}`}></span><span>Có mặt</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusLate}`}></span><span>Muộn</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusAbsent}`}></span><span>Vắng mặt</span></div>
          <div className={styles.legendItem}><span className={`${styles.legendDot} ${styles.statusOff}`}></span><span>Nghỉ</span></div>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;
