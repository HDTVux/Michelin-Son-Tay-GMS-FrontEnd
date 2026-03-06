import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import BookingManagement from './pages/DashBoard/BookingRequestManagement/BookingRequestManagement.jsx';
import ConfirmedBookingManagement from './pages/DashBoard/BookingManagement/ConfirmedBookingManagement.jsx';
import ConfirmedBookingDetail from './pages/DashBoard/BookingManagement/ConfirmedBookingDetail.jsx';
import BookingRequestDetail from './pages/DashBoard/BookingRequestManagement/BookingRequestDetail.jsx';
import BookingRequestEdit from './pages/DashBoard/BookingRequestManagement/BookingRequestEdit.jsx';
import { cleanupExpiredTokens } from './services/tokenUtils.js';
import CheckIn from './pages/DashBoard/CheckInManagenent/CheckIn.jsx';
import DailySchedule from './pages/DashBoard/DailySchedule/DailySchedule.jsx';
import EditCustomerProfile from './pages/DashBoard/CustomerProfile/EditCustomerProfile.jsx';
import StaffAttendance from './pages/DashBoard/StaffAttendance/StaffAttendance.jsx';
import CreateServiceTicket from './pages/DashBoard/ServiceTicketManagement/CreateServiceTicket.jsx';
import CreatBooking from './pages/DashBoard/BookingManagement/CreateBooking.jsx';
import ServiceTicketDetail from './pages/DashBoard/ServiceTicketManagement/ServiceTicketDetail.jsx';
export default function App() {
  useEffect(() => {
    cleanupExpiredTokens();
  }, []);

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
          <Route path="booking-request-management" element={<BookingManagement />} />
          <Route path="booking-management" element={<ConfirmedBookingManagement />} />
          <Route path="booking-management/:id" element={<ConfirmedBookingDetail />} />
          <Route path="booking-request-management/:id" element={<BookingRequestDetail />} />
          <Route path="booking-request-management/:id/edit" element={<BookingRequestEdit />} />
          <Route path="staff-profile" element={<StaffProfile />} />
          <Route path="update-staff-profile" element={<UpdateStaffProfile />} />
          <Route path="staff-change-password" element={<StaffChangePassword />} />
          <Route path="staff-manage-sso" element={<StaffManageSSO />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="daily-schedule" element={<DailySchedule />} />
          <Route path="customer-profile/:customerId" element={<EditCustomerProfile />} />
          <Route path="staff-attendance" element={<StaffAttendance />} />
          <Route path="create-service-ticket" element={<CreateServiceTicket />} />
          <Route path="service-ticket" element={<ServiceTicketDetail />} />
          <Route path="create-booking" element={<CreatBooking />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Routes>
    </BrowserRouter>
  );
}