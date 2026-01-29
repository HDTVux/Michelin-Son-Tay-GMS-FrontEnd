import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOtpDigits } from '../hooks/useOtpDigits.js';
import './CustomerLoginModal.css';

function CustomerLoginInner({ onClose }){
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: reset
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const otpLogin = useOtpDigits(6);
  const otpReset = useOtpDigits(6);
  const newPin = useOtpDigits(6);
  const confirmPin = useOtpDigits(6);

  const validatePhone = (p) => {
    const cleaned = p.replace(/[^0-9]/g, '');
    return cleaned.length >= 9 && cleaned.length <= 11;
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 800);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const cleaned = otpLogin.joinDigits();
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Đăng nhập thành công');
      setStep(1);
      setPhone('');
      otpLogin.resetDigits();
      if (onClose) onClose();
    }, 800);
  };

  const handleForgotPassword = () => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
      otpReset.resetDigits();
      newPin.resetDigits();
      confirmPin.resetDigits();
      alert('Mã OTP phục hồi đã được gửi tới số điện thoại');
    }, 700);
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    const cleaned = otpReset.joinDigits();
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    if (newPin.joinDigits().length !== 6) {
      setError('Mật PIN mới cần 6 chữ số');
      return;
    }
    if (newPin.joinDigits() !== confirmPin.joinDigits()) {
      setError('Mật PIN xác nhận không khớp');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Mật khẩu mới đã được lưu');
      setStep(1);
      setPhone('');
      otpReset.resetDigits();
      newPin.resetDigits();
      confirmPin.resetDigits();
      if (onClose) onClose();
    }, 900);
  };

  const handleClose = () => {
    setStep(1);
    setPhone('');
    otpLogin.resetDigits();
    otpReset.resetDigits();
    newPin.resetDigits();
    confirmPin.resetDigits();
    setError('');
    if (onClose) onClose();
  };

  const renderDigits = (state, ariaPrefix) => (
    <div className="clOtpGrid">
      {state.digits.map((digit, index) => (
        <input
          key={`${ariaPrefix}-${index}`}
          ref={el => { state.refs.current[index] = el; }}
          className={error ? 'input error' : 'input'}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => state.handleChange(e, index)}
          onKeyDown={(e) => state.handleKeyDown(e, index)}
          onPaste={(e) => state.handlePaste(e)}
          aria-label={`${ariaPrefix} digit ${index + 1}`}
        />
      ))}
    </div>
  );

  return (
    <div className="customerLoginBackdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="customerLoginModal">
        <button className="closeBtn" onClick={handleClose} aria-label="Close">&times;</button>
        <h3 className="modalTitle">Đăng nhập khách hàng</h3>
        <h2 className="brand">Michelin Sơn Tây</h2>

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

        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="form">
            <label className="label">Mã OTP (6 chữ số)</label>
            {renderDigits(otpLogin, 'OTP')}
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
            <div className="otpActions">
              <button type="button" className="linkBtn" onClick={() => { setStep(1); otpLogin.resetDigits(); setError(''); }}>Quay lại</button>
              <button type="button" className="linkBtn" onClick={() => { setIsLoading(true); setTimeout(()=>{ setIsLoading(false); alert('OTP mới đã được gửi'); },700); }}>Gửi lại OTP</button>
            </div>
            <div style={{marginTop:6}}>
              <button type="button" className="linkBtn" onClick={handleForgotPassword}>
                Quên mật khẩu?
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetSubmit} className="form">
            <label className="label">Mã OTP (6 chữ số)</label>
            {renderDigits(otpReset, 'Reset OTP')}
            <label className="label">Mã PIN mới (6 chữ số)</label>
            {renderDigits(newPin, 'New PIN')}
            <label className="label">Xác nhận mã PIN mới</label>
            {renderDigits(confirmPin, 'Confirm PIN')}
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
  if (typeof document === 'undefined') return null;
  return createPortal(
    <CustomerLoginInner onClose={onClose} />,
    document.body
  );
}
