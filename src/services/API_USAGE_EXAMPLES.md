# API Usage Examples

## 📚 Hướng dẫn sử dụng các API Services

### 1. Staff Attendance API

#### Lấy lịch sử chấm công của nhân viên

```javascript
import { fetchStaffAttendance } from '../services/staffService';

// Trong component
const loadAttendance = async () => {
  try {
    const token = localStorage.getItem('staffToken');
    const staffId = '123'; // Lấy từ user profile hoặc context
    
    const response = await fetchStaffAttendance(staffId, token);
    
    if (response.success) {
      const attendanceList = response.data;
      console.log('Attendance records:', attendanceList);
      // attendanceList là array của StaffAttendanceRes
      // Mỗi record có thể chứa: date, checkIn, checkOut, status, etc.
    }
  } catch (error) {
    console.error('Error loading attendance:', error);
    alert('Không thể tải lịch sử chấm công');
  }
};
```

#### Sử dụng trong StaffProfile component

```javascript
// StaffProfile.jsx
import { fetchStaffAttendance } from '../../services/staffService';

const StaffProfile = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('staffToken');
      const staffId = localStorage.getItem('staffId');
      
      try {
        const response = await fetchStaffAttendance(staffId, token);
        if (response.success) {
          setAttendanceHistory(response.data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    loadData();
  }, []);
  
  return (
    <div>
      <h3>Lịch sử chấm công</h3>
      {attendanceHistory.map((record, index) => (
        <div key={index}>
          <p>Ngày: {record.date}</p>
          <p>Giờ vào: {record.checkIn}</p>
          <p>Giờ ra: {record.checkOut}</p>
        </div>
      ))}
    </div>
  );
};
```

---

### 2. Customer Auth APIs (Setup PIN & Logout)

#### Setup PIN cho customer mới

```javascript
import { setupCustomerPin } from '../services/authService';

const SetupPinPage = () => {
  const [formData, setFormData] = useState({
    phone: '',
    pin: '',
    confirmPin: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.pin !== formData.confirmPin) {
      alert('PIN không khớp');
      return;
    }
    
    try {
      const response = await setupCustomerPin(formData);
      
      if (response.success) {
        alert('Thiết lập PIN thành công! Vui lòng đăng nhập.');
        // Redirect to login page
        navigate('/login');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Không thể thiết lập PIN');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="tel" 
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        placeholder="Số điện thoại"
      />
      <input 
        type="password" 
        value={formData.pin}
        onChange={(e) => setFormData({...formData, pin: e.target.value})}
        placeholder="Nhập PIN (6 số)"
        maxLength={6}
      />
      <input 
        type="password" 
        value={formData.confirmPin}
        onChange={(e) => setFormData({...formData, confirmPin: e.target.value})}
        placeholder="Xác nhận PIN"
        maxLength={6}
      />
      <button type="submit">Thiết lập PIN</button>
    </form>
  );
};
```

#### Logout customer

```javascript
import { logoutCustomer } from '../services/authService';

const handleLogout = async () => {
  try {
    const response = await logoutCustomer();
    
    if (response.success) {
      // Clear local storage
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerId');
      
      // Redirect to home
      navigate('/');
      
      alert('Đăng xuất thành công');
    }
  } catch (error) {
    console.error('Error:', error);
    // Vẫn clear local storage dù API fail
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerId');
    navigate('/');
  }
};
```

---

### 3. OAuth2 Google Login (Staff)

#### Cách 1: Redirect trực tiếp

```javascript
import { redirectToGoogleLogin } from '../services/authService';

const StaffLoginPage = () => {
  return (
    <div>
      <h2>Đăng nhập nhân viên</h2>
      
      {/* Login với phone/PIN */}
      <form onSubmit={handlePhoneLogin}>
        {/* ... form fields ... */}
      </form>
      
      <div className="divider">HOẶC</div>
      
      {/* Login với Google */}
      <button onClick={redirectToGoogleLogin}>
        🔵 Đăng nhập với Google
      </button>
    </div>
  );
};
```

