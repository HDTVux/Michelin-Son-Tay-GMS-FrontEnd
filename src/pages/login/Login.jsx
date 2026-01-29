import React, { useState } from 'react';
import './Login.css';
import Mascot from '../../assets/Mascot.jpg';
import { Link } from 'react-router-dom';

export default function Login(){
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
      newErrors.email = 'Email là bắt buộc';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
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
            <h2>Chào mừng trở lại</h2>
            <p className="formSubtitle">Welcome Back</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="inputGroup">
              <label className="inputLabel">Email</label>
              <input 
                type="email" 
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="errorMessage">{errors.email}</span>}
            </div>
            <div className="inputGroup">
              <label className="inputLabel">Nhập mật khẩu</label>
              <div className="passwordWrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Nhập mật khẩu"
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
              Quên mật khẩu?
              <Link to="/forgot-password" className="link-style"> Quên</Link>
            </p>

            <button 
              type="submit" 
              className={`btnLogin ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="divider"><span>Hoặc đăng nhập bằng</span></div>

          <div className="socialButtons">
            <button className="socialBtn">
              Zalo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};