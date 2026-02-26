import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './UserProfile.module.css';
import headerStyles from './UserProfile.header.module.css';
import infoStyles from './UserProfile.personalInfo.module.css';
import statsStyles from './UserProfile.stats.module.css';
import actionsStyles from './UserProfile.quickActions.module.css';

const UserProfile = () => {
  useScrollToTop();
  const [userInfo] = useState({
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'user@example.com',
    gender: 'Nam',
    avatar: null
  });

  const [stats] = useState({
    totalServices: 15,
    totalAmount: 8500000
  });

  const quickActions = [
    { id: 0, icon: '📅', title: 'Lịch hẹn của tôi', description: 'Xem và quản lý các lịch hẹn đã đặt', link: '/my-bookings' },
    { id: 1, icon: '📋', title: 'Xem lịch sử dịch vụ', description: 'Xem danh sách các dịch vụ đã sử dụng', link: '/service-history' },
    { id: 2, icon: '🛡️', title: 'Tra cứu bảo hành', description: 'Tra cứu thông tin bảo hành theo xe / dịch vụ', link: '/warranty' },
    { id: 3, icon: '🎁', title: 'Ưu đãi dành riêng cho tôi', description: 'Xem các ưu đãi cá nhân hóa của bạn', link: '/promotions' },
    { id: 4, icon: '🔗', title: 'Liên kết tài khoản', description: 'Liên kết tài khoản Zalo, Google', link: '/linked-accounts' },
    { id: 5, icon: '🔒', title: 'Đổi mật khẩu', description: 'Thay đổi mật khẩu tài khoản', link: '/account-security' }
  ];

  return (
    <div className={styles['user-profile-page']}>
      <div className={styles['profile-container']}>
        <div className={headerStyles['header']}>
          <h1 className={headerStyles['title']}>Thông tin cá nhân</h1>
          <Link to="/" className={headerStyles['back-button']}>← Quay lại trang chủ</Link>
        </div>
        <section className={infoStyles['personal-info-section']}>
          <div className={infoStyles['info-card']}>
            <div className={infoStyles['avatar-container']}>
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt="Avatar" className={infoStyles['avatar-image']} />
              ) : (
                <div className={infoStyles['avatar-placeholder']}>
                  <span className={infoStyles['avatar-icon']}>👤</span>
                </div>
              )}
            </div>
            <div className={infoStyles['info-details']}>
              <div className={infoStyles['info-header']}>
                <h2 className={infoStyles['user-name']}>{userInfo.name}</h2>
                <Link to="/manage-profile" className={infoStyles['edit-button']}>✏️ Chỉnh sửa</Link>
              </div>
              <div className={infoStyles['info-row']}>
                <span className={infoStyles['info-label']}>Số điện thoại:</span>
                <span className={infoStyles['info-value']}>{userInfo.phone}</span>
              </div>
              <div className={infoStyles['info-row']}>
                <span className={infoStyles['info-label']}>Email:</span>
                <span className={infoStyles['info-value']}>{userInfo.email}</span>
              </div>
              <div className={infoStyles['info-row']}>
                <span className={infoStyles['info-label']}>Giới tính:</span>
                <span className={infoStyles['info-value']}>{userInfo.gender}</span>
              </div>
            </div>
          </div>
        </section>
        <section className={statsStyles['stats-section']}>
          <h2 className={statsStyles['section-title']}>Thống kê sử dụng dịch vụ</h2>
          <div className={statsStyles['stats-grid']}>
            <div className={`${statsStyles['stat-card']} ${statsStyles['white']}`}>
              <div className={statsStyles['stat-icon']}>📊</div>
              <div className={statsStyles['stat-label']}>Tổng số lần sử dụng dịch vụ</div>
              <div className={`${statsStyles['stat-value']} ${statsStyles['blue']}`}>{stats.totalServices}</div>
            </div>
            <div className={`${statsStyles['stat-card']} ${statsStyles['blue']}`}>
              <div className={statsStyles['stat-icon']}>💰</div>
              <div className={statsStyles['stat-label']}>Tổng tiền tích lũy</div>
              <div className={`${statsStyles['stat-value']} ${statsStyles['white']}`}>{stats.totalAmount.toLocaleString('vi-VN')} ₫</div>
            </div>
          </div>
        </section>
        <section className={actionsStyles['quick-actions-section']}>
          <h2 className={statsStyles['section-title']}>Thao tác nhanh</h2>
          <div className={actionsStyles['actions-grid']}>
            {quickActions.map((action) => (
              <Link key={action.id} to={action.link} className={actionsStyles['action-card']}>
                <div className={actionsStyles['action-icon']}>{action.icon}</div>
                <h3 className={actionsStyles['action-title']}>{action.title}</h3>
                <p className={actionsStyles['action-description']}>{action.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserProfile;
