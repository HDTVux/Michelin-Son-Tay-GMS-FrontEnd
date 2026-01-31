import React, { useEffect, useMemo, useState } from 'react'
import './StepService.css'

// Chọn dịch vụ với slider + tìm kiếm + lọc
export default function StepService({ services, selectedIds, onToggle, search, onSearch, filter, onFilter, onNext }) {
  const [visible, setVisible] = useState(3); // số thẻ hiển thị cùng lúc
  const [index, setIndex] = useState(0); // vị trí slide hiện tại

  // Tính số cột hiển thị theo màn hình, reset về slide 0 mỗi khi resize
  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      if (w <= 520) setVisible(1);
      else if (w <= 900) setVisible(2);
      else setVisible(3);
      setIndex(0);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Lọc theo từ khóa và category
  const filtered = useMemo(() => {
    const cleaned = search.toLowerCase();
    return services.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(cleaned);
      const matchFilter = filter === 'all' || item.category === filter;
      return matchSearch && matchFilter;
    });
  }, [services, search, filter]);

  // Tổng số slide tối đa có thể lùi/tiến
  const maxIndex = Math.max(0, filtered.length - visible);

  // Nếu số lượng item thay đổi, đảm bảo index không vượt quá maxIndex
  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex, filtered.length]);

  // Offset trượt theo % chiều ngang
  const offset = (index * 100) / visible;
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  return (
    <>
      <h3 className="section-title">Chọn dịch vụ</h3>
      <div className="service-step">
      <div className="service-top">
        <div className="tabs">
          <button className="tab active">Dịch vụ</button>
          <button className="tab">Gói combo</button>
        </div>
        <div className="search-filter">
          <div className="search-box">
            <span className="icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm dịch vụ..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <select value={filter} onChange={(e) => onFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="tires">Lốp & lốp</option>
            <option value="engine">Bảo dưỡng nhanh</option>
            <option value="check">Chăm sóc & OTOT</option>
          </select>
        </div>
      </div>

      <div className="carousel-shell">
        <button className="nav-btn" aria-label="Prev" onClick={prev} disabled={index === 0}>
          ⟨
        </button>
        <div className="slider-viewport">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${offset}%)` }}
          >
            {filtered.map((item) => {
              const active = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="service-slide"
                  style={{ flex: `0 0 calc((100% - 12px * ${visible - 1}) / ${visible})` }}
                >
                  <div className="service-card">
                    <div className="thumb" />
                    <button className={`check ${active ? 'checked' : ''}`} onClick={() => onToggle(item.id)}>
                      {active ? '✓' : ''}
                    </button>
                    <div className="pill">{item.tag}</div>
                    <div className="name">{item.name}</div>
                    <div className="desc">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <button className="nav-btn" aria-label="Next" onClick={next} disabled={index >= maxIndex}>
          ⟩
        </button>
      </div>

      <div className="selected-box">
        <div className="selected-title">Dịch vụ đã chọn ({selectedIds.length} mục)</div>
        <div className="chip-row">
          {selectedIds.map((id) => {
            const item = services.find((s) => s.id === id);
            if (!item) return null;
            return (
              <span key={id} className="chip">
                <span className="chip-icon">🔧</span>
                {item.name}
                <button className="chip-remove" onClick={() => onToggle(id)} aria-label="Remove">
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>

        <div className="booking-actions">
          <button className="btn">Quay lại</button>
          <button className="btn primary" onClick={onNext}>
            Tiếp tục
          </button>
        </div>
      </div>
    </>
  );
}
