import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Mascot from '../../../assets/Mascot.jpg';
import styles from './ForgotPassword.module.css';
import {
  requestStaffOtp,
  verifyStaffOtp,
  setupStaffPass,
} from '../../../services/authService.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: identifier, 2: otp, 3: reset
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitizeIdentifier = (value) => {
    const trimmed = (value || '').trim();
    if (emailRegex.test(trimmed)) return trimmed;
    return trimmed.replace(/\D/g, '');
  };

  const validateIdentifier = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'Vui lòng nhập Email hoặc Số điện thoại';
    if (emailRegex.test(trimmed)) return '';
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 6) return 'Số điện thoại không hợp lệ';
    return '';
  };

  useEffect(() => {
    if (step !== 2) return undefined;
    const resetT = setTimeout(() => setCountdown(60), 0);
    const timer = setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => { clearTimeout(resetT); clearInterval(timer); };
  }, [step]);

  const resetAll = () => {
    setStep(1);
    setIdentifier('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setCountdown(60);
  };

  const handleIdentifierSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateIdentifier(identifier);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const sanitized = sanitizeIdentifier(identifier);
      await requestStaffOtp(sanitized);
      setOtp('');
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Không thể gửi OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    const cleaned = otp.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const sanitized = sanitizeIdentifier(identifier);
      await verifyStaffOtp(sanitized, cleaned);
      setStep(3);
    } catch (err) {
      setError(err?.message || 'OTP không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    const validationMessage = validateIdentifier(identifier);
    if (validationMessage) {
      setError(validationMessage);
      setStep(1);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const sanitized = sanitizeIdentifier(identifier);
      await requestStaffOtp(sanitized);
      setCountdown(60);
      setOtp('');
    } catch (err) {
      setError(err?.message || 'Không thể gửi lại OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (password.trim().length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const sanitized = sanitizeIdentifier(identifier);
      await setupStaffPass({
        phone: sanitized,
        pin: password,
        confirmPin: confirmPassword,
      });
      window.alert('Đổi mật khẩu thành công');
      resetAll();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.message || 'Không thể đổi mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.fpContainer}>
      <div className={styles.fpCard}>
        <div
          className={styles.fpImageSection}
          style={{
            backgroundImage: `url(${Mascot})`
          }}
        >
          <div className={styles.fpLogo}>Michelin Sơn Tây</div>
          <div className={styles.fpImageText}>
            <h2>On the road <br /> and beyond!</h2>
            <div className={styles['pagination-dots']}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={`${styles.dot} ${styles.active}`}></span>
            </div>
          </div>
        </div>

        <div className={styles.fpFormSection}>
          <div className={styles.fpFormHeader}>
            <h2>Quên mật khẩu nhân viên</h2>
            <p className={styles.fpFormSubtitle}>Vui lòng nhập thông tin tài khoản để khôi phục mật khẩu</p>
          </div>

          {step === 1 && (
            <form onSubmit={handleIdentifierSubmit}>
              <div className={styles.fpInputGroup}>
                <label className={styles.fpInputLabel}>Email / Số điện thoại</label>
                <input
                  type="text"
                  name="identifier"
                  placeholder="Nhập Email / Số điện thoại"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={error ? styles.fpError : ''}
                />
                {error && <span className={styles.fpErrorMessage}>{error}</span>}
              </div>

              <button type="submit" className={`${styles.fpPrimaryBtn} ${isLoading ? styles.loading : ''}`} disabled={isLoading}>
                {isLoading ? 'Đang gửi...' : 'Tiếp tục'}
              </button>

              <div className={styles.forgotNav}>
                <Link to="/login" className={styles.inlineLink} onClick={resetAll}>Quay lại đăng nhập</Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleOtpSubmit}>
              <div className={styles.fpInputGroup}>
                <label className={styles.fpInputLabel}>Mã OTP</label>
                <input
                  type="text"
                  name="otp"
                  placeholder="Nhập mã OTP 6 chữ số"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  className={error ? styles.fpError : ''}
                />
                {error && <span className={styles.fpErrorMessage}>{error}</span>}
              </div>

              <button type="submit" className={`${styles.fpPrimaryBtn} ${isLoading ? styles.loading : ''}`} disabled={isLoading}>
                {isLoading ? 'Đang xác thực...' : 'Xác thực'}
              </button>

              <div className={styles.otpActions}>
                <button type="button" className={styles.inlineLink} onClick={handleResend} disabled={countdown > 0}>
                  Gửi lại OTP
                </button>
                <span className={styles.countdown}>({countdown}s)</span>
              </div>

              <div className={styles.forgotNav}>
                <Link to="/login" className={styles.inlineLink} onClick={resetAll}>Quay lại đăng nhập</Link>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetSubmit}>
              <div className={styles.fpInputGroup}>
                <label className={styles.fpInputLabel}>Mật khẩu mới</label>
                <div className={styles.fpPasswordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Nhập mật khẩu mới"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={error ? styles.fpError : ''}
                  />
                  <button
                    type="button"
                    className={styles.fpTogglePassword}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className={styles.fpInputGroup}>
                <label className={styles.fpInputLabel}>Xác nhận mật khẩu</label>
                <div className={styles.fpPasswordWrapper}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Xác nhận mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={error ? styles.fpError : ''}
                  />
                  <button
                    type="button"
                    className={styles.fpTogglePassword}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {error && <span className={styles.fpErrorMessage}>{error}</span>}

              <button type="submit" className={`${styles.fpPrimaryBtn} ${isLoading ? styles.loading : ''}`} disabled={isLoading}>
                {isLoading ? 'Đang xác nhận...' : 'Xác nhận đổi mật khẩu'}
              </button>

              <button type="button" className={styles.fpSecondaryBtn} onClick={resetAll}>
                Hủy
              </button>

              <div className={styles.forgotNav}>
                <Link to="/login" className={styles.inlineLink} onClick={resetAll}>Quay lại đăng nhập</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
