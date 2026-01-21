import React, { useState } from 'react';
import './Login.css';
import Mascot from "../../../src/assets/Mascot.jpg";
import { Link } from 'react-router-dom';

export default function Login(){
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dữ liệu đăng nhập:", formData);
    // Xử lý API 
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
          <h2>Welcome Back</h2>
          <p>Haven't had an account yet? 
            <Link to="/register" className="link-style"> Register</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="inputGroup">
              <input 
                type="email" 
                placeholder="Email"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required 
              />
            </div>
            <div className="inputGroup">
              <input 
                type="password" 
                placeholder="Enter your password" 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <p>You forgot your password?  
            <Link to="/register" className="link-style"> Forgot</Link>
          </p>


            <button type="submit" className="btnLogin">Login</button>
          </form>

          <div className="divider"><span>Or login with</span></div>

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