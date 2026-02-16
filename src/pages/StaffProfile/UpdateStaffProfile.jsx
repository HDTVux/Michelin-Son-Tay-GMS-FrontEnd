import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './StaffProfile.module.css';

const UpdateStaffProfile = () => {
  useScrollToTop();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    staffCode: 'STF001',
    staffName: 'Nguyễn Văn B',
    gender: 'Nam',
    email: 'nguyenvanb@michelin.com',
    phoneNumber: '0901234567',
    staffRole: 'Kỹ thuật viên',
    staffStatus: 'Đang làm việc'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Cập nhật thông tin:', formData);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>Cập nhật thông tin cá nhân</h1>
        <p className={styles.subtitle}>Chỉnh sửa thông tin hồ sơ của bạn</p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor='staffName' className={styles.label}>
              Họ và tên <span className={styles.required}>*</span>
            </label>
            <input
              type='text'
              id='staffName'
              name='staffName'
              value={formData.staffName}
              onChange={handleInputChange}
              className={styles.input}
              placeholder='Nhập họ và tên'
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='email' className={styles.label}>
              Email <span className={styles.required}>*</span>
            </label>
            <input
              type='email'
              id='email'
              name='email'
              value={formData.email}
              onChange={handleInputChange}
              className={styles.input}
              placeholder='Nhập email'
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='phoneNumber' className={styles.label}>
              Số điện thoại <span className={styles.required}>*</span>
            </label>
            <input
              type='tel'
              id='phoneNumber'
              name='phoneNumber'
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={styles.input}
              placeholder='Nhập số điện thoại'
            />
          </div>

          <div className={styles.actions}>
            <button type='button' onClick={() => navigate(-1)} className={styles.cancelButton}>
              Hủy
            </button>
            <button type='submit' className={styles.submitButton}>
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateStaffProfile;
