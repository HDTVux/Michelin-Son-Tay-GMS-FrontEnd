import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Mascot from '../../../assets/Mascot.jpg';
import styles from './ForgotPassword.module.css';

export default function ForgotPassword() {
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

  useEffect(() => {
    if (step !== 2) return undefined;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
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

  const handleIdentifierSubmit = (event) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('Vui lòng nhập Email hoặc Số điện thoại');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 700);
  };

  const handleOtpSubmit = (event) => {
    event.preventDefault();
    const cleaned = otp.replace(/[^0-9]/g, '');
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 700);
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(60);
    setOtp('');
  };

  const handleResetSubmit = (event) => {
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
    setTimeout(() => {
      setIsLoading(false);
      alert('Đổi mật khẩu thành công');
      resetAll();
    }, 800);
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
