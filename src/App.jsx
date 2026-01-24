import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import MainLayout from './components/Homepage/MainLayout.jsx';
import Home from './components/Homepage/Home.jsx';
import Login from './components/Login/Login.jsx';
import CustomerLogin from './components/Login/CustomerLogin.jsx';
import Register from './components/Register/Register.jsx';
import Services from './components/Homepage/Services/Services.jsx';
import About from './components/About/About.jsx';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* Nhóm các trang có Header & Footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="about" element={<About />} />
            <Route path="login" element={<Login />} />
            <Route path="customer-login" element={<CustomerLogin />} />
            <Route path="register" element={<Register />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}