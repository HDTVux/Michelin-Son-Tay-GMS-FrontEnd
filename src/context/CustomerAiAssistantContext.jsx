import { createContext, useContext } from 'react';
import useAIAssistant from '../hooks/useAIAssistant.js';

const CustomerAiAssistantContext = createContext(null);

/**
 * Provider bọc quanh MainLayout — tạo DUY NHẤT 1 instance useAIAssistant (public,
 * không đăng nhập) và chia sẻ cho mọi nơi cần hiển thị nút mở trợ lý ảo:
 * - CustomerAiWidget (nút mặc định, các trang không có khối "Kênh liên hệ")
 * - BussinessInfor (nút tích hợp cùng hàng với Zalo/Gọi/Messenger, chỉ ở trang chủ)
 * Nhờ dùng chung 1 instance nên panel/lịch sử chat là một, dù mở từ nút nào.
 */
export const CustomerAiAssistantProvider = ({ children }) => {
  const aiState = useAIAssistant({ enabled: true, mock: false, isPublic: true });
  return (
    <CustomerAiAssistantContext.Provider value={aiState}>
      {children}
    </CustomerAiAssistantContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook và provider dùng chung 1 context, tách file là thừa cho một cặp nhỏ như thế này
export const useCustomerAiAssistant = () => {
  const ctx = useContext(CustomerAiAssistantContext);
  if (!ctx) {
    throw new Error('useCustomerAiAssistant must be used within CustomerAiAssistantProvider');
  }
  return ctx;
};
