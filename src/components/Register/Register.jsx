import React, { useState } from 'react';
import './Register.css';
import Mascot from '../../assets/Mascot.jpg';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function Register(){
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name:'',
    phoneNumber:'',
    email: '',
    password: '',
    repassword:'',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^[0-9]{10,11}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 6) return { strength: 1, text: t('register.passwordWeak') };
    if (password.length < 8) return { strength: 2, text: t('register.passwordMedium') };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      return { strength: 2, text: t('register.passwordMedium') };
    }
    return { strength: 3, text: t('register.passwordStrong') };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validation
    if (!formData.name.trim()) {
      newErrors.name = t('register.nameRequired');
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = t('register.phoneRequired');
    } else if (!validatePhone(formData.phoneNumber)) {
      newErrors.phoneNumber = t('register.phoneInvalid');
    }

    if (!formData.email) {
      newErrors.email = t('register.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('register.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('register.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('register.passwordMinLength');
    }

    if (!formData.repassword) {
      newErrors.repassword = t('register.repasswordRequired');
    } else if (formData.password !== formData.repassword) {
      newErrors.repassword = t('register.passwordMismatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      console.log("Dữ liệu đăng kí:", formData);
      setIsLoading(false);
      // Xử lý API ở đây
    }, 1000);
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="loginContainer">
      <div className="loginCard">
        {/* 2. Truyền ảnh vào style inline */}
        <div 
          className="registerImageSection" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${Mascot})` 
          }}
        >
          <div className="logo">Michellin Sơn Tây</div>
          <div className="imageText">
            <h2>On the road <br /> and beyond!</h2>
            <div className="pagination-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot active"></span>
            </div>
          </div>
        </div>

        <div className="registerFormSection">
          <div className="formHeader">
            <h2>{t('register.title')}</h2>
            <p className="formSubtitle">{t('register.subtitle')}</p>
          </div>
          <p className="formPrompt">
            {t('register.haveAccount')}
            <Link to="/login" className="link-style"> {t('register.login')}</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="inputGroup">
              <label className="inputLabel">{t('register.namePlaceholder')}</label>
              <input 
                type="text" 
                name="name"
                placeholder={t('register.namePlaceholder')}
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="errorMessage">{errors.name}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">{t('register.phonePlaceholder')}</label>
              <input 
                type="tel" 
                name="phoneNumber"
                placeholder={t('register.phonePlaceholder')}
                value={formData.phoneNumber}
                onChange={handleChange}
                className={errors.phoneNumber ? 'error' : ''}
              />
              {errors.phoneNumber && <span className="errorMessage">{errors.phoneNumber}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">{t('register.emailPlaceholder')}</label>
              <input 
                type="email" 
                name="email"
                placeholder={t('register.emailPlaceholder')}
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="errorMessage">{errors.email}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">{t('register.passwordPlaceholder')}</label>
              <div className="passwordWrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t('register.passwordPlaceholder')}
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                />
                <button
                  type="button"
                  className="togglePassword"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {formData.password && (
                <div className="passwordStrength">
                  <div className="strengthBar">
                    <div 
                      className={`strengthFill strength-${passwordStrength.strength}`}
                      style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                    ></div>
                  </div>
                  <span className={`strengthText strength-${passwordStrength.strength}`}>
                    {passwordStrength.text}
                  </span>
                </div>
              )}
              {errors.password && <span className="errorMessage">{errors.password}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">{t('register.repasswordPlaceholder')}</label>
              <div className="passwordWrapper">
                <input 
                  type={showRePassword ? "text" : "password"}
                  name="repassword"
                  placeholder={t('register.repasswordPlaceholder')}
                  value={formData.repassword}
                  onChange={handleChange}
                  className={errors.repassword ? 'error' : ''}
                />
                <button
                  type="button"
                  className="togglePassword"
                  onClick={() => setShowRePassword(!showRePassword)}
                  aria-label="Toggle password visibility"
                >
                  {showRePassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.repassword && <span className="errorMessage">{errors.repassword}</span>}
            </div>
            <button 
              type="submit" 
              className={`btnRegister ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  {t('register.registering')}
                </>
              ) : (
                t('register.registerButton')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};