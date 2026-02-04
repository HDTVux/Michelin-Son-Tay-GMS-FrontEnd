import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ManageProfile.css';
import './ManageProfile.header.css';
import './ManageProfile.avatar.css';
import './ManageProfile.form.css';
import './ManageProfile.footer.css';

const ManageProfile = () => {
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
          {/* Ảnh đại diện + thông tin cá nhân */}
          <section className="avatarSection">
            <h2 className="sectionTitle">Thông tin cá nhân</h2>
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
