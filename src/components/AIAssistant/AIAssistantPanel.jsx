import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import './aiAssistant.css';

const AIAssistantPanel = ({ aiState }) => {
  const { isOpen, messages, isSending, closePanel, sendMessage } = aiState;
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isSending) return;
    sendMessage(text);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && <div className="ai-assistant__overlay" onClick={closePanel} />}
      <aside className={`ai-assistant__panel ${isOpen ? 'is-open' : ''}`} data-gms-no-global-loading="true">
        <header className="ai-assistant__header">
          <div className="ai-assistant__headerTitle">
            <Sparkles size={18} />
            <span>Trợ lý AI</span>
          </div>
          <button
            type="button"
            className="ai-assistant__iconBtn"
            onClick={closePanel}
            aria-label="Đóng trợ lý AI"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ai-assistant__body" ref={listRef}>
          {messages.length === 0 ? (
            <div className="ai-assistant__empty">
              <Sparkles size={28} />
              <p>Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`ai-assistant__bubble ${m.role === 'user' ? 'is-user' : 'is-ai'} ${m.isError ? 'is-error' : ''}`}
              >
                {m.text}
              </div>
            ))
          )}
          {isSending && (
            <div className="ai-assistant__bubble is-ai is-typing">
              <span className="ai-assistant__dot" />
              <span className="ai-assistant__dot" />
              <span className="ai-assistant__dot" />
            </div>
          )}
        </div>

        <footer className="ai-assistant__composer">
          <textarea
            className="ai-assistant__textarea"
            placeholder="Nhập câu hỏi..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            type="button"
            className="ai-assistant__sendBtn"
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            aria-label="Gửi"
          >
            <Send size={16} />
          </button>
        </footer>
      </aside>
    </>
  );
};

export default AIAssistantPanel;
