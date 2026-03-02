import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkCustomerStatus, requestCustomerOtp, verifyCustomerOtp, setupCustomerPin } from '../../services/authService';
import styles from './CustomerRegister.module.css';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Info, 4: PIN
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
    fullName: '',
    email: '',
    gender: 'MALE',
    dob: '',
    pin: '',
    confirmPin: ''
  });
  
  const [errors, setErrors] = useState({});

  // Step 1: Kiểm tra số điện thoại
  const handleCheckPhone = async (e) => {
    e.preventDefault();
    
    if (!formData.phone || !/^[0-9]{10}$/.test(formData.phone)) {
      setErrors({ phone: 'Số điện thoại không hợp lệ' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await checkCustomerStatus(formData.phone);
      
      if (response.data.status === 'ACTIVE') {
        alert('Số điện thoại đã được đăng ký. Vui lòng đăng nhập.');
        navigate('/customer-login');
        return;
      }
      
      // Gửi OTP
      await requestCustomerOtp(formData.phone);
      alert('Mã OTP đã được gửi đến số điện thoại của bạn');
      setStep(2);
    } catch (error) {
      console.error('Error:', error);
      setErrors({ phone: error.message || 'Không thể kiểm tra số điện thoại' });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Xác thực OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!formData.otp || formData.otp.length !== 6) {
      setErrors({ otp: 'Mã OTP phải có 6 số' });
      return;
    }
    
    setLoading(true);
    try {
      await verifyCustomerOtp(formData.phone, formData.otp);
      setStep(3);
    } catch (error) {
      console.error('Error:', error);
      setErrors({ otp: error.message || 'Mã OTP không đúng' });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Nhập thông tin cá nhân
  const handleSubmitInfo = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    if (!formData.dob) newErrors.dob = 'Vui lòng chọn ngày sinh';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setStep(4);
  };

  // Step 4: Thiết lập PIN
  const handleSetupPin = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.pin || formData.pin.length !== 6) newErrors.pin = 'PIN phải có 6 số';
    if (!formData.confirmPin) newErrors.confirmPin = 'Vui lòng xác nhận PIN';
    if (formData.pin !== formData.confirmPin) newErrors.confirmPin = 'PIN không khớp';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      await setupCustomerPin({
        phone: formData.phone,
        pin: formData.pin,
        confirmPin: formData.confirmPin
      });
      
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/customer-login');
    } catch (error) {
      console.error('Error:', error);
      setErrors({ pin: error.message || 'Không thể thiết lập PIN' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleCheckPhone} className={styles.form}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Nhập số điện thoại</h2>
              <p className={styles.stepDesc}>Chúng tôi sẽ gửi mã OTP để xác thực</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                placeholder="0912345678"
                maxLength={10}
              />
              {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
            </div>
            
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Tiếp tục'}
            </button>
          </form>
        );
      
      case 2:
        return (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Xác thực OTP</h2>
              <p className={styles.stepDesc}>Nhập mã OTP đã gửi đến {formData.phone}</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Mã OTP</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                className={`${styles.input} ${errors.otp ? styles.inputError : ''}`}
                placeholder="123456"
                maxLength={6}
              />
              {errors.otp && <span className={styles.errorText}>{errors.otp}</span>}
            </div>
            
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </button>
            
            <button type="button" onClick={() => setStep(1)} className={styles.backButton}>
              ← Quay lại
            </button>
          </form>
        );
      
      case 3:
        return (
          <form onSubmit={handleSubmitInfo} className={styles.form}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Thông tin cá nhân</h2>
              <p className={styles.stepDesc}>Vui lòng điền đầy đủ thông tin</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Họ và tên *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                placeholder="Nguyễn Văn A"
              />
              {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="example@gmail.com"
              />
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Giới tính</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Ngày sinh *</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.dob ? styles.inputError : ''}`}
                />
                {errors.dob && <span className={styles.errorText}>{errors.dob}</span>}
              </div>
            </div>
            
            <button type="submit" className={styles.submitButton}>
              Tiếp tục
            </button>
            
            <button type="button" onClick={() => setStep(2)} className={styles.backButton}>
              ← Quay lại
            </button>
          </form>
        );
      
      case 4:
        return (
          <form onSubmit={handleSetupPin} className={styles.form}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Thiết lập mã PIN</h2>
              <p className={styles.stepDesc}>Tạo mã PIN 6 số để đăng nhập</p>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Mã PIN (6 số)</label>
              <input
                type="password"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
                className={`${styles.input} ${errors.pin ? styles.inputError : ''}`}
                placeholder="••••••"
                maxLength={6}
              />
              {errors.pin && <span className={styles.errorText}>{errors.pin}</span>}
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Xác nhận mã PIN</label>
              <input
                type="password"
                name="confirmPin"
                value={formData.confirmPin}
                onChange={handleChange}
                className={`${styles.input} ${errors.confirmPin ? styles.inputError : ''}`}
                placeholder="••••••"
                maxLength={6}
              />
              {errors.confirmPin && <span className={styles.errorText}>{errors.confirmPin}</span>}
            </div>
            
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Đang hoàn tất...' : 'Hoàn tất đăng ký'}
            </button>
            
            <button type="button" onClick={() => setStep(3)} className={styles.backButton}>
              ← Quay lại
            </button>
          </form>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Đăng ký tài khoản</h1>
          <div className={styles.steps}>
            <div className={`${styles.stepIndicator} ${step >= 1 ? styles.active : ''}`}>1</div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.stepIndicator} ${step >= 2 ? styles.active : ''}`}>2</div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.stepIndicator} ${step >= 3 ? styles.active : ''}`}>3</div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.stepIndicator} ${step >= 4 ? styles.active : ''}`}>4</div>
          </div>
        </div>
        
        {renderStep()}
        
        <div className={styles.footer}>
          <p>Đã có tài khoản? <a href="/customer-login" className={styles.link}>Đăng nhập</a></p>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegister;
