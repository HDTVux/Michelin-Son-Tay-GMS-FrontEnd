import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import { fetchStaffProfile } from '../../services/staffService.js';
import { fetchStaffStatistics } from '../../services/staffStatisticsService.js';
import { getValidToken } from '../../services/tokenUtils.js';
import { toast } from 'react-toastify';
import { getAvatarSrc, handleAvatarError } from '../../assets/defaultAvatar.js';
import styles from './StaffProfile.module.css';

const ROLE_LABELS = {
  MANAGER: 'Quản lý',
  ADVISOR: 'Cố vấn viên',
  RECEPTIONIST: 'Lễ tân',
  TECHNICIAN: 'Kỹ thuật viên',
  ADMIN: 'Quản trị viên',
};

const readStaffProfileFromStorage = () => {
  try {
    const raw = localStorage.getItem('staffProfile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      staffId: parsed.staffId ?? null,
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
      role: Array.isArray(parsed.role) ? parsed.role : [],
    };
  } catch {
    return null;
  }
};

const StaffProfile = () => {
  useScrollToTop();

  const fileInputRef = useRef(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lấy profile từ localStorage trước (dữ liệu từ lúc đăng nhập)
  const storedProfile = readStaffProfileFromStorage();

  const [staffInfo, setStaffInfo] = useState({
    staffId: storedProfile?.staffId ?? null,
    avatar: storedProfile?.avatarUrl ?? null,
    fullName: storedProfile?.fullName ?? '',
    gender: 'MALE',
    dob: '',
    phone: '',
    position: ROLE_LABELS[storedProfile?.role?.[0] ?? ''] ?? storedProfile?.role?.[0] ?? ''
  });

  // Fetch staff profile from API để lấy thêm thông tin chi tiết
  useEffect(() => {
    const loadStaffProfile = async () => {
      try {
        const token = await getValidToken('authToken');
        if (!token) {
          setLoading(false);
          return;
        }
        const response = await fetchStaffProfile(token);
        const data = response?.data || response;

        // Chỉ merge nếu API trả đúng dữ liệu (không phải mock/greeting)
        if (data && typeof data === 'object' && (data.staffId || data.id || data.fullName)) {
          setStaffInfo((prev) => ({
            staffId: data.staffId ?? data.id ?? prev.staffId,
            avatar: data.avatarUrl ?? data.avatar ?? prev.avatar,
            fullName: data.fullName ?? data.name ?? prev.fullName,
            gender: data.gender ?? prev.gender,
            dob: data.dob ?? data.dateOfBirth ?? prev.dob,
            phone: data.phone ?? data.phoneNumber ?? prev.phone,
            position: ROLE_LABELS[data.position] ?? ROLE_LABELS[data.role] ?? data.position ?? data.role ?? data.chucDanh ?? prev.position,
          }));
        }
      } catch (error) {
        console.error('Error fetching staff profile from API:', error);
        // Không dùng mock data — vẫn giữ data từ localStorage
      } finally {
        setLoading(false);
      }
    };

    loadStaffProfile();
  }, []);

  const [workStats, setWorkStats] = useState({
    totalTickets: 0,
    totalServices: 0,
    totalWorkingHours: 0,
    averageRating: 0
  });

  // Fetch work statistics
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const token = await getValidToken('authToken');
        if (token) {
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();

          const response = await fetchStaffStatistics(month, year, token);
          const stats = response.data || {};

          setWorkStats({
            totalTickets: stats.completedServices || 0,
            totalServices: stats.completedServices || 0,
            totalWorkingHours: stats.totalHours || 0,
            averageRating: 0 // Backend chưa có API đánh giá
          });
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    loadStatistics();
  }, []);

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

  // Dynamically compute links based on normalized role
  const staffProfileForActions = readStaffProfileFromStorage();
  const rawRole = staffProfileForActions?.role?.[0] || '';
  const normalizedRole = rawRole.toUpperCase().replace('ROLE_', '');

  let workHistoryLink = '/work-history/technician';
  if (['TECHNICIAN', 'ADVISOR', 'RECEPTIONIST', 'ACCOUNTANT', 'MANAGER', 'ADMIN'].includes(normalizedRole)) {
    workHistoryLink = `/work-history/${normalizedRole.toLowerCase()}`;
  }

  let taskLink = '/technician/my-tasks';
  let taskTitle = 'Xem công việc được giao';
  let taskDesc = 'Quản lý và theo dõi các công việc được giao';
  if (normalizedRole === 'ADVISOR') {
    taskLink = '/advisor/inspection';
    taskTitle = 'Điều phối phiếu';
    taskDesc = 'Màn điều phối dịch vụ và phiếu cần cố vấn';
  } else if (normalizedRole === 'RECEPTIONIST') {
    taskLink = '/booking-management';
    taskTitle = 'Quản lý lịch hẹn';
    taskDesc = 'Tiếp nhận xe và quản lý lịch hẹn lễ tân';
  } else if (normalizedRole === 'ACCOUNTANT') {
    taskLink = '/service-ticket-management';
    taskTitle = 'Hóa đơn dịch vụ';
    taskDesc = 'Theo dõi phiếu dịch vụ và hóa đơn thanh toán';
  } else if (normalizedRole === 'MANAGER') {
    taskLink = '/employee-manager';
    taskTitle = 'Quản lý nhân viên';
    taskDesc = 'Xem danh sách và quản lý hồ sơ nhân viên';
  } else if (normalizedRole === 'ADMIN') {
    taskLink = '/system-log-management';
    taskTitle = 'Nhật ký hệ thống';
    taskDesc = 'Xem nhật ký hoạt động của hệ thống';
  }

  const quickActions = [
    {
      id: 0,
      icon: '👤',
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
      title: 'Lịch sử công việc',
      description: 'Xem chi tiết các công việc bạn đã thực hiện',
      link: workHistoryLink
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
      title: taskTitle,
      description: taskDesc,
      link: taskLink
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
            <img
              src={getAvatarSrc(staffInfo.avatar)}
              alt="Avatar"
              className={styles.avatarImage}
              onError={handleAvatarError}
            />
          </div>
          <div className={styles.infoDetails}>
            <div className={styles.infoHeader}>
              <h2 className={styles.staffName}>{staffInfo.fullName}</h2>
            </div>
            <div className={styles.infoGrid}>
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
            <span className={`${styles.statIcon} ${styles.iconTicket}`}>🎫</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{workStats.totalTickets}</div>
              <div className={styles.statLabel}>Tổng số ticket đã tham gia</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.iconWrench}`}>🔧</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{workStats.totalServices}</div>
              <div className={styles.statLabel}>Tổng số dịch vụ đã thực hiện</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.iconClock}`}>⏱️</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>
                {workStats.totalWorkingHours.toLocaleString('vi-VN')} giờ
              </div>
              <div className={styles.statLabel}>Tổng giờ làm việc tích lũy</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.iconStar}`}>⭐</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>
                {workStats.averageRating ? `${workStats.averageRating}/5.0` : 'Chưa có đánh giá'}
              </div>
              <div className={styles.statLabel}>Đánh giá trung bình</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Tiện ích nhanh</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => {
            const iconClass = action.id === 0 ? styles.iconEdit
                            : action.id === 1 ? styles.iconHistory
                            : action.id === 2 ? styles.iconPassword
                            : styles.iconTasks;
            return action.link ? (
              <Link
                key={action.id}
                to={action.link}
                className={styles.actionCard}
              >
                <span className={`${styles.actionIcon} ${iconClass}`}>{action.icon}</span>
                <div className={styles.actionInfo}>
                  <h3 className={styles.actionTitle}>{action.title}</h3>
                  <p className={styles.actionDescription}>{action.description}</p>
                </div>
              </Link>
            ) : (
              <div
                key={action.id}
                onClick={action.onClick}
                className={styles.actionCard}
                style={{ cursor: 'pointer' }}
              >
                <span className={`${styles.actionIcon} ${iconClass}`}>{action.icon}</span>
                <div className={styles.actionInfo}>
                  <h3 className={styles.actionTitle}>{action.title}</h3>
                  <p className={styles.actionDescription}>{action.description}</p>
                </div>
              </div>
            );
          })}
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
                  <img src={getAvatarSrc(avatarPreview)} alt="Avatar preview" onError={handleAvatarError} />
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
