import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './CustomerLogin.css';

function CustomerLoginInner({ onClose }){
  const [step, setStep] = useState(1); // 1: phone, 2: otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpReset, setOtpReset] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    const cleaned = otp.replace(/[^0-9]/g, '');
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
      setOtp('');
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
    const cleaned = otpReset.replace(/[^0-9]/g, '');
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    if (newPin.replace(/[^0-9]/g, '').length !== 6) {
      setError('Mật PIN mới cần 6 chữ số');
      return;
    }
    if (newPin !== confirmPin) {
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
      setOtpReset('');
      setNewPin('');
      setConfirmPin('');
      if (onClose) onClose();
    }, 900);
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
            <input
              className={error ? 'input error' : 'input'}
              placeholder="Nhập mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
            />
            {error && <div className="errorText">{error}</div>}
            <button className="primaryBtn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
            <div className="otpActions">
              <button type="button" className="linkBtn" onClick={() => { setStep(1); setOtp(''); }}>Quay lại</button>
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
            <input
              className={error ? 'input error' : 'input'}
              placeholder="Nhập mã OTP"
              value={otpReset}
              onChange={(e) => setOtpReset(e.target.value)}
              inputMode="numeric"
            />
            <label className="label">Mã PIN mới (6 chữ số)</label>
            <input
              className={error ? 'input error' : 'input'}
              placeholder="Nhập mã PIN mới"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              inputMode="numeric"
            />
            <label className="label">Xác nhận mã PIN mới</label>
            <input
              className={error ? 'input error' : 'input'}
              placeholder="Xác nhận mã PIN mới"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              inputMode="numeric"
            />
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
