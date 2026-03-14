import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAllCustomers, updateCustomer } from '../../../services/adminService.js';
import styles from './EditCustomerProfile.module.css';

const normalizePhone = (value) => String(value || '').replaceAll(/\s/g, '');

const validateCustomerForm = (data) => {
  const newErrors = {};

  if (!data.fullName?.trim()) {
    newErrors.fullName = 'Vui lòng nhập họ và tên';
  }

  const phoneDigits = normalizePhone(data.phone);
  if (!phoneDigits.trim()) {
    newErrors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!/^\d{10}$/.test(phoneDigits)) {
    newErrors.phone = 'Số điện thoại không hợp lệ (10 số)';
  }

  if (!data.email?.trim()) {
    newErrors.email = 'Vui lòng nhập email';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    newErrors.email = 'Email không hợp lệ';
  }

  return newErrors;
};

const mapCustomerToFormData = (customer) => ({
  customerId: customer.customerId,
  status: customer.status || 'ACTIVE',
  fullName: customer.fullName || '',
  phone: customer.phone || '',
  email: customer.email || '',
  gender: customer.gender || 'MALE',
  dob: customer.dob || customer.dateOfBirth || '',
  createdAt: customer.createdAt || '',
  totalBookings: customer.totalBookings || 0,
});

const EditCustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    status: 'ACTIVE',
    fullName: '',
    phone: '',
    email: '',
    gender: 'MALE',
    dob: '',
    createdAt: '',
    totalBookings: 0
  });

  const [errors, setErrors] = useState({});

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập');
        navigate('/customer-manager');
        return;
      }

      const response = await fetchAllCustomers({
        page: 0,
        size: 100, // Load nhiều để tìm customer
        search: '' // Không filter
      }, token);

      if (response?.success && response?.data?.content) {
        const customer = response.data.content.find(
          (c) => c.customerId === Number.parseInt(customerId, 10)
        );

        if (customer) {
          setFormData(mapCustomerToFormData(customer));
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
  }, [customerId, navigate]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

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
    const newErrors = validateCustomerForm(formData);
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

      const payload = {
        status: formData.status || 'ACTIVE',
        lastLoginAt: null,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        dob: formData.dob || null,
        gender: formData.gender,
        avatar: null,
        firstBookingAt: null
      };

      const response = await updateCustomer(customerId, payload, token);

      if (response) {
        setFormData((prev) => ({
          ...prev,
          status: response.status ?? prev.status,
          fullName: response.fullName ?? prev.fullName,
          phone: response.phone ?? prev.phone,
          email: response.email ?? prev.email,
          dob: response.dob ?? prev.dob,
          gender: response.gender ?? prev.gender,
          // keep createdAt/totalBookings from previous list fetch
        }));
      }

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
                  <label className={styles.label} htmlFor="ecp_fullName">
                    Họ và tên <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="ecp_fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${errors.fullName ? styles.inputError : ''} ${isEditing ? '' : styles.inputDisabled}`}
                    placeholder="Nhập họ và tên"
                  />
                  {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                </div>

                {/* Số điện thoại - BẮT BUỘC */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ecp_phone">
                    Số điện thoại <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.phoneGroup}>
                    <input
                      id="ecp_phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`${styles.input} ${errors.phone ? styles.inputError : ''} ${isEditing ? '' : styles.inputDisabled}`}
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
                  <label className={styles.label} htmlFor="ecp_email">Email</label>
                  <input
                    id="ecp_email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''} ${isEditing ? '' : styles.inputDisabled}`}
                    placeholder="user@example.com"
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                {/* Giới tính - KHÔNG BẮT BUỘC */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ecp_gender">Giới tính</label>
                  <select
                    id="ecp_gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.select} ${isEditing ? '' : styles.inputDisabled}`}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                {/* Trạng thái */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ecp_status">Trạng thái</label>
                  <select
                    id="ecp_status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.select} ${isEditing ? '' : styles.inputDisabled}`}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Không hoạt động</option>
                  </select>
                </div>

                {/* Ngày sinh */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="ecp_dob">Ngày sinh</label>
                  <input
                    id="ecp_dob"
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`${styles.input} ${isEditing ? '' : styles.inputDisabled}`}
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
