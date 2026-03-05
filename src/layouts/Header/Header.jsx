import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';
import CustomerLogin from '../../features/auth/components/CustomerLoginModal.jsx';
import logo from '../../assets/Logo3.jpg';

const Header = () => {
  const STORE_PHONE_TEL = '0987545680';
  const STORE_PHONE_DISPLAY = '0987 545 680';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [customerName, setCustomerName] = useState('Khách hàng');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

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
    const t = setTimeout(() => refreshAuth(), 0);
    return () => clearTimeout(t);
  }, [refreshAuth]);

  useEffect(() => {
    if (!showCustomerLogin) {
      const t = setTimeout(() => refreshAuth(), 0);
      return () => clearTimeout(t);
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
    globalThis.addEventListener('storage', handleStorage);
    return () => globalThis.removeEventListener('storage', handleStorage);
  }, [refreshAuth]);

  // Đăng xuất: xóa token + tên lưu tạm, đóng dropdown
  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerName'); // chưa có name khách hàng trong localStorage
    setIsAuthed(false);
    setCustomerName('Khách hàng');
    setIsUserDropdownOpen(false);
    globalThis.dispatchEvent(new Event('authChange'));
  };

  return (
    <header className={`mainHeader ${isScrolled ? 'scrolled' : ''}`}>
      <div className="headerContainer">
        <Link to="/" className="headerLogo" onClick={closeMenu}>
          <img src={logo} alt='logo' id='Logo' />
        </Link>

        <nav className={`headerNav ${isMenuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            className={isActive('/') ? 'active' : ''}
            onClick={() => { closeMenu(); scrollToTop(); }}
          >
            Trang chủ
          </Link>
          <Link
            to="/about"
            className={isActive('/about') ? 'active' : ''}
            onClick={() => { closeMenu(); scrollToTop(); }}
          >
            Giới thiệu
          </Link>
          <Link
            to="/services"
            className={isActive('/services') ? 'active' : ''}
            onClick={() => { closeMenu(); scrollToTop(); }}
            preventScrollReset={true}
          >
            Dịch vụ
          </Link>
          <Link 
            to="/" 
            className=""
            onClick={(e) => {
              e.preventDefault();
              closeMenu();
              if (location.pathname === '/') return scrollToContact();
              navigate('/');
              setTimeout(scrollToContact, 100);
            }}
          >
            Liên hệ
          </Link>
        </nav>

        <div className="headerRight">
          <a
            className="headerHotline"
            href={`tel:${STORE_PHONE_TEL}`}
            aria-label={`Gọi hotline ${STORE_PHONE_DISPLAY}`}
            onClick={closeMenu}
          >
            <span className="headerHotlineIcon" aria-hidden="true">☎</span>
            <span className="headerHotlineLabel">Hotline:</span>
            <span className="headerHotlineText">{STORE_PHONE_DISPLAY}</span>
          </a>

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

          <button 
            className={`mobileMenuToggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        {showCustomerLogin && (
          <CustomerLogin onClose={() => setShowCustomerLogin(false)} />
        )}
      </div>
    </header>
  );
};

export default Header;