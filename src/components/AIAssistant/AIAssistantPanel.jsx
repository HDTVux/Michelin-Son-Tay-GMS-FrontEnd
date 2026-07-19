import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import './aiAssistant.css';

const parseMarkdownToJsx = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const result = [];
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


// Rút gọn số lớn cho gọn UI: 12345 -> "12.3K", 1200000 -> "1.2M".
const formatCompactNumber = (n) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

// Tách theo từng "từ + khoảng trắng theo sau" để reveal dần từng cụm — không tách riêng
// khoảng trắng thành 1 bước (sẽ gây khựng vô nghĩa giữa các từ).
const splitIntoRevealChunks = (text) => text.match(/\S+\s*/g) || (text ? [text] : []);

const AIAssistantPanel = ({
  aiState,
  title = 'Trợ lý AI',
  emptyText = 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
  showTokenUsage = true,
}) => {
  const { isOpen, messages, isSending, closePanel, sendMessage, quota } = aiState;
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const [width, setWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  // ==== Hiệu ứng "generative" (chữ hiện dần) cho tin nhắn AI mới nhất ====
  // Backend không stream thật (Gemini trả về nguyên văn), nên hiệu ứng này giả lập
  // client-side: cắt câu trả lời thành các cụm từ rồi hiện dần từng cụm, đồng thời
  // (chỉ khi có usage.totalTokens — tức staff) tính số token hiển thị theo tỉ lệ số
  // cụm đã hiện, tạo cảm giác token đang tăng dần theo văn bản như đang được sinh ra.
  const [revealChunks, setRevealChunks] = useState(null); // { id, chunks, totalTokens }
  const [revealCount, setRevealCount] = useState(0);
  // "Tin nhắn cuối cùng đã bắt đầu reveal" lưu ở state (không dùng ref) vì được ĐỌC
  // ngay trong lúc render — theo đúng pattern React khuyến nghị cho việc reset state
  // khi một giá trị đổi ("Adjusting state when a prop changes" trong docs React).
  // Khởi tạo bằng id tin nhắn cuối CÓ SẴN lúc mount (lịch sử load từ localStorage) —
  // nếu không, mỗi lần mở lại panel/tải lại trang sẽ tưởng lịch sử cũ là tin nhắn mới
  // và chạy lại hiệu ứng reveal cho nó, dù người dùng không vừa gửi gì cả.
  const [lastSeenMessageId, setLastSeenMessageId] = useState(() => messages[messages.length - 1]?.id ?? null);

  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role !== 'user' && !lastMessage.isError && lastMessage.id !== lastSeenMessageId) {
    setLastSeenMessageId(lastMessage.id);
    setRevealChunks({
      id: lastMessage.id,
      chunks: splitIntoRevealChunks(lastMessage.text),
      totalTokens: lastMessage.usage?.totalTokens ?? null,
    });
    setRevealCount(0);
  }

  useEffect(() => {
    if (!revealChunks || revealCount >= revealChunks.chunks.length) return undefined;
    // Câu dài thì hiện nhiều cụm/nhịp hơn để tổng thời gian animation không quá lâu.
    const step = revealChunks.chunks.length > 150 ? 4 : revealChunks.chunks.length > 80 ? 2 : 1;
    const delay = 16 + Math.random() * 18;
    const timer = setTimeout(() => setRevealCount((c) => Math.min(c + step, revealChunks.chunks.length)), delay);
    return () => clearTimeout(timer);
  }, [revealChunks, revealCount]);

  const isRevealingMessage = (id) => revealChunks?.id === id && revealCount < revealChunks.chunks.length;

  const getDisplayText = (m) =>
    revealChunks?.id === m.id ? revealChunks.chunks.slice(0, revealCount).join('') : m.text;

  const getDisplayTokens = (m) => {
    if (m.usage?.totalTokens == null) return null;
    if (revealChunks?.id === m.id && revealChunks.chunks.length > 0) {
      return Math.round(m.usage.totalTokens * (revealCount / revealChunks.chunks.length));
    }
    return m.usage.totalTokens;
  };

  // ==== Counter token ước lượng, tăng dần khi đang chờ Gemini trả lời (chưa có text) ====
  // Đây là số GIẢ LẬP (client tự đếm để tạo cảm giác đang xử lý) vì lúc này chưa có
  // response nên chưa thể biết số token thật — số thật chỉ xuất hiện sau khi có usage
  // ở trên. Chỉ hiện cho staff (showTokenUsage) để không gây hiểu nhầm với khách hàng.
  const [pendingTokenEstimate, setPendingTokenEstimate] = useState(0);
  const [prevIsSending, setPrevIsSending] = useState(isSending);

  // Reset về 0 mỗi khi bắt đầu một lượt chờ mới — cùng pattern render-phase như trên.
  if (isSending !== prevIsSending) {
    setPrevIsSending(isSending);
    if (isSending) setPendingTokenEstimate(0);
  }

  useEffect(() => {
    if (!isSending || !showTokenUsage) return undefined;
    const interval = setInterval(() => {
      setPendingTokenEstimate((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 90);
    return () => clearInterval(interval);
  }, [isSending, showTokenUsage]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen, revealCount]);

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

  const handleTouchStart = () => {
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
          <div className="ai-assistant__headerRow">
            <div className="ai-assistant__headerTitle">
              <Sparkles size={18} />
              <span>{title}</span>
            </div>
            <button
              type="button"
              className="ai-assistant__iconBtn"
              onClick={closePanel}
              aria-label="Đóng trợ lý AI"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quota-token: chỉ staff mới thấy (theo dõi vận hành) — hook không set quota cho kênh khách hàng. */}
          {quota && (
            <div
              className="ai-assistant__quota"
              title="Mức sử dụng token trong ngày hôm nay (số liệu nội bộ, không phải quota thật từ Google)"
            >
              <div className="ai-assistant__quotaBar">
                <div
                  className="ai-assistant__quotaBarFill"
                  style={{ width: `${Math.min(100, (quota.tokensUsed / quota.tokenLimit) * 100)}%` }}
                />
              </div>
              <span className="ai-assistant__quotaLabel">
                {formatCompactNumber(quota.tokensUsed)}/{formatCompactNumber(quota.tokenLimit)} token · {quota.requestsUsed}/{quota.requestLimit} lượt
              </span>
            </div>
          )}
        </header>

        <div className="ai-assistant__body" ref={listRef}>
          {messages.length === 0 ? (
            <div className="ai-assistant__empty">
              <Sparkles size={28} />
              <p>{emptyText}</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`ai-assistant__bubble ${m.role === 'user' ? 'is-user' : 'is-ai'} ${m.isError ? 'is-error' : ''}`}
              >
                {parseMarkdownToJsx(getDisplayText(m))}
                {isRevealingMessage(m.id) && <span className="ai-assistant__revealCursor" />}
                {showTokenUsage && m.usage?.totalTokens != null && (
                  <div className="ai-assistant__bubbleMeta">{getDisplayTokens(m)} token</div>
                )}
              </div>
            ))
          )}
          {isSending && (
            <div className="ai-assistant__bubble is-ai is-typing">
              <span className="ai-assistant__dot" />
              <span className="ai-assistant__dot" />
              <span className="ai-assistant__dot" />
              {showTokenUsage && (
                <span className="ai-assistant__typingTokens">~{pendingTokenEstimate} token</span>
              )}
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
