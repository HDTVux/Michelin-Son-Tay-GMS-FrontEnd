import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import Mascot from '../../../assets/Mascot.jpg';
import { loginStaff, getStaffGoogleOAuthUrl } from '../../../services/authService';
import { AUTH_REDIRECT_ERROR_KEY } from '../../../services/apiClient';

function EyeIcon({ closed = false }) {
  if (closed) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4.5 19.5 21" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
        <path d="M9.3 5.4A10.9 10.9 0 0 1 12 5c5.5 0 9.4 4.2 10.5 7-0.5 1.3-1.7 3-3.4 4.4" />
        <path d="M6.7 6.8C4.4 8.1 2.8 10.3 1.5 12 2.7 14.9 6.6 19 12 19c1.7 0 3.2-0.3 4.6-0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1.5 12C2.7 9.1 6.6 5 12 5s9.3 4.1 10.5 7c-1.2 2.9-5.1 7-10.5 7S2.7 14.9 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export default function Login() {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const redirectError =
      typeof globalThis?.sessionStorage?.getItem === 'function'
        ? globalThis.sessionStorage.getItem(AUTH_REDIRECT_ERROR_KEY)
        : '';

    if (redirectError) {
      setErrors((prev) => ({ ...prev, api: redirectError }));
      globalThis.sessionStorage.removeItem(AUTH_REDIRECT_ERROR_KEY);
    }

    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const validatePhoneOrEmail = (value) => {
    if (!value) return 'Số điện thoại hoặc email là bắt buộc';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) return '';
    if (value.replaceAll(/\D/g, '').length < 6) return 'Số điện thoại không hợp lệ';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Mật khẩu là bắt buộc';
    if (value.length < 4) return 'Mật khẩu phải có ít nhất 4 ký tự';
    return '';
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (errors.api) {
      setErrors((prev) => ({ ...prev, api: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    const phoneError = validatePhoneOrEmail(formData.phone);
    const passwordError = validatePassword(formData.password);

    if (phoneError) nextErrors.phone = phoneError;
    if (passwordError) nextErrors.password = passwordError;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setServerMessage('');

    try {
      const data = await loginStaff({
        phone: formData.phone,
        pin: formData.password,
      });

      let roles = Array.isArray(data?.data?.role) ? data.data.role : [];
      const normalizedRoles = roles.map(r => String(r).trim().toUpperCase());
      if (normalizedRoles.includes('WAREHOUSE_MANAGER') || normalizedRoles.includes('ROLE_WAREHOUSE_MANAGER')) {
        if (!normalizedRoles.includes('WAREHOUSE_KEEPER') && !normalizedRoles.includes('ROLE_WAREHOUSE_KEEPER')) {
          roles = [...roles, 'WAREHOUSE_KEEPER'];
        }
      }

      if (data?.data?.token) {
        localStorage.setItem('authToken', data.data.token);
      }
      if (roles.length > 0) {
        localStorage.setItem('staffRoles', JSON.stringify(roles));
      } else {
        localStorage.removeItem('staffRoles');
      }

      const staffProfile = {
        staffId: data?.data?.staffId ?? null,
        fullName: typeof data?.data?.fullName === 'string' ? data.data.fullName : '',
        avatarUrl: typeof data?.data?.avatarUrl === 'string' ? data.data.avatarUrl : '',
        role: roles,
      };

      if (staffProfile.staffId != null || staffProfile.fullName || staffProfile.avatarUrl) {
        localStorage.setItem('staffProfile', JSON.stringify(staffProfile));
      } else {
        localStorage.removeItem('staffProfile');
      }

      setServerMessage(data?.data?.message || data?.message || 'Đăng nhập thành công');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrors({ api: error.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${getStaffGoogleOAuthUrl()}?redirect_uri=${encodeURIComponent(
      `${globalThis.location.origin}/booking-request-management`,
    )}`;
    globalThis.location.href = redirectUrl;
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <div className={styles.loginShell}>
        <div className={styles.loginCard}>
          <section
            className={styles.loginImageSection}
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(10, 24, 43, 0.08), rgba(10, 24, 43, 0.48)), url(${Mascot})`,
            }}
          >
            <div className={styles.panelInner}>
              <div className={styles.brandBadge}>Michelin Sơn Tây</div>
              <div className={styles.heroCopy}>
                <p className={styles.heroLead}>Trung tâm dịch vụ tiêu chuẩn Michelin</p>
                <h1>
                  Sẵn sàng
                  <br />
                  cho mọi
                  <br />
                  hành trình
                </h1>
              </div>
            </div>
          </section>

          <section className={styles.loginFormSection}>
            <div className={styles.panelInner}>
              <div className={styles.formHeader}>
                <p className={styles.formEyebrow}>Đăng nhập nội bộ</p>
                <h2>Chào mừng trở lại</h2>
                <p className={styles.formSubtitle}>Đăng nhập tài khoản nhân viên để tiếp tục làm việc.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.authForm}>
                {errors.api && <div className={styles.errorBanner}>{errors.api}</div>}
                {serverMessage && <div className={styles.successBanner}>{serverMessage}</div>}

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel} htmlFor="phone">
                    Số điện thoại hoặc email
                  </label>
                  <span className={styles.inputIcon} aria-hidden="true">
                    ID
                  </span>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    placeholder="Nhập số điện thoại hoặc email"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? styles.error : ''}
                  />
                  {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel} htmlFor="password">
                    Mật khẩu
                  </label>
                  <div className={styles.passwordWrapper}>
                    <span className={styles.inputIcon} aria-hidden="true">
                      PIN
                    </span>
                    <input
                      type={showPin ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Nhập mật khẩu"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? styles.error : ''}
                    />
                    <button
                      type="button"
                      className={styles.togglePassword}
                      onClick={() => setShowPin((prev) => !prev)}
                      aria-label={showPin ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <EyeIcon closed={showPin} />
                    </button>
                  </div>
                  {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
                </div>

                <p className={styles.forgotPassword}>
                  Quên mật khẩu?
                  <Link to="/forgot-password" className={styles.linkStyle}>
                    {' '}
                    Khôi phục
                  </Link>
                </p>

                <button
                  type="submit"
                  className={`${styles.btnLogin} ${isLoading ? styles.loading : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className={styles.spinner} />
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </button>
              </form>

              <div className={styles.divider}>
                <span>Hoặc tiếp tục bằng</span>
              </div>

              <div className={styles.socialButtons}>
                <button type="button" className={styles.socialBtn} onClick={handleGoogleLogin}>
                  <span className={styles.googleMark} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
                      />
                    </svg>
                  </span>
                  Google
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
