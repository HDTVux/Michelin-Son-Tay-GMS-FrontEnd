import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import MainLayout from './layouts/MainLayout.jsx';
import Home from './pages/home/Home.jsx';
import Login from './features/auth/login/Login.jsx';
import CustomerLogin from './features/auth/components/CustomerLoginModal.jsx';
import Services from './pages/home/Services/Services.jsx';
import About from './pages/About/About.jsx';
import ForgotPassword from './features/auth/forgot-password/ForgotPassword.jsx';
import Booking from './pages/Booking/Booking.jsx';
import UserProfile from './pages/UserProfile/UserProfile.jsx';
import ManageProfile from './pages/UserProfile/ManageProfile.jsx';
import AccountSecurity from './pages/UserProfile/AccountSecurity.jsx';
import LinkedAccounts from './pages/UserProfile/LinkedAccounts.jsx';
import MyBookings from './pages/MyBookings/MyBookings.jsx';
import BookingDetail from './pages/BookingDetail/BookingDetail.jsx';
import EditBooking from './pages/EditBooking/EditBooking.jsx';
import StaffProfile from './pages/StaffProfile/StaffProfile.jsx';
import UpdateStaffProfile from './pages/StaffProfile/UpdateStaffProfile.jsx';
import StaffChangePassword from './pages/StaffProfile/StaffChangePassword.jsx';
import StaffManageSSO from './pages/StaffProfile/StaffManageSSO.jsx';
import ServiceDetail from './pages/ServiceDetail/ServiceDetail.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import ToastBox from './components/Toast/ToastBox.jsx';
import BookingManagement from './pages/DashBoard/BookingManagement/BookingManagement.jsx';
import BookingRequestDetail from './pages/DashBoard/BookingManagement/BookingRequestDetail.jsx';
import BookingRequestEdit from './pages/DashBoard/BookingManagement/BookingRequestEdit.jsx';
export default function App() {
  return (
    <BrowserRouter>
      <ToastBox />
      <Routes>
        {/* Nhóm các trang có Header & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:serviceId" element={<ServiceDetail />} />
          <Route path="about" element={<About />} />
          <Route path="customer-login" element={<CustomerLogin />} />
          <Route path="booking" element={<Booking />} />
          <Route path="user-profile" element={<UserProfile />} />
          <Route path="manage-profile" element={<ManageProfile />} />
          <Route path="account-security" element={<AccountSecurity />} />
          <Route path="linked-accounts" element={<LinkedAccounts />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="booking-detail/:id" element={<BookingDetail />} />
          <Route path="edit-booking/:id" element={<EditBooking />} />

        </Route>
        {/* Nhóm trang dashboard nhân viên dùng SideBar */}
        <Route element={<StaffLayout />}>
          <Route path="booking-management" element={<BookingManagement />} />
          <Route path="booking-management/:id" element={<BookingRequestDetail />} />
          <Route path="booking-management/:id/edit" element={<BookingRequestEdit />} />
          <Route path="staff-profile" element={<StaffProfile />} />
          <Route path="update-staff-profile" element={<UpdateStaffProfile />} />
          <Route path="staff-change-password" element={<StaffChangePassword />} />
          <Route path="staff-manage-sso" element={<StaffManageSSO />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Routes>
    </BrowserRouter>
  );
}