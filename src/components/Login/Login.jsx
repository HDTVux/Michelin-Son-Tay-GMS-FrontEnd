import React, { useState } from 'react';
import './Login.css';
import Mascot from '../../assets/Mascot.jpg';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function Login(){
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
    if (!formData.email) {
      newErrors.email = t('login.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('login.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('login.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('login.passwordMinLength');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      console.log("Dữ liệu đăng nhập:", formData);
      setIsLoading(false);
      // Xử lý API ở đây
    }, 1000);
  };

  return (
    <div className="loginContainer">
      <div className="loginCard">
        {/* 2. Truyền ảnh vào style inline */}
        <div 
          className="loginImageSection" 
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

        <div className="loginFormSection">
          <div className="formHeader">
            <h2>{t('login.title')}</h2>
            <p className="formSubtitle">{t('login.subtitle')}</p>
          </div>
          <p className="formPrompt">
            {t('login.noAccount')}
            <Link to="/register" className="link-style"> {t('login.register')}</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="inputGroup">
              <label className="inputLabel">{t('login.emailPlaceholder')}</label>
              <input 
                type="email" 
                name="email"
                placeholder={t('login.emailPlaceholder')}
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="errorMessage">{errors.email}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">{t('login.passwordPlaceholder')}</label>
              <div className="passwordWrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t('login.passwordPlaceholder')}
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
              {errors.password && <span className="errorMessage">{errors.password}</span>}
            </div>
            <p className="forgotPassword">
              {t('login.forgotPassword')}
              <Link to="/register" className="link-style"> {t('login.forgot')}</Link>
            </p>

            <button 
              type="submit" 
              className={`btnLogin ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  {t('login.loggingIn')}
                </>
              ) : (
                t('login.loginButton')
              )}
            </button>
          </form>

          <div className="divider"><span>{t('login.orLoginWith')}</span></div>

          <div className="socialButtons">
            <button className="socialBtn">
              <img src="https://www.svgrepo.com/show/355037/google.svg" width="18" alt="Google" />
              Google
            </button>
            <button className="socialBtn">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Apple_logo_grey.svg/1724px-Apple_logo_grey.svg.png" width="18" alt="Apple" />
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};