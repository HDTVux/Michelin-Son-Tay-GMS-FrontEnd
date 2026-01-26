import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './CustomerRegister.css';

function CustomerRegisterInner({ onClose }) {
	const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: success
	const [phone, setPhone] = useState('');
	const [otp, setOtp] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const validatePhone = (value) => {
		const cleaned = value.replace(/[^0-9]/g, '');
		return cleaned.length >= 9 && cleaned.length <= 11;
	};

	const handlePhoneSubmit = (event) => {
		event.preventDefault();
		if (!validatePhone(phone)) {
			setError('Vui long nhap so dien thoai hop le');
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
			setError('Ma OTP can 6 chu so');
			return;
		}
		setError('');
		setIsLoading(true);
		setTimeout(() => {
			setIsLoading(false);
			setStep(3);
		}, 700);
	};

	const handleClose = () => {
		setStep(1);
		setPhone('');
		setOtp('');
		setError('');
		if (onClose) onClose();
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
						<input
							className={error ? 'crInput crInputError' : 'crInput'}
							placeholder="Nhập mã OTP"
							value={otp}
							onChange={(e) => setOtp(e.target.value)}
							inputMode="numeric"
							maxLength={6}
						/>
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