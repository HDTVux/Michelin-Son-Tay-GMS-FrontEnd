import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import ChangePassword from '../../components/ChangePassword/ChangePassword';
import './StaffChangePassword.css';

const StaffChangePassword = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    try {
      // TODO: Gọi API đổi mật khẩu cho nhân viên
      // const response = await changeStaffPassword({
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Đổi mật khẩu thành công!');
      navigate('/staff-profile');
    } catch (error) {
      alert('Đổi mật khẩu thất bại. Vui lòng thử lại.');
      console.error('Error changing password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/staff-profile');
  };

  return (
    <div className="staffChangePasswordPage">
      <div className="staffChangePasswordContainer">
        <ChangePassword
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          backLink="/staff-profile"
          backLinkText="Quay lại hồ sơ nhân viên"
          title="Đổi mật khẩu"
          isLoading={isLoading}
          showHeader={true}
        />
      </div>
    </div>
  );
};

export default StaffChangePassword;
