import { Outlet } from 'react-router-dom';
import Header from './Header/Header.jsx';
import Footer from './Footer/Footer.jsx';
import BackToTop from '../components/BackToTop/BackToTop.jsx';
import UserTour from '../components/UserTour/UserTour.jsx';
import './MainLayout.css';

const MainLayout = () => {
  return (
    <div className="layoutRoot">
      <Header />
      <main className="layoutMain">
        {/* Outlet là nơi nội dung của từng trang (Home, About...) sẽ hiển thị */}
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      <UserTour type="customer" />
    </div>
  );
};

export default MainLayout;