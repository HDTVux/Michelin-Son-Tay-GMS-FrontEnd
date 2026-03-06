import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './UpdateStaffProfile.module.css';

const UpdateStaffProfile = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formData, setFormData] = useState({
    staffId: 1, // staff_id from database
    fullName: 'Nguyễn Văn B', // full_name
    gender: 'Nam', // gender
    dob: '1990-01-15', // dob (date of birth)
    phone: '0901234567', // phone
    position: 'Kỹ thuật viên', // position
    avatar: null // avatar URL from database
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      
      // Store file for upload
      setAvatarFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    
    if (!formData.dob) {
      newErrors.dob = 'Vui lòng chọn ngày sinh';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Prepare data for API
      const updateData = {
        staffId: formData.staffId,
        fullName: formData.fullName,
        phone: formData.phone,
        position: formData.position,
        gender: formData.gender,
        dob: formData.dob
      };
      
      console.log('Cập nhật thông tin:', updateData);
      console.log('Avatar file:', avatarFile);
      
      // TODO: Call API to update profile
      // If avatar changed, upload avatar separately
      // const formDataToSend = new FormData();
      // formDataToSend.append('staffId', formData.staffId);
      // formDataToSend.append('fullName', formData.fullName);
      // formDataToSend.append('phone', formData.phone);
      // formDataToSend.append('position', formData.position);
      // formDataToSend.append('gender', formData.gender);
      // formDataToSend.append('dob', formData.dob);
      // if (avatarFile) {
      //   formDataToSend.append('avatar', avatarFile);
      // }
      
      alert('Cập nhật thông tin thành công!');
    }
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
          {/* Avatar Section */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarPreview}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" />
              ) : (
                <div className={styles.avatarPlaceholder}>👤</div>
              )}
            </div>
            <div className={styles.avatarActions}>
              <button
                type="button"
                className={styles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Tải ảnh lên
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={handleRemoveAvatar}
                >
                  🗑️ Xóa ảnh
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles.fileInput}
            />
          </div>

          {/* Basic Info */}
          <div className={styles.formGroup}>
            <label htmlFor='fullName' className={styles.label}>
              Họ và tên <span className={styles.required}>*</span>
            </label>
            <input
              type='text'
              id='fullName'
              name='fullName'
              value={formData.fullName}
              onChange={handleInputChange}
              className={styles.input}
              placeholder='Nhập họ và tên'
            />
            {errors.fullName && (
              <span className={styles.errorMessage}>{errors.fullName}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor='gender' className={styles.label}>
                Giới tính <span className={styles.required}>*</span>
              </label>
              <select
                id='gender'
                name='gender'
                value={formData.gender}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value='Nam'>Nam</option>
                <option value='Nữ'>Nữ</option>
                <option value='Khác'>Khác</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor='dob' className={styles.label}>
                Ngày sinh <span className={styles.required}>*</span>
              </label>
              <input
                type='date'
                id='dob'
                name='dob'
                value={formData.dob}
                onChange={handleInputChange}
                className={styles.input}
              />
              {errors.dob && (
                <span className={styles.errorMessage}>{errors.dob}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor='phone' className={styles.label}>
                Số điện thoại <span className={styles.required}>*</span>
              </label>
              <input
                type='tel'
                id='phone'
                name='phone'
                value={formData.phone}
                onChange={handleInputChange}
                className={styles.input}
                placeholder='Nhập số điện thoại'
              />
              {errors.phone && (
                <span className={styles.errorMessage}>{errors.phone}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor='position' className={styles.label}>
                Chức danh / Vai trò
              </label>
              <input
                type='text'
                id='position'
                name='position'
                value={formData.position}
                onChange={handleInputChange}
                className={styles.input}
                placeholder='Nhập chức danh'
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='staffId' className={styles.label}>
              Mã nhân viên
            </label>
            <input
              type='text'
              id='staffId'
              name='staffId'
              value={`STF${String(formData.staffId).padStart(3, '0')}`}
              className={styles.input}
              disabled
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
