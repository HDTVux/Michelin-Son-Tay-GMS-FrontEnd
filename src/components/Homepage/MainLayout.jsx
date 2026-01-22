import { Outlet } from 'react-router-dom';
import Header from '../Header/Header.jsx';
import Footer from '../Footer/Footer.jsx';
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
    </div>
  );
};

export default MainLayout;