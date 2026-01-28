import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CustomerLogin.css';

function CustomerLoginInner({ onClose }){
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: reset
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const [otpResetDigits, setOtpResetDigits] = useState(Array(6).fill(''));
  const [newPinDigits, setNewPinDigits] = useState(Array(6).fill(''));
  const [confirmPinDigits, setConfirmPinDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const otpRefs = useRef([]);
  const otpResetRefs = useRef([]);
  const newPinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

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
    // Simulate API call to send OTP
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      // In a real app you'd trigger backend to send OTP here
    }, 800);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const cleaned = otpDigits.join('');
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    setError('');
    setIsLoading(true);
    // Simulate API call to verify OTP
    setTimeout(() => {
      setIsLoading(false);
      console.log('Đăng nhập thành công với:', { phone, otp: cleaned });
      alert('Đăng nhập thành công');
      // reset for demo
      setStep(1);
      setPhone('');
      setOtpDigits(Array(6).fill(''));
      if (onClose) onClose(); // Call onClose on successful login
    }, 800);
  };

  const handleForgotPassword = () => {
    // simulate sending OTP for reset
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
      alert('Mã OTP phục hồi đã được gửi tới số điện thoại');
    }, 700);
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    const cleaned = otpResetDigits.join('');
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    if (newPinDigits.join('').length !== 6) {
      setError('Mật PIN mới cần 6 chữ số');
      return;
    }
    if (newPinDigits.join('') !== confirmPinDigits.join('')) {
      setError('Mật PIN xác nhận không khớp');
      return;
    }
    setError('');
    setIsLoading(true);
    // Simulate API call to save new PIN
    setTimeout(() => {
      setIsLoading(false);
      alert('Mật khẩu mới đã được lưu');
      // reset and close
      setStep(1);
      setPhone('');
      setOtpResetDigits(Array(6).fill(''));
      setNewPinDigits(Array(6).fill(''));
      setConfirmPinDigits(Array(6).fill(''));
      if (onClose) onClose();
    }, 900);
  };

  const handleDigitChange = (event, index, digits, setDigits, refs) => {
    const value = event.target.value.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    if (value && index < updated.length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (event, index, digits, refs) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (event, setDigits, refs) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const filled = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) {
      filled[i] = pasted[i];
    }
    setDigits(filled);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="customerLoginBackdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="customerLoginModal">
        <button className="closeBtn" onClick={() => { setStep(1); setPhone(''); setOtp(''); setError(''); if (onClose) onClose(); }}>&times;</button>
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
            <div className="clOtpGrid">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { otpRefs.current[index] = el; }}
                  className={error ? 'input error' : 'input'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e, index, otpDigits, setOtpDigits, otpRefs)}
                  onKeyDown={(e) => handleDigitKeyDown(e, index, otpDigits, otpRefs)}
                  onPaste={(e) => handleDigitPaste(e, setOtpDigits, otpRefs)}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
            <div className="otpActions">
              <button type="button" className="linkBtn" onClick={() => { setStep(1); setOtpDigits(Array(6).fill('')); setError(''); }}>Quay lại</button>
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
            <div className="clOtpGrid">
              {otpResetDigits.map((digit, index) => (
                <input
                  key={`otpReset-${index}`}
                  ref={el => { otpResetRefs.current[index] = el; }}
                  className={error ? 'input error' : 'input'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e, index, otpResetDigits, setOtpResetDigits, otpResetRefs)}
                  onKeyDown={(e) => handleDigitKeyDown(e, index, otpResetDigits, otpResetRefs)}
                  onPaste={(e) => handleDigitPaste(e, setOtpResetDigits, otpResetRefs)}
                  aria-label={`Reset OTP digit ${index + 1}`}
                />
              ))}
            </div>
            <label className="label">Mã PIN mới (6 chữ số)</label>
            <div className="clOtpGrid">
              {newPinDigits.map((digit, index) => (
                <input
                  key={`newPin-${index}`}
                  ref={el => { newPinRefs.current[index] = el; }}
                  className={error ? 'input error' : 'input'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e, index, newPinDigits, setNewPinDigits, newPinRefs)}
                  onKeyDown={(e) => handleDigitKeyDown(e, index, newPinDigits, newPinRefs)}
                  onPaste={(e) => handleDigitPaste(e, setNewPinDigits, newPinRefs)}
                  aria-label={`New PIN digit ${index + 1}`}
                />
              ))}
            </div>
            <label className="label">Xác nhận mã PIN mới</label>
            <div className="clOtpGrid">
              {confirmPinDigits.map((digit, index) => (
                <input
                  key={`confirm-${index}`}
                  ref={el => { confirmPinRefs.current[index] = el; }}
                  className={error ? 'input error' : 'input'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e, index, confirmPinDigits, setConfirmPinDigits, confirmPinRefs)}
                  onKeyDown={(e) => handleDigitKeyDown(e, index, confirmPinDigits, confirmPinRefs)}
                  onPaste={(e) => handleDigitPaste(e, setConfirmPinDigits, confirmPinRefs)}
                  aria-label={`Confirm PIN digit ${index + 1}`}
                />
              ))}
            </div>
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
            <div style={{textAlign:'center', marginTop:8}}>
              <button type="button" className="linkBtn" onClick={() => { if (onClose) onClose(); }}>Hủy</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CustomerLogin({ onClose }){
  if (typeof document === 'undefined') return null;
  return createPortal(
    <CustomerLoginInner onClose={onClose} />,
    document.body
  );
}
