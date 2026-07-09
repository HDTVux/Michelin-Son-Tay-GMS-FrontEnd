import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchCustomerDetail, updateCustomer } from '../../../services/adminService.js';
import { fetchServiceTicketBookingHistoryByCustomerId } from '../../../services/serviceTicketService.js';
import styles from './EditCustomerProfile.module.css';

const normalizePhone = (value) => String(value || '').replaceAll(/\s/g, '');

const normalizeCustomerStatus = (value) => {
  if (value == null || String(value).trim() === '') return 'NOT_ACTIVATED';
  return String(value).trim().toUpperCase();
};

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
	status: normalizeCustomerStatus(customer.status),
  fullName: customer.fullName || '',
  phone: customer.phone || '',
  email: customer.email || '',
  gender: customer.gender || 'MALE',
  dob: customer.dob || customer.dateOfBirth || '',
  createdAt: customer.createdAt || '',
  totalBookings: customer.totalBookings ?? null,
});

const getAuthToken = () =>
	localStorage.getItem('authToken') ||
	localStorage.getItem('adminToken') ||
	localStorage.getItem('staffToken') ||
	'';

const EditCustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    status: 'ACTIVE',
    fullName: '',
    phone: '',
    email: '',
    gender: 'MALE',
    dob: '',
    createdAt: '',
    totalBookings: null
  });

  const [errors, setErrors] = useState({});

	const canEdit = formData.status !== 'NOT_ACTIVATED';

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để xem thông tin khách hàng');
        navigate('/customer-manager');
        return;
      }

		const response = await fetchCustomerDetail(customerId, token);
		const customer = response?.data;

		if (customer) {
			setFormData(mapCustomerToFormData(customer));
			try {
				setLoadingHistory(true);
				const historyResponse = await fetchServiceTicketBookingHistoryByCustomerId(customerId, token);
				setServiceHistory(historyResponse?.data || []);
			} catch (err) {
				console.error('Error fetching service history:', err);
			} finally {
				setLoadingHistory(false);
			}
		} else {
			toast.error('Không tìm thấy khách hàng');
			navigate('/customer-manager');
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

	useEffect(() => {
		if (!canEdit && isEditing) setIsEditing(false);
	}, [canEdit, isEditing]);

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
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để cập nhật thông tin khách hàng');
        return;
      }

      const payload = {
  		status: formData.status === 'NOT_ACTIVATED' ? null : (formData.status || 'ACTIVE'),
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
		const updated = response?.data ?? response;

		if (updated) {
        setFormData((prev) => ({
          ...prev,
      status: normalizeCustomerStatus(updated.status ?? prev.status),
			fullName: updated.fullName ?? prev.fullName,
			phone: updated.phone ?? prev.phone,
			email: updated.email ?? prev.email,
			dob: updated.dob ?? prev.dob,
			gender: updated.gender ?? prev.gender,
			createdAt: updated.createdAt ?? prev.createdAt,
			totalBookings: updated.totalBookings ?? prev.totalBookings,
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
		if (!canEdit) return;
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

				{!isEditing && canEdit && (
					<div className={styles.headerActions}>
						<button
							type="button"
							className={styles.editButton}
							onClick={handleEdit}
						>
							Chỉnh sửa
						</button>
					</div>
				)}
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
					          <option value="NOT_ACTIVATED">Chưa kích hoạt</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Không hoạt động</option>
					          <option value="LOCKED">Đã khóa</option>
					          <option value="DELETED">Đã xóa</option>
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

          </form>

          {!isEditing && (
            <div className={styles.card} style={{ marginTop: '24px' }}>
              <div className={styles.cardHeader} style={{ marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                <h3 className={styles.cardTitle} style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Lịch sử sửa chữa & dịch vụ
                </h3>
              </div>
              {loadingHistory ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280' }}>Đang tải lịch sử dịch vụ...</div>
              ) : serviceHistory.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>Chưa có lịch sử dịch vụ tại xưởng.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', background: '#f9fafb' }}>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151' }}>Mã phiếu</th>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151' }}>Ngày tiếp nhận</th>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151' }}>Biển số xe</th>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151' }}>Hiệu xe</th>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151' }}>Dịch vụ / Yêu cầu</th>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151' }}>Trạng thái</th>
                        <th style={{ padding: '12px 8px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceHistory.map((ticket) => {
                        const statusKey = String(ticket.ticketStatus || '').toUpperCase();
                        let badgeColor = '#6b7280';
                        let badgeBg = '#f3f4f6';
                        let statusTextVi = ticket.ticketStatus || 'Chờ xử lý';
                        
                        if (statusKey === 'DRAFT' || statusKey === 'CREATED') {
                          badgeColor = '#d97706';
                          badgeBg = '#fef3c7';
                          statusTextVi = 'Nháp / Mới';
                        } else if (statusKey === 'IN_PROGRESS' || statusKey === 'REPAIRING') {
                          badgeColor = '#2563eb';
                          badgeBg = '#dbeafe';
                          statusTextVi = 'Đang sửa chữa';
                        } else if (statusKey === 'COMPLETED') {
                          badgeColor = '#059669';
                          badgeBg = '#d1fae5';
                          statusTextVi = 'Hoàn tất';
                        } else if (statusKey === 'PAID') {
                          badgeColor = '#7c3aed';
                          badgeBg = '#ede9fe';
                          statusTextVi = 'Đã thanh toán';
                        } else if (statusKey === 'CANCELLED') {
                          badgeColor = '#dc2626';
                          badgeBg = '#fee2e2';
                          statusTextVi = 'Đã hủy';
                        }

                        return (
                          <tr key={ticket.serviceTicketId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 8px', fontWeight: '600', color: '#111827' }}>
                              {ticket.ticketCode}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#4b5563' }}>
                              {ticket.receivedAt ? new Date(ticket.receivedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', color: '#374151', border: '1px solid #e5e7eb' }}>
                                {ticket.licensePlate || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', color: '#4b5563' }}>
                              {ticket.vehicleBrand || ticket.vehicleMake || ''} {ticket.vehicleModel || ''}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#4b5563', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.customerRequest || ticket.serviceCategory}>
                              {ticket.customerRequest || ticket.serviceCategory || '-'}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '9999px', fontWeight: '500', color: badgeColor, backgroundColor: badgeBg, fontSize: '12px' }}>
                                {statusTextVi}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}
                                onClick={() => navigate(`/service-ticket-detail/${ticket.ticketCode}`)}
                              >
                                Xem chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
						  {typeof formData.totalBookings === 'number' ? `${formData.totalBookings} lần` : '-'}
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
