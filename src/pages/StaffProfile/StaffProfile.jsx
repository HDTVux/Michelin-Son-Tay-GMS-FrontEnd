import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './StaffProfile.module.css';

const StaffProfile = () => {
  useScrollToTop();
  // Dữ liệu mẫu - sau này sẽ lấy từ API hoặc context
  const [staffInfo] = useState({
    avatar: null, // null hoặc URL ảnh
    staffCode: 'STF001',
    staffName: 'Nguyễn Văn B',
    gender: 'Nam',
    email: 'nguyenvanb@michelin.com',
    phoneNumber: '0901234567',
    staffRole: 'Kỹ thuật viên',
    staffStatus: 'Đang làm việc'
  });

  const [workStats] = useState({
    totalTickets: 156,
    totalServices: 342,
    totalWorkingHours: 2840,
    averageRating: 4.8
  });

  const quickActions = [
    {
      id: 0,
      icon: '👤',
      title: 'Quản lý thông tin cá nhân',
      description: 'Cập nhật thông tin cá nhân và hồ sơ của bạn',
      link: '/update-staff-profile'
    },
    {
      id: 1,
      icon: '📋',
      title: 'Xem lịch sử thực hiện dịch vụ',
      description: 'Xem chi tiết các dịch vụ bạn đã thực hiện',
      link: '/staff-service-history'
    },
    {
      id: 2,
      icon: '🔒',
      title: 'Đổi mật khẩu',
      description: 'Thay đổi mật khẩu đăng nhập hệ thống',
      link: '/staff-change-password'
    },
    {
      id: 3,
      icon: '🔗',
      title: 'Quản lý liên kết tài khoản đăng nhập',
      description: 'Quản lý các tài khoản SSO và đăng nhập liên kết',
      link: '/staff-manage-sso'
    }
  ];

  return (
    <div className={styles.staffProfilePage}>
      <div className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Thông tin nhân viên</h1>
        <Link to="/dashboard" className={styles.backButton}>
          ← Quay lại Dashboard
        </Link>
      </div>

      <section className={styles.staffInfoSection}>
        <div className={styles.infoCard}>
          <div className={styles.avatarContainer}>
            {staffInfo.avatar ? (
              <img src={staffInfo.avatar} alt="Avatar" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <span>👤</span>
              </div>
            )}
          </div>
          <div className={styles.infoDetails}>
            <div className={styles.infoHeader}>
              <h2 className={styles.staffName}>{staffInfo.staffName}</h2>
              <span className={styles.staffCode}>Mã: {staffInfo.staffCode}</span>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Họ và Tên:</span>
                <span className={styles.infoValue}>{staffInfo.staffName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Mã nhân viên:</span>
                <span className={styles.infoValue}>{staffInfo.staffCode}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Giới tính:</span>
                <span className={styles.infoValue}>{staffInfo.gender}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email nội bộ:</span>
                <span className={styles.infoValue}>{staffInfo.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Số điện thoại:</span>
                <span className={styles.infoValue}>{staffInfo.phoneNumber}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Chức danh / Vai trò:</span>
                <span className={styles.infoValue}>{staffInfo.staffRole}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Trạng thái làm việc:</span>
                <span className={`${styles.infoValue} ${styles.status} ${staffInfo.staffStatus === 'Đang làm việc' ? styles.active : styles.inactive}`}>
                  {staffInfo.staffStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Thống kê cá nhân theo lịch sử làm việc</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🎫</span>
            <div className={styles.statLabel}>Tổng số ticket đã tham gia</div>
            <div className={styles.statValue}>{workStats.totalTickets}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🔧</span>
            <div className={styles.statLabel}>Tổng số dịch vụ đã thực hiện</div>
            <div className={styles.statValue}>{workStats.totalServices}</div>
          </div>
          <div className={`${styles.statCard} ${styles.blue}`}>
            <span className={styles.statIcon}>⏱️</span>
            <div className={styles.statLabel}>Tổng giờ làm việc tích lũy</div>
            <div className={styles.statValue}>
              {workStats.totalWorkingHours.toLocaleString('vi-VN')} giờ
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⭐</span>
            <div className={styles.statLabel}>Đánh giá trung bình từ khách hàng</div>
            <div className={styles.statValue}>
              {workStats.averageRating ? `${workStats.averageRating}/5.0` : 'Chưa có đánh giá'}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Tiện ích nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Link
              key={action.id}
              to={action.link}
              className={styles.actionCard}
            >
              <span className={styles.actionIcon}>{action.icon}</span>
              <h3 className={styles.actionTitle}>{action.title}</h3>
              <p className={styles.actionDescription}>{action.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StaffProfile;
