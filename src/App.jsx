import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Home from './pages/home/Home.jsx';
import Login from './pages/login/Login.jsx';
import CustomerLogin from './features/auth/components/CustomerLoginModal.jsx';
import Services from './pages/home/Services/Services.jsx';
import About from './pages/About/About.jsx';
import ForgotPassword from './pages/forgot-password/ForgotPassword.jsx';
import Booking from './pages/Booking/Booking.jsx';
import UserProfile from './pages/UserProfile/UserProfile.jsx';
import ManageProfile from './pages/UserProfile/ManageProfile.jsx';
import MyBookings from './pages/MyBookings/MyBookings.jsx';
import BookingDetail from './pages/BookingDetail/BookingDetail.jsx';
import EditBooking from './pages/EditBooking/EditBooking.jsx';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nhóm các trang có Header & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />
          <Route path="customer-login" element={<CustomerLogin />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="booking" element={<Booking />} />
          <Route path="user-profile" element={<UserProfile />} />
          <Route path="manage-profile" element={<ManageProfile />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="booking-detail/:id" element={<BookingDetail />} />
          <Route path="edit-booking/:id" element={<EditBooking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}