import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="mainHeader">
      <div className="headerContainer">
        <Link to="/" className="headerLogo">Michellin Son Tay</Link>
        <nav className="headerNav">
          <Link to="/">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
        </nav>
        <div className="headerAuth">
          <Link to="/login" className="btnNavLogin">Login</Link>
          {/* Tạm thời để đây sau sẽ chuyển đến màn booking */}
          <Link to="/register" className="btnNavRegister">Book now</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;