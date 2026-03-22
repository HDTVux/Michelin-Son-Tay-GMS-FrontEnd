import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchStaffDashboard } from '../../../services/staffService.js';
import styles from './StaffDashboard.module.css';

const StaffDashboard = () => {
  useScrollToTop();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data,   setData]   = useState(null);

  // ─── Fetch dashboard ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStaffDashboard()
      .then((resp) => setData(resp?.data || resp))
      .catch((err) => {
        console.error('fetchStaffDashboard error:', err);
        toast.error('Không thể tải dashboard: ' + (err?.message || ''));
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Destructure đúng field backend ────────────────────────────────────────
  const staff           = data?.staff           || {};
  const todayShift      = data?.todayShift      || {};
  const monthlyHours    = data?.monthlyHours    || {};
  const completedServices = data?.completedServices || {};
  const todayTasks      = data?.todayTasks      || [];
  const upcomingSchedule = data?.upcomingSchedule || [];
  const recentAttendance = data?.recentAttendance || [];

  // ─── KPI: tổng hợp từ backend ──────────────────────────────────────────────
  // Backend không có sẵn "todayBookings" → tính từ todayTasks
  const todayBookingCount  = todayTasks.length;
  const pendingBookingCount = todayTasks.filter(t => t.ticketStatus === 'CREATED' || t.ticketStatus === 'PENDING').length;
  const completedCount     = completedServices.count ?? 0;
  const totalHours        = monthlyHours.totalHours ?? 0;
  const recentTaskCount   = recentAttendance.filter(a => a.status === 'PRESENT').length;

  // ─── Status badge ───────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':   return { text: 'Hoàn thành',    className: styles.statusCompleted  };
      case 'CONFIRMED':   return { text: 'Đã xác nhận',  className: styles.statusConfirmed  };
      case 'PENDING':     return { text: 'Chờ xác nhận', className: styles.statusPending   };
      case 'IN_PROGRESS': return { text: 'Đang thực hiện',className: styles.statusPending  };
      case 'CREATED':     return { text: 'Mới tạo',      className: styles.statusPending   };
      case 'PRESENT':     return { text: 'Có mặt',       className: styles.statusCompleted  };
      case 'LATE':        return { text: 'Đi trễ',        className: styles.statusPending   };
      case 'EARLY_LEAVE': return { text: 'Về sớm',        className: styles.statusPending   };
      case 'ABSENT':      return { text: 'Vắng',          className: styles.statusCancelled};
      case 'SCHEDULED':   return { text: 'Đã lên lịch',  className: styles.statusConfirmed  };
      case 'OFF':         return { text: 'Nghỉ',          className: styles.statusCancelled };
      case 'CANCELLED':   return { text: 'Đã hủy',        className: styles.statusCancelled };
      default:            return { text: status, className: '' };
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Bảng điều khiển</h1>
          <p className={styles.subtitle}>
            Xin chào, {staff.fullName || 'Nhân viên'} — {staff.position || ''}
          </p>
        </div>
        <div className={styles.headerDate}>
          <span>
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* KPIs Grid — 6 cards dựa trên backend fields */}
      <div className={styles.kpiGrid}>
        {/* 1. Ca hôm nay */}
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiValue}>
            {todayShift.shiftName || '—'}
          </div>
          <div className={styles.kpiLabel}>
            {todayShift.startTime && todayShift.endTime
              ? `${todayShift.startTime} – ${todayShift.endTime}`
              : 'Không có ca hôm nay'}
          </div>
          {todayShift.dayOfWeek && (
            <div className={styles.kpiSubtext}>{todayShift.dayOfWeek}</div>
          )}
        </div>

        {/* 2. Task hôm nay */}
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <div className={styles.kpiValue}>{todayBookingCount}</div>
          <div className={styles.kpiLabel}>Task hôm nay</div>
          {pendingBookingCount > 0 && (
            <div className={styles.kpiSubtext}>{pendingBookingCount} đang chờ</div>
          )}
        </div>

        {/* 3. Dịch vụ hoàn thành tháng */}
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiValue}>{completedCount}</div>
          <div className={styles.kpiLabel}>Hoàn thành tháng</div>
          {completedServices.month && (
            <div className={styles.kpiSubtext}>{completedServices.month}</div>
          )}
        </div>

        {/* 4. Giờ làm tháng */}
        <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
          <div className={styles.kpiValue}>
            {totalHours > 0 ? `${totalHours} giờ` : '—'}
          </div>
          <div className={styles.kpiLabel}>Giờ làm tháng</div>
          {monthlyHours.month && (
            <div className={styles.kpiSubtext}>{monthlyHours.month}</div>
          )}
        </div>

        {/* 5. Lịch sắp tới */}
        <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
          <div className={styles.kpiValue}>{upcomingSchedule.length}</div>
          <div className={styles.kpiLabel}>Lịch sắp tới</div>
          <div className={styles.kpiSubtext}>Trong tháng</div>
        </div>

        {/* 6. Lượt điểm danh gần đây */}
        <div className={`${styles.kpiCard} ${styles.kpiOrange}`}>
          <div className={styles.kpiValue}>{recentTaskCount}</div>
          <div className={styles.kpiLabel}>Lượt có mặt</div>
          <div className={styles.kpiSubtext}>Gần đây</div>
        </div>
      </div>

      {/* Lịch sắp tới (từ upcomingSchedule backend) */}
      {upcomingSchedule.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Lịch sắp tới</h2>
          </div>
          <div className={styles.recentBookings}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ngày</th>
                  <th>Ca</th>
                  <th>Giờ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSchedule.slice(0, 8).map((item, index) => (
                  <tr key={index}>
                    <td className={styles.sttCell}>{index + 1}</td>
                    <td className={styles.customerCell}>{item.date} ({item.dayOfWeek})</td>
                    <td>{item.shiftName || '—'}</td>
                    <td>
                      {item.startTime && item.endTime
                        ? `${item.startTime} – ${item.endTime}`
                        : '—'}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadge(item.status).className}`}>
                        {item.status === 'SCHEDULED' ? 'Đã lên lịch' :
                         item.status === 'CONFIRMED' ? 'Đã xác nhận' :
                         item.status === 'CANCELLED' ? 'Đã hủy' :
                         item.status === 'OFF' ? 'Nghỉ' : item.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task hôm nay (từ todayTasks backend) */}
      {todayTasks.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Task hôm nay</h2>
            <button className={styles.viewAllBtn} onClick={() => navigate('/technician/my-tasks')}>
              Xem tất cả →
            </button>
          </div>
          <div className={styles.recentBookings}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phiếu</th>
                  <th>Biển số</th>
                  <th>Xe</th>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {todayTasks.slice(0, 10).map((task, index) => (
                  <tr key={task.serviceTicketId || index}>
                    <td className={styles.sttCell}>{index + 1}</td>
                    <td className={styles.customerCell}>{task.ticketCode || '—'}</td>
                    <td>{task.licensePlate || '—'}</td>
                    <td>{[task.vehicleBrand, task.vehicleModel].filter(Boolean).join(' ') || '—'}</td>
                    <td>{task.customerName || '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadge(task.ticketStatus).className}`}>
                        {getStatusBadge(task.ticketStatus).text}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chấm công gần đây (từ recentAttendance backend) */}
      {recentAttendance.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Chấm công gần đây</h2>
          </div>
          <div className={styles.recentBookings}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ngày</th>
                  <th>Ca</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.slice(0, 8).map((att, index) => (
                  <tr key={index}>
                    <td className={styles.sttCell}>{index + 1}</td>
                    <td className={styles.customerCell}>{att.date} ({att.dayOfWeek})</td>
                    <td>{att.shiftType || '—'}</td>
                    <td>{att.checkInTime || '—'}</td>
                    <td>{att.checkOutTime || '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadge(att.status).className}`}>
                        {att.status === 'PRESENT' ? 'Có mặt' :
                         att.status === 'LATE' ? 'Đi trễ' :
                         att.status === 'EARLY_LEAVE' ? 'Về sớm' :
                         att.status === 'ABSENT' ? 'Vắng' : att.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Truy cập nhanh</h2>
        <div className={styles.quickActions}>
          <div className={styles.actionCard} onClick={() => navigate('/booking-request-management')}>
            <div className={styles.actionContent}>
              <h3>Yêu cầu đặt lịch</h3>
              <p>Quản lý yêu cầu đặt lịch từ khách hàng</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/booking-management')}>
            <div className={styles.actionContent}>
              <h3>Lịch hẹn</h3>
              <p>Xem và quản lý lịch hẹn đã xác nhận</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/check-in')}>
            <div className={styles.actionContent}>
              <h3>Check-in</h3>
              <p>Check-in khách hàng khi đến</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/staff-attendance')}>
            <div className={styles.actionContent}>
              <h3>Chấm công</h3>
              <p>Theo dõi giờ làm việc hàng ngày</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/customer-manager')}>
            <div className={styles.actionContent}>
              <h3>Khách hàng</h3>
              <p>Quản lý thông tin khách hàng</p>
            </div>
          </div>
          <div className={styles.actionCard} onClick={() => navigate('/daily-schedule')}>
            <div className={styles.actionContent}>
              <h3>Lịch làm việc</h3>
              <p>Xem lịch làm việc cá nhân</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
