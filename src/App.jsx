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
import RevenueManagement from './pages/DashBoard/RevenueManagement/RevenueManagement.jsx';

//Customer pages
import CustomerLogin from './features/auth/components/CustomerLoginModal.jsx';
import UserProfile from './pages/UserProfile/UserProfile.jsx';
import MyBookings from './pages/MyBookings/MyBookings.jsx';
import BookingDetail from './pages/BookingDetail/BookingDetail.jsx';
import CustomerDashboard from './pages/CustomerDashboard/CustomerDashboard.jsx';
import NotFound from './pages/NotFound/NotFound.jsx';
import EditBooking from './pages/EditBooking/EditBooking.jsx';

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
  MANAGER: 'MANAGER',
  ADVISOR: 'ADVISOR',
  RECEPTIONIST: 'RECEPTIONIST',
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
  ACCOUNTANT: 'ACCOUNTANT',
};

const ROLE_GROUP = {
  ADMIN_ONLY: [STAFF_ROLE.ADMIN],
  MANAGER_OR_ADMIN: [STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN],
  RECEPTIONIST: [STAFF_ROLE.RECEPTIONIST],
  RECEPTIONIST_OR_ADMIN: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ADMIN],
  RECEPTIONIST_MANAGER_ADMIN: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN],
  MARKETING: [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.MANAGER],
  ADVISOR: [STAFF_ROLE.ADVISOR],
  TECHNICIAN: [STAFF_ROLE.TECHNICIAN],
  ACCOUNTANT: [STAFF_ROLE.ACCOUNTANT],
  ACCOUNTING: [STAFF_ROLE.ACCOUNTANT, STAFF_ROLE.MANAGER, STAFF_ROLE.ADMIN],
  WAREHOUSE: [STAFF_ROLE.MANAGER, STAFF_ROLE.WAREHOUSE_KEEPER],
  SERVICE_TICKET: [
    STAFF_ROLE.RECEPTIONIST,
    STAFF_ROLE.ADVISOR,
    STAFF_ROLE.ACCOUNTANT,
    STAFF_ROLE.MANAGER,
    STAFF_ROLE.ADMIN,
  ],
  SERVICE_CATALOG: [STAFF_ROLE.MANAGER, STAFF_ROLE.ACCOUNTANT],
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

const getStaffTokenForRouting = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';

const clearStaffSessionForRouting = () => {
  ['authToken', 'staffToken', 'adminToken', 'staffRoles', 'staffProfile'].forEach((key) => {
    localStorage.removeItem(key);
  });
};

const hasAnyRole = (allowedRoles, staffRoles) => {
  if (allowedRoles === 'ALL') return true;
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;

  const roleSet = new Set(
    (Array.isArray(staffRoles) ? staffRoles : [])
      .map((role) => normalizeRoleName(role))
      .filter(Boolean),
  );

  return allowedRoles.some((role) => roleSet.has(normalizeRoleName(role)));
};

function StaffAreaRoute({ children }) {
  const location = useLocation();
  const hasToken = Boolean(getStaffTokenForRouting());

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function StaffLoginRedirect({ clearSession = false }) {
  const location = useLocation();
  if (clearSession) clearStaffSessionForRouting();
  return <Navigate to="/login" replace state={{ from: location }} />;
}

function AuthorizedStaffRoute({ allowedRoles = 'ALL', children }) {
  const location = useLocation();
  const hasToken = Boolean(getStaffTokenForRouting());
  const staffRoles = readStaffRolesForRouting();

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return hasAnyRole(allowedRoles, staffRoles) ? children : <StaffLoginRedirect clearSession />;
}

function AdvisorOnlyRoute({ children }) {
  const staffRoles = readStaffRolesForRouting();
  const isAdvisor = staffRoles.includes(STAFF_ROLE.ADVISOR);
  return isAdvisor ? children : <StaffLoginRedirect clearSession />;
}

function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0e1118', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p>Đang chuyển hướng đến trang đăng nhập nhân viên...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
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

const isStaffSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('staff.') || hostname.startsWith('admin.');
};

