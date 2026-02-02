import { useState } from 'react';
import { Link } from 'react-router-dom';
import './UserProfile.css';
import './UserProfile.header.css';
import './UserProfile.personalInfo.css';
import './UserProfile.stats.css';
import './UserProfile.quickActions.css';

const UserProfile = () => {
  // Dữ liệu mẫu - sau này sẽ lấy từ API hoặc context
  const [userInfo] = useState({
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'user@example.com',
    gender: 'Nam',
    avatar: null // null hoặc URL ảnh
  });

  const [stats] = useState({
    totalServices: 15,
    totalAmount: 8500000
  });

  const quickActions = [
    {
      id: 0,
      icon: '📅',
      title: 'Lịch hẹn của tôi',
      description: 'Xem và quản lý các lịch hẹn đã đặt',
      link: '/my-bookings'
    },
    {
      id: 1,
      icon: '📋',
      title: 'Xem lịch sử dịch vụ',
      description: 'Xem danh sách các dịch vụ đã sử dụng',
      link: '/service-history'
    },
    {
      id: 2,
      icon: '🛡️',
      title: 'Tra cứu bảo hành',
      description: 'Tra cứu thông tin bảo hành theo xe / dịch vụ',
      link: '/warranty'
    },
    {
      id: 3,
      icon: '🎁',
      title: 'Ưu đãi dành riêng cho tôi',
      description: 'Xem các ưu đãi cá nhân hóa của bạn',
      link: '/promotions'
    },
    {
      id: 4,
      icon: '🔗',
      title: 'Liên kết tài khoản',
      description: 'Liên kết tài khoản Zalo, Google',
      link: '/link-account'
    },
    {
      id: 5,
      icon: '🔒',
      title: 'Đổi mật khẩu',
      description: 'Thay đổi mật khẩu tài khoản',
      link: '/change-password'
    }
  ];

  return (
    <div className="userProfilePage">
      <div className="profileContainer">
        {/* Header với nút quay lại */}
        <div className="profileHeader">
          <h1 className="profileTitle">Thông tin cá nhân</h1>
          <Link to="/" className="backButton">
            ← Quay lại trang chủ
          </Link>
        </div>

        {/* Thông tin cá nhân */}
        <section className="personalInfoSection">
          <div className="infoCard">
            <div className="avatarContainer">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt="Avatar" className="avatarImage" />
              ) : (
                <div className="avatarPlaceholder">
                  <span className="avatarIcon">👤</span>
                </div>
              )}
            </div>
            <div className="infoDetails">
              <div className="infoHeader">
                <h2 className="userName">{userInfo.name}</h2>
                <Link to="/manage-profile" className="editButton">
                  ✏️ Chỉnh sửa
                </Link>
              </div>
              <div className="infoRow">
                <span className="infoLabel">Số điện thoại:</span>
                <span className="infoValue">{userInfo.phone}</span>
              </div>
              <div className="infoRow">
                <span className="infoLabel">Email:</span>
                <span className="infoValue">{userInfo.email}</span>
              </div>
              <div className="infoRow">
                <span className="infoLabel">Giới tính:</span>
                <span className="infoValue">{userInfo.gender}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Thống kê sử dụng dịch vụ */}
        <section className="statsSection">
          <h2 className="sectionTitle">Thống kê sử dụng dịch vụ</h2>
          <div className="statsGrid">
            <div className="statCard white">
              <div className="statIcon">📊</div>
              <div className="statLabel">Tổng số lần sử dụng dịch vụ</div>
              <div className="statValue blue">{stats.totalServices}</div>
            </div>
            <div className="statCard blue">
              <div className="statIcon">💰</div>
              <div className="statLabel">Tổng tiền tích lũy</div>
              <div className="statValue white">
                {stats.totalAmount.toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </div>
        </section>

        {/* Thao tác nhanh */}
        <section className="quickActionsSection">
          <h2 className="sectionTitle">Thao tác nhanh</h2>
          <div className="actionsGrid">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                to={action.link}
                className="actionCard"
              >
                <div className="actionIcon">{action.icon}</div>
                <h3 className="actionTitle">{action.title}</h3>
                <p className="actionDescription">{action.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserProfile;
