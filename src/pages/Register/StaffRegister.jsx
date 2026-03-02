import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StaffRegister.module.css';

const StaffRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'MALE',
    dob: '',
    position: 'RECEPTIONIST',
    pin: '',
    confirmPin: ''
  });
  
  const [errors, setErrors] = useState({});

  const positions = [
    { value: 'RECEPTIONIST', label: 'Lễ tân' },
    { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
    { value: 'ADVISOR', label: 'Tư vấn viên' },
    { value: 'MANAGER', label: 'Quản lý' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    
    if (!formData.dob) newErrors.dob = 'Vui lòng chọn ngày sinh';
    
    if (!formData.pin || formData.pin.length !== 6) {
      newErrors.pin = 'PIN phải có 6 số';
    }
    
    if (!formData.confirmPin) {
      newErrors.confirmPin = 'Vui lòng xác nhận PIN';
    } else if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = 'PIN không khớp';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // TODO: Call API to create staff account
      // const token = localStorage.getItem('adminToken');
      // await createStaffAccount(formData, token);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/staff-list');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Không thể tạo tài khoản nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCancel = () => {
    navigate('/staff-list');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button onClick={handleCancel} className={styles.backButton}>
            ← Quay lại
          </button>
          <h1 className={styles.title}>Tạo tài khoản nhân viên</h1>
          <p className={styles.subtitle}>Nhập thông tin để tạo tài khoản mới</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
            
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
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Số điện thoại *</label>
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
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Giới tính *</label>
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
          </div>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin công việc</h3>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Chức vụ *</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className={styles.select}
              >
                {positions.map(pos => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thiết lập mật khẩu</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Mã PIN (6 số) *</label>
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
                <label className={styles.label}>Xác nhận PIN *</label>
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
            </div>
          </div>
          
          <div className={styles.actions}>
            <button type="button" onClick={handleCancel} className={styles.cancelButton}>
              Hủy
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
      
      {showSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>Tạo tài khoản thành công!</h3>
            <p className={styles.successMessage}>
              Tài khoản nhân viên đã được tạo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRegister;
