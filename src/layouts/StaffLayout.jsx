import { Outlet } from 'react-router-dom';
import SideBar from './Sidebar/SideBar.jsx';
import './StaffLayout.css';

const StaffLayout = () => {
  return (
    <div className="staffLayout">
      <SideBar />
      <main className="staffLayout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
