import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { createStaff } from '../../../services/adminService.js';
import styles from './EmployeeManager.module.css';

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const CreateEmployeeModal = ({ open, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    roles: [1], // default: ADMIN role
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);

  // Load roles from API
  useEffect(() => {
    if (!open) return;
    const loadRoles = async () => {
      try {
        const token = localStorage.getItem('authToken') ||
          localStorage.getItem('adminToken') ||
          localStorage.getItem('staffToken') || '';
        const { fetchAllStaffRoles } = await import('../../../services/adminService.js');
        const response = await fetchAllStaffRoles(token);
        const list = Array.isArray(response?.data) ? response.data : [];
        const normalized = list
          .map((r) => {
            const roleId = Number(r?.roleId);
            return {
              roleId: Number.isFinite(roleId) ? roleId : undefined,
              roleCode: r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '',
              roleName: r?.roleName ? String(r.roleName).trim() : ''
            };
          })
          .filter((r) => Number.isFinite(r.roleId) && r.roleId > 0);
        setRoleOptions(normalized);
      } catch {
        setRoleOptions([]);
      }
    };
    loadRoles();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setSubmitting(false);
    setErrors({});
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      dob: '',
      roles: [1],
      isActive: true
    });
  }, [open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleRoleToggle = (roleId) => (e) => {
    const checked = !!e?.target?.checked;
    setFormData((prev) => {
      const current = Array.isArray(prev.roles) ? prev.roles : [];
      if (checked) {
        return { ...prev, roles: current.includes(roleId) ? current : [...current, roleId] };
      }
      return { ...prev, roles: current.filter((id) => id !== roleId) };
    });
    if (errors.roles) {
      setErrors((prev) => ({ ...prev, roles: '' }));
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setFormData((prev) => ({ ...prev, password: pwd }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số)';
    }

    if (!formData.password?.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!Array.isArray(formData.roles) || formData.roles.length === 0) {
      newErrors.roles = 'Vui lòng chọn ít nhất 1 vai trò';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const close = useCallback(() => {
    if (submitting) return;
    onClose?.();
  }, [onClose, submitting]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('authToken') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('staffToken');

      if (!token) {
        toast.error('Vui lòng đăng nhập để thêm nhân viên');
        return;
      }

      const selectedRoles = (formData.roles || [])
        .map((roleId) => {
          const role = roleOptions.find((r) => r.roleId === roleId);
          if (!role) return null;
          return {
            roleId,
            roleCode: role.roleCode,
            roleName: role.roleName
          };
        })
        .filter(Boolean);

      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        dob: formData.dob || null,
        avatar: null,
        status: formData.isActive ? 'ACTIVE' : 'INACTIVE',
        roles: selectedRoles
      };

      const response = await createStaff(payload, token);

      if (response?.success || response?.data) {
        toast.success('Thêm nhân viên thành công!');
        onCreated?.(response?.data);
        close();
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Thêm nhân viên thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <button type="button" className={styles.modalBackdrop} onClick={close} aria-label="Đóng pop-up" />

      <dialog open className={styles.modalContent} aria-label="Thêm nhân viên mới">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Thêm nhân viên mới</h2>
          <button className={styles.modalClose} onClick={close} aria-label="Đóng" type="button">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="emp_fullName">
                Họ tên <span className={styles.required}>*</span>
              </label>
              <input
                id="emp_fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                placeholder="Nhập họ tên đầy đủ"
              />
              {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="emp_email">
                Email <span className={styles.required}>*</span>
              </label>
              <input
                id="emp_email"
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
              <label className={styles.label} htmlFor="emp_phone">
                SĐT <span className={styles.required}>*</span>
              </label>
              <input
                id="emp_phone"
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
              <label className={styles.label} htmlFor="emp_dob">Ngày sinh</label>
              <input
                id="emp_dob"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label} htmlFor="emp_password">
                Mật khẩu <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordGroup}>
                <input
                  id="emp_password"
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={handleGeneratePassword}
                >
                  Tạo tự động
                </button>
              </div>
              {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                Vai trò <span className={styles.required}>*</span>
              </label>
              <div className={styles.roleCheckboxGroup}>
                {roleOptions.length === 0 && (
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>Đang tải vai trò...</span>
                )}
                {roleOptions.map((role) => {
                  const checked = Array.isArray(formData.roles) && formData.roles.includes(role.roleId);
                  return (
                    <label key={role.roleId} className={styles.roleCheckbox}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={handleRoleToggle(role.roleId)}
                      />
                      <span>{role.roleName || role.roleCode}</span>
                    </label>
                  );
                })}
              </div>
              {errors.roles && <span className={styles.errorText}>{errors.roles}</span>}
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.roleCheckbox}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                />
                <span>Kích hoạt tài khoản (Hoạt động ngay)</span>
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={close} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};

export default CreateEmployeeModal;

CreateEmployeeModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
};
