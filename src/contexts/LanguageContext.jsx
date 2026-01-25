import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations = {
  vi: {
    header: {
      home: 'Trang chủ',
      services: 'Dịch vụ',
      about: 'Về chúng tôi',
      login: 'Đăng nhập',
      register: 'Đăng ký'
    },
    home: {
      title: 'Giới thiệu về',
      subtitle: 'Michellin Sơn Tây',
      services: {
        0: 'Michelin sơn tây là địa chỉ lốp uy tín ở sơn tây.',
        1: 'Là đại lý duy nhất. Chuyên cung cấp lốp dầu ắc quy chính hãng.',
        2: 'Sửa chữa ôtô cứu hộ 24/7',
        3: 'Sơn- Gò- Hàn.',
        4: 'Chăm sóc làm đẹp xe từ A-Z.'
      },
      bookNow: 'Đặt lịch ngay',
      viewServices: 'Xem dịch vụ'
    },
    login: {
      title: 'Chào mừng trở lại',
      subtitle: 'Welcome Back',
      noAccount: 'Chưa có tài khoản?',
      register: 'Đăng ký',
      forgotPassword: 'Quên mật khẩu?',
      forgot: 'Quên',
      loginButton: 'Đăng nhập',
      loggingIn: 'Đang đăng nhập...',
      orLoginWith: 'Hoặc đăng nhập bằng',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Nhập mật khẩu',
      emailRequired: 'Email là bắt buộc',
      emailInvalid: 'Email không hợp lệ',
      passwordRequired: 'Mật khẩu là bắt buộc',
      passwordMinLength: 'Mật khẩu phải có ít nhất 6 ký tự'
    },
    register: {
      title: 'Xin chào',
      subtitle: 'Hi there',
      haveAccount: 'Đã có tài khoản?',
      login: 'Đăng nhập',
      registerButton: 'Đăng ký',
      registering: 'Đang đăng ký...',
      namePlaceholder: 'Tên',
      phonePlaceholder: 'Số điện thoại',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Nhập mật khẩu',
      repasswordPlaceholder: 'Nhập lại mật khẩu',
      nameRequired: 'Tên là bắt buộc',
      phoneRequired: 'Số điện thoại là bắt buộc',
      phoneInvalid: 'Số điện thoại không hợp lệ',
      emailRequired: 'Email là bắt buộc',
      emailInvalid: 'Email không hợp lệ',
      passwordRequired: 'Mật khẩu là bắt buộc',
      passwordMinLength: 'Mật khẩu phải có ít nhất 6 ký tự',
      repasswordRequired: 'Vui lòng xác nhận mật khẩu',
      passwordMismatch: 'Mật khẩu không khớp',
      passwordWeak: 'Yếu',
      passwordMedium: 'Trung bình',
      passwordStrong: 'Mạnh'
    },
    footer: {
      description: 'Địa chỉ lốp uy tín tại Sơn Tây. Chuyên cung cấp lốp, dầu, ắc quy chính hãng và dịch vụ chăm sóc xe toàn diện.',
      contact: 'Liên hệ',
      address: 'Sơn Tây, Hà Nội',
      phone: 'Hotline: 0123 456 789',
      email: 'info@michellinsonay.com',
      services: 'Dịch vụ',
      info: 'Thông tin',
      copyright: 'Bản quyền @ 2026 Michelin Sơn Tây'
    }
  },
  en: {
    header: {
      home: 'Home',
      services: 'Services',
      about: 'About',
      login: 'Login',
      register: 'Register'
    },
    home: {
      title: 'About',
      subtitle: 'Michellin Son Tay',
      services: {
        0: 'Michelin Son Tay is a reputable tire address in Son Tay.',
        1: 'The sole agent. Specializing in providing genuine tires, oil, and batteries.',
        2: '24/7 car repair and rescue',
        3: 'Painting - Bodywork - Welding.',
        4: 'Car care and beauty from A-Z.'
      },
      bookNow: 'Book now',
      viewServices: 'View services'
    },
    login: {
      title: 'Welcome Back',
      subtitle: 'Welcome Back',
      noAccount: "Haven't had an account yet?",
      register: 'Register',
      forgotPassword: 'You forgot your password?',
      forgot: 'Forgot',
      loginButton: 'Login',
      loggingIn: 'Logging in...',
      orLoginWith: 'Or login with',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Enter your password',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email',
      passwordRequired: 'Password is required',
      passwordMinLength: 'Password must be at least 6 characters'
    },
    register: {
      title: 'Hi there',
      subtitle: 'Hi there',
      haveAccount: 'You had an account?',
      login: 'Login',
      registerButton: 'Register',
      registering: 'Registering...',
      namePlaceholder: 'Name',
      phonePlaceholder: 'Phone Number',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Enter your password',
      repasswordPlaceholder: 'Re enter your password',
      nameRequired: 'Name is required',
      phoneRequired: 'Phone number is required',
      phoneInvalid: 'Invalid phone number',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email',
      passwordRequired: 'Password is required',
      passwordMinLength: 'Password must be at least 6 characters',
      repasswordRequired: 'Please confirm password',
      passwordMismatch: 'Passwords do not match',
      passwordWeak: 'Weak',
      passwordMedium: 'Medium',
      passwordStrong: 'Strong'
    },
    footer: {
      description: 'Reputable tire address in Son Tay. Specializing in providing genuine tires, oil, batteries and comprehensive car care services.',
      contact: 'Contact',
      address: 'Son Tay, Hanoi',
      phone: 'Hotline: 0123 456 789',
      email: 'info@michellinsonay.com',
      services: 'Services',
      info: 'Information',
      copyright: 'Bản quyền (c) 2026 Michelin Sơn Tây'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'vi';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'vi' ? 'en' : 'vi');
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
