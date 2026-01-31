import React from 'react';
import { createPortal } from 'react-dom';
import OTPGrid from './OTPGrid.jsx';
import { useCustomerLoginFlow } from '../hooks/useCustomerLoginFlow.js';
import './CustomerLoginModal.css';

function CustomerLoginInner({ onClose }){
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
  } = useCustomerLoginFlow({ onClose });

  return (
    <div className="customerLoginBackdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="customerLoginModal">
        <button className="closeBtn" onClick={handleClose} aria-label="Close">&times;</button>
        <h3 className="modalTitle">Đăng nhập khách hàng</h3>
        <h2 className="brand">Michelin Sơn Tây</h2>

        {/* Bước 1: nhập số điện thoại để quyết định nhánh flow */}
        {step === 1 && (
          <form onSubmit={handlePhoneSubmit} className="form">
            <label className="label">Số điện thoại</label>
            <input
              className={error ? 'input error' : 'input'}
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
            />
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Tiếp tục'}
            </button>
            <button type="button" className="secondaryBtn" onClick={() => { /* placeholder for social login */ }}>
              Đăng nhập bằng Zalo
            </button>
          </form>
        )}

        {/* Bước 2: đăng nhập bằng PIN hiện có (chỉ khi account đã active + có PIN) */}
        {step === 2 && (
          <form onSubmit={handlePinLoginSubmit} className="form">
            <label className="label">Mã PIN (6 chữ số)</label>
            <OTPGrid state={otpLogin} ariaPrefix="PIN" error={!!error} />
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
            <div className="otpActions">
              <button type="button" className="linkBtn" onClick={() => { setStep(1); otpLogin.resetDigits(); setError(''); }}>Quay lại</button>
              <button type="button" className="linkBtn" onClick={handleForgotPassword}>Quên mật khẩu?</button>
            </div>
          </form>
        )}

        {/* Bước 3: nhập OTP cho nhánh reset/activate; xác thực xong mới cho đặt PIN */}
        {step === 3 && (
          <form onSubmit={handleOtpSubmit} className="form">
            <label className="label">{flow === 'reset' ? 'OTP quên mật khẩu (6 chữ số)' : 'OTP kích hoạt (6 chữ số)'}</label>
            <OTPGrid state={otpReset} ariaPrefix="Reset OTP" error={!!error} />
            <div className="otpActions" style={{ marginTop: 8 }}>
              <button type="button" className="linkBtn" onClick={handleResendOtp} disabled={isLoading}>Gửi lại OTP</button>
            </div>
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </button>
            <div style={{textAlign:'center', marginTop:8}}>
              <button type="button" className="linkBtn" onClick={handleClose}>Hủy</button>
            </div>
          </form>
        )}

        {/* Bước 4: đặt PIN mới sau khi OTP hợp lệ */}
        {step === 4 && (
          <form onSubmit={handlePinSetupSubmit} className="form">
            <label className="label">Mã PIN mới (6 chữ số)</label>
            <OTPGrid state={newPin} ariaPrefix="New PIN" error={!!error} />
            <label className="label">Xác nhận mã PIN mới</label>
            <OTPGrid state={confirmPin} ariaPrefix="Confirm PIN" error={!!error} />
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
            <div style={{textAlign:'center', marginTop:8}}>
              <button type="button" className="linkBtn" onClick={() => { handleClose(); }}>Hủy</button>
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