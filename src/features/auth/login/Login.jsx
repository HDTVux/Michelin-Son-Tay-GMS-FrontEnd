import React, { useEffect, useState } from 'react';
import styles from './Login.module.css';
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
      if (Array.isArray(data?.data?.role)) {
        localStorage.setItem('staffRoles', JSON.stringify(data.data.role));
      } else {
        localStorage.removeItem('staffRoles');
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
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* 2. Truyền ảnh vào style inline */}
        <div 
          className={styles.loginImageSection} 
          style={{ 
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${Mascot})` 
          }}
        >
          <div className={styles.logo}>Michellin Sơn Tây</div>
          <div className={styles.imageText}>
            <h2>On the road <br /> and beyond!</h2>
            <div className={styles['pagination-dots']}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={`${styles.dot} ${styles.active}`}></span>
            </div>
          </div>
        </div>

        <div className={styles.loginFormSection}>
          <div className={styles.formHeader}>
            <h2>Chào mừng trở lại</h2>
            <p className={styles.formSubtitle}>Welcome Back</p>
          </div>

          <form onSubmit={handleSubmit}>
            {errors.api && <div className={styles.errorBanner}>{errors.api}</div>}
            {serverMessage && <div className={styles.successBanner}>{serverMessage}</div>}

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Số điện thoại hoặc email</label>
              <input
                type="text"
                name="phone"
                placeholder="Nhập số điện thoại hoặc email"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? styles.error : ''}
              />
              {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Nhập mật khẩu</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPin ? 'text' : 'password'}
                  name="password"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? styles.error : ''}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPin(!showPin)}
                  aria-label="Toggle PIN visibility"
                >
                  {showPin ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
            </div>
            <p className={styles.forgotPassword}>
              Quên mật khẩu?
              <Link to="/forgot-password" className={styles['link-style']}> Quên</Link>
            </p>

            <button 
              type="submit" 
              className={`${styles.btnLogin} ${isLoading ? styles.loading : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className={styles.divider}><span>Hoặc đăng nhập bằng</span></div>

          <div className={styles.socialButtons}>
            <button type="button" className={styles.socialBtn} onClick={handleGoogleLogin}>
              Google
            </button>
            <button type="button" className={styles.socialBtn}>
              Zalo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};