import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';
import CustomerLogin from '../../features/auth/components/CustomerLoginModal.jsx';
import logo from '../../assets/LogoNonBackground.png';
import { DEFAULT_AVATAR, handleAvatarError } from '../../assets/defaultAvatar.js';
import { useCart } from '../../context/CartContext.jsx';
import { fetchHomeProducts } from '../../services/homeService.js';

// Dữ liệu hãng xe / dòng xe phổ biến tại VN để lọc phụ tùng theo xe (đồng bộ với CAR_DATA của Services.jsx)
const CAR_DATA = {
  Toyota: ['Vios', 'Camry', 'Innova', 'Corolla Cross', 'Fortuner', 'Yaris', 'Hilux', 'Wigo'],
  Honda: ['City', 'Civic', 'CR-V', 'HR-V', 'Accord', 'Brio'],
  Hyundai: ['Accent', 'Grand i10', 'Elantra', 'Tucson', 'Santa Fe', 'Creta', 'Kona'],
  Kia: ['Morning', 'Soluto', 'K3', 'Seltos', 'Sorento', 'Carnival', 'Sonet'],
  Mazda: ['Mazda 2', 'Mazda 3', 'Mazda 6', 'CX-5', 'CX-8', 'BT-50'],
  Ford: ['Ranger', 'Everest', 'Explorer', 'Territory'],
  Mitsubishi: ['Xpander', 'Outlander', 'Attrage', 'Triton', 'Pajero Sport'],
  VinFast: ['Fadil', 'Lux A2.0', 'Lux SA2.0', 'VF e34', 'VF 8', 'VF 9', 'VF 5'],
};

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const extractList = (res) => {
  const payload = extractPayload(res);
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return Array.isArray(payload) ? payload : [];
};
const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (value == null || typeof value === 'object') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};
const normalizeCategoryToken = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replaceAll(/[̀-ͯ]/g, '')
  .replaceAll(/\s+/g, ' ');
const getCategoryId = (item) => toPositiveNumber(
  item?.workCategoryId
  ?? item?.itemCategoryId
  ?? item?.categoryId
  ?? item?.category?.id
  ?? item?.category?.categoryId
  ?? item?.itemCategory?.id
  ?? item?.itemCategory?.categoryId
  ?? item?.workCategory?.id
  ?? item?.workCategory?.categoryId,
);
const getCategoryCode = (item) => firstNonEmptyString(
  item?.categoryCode,
  item?.itemCategoryCode,
  item?.workCategoryCode,
  item?.category?.code,
  item?.category?.categoryCode,
  item?.itemCategory?.code,
  item?.itemCategory?.categoryCode,
  item?.workCategory?.code,
  item?.workCategory?.categoryCode,
);
const getCategoryName = (item) => firstNonEmptyString(
  item?.categoryName,
  item?.itemCategoryName,
  item?.workCategoryName,
  typeof item?.category === 'string' ? item.category : undefined,
  typeof item?.itemCategory === 'string' ? item.itemCategory : undefined,
  typeof item?.workCategory === 'string' ? item.workCategory : undefined,
  item?.category?.name,
  item?.category?.categoryName,
  item?.itemCategory?.name,
  item?.itemCategory?.categoryName,
  item?.workCategory?.name,
  item?.workCategory?.categoryName,
);
const getCategoryKey = (item) => {
  const id = getCategoryId(item);
  if (id != null) return `id:${id}`;
  const code = normalizeCategoryToken(getCategoryCode(item));
  if (code) return `code:${code}`;
  const name = normalizeCategoryToken(getCategoryName(item));
  return name ? `name:${name}` : '';
};

const Header = () => {
  const STORE_PHONE_TEL = '0987545680';
  const STORE_PHONE_DISPLAY = '0987 545 680';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [customerName, setCustomerName] = useState('Khách hàng');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // 'services' | 'parts' | null
  const [partCategories, setPartCategories] = useState([]);
  const [partCategoriesLoading, setPartCategoriesLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navDropdownsRef = useRef(null);
  const navCloseTimeoutRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { totalQuantity } = useCart();

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`));

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    clearNavCloseTimeout();
    setIsMenuOpen(false);
    setOpenMenu(null);
  };

  const toggleNavDropdown = (key) => {
    clearNavCloseTimeout();
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  const clearNavCloseTimeout = () => {
    if (navCloseTimeoutRef.current) {
      clearTimeout(navCloseTimeoutRef.current);
      navCloseTimeoutRef.current = null;
    }
  };

  const handleNavDropdownEnter = (key) => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    clearNavCloseTimeout();
    setOpenMenu(key);
  };

  const handleNavDropdownLeave = () => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    clearNavCloseTimeout();
    navCloseTimeoutRef.current = setTimeout(() => setOpenMenu(null), 250);
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

  // Đóng menu user + dropdown danh mục khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
      if (navDropdownsRef.current && !navDropdownsRef.current.contains(e.target)) {
        clearNavCloseTimeout();
        setOpenMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Đóng dropdown khi chuyển trang
  useEffect(() => {
    clearNavCloseTimeout();
    setOpenMenu(null);
  }, [location.pathname]);

  // Dọn timeout đóng dropdown khi unmount
  useEffect(() => () => clearNavCloseTimeout(), []);

  // Tải danh mục phụ tùng công khai một lần để hiển thị trong mega-menu "Phụ tùng"
  useEffect(() => {
    let active = true;
    setPartCategoriesLoading(true);
    fetchHomeProducts({ page: 0, size: 500, itemType: 'PART' })
      .then((res) => {
        if (!active) return;
        const items = extractList(res);
        const derived = new Map();
        items.forEach((item) => {
          const categoryKey = getCategoryKey(item);
          if (!categoryKey || derived.has(categoryKey)) return;
          const categoryCode = getCategoryCode(item);
          if (!categoryCode) return;
          derived.set(categoryKey, {
            categoryKey,
            categoryCode,
            label: getCategoryName(item) || categoryCode,
          });
        });
        setPartCategories(Array.from(derived.values()).sort((a, b) => a.label.localeCompare(b.label, 'vi')));
      })
      .catch(() => {
        if (active) setPartCategories([]);
      })
      .finally(() => {
        if (active) setPartCategoriesLoading(false);
      });
    return () => { active = false; };
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

  const carBrands = useMemo(() => Object.keys(CAR_DATA), []);

  return (
    <header className={`mainHeader ${isScrolled ? 'scrolled' : ''}`}>
      <div className="headerContainer">
        <Link to="/" className="headerLogo" onClick={closeMenu}>
          <img src={logo} alt='logo' id='Logo' />
        </Link>

        <nav className={`headerNav ${isMenuOpen ? 'open' : ''}`} ref={navDropdownsRef}>
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

          <div
            className={`navDropdown ${openMenu === 'services' ? 'open' : ''}`}
            onMouseEnter={() => handleNavDropdownEnter('services')}
            onMouseLeave={handleNavDropdownLeave}
          >
            <div className="navDropdownTrigger">
              <Link
                to="/services"
                className={isActive('/services') ? 'active' : ''}
                onClick={() => { closeMenu(); scrollToTop(); }}
              >
                Dịch vụ
              </Link>
              <button
                type="button"
                className="navDropdownCaret"
                aria-label="Mở danh mục dịch vụ"
                aria-expanded={openMenu === 'services'}
                onClick={(e) => { e.preventDefault(); toggleNavDropdown('services'); }}
              >
                ▾
              </button>
            </div>
            {openMenu === 'services' && (
              <div className="navDropdownPanel servicesDropdownPanel">
                <Link to="/services" onClick={() => { closeMenu(); scrollToTop(); }}>Dịch vụ</Link>
                <Link to="/combos" onClick={() => { closeMenu(); scrollToTop(); }}>Combo</Link>
              </div>
            )}
          </div>

          <div
            className={`navDropdown ${openMenu === 'parts' ? 'open' : ''}`}
            onMouseEnter={() => handleNavDropdownEnter('parts')}
            onMouseLeave={handleNavDropdownLeave}
          >
            <div className="navDropdownTrigger">
              <Link
                to="/parts"
                className={isActive('/parts') ? 'active' : ''}
                onClick={() => { closeMenu(); scrollToTop(); }}
              >
                Phụ tùng
              </Link>
              <button
                type="button"
                className="navDropdownCaret"
                aria-label="Mở danh mục phụ tùng"
                aria-expanded={openMenu === 'parts'}
                onClick={(e) => { e.preventDefault(); toggleNavDropdown('parts'); }}
              >
                ▾
              </button>
            </div>
            {openMenu === 'parts' && (
              <div className="navDropdownPanel partsDropdownPanel">
                <div className="partsDropdownSection partsDropdownCategories">
                  <div className="partsDropdownHeading">Danh mục</div>
                  {partCategoriesLoading && (
                    <div className="partsDropdownStatus">Đang tải...</div>
                  )}
                  {!partCategoriesLoading && partCategories.length === 0 && (
                    <div className="partsDropdownStatus">Chưa có danh mục</div>
                  )}
                  <div className="partsDropdownList">
                    {partCategories.map((cat) => (
                      <Link
                        key={cat.categoryKey}
                        to={`/parts?categoryCode=${encodeURIComponent(cat.categoryCode)}`}
                        onClick={() => { closeMenu(); scrollToTop(); }}
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="partsDropdownSection partsDropdownVehicles">
                  <div className="partsDropdownHeading">Chọn theo xe</div>
                  <div className="vehicleBrandList">
                    {carBrands.map((brand) => (
                      <div key={brand} className="vehicleBrandRow">
                        <Link
                          to={`/parts?vehicleMake=${encodeURIComponent(brand)}`}
                          className="vehicleBrandLink"
                          onClick={() => { closeMenu(); scrollToTop(); }}
                        >
                          {brand}
                          <span className="vehicleBrandArrow">›</span>
                        </Link>
                        <div className="vehicleModelFlyout">
                          {CAR_DATA[brand].map((model) => (
                            <Link
                              key={model}
                              to={`/parts?vehicleMake=${encodeURIComponent(brand)}&vehicleModel=${encodeURIComponent(model)}`}
                              onClick={() => { closeMenu(); scrollToTop(); }}
                            >
                              {model}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/car-parts-lookup"
            className={isActive('/car-parts-lookup') ? 'active' : ''}
            onClick={() => { closeMenu(); scrollToTop(); }}
          >
            Tra cứu
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
            Vị trí Cửa Hàng
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

          <Link
            to="/cart"
            className={`headerCartBtn ${isActive('/cart') ? 'active' : ''}`}
            aria-label={`Giỏ hàng, ${totalQuantity} sản phẩm`}
            onClick={closeMenu}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalQuantity > 0 && (
              <span className="headerCartBadge">{totalQuantity > 99 ? '99+' : totalQuantity}</span>
            )}
          </Link>

          <div className={`headerAuth ${isMenuOpen ? 'open' : ''}`}>
            {isAuthed ? (
              <div className="headerUser" ref={dropdownRef}>
                <button
                  className={`userChip ${isUserDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsUserDropdownOpen((v) => !v)}
                  aria-label="Tài khoản"
                >
                  <img className="avatarCircle" src={DEFAULT_AVATAR} alt={customerName || 'Avatar'} onError={handleAvatarError} />
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
