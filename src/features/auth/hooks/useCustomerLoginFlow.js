import { useState } from 'react';
import { useOtpDigits } from './useOtpDigits.js';
import {
  checkCustomerStatus,
  loginCustomer,
  requestCustomerOtp,
  verifyCustomerOtp,
  setupCustomerPin,
} from '../../../services/authService.js';

// Quản lý luồng đăng nhập/kích hoạt/quên PIN cho khách hàng
export function useCustomerLoginFlow({ onClose } = {}) {
  const [step, setStep] = useState(1); // 1: nhập số, 2: nhập PIN đăng nhập, 3: OTP, 4: đặt PIN
  const [flow, setFlow] = useState('login'); // 'login' | 'activate' | 'reset'
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const otpLogin = useOtpDigits(6);
  const otpReset = useOtpDigits(6);
  const newPin = useOtpDigits(6);
  const confirmPin = useOtpDigits(6);

  const validatePhone = (p) => {
    const cleaned = p.replace(/[^0-9]/g, '');
    return cleaned.length >= 9 && cleaned.length <= 11;
  };

  const sanitizePhone = (p) => p.replace(/[^0-9]/g, '');

  // Bước 1: check trạng thái tài khoản rồi quyết định nhánh
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const sanitizedPhone = sanitizePhone(phone);
      const statusResp = await checkCustomerStatus(sanitizedPhone);
      const status = statusResp?.data?.status || statusResp?.data?.state;
      const hasPin = statusResp?.data?.hasPin;
      const isActiveWithPin = status === 'ACTIVE' && hasPin !== false;

      if (status === 'LOCKED') {
        setError('Tài khoản đã bị khóa, vui lòng liên hệ hỗ trợ');
        return;
      }
      if (status === 'NOT_REGISTERED') {
        setError('Số điện thoại chưa được đăng ký');
        return;
      }

      if (isActiveWithPin) {
        // Tài khoản đã active và có PIN -> đi thẳng tới bước đăng nhập PIN
        setFlow('login');
        setStep(2);
      } else {
        // Tài khoản chưa có PIN -> gửi OTP kích hoạt rồi sang bước nhập OTP
        await requestCustomerOtp(sanitizedPhone);
        otpReset.resetDigits();
        newPin.resetDigits();
        confirmPin.resetDigits();
        setOtpVerified(false);
        setFlow('activate');
        setStep(3);
        alert('OTP kích hoạt đã được gửi tới số điện thoại');
      }
    } catch (err) {
      setError(err?.message || 'Không thể kiểm tra trạng thái');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: nhập PIN đăng nhập (ACTIVE + đã có PIN)
  const handlePinLoginSubmit = async (e) => {
    e.preventDefault();
    const cleaned = otpLogin.joinDigits();
    if (cleaned.length !== 6) {
      setError('PIN cần 6 chữ số');
      return;
    }
    const sanitizedPhone = sanitizePhone(phone);
    setError('');
    setIsLoading(true);
    try {
      const response = await loginCustomer(sanitizedPhone, cleaned);
      const token = response?.data?.token || response?.data?.accessToken;
      if (token) {
        localStorage.setItem('customerToken', token);
        window.dispatchEvent(new Event('authChange'));
      }
      alert('Đăng nhập thành công');
      setStep(1);
      setPhone('');
      otpLogin.resetDigits();
      if (onClose) onClose();
    } catch (err) {
      setError(err?.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // Quên mật khẩu: gửi OTP và sang bước đặt PIN mới
  const handleForgotPassword = async () => {
    setError('');
    if (!validatePhone(phone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ trước khi khôi phục');
      return;
    }
    setIsLoading(true);
    try {
      const sanitizedPhone = sanitizePhone(phone);
      await requestCustomerOtp(sanitizedPhone);
      otpReset.resetDigits();
      newPin.resetDigits();
      confirmPin.resetDigits();
      setOtpVerified(false);
      setFlow('reset');
      setStep(3);
      alert('Mã OTP phục hồi đã được gửi tới số điện thoại');
    } catch (err) {
      setError(err?.message || 'Không thể gửi OTP phục hồi');
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại OTP (kích hoạt hoặc reset)
  const handleResendOtp = async () => {
    if (!validatePhone(phone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ trước khi gửi OTP');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const sanitizedPhone = sanitizePhone(phone);
      await requestCustomerOtp(sanitizedPhone);
      setOtpVerified(false);
      alert('OTP mới đã được gửi');
    } catch (err) {
      setError(err?.message || 'Không thể gửi lại OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 3: xác thực OTP (reset/activate), thành công mới cho sang bước đặt PIN
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const cleaned = otpReset.joinDigits();
    if (cleaned.length !== 6) {
      setError('Mã OTP cần 6 chữ số');
      return;
    }
    setError('');
    setIsLoading(true);
    const sanitizedPhone = sanitizePhone(phone);
    try {
      await verifyCustomerOtp(sanitizedPhone, cleaned);
      setOtpVerified(true);
      setStep(4);
      alert('OTP hợp lệ, hãy đặt PIN');
    } catch (err) {
      setError(err?.message || 'OTP không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 4: đặt/đặt lại PIN sau khi OTP đã xác thực
  const handlePinSetupSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      setError('Vui lòng xác thực OTP trước khi đặt PIN');
      setStep(3);
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
    const sanitizedPhone = sanitizePhone(phone);
    try {
      await setupCustomerPin({
        phone: sanitizedPhone,
        pin: newPin.joinDigits(),
        confirmPin: confirmPin.joinDigits(),
      });
      alert(flow === 'reset' ? 'Đặt lại PIN thành công, vui lòng đăng nhập' : 'Đã tạo PIN, vui lòng đăng nhập');
      setFlow('login');
      setStep(2);
      setOtpVerified(false);
      otpReset.resetDigits();
      newPin.resetDigits();
      confirmPin.resetDigits();
    } catch (err) {
      setError(err?.message || 'Không thể đặt lại PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFlow('login');
    setStep(1);
    setPhone('');
    otpLogin.resetDigits();
    otpReset.resetDigits();
    newPin.resetDigits();
    confirmPin.resetDigits();
    setOtpVerified(false);
    setError('');
    if (onClose) onClose();
  };

  const backToOtpStep = () => {
    setOtpVerified(false);
    otpReset.resetDigits();
    newPin.resetDigits();
    confirmPin.resetDigits();
    setError('');
    setStep(3);
  };

  return {
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
  };
}