export default function App() {
  useEffect(() => {
    cleanupExpiredTokens();
  }, []);

  const staffRoute = (element, allowedRoles = 'ALL') => (
    <AuthorizedStaffRoute allowedRoles={allowedRoles}>
      {element}
    </AuthorizedStaffRoute>
  );

  const isStaffSite = isStaffSubdomain();

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
        {isStaffSite ? (
          // LUỒNG ROUTES CHO NHÂN VIÊN (SUBDOMAIN)
          <>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            
            {/* Nhóm trang dashboard nhân viên dùng SideBar */}
            <Route element={<StaffAreaRoute><StaffLayout /></StaffAreaRoute>}>
              <Route path="dashboard" element={staffRoute(<StaffDashboard />)} />
              
              {/* Role-based Dashboards */}
              <Route path="admin-dashboard" element={staffRoute(<AdminDashboard />, ROLE_GROUP.ADMIN_ONLY)} />
              <Route path="manager-dashboard" element={staffRoute(<ManagerDashboard />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="advisor-dashboard" element={staffRoute(<AdvisorDashboard />, ROLE_GROUP.ADVISOR)} />
              <Route path="receptionist-dashboard" element={staffRoute(<ReceptionistDashboard />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="technician-dashboard" element={staffRoute(<TechnicianDashboard />, ROLE_GROUP.TECHNICIAN)} />
              <Route path="accountant-dashboard" element={staffRoute(<AccountantDashboard />, ROLE_GROUP.ACCOUNTANT)} />
              
              {/* Work History pages */}
              <Route path="work-history/admin" element={staffRoute(<AdminWorkHistory />, ROLE_GROUP.ADMIN_ONLY)} />
              <Route path="work-history/manager" element={staffRoute(<ManagerWorkHistory />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="work-history/advisor" element={staffRoute(<AdvisorWorkHistory />, ROLE_GROUP.ADVISOR)} />
              <Route path="work-history/receptionist" element={staffRoute(<ReceptionistWorkHistory />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="work-history/technician" element={staffRoute(<TechnicianWorkHistory />, ROLE_GROUP.TECHNICIAN)} />
              <Route path="work-history/accountant" element={staffRoute(<AccountantWorkHistory />, ROLE_GROUP.ACCOUNTANT)} />
              
              <Route path="booking-request-management" element={staffRoute(<BookingManagement />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="booking-management" element={staffRoute(<ConfirmedBookingManagement />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="booking-management/:id" element={staffRoute(<ConfirmedBookingDetail />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="booking-request-management/:id" element={staffRoute(<BookingRequestDetail />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="booking-request-management/:id/edit" element={staffRoute(<BookingRequestEdit />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="staff-profile" element={staffRoute(<StaffProfile />)} />
              <Route path="update-staff-profile" element={staffRoute(<UpdateStaffProfile />)} />
              <Route path="staff-change-password" element={staffRoute(<StaffChangePassword />)} />
              <Route path="staff-manage-sso" element={staffRoute(<StaffManageSSO />)} />
              <Route path="check-in" element={staffRoute(<CheckIn />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="daily-schedule" element={staffRoute(<DailySchedule />)} />
              <Route path="customer-profile/:customerId" element={staffRoute(<EditCustomerProfile />, ROLE_GROUP.RECEPTIONIST_OR_ADMIN)} />
              <Route path="staff-attendance" element={staffRoute(<StaffAttendance />)} />
              <Route path="technician-tasks" element={staffRoute(<TechnicianTasks />, ROLE_GROUP.TECHNICIAN)} />
              <Route path="service-ticket/:ticketCode" element={staffRoute(<ServiceTicketDetail />, ROLE_GROUP.SERVICE_TICKET)} />
              <Route path="service-ticket/:ticketCode/receipt-payment-method" element={staffRoute(<ReceiptPaymentMethod />, ROLE_GROUP.ACCOUNTING)} />
              <Route path="service-ticket/:ticketCode/accounting-invoice-print" element={staffRoute(<AccountingInvoicePrint />, ROLE_GROUP.ACCOUNTING)} />
              <Route path="service-ticket-detail/:ticketCode" element={staffRoute(<ServiceTicketDetail />, ROLE_GROUP.SERVICE_TICKET)} />
              <Route path="service-ticket-management" element={staffRoute(<ServiceTicketManagement />, [STAFF_ROLE.RECEPTIONIST, STAFF_ROLE.ACCOUNTANT])} />
              <Route path="part-management" element={staffRoute(<PartManagement />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="part-management/blog/:itemId" element={staffRoute(<BlogFormPage itemType="PART" />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="part-management/create-product" element={staffRoute(<CreateProduct />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="service-management" element={staffRoute(<BlogManagement />, ROLE_GROUP.SERVICE_CATALOG)} />
              <Route path="warehouse-stock-entries" element={staffRoute(<WarehouseStockEntryManagement />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-stock-entries/:entryId" element={staffRoute(<WarehouseStockEntryDetail />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-stock-entry" element={staffRoute(<WarehouseStockEntry />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-stock-issues" element={staffRoute(<WarehouseStockIssues />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-stock-issues/:issueId" element={staffRoute(<WarehouseStockIssueDetail />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-return-entry" element={staffRoute(<WarehouseReturnEntry />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-return-entries" element={staffRoute(<WarehouseReturnEntryManagement />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-return-entries/:returnId" element={staffRoute(<WarehouseReturnEntryDetail />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="blog-management" element={<Navigate to="/service-management" replace />} />
              <Route path="service-management/blog/:itemId" element={staffRoute(<BlogFormPage itemType="SERVICE" />, ROLE_GROUP.SERVICE_CATALOG)} />
              <Route path="service-management/create-service" element={staffRoute(<CreateService />, ROLE_GROUP.SERVICE_CATALOG)} />
              <Route path="promotion-management" element={staffRoute(<PromotionManagement />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="promotion-management/create" element={staffRoute(<PromotionManagement />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="shift-management" element={staffRoute(<ShiftManagement />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="queue-management" element={staffRoute(<QueueManagement />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="create-booking" element={staffRoute(<CreatBooking />, ROLE_GROUP.RECEPTIONIST)} />
              <Route path="customer-manager" element={staffRoute(<CustomerManager />, ROLE_GROUP.RECEPTIONIST_OR_ADMIN)} />
              <Route path="staff-manager" element={staffRoute(<StaffManagement />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="employee-manager" element={staffRoute(<EmployeeManager />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="employee-manager/:staffId" element={staffRoute(<EmployeeProfilePage />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="staff-manager/:staffId" element={staffRoute(<StaffDetailPage />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="announcement_campaign" element={staffRoute(<SendReminder />, ROLE_GROUP.MARKETING)} />
              <Route path="staff-notification-sender" element={staffRoute(<StaffNotificationSender />, ROLE_GROUP.RECEPTIONIST_MANAGER_ADMIN)} />
              <Route path="send-reminder" element={<Navigate to="/announcement_campaign" replace />} />
              <Route path="maintenance-reminders" element={staffRoute(<MaintenanceReminder />, ROLE_GROUP.MARKETING)} />
              <Route path="feedback-management" element={staffRoute(<FeedbackManagement />, ROLE_GROUP.MANAGER_OR_ADMIN)} />
              <Route path="vehicle-management" element={staffRoute(<VehicleManagement />, ROLE_GROUP.RECEPTIONIST_OR_ADMIN)} />
              <Route path="system-log-management" element={staffRoute(<SystemLogManagement />, ROLE_GROUP.ADMIN_ONLY)} />
              <Route path="warehouse-management" element={staffRoute(<WarehouseManagement />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="warehouse-pricing" element={staffRoute(<WarehousePricing />, ROLE_GROUP.WAREHOUSE)} />
              <Route path="revenue-management" element={staffRoute(<RevenueManagement />, ROLE_GROUP.ACCOUNTING)} />
              
              {/* Technician pages */}
              <Route path="technician/my-tasks" element={staffRoute(<MyTasks />, ROLE_GROUP.TECHNICIAN)} />
              <Route path="technician/safetyinspection-ticket/:id" element={staffRoute(<ServiceTicket />, ROLE_GROUP.TECHNICIAN)} />
              <Route path="technician/update-progress/:id" element={staffRoute(<UpdateProgress />, ROLE_GROUP.TECHNICIAN)} />

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
            <Route path="*" element={<NotFound />} />
          </>
        ) : (
          // LUỒNG ROUTES CHO KHÁCH HÀNG (TÊN MIỀN CHÍNH)
          <>
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

            {/* Các route phụ trợ khác */}
            <Route path="vat-invoice" element={<VatInvoiceView />} />
            <Route path="login" element={<ExternalRedirect to="https://staff.sontaygarage.vn/login" />} />
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
