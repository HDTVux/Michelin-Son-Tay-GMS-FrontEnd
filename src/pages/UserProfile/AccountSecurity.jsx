import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import ChangePassword from '../../components/ChangePassword/ChangePassword';
import './ManageProfile.module.css';
import './ManageProfile.header.module.css';

const AccountSecurity = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    try {
      // TODO: Gọi API đổi mật khẩu cho khách hàng
      // const response = await changeCustomerPassword({
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Đổi mật khẩu thành công!');
      navigate('/user-profile');
    } catch (error) {
      alert('Đổi mật khẩu thất bại. Vui lòng thử lại.');
      console.error('Error changing password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/user-profile');
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

        <ChangePassword
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          backLink="/user-profile"
          backLinkText="Về Thông tin cá nhân"
          title="Đổi mật khẩu"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default AccountSecurity;

