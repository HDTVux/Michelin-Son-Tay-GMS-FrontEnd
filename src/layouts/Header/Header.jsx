import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';
import CustomerLogin from '../../features/auth/components/CustomerLoginModal.jsx';
import logo from '../../assets/Logo3.jpg';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [customerName, setCustomerName] = useState('Khách hàng');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Đọc token + tên (nếu có) từ localStorage để biết trạng thái đăng nhập
  const refreshAuth = useCallback(() => {
    const token = localStorage.getItem('customerToken');
    const name = localStorage.getItem('customerName');
    setIsAuthed(!!token);
    setCustomerName(name?.trim() || 'Khách hàng');
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Refresh auth state on mount and when login modal closes
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!showCustomerLogin) {
      refreshAuth();
    }
  }, [showCustomerLogin, refreshAuth]);

  // Đóng menu user khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'customerToken' || e.key === 'customerName') {
        refreshAuth();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshAuth]);

  // Đăng xuất: xóa token + tên lưu tạm, đóng dropdown
  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerName'); // chưa có name khách hàng trong localStorage
    setIsAuthed(false);
    setCustomerName('Khách hàng');
    setIsUserDropdownOpen(false);
  };

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
            to="/booking" 
            className={isActive('/booking') ? 'active' : ''}
            onClick={closeMenu}
          >
            Đặt lịch
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
          {isAuthed ? (
            <div className="headerUser" ref={dropdownRef}>
              <button
                className={`userChip ${isUserDropdownOpen ? 'open' : ''}`}
                onClick={() => setIsUserDropdownOpen((v) => !v)}
                aria-label="Tài khoản"
              >
                <span className="avatarCircle">{customerName?.[0]?.toUpperCase() || 'U'}</span>
                <span className="userGreeting">Xin chào, {customerName}</span>
              </button>
              {isUserDropdownOpen && (
                <div className="userDropdown">
                  <Link to="/user-profile" onClick={() => setIsUserDropdownOpen(false)}>Tài khoản của tôi</Link>
                  <Link to="/my-bookings" onClick={() => setIsUserDropdownOpen(false)}>Đặt lịch của tôi</Link>
                  <button type="button" onClick={handleLogout}>Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btnNavLogin"
              onClick={() => { setShowCustomerLogin(true); closeMenu(); }}
            >
              Đăng nhập
            </button>
          )}
        </div>
        {showCustomerLogin && (
          <CustomerLogin onClose={() => setShowCustomerLogin(false)} />
        )}
      </div>
    </header>
  );
};

export default Header;