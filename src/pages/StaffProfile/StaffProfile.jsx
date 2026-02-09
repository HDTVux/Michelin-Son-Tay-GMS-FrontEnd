import { useState } from 'react';
import { Link } from 'react-router-dom';
import './StaffProfile.css';
import './StaffProfile.header.css';

const StaffProfile = () => {
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
    <div className="staffProfilePage">
      <div className="profileContainer">
        {/* Header với nút quay lại Dashboard */}
        <div className="profileHeader">
          <h1 className="profileTitle">Thông tin nhân viên</h1>
          <Link to="/dashboard" className="backButton">
            ← Quay lại Dashboard
          </Link>
        </div>

        {/* Khu vực thông tin cơ bản nhân viên */}
        <section className="staffBasicInfoSection">
          <div className="infoCard">
            <div className="avatarContainer">
              {staffInfo.avatar ? (
                <img src={staffInfo.avatar} alt="Avatar" className="avatarImage" />
              ) : (
                <div className="avatarPlaceholder">
                  <span className="avatarIcon">👤</span>
                </div>
              )}
            </div>
            <div className="infoDetails">
              <div className="infoHeader">
                <h2 className="staffName">{staffInfo.staffName}</h2>
                <span className="staffCode">Mã: {staffInfo.staffCode}</span>
              </div>
              <div className="infoGrid">
                <div className="infoRow">
                  <span className="infoLabel">Giới tính:</span>
                  <span className="infoValue">{staffInfo.gender}</span>
                </div>
                <div className="infoRow">
                  <span className="infoLabel">Email nội bộ:</span>
                  <span className="infoValue">{staffInfo.email}</span>
                </div>
                <div className="infoRow">
                  <span className="infoLabel">Số điện thoại:</span>
                  <span className="infoValue">{staffInfo.phoneNumber}</span>
                </div>
                <div className="infoRow">
                  <span className="infoLabel">Chức danh / Vai trò:</span>
                  <span className="infoValue">{staffInfo.staffRole}</span>
                </div>
                <div className="infoRow">
                  <span className="infoLabel">Trạng thái làm việc:</span>
                  <span className={`infoValue status ${staffInfo.staffStatus === 'Đang làm việc' ? 'active' : 'inactive'}`}>
                    {staffInfo.staffStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Khu vực thông tin công việc và thống kê */}
        <section className="staffWorkSummarySection">
          <h2 className="sectionTitle">Thống kê cá nhân theo lịch sử làm việc</h2>
          <div className="statsGrid">
            <div className="statCard white">
              <div className="statIcon">🎫</div>
              <div className="statLabel">Tổng số ticket đã tham gia</div>
              <div className="statValue blue">{workStats.totalTickets}</div>
            </div>
            <div className="statCard white">
              <div className="statIcon">🔧</div>
              <div className="statLabel">Tổng số dịch vụ đã thực hiện</div>
              <div className="statValue blue">{workStats.totalServices}</div>
            </div>
            <div className="statCard blue">
              <div className="statIcon">⏱️</div>
              <div className="statLabel">Tổng giờ làm việc tích lũy</div>
              <div className="statValue white">
                {workStats.totalWorkingHours.toLocaleString('vi-VN')} giờ
              </div>
            </div>
            <div className="statCard white">
              <div className="statIcon">⭐</div>
              <div className="statLabel">Đánh giá trung bình từ khách hàng</div>
              <div className="statValue blue">
                {workStats.averageRating ? `${workStats.averageRating}/5.0` : 'Chưa có đánh giá'}
              </div>
            </div>
          </div>
        </section>

        {/* Khu vực tiện ích nhanh */}
        <section className="quickActionsSection">
          <h2 className="sectionTitle">Tiện ích nhanh</h2>
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

export default StaffProfile;