#### Cách 2: Sử dụng link

```javascript
import { getStaffGoogleOAuthUrl } from '../services/authService';

const StaffLoginPage = () => {
  const googleOAuthUrl = getStaffGoogleOAuthUrl();
  
  return (
    <div>
      <h2>Đăng nhập nhân viên</h2>
      
      <a href={googleOAuthUrl} className="google-login-button">
        🔵 Đăng nhập với Google
      </a>
    </div>
  );
};
```

#### Xử lý OAuth2 Callback

```javascript
// OAuth2CallbackPage.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOAuth2Callback } from '../services/authService';

const OAuth2CallbackPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Lấy token từ URL params hoặc hash
    const token = handleOAuth2Callback();
    
    if (token) {
      // Lưu token vào localStorage
      localStorage.setItem('staffToken', token);
      
      // TODO: Có thể gọi API để lấy thông tin staff
      // const staffInfo = await fetchStaffProfile(token);
      // localStorage.setItem('staffId', staffInfo.data.staffId);
      
      // Redirect đến dashboard
      navigate('/staff/dashboard');
    } else {
      // Không tìm thấy token, redirect về login
      alert('Đăng nhập thất bại');
      navigate('/staff/login');
    }
  }, [navigate]);
  
  return (
    <div>
      <p>Đang xử lý đăng nhập...</p>
    </div>
  );
};

export default OAuth2CallbackPage;
```

#### Cấu hình Route cho OAuth2 Callback

```javascript
// App.jsx
import OAuth2CallbackPage from './pages/OAuth2CallbackPage';

function App() {
  return (
    <Routes>
      {/* ... other routes ... */}
      
      {/* OAuth2 callback route */}
      <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />
      
      {/* Staff routes */}
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff/dashboard" element={<StaffDashboard />} />
    </Routes>
  );
}
```

---

### 4. Complete Flow Examples

#### Flow 1: Customer Registration với OTP và Setup PIN

```javascript
// Step 1: Check phone status
const response1 = await checkCustomerStatus(phone);

if (response1.data.status === 'UNVERIFIED') {
  // Step 2: Request OTP
  await requestCustomerOtp(phone);
  
  // Step 3: User nhập OTP, verify
  const response2 = await verifyCustomerOtp(phone, otp);
  
  if (response2.success) {
    // Step 4: Setup PIN
    await setupCustomerPin({ phone, pin, confirmPin });
    
    // Step 5: Login
    const response3 = await loginCustomer(phone, pin);
    localStorage.setItem('customerToken', response3.data.token);
  }
}
```

#### Flow 2: Staff Login với Google OAuth2

```javascript
// Page 1: Staff Login
<button onClick={() => redirectToGoogleLogin()}>
  Login with Google
</button>



// Page 3: OAuth2CallbackPage
const token = handleOAuth2Callback();
localStorage.setItem('staffToken', token);
navigate('/staff/dashboard');
```



### 5. Error Handling Best Practices

```javascript
const loadData = async () => {
  try {
    const token = localStorage.getItem('staffToken');
    
    if (!token) {
      throw new Error('Vui lòng đăng nhập');
    }
    
    const response = await fetchStaffAttendance(staffId, token);
    
    if (response.success) {
      setData(response.data);
    } else {
      throw new Error(response.message || 'Có lỗi xảy ra');
    }
  } catch (error) {
    console.error('Error:', error);
    
    // Xử lý các loại lỗi khác nhau
    if (error.status === 401) {
      alert('Phiên đăng nhập hết hạn');
      localStorage.removeItem('staffToken');
      navigate('/staff/login');
    } else if (error.status === 403) {
      alert('Bạn không có quyền truy cập');
    } else {
      alert(error.message || 'Không thể tải dữ liệu');
    }
  }
};



