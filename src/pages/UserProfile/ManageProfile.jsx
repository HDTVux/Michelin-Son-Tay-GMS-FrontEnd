import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './ManageProfile.module.css';
import headerStyles from './ManageProfile.header.module.css';
import avatarStyles from './ManageProfile.avatar.module.css';
import formStyles from './ManageProfile.form.module.css';
import footerStyles from './ManageProfile.footer.module.css';

const ManageProfile = () => {
  useScrollToTop();
  const [formData, setFormData] = useState({
    name: 'Họ tên người dùng',
    email: 'user@example.com',
    gender: 'Nam',
    phone: '0901234567'
  });

  const [avatar, setAvatar] = useState(null);
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

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: Gọi API lưu thông tin
    alert('Đã lưu thông tin thành công');
  };

  const handleCancel = () => {
    // Reset form hoặc quay lại trang trước
    window.history.back();
  };

  return (
    <div className={styles['manage-profile-page']}>
      <div className={styles['manage-profile-container']}>
        {/* Header */}
        <div className={headerStyles['manage-profile-header']}>
          <h1 className={headerStyles['manage-profile-title']}>Cập nhật thông tin cá nhân</h1>
          <Link to="/user-profile" className={headerStyles['back-button']}>
            ← Quay lại trang Thông tin cá nhân
          </Link>
        </div>

        <form onSubmit={handleSave}>
          {/* Ảnh đại diện + thông tin cá nhân */}
          <section className={formStyles['avatar-section']}>
            <div className={avatarStyles['avatar-upload-area']}>
              <div className={avatarStyles['avatar-preview']}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" className={avatarStyles['avatar-preview-image']} />
                ) : (
                  <div className={avatarStyles['avatar-preview-placeholder']}>
                    <span className={avatarStyles['avatar-preview-icon']}>✕</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={avatarStyles['btn-upload']}
                onClick={() => fileInputRef.current?.click()}
              >
                Thay avatar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              {avatar && (
                <button
                  type="button"
                  className={avatarStyles['btn-delete-inline']}
                  onClick={handleDeleteAvatar}
                >
                  Xóa ảnh hiện tại
                </button>
              )}
            </div>
            <p className={avatarStyles['avatar-hint']}>
              Chấp nhận định dạng: JPG, PNG. Dung lượng tối đa: 2MB. Ảnh sẽ được tự động cắt vuông (1:1).
            </p>

            <div className={formStyles['profile-form']}>
              <div className={formStyles['form-group']}>
                <label className={formStyles['form-label']}>Họ và tên</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={formStyles['form-input']}
                  placeholder="Họ tên người dùng"
                />
              </div>
              <div className={formStyles['form-group']}>
                <label className={formStyles['form-label']}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={formStyles['form-input']}
                  placeholder="user@example.com"
                />
              </div>
              <div className={formStyles['form-group']}>
                <label className={formStyles['form-label']}>Số điện thoại</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={formStyles['form-input']}
                  placeholder="0901234567"
                />
              </div>
              <div className={formStyles['form-group']}>
                <label className={formStyles['form-label']}>Giới tính</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={formStyles['form-input']}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
          </section>

          {/* Footer Buttons */}
          <div className={footerStyles['form-footer']}>
            <button type="button" className={footerStyles['btn-cancel']} onClick={handleCancel}>
              Hủy thay đổi
            </button>
            <button type="submit" className={footerStyles['btn-save']}>
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageProfile;
