import { Navigate, Outlet } from 'react-router-dom';
import SideBar from './Sidebar/SideBar.jsx';
import './StaffLayout.css';

const StaffLayout = () => {
  // const token = localStorage.getItem('authToken');

  // if (!token) {
  //   return <Navigate to="/login" replace />;
  // }

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
