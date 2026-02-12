import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import OTPGrid from './OTPGrid.jsx';
import { useCustomerLoginFlow } from '../hooks/useCustomerLoginFlow.js';
import styles from './CustomerLoginModal.module.css';

function CustomerLoginInner({ onClose }){
  const notify = (message) => toast(message, { containerId: 'app-toast' });
  const {
    step,
    flow,
    phone,
    setPhone,
    error,
    isLoading,
    otpLogin,
    otpReset,
    newPin,
    confirmPin,
    handlePhoneSubmit,
    handlePinLoginSubmit,
    handleForgotPassword,
    handleResendOtp,
    handleOtpSubmit,
    handlePinSetupSubmit,
    handleClose,
    setError,
    setStep,
    backToOtpStep,
  } = useCustomerLoginFlow({ onClose, onNotify: notify });

  return (
    <div className={styles.customerLoginBackdrop} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={styles.customerLoginModal}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">&times;</button>
        <h3 className={styles.modalTitle}>Đăng nhập khách hàng</h3>
        <h2 className={styles.brand}>Michelin Sơn Tây</h2>

        {/* Bước 1: nhập số điện thoại để quyết định nhánh flow */}
        {step === 1 && (
          <form onSubmit={handlePhoneSubmit} className={styles.form}>
            <label className={styles.label}>Số điện thoại</label>
            <input
              className={error ? `${styles.input} ${styles.error}` : styles.input}
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
            />
            {error && <div className={styles.errorText}>{error}</div>}
            <button className={styles.primaryBtn} type="submit" disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Tiếp tục'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => { /* placeholder for social login */ }}>
              Đăng nhập bằng Zalo
            </button>
          </form>
        )}

        {/* Bước 2: đăng nhập bằng PIN hiện có (chỉ khi account đã active + có PIN) */}
        {step === 2 && (
          <form onSubmit={handlePinLoginSubmit} className={styles.form}>
            <label className={styles.label}>Mã PIN (6 chữ số)</label>
            <OTPGrid state={otpLogin} ariaPrefix="PIN" error={!!error} />
            {error && <div className={styles.errorText}>{error}</div>}
            <button className={styles.primaryBtn} type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
            <div className={styles.otpActions}>
              <button type="button" className={styles.linkBtn} onClick={() => { setStep(1); otpLogin.resetDigits(); setError(''); }}>Quay lại</button>
              <button type="button" className={styles.linkBtn} onClick={handleForgotPassword}>Quên mật khẩu?</button>
            </div>
          </form>
        )}

        {/* Bước 3: nhập OTP cho nhánh reset/activate; xác thực xong mới cho đặt PIN */}
        {step === 3 && (
          <form onSubmit={handleOtpSubmit} className={styles.form}>
            <label className={styles.label}>{flow === 'reset' ? 'OTP quên mật khẩu (6 chữ số)' : 'OTP kích hoạt (6 chữ số)'}</label>
            <OTPGrid state={otpReset} ariaPrefix="Reset OTP" error={!!error} />
            <div className={styles.otpActions} style={{ marginTop: 8 }}>
              <button type="button" className={styles.linkBtn} onClick={handleResendOtp} disabled={isLoading}>Gửi lại OTP</button>
            </div>
            {error && <div className={styles.errorText}>{error}</div>}
            <button className={styles.primaryBtn} type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </button>
            <div style={{textAlign:'center', marginTop:8}}>
              <button type="button" className={styles.linkBtn} onClick={handleClose}>Hủy</button>
            </div>
          </form>
        )}

        {/* Bước 4: đặt PIN mới sau khi OTP hợp lệ */}
        {step === 4 && (
          <form onSubmit={handlePinSetupSubmit} className={styles.form}>
            <label className={styles.label}>Mã PIN mới (6 chữ số)</label>
            <OTPGrid state={newPin} ariaPrefix="New PIN" error={!!error} />
            <label className={styles.label}>Xác nhận mã PIN mới</label>
            <OTPGrid state={confirmPin} ariaPrefix="Confirm PIN" error={!!error} />
            {error && <div className={styles.errorText}>{error}</div>}
            <button className={styles.primaryBtn} type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
            <div style={{textAlign:'center', marginTop:8}}>
              <button type="button" className={styles.linkBtn} onClick={() => { handleClose(); }}>Hủy</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CustomerLoginModal({ onClose }){
  // Portal chỉ render khi có document (tránh lỗi SSR)
  if (typeof document === 'undefined') return null;
  return createPortal(
    <CustomerLoginInner onClose={onClose} />,
    document.body
  );
}