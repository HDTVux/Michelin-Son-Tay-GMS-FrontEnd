import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './EditCustomerProfile.module.css';

const EditCustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'male',
    dateOfBirth: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    status: 'active',
    loyaltyPoints: 0,
    totalBookings: 0,
    registeredDate: '',
    lastVisit: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const mockData = {
      fullName: 'Nguyễn Văn A',
      email: 'user@example.com',
      phone: '0912345678',
      gender: 'male',
      dateOfBirth: '1990-01-15',
      address: '123 Đường ABC',
      city: 'Hà Nội',
      district: 'Sơn Tây',
      ward: 'Phường 1',
      status: 'active',
      loyaltyPoints: 1250,
      totalBookings: 15,
      registeredDate: '2024-01-01',
      lastVisit: '2024-02-20'
    };
    setFormData(mockData);
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Vui lòng chọn ngày sinh';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleBack = () => {
    navigate('/customer-manager');
  };

  const handleUpdatePhone = () => {
    alert('Tính năng cập nhật số điện thoại với xác thực OTP');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.backButton} onClick={handleBack}>
            ← Quay lại
          </button>
        </div>
        <h1 className={styles.title}>
          {isEditing ? 'Chỉnh sửa thông tin khách hàng' : 'Thông tin khách hàng'}
        </h1>
        <p className={styles.customerId}>Customer ID: #{customerId || 'CUS12345'}</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <form onSubmit={handleSubmit}>
            <div className={styles.card}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Họ và tên <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${errors.fullName ? styles.inputError : ''} ${!isEditing ? styles.inputDisabled : ''}`}
                    placeholder="Nhập họ và tên"
                  />
                  {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giới tính <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.select} ${!isEditing ? styles.inputDisabled : ''}`}
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Ngày sinh <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${errors.dateOfBirth ? styles.inputError : ''} ${!isEditing ? styles.inputDisabled : ''}`}
                  />
                  {errors.dateOfBirth && <span className={styles.errorText}>{errors.dateOfBirth}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Số điện thoại <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.phoneGroup}>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`${styles.input} ${errors.phone ? styles.inputError : ''} ${!isEditing ? styles.inputDisabled : ''}`}
                      placeholder="0912345678"
                    />
                    {isEditing && (
                      <button
                        type="button"
                        className={styles.updatePhoneBtn}
                        onClick={handleUpdatePhone}
                      >
                        Cập nhật
                      </button>
                    )}
                  </div>
                  {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''} ${!isEditing ? styles.inputDisabled : ''}`}
                    placeholder="user@example.com"
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
                    placeholder="Số nhà, tên đường"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Trạng thái tài khoản</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.select} ${!isEditing ? styles.inputDisabled : ''}`}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="blocked">Bị khóa</option>
                  </select>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}

            {!isEditing && (
              <div className={styles.actionsCenter}>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={handleEdit}
                >
                  Chỉnh sửa
                </button>
              </div>
            )}
          </form>
        </div>

        {!isEditing && (
          <div className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarHeader}>
                <h3 className={styles.sidebarTitle}>Thống kê khách hàng</h3>
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>🎯</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Điểm tích lũy</div>
                    <div className={styles.statValue}>{formData.loyaltyPoints}</div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>📅</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Tổng số booking</div>
                    <div className={styles.statValue}>{formData.totalBookings}</div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>➕</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Ngày tạo</div>
                    <div className={styles.statValue}>
                      {formData.registeredDate ? new Date(formData.registeredDate).toLocaleDateString('vi-VN') : '-'}
                    </div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>✏️</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Lần cập nhật cuối</div>
                    <div className={styles.statValue}>
                      {formData.lastVisit ? new Date(formData.lastVisit).toLocaleDateString('vi-VN') : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>Cập nhật thành công!</h3>
            <p className={styles.successMessage}>
              Thông tin khách hàng đã được cập nhật
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCustomerProfile;
