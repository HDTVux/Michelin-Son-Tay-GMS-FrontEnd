import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchStaffProfile } from '../../services/staffService.js';
import { getValidToken } from '../../services/tokenUtils.js';
import { toast } from 'react-toastify';
import styles from './StaffProfile.module.css';

const StaffProfile = () => {
  useScrollToTop();
  
  const fileInputRef = useRef(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(true);
 
  const [staffInfo, setStaffInfo] = useState({
    staffId: null,
    avatar: null,
    fullName: '',
    gender: 'MALE',
    dob: '',
    phone: '',
    position: ''
  });

  // Fetch staff profile on mount
  useEffect(() => {
    const loadStaffProfile = async () => {
      try {
        const token = await getValidToken('authToken');
        if (token) {
          const response = await fetchStaffProfile(token);
          
          // Backend hiện tại chỉ trả về string, chưa có API đầy đủ
          // Sử dụng mock data tạm thời
          console.log('Backend response:', response);
          
          // Mock data cho demo
          setStaffInfo({
            staffId: 1,
            avatar: null,
            fullName: 'Nguyễn Văn A',
            gender: 'MALE',
            dob: '1990-01-15',
            phone: '0912345678',
            position: 'Kỹ thuật viên'
          });
        }
      } catch (error) {
        console.error('Error fetching staff profile:', error);
        // Vẫn hiển thị mock data nếu có lỗi
        setStaffInfo({
          staffId: 1,
          avatar: null,
          fullName: 'Nhân viên Demo',
          gender: 'MALE',
          dob: '1990-01-01',
          phone: '0900000000',
          position: 'Nhân viên'
        });
      } finally {
        setLoading(false);
      }
    };

    loadStaffProfile();
  }, []);

  const [workStats] = useState({
    totalTickets: 156,
    totalServices: 342,
    totalWorkingHours: 2840,
    averageRating: 4.8
  });

  // Update Profile Modal State
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({ ...staffInfo });
  const [updateErrors, setUpdateErrors] = useState({});

  // Change Password Modal State
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState({});
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const quickActions = [
    {
      id: 0,
      icon: '�',
      title: 'Cập nhật thông tin cá nhân',
      description: 'Cập nhật thông tin cá nhân và hồ sơ của bạn',
      onClick: () => {
        setUpdateFormData({ ...staffInfo });
        setAvatarPreview(staffInfo.avatar);
        setShowUpdateModal(true);
      }
    },
    {
      id: 1,
      icon: '📋',
      title: 'Lịch sử thực hiện dịch vụ',
      description: 'Xem chi tiết các dịch vụ bạn đã thực hiện',
      link: '/staff-service-history'
    },
    {
      id: 2,
      icon: '🔒',
      title: 'Đổi mật khẩu',
      description: 'Thay đổi mật khẩu đăng nhập hệ thống',
      onClick: () => setShowPasswordModal(true)
    },
    {
      id: 3,
      icon: '📊',
      title: 'Xem công việc được giao',
      description: 'Quản lý và theo dõi các công việc được giao',
      link: '/technician-tasks'
    }
  ];

  // Update Profile Functions
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({ ...prev, [name]: value }));
    if (updateErrors[name]) {
      setUpdateErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateUpdateForm = () => {
    const newErrors = {};
    
    if (!updateFormData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }
    
    if (!updateFormData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(updateFormData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    
    if (!updateFormData.dob) {
      newErrors.dob = 'Vui lòng chọn ngày sinh';
    }
    
    setUpdateErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    
    if (validateUpdateForm()) {
      try {
        await getValidToken('authToken');

        // Backend chưa có API update, tạm thời chỉ update local state
        console.log('Update payload:', updateFormData);
        
        // Cập nhật local state
        setStaffInfo({
          ...staffInfo,
          fullName: updateFormData.fullName,
          gender: updateFormData.gender,
          dob: updateFormData.dob,
          phone: updateFormData.phone
        });

        // Nếu có avatar mới
        if (avatarPreview && avatarPreview !== staffInfo.avatar) {
          setStaffInfo(prev => ({
            ...prev,
            avatar: avatarPreview
          }));
        }

        toast.success('Cập nhật thông tin thành công! (Chỉ lưu local, backend chưa có API)');
        setShowUpdateModal(false);
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error(error.message || 'Cập nhật thông tin thất bại');
      }
    }
  };

  // Change Password Functions
  const validatePasswordField = (name, value) => {
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
        if (value === passwordFormData.currentPassword) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
        return '';
      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu mới';
        if (value !== passwordFormData.newPassword) return 'Mật khẩu xác nhận không khớp';
        return '';
      default:
        return '';
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({ ...prev, [name]: value }));
    
    if (passwordTouched[name]) {
      const error = validatePasswordField(name, value);
      setPasswordErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handlePasswordBlur = (name) => {
    setPasswordTouched(prev => ({ ...prev, [name]: true }));
    const error = validatePasswordField(name, passwordFormData[name]);
    setPasswordErrors(prev => ({ ...prev, [name]: error }));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    Object.keys(passwordFormData).forEach(key => {
      const error = validatePasswordField(key, passwordFormData[key]);
      if (error) newErrors[key] = error;
    });

    setPasswordErrors(newErrors);
    setPasswordTouched({ currentPassword: true, newPassword: true, confirmPassword: true });

    if (Object.keys(newErrors).length === 0) {
      console.log('Đổi mật khẩu:', passwordFormData);
      // TODO: Call API to change password
      alert('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordTouched({});
      setPasswordErrors({});
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getGenderLabel = (gender) => {
    switch (gender) {
      case 'MALE': return 'Nam';
      case 'FEMALE': return 'Nữ';
      case 'OTHER': return 'Khác';
      default: return gender;
    }
  };

  if (loading) {
    return (
      <div className={styles.staffProfilePage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.staffProfilePage}>
      <div className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Thông tin nhân viên</h1>
      </div>

      <section className={styles.staffInfoSection}>
        <div className={styles.infoCard}>
          <div className={styles.avatarContainer}>
            {staffInfo.avatar ? (
              <img src={staffInfo.avatar} alt="Avatar" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <span>👤</span>
              </div>
            )}
          </div>
          <div className={styles.infoDetails}>
            <div className={styles.infoHeader}>
              <h2 className={styles.staffName}>{staffInfo.fullName}</h2>
              <span className={styles.staffCode}>Mã: STF{String(staffInfo.staffId).padStart(3, '0')}</span>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Họ và Tên:</span>
                <span className={styles.infoValue}>{staffInfo.fullName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Giới tính:</span>
                <span className={styles.infoValue}>{getGenderLabel(staffInfo.gender)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ngày sinh:</span>
                <span className={styles.infoValue}>{formatDate(staffInfo.dob)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Số điện thoại:</span>
                <span className={styles.infoValue}>{staffInfo.phone}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Chức danh / Vai trò:</span>
                <span className={styles.infoValue}>{staffInfo.position}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Thống kê cá nhân theo lịch sử làm việc</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🎫</span>
            <div className={styles.statLabel}>Tổng số ticket đã tham gia</div>
            <div className={styles.statValue}>{workStats.totalTickets}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🔧</span>
            <div className={styles.statLabel}>Tổng số dịch vụ đã thực hiện</div>
            <div className={styles.statValue}>{workStats.totalServices}</div>
          </div>
          <div className={`${styles.statCard} ${styles.blue}`}>
            <span className={styles.statIcon}>⏱️</span>
            <div className={styles.statLabel}>Tổng giờ làm việc tích lũy</div>
            <div className={styles.statValue}>
              {workStats.totalWorkingHours.toLocaleString('vi-VN')} giờ
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⭐</span>
            <div className={styles.statLabel}>Đánh giá trung bình từ khách hàng</div>
            <div className={styles.statValue}>
              {workStats.averageRating ? `${workStats.averageRating}/5.0` : 'Chưa có đánh giá'}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Tiện ích nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            action.link ? (
              <Link
                key={action.id}
                to={action.link}
                className={styles.actionCard}
              >
                <span className={styles.actionIcon}>{action.icon}</span>
                <h3 className={styles.actionTitle}>{action.title}</h3>
                <p className={styles.actionDescription}>{action.description}</p>
              </Link>
            ) : (
              <div
                key={action.id}
                onClick={action.onClick}
                className={styles.actionCard}
                style={{ cursor: 'pointer' }}
              >
                <span className={styles.actionIcon}>{action.icon}</span>
                <h3 className={styles.actionTitle}>{action.title}</h3>
                <p className={styles.actionDescription}>{action.description}</p>
              </div>
            )
          ))}
        </div>
      </section>

      {/* Update Profile Modal */}
      {showUpdateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUpdateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Cập nhật thông tin cá nhân</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowUpdateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className={styles.modalBody}>
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

              {/* Form Fields */}
              <div className={styles.formGroup}>
                <label htmlFor='fullName' className={styles.label}>
                  Họ và tên <span className={styles.required}>*</span>
                </label>
                <input
                  type='text'
                  id='fullName'
                  name='fullName'
                  value={updateFormData.fullName}
                  onChange={handleUpdateInputChange}
                  className={styles.input}
                  placeholder='Nhập họ và tên'
                />
                {updateErrors.fullName && (
                  <span className={styles.errorMessage}>{updateErrors.fullName}</span>
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
                    value={updateFormData.gender}
                    onChange={handleUpdateInputChange}
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
                    value={updateFormData.dob}
                    onChange={handleUpdateInputChange}
                    className={styles.input}
                  />
                  {updateErrors.dob && (
                    <span className={styles.errorMessage}>{updateErrors.dob}</span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor='phone' className={styles.label}>
                  Số điện thoại <span className={styles.required}>*</span>
                </label>
                <input
                  type='tel'
                  id='phone'
                  name='phone'
                  value={updateFormData.phone}
                  onChange={handleUpdateInputChange}
                  className={styles.input}
                  placeholder='Nhập số điện thoại'
                />
                {updateErrors.phone && (
                  <span className={styles.errorMessage}>{updateErrors.phone}</span>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button 
                  type='button' 
                  onClick={() => setShowUpdateModal(false)} 
                  className={styles.cancelButton}
                >
                  Hủy
                </button>
                <button type='submit' className={styles.submitButton}>
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Đổi mật khẩu</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor='currentPassword' className={styles.label}>
                  Mật khẩu hiện tại <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    id='currentPassword'
                    name='currentPassword'
                    value={passwordFormData.currentPassword}
                    onChange={handlePasswordInputChange}
                    onBlur={() => handlePasswordBlur('currentPassword')}
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
                {passwordErrors.currentPassword && passwordTouched.currentPassword && (
                  <span className={styles.errorMessage}>{passwordErrors.currentPassword}</span>
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
                    value={passwordFormData.newPassword}
                    onChange={handlePasswordInputChange}
                    onBlur={() => handlePasswordBlur('newPassword')}
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
                {passwordErrors.newPassword && passwordTouched.newPassword && (
                  <span className={styles.errorMessage}>{passwordErrors.newPassword}</span>
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
                    value={passwordFormData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    onBlur={() => handlePasswordBlur('confirmPassword')}
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
                {passwordErrors.confirmPassword && passwordTouched.confirmPassword && (
                  <span className={styles.errorMessage}>{passwordErrors.confirmPassword}</span>
                )}
                {!passwordErrors.confirmPassword && passwordFormData.confirmPassword && passwordFormData.confirmPassword === passwordFormData.newPassword && (
                  <span className={styles.successMessage}>✓ Mật khẩu xác nhận khớp</span>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button 
                  type='button' 
                  onClick={() => setShowPasswordModal(false)} 
                  className={styles.cancelButton}
                >
                  Hủy
                </button>
                <button type='submit' className={styles.submitButton}>
                  Đổi mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;
