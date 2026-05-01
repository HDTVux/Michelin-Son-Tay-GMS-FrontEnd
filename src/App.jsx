import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import MainLayout from './layouts/MainLayout.jsx';
import RouteSessionPersistence from './components/RouteSessionPersistence.jsx';
import GlobalRequestButtonLoading from './components/GlobalRequestButtonLoading.jsx';

//Home page and common pages
import Home from './pages/home/Home.jsx';
import Services from './pages/home/Services/Services.jsx';
import About from './pages/About/About.jsx';
import Booking from './pages/Booking/Booking.jsx';
import ToastBox from './components/Toast/ToastBox.jsx';
import { cleanupExpiredTokens } from './services/tokenUtils.js';

//Staff pages
import Login from './features/auth/login/Login.jsx';
import ForgotPassword from './features/auth/forgot-password/ForgotPassword.jsx';
import StaffProfile from './pages/StaffProfile/StaffProfile.jsx';
import UpdateStaffProfile from './pages/StaffProfile/UpdateStaffProfile.jsx';
import StaffChangePassword from './pages/StaffProfile/StaffChangePassword.jsx';
import StaffManageSSO from './pages/StaffProfile/StaffManageSSO.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import DailySchedule from './pages/DashBoard/DailySchedule/DailySchedule.jsx';
import StaffDashboard from './pages/DashBoard/StaffDashboard/StaffDashboard.jsx';
import StaffAttendance from './pages/DashBoard/StaffAttendance/StaffAttendance.jsx';

//Admin/Manager/Advisor/Warehouse pages
import ServiceDetail from './pages/ServiceDetail/ServiceDetail.jsx';
import EditCustomerProfile from './pages/DashBoard/CustomerManager/EditCustomerProfile.jsx';
import TechnicianTasks from './pages/DashBoard/TechnicianTasks/TechnicianTasks.jsx';
import ServiceTicketDetail from './pages/DashBoard/ServiceTicketManagement/ServiceTicketDetail.jsx';
import ServiceTicketManagement from './pages/DashBoard/ServiceTicketManagement/ServiceTicketManagement.jsx';
import CustomerManager from './pages/DashBoard/CustomerManager/CustomerManager.jsx';
import StaffManagement from './pages/DashBoard/StaffManagement/StaffManagement.jsx';
import StaffDetailPage from './pages/DashBoard/StaffManagement/StaffDetailPage.jsx';
import EmployeeManager from './pages/DashBoard/EmployeeManager/EmployeeManager.jsx';
import EmployeeProfilePage from './pages/DashBoard/EmployeeManager/EmployeeProfilePage.jsx';
import CreateProduct from './pages/DashBoard/PartManagement/CreateProduct.jsx';
import WarehouseStockEntry from './pages/DashBoard/WarehouseManagement/WarehouseStockEntry.jsx';
import WarehouseStockEntryManagement from './pages/DashBoard/WarehouseManagement/WarehouseStockEntryManagement.jsx';
import WarehouseStockEntryDetail from './pages/DashBoard/WarehouseManagement/WarehouseStockEntryDetail.jsx';
import WarehouseStockIssues from './pages/DashBoard/WarehouseManagement/WarehouseStockIssuesManagement.jsx';
import WarehouseStockIssueDetail from './pages/DashBoard/WarehouseManagement/WarehouseStockIssueDetail.jsx';
import WarehouseReturnEntry from './pages/DashBoard/WarehouseManagement/WarehouseReturnEntry.jsx';
import WarehouseReturnEntryManagement from './pages/DashBoard/WarehouseManagement/WarehouseReturnEntryManagement.jsx';
import WarehouseReturnEntryDetail from './pages/DashBoard/WarehouseManagement/WarehouseReturnEntryDetail.jsx';
import WarehousePricing from './pages/DashBoard/WarehouseManagement/WarehousePricing.jsx';
import BlogManagement from './pages/DashBoard/PartManagement/ServiceManagement.jsx';
import PartManagement from './pages/DashBoard/PartManagement/PartManagement.jsx';
import CreateService from './pages/DashBoard/PartManagement/CreateService.jsx';
import BlogFormPage from './pages/DashBoard/PartManagement/BlogFormPage.jsx';
import ShiftManagement from './pages/DashBoard/ShiftManagement/ShiftManagement.jsx';
import PromotionManagement from './pages/DashBoard/PromotionManagement/PromotionManagement.jsx';
import SystemLogManagement from './pages/DashBoard/SystemReport/SystemLogManagement.jsx';
import FeedbackManagement from './pages/DashBoard/FeedbackManagement/FeedbackManagement.jsx';
import VehicleManagement from './pages/DashBoard/VehicleManagement/VehicleManagement.jsx';
import WarehouseManagement from './pages/DashBoard/WarehouseManagement/WarehouseManagement.jsx';

