import { useCustomerAiAssistant } from '../../context/CustomerAiAssistantContext.jsx';
import AIAssistantPanel from './AIAssistantPanel.jsx';
import './aiAssistant.css';

/**
 * CustomerAiWidget - Trợ lý ảo cho khách hàng trên website công khai.
 * Panel trượt được render ở đây. Nút bấm mở (kích hoạt) được quản lý tập trung 
 * bên trong cụm "Kênh liên hệ" toàn cục ở MainLayout để tránh trùng lặp 2 nút AI.
 */
const CustomerAiWidget = () => {
  const aiState = useCustomerAiAssistant();

  return (
    <AIAssistantPanel
      aiState={aiState}
      title="Trợ lý ảo Sơn Tây Garage"
      emptyText="Xin chào! Tôi là trợ lý ảo của Garage Michelin Sơn Tây. Bạn cần tư vấn dịch vụ hay hướng dẫn đặt lịch?"
      showTokenUsage={false}
    />
  );
};

export default CustomerAiWidget;
