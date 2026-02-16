import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ChangePassword.module.css';

const ChangePassword = ({ 
  onCancel, 
  onSubmit, 
  backLink, 
  backLinkText = 'Quay láº¡i',
  title = 'Äá»•i máº­t kháº©u',
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
          newErrors.currentPassword = 'Vui lÃ²ng nháº­p máº­t kháº©u hiá»‡n táº¡i.';
        } else {
          newErrors.currentPassword = '';
        }
        break;

      case 'newPassword':
        if (!value) {
          newErrors.newPassword = 'Vui lÃ²ng nháº­p máº­t kháº©u má»›i.';
        } else if (value === formData.currentPassword) {
          newErrors.newPassword = 'Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c trÃ¹ng vá»›i máº­t kháº©u hiá»‡n táº¡i.';
        } else if (!Object.values(requirements).every(req => req)) {
          newErrors.newPassword = 'Máº­t kháº©u má»›i khÃ´ng Ä‘Ã¡p á»©ng cÃ¡c yÃªu cáº§u.';
        } else {
          newErrors.newPassword = '';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Vui lÃ²ng xÃ¡c nháº­n máº­t kháº©u má»›i.';
        } else if (value !== formData.newPassword) {
          newErrors.confirmPassword = 'Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p.';
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
      finalErrors.currentPassword = 'Vui lÃ²ng nháº­p máº­t kháº©u hiá»‡n táº¡i.';
      hasError = true;
    }

    if (!formData.newPassword) {
      finalErrors.newPassword = 'Vui lÃ²ng nháº­p máº­t kháº©u má»›i.';
      hasError = true;
    } else if (formData.newPassword === formData.currentPassword) {
      finalErrors.newPassword = 'Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c trÃ¹ng vá»›i máº­t kháº©u hiá»‡n táº¡i.';
      hasError = true;
    } else if (!Object.values(requirements).every(req => req)) {
      finalErrors.newPassword = 'Máº­t kháº©u má»›i khÃ´ng Ä‘Ã¡p á»©ng cÃ¡c yÃªu cáº§u.';
      hasError = true;
    }

    if (!formData.confirmPassword) {
      finalErrors.confirmPassword = 'Vui lÃ²ng xÃ¡c nháº­n máº­t kháº©u má»›i.';
      hasError = true;
    } else if (formData.confirmPassword !== formData.newPassword) {
      finalErrors.confirmPassword = 'Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p.';
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

  const allRequirementsMet = Object.values(passwordRequirements).every(req => req);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {showHeader && (
          <div className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {backLink && (
              <Link to={backLink} className={styles.backButton}>
                â† {backLinkText}
              </Link>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.form}>
          {!showHeader && <h2 className={styles.formTitle}>{title}</h2>}

          <div className={styles.formGroup}>
            <label htmlFor='currentPassword' className={styles.label}>
              Máº­t kháº©u hiá»‡n táº¡i
            </label>
            <input
              type='password'
              id='currentPassword'
              name='currentPassword'
              value={formData.currentPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('currentPassword')}
              className={styles.input}
              placeholder='Nháº­p máº­t kháº©u hiá»‡n táº¡i'
            />
            {errors.currentPassword && (
              <span className={styles.errorMessage}>{errors.currentPassword}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='newPassword' className={styles.label}>
              Máº­t kháº©u má»›i
            </label>
            <input
              type='password'
              id='newPassword'
              name='newPassword'
              value={formData.newPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('newPassword')}
              className={styles.input}
              placeholder='Nháº­p máº­t kháº©u má»›i'
            />
            {errors.newPassword && (
              <span className={styles.errorMessage}>{errors.newPassword}</span>
            )}

            {formData.newPassword && (
              <div className={styles.passwordRequirements}>
                <p className={styles.requirementsTitle}>YÃªu cáº§u máº­t kháº©u:</p>
                <ul className={styles.requirementsList}>
                  <li className={passwordRequirements.minLength ? styles.met : styles.unmet}>
                    <span className={styles.requirementIcon}>
                      {passwordRequirements.minLength ? 'âœ“' : 'â—‹'}
                    </span>
                    Ãt nháº¥t 8 kÃ½ tá»±
                  </li>
                  <li className={passwordRequirements.hasUpperCase ? styles.met : styles.unmet}>
                    <span className={styles.requirementIcon}>
                      {passwordRequirements.hasUpperCase ? 'âœ“' : 'â—‹'}
                    </span>
                    CÃ³ chá»¯ cÃ¡i in hoa
                  </li>
                  <li className={passwordRequirements.hasLowerCase ? styles.met : styles.unmet}>
                    <span className={styles.requirementIcon}>
                      {passwordRequirements.hasLowerCase ? 'âœ“' : 'â—‹'}
                    </span>
                    CÃ³ chá»¯ cÃ¡i in thÆ°á»ng
                  </li>
                  <li className={passwordRequirements.hasNumber ? styles.met : styles.unmet}>
                    <span className={styles.requirementIcon}>
                      {passwordRequirements.hasNumber ? 'âœ“' : 'â—‹'}
                    </span>
                    CÃ³ chá»¯ sá»‘
                  </li>
                  <li className={passwordRequirements.hasSpecialChar ? styles.met : styles.unmet}>
                    <span className={styles.requirementIcon}>
                      {passwordRequirements.hasSpecialChar ? 'âœ“' : 'â—‹'}
                    </span>
                    CÃ³ kÃ½ tá»± Ä‘áº·c biá»‡t
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='confirmPassword' className={styles.label}>
              XÃ¡c nháº­n máº­t kháº©u má»›i
            </label>
            <input
              type='password'
              id='confirmPassword'
              name='confirmPassword'
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={() => handleBlur('confirmPassword')}
              className={styles.input}
              placeholder='Nháº­p láº¡i máº­t kháº©u má»›i'
            />
            {errors.confirmPassword && (
              <span className={styles.errorMessage}>{errors.confirmPassword}</span>
            )}
            {!errors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.newPassword && (
              <span className={styles.successMessage}>âœ“ Máº­t kháº©u xÃ¡c nháº­n khá»›p</span>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type='button'
              onClick={onCancel}
              className={styles.btnCancel}
              disabled={isLoading}
            >
              Há»§y
            </button>
            <button
              type='submit'
              className={styles.btnSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Äang xá»­ lÃ½...' : 'XÃ¡c nháº­n Ä‘á»•i máº­t kháº©u'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
