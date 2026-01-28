import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';
import CustomerLogin from '../Login/CustomerLogin.jsx';
import CustomerRegister from '../Register/CustomerRegister.jsx';
import logo from '../../assets/Logo3.jpg';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [showCustomerRegister, setShowCustomerRegister] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`mainHeader ${isScrolled ? 'scrolled' : ''}`}>
      <div className="headerContainer">
        <Link to="/" className="headerLogo" onClick={closeMenu}>
          <img src={logo} alt='logo' id='Logo' />
        </Link>
        
        <button 
          className={`mobileMenuToggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`headerNav ${isMenuOpen ? 'open' : ''}`}>
          <Link 
            to="/" 
            className={isActive('/') ? 'active' : ''}
            onClick={closeMenu}
          >
            Trang chủ
          </Link>
          <Link 
            to="/services" 
            className={isActive('/services') ? 'active' : ''}
            onClick={closeMenu}
          >
            Dịch vụ
          </Link>
          <Link 
            to="/about" 
            className={isActive('/about') ? 'active' : ''}
            onClick={closeMenu}
          >
            Về chúng tôi
          </Link>
        </nav>
        
        <div className={`headerAuth ${isMenuOpen ? 'open' : ''}`}>
          <button
            className="btnNavLogin"
            onClick={() => { setShowCustomerLogin(true); closeMenu(); }}
          >
            Đăng nhập
          </button>
          <button
            className="btnNavRegister"
            onClick={() => { setShowCustomerRegister(true); closeMenu(); }}
          >
            Đăng ký
          </button>
        </div>
        {showCustomerLogin && (
          <CustomerLogin onClose={() => setShowCustomerLogin(false)} />
        )}
        {showCustomerRegister && (
          <CustomerRegister onClose={() => setShowCustomerRegister(false)} />
        )}
      </div>
    </header>
  );
};

export default Header;