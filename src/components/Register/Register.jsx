import React, { useState } from 'react';
import './Register.css';
import Mascot from '../../assets/Mascot.jpg';
import { Link } from 'react-router-dom';

export default function Register(){
  const [formData, setFormData] = useState({
    name:'',
    phoneNumber:'',
    email: '',
    password: '',
    repassword:'',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dữ liệu đăng kí:", formData);
    // Xử lý API 
  };

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
          <h2>Hi there</h2>
          <p>You had an account? 
            <Link to="/login" >Login</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="inputGroup">
              <input 
                type="name" 
                placeholder="Name"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="inputGroup">
              <input 
                type="phoneNumber" 
                placeholder="Phone Number"
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                required 
              />
            </div>
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
            <div className="inputGroup">
              <input 
                type="repassword" 
                placeholder="Re enter your password"
                onChange={(e) => setFormData({...formData, repassword: e.target.value})}
                required 
              />
            </div>
            <button type="submit" className="btnRegister">Register</button>
          </form>
        </div>
      </div>
    </div>
  );
};