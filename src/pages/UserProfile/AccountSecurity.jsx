import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ManageProfile.css';
import './ManageProfile.header.css';
import './ManageProfile.form.css';
import './ManageProfile.footer.css';

const AccountSecurity = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.newPassword && formData.newPassword.length < 8) {
      alert('Mật khẩu phải có tối thiểu 8 ký tự');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    // TODO: gọi API đổi mật khẩu
    alert('Đã cập nhật mật khẩu');
  };

  const handleCancel = () => {
    window.history.back();
  };

  return (
    <div className="manageProfilePage">
      <div className="manageProfileContainer">
        <div className="manageProfileHeader">
          <h1 className="manageProfileTitle">Bảo mật tài khoản</h1>
          <Link to="/user-profile" className="backButton">
            ← Về Thông tin cá nhân
          </Link>
        </div>

        <form onSubmit={handleSave}>
          <section className="securitySection">
            <h2 className="sectionTitle">Đổi mật khẩu</h2>
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

          <div className="formFooter">
            <button type="button" className="btnCancel" onClick={handleCancel}>
              Hủy
            </button>
            <button type="submit" className="btnSave">
              Lưu mật khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountSecurity;

