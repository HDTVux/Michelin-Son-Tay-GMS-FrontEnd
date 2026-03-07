import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { toast } from 'react-toastify';
import { fetchAllCustomers, createCustomer } from '../../../services/adminService.js';
import styles from './CustomerManager.module.css';

const CustomerManager = () => {
  useScrollToTop();
  const navigate = useNavigate();

  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    password: '',
    sendNotification: false
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load customers from API
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để xem danh sách khách hàng');
        return;
      }

      const params = {
        page: currentPage - 1, // Backend uses 0-based index
        size: itemsPerPage,
        search: searchTerm || undefined,
      };

      const response = await fetchAllCustomers(params, token);
      
      if (response?.success && response?.data) {
        const { content, totalElements } = response.data;
        setCustomers(content || []);
        setTotalItems(totalElements || 0);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error(error.message || 'Không tải được dữ liệu khách hàng');
      setCustomers([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.gender) {
      newErrors.gender = 'Vui lòng chọn giới tính';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để thêm khách hàng');
        return;
      }

      const payload = {
        phone: formData.phone,
        fullName: formData.fullName,
        email: formData.email,
        // Backend có thể cần thêm các trường này nếu hỗ trợ
        // gender: formData.gender,
        // username: formData.username,
        // password: formData.password,
        // sendNotification: formData.sendNotification
      };

      const response = await createCustomer(payload, token);

      if (response?.success) {
        toast.success('Thêm khách hàng thành công!');
        setShowModal(false);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          gender: '',
          password: '',
          sendNotification: false
        });
        setCurrentPage(1);
        loadCustomers();
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Thêm khách hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return styles.statusActive;
      case 'INACTIVE': return styles.statusInactive;
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'INACTIVE': return 'Không hoạt động';
      default: return status;
    }
  };

  const handleLockAccount = async (customerId) => {
    if (window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
      try {
        // Update UI immediately
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === customerId 
              ? { ...customer, status: 'INACTIVE' }
              : customer
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success('Khóa tài khoản thành công!');
      } catch (error) {
        console.error('Error locking account:', error);
        toast.error('Khóa tài khoản thất bại');
        loadCustomers(); // Reload on error
      }
    }
  };

  const handleUnlockAccount = async (customerId) => {
    if (window.confirm('Bạn có chắc chắn muốn mở khóa tài khoản này?')) {
      try {
        // Update UI immediately
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === customerId 
              ? { ...customer, status: 'ACTIVE' }
              : customer
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success('Mở khóa tài khoản thành công!');
      } catch (error) {
        console.error('Error unlocking account:', error);
        toast.error('Mở khóa tài khoản thất bại');
        loadCustomers(); // Reload on error
      }
    }
  };

  const handleDeleteAccount = async (customerId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này? Hành động này không thể hoàn tác!')) {
      try {
        // Remove from UI immediately
        setCustomers(prevCustomers => 
          prevCustomers.filter(customer => customer.id !== customerId)
        );
        setTotalItems(prev => prev - 1);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success('Xóa tài khoản thành công!');
      } catch (error) {
        console.error('Error deleting account:', error);
        toast.error('Xóa tài khoản thất bại');
        loadCustomers(); // Reload on error
      }
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý khách hàng</h1>
        <button className={styles.addButton} onClick={() => setShowModal(true)}>
          <span>+</span> Thêm khách hàng mới
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <button 
            className={styles.refreshButton}
            onClick={() => loadCustomers()}
            title="Làm mới"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <p>Không có khách hàng nào</p>
        </div>
      ) : (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Booking</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.customerId || customer.id}>
                    <td>
                      <div className={styles.customerInfo}>
                        <div className={styles.avatar}>{getInitials(customer.fullName)}</div>
                        <div className={styles.customerDetails}>
                          <span className={styles.customerName}>{customer.fullName}</span>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(customer.status || 'ACTIVE')}`}>
                        {getStatusText(customer.status || 'ACTIVE')}
                      </span>
                    </td>
                    <td>{customer.totalBookings || 0}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => navigate(`/customer-profile/${customer.customerId || customer.id}`)}
                          title="Xem chi tiết"
                        >
                          👁️
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => navigate(`/customer-profile/${customer.customerId || customer.id}`)}
                          title="Chỉnh sửa"
                        >
                          ✏️
                        </button>
                        {(customer.status || 'ACTIVE') === 'ACTIVE' ? (
                          <button
                            className={`${styles.actionBtn} ${styles.lockBtn}`}
                            onClick={() => handleLockAccount(customer.customerId || customer.id)}
                            title="Khóa tài khoản"
                          >
                            🔒
                          </button>
                        ) : (
                          <button
                            className={`${styles.actionBtn} ${styles.unlockBtn}`}
                            onClick={() => handleUnlockAccount(customer.customerId || customer.id)}
                            title="Mở khóa tài khoản"
                          >
                            🔓
                          </button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteAccount(customer.customerId || customer.id)}
                          title="Xóa tài khoản"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} của {totalItems} khách hàng
            </div>
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Thêm khách hàng mới</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>X</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Họ tên <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                    placeholder="Nhập họ tên"
                  />
                  {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    SĐT <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    placeholder="0912345678"
                  />
                  {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giới tính <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`${styles.select} ${errors.gender ? styles.inputError : ''}`}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                  {errors.gender && <span className={styles.errorText}>{errors.gender}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Mật khẩu tạm <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordGroup}>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      className={styles.generateBtn}
                      onClick={() => {
                        const randomPassword = Math.random().toString(36).slice(-8);
                        setFormData(prev => ({ ...prev, password: randomPassword }));
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                    >
                      Tạo ngẫu nhiên
                    </button>
                  </div>
                  {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="sendNotification"
                    checked={formData.sendNotification}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendNotification: e.target.checked }))}
                    className={styles.checkbox}
                  />
                  <span>Gửi email thông báo</span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
