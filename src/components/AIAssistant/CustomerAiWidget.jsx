import { Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCustomerAiAssistant } from '../../context/CustomerAiAssistantContext.jsx';
import AIAssistantPanel from './AIAssistantPanel.jsx';
import './aiAssistant.css';

/**
 * CustomerAiWidget - Trợ lý ảo cho khách hàng trên website công khai.
 * Panel trượt luôn được render ở đây (dùng chung cho mọi trang). Nút mở mặc định
 * (góc phải-dưới, trên nút BackToTop) cũng render ở đây — TRỪ trang chủ ("/"),
 * nơi khối "Kênh liên hệ" (Zalo/Gọi/Messenger, xem BussinessInfor.jsx) đã tự vẽ
 * một nút robot cùng hàng, dùng chung state qua CustomerAiAssistantContext.
 */
const CustomerAiWidget = () => {
  const aiState = useCustomerAiAssistant();
  const { pathname } = useLocation();
  const hasInlineTriggerOnThisPage = pathname === '/';

  return (
    <>
      {!aiState.isOpen && !hasInlineTriggerOnThisPage && (
        <button
          type="button"
          className="ai-assistant__launcher"
          onClick={aiState.openPanel}
          aria-label="Mở trợ lý ảo"
        >
          <Bot size={22} />
          <span className="ai-assistant__launcherLabel">Trợ lý ảo</span>
        </button>
      )}
      <AIAssistantPanel
        aiState={aiState}
        title="Trợ lý ảo Sơn Tây Garage"
        emptyText="Xin chào! Tôi là trợ lý ảo của Garage Michelin Sơn Tây. Bạn cần tư vấn dịch vụ hay hướng dẫn đặt lịch?"
        showTokenUsage={false}
      />
    </>
  );
};

export default CustomerAiWidget;
