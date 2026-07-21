import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { createCustomer } from '../../../services/adminService.js';
import styles from './CustomerManager.module.css';

const PIN_LENGTH = 6;
const PIN_KEYS = ['pin-0', 'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5'];

const CreateCustomerModal = ({ open, onClose, onCreated, initialData }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    avatar: '',
    customerType: 'INDIVIDUAL'
  });

  const [useDefaultPin, setUseDefaultPin] = useState(true);
  const [pinDigits, setPinDigits] = useState(() => new Array(PIN_LENGTH).fill('1'));
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const pinValue = useMemo(() => pinDigits.join(''), [pinDigits]);
  const pinInputRefs = useRef([]);

  useEffect(() => {
    if (!open) return;

    setSubmitting(false);
    setErrors({});
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        gender: initialData.gender || '',
        dob: initialData.dob || '',
        avatar: initialData.avatar || '',
        customerType: initialData.customerType || 'INDIVIDUAL'
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        gender: '',
        dob: '',
        avatar: '',
        customerType: 'INDIVIDUAL'
      });
    }
    setUseDefaultPin(true);
    setPinDigits(new Array(PIN_LENGTH).fill('1'));
    setShowPin(false);
  }, [open, initialData]);

  const focusPinIndex = (index) => {
    const el = pinInputRefs.current?.[index];
    if (el) el.focus();
  };

  const setPinFromString = (pinString) => {
    const digitsOnly = String(pinString || '').replaceAll(/\D/g, '').slice(0, PIN_LENGTH);
    const nextDigits = new Array(PIN_LENGTH).fill('');
    for (let i = 0; i < digitsOnly.length; i += 1) {
      nextDigits[i] = digitsOnly[i];
    }
    setPinDigits(nextDigits);
  };

  const validateEmailValue = (value) => {
    if (!value.trim()) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Email không hợp lệ';
  };

  const validatePhoneValue = (value) => {
    if (!value.trim()) return 'Vui lòng nhập số điện thoại';
    return /^\d{10}$/.test(value) ? '' : 'Số điện thoại không hợp lệ';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmailValue(value) }));
      return;
    }

    if (name === 'phone') {
      setErrors((prev) => ({ ...prev, phone: validatePhoneValue(value) }));
      return;
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePinChange = (index, value) => {
    if (useDefaultPin) return;

    const digit = String(value || '').replaceAll(/\D/g, '').slice(-1);
    setPinDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < PIN_LENGTH - 1) {
      focusPinIndex(index + 1);
    }

    if (errors.pin) {
      setErrors((prev) => ({ ...prev, pin: '' }));
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (useDefaultPin) return;

    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        focusPinIndex(index - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusPinIndex(index - 1);
    }

    if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      e.preventDefault();
      focusPinIndex(index + 1);
    }
  };

  const handlePinPaste = (e) => {
    if (useDefaultPin) return;

    const clipboard = e.clipboardData?.getData('text') || '';
    const digitsOnly = clipboard.replaceAll(/\D/g, '').slice(0, PIN_LENGTH);
    if (!digitsOnly) return;

    e.preventDefault();
    setPinFromString(digitsOnly);
    const nextIndex = Math.min(digitsOnly.length, PIN_LENGTH - 1);
    focusPinIndex(nextIndex);

    if (errors.pin) {
      setErrors((prev) => ({ ...prev, pin: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }

    const emailError = validateEmailValue(formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhoneValue(formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    if (pinValue?.length !== PIN_LENGTH || !/^\d{6}$/.test(pinValue)) {
      newErrors.pin = 'PIN phải gồm 6 chữ số';
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

      if (!token) {
        toast.error('Vui lòng đăng nhập để thêm khách hàng');
        return;
      }

      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        pin: pinValue,
        gender: formData.gender,
        dob: formData.dob,
        avatar: formData.avatar,
        customerType: formData.customerType || 'INDIVIDUAL'
      };

      const response = await createCustomer(payload, token);

      if (response?.success) {
        toast.success('Thêm khách hàng thành công!');
        onCreated?.(response?.data);
        close();
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Thêm khách hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <button type="button" className={styles.modalBackdrop} onClick={close} aria-label="Đóng pop-up" />

      <dialog open className={styles.modalContent} aria-label="Thêm khách hàng mới">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Thêm khách hàng mới</h2>
          <button className={styles.modalClose} onClick={close} aria-label="Đóng" type="button">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="cm_fullName">
                Họ tên <span className={styles.required}>*</span>
              </label>
              <input
                id="cm_fullName"
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
              <label className={styles.label} htmlFor="cm_email">
                Email
              </label>
              <input
                id="cm_email"
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
              <label className={styles.label} htmlFor="cm_phone">
                SĐT <span className={styles.required}>*</span>
              </label>
              <input
                id="cm_phone"
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
              <label className={styles.label} htmlFor="cm_gender">
                Giới tính
              </label>
              <select
                id="cm_gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="">Chọn giới tính</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label} htmlFor="cm_pin_0">
                Mã PIN <span className={styles.required}>*</span>
              </label>

              <div className={styles.pinCard}>
                <label className={styles.pinDefaultToggle}>
                  <input
                    type="checkbox"
                    checked={useDefaultPin}
                    onChange={(e) => {
                      const nextChecked = e.target.checked;
                      setUseDefaultPin(nextChecked);
                      if (nextChecked) {
                        setPinDigits(new Array(PIN_LENGTH).fill('1'));
                        if (errors.pin) setErrors((prev) => ({ ...prev, pin: '' }));
                      } else {
                        setPinDigits(new Array(PIN_LENGTH).fill(''));
                        setTimeout(() => focusPinIndex(0), 0);
                      }
                    }}
                    className={styles.checkbox}
                  />
                  <span>Dùng PIN mặc định (111111)</span>
                </label>

                <div className={styles.pinRow}>
                  <div className={`${styles.pinInputs} ${errors.pin ? styles.pinInputsError : ''}`} onPaste={handlePinPaste}>
                    {pinDigits.map((digit, idx) => (
                      <input
                        key={PIN_KEYS[idx]}
                        ref={(el) => {
                          pinInputRefs.current[idx] = el;
                        }}
                        id={idx === 0 ? 'cm_pin_0' : undefined}
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(ev) => handlePinChange(idx, ev.target.value)}
                        onKeyDown={(ev) => handlePinKeyDown(idx, ev)}
                        disabled={useDefaultPin}
                        className={styles.pinInput}
                        aria-label={`Chữ số PIN ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.pinToggleVisibility}
                    onClick={() => setShowPin((prev) => !prev)}
                    aria-label={showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                  >
                    {showPin ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>

                <span className={styles.pinHint}>Nhập đủ 6 chữ số, hoặc dán mã PIN đã sao chép vào ô đầu tiên.</span>
              </div>
              {errors.pin && <span className={styles.errorText}>{errors.pin}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="cm_customerType">Loại khách hàng</label>
              <select
                id="cm_customerType"
                name="customerType"
                value={formData.customerType}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="INDIVIDUAL">Khách lẻ</option>
                <option value="DEALER">Đại lý</option>
                <option value="GARAGE">Garage khác</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="cm_dob">Ngày sinh</label>
              <input
                id="cm_dob"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className={styles.input}
              />
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

export default CreateCustomerModal;

CreateCustomerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
  initialData: PropTypes.object,
};
