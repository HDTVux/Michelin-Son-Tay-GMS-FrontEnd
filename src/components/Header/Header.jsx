import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import './Header.css';
import CustomerLogin from '../Login/CustomerLogin.jsx';
import logo from '../../assets/Logo2.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t, language, toggleLanguage } = useLanguage();

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const [showCustomerLogin, setShowCustomerLogin] = useState(false);

  return (
    <header className="mainHeader">
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
            {t('header.home')}
          </Link>
          <Link 
            to="/services" 
            className={isActive('/services') ? 'active' : ''}
            onClick={closeMenu}
          >
            {t('header.services')}
          </Link>
          <Link 
            to="/about" 
            className={isActive('/about') ? 'active' : ''}
            onClick={closeMenu}
          >
            {t('header.about')}
          </Link>
        </nav>
        
        <div className={`headerAuth ${isMenuOpen ? 'open' : ''}`}>
          <button 
            className="languageToggle"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span>{language === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span className="languageText">{language === 'vi' ? 'VI' : 'EN'}</span>
          </button>
          <button
            className="btnNavLogin"
            onClick={() => { setShowCustomerLogin(true); closeMenu(); }}
          >
            {t('header.login')}
          </button>
          <Link 
            to="/register" 
            className="btnNavRegister"
            onClick={closeMenu}
          >
            {t('header.register')}
          </Link>
        </div>
        {showCustomerLogin && (
          <CustomerLogin onClose={() => setShowCustomerLogin(false)} />
        )}
      </div>
    </header>
  );
};

export default Header;