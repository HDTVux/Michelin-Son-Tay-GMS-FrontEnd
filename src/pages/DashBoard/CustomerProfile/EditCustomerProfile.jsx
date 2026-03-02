import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './EditCustomerProfile.module.css';

const EditCustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'MALE',
    dateOfBirth: '',
    loyaltyPoints: 0,
    totalBookings: 0,
    registeredDate: '',
    lastVisit: ''
  });

  const [errors, setErrors] = useState({});
  const [isEmailValid, setIsEmailValid] = useState(true);

  // Load customer data
  useEffect(() => {
    // TODO: Fetch customer data from API
    // const token = localStorage.getItem('staffToken');
    // const response = await fetchCustomerProfile(customerId, token);
    
    // Mock data for now
    setFormData({
      fullName: 'Nguyễn Văn A',
      email: 'user@example.com',
      phone: '0912345678',
      gender: 'MALE',
      dateOfBirth: '1990-01-15',
      loyaltyPoints: 1250,
      totalBookings: 15,
      registeredDate: '2024-01-01',
      lastVisit: '2024-02-20'
    });
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Validate email in real-time
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setIsEmailValid(emailRegex.test(value));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!isEmailValid) {
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
      // TODO: Call API to update customer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/customer-profile');
      }, 1500);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/customer-profile');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleCancel}>
          ← Quay lại
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Chỉnh sửa thông tin khách hàng</h1>
          <p className={styles.customerId}>Customer ID: #{customerId || 'CUS12345'}</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <form onSubmit={handleSubmit}>
            {/* Thông tin cơ bản */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
                <span className={styles.badge}>Bắt buộc</span>
              </div>

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
                    className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                  {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Số điện thoại <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    placeholder="0912345678"
                  />
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
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="user@example.com"
                  />
                  {!isEmailValid && formData.email && (
                    <span className={styles.warningText}>Email đã tồn tại</span>
                  )}
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giới tính <span className={styles.required}>*</span>
                  </label>
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
                  <label className={styles.label}>
                    Ngày sinh <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.dateOfBirth ? styles.inputError : ''}`}
                    placeholder="mm/dd/yyyy"
                  />
                  {errors.dateOfBirth && <span className={styles.errorText}>{errors.dateOfBirth}</span>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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
          </form>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Customer Stats */}
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
                <div className={styles.statIcon}>📆</div>
                <div className={styles.statContent}>
                  <div className={styles.statLabel}>Ngày tạo</div>
                  <div className={styles.statValue}>
                    {new Date(formData.registeredDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>🕐</div>
                <div className={styles.statContent}>
                  <div className={styles.statLabel}>Lần cập nhật cuối</div>
                  <div className={styles.statValue}>
                    {new Date(formData.lastVisit).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Hành động nhanh</h3>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.quickActionBtn}>
                <span className={styles.quickActionIcon}>📧</span>
                Gửi email
              </button>
              <button className={styles.quickActionBtn}>
                <span className={styles.quickActionIcon}>📱</span>
                Gọi điện
              </button>
              <button className={styles.quickActionBtn}>
                <span className={styles.quickActionIcon}>📝</span>
                Xem lịch sử
              </button>
              <button className={styles.quickActionBtn}>
                <span className={styles.quickActionIcon}>🎁</span>
                Tặng điểm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
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
