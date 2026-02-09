import React, { useEffect, useState } from 'react';
import './Login.css';
import Mascot from '../../../assets/Mascot.jpg';
import { Link, useNavigate } from 'react-router-dom';
import { loginStaff, getStaffGoogleOAuthUrl } from '../../../services/authService';

export default function Login() {
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Nếu đã có token (login trước đó hoặc sau khi Google callback) thì vào BookingManagement
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/booking-management', { replace: true });
    }
  }, [navigate]);

  const validatePhoneOrEmail = (value) => {
    if (!value) return 'Số điện thoại hoặc email là bắt buộc';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) return '';
    if (value.replace(/\D/g, '').length < 6) return 'Số điện thoại không hợp lệ';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Mật khẩu là bắt buộc';
    if (value.length < 4) return 'Mật khẩu phải có ít nhất 4 ký tự';
    return '';
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    if (errors.api) {
      setErrors((prev) => ({ ...prev, api: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const phoneError = validatePhoneOrEmail(formData.phone);
    const pinError = validatePassword(formData.password);

    if (phoneError) newErrors.phone = phoneError;
    if (pinError) newErrors.password = pinError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setServerMessage('');

    try {
      // Gọi API đăng nhập staff; backend yêu cầu field pin nên map từ password
      const data = await loginStaff({
        phone: formData.phone,
        pin: formData.password,
      });

      if (data?.data?.token) {
        localStorage.setItem('authToken', data.data.token);
      }
      setServerMessage(data?.data?.message || data?.message || 'Đăng nhập thành công');
      navigate('/booking-management', { replace: true });
    } catch (error) {
      setErrors({ api: error.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Lưu ý: backend cần hỗ trợ redirect_uri. Ở đây ưu tiên quay về trang quản lý booking.
    const redirectUrl = `${getStaffGoogleOAuthUrl()}?redirect_uri=${encodeURIComponent(window.location.origin + '/booking-management')}`;
    window.location.href = redirectUrl;
  };

  return (
    <div className="loginContainer">
      <div className="loginCard">
        {/* 2. Truyền ảnh vào style inline */}
        <div 
          className="loginImageSection" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${Mascot})` 
          }}
        >
          <div className="logo">Michellin Sơn Tây</div>
          <div className="imageText">
            <h2>On the road <br /> and beyond!</h2>
            <div className="pagination-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot active"></span>
            </div>
          </div>
        </div>

        <div className="loginFormSection">
          <div className="formHeader">
            <h2>Chào mừng trở lại</h2>
            <p className="formSubtitle">Welcome Back</p>
          </div>

          <form onSubmit={handleSubmit}>
            {errors.api && <div className="errorBanner">{errors.api}</div>}
            {serverMessage && <div className="successBanner">{serverMessage}</div>}

            <div className="inputGroup">
              <label className="inputLabel">Số điện thoại hoặc email</label>
              <input
                type="text"
                name="phone"
                placeholder="Nhập số điện thoại hoặc email"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="errorMessage">{errors.phone}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">Nhập mật khẩu</label>
              <div className="passwordWrapper">
                <input
                  type={showPin ? 'text' : 'password'}
                  name="password"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                />
                <button
                  type="button"
                  className="togglePassword"
                  onClick={() => setShowPin(!showPin)}
                  aria-label="Toggle PIN visibility"
                >
                  {showPin ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="errorMessage">{errors.password}</span>}
            </div>
            <p className="forgotPassword">
              Quên mật khẩu?
              <Link to="/forgot-password" className="link-style"> Quên</Link>
            </p>

            <button 
              type="submit" 
              className={`btnLogin ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="divider"><span>Hoặc đăng nhập bằng</span></div>

          <div className="socialButtons">
            <button type="button" className="socialBtn" onClick={handleGoogleLogin}>
              Google
            </button>
            <button type="button" className="socialBtn">
              Zalo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};