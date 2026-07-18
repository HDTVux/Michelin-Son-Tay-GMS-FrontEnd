import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import './aiAssistant.css';

const parseMarkdownToJsx = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const result = [];
  let inList = false;
  let listItems = [];

  const renderTextWithFormatting = (str) => {
    const parts = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  };

  const flushList = (key) => {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${key}`} className="ai-assistant__list">
          {listItems.map((item, index) => (
            <li key={`li-${key}-${index}`}>{renderTextWithFormatting(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList(i);
      result.push(<h3 key={`h3-${i}`} className="ai-assistant__h3">{renderTextWithFormatting(trimmed.substring(4).trim())}</h3>);
    } else if (trimmed.startsWith('## ')) {
      flushList(i);
      result.push(<h2 key={`h2-${i}`} className="ai-assistant__h2">{renderTextWithFormatting(trimmed.substring(3).trim())}</h2>);
    } else if (trimmed.startsWith('# ')) {
      flushList(i);
      result.push(<h1 key={`h1-${i}`} className="ai-assistant__h1">{renderTextWithFormatting(trimmed.substring(2).trim())}</h1>);
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(trimmed.substring(2).trim());
    } else if (!trimmed) {
      flushList(i);
    } else {
      flushList(i);
      result.push(<p key={`p-${i}`} className="ai-assistant__paragraph">{renderTextWithFormatting(line)}</p>);
    }
  }

  flushList(lines.length);
  return result;
};


const AIAssistantPanel = ({ aiState }) => {
  const { isOpen, messages, isSending, closePanel, sendMessage } = aiState;
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const [width, setWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

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

  const handleMouseMove = (e) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = window.innerWidth - 60;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchMove = (e) => {
    if (!isResizingRef.current) return;
    const clientX = e.touches[0].clientX;
    const newWidth = window.innerWidth - clientX;
    const minWidth = 300;
    const maxWidth = window.innerWidth - 60;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  };

  const handleTouchEnd = () => {
    setIsResizing(false);
    isResizingRef.current = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  const handleTouchStart = (e) => {
    setIsResizing(true);
    isResizingRef.current = true;
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <>
      {isOpen && <div className="ai-assistant__overlay" onClick={closePanel} />}
      <aside 
        className={`ai-assistant__panel ${isOpen ? 'is-open' : ''} ${isResizing ? 'is-resizing' : ''}`}
        style={{ width: `${width}px` }}
        data-gms-no-global-loading="true"
      >
        <div
          className="ai-assistant__resize-handle"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
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
                {parseMarkdownToJsx(m.text)}
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
