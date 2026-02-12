import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ChangePassword.module.css';

const ChangePassword = ({ 
  onCancel, 
  onSubmit, 
  backLink, 
  backLinkText = 'Quay lại',
  title = 'Đổi mật khẩu',
  isLoading = false,
  showHeader = false
}) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasSpecialChar: false,
    hasNumber: false
  });

  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // Validate mật khẩu mới
  useEffect(() => {
    if (formData.newPassword) {
      setPasswordRequirements({
        minLength: formData.newPassword.length >= 8,
        hasUpperCase: /[A-Z]/.test(formData.newPassword),
        hasLowerCase: /[a-z]/.test(formData.newPassword),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword),
        hasNumber: /[0-9]/.test(formData.newPassword)
      });
    } else {
      setPasswordRequirements({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasSpecialChar: false,
        hasNumber: false
      });
    }
  }, [formData.newPassword]);

  // Validate real-time
  useEffect(() => {
    const newErrors = { ...errors };

    // Validate mật khẩu hiện tại
    if (touched.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
      } else {
        newErrors.currentPassword = '';
      }
    }

    // Validate mật khẩu mới
    if (touched.newPassword) {
      if (!formData.newPassword) {
        newErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
      } else if (formData.newPassword === formData.currentPassword) {
        newErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
      } else if (!Object.values(passwordRequirements).every(req => req)) {
        newErrors.newPassword = 'Mật khẩu mới không đáp ứng các yêu cầu.';
      } else {
        newErrors.newPassword = '';
      }
    }

    // Validate xác nhận mật khẩu
    if (touched.confirmPassword) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
      } else if (formData.confirmPassword !== formData.newPassword) {
        newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
      } else {
        newErrors.confirmPassword = '';
      }
    }

    setErrors(newErrors);
  }, [formData, touched, passwordRequirements]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    if (!touched[name]) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true
    });

    // Final validation
    const finalErrors = {};
    let hasError = false;

    if (!formData.currentPassword) {
      finalErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
      hasError = true;
    }

    if (!formData.newPassword) {
      finalErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
      hasError = true;
    } else if (formData.newPassword === formData.currentPassword) {
      finalErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
      hasError = true;
    } else if (!Object.values(passwordRequirements).every(req => req)) {
      finalErrors.newPassword = 'Mật khẩu mới không đáp ứng các yêu cầu.';
      hasError = true;
    }

    if (!formData.confirmPassword) {
      finalErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
      hasError = true;
    } else if (formData.confirmPassword !== formData.newPassword) {
      finalErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
      hasError = true;
    }

    if (hasError) {
      setErrors(finalErrors);
      return;
    }

    // Call onSubmit callback
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(req => req);

  return (
    <div className="changePasswordPage">
      <div className="changePasswordContainer">
        {showHeader && (
          <div className="changePasswordHeader">
            <h1 className="changePasswordHeaderTitle">{title}</h1>
            {backLink && (
              <Link to={backLink} className="changePasswordBackButton">
                ← {backLinkText}
              </Link>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="changePasswordForm">
          {!showHeader && <h2 className="changePasswordTitle">{title}</h2>}

          {/* Mật khẩu hiện tại */}
          <div className="formGroup">
            <label htmlFor="currentPassword" className="formLabel">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('currentPassword')}
              className={`formInput ${errors.currentPassword ? 'error' : ''}`}
              placeholder="Nhập mật khẩu hiện tại"
            />
            {errors.currentPassword && (
              <span className="errorMessage">{errors.currentPassword}</span>
            )}
          </div>

          {/* Mật khẩu mới */}
          <div className="formGroup">
            <label htmlFor="newPassword" className="formLabel">
              Mật khẩu mới
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('newPassword')}
              className={`formInput ${errors.newPassword ? 'error' : ''} ${allRequirementsMet && formData.newPassword ? 'success' : ''}`}
              placeholder="Nhập mật khẩu mới"
            />
            {errors.newPassword && (
              <span className="errorMessage">{errors.newPassword}</span>
            )}

            {/* Hiển thị yêu cầu mật khẩu */}
            {formData.newPassword && (
              <div className="passwordRequirements">
                <p className="requirementsTitle">Yêu cầu mật khẩu:</p>
                <ul className="requirementsList">
                  <li className={passwordRequirements.minLength ? 'met' : 'unmet'}>
                    <span className="requirementIcon">
                      {passwordRequirements.minLength ? '✓' : '○'}
                    </span>
                    Mật khẩu mới phải có ít nhất 8 ký tự.
                  </li>
                  <li className={passwordRequirements.hasUpperCase ? 'met' : 'unmet'}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasUpperCase ? '✓' : '○'}
                    </span>
                    Mật khẩu mới phải chứa ít nhất 1 chữ cái in hoa.
                  </li>
                  <li className={passwordRequirements.hasLowerCase ? 'met' : 'unmet'}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasLowerCase ? '✓' : '○'}
                    </span>
                    Mật khẩu mới phải chứa ít nhất 1 chữ cái in thường.
                  </li>
                  <li className={passwordRequirements.hasNumber ? 'met' : 'unmet'}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasNumber ? '✓' : '○'}
                    </span>
                    Mật khẩu mới phải chứa ít nhất 1 chữ số.
                  </li>
                  <li className={passwordRequirements.hasSpecialChar ? 'met' : 'unmet'}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasSpecialChar ? '✓' : '○'}
                    </span>
                    Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div className="formGroup">
            <label htmlFor="confirmPassword" className="formLabel">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('confirmPassword')}
              className={`formInput ${errors.confirmPassword ? 'error' : ''} ${!errors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.newPassword ? 'success' : ''}`}
              placeholder="Nhập lại mật khẩu mới"
            />
            {errors.confirmPassword && (
              <span className="errorMessage">{errors.confirmPassword}</span>
            )}
            {!errors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.newPassword && (
              <span className="successMessage">✓ Mật khẩu xác nhận khớp</span>
            )}
          </div>

          {/* Nút hành động */}
          <div className="formActions">
            <button
              type="button"
              onClick={onCancel}
              className="btnCancel"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btnSubmit"
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
