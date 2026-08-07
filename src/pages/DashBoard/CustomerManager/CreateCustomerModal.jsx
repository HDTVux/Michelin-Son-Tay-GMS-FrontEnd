import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { createCustomer } from '../../../services/adminService.js';
import PartnerFormFields from './PartnerFormFields.jsx';
import { buildPartnerPayload, emptyPartnerFields, partnerFieldsFromCustomer } from './partnerForm.js';
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
    customerType: 'INDIVIDUAL',
    ...emptyPartnerFields()
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
        ...partnerFieldsFromCustomer(initialData),
        fullName: initialData.fullName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        gender: initialData.gender || '',
        dob: initialData.dob || '',
        avatar: initialData.avatar || '',
        customerType: initialData.customerType || 'INDIVIDUAL',
        isDealer: initialData.isDealer || false
      });
    } else {
      setFormData({
        ...emptyPartnerFields(),
        fullName: '',
        email: '',
        phone: '',
        gender: '',
        dob: '',
        avatar: '',
        customerType: 'INDIVIDUAL',
        isDealer: false
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
      newErrors.fullName = 'Vui lòng nhập tên khách hàng';
    }

    if (!formData.autoCustomerCode && !(formData.customerCode || '').trim()) {
      newErrors.customerCode = 'Vui lòng nhập mã khách hàng hoặc bật tự động sinh mã';
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
        ...buildPartnerPayload(formData),
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        pin: pinValue,
        gender: formData.gender,
        dob: formData.dob,
        avatar: formData.avatar,
        customerType: formData.customerType || 'INDIVIDUAL',
        isDealer: formData.isDealer || false
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

      <dialog open className={`${styles.modalContent} ${styles.modalContentWide}`} aria-label="Thêm đối tác mới">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Thêm đối tác / khách hàng mới</h2>
          <button className={styles.modalClose} onClick={close} aria-label="Đóng" type="button">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <PartnerFormFields
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            idPrefix="cm"
          >
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

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.pinDefaultToggle} style={{ marginTop: '15px' }}>
                <input
                  type="checkbox"
                  name="isDealer"
                  checked={formData.isDealer || false}
                  onChange={(e) => handleInputChange({ target: { name: 'isDealer', value: e.target.checked } })}
                  className={styles.checkbox}
                />
                <span>Cấp quyền Đại lý (Cho phép chuyển đổi giao diện Khách lẻ / Đại lý)</span>
              </label>
            </div>
          </PartnerFormFields>

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
