import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ChangePassword.css';

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
    hasNumber: false,
    hasSpecialChar: false
  });

  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const validatePassword = (password) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  useEffect(() => {
    if (formData.newPassword) {
      setPasswordRequirements(validatePassword(formData.newPassword));
    } else {
      setPasswordRequirements({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false
      });
    }
  }, [formData.newPassword]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, formData[fieldName]);
  };

  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };
    const requirements = fieldName === 'newPassword' ? validatePassword(value) : passwordRequirements;

    switch (fieldName) {
      case 'currentPassword':
        if (!value) {
          newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
        } else {
          newErrors.currentPassword = '';
        }
        break;

      case 'newPassword':
        if (!value) {
          newErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
        } else if (value === formData.currentPassword) {
          newErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
        } else if (!Object.values(requirements).every(req => req)) {
          newErrors.newPassword = 'Mật khẩu mới không đáp ứng các yêu cầu.';
        } else {
          newErrors.newPassword = '';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
        } else if (value !== formData.newPassword) {
          newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
        } else {
          newErrors.confirmPassword = '';
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const allTouched = {
      currentPassword: true,
      newPassword: true,
      confirmPassword: true
    };
    setTouched(allTouched);

    const finalErrors = {};
    const requirements = validatePassword(formData.newPassword);
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
    } else if (!Object.values(requirements).every(req => req)) {
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

    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className="page">
      <div className="container">
        {showHeader && (
          <div className="header">
            <h1 className="title">{title}</h1>
            {backLink && (
              <Link to={backLink} className="backButton">
                ← {backLinkText}
              </Link>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="form">
          {!showHeader && <h2 className="formTitle">{title}</h2>}

          <div className="formGroup">
            <label htmlFor='currentPassword' className="label">
              Mật khẩu hiện tại
            </label>
            <input
              type='password'
              id='currentPassword'
              name='currentPassword'
              value={formData.currentPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('currentPassword')}
              className="input"
              placeholder='Nhập mật khẩu hiện tại'
            />
            {errors.currentPassword && (
              <span className="errorMessage">{errors.currentPassword}</span>
            )}
          </div>

          <div className="formGroup">
            <label htmlFor='newPassword' className="label">
              Mật khẩu mới
            </label>
            <input
              type='password'
              id='newPassword'
              name='newPassword'
              value={formData.newPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('newPassword')}
              className="input"
              placeholder='Nhập mật khẩu mới'
            />
            {errors.newPassword && (
              <span className="errorMessage">{errors.newPassword}</span>
            )}

            {formData.newPassword && (
              <div className="passwordRequirements">
                <p className="requirementsTitle">Yêu cầu mật khẩu:</p>
                <ul className="requirementsList">
                  <li className={passwordRequirements.minLength ? "met" : "unmet"}>
                    <span className="requirementIcon">
                      {passwordRequirements.minLength ? '✓' : '○'}
                    </span>
                    Ít nhất 8 ký tự
                  </li>
                  <li className={passwordRequirements.hasUpperCase ? "met" : "unmet"}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasUpperCase ? '✓' : '○'}
                    </span>
                    Có chữ cái in hoa
                  </li>
                  <li className={passwordRequirements.hasLowerCase ? "met" : "unmet"}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasLowerCase ? '✓' : '○'}
                    </span>
                    Có chữ cái in thường
                  </li>
                  <li className={passwordRequirements.hasNumber ? "met" : "unmet"}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasNumber ? '✓' : '○'}
                    </span>
                    Có chữ số
                  </li>
                  <li className={passwordRequirements.hasSpecialChar ? "met" : "unmet"}>
                    <span className="requirementIcon">
                      {passwordRequirements.hasSpecialChar ? '✓' : '○'}
                    </span>
                    Có ký tự đặc biệt
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="formGroup">
            <label htmlFor='confirmPassword' className="label">
              Xác nhận mật khẩu mới
            </label>
            <input
              type='password'
              id='confirmPassword'
              name='confirmPassword'
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('confirmPassword')}
              className="input"
              placeholder='Nhập lại mật khẩu mới'
            />
            {errors.confirmPassword && (
              <span className="errorMessage">{errors.confirmPassword}</span>
            )}
            {!errors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.newPassword && (
              <span className="successMessage">✓ Mật khẩu xác nhận khớp</span>
            )}
          </div>

          <div className="footer">
            <button
              type='button'
              onClick={onCancel}
              className="btnCancel"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type='submit'
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
