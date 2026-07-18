import ChatWindow from './ChatWindow.jsx';
import './chatWidget.css';

/**
 * Container cố định góc dưới bên phải, xếp các cửa sổ chat đang mở
 * kiểu "chat heads" của Facebook Messenger. Sống ở root StaffLayout nên nổi trên mọi trang.
 */
const ChatWindowDock = ({ chatState }) => {
  if (!chatState.openWindows || chatState.openWindows.length === 0) return null;

  return (
    <div className="chat-widget__dock" data-gms-no-global-loading="true">
      {chatState.openWindows.map((win) => (
        <ChatWindow key={win.conversationId} window={win} chatState={chatState} />
      ))}
    </div>
  );
};

export default ChatWindowDock;
