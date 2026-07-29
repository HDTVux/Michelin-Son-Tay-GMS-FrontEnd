import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sparkles, Wrench, PackageSearch } from 'lucide-react';
import { fetchHomeProducts } from '../../services/homeService.js';
import { useCustomerAiAssistant } from '../../context/CustomerAiAssistantContext.jsx';
import '../UniversalSearch/UniversalSearch.css';
import './CustomerSearch.css';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const extractList = (res) => {
  const payload = extractPayload(res);
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.data)) return payload.data;
  return Array.isArray(payload) ? payload : [];
};
const parsePriceNumber = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const text = String(value).toLowerCase().trim();
  if (!text || text.includes('liên hệ')) return null;
  const match = text.match(/\d[\d.,]*/);
  if (!match) return null;
  const parsed = Number(match[0].replace(/[.,]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const toDisplayPrice = (item) => {
  if (item?.showPrice !== true) return 'Liên hệ';
  const numeric = parsePriceNumber(item?.displayPrice) ?? parsePriceNumber(item?.price);
  return numeric != null ? `${numeric.toLocaleString('vi-VN')} VND` : 'Liên hệ';
};
const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .trim();

const MAX_SUGGESTIONS = 6;

const CustomerSearch = ({ className = '' }) => {
  const navigate = useNavigate();
  const aiState = useCustomerAiAssistant();
  const containerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchHomeProducts({ page: 0, size: 500, itemType: 'SERVICE' }),
      fetchHomeProducts({ page: 0, size: 500, itemType: 'PART' }),
    ]).then((results) => {
      if (!active) return;
      const items = results.flatMap((res) => (res.status === 'fulfilled' ? extractList(res.value) : []));
      const normalized = items
        .map((item) => {
          const itemType = String(item?.itemType || '').trim().toUpperCase() === 'PART' ? 'PART' : 'SERVICE';
          const catalogItemId = item?.catalogItemId ?? item?.itemId;
          const serviceId = item?.serviceId;
          const id = catalogItemId ?? serviceId;
          const title = String(item?.title || item?.itemName || '').trim();
          if (!id || !title) return null;
          return {
            id: `${itemType}:${id}`,
            itemType,
            title,
            price: toDisplayPrice(item),
            searchText: normalizeSearchText(title),
            link: itemType === 'PART' ? `/parts/${id}` : `/services/${id}`,
          };
        })
        .filter(Boolean);
      setCatalogItems(normalized);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return [];
    return catalogItems.filter((item) => item.searchText.includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [query, catalogItems]);

  const askAi = (text) => {
    const trimmed = text.trim();
    if (!trimmed || !aiState?.enabled) return;
    aiState.openPanel();
    aiState.sendMessage(trimmed);
    setQuery('');
    setIsFocused(false);
  };

  const handleItemClick = (link) => {
    setQuery('');
    setIsFocused(false);
    navigate(link);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (aiState?.enabled) {
        askAi(query);
      } else if (suggestions.length > 0) {
        handleItemClick(suggestions[0].link);
      }
    }
  };

  return (
    <div className={`${className} customerSearch ${isFocused ? 'is-focused' : ''}`.trim()} ref={containerRef}>
      <div className="universal-search__wrapper customerSearch__wrapper">
        <Search size={16} className="universal-search__icon" />
        <input
          type="text"
          placeholder="Tìm dịch vụ, phụ tùng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="universal-search__input"
        />
        {query && (
          <button
            type="button"
            className="universal-search__clear"
            onClick={() => setQuery('')}
            aria-label="Xóa từ khóa"
          >
            <X size={14} />
          </button>
        )}
        {aiState?.enabled && (
          <button
            type="button"
            className="universal-search__ai-submit"
            onClick={() => askAi(query)}
            title="Hỏi Trợ lý AI (Enter)"
            aria-label="Hỏi Trợ lý AI"
          >
            <Sparkles size={14} />
          </button>
        )}
      </div>

      {isFocused && query.trim() && (
        <div className="universal-search__dropdown">
          {suggestions.length === 0 ? (
            <div className="universal-search__empty">
              <p>Không tìm thấy kết quả phù hợp cho "{query}"</p>
              <button
                type="button"
                className="universal-search__ask-ai-btn"
                onClick={() => askAi(query)}
              >
                <Sparkles size={14} />
                <span>Hỏi Trợ lý AI hoặc nhấn Enter</span>
              </button>
            </div>
          ) : (
            <div className="universal-search__group">
              <div className="universal-search__group-header">Kết quả phù hợp</div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="universal-search__item"
                  onClick={() => handleItemClick(item.link)}
                >
                  <span className="universal-search__item-icon">
                    {item.itemType === 'PART' ? <PackageSearch size={14} /> : <Wrench size={14} />}
                  </span>
                  <div className="universal-search__item-info">
                    <div className="universal-search__item-title">{item.title}</div>
                    <div className="universal-search__item-subtitle">
                      {item.itemType === 'PART' ? 'Phụ tùng' : 'Dịch vụ'} · {item.price}
                    </div>
                  </div>
                </button>
              ))}
              <button
                type="button"
                className="universal-search__ask-ai-btn"
                onClick={() => askAi(query)}
              >
                <Sparkles size={14} />
                <span>Không thấy đúng ý? Hỏi Trợ lý AI</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
