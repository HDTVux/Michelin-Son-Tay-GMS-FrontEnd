import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { updateCustomer } from '../../../services/adminService.js';
import styles from './CustomerManager.module.css';

const EditCustomerModal = ({ open, onClose, customer, onUpdated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dob: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !customer) return;

    setSubmitting(false);
    setErrors({});
    setFormData({
      fullName: customer.fullName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      gender: customer.gender || '',
      dob: customer.dob || ''
    });
  }, [open, customer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Họ tên không được để trống';
    }
    if (!formData.email.trim()) {
      nextErrors.email = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Email không đúng định dạng';
    }
    if (!formData.phone.trim()) {
      nextErrors.phone = 'SĐT không được để trống';
    } else if (!/^(03|05|07|08|09)\d{8}$/.test(formData.phone)) {
      nextErrors.phone = 'SĐT không hợp lệ (phải gồm 10 chữ số)';
    }
    if (!formData.gender) {
      nextErrors.gender = 'Vui lòng chọn giới tính';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token =
        localStorage.getItem('authToken') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('staffToken');

      if (!token) {
        toast.error('Vui lòng đăng nhập để thực hiện');
        return;
      }

      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        dob: formData.dob || null
      };

      const customerId = customer.customerId || customer.id;
      const response = await updateCustomer(customerId, payload, token);

      if (response?.success) {
        toast.success('Cập nhật thông tin khách hàng thành công!');
        onUpdated?.(response?.data || { ...customer, ...payload });
        onClose();
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <button type="button" className={styles.modalBackdrop} onClick={onClose} aria-label="Đóng pop-up" />

      <dialog open className={styles.modalContent} aria-label="Chỉnh sửa hồ sơ khách hàng">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Chỉnh sửa hồ sơ khách hàng</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Đóng" type="button">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="edit_fullName">
                Họ tên <span className={styles.required}>*</span>
              </label>
              <input
                id="edit_fullName"
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
              <label className={styles.label} htmlFor="edit_email">
                Email <span className={styles.required}>*</span>
              </label>
              <input
                id="edit_email"
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
              <label className={styles.label} htmlFor="edit_phone">
                SĐT <span className={styles.required}>*</span>
              </label>
              <input
                id="edit_phone"
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
              <label className={styles.label} htmlFor="edit_gender">
                Giới tính <span className={styles.required}>*</span>
              </label>
              <select
                id="edit_gender"
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

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label} htmlFor="edit_dob">
                Ngày sinh
              </label>
              <input
                id="edit_dob"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};

EditCustomerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.object,
  onUpdated: PropTypes.func
};

export default EditCustomerModal;
