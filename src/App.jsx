import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Homepage/MainLayout.jsx';
import Home from './components/Homepage/Home.jsx';
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nhóm các trang có Header & Footer */}
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          {/* Thêm các trang có header/footer ở đây (relative paths) */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}