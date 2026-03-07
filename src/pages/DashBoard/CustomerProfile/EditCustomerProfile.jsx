import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './EditCustomerProfile.module.css';

const EditCustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'MALE',
    dateOfBirth: '',
    avatar: '',
    createdAt: '',
    firstBookingAt: '',
    totalBookings: 0
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        navigate('/customer-manager');
        return;
      }

      // TODO: Backend cần implement API GET /api/admin/customer/{customerId}
      // Tạm thời load từ danh sách và filter theo customerId
      const { fetchAllCustomers } = await import('../../../services/adminService.js');
      
      const response = await fetchAllCustomers({
        page: 0,
        size: 100, // Load nhiều để tìm customer
        search: '' // Không filter
      }, token);

      if (response?.success && response?.data?.content) {
        const customer = response.data.content.find(
          c => c.customerId === parseInt(customerId)
        );

        if (customer) {
          setFormData({
            customerId: customer.customerId,
            fullName: customer.fullName || '',
            phone: customer.phone || '',
            email: customer.email || '',
            gender: customer.gender || 'MALE',
            dateOfBirth: customer.dateOfBirth || customer.dob || '',
            avatar: customer.avatar || '',
            createdAt: customer.createdAt || '',
            firstBookingAt: customer.firstBookingAt || '',
            totalBookings: customer.totalBookings || 0
          });
        } else {
          toast.error('Không tìm thấy khách hàng');
          navigate('/customer-manager');
        }
      } else {
        toast.error('Không thể tải thông tin khách hàng');
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      toast.error(error.message || 'Không thể tải thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

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

    // Họ tên - BẮT BUỘC
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }

    // Số điện thoại - BẮT BUỘC
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số)';
    }

    // Email - KHÔNG BẮT BUỘC nhưng nếu có thì phải đúng format
    if (formData.email && formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email không hợp lệ';
      }
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        return;
      }

      // TODO: Backend cần implement API PUT /api/admin/customer/{customerId}
      // const payload = {
      //   fullName: formData.fullName,
      //   phone: formData.phone,
      //   email: formData.email,
      //   gender: formData.gender,
      //   dateOfBirth: formData.dateOfBirth
      // };
      // await updateCustomer(customerId, payload, token);

      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Cập nhật thông tin khách hàng thành công!');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật thông tin khách hàng');
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
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải thông tin khách hàng...</p>
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <button className={styles.backButton} onClick={handleBack}>
                ← Quay lại
              </button>
            </div>
            <h1 className={styles.title}>
              {isEditing ? 'Chỉnh sửa thông tin khách hàng' : 'Thông tin khách hàng'}
            </h1>
            <p className={styles.customerId}>Customer ID: #{customerId}</p>
          </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <form onSubmit={handleSubmit}>
            <div className={styles.card}>
              <div className={styles.formGrid}>
                {/* Họ và tên - BẮT BUỘC */}
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

                {/* Số điện thoại - BẮT BUỘC */}
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

                {/* Email - KHÔNG BẮT BUỘC */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
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

                {/* Giới tính - KHÔNG BẮT BUỘC */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.select} ${!isEditing ? styles.inputDisabled : ''}`}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                {/* Ngày sinh - KHÔNG BẮT BUỘC */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày sinh</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
                  />
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
                <h3 className={styles.sidebarTitle}>Thông tin bổ sung</h3>
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>➕</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Ngày tạo tài khoản</div>
                    <div className={styles.statValue}>
                      {formData.createdAt ? new Date(formData.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>📅</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Lần đặt lịch đầu tiên</div>
                    <div className={styles.statValue}>
                      {formData.firstBookingAt ? new Date(formData.firstBookingAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                    </div>
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>📊</div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Tổng số booking</div>
                    <div className={styles.statValue}>
                      {formData.totalBookings || 0} lần
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </>
      )}

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