//Customer pages
import CustomerLogin from './features/auth/components/CustomerLoginModal.jsx';
import UserProfile from './pages/UserProfile/UserProfile.jsx';
import MyBookings from './pages/MyBookings/MyBookings.jsx';
import BookingDetail from './pages/BookingDetail/BookingDetail.jsx';
import EditBooking from './pages/EditBooking/EditBooking.jsx';
import CustomerDashboard from './pages/CustomerDashboard/CustomerDashboard.jsx';

//Receptionist pages
import CreatBooking from './pages/DashBoard/BookingManagement/CreateBooking.jsx';
import SendReminder from './pages/DashBoard/SendReminder/SendReminder.jsx';
import StaffNotificationSender from './pages/DashBoard/StaffNotificationSender/StaffNotificationSender.jsx';
import MaintenanceReminder from './pages/DashBoard/MaintenanceReminder/MaintenanceReminder.jsx';
import QueueManagement from './pages/DashBoard/QueueManagement/QueueManagement.jsx';
import ConfirmedBookingDetail from './pages/DashBoard/BookingManagement/ConfirmedBookingDetail.jsx';
import BookingRequestDetail from './pages/DashBoard/BookingRequestManagement/BookingRequestDetail.jsx';
import BookingManagement from './pages/DashBoard/BookingRequestManagement/BookingRequestManagement.jsx';
import ConfirmedBookingManagement from './pages/DashBoard/BookingManagement/ConfirmedBookingManagement.jsx';
import BookingRequestEdit from './pages/DashBoard/BookingRequestManagement/BookingRequestEdit.jsx';
import ReceiptPaymentMethod from './pages/DashBoard/Receipt/ReceiptPaymentMethod.jsx';
import AccountingInvoicePrint from './pages/DashBoard/Receipt/AccountingInvoicePrint.jsx';
import VatInvoiceView from './pages/DashBoard/Receipt/VatInvoiceView.jsx';
import CheckIn from './pages/DashBoard/CheckInManagenent/CheckIn.jsx';

// Import Work History pages
import TechnicianWorkHistory from './pages/WorkHistory/TechnicianWorkHistory/TechnicianWorkHistory.jsx';
import AdminWorkHistory from './pages/WorkHistory/AdminWorkHistory/AdminWorkHistory.jsx';
import ManagerWorkHistory from './pages/WorkHistory/ManagerWorkHistory/ManagerWorkHistory.jsx';
import AdvisorWorkHistory from './pages/WorkHistory/AdvisorWorkHistory/AdvisorWorkHistory.jsx';
import ReceptionistWorkHistory from './pages/WorkHistory/ReceptionistWorkHistory/ReceptionistWorkHistory.jsx';
import AccountantWorkHistory from './pages/WorkHistory/AccountantWorkHistory/AccountantWorkHistory.jsx';

// Import Dashboard pages
import AdminDashboard from './pages/DashBoard/AdminDashboard/AdminDashboard.jsx';
import ManagerDashboard from './pages/DashBoard/ManagerDashboard/ManagerDashboard.jsx';
import AdvisorDashboard from './pages/DashBoard/AdvisorDashboard/AdvisorDashboard.jsx';
import ReceptionistDashboard from './pages/DashBoard/ReceptionistDashboard/ReceptionistDashboard.jsx';
import TechnicianDashboard from './pages/DashBoard/TechnicianDashboard/TechnicianDashboard.jsx';
import AccountantDashboard from './pages/DashBoard/AccountantDashboard/AccountantDashboard.jsx';

// Import Technician pages
import MyTasks from './pages/Technician/MyTasks/MyTasks.jsx';
import ServiceTicket from './pages/Technician/ServiceTicket/ServiceTicket.jsx';
import UpdateProgress from './pages/Technician/UpdateProgress/UpdateProgress.jsx';

// Import Advisor Inspection page
import AdvisorInspection from './pages/DashBoard/AdvisorInspection/AdvisorInspection.jsx';

const STAFF_ROLE = {
  ADVISOR: 'ADVISOR',
};

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRolesForRouting = () => {
  try {
    const rawRoles = localStorage.getItem('staffRoles');
    if (rawRoles) {
      const parsedRoles = JSON.parse(rawRoles);
      if (Array.isArray(parsedRoles)) {
        const normalized = parsedRoles
          .filter((role) => typeof role === 'string')
          .map((role) => normalizeRoleName(role))
          .filter(Boolean);
        if (normalized.length > 0) return normalized;
      }
    }
  } catch {
    // ignore invalid staffRoles storage
  }

  try {
    const rawProfile = localStorage.getItem('staffProfile');
    if (!rawProfile) return [];
    const parsedProfile = JSON.parse(rawProfile);
    const profileRoles = Array.isArray(parsedProfile?.role) ? parsedProfile.role : [];
    return profileRoles
      .filter((role) => typeof role === 'string')
      .map((role) => normalizeRoleName(role))
      .filter(Boolean);
  } catch {
    return [];
  }
};

function AdvisorOnlyRoute({ children }) {
  const staffRoles = readStaffRolesForRouting();
  const isAdvisor = staffRoles.includes(STAFF_ROLE.ADVISOR);
  return isAdvisor ? children : <Navigate to="/dashboard" replace />;
}

// Title updater based on route
function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const siteTitle = 'Đại lý garage Sơn Tây - michelinsontay - Trung tâm dịch vụ lốp xe uy tín';
    const titles = {
      '/': siteTitle,
      '/about': siteTitle,
      '/services': siteTitle,
      '/parts': siteTitle,
      '/booking': siteTitle,
      '/user-profile': siteTitle,
      '/my-bookings': siteTitle,
      '/login': siteTitle,
      '/forgot-password': siteTitle,
    };

    // Match /services/:id patterns
    if (location.pathname.startsWith('/services/')) {
      document.title = siteTitle;
      return;
    }

    if (location.pathname === '/services') {
      const type = new URLSearchParams(location.search).get('type')?.toUpperCase();
      if (type === 'PART') {
        document.title = siteTitle;
        return;
      }
      if (type === 'SERVICE') {
        document.title = siteTitle;
        return;
      }
    }

    const base = siteTitle;
    const title =
      titles[location.pathname] ||
      titles[Object.keys(titles).find((k) => location.pathname.startsWith(k))] ||
      base;

    document.title = title;
  }, [location]);

  return null;
}

export default function App() {
  useEffect(() => {
    cleanupExpiredTokens();
  }, []);

  return (
    <BrowserRouter>
      <RouteSessionPersistence />
      <GlobalRequestButtonLoading />
      <ToastBox />
      <ToastContainer
        position="top-center"
        autoClose={9000}
        hideProgressBar
        newestOnTop
        closeOnClick
        draggable={false}
        pauseOnHover
        style={{ top: 80, zIndex: 9999 }}
      />
      <Routes>
        {/* Nhóm các trang có Header & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="parts" element={<Navigate to="/services" replace />} />
          <Route path="services/:serviceId" element={<ServiceDetail />} />
          <Route path="about" element={<About />} />
          <Route path="customer-login" element={<CustomerLogin />} />
          <Route path="booking" element={<Booking />} />
          <Route path="user-profile" element={<UserProfile />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="booking-detail/:id" element={<BookingDetail />} />
          <Route path="edit-booking/:id" element={<EditBooking />} />
          <Route path="customer-dashboard" element={<CustomerDashboard />} />
        </Route>

        {/* Nhóm trang dashboard nhân viên dùng SideBar */}
        <Route element={<StaffLayout />}>
          <Route path="dashboard" element={<StaffDashboard />} />
          
          {/* Role-based Dashboards */}
          <Route path="admin-dashboard" element={<AdminDashboard />} />
          <Route path="manager-dashboard" element={<ManagerDashboard />} />
          <Route path="advisor-dashboard" element={<AdvisorDashboard />} />
          <Route path="receptionist-dashboard" element={<ReceptionistDashboard />} />
          <Route path="technician-dashboard" element={<TechnicianDashboard />} />
          <Route path="accountant-dashboard" element={<AccountantDashboard />} />
          
          {/* Work History pages */}
          <Route path="work-history/admin" element={<AdminWorkHistory />} />
          <Route path="work-history/manager" element={<ManagerWorkHistory />} />
          <Route path="work-history/advisor" element={<AdvisorWorkHistory />} />
          <Route path="work-history/receptionist" element={<ReceptionistWorkHistory />} />
          <Route path="work-history/technician" element={<TechnicianWorkHistory />} />
          <Route path="work-history/accountant" element={<AccountantWorkHistory />} />
          
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
          <Route path="technician-tasks" element={<TechnicianTasks />} />
          <Route path="service-ticket/:ticketCode" element={<ServiceTicketDetail />} />
          <Route path="service-ticket/:ticketCode/receipt-payment-method" element={<ReceiptPaymentMethod />} />
          <Route path="service-ticket/:ticketCode/accounting-invoice-print" element={<AccountingInvoicePrint />} />
          <Route path="service-ticket-detail/:ticketCode" element={<ServiceTicketDetail />} />
          <Route path="service-ticket-management" element={<ServiceTicketManagement />} />
          <Route path="part-management" element={<PartManagement />} />
          <Route path="part-management/blog/:itemId" element={<BlogFormPage itemType="PART" />} />
          <Route path="part-management/create-product" element={<CreateProduct />} />
          <Route path="service-management" element={<BlogManagement />} />
          <Route path="warehouse-stock-entries" element={<WarehouseStockEntryManagement />} />
          <Route path="warehouse-stock-entries/:entryId" element={<WarehouseStockEntryDetail />} />
          <Route path="warehouse-stock-entry" element={<WarehouseStockEntry />} />
          <Route path="warehouse-stock-issues" element={<WarehouseStockIssues />} />
          <Route path="warehouse-stock-issues/:issueId" element={<WarehouseStockIssueDetail />} />
          <Route path="warehouse-return-entry" element={<WarehouseReturnEntry />} />
          <Route path="warehouse-return-entries" element={<WarehouseReturnEntryManagement />} />
          <Route path="warehouse-return-entries/:returnId" element={<WarehouseReturnEntryDetail />} />
          <Route path="blog-management" element={<Navigate to="/service-management" replace />} />
          <Route path="service-management/blog/:itemId" element={<BlogFormPage itemType="SERVICE" />} />
          <Route path="service-management/create-service" element={<CreateService />} />
          <Route path="promotion-management" element={<PromotionManagement />} />
          <Route path="promotion-management/create" element={<PromotionManagement />} />
          <Route path="shift-management" element={<ShiftManagement />} />
          <Route path="queue-management" element={<QueueManagement />} />
          <Route path="create-booking" element={<CreatBooking />} />
          <Route path="customer-manager" element={<CustomerManager />} />
          <Route path="staff-manager" element={<StaffManagement />} />
          <Route path="employee-manager" element={<EmployeeManager />} />
          <Route path="employee-manager/:staffId" element={<EmployeeProfilePage />} />
          <Route path="staff-manager/:staffId" element={<StaffDetailPage />} />
          <Route path="announcement_campaign" element={<SendReminder />} />
          <Route path="staff-notification-sender" element={<StaffNotificationSender />} />
          <Route path="send-reminder" element={<Navigate to="/announcement_campaign" replace />} />
          <Route path="maintenance-reminders" element={<MaintenanceReminder />} />
          <Route path="feedback-management" element={<FeedbackManagement />} />
          <Route path="vehicle-management" element={<VehicleManagement />} />
          <Route path="system-log-management" element={<SystemLogManagement />} />
          <Route path="warehouse-management" element={<WarehouseManagement />} />
          <Route path="warehouse-pricing" element={<WarehousePricing />} />
          
          {/* Technician pages */}
          <Route path="technician/my-tasks" element={<MyTasks />} />
          <Route path="technician/safetyinspection-ticket/:id" element={<ServiceTicket />} />
          <Route path="technician/update-progress/:id" element={<UpdateProgress />} />


          {/* Advisor pages */}
          <Route
            path="advisor/inspection"
            element={(
              <AdvisorOnlyRoute>
                <AdvisorInspection />
              </AdvisorOnlyRoute>
            )}
          />
        </Route>

        <Route path="login" element={<Login />} />
        <Route path="vat-invoice" element={<VatInvoiceView />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Routes>
    </BrowserRouter>
  );
}
