import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './StaffChangePassword.module.css';

const StaffChangePassword = () => {
  useScrollToTop();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validateField = (name, value) => {
    switch (name) {
      case 'currentPassword':
        if (!value) return 'Vui lòng nhập mật khẩu hiện tại';
        return '';
      case 'newPassword':
        if (!value) return 'Vui lòng nhập mật khẩu mới';
        if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
        if (!/(?=.*[a-z])/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
        if (!/(?=.*[A-Z])/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
        if (!/(?=.*\d)/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ số';
        if (value === formData.currentPassword) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
        return '';
      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu mới';
        if (value !== formData.newPassword) return 'Mật khẩu xác nhận không khớp';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true });

    if (Object.keys(newErrors).length === 0) {
      console.log('Đổi mật khẩu:', formData);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>Đổi mật khẩu</h1>
        <p className={styles.subtitle}>Thay đổi mật khẩu đăng nhập hệ thống</p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor='currentPassword' className={styles.label}>
              Mật khẩu hiện tại <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword.current ? 'text' : 'password'}
                id='currentPassword'
                name='currentPassword'
                value={formData.currentPassword}
                onChange={handleInputChange}
                onBlur={() => handleBlur('currentPassword')}
                className={styles.input}
                placeholder='Nhập mật khẩu hiện tại'
              />
              <button
                type='button'
                onClick={() => togglePasswordVisibility('current')}
                className={styles.togglePassword}
              >
                {showPassword.current ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.currentPassword && touched.currentPassword && (
              <span className={styles.errorMessage}>{errors.currentPassword}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='newPassword' className={styles.label}>
              Mật khẩu mới <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword.new ? 'text' : 'password'}
                id='newPassword'
                name='newPassword'
                value={formData.newPassword}
                onChange={handleInputChange}
                onBlur={() => handleBlur('newPassword')}
                className={styles.input}
                placeholder='Nhập mật khẩu mới'
              />
              <button
                type='button'
                onClick={() => togglePasswordVisibility('new')}
                className={styles.togglePassword}
              >
                {showPassword.new ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.newPassword && touched.newPassword && (
              <span className={styles.errorMessage}>{errors.newPassword}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='confirmPassword' className={styles.label}>
              Xác nhận mật khẩu mới <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                id='confirmPassword'
                name='confirmPassword'
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={() => handleBlur('confirmPassword')}
                className={styles.input}
                placeholder='Nhập lại mật khẩu mới'
              />
              <button
                type='button'
                onClick={() => togglePasswordVisibility('confirm')}
                className={styles.togglePassword}
              >
                {showPassword.confirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && touched.confirmPassword && (
              <span className={styles.errorMessage}>{errors.confirmPassword}</span>
            )}
            {!errors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.newPassword && (
              <span className={styles.successMessage}>✓ Mật khẩu xác nhận khớp</span>
            )}
          </div>

          <div className={styles.actions}>
            <button type='button' onClick={() => navigate(-1)} className={styles.cancelButton}>
              Hủy
            </button>
            <button type='submit' className={styles.submitButton}>
              Đổi mật khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffChangePassword;
