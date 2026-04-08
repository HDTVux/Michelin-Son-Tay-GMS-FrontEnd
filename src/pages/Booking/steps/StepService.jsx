import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './StepService.module.css';
import bookingStyles from '../Booking.module.css';

const normalizeItemType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART') {
    return 'PART';
  }
  return 'SERVICE';
};

// Chọn dịch vụ/phụ tùng với slider + tìm kiếm + lọc
export default function StepService({
  services,
  selectedIds,
  onToggle,
  search,
  onSearch,
  filter,
  onFilter,
  onNext,
  onBack,
  showActions = true,
  nextLabel = 'Tiếp tục',
  backLabel = 'Quay lại',
  loading = false,
  error = '',
  activeTab = 'SERVICE',
  onChangeTab,
}) {
  const [visible, setVisible] = useState(3);
  const [index, setIndex] = useState(0);

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
  const currentTab = normalizeItemType(activeTab);
  const allItems = Array.isArray(services) ? services : [];

  const scopedByType = useMemo(
    () => allItems.filter((item) => normalizeItemType(item?.itemType) === currentTab),
    [allItems, currentTab],
  );

  const categoryOptions = useMemo(() => {
    const map = new Map();
    scopedByType.forEach((item) => {
      const key = String(item?.category || '').trim();
      if (!key || key === 'all') return;
      const label = String(item?.categoryLabel || key).trim() || key;
      if (!map.has(key)) map.set(key, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [scopedByType]);
  
  useEffect(() => {
    if (!onFilter) return;
    if (filter === 'all') return;
    const exists = categoryOptions.some((opt) => opt.value === filter);
    if (!exists) onFilter('all');
  }, [categoryOptions, filter, onFilter]);

  const filtered = useMemo(() => {
    const cleaned = (search || '').toLowerCase();
    return scopedByType.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const matchSearch = name.includes(cleaned);
      const matchFilter = filter === 'all' || !filter || (item.category || 'all') === filter;
      return matchSearch && matchFilter;
    });
  }, [filter, scopedByType, search]);

  const maxIndex = Math.max(0, filtered.length - visible);

  useEffect(() => {
    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);
    return () => clearTimeout(t);
  }, [currentTab, filtered.length, maxIndex]);

  const offset = (index * 100) / visible;
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const sectionLabel = currentTab === 'PART' ? 'Chọn phụ tùng' : 'Chọn dịch vụ';
  const searchPlaceholder = currentTab === 'PART' ? 'Tìm kiếm phụ tùng...' : 'Tìm kiếm dịch vụ...';
  const sliderHint = currentTab === 'PART'
    ? 'Kéo vuốt ngang để xem thêm phụ tùng.'
    : 'Kéo vuốt ngang để xem thêm dịch vụ.';
  const emptyLabel = currentTab === 'PART' ? 'Chưa có phụ tùng phù hợp.' : 'Chưa có dịch vụ phù hợp.';

  return (
    <>
      <h3 className={bookingStyles['section-title']}>{sectionLabel}</h3>
      <div className={styles['service-step']}>
        <div className={styles['service-top']}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${currentTab === 'SERVICE' ? styles.active : ''}`.trim()}
              onClick={() => onChangeTab?.('SERVICE')}
            >
              Dịch vụ
            </button>
            <button
              type="button"
              className={`${styles.tab} ${currentTab === 'PART' ? styles.active : ''}`.trim()}
              onClick={() => onChangeTab?.('PART')}
            >
              Phụ tùng
            </button>
          </div>
          <div className={styles['search-filter']}>
            <div className={styles['search-box']}>
              <span className="icon">🔍</span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <select value={filter} onChange={(e) => onFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <p className={styles['slider-hint']}>{sliderHint}</p>
        </div>

        {loading && <div className={styles['service-status']}>Đang tải danh sách...</div>}
        {!loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className={styles['service-status']}>{emptyLabel}</div>
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
          <div className={styles['selected-title']}>Hạng mục đã chọn ({selectedIds.length} mục)</div>
          <div className={styles['chip-row']}>
            {selectedIds.map((id) => {
              const item = allItems.find((s) => s.id === id);
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

        {showActions && (
          <div className={bookingStyles['booking-actions']}>
            <button
              type="button"
              className={bookingStyles.btn}
              onClick={() => onBack?.()}
              disabled={!onBack}
            >
              {backLabel}
            </button>
            <button
              type="button"
              className={`${bookingStyles.btn} ${bookingStyles.primary}`}
              onClick={() => onNext?.()}
              disabled={!onNext}
            >
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </>
  );
}