import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ManageProfile.css';

const ManageProfile = () => {
  const [formData, setFormData] = useState({
    name: 'Họ tên người dùng',
    email: 'user@example.com',
    gender: 'Nam',
    phone: '0901234567',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [avatar, setAvatar] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState({
    google: true,
    zalo: false
  });
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File quá lớn. Vui lòng chọn file nhỏ hơn 2MB');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert('Chỉ chấp nhận file JPG hoặc PNG');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = () => {
    setAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLinkAccount = (provider) => {
    if (provider === 'zalo' && !linkedAccounts.zalo) {
      setLinkedAccounts(prev => ({ ...prev, zalo: true }));
      alert('Đã liên kết tài khoản Zalo');
    }
  };

  const handleUnlinkAccount = (provider) => {
    if (provider === 'google' && linkedAccounts.google) {
      setLinkedAccounts(prev => ({ ...prev, google: false }));
      alert('Đã hủy liên kết tài khoản Google');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Validate password
    if (formData.newPassword && formData.newPassword.length < 8) {
      alert('Mật khẩu phải có tối thiểu 8 ký tự');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    // TODO: Gọi API lưu thông tin
    alert('Đã lưu thông tin thành công');
  };

  const handleCancel = () => {
    // Reset form hoặc quay lại trang trước
    window.history.back();
  };

  return (
    <div className="manageProfilePage">
      <div className="manageProfileContainer">
        {/* Header */}
        <div className="manageProfileHeader">
          <h1 className="manageProfileTitle">Quản lý thông tin cá nhân</h1>
          <Link to="/user-profile" className="backButton">
            ← Quay lại trang Thông tin cá nhân
          </Link>
        </div>

        <form onSubmit={handleSave}>
          {/* Ảnh đại diện */}
          <section className="avatarSection">
            <h2 className="sectionTitle">Ảnh đại diện</h2>
            <div className="avatarUploadArea">
              <div className="avatarPreview">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="avatarPreviewImage" />
                ) : (
                  <div className="avatarPreviewPlaceholder">
                    <span className="avatarPreviewIcon">✕</span>
                  </div>
                )}
              </div>
              <div className="avatarActions">
                <button
                  type="button"
                  className="btnUpload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Tải ảnh mới
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btnDelete"
                  onClick={handleDeleteAvatar}
                  disabled={!avatar}
                >
                  Xóa ảnh
                </button>
              </div>
            </div>
            <p className="avatarHint">
              Chấp nhận định dạng: JPG, PNG. Dung lượng tối đa: 2MB. Ảnh sẽ được tự động cắt vuông (1:1).
            </p>
          </section>

          {/* Thông tin cá nhân */}
          <section className="personalInfoFormSection">
            <h2 className="sectionTitle">Thông tin cá nhân</h2>
            <div className="formGrid">
              <div className="formColumn">
                <div className="formGroup">
                  <label className="formLabel">Họ và tên</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="formInput"
                    placeholder="Họ tên người dùng"
                  />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="formInput"
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <div className="formColumn">
                <div className="formGroup">
                  <label className="formLabel">Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="formInput"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label className="formLabel">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="formInput"
                    placeholder="0901234567"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Bảo mật tài khoản */}
          <section className="securitySection">
            <h2 className="sectionTitle">Bảo mật tài khoản</h2>
            <div className="formGrid">
              <div className="formColumn">
                <div className="formGroup">
                  <label className="formLabel">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="formInput"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>
              </div>
              <div className="formColumn">
                <div className="formGroup">
                  <label className="formLabel">Mật khẩu mới</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="formInput"
                    placeholder="Nhập mật khẩu mới"
                  />
                </div>
              </div>
            </div>
            <div className="formGroup">
              <label className="formLabel">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="formInput"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            <p className="passwordHint">
              Mật khẩu phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt. 
              Mật khẩu mới không được trùng mật khẩu cũ.
            </p>
          </section>

          {/* Liên kết tài khoản */}
          <section className="linkedAccountsSection">
            <h2 className="sectionTitle">Liên kết tài khoản</h2>
            <div className="linkedAccountsList">
              <div className="linkedAccountItem">
                <div className="accountInfo">
                  <div className="accountIcon google">G</div>
                  <div className="accountDetails">
                    <span className="accountName">Google</span>
                    <span className="accountStatus">
                      {linkedAccounts.google ? '(Đã liên kết)' : '(Chưa liên kết)'}
                    </span>
                  </div>
                </div>
                {linkedAccounts.google ? (
                  <button
                    type="button"
                    className="btnUnlink"
                    onClick={() => handleUnlinkAccount('google')}
                  >
                    Hủy liên kết
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btnLink"
                    onClick={() => handleLinkAccount('google')}
                  >
                    Liên kết
                  </button>
                )}
              </div>
              <div className="linkedAccountItem">
                <div className="accountInfo">
                  <div className="accountIcon zalo">💬</div>
                  <div className="accountDetails">
                    <span className="accountName">Zalo</span>
                    <span className="accountStatus">
                      {linkedAccounts.zalo ? '(Đã liên kết)' : '(Chưa liên kết)'}
                    </span>
                  </div>
                </div>
                {linkedAccounts.zalo ? (
                  <button
                    type="button"
                    className="btnUnlink"
                    onClick={() => handleUnlinkAccount('zalo')}
                  >
                    Hủy liên kết
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btnLink"
                    onClick={() => handleLinkAccount('zalo')}
                  >
                    Liên kết
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Footer Buttons */}
          <div className="formFooter">
            <button type="button" className="btnCancel" onClick={handleCancel}>
              Hủy thay đổi
            </button>
            <button type="submit" className="btnSave">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageProfile;
