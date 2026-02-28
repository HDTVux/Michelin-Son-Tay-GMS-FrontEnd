import React, { useEffect, useMemo, useState } from 'react'
import styles from './StepService.module.css'
import bookingStyles from '../Booking.module.css'

// Chọn dịch vụ với slider + tìm kiếm + lọc
export default function StepService({ services, selectedIds, onToggle, search, onSearch, filter, onFilter, onNext, loading = false, error = '' }) {
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

  const isMobileSlider = visible === 1;

  // Lọc theo từ khóa và category
  const filtered = useMemo(() => {
    const cleaned = (search || '').toLowerCase();
    const list = Array.isArray(services) ? services : [];
    return list.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const matchSearch = name.includes(cleaned);
      const matchFilter = filter === 'all' || !filter || (item.category || 'all') === filter;
      return matchSearch && matchFilter;
    });
  }, [services, search, filter]);

  // Tổng số slide tối đa có thể lùi/tiến (chỉ dùng cho desktop / tablet)
  const maxIndex = Math.max(0, filtered.length - visible);

  // Nếu số lượng item thay đổi, đảm bảo index không vượt quá maxIndex
  useEffect(() => {
    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);
    return () => clearTimeout(t);
  }, [maxIndex, filtered.length]);

  // Offset trượt theo % chiều ngang
  const offset = (index * 100) / visible;
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  return (
    <>
      <h3 className={bookingStyles['section-title']}>Chọn dịch vụ</h3>
      <div className={styles['service-step']}>
      <div className={styles['service-top']}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${styles.active}`}>Dịch vụ</button>
          <button className={styles.tab}>Gói combo</button>
        </div>
        <div className={styles['search-filter']}>
          <div className={styles['search-box']}>
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
            <option value="general">Khác</option>
          </select>
        </div>
        <p className={styles['slider-hint']}>Kéo vuốt ngang để xem thêm dịch vụ.</p>
      </div>

      {loading && <div className={styles['service-status']}>Đang tải danh sách dịch vụ...</div>}
      {!loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className={styles['service-status']}>Chưa có dịch vụ phù hợp.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={styles['carousel-shell']}>
          {!isMobileSlider && (
            <button className={styles['nav-btn']} aria-label="Prev" onClick={prev} disabled={index === 0}>
              ⟨
            </button>
          )}
          <div
            className={styles['slider-viewport']}
            style={isMobileSlider ? { overflowX: 'auto' } : {}}
          >
            <div
              className={styles['slider-track']}
              style={isMobileSlider ? {} : { transform: `translateX(-${offset}%)` }}
            >
              {filtered.map((item) => {
                const active = selectedIds.includes(item.id);
                const thumbStyle = item.thumbnail
                  ? { backgroundImage: `url(${item.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : undefined;
                return (
                  <div
                    key={item.id}
                    className={styles['service-slide']}
                    style={
                      isMobileSlider
                        ? { flex: '0 0 100%' }
                        : { flex: `0 0 calc((100% - 12px * ${visible - 1}) / ${visible})` }
                    }
                  >
                    <div className={styles['service-card']}>
                      <div className={styles.thumb} style={thumbStyle} />
                      <button className={[styles.check, active ? styles.checked : ''].filter(Boolean).join(' ')} onClick={() => onToggle(item.id)}>
                        {active ? '✓' : ''}
                      </button>
                      <div className={styles.name}>{item.name}</div>
                      <div className={styles.desc}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {!isMobileSlider && (
            <button className={styles['nav-btn']} aria-label="Next" onClick={next} disabled={index >= maxIndex}>
              ⟩
            </button>
          )}
        </div>
      )}

      <div className={styles['selected-box']}>
        <div className={styles['selected-title']}>Dịch vụ đã chọn ({selectedIds.length} mục)</div>
        <div className={styles['chip-row']}>
          {selectedIds.map((id) => {
            const item = services.find((s) => s.id === id);
            if (!item) return null;
            return (
              <span key={id} className={styles.chip}>
                <span className="chip-icon">🔧</span>
                {item.name}
                <button className={styles['chip-remove']} onClick={() => onToggle(id)} aria-label="Remove">
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>

        <div className={bookingStyles['booking-actions']}>
          <button className={bookingStyles.btn}>Quay lại</button>
          <button className={`${bookingStyles.btn} ${bookingStyles.primary}`} onClick={onNext}>
            Tiếp tục
          </button>
        </div>
      </div>
    </>
  );
}
