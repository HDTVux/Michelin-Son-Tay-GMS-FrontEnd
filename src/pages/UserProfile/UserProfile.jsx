import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchCustomerProfile, updateCustomerProfile, uploadAvatar } from '../../services/customerService.js';
import styles from './UserProfile.module.css';
import headerStyles from './UserProfile.header.module.css';
import infoStyles from './UserProfile.personalInfo.module.css';
import statsStyles from './UserProfile.stats.module.css';
import actionsStyles from './UserProfile.quickActions.module.css';

const UserProfile = () => {
  useScrollToTop();
  const fileInputRef = useRef(null);

  const [customerProfile, setCustomerProfile] = useState({
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'Nam',
    avatar: null
  });

  const [stats] = useState({
    totalServices: 15,
    totalAmount: 8500000
  });

  const [loadingProfile, setLoadingProfile] = useState(true);

  // Modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLinkedAccountsModal, setShowLinkedAccountsModal] = useState(false);

  // Update Profile Modal State
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({ ...customerProfile });
  const [updateErrors, setUpdateErrors] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);

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
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Linked Accounts Modal State
  const [linkedAccounts, setLinkedAccounts] = useState({
    google: false,
    zalo: false
  });

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          setLoadingProfile(false);
          return;
        }

        const response = await fetchCustomerProfile(token);
        const profile = response.data;

        const profileData = {
          fullName: profile.fullName || '',
          phone: profile.phone || '',
          email: profile.email || '',
          dob: profile.dob || '',
          gender: profile.gender || 'Nam',
          avatar: profile.avatarUrl || null
        };

        setCustomerProfile(profileData);
        setUpdateFormData(profileData);
        setAvatarPreview(profileData.avatar);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const quickActions = [
    {
      id: 0,
      icon: '📅',
      title: 'Lịch hẹn của tôi',
      description: 'Xem và quản lý các lịch hẹn đã đặt',
      link: '/my-bookings'
    },
    {
      id: 1,
      icon: '📋',
      title: 'Xem lịch sử dịch vụ',
      description: 'Xem danh sách các dịch vụ đã sử dụng',
      link: '/service-history'
    },
    {
      id: 2,
      icon: '🛡️',
      title: 'Tra cứu bảo hành',
      description: 'Tra cứu thông tin bảo hành theo xe / dịch vụ',
      link: '/warranty'
    },
    {
      id: 3,
      icon: '🎁',
      title: 'Ưu đãi dành riêng cho tôi',
      description: 'Xem các ưu đãi cá nhân hóa của bạn',
      link: '/promotions'
    },
    {
      id: 4,
      icon: '🔗',
      title: 'Liên kết tài khoản',
      description: 'Liên kết tài khoản Zalo, Google',
      onClick: () => setShowLinkedAccountsModal(true)
    },
    {
      id: 5,
      icon: '✏️',
      title: 'Cập nhật thông tin cá nhân',
      description: 'Cập nhật thông tin cá nhân và hồ sơ của bạn',
      onClick: () => {
        setUpdateFormData({ ...customerProfile });
        setAvatarPreview(customerProfile.avatar);
        setShowUpdateModal(true);
      }
    },
    {
      id: 6,
      icon: '🔒',
      title: 'Đổi mật khẩu',
      description: 'Thay đổi mật khẩu tài khoản',
      onClick: () => setShowPasswordModal(true)
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

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({ ...prev, [name]: value }));
    if (updateErrors[name]) {
      setUpdateErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateUpdateForm = () => {
    const newErrors = {};

    if (!updateFormData.fullName?.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!updateFormData.phone?.trim()) {
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
      setUpdateLoading(true);
      try {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          alert('Vui lòng đăng nhập');
          return;
        }

        // Upload avatar first if changed
        if (avatarFile) {
          await uploadAvatar(avatarFile, token);
        }

        // Update profile
        const payload = {
          fullName: updateFormData.fullName,
          email: updateFormData.email,
          gender: updateFormData.gender,
          phone: updateFormData.phone,
          dob: updateFormData.dob
        };

        await updateCustomerProfile(payload, token);

        // Update local state
        setCustomerProfile({ ...updateFormData, avatar: avatarPreview });
        alert('Cập nhật thông tin thành công!');
        setShowUpdateModal(false);
      } catch (error) {
        console.error('Error updating profile:', error);
        alert(error.message || 'Không thể cập nhật thông tin');
      } finally {
        setUpdateLoading(false);
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
      setPasswordLoading(true);
      setTimeout(() => {
        alert('Đổi mật khẩu thành công!');
        setShowPasswordModal(false);
        setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordTouched({});
        setPasswordErrors({});
        setPasswordLoading(false);
      }, 1000);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Linked Accounts Functions
  const handleLinkAccount = (provider) => {
    setLinkedAccounts(prev => ({ ...prev, [provider]: true }));
    alert(`Đã liên kết tài khoản ${provider === 'google' ? 'Google' : 'Zalo'}`);
  };

  const handleUnlinkAccount = (provider) => {
    setLinkedAccounts(prev => ({ ...prev, [provider]: false }));
    alert(`Đã hủy liên kết tài khoản ${provider === 'google' ? 'Google' : 'Zalo'}`);
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
      default: return gender || 'Nam';
    }
  };

  return (
    <div className={styles['user-profile-page']}>
      <div className={styles['profile-container']}>
        <div className={headerStyles['header']}>
          <h1 className={headerStyles['title']}>Thông tin cá nhân</h1>
          <Link to="/" className={headerStyles['back-button']}>← Quay lại trang chủ</Link>
        </div>

        {loadingProfile ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải thông tin...</div>
        ) : (
          <>
        <section className={infoStyles['personal-info-section']}>
          <div className={infoStyles['info-card']}>
            <div className={infoStyles['avatar-container']}>
                  {customerProfile.avatar ? (
                    <img src={customerProfile.avatar} alt="Avatar" className={infoStyles['avatar-image']} />
              ) : (
                <div className={infoStyles['avatar-placeholder']}>
                  <span className={infoStyles['avatar-icon']}>👤</span>
                </div>
              )}
            </div>
            <div className={infoStyles['info-details']}>
              <div className={infoStyles['info-header']}>
                    <h2 className={infoStyles['user-name']}>{customerProfile.fullName || 'Chưa cập nhật'}</h2>
                  </div>
                  <div className={infoStyles['info-row']}>
                    <span className={infoStyles['info-label']}>Họ và tên:</span>
                    <span className={infoStyles['info-value']}>{customerProfile.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className={infoStyles['info-row']}>
                <span className={infoStyles['info-label']}>Số điện thoại:</span>
                    <span className={infoStyles['info-value']}>{customerProfile.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className={infoStyles['info-row']}>
                <span className={infoStyles['info-label']}>Email:</span>
                    <span className={infoStyles['info-value']}>{customerProfile.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div className={infoStyles['info-row']}>
                    <span className={infoStyles['info-label']}>Ngày sinh:</span>
                    <span className={infoStyles['info-value']}>{formatDate(customerProfile.dob) || 'Chưa cập nhật'}</span>
              </div>
              <div className={infoStyles['info-row']}>
                <span className={infoStyles['info-label']}>Giới tính:</span>
                    <span className={infoStyles['info-value']}>{getGenderLabel(customerProfile.gender)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={statsStyles['stats-section']}>
          <h2 className={statsStyles['section-title']}>Thống kê sử dụng dịch vụ</h2>
          <div className={statsStyles['stats-grid']}>
            <div className={`${statsStyles['stat-card']} ${statsStyles['white']}`}>
              <div className={statsStyles['stat-icon']}>📊</div>
              <div className={statsStyles['stat-label']}>Tổng số lần sử dụng dịch vụ</div>
              <div className={`${statsStyles['stat-value']} ${statsStyles['blue']}`}>{stats.totalServices}</div>
            </div>
            <div className={`${statsStyles['stat-card']} ${statsStyles['blue']}`}>
              <div className={statsStyles['stat-icon']}>💰</div>
              <div className={statsStyles['stat-label']}>Tổng tiền tích lũy</div>
              <div className={`${statsStyles['stat-value']} ${statsStyles['white']}`}>{stats.totalAmount.toLocaleString('vi-VN')} ₫</div>
            </div>
          </div>
        </section>

        <section className={actionsStyles['quick-actions-section']}>
              <h2 className={statsStyles['section-title']}>Tiện ích nhanh</h2>
          <div className={actionsStyles['actions-grid']}>
            {quickActions.map((action) => (
                  action.link ? (
              <Link key={action.id} to={action.link} className={actionsStyles['action-card']}>
                <div className={actionsStyles['action-icon']}>{action.icon}</div>
                <h3 className={actionsStyles['action-title']}>{action.title}</h3>
                <p className={actionsStyles['action-description']}>{action.description}</p>
              </Link>
                  ) : (
                    <div
                      key={action.id}
                      onClick={action.onClick}
                      className={actionsStyles['action-card']}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={actionsStyles['action-icon']}>{action.icon}</div>
                      <h3 className={actionsStyles['action-title']}>{action.title}</h3>
                      <p className={actionsStyles['action-description']}>{action.description}</p>
                    </div>
                  )
            ))}
          </div>
        </section>
          </>
        )}
      </div>

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
                  value={updateFormData.fullName || ''}
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
                    value={updateFormData.gender || 'Nam'}
                    onChange={handleUpdateInputChange}
                    className={styles.select}
                  >
                    <option value='MALE'>Nam</option>
                    <option value='FEMALE'>Nữ</option>
                    <option value='OTHER'>Khác</option>
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
                    value={updateFormData.dob || ''}
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
                  value={updateFormData.phone || ''}
                  onChange={handleUpdateInputChange}
                  className={styles.input}
                  placeholder='Nhập số điện thoại'
                />
                {updateErrors.phone && (
                  <span className={styles.errorMessage}>{updateErrors.phone}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor='email' className={styles.label}>
                  Email
                </label>
                <input
                  type='email'
                  id='email'
                  name='email'
                  value={updateFormData.email || ''}
                  onChange={handleUpdateInputChange}
                  className={styles.input}
                  placeholder='Nhập email'
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type='button'
                  onClick={() => setShowUpdateModal(false)}
                  className={styles.cancelButton}
                  disabled={updateLoading}
                >
                  Hủy
                </button>
                <button type='submit' className={styles.submitButton} disabled={updateLoading}>
                  {updateLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
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
                  disabled={passwordLoading}
                >
                  Hủy
                </button>
                <button type='submit' className={styles.submitButton} disabled={passwordLoading}>
                  {passwordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Linked Accounts Modal */}
      {showLinkedAccountsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLinkedAccountsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Liên kết tài khoản</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowLinkedAccountsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.linkedAccountsDesc}>Kết nối với mạng xã hội để đăng nhập nhanh hơn</p>

              <div className={styles.linkedAccountsList}>
                {/* Google */}
                <div className={styles.linkedAccountItem}>
                  <div className={styles.accountInfo}>
                    <div className={`${styles.accountIcon} ${styles.google}`}>G</div>
                    <div className={styles.accountDetails}>
                      <span className={styles.accountName}>Google</span>
                      <span className={styles.accountStatus}>
                        {linkedAccounts.google ? '(Đã liên kết)' : '(Chưa liên kết)'}
                      </span>
                    </div>
                  </div>
                  {linkedAccounts.google ? (
                    <button
                      type="button"
                      className={styles.btnUnlink}
                      onClick={() => handleUnlinkAccount('google')}
                    >
                      Hủy liên kết
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnLink}
                      onClick={() => handleLinkAccount('google')}
                    >
                      Liên kết
                    </button>
                  )}
                </div>

                {/* Zalo */}
                <div className={styles.linkedAccountItem}>
                  <div className={styles.accountInfo}>
                    <div className={`${styles.accountIcon} ${styles.zalo}`}>Z</div>
                    <div className={styles.accountDetails}>
                      <span className={styles.accountName}>Zalo</span>
                      <span className={styles.accountStatus}>
                        {linkedAccounts.zalo ? '(Đã liên kết)' : '(Chưa liên kết)'}
                      </span>
                    </div>
                  </div>
                  {linkedAccounts.zalo ? (
                    <button
                      type="button"
                      className={styles.btnUnlink}
                      onClick={() => handleUnlinkAccount('zalo')}
                    >
                      Hủy liên kết
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnLink}
                      onClick={() => handleLinkAccount('zalo')}
                    >
                      Liên kết
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type='button'
                onClick={() => setShowLinkedAccountsModal(false)}
                className={styles.cancelButton}
              >
                Đóng
              </button>
            </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
