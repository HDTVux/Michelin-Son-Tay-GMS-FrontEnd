import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { fetchCustomerDetail, updateCustomer } from '../../../services/adminService.js';
import PartnerFormFields from './PartnerFormFields.jsx';
import { fetchCustomerVehicles } from '../../../services/vehicleService.js';
import {
  buildAutoCustomerCode,
  buildPartnerPayload,
  createVehiclesForCustomer,
  emptyPartnerFields,
  partnerFieldsFromCustomer,
} from './partnerForm.js';
import styles from './CustomerManager.module.css';

const EditCustomerModal = ({ open, onClose, customer, onUpdated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    customerType: 'INDIVIDUAL',
    isDealer: false,
    ...emptyPartnerFields()
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [existingVehicles, setExistingVehicles] = useState([]);

  useEffect(() => {
    if (!open || !customer) return;

    setSubmitting(false);
    setErrors({});
    const initialForm = {
      ...partnerFieldsFromCustomer(customer),
      fullName: customer.fullName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      gender: customer.gender || '',
      dob: customer.dob || '',
      customerType: customer.customerType || 'INDIVIDUAL',
      isDealer: Boolean(
        customer.isDealer === true || customer.isDealer === 1 || customer.isDealer === 'true' || customer.isDealer === '1' ||
        customer.is_dealer === true || customer.is_dealer === 1 || customer.is_dealer === 'true' || customer.is_dealer === '1'
      ),
      isCompany: Boolean(
        customer.isCompany === true || customer.isCompany === 1 || customer.isCompany === 'true' || customer.isCompany === '1' ||
        customer.is_company === true || customer.is_company === 1 || customer.is_company === 'true' || customer.is_company === '1' ||
        (customer.companyName && String(customer.companyName).trim() !== '') ||
        (customer.company_name && String(customer.company_name).trim() !== '')
      ),
      companyName: customer.companyName || customer.company_name || ''
    };
    setFormData(initialForm);

    const customerId = customer.customerId || customer.id;
    if (!customerId) {
      setExistingVehicles([]);
      return;
    }

    let cancelled = false;

    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('staffToken');

    if (token) {
      fetchCustomerDetail(customerId, token)
        .then((res) => {
          if (cancelled || !res?.success || !res?.data) return;
          const fresh = res.data;
          setFormData((prev) => ({
            ...prev,
            ...partnerFieldsFromCustomer(fresh),
            fullName: fresh.fullName || prev.fullName,
            email: fresh.email || prev.email,
            phone: fresh.phone || prev.phone,
            gender: fresh.gender || prev.gender,
            dob: fresh.dob || prev.dob,
            customerType: fresh.customerType || prev.customerType,
            isDealer: Boolean(
              fresh.isDealer === true || fresh.isDealer === 1 || fresh.isDealer === 'true' || fresh.isDealer === '1' ||
              fresh.is_dealer === true || fresh.is_dealer === 1 || fresh.is_dealer === 'true' || fresh.is_dealer === '1'
            ),
            isCompany: Boolean(
              fresh.isCompany === true || fresh.isCompany === 1 || fresh.isCompany === 'true' || fresh.isCompany === '1' ||
              fresh.is_company === true || fresh.is_company === 1 || fresh.is_company === 'true' || fresh.is_company === '1' ||
              (fresh.companyName && String(fresh.companyName).trim() !== '') ||
              (fresh.company_name && String(fresh.company_name).trim() !== '')
            ),
            companyName: fresh.companyName || fresh.company_name || prev.companyName || ''
          }));
        })
        .catch((err) => console.error('Error fetching customer detail in modal:', err));
    }

    fetchCustomerVehicles(customerId)
      .then((res) => {
        if (!cancelled) setExistingVehicles(res?.data?.vehicles || []);
      })
      .catch(() => {
        if (!cancelled) setExistingVehicles([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, customer]);

  const validateEmailValue = (value) => {
    if (!value.trim()) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Email không đúng định dạng';
  };

  const validatePhoneValue = (value) => {
    if (!value.trim()) return 'SĐT không được để trống';
    return /^(03|05|07|08|09)\d{8}$/.test(value) ? '' : 'SĐT không hợp lệ (phải gồm 10 chữ số)';
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

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Tên khách hàng không được để trống';
    }

    if (!formData.autoCustomerCode && !(formData.customerCode || '').trim()) {
      nextErrors.customerCode = 'Mã khách hàng không được để trống';
    }

    const emailError = validateEmailValue(formData.email);
    if (emailError) nextErrors.email = emailError;

    const phoneError = validatePhoneValue(formData.phone);
    if (phoneError) nextErrors.phone = phoneError;

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
        ...buildPartnerPayload(formData),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        dob: formData.dob || null,
        customerType: formData.customerType,
        isDealer: formData.isDealer,
        isCompany: formData.isCompany,
        companyName: formData.isCompany ? (formData.companyName || '').trim() : ''
      };

      const customerId = customer.customerId || customer.id;
      const response = await updateCustomer(customerId, payload, token);

      if (response?.success) {
        toast.success('Cập nhật thông tin khách hàng thành công!');
        await createVehiclesForCustomer(formData, customerId, token);
        onUpdated?.({ ...customer, ...payload, ...response?.data });
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

      <dialog open className={`${styles.modalContent} ${styles.modalContentWide}`} aria-label="Chỉnh sửa hồ sơ đối tác">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Chỉnh sửa hồ sơ đối tác</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Đóng" type="button">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <PartnerFormFields
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            idPrefix="edit"
            autoCodeValue={buildAutoCustomerCode(customer?.customerId || customer?.id)}
            existingVehicles={existingVehicles}
          >
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
