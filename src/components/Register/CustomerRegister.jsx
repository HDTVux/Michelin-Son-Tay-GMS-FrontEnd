import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CustomerRegister.css';

function CustomerRegisterInner({ onClose }) {
	const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: password, 4: success
	const [phone, setPhone] = useState('');
	const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
	const [passwordDigits, setPasswordDigits] = useState(Array(6).fill(''));
	const [confirmDigits, setConfirmDigits] = useState(Array(6).fill(''));
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const otpRefs = useRef([]);
	const passwordRefs = useRef([]);
	const confirmRefs = useRef([]);

	const validatePhone = (value) => {
		const cleaned = value.replace(/[^0-9]/g, '');
		return cleaned.length >= 9 && cleaned.length <= 11;
	};

	const handlePhoneSubmit = (event) => {
		event.preventDefault();
		if (!validatePhone(phone)) {
			setError('Vui lòng nhập số điện thoại hợp lệ');
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
		const cleaned = otpDigits.join('');
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

	const handlePasswordSubmit = (event) => {
		event.preventDefault();
		const password = passwordDigits.join('');
		const confirmPassword = confirmDigits.join('');
		if (password.length !== 6) {
			setError('Mật khẩu cần tối thiểu 6 ký tự');
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
			setStep(4);
		}, 700);
	};

	const handleClose = () => {
		setStep(1);
		setPhone('');
		setOtpDigits(Array(6).fill(''));
		setPasswordDigits(Array(6).fill(''));
		setConfirmDigits(Array(6).fill(''));
		setError('');
		if (onClose) onClose();
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
		<div className="crBackdrop" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
			<div className="crModal">
				<button className="crCloseBtn" onClick={handleClose} aria-label="Close">&times;</button>
				<h3 className="crTitle">Đăng ký khách hàng</h3>
				<h2 className="crBrand">Michelin Sơn Tây</h2>

				{step === 1 && (
					<form onSubmit={handlePhoneSubmit} className="crForm">
						<label className="crLabel">Số điện thoại</label>
						<input
							className={error ? 'crInput crInputError' : 'crInput'}
							placeholder="Nhập số điện thoại"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							inputMode="numeric"
						/>
						{error && <div className="crErrorText">{error}</div>}
						<button className="crPrimaryBtn" type="submit" disabled={isLoading}>
							{isLoading ? 'Đang gửi...' : 'Tiếp tục'}
						</button>
					</form>
				)}

				{step === 2 && (
					<form onSubmit={handleOtpSubmit} className="crForm">
						<label className="crLabel">Mã OTP (6 chữ số)</label>
						<div className="crOtpGrid">
							{otpDigits.map((digit, index) => (
								<input
									key={index}
									ref={el => { otpRefs.current[index] = el; }}
									className={error ? 'crInput crInputError' : 'crInput'}
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
						{error && <div className="crErrorText">{error}</div>}
						<button className="crPrimaryBtn" type="submit" disabled={isLoading}>
							{isLoading ? 'Đang xác thực...' : 'Tiếp tục'}
						</button>
						<div className="crOtpActions">
							<button type="button" className="crLinkBtn" onClick={() => { setStep(1); setOtp(''); setError(''); }}>Quay lại</button>
							<button type="button" className="crLinkBtn" onClick={() => { setIsLoading(true); setTimeout(() => { setIsLoading(false); alert('OTP mới đã được gửi'); }, 600); }}>Gửi lại OTP</button>
						</div>
					</form>
				)}

				{step === 3 && (
					<form onSubmit={handlePasswordSubmit} className="crForm">
						<label className="crLabel">Mật khẩu (6 chữ số)</label>
						<div className="crOtpGrid">
							{passwordDigits.map((digit, index) => (
								<input
									key={`pw-${index}`}
									ref={el => { passwordRefs.current[index] = el; }}
									className={error ? 'crInput crInputError' : 'crInput'}
									inputMode="numeric"
									maxLength={1}
									value={digit}
									onChange={(e) => handleDigitChange(e, index, passwordDigits, setPasswordDigits, passwordRefs)}
									onKeyDown={(e) => handleDigitKeyDown(e, index, passwordDigits, passwordRefs)}
									onPaste={(e) => handleDigitPaste(e, setPasswordDigits, passwordRefs)}
									aria-label={`Password digit ${index + 1}`}
								/>
							))}
						</div>
						<label className="crLabel">Xác nhận mật khẩu</label>
						<div className="crOtpGrid">
							{confirmDigits.map((digit, index) => (
								<input
									key={`cf-${index}`}
									ref={el => { confirmRefs.current[index] = el; }}
									className={error ? 'crInput crInputError' : 'crInput'}
									inputMode="numeric"
									maxLength={1}
									value={digit}
									onChange={(e) => handleDigitChange(e, index, confirmDigits, setConfirmDigits, confirmRefs)}
									onKeyDown={(e) => handleDigitKeyDown(e, index, confirmDigits, confirmRefs)}
									onPaste={(e) => handleDigitPaste(e, setConfirmDigits, confirmRefs)}
									aria-label={`Confirm password digit ${index + 1}`}
								/>
							))}
						</div>
						{error && <div className="crErrorText">{error}</div>}
						<button className="crPrimaryBtn" type="submit" disabled={isLoading}>
							{isLoading ? 'Đang tạo...' : 'Hoàn tất'}
						</button>
						<div className="crOtpActions">
							<button type="button" className="crLinkBtn" onClick={() => { setStep(2); setError(''); }}>Quay lại</button>
						</div>
					</form>
				)}

				{step === 4 && (
					<div className="crSuccessBox">
						<div className="crSuccessIcon" aria-hidden>
							<span className="crTick" />
						</div>
						<h3 className="crSuccessTitle">Đăng ký thành công!</h3>
						<p className="crSuccessText">Hệ thống đã cập nhật trạng thái đăng ký của bạn.</p>
						<button className="crPrimaryBtn" type="button" onClick={handleClose}>Hoàn tất</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default function CustomerRegister({ onClose }) {
	if (typeof document === 'undefined') return null;
	return createPortal(
		<CustomerRegisterInner onClose={onClose} />,
		document.body
	);
}