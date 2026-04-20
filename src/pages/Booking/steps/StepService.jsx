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

const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPrice = (value, displayText = '') => {
  const label = typeof displayText === 'string' ? displayText.trim() : '';
  if (label) return label;
  const price = toPriceNumber(value);
  if (price == null) return '';
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
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
  allowPartTab = true,
  layoutMode = 'carousel',
  showPriceFilter = false,
  minPrice = '',
  maxPrice = '',
  priceSort = '',
  onMinPriceChange,
  onMaxPriceChange,
  onPriceSortChange,
}) {
  const [visible, setVisible] = useState(3);
  const [index, setIndex] = useState(0);
  const [gridExpanded, setGridExpanded] = useState(false);

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
  const incomingTab = normalizeItemType(activeTab);
  const currentTab = allowPartTab ? incomingTab : 'SERVICE';
  const allItems = useMemo(() => (Array.isArray(services) ? services : []), [services]);

  const selectedItems = useMemo(() => {
    const selectedSet = new Set((Array.isArray(selectedIds) ? selectedIds : []).map((id) => String(id)));
    return allItems.filter((item) => selectedSet.has(String(item?.id)));
  }, [allItems, selectedIds]);

  const selectedServiceItems = useMemo(
    () => selectedItems.filter((item) => normalizeItemType(item?.itemType) === 'SERVICE'),
    [selectedItems],
  );

  const selectedPartItems = useMemo(
    () => selectedItems.filter((item) => normalizeItemType(item?.itemType) === 'PART'),
    [selectedItems],
  );

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
    const min = toPriceNumber(minPrice);
    const max = toPriceNumber(maxPrice);
    const sort = String(priceSort || '').trim().toLowerCase();
    const hasPriceFilter = min != null || max != null;
    const nextItems = scopedByType.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const matchSearch = name.includes(cleaned);
      const matchFilter = filter === 'all' || !filter || (item.category || 'all') === filter;
      const price = toPriceNumber(item?.price);
      const matchMin = min == null || (price != null && price >= min);
      const matchMax = max == null || (price != null && price <= max);
      const matchPrice = !hasPriceFilter || (matchMin && matchMax);
      return matchSearch && matchFilter && matchPrice;
    });
    if (sort !== 'asc' && sort !== 'desc') return nextItems;
    return [...nextItems].sort((a, b) => {
      const priceA = toPriceNumber(a?.price);
      const priceB = toPriceNumber(b?.price);
      if (priceA == null && priceB == null) return 0;
      if (priceA == null) return 1;
      if (priceB == null) return -1;
      return sort === 'asc' ? priceA - priceB : priceB - priceA;
    });
  }, [filter, maxPrice, minPrice, priceSort, scopedByType, search]);

  const maxIndex = Math.max(0, filtered.length - visible);

  useEffect(() => {
    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);
    return () => clearTimeout(t);
  }, [currentTab, filtered.length, maxIndex]);

  useEffect(() => {
    if (allowPartTab) return;
    if (incomingTab !== 'PART') return;
    onChangeTab?.('SERVICE');
  }, [allowPartTab, incomingTab, onChangeTab]);

  useEffect(() => {
    const t = setTimeout(() => setGridExpanded(false), 0);
    return () => clearTimeout(t);
  }, [currentTab, filter, maxPrice, minPrice, priceSort, search]);

  const offset = (index * 100) / visible;
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const sectionLabel = currentTab === 'PART' ? 'Chọn phụ tùng' : 'Chọn dịch vụ';
  const searchPlaceholder = currentTab === 'PART' ? 'Tìm kiếm phụ tùng...' : 'Tìm kiếm dịch vụ...';
  const emptyLabel = currentTab === 'PART' ? 'Chưa có phụ tùng phù hợp.' : 'Chưa có dịch vụ phù hợp.';

  const isGridScroll = layoutMode === 'grid-scroll';
  const gridCollapsedCount = Math.max(1, visible);
  const gridItems = isGridScroll && !gridExpanded ? filtered.slice(0, gridCollapsedCount) : filtered;
  const canToggleGrid = isGridScroll && filtered.length > gridCollapsedCount;

  const renderServiceCard = (item) => {
    const active = selectedIds.includes(item.id);
    const thumbStyle = item.thumbnail
      ? { backgroundImage: `url(${item.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : undefined;
    const priceText = formatPrice(item.price, item.priceText);

    return (
      <div className={styles['service-card']}>
        <div className={styles.thumb} style={thumbStyle} />
        <button
          type="button"
          className={[styles.check, active ? styles.checked : ''].filter(Boolean).join(' ')}
          onClick={() => onToggle(item.id)}
        >
          {active ? '✓' : ''}
        </button>
        <div className={styles.name}>{item.name}</div>
        <div className={styles.desc}>{item.desc}</div>
        {priceText ? <div className={styles.price}>{priceText}</div> : null}
      </div>
    );
  };

  const renderSelectedGroup = (title, items, emptyLabel) => (
    <div className={styles['selected-group']}>
      <div className={styles['selected-subtitle']}>{title} ({items.length})</div>
      {items.length > 0 ? (
        <div className={styles['chip-row']}>
          {items.map((item) => (
            <span key={item.id} className={styles.chip}>
              <span className="chip-icon">🔧</span>
              {item.name}
              <button className={styles['chip-remove']} onClick={() => onToggle(item.id)} aria-label="Remove">
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className={styles['selected-empty']}>{emptyLabel}</div>
      )}
    </div>
  );

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
            {showPriceFilter && (
              <div className={styles['price-filter']}>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Giá từ"
                  value={minPrice}
                  onChange={(e) => onMinPriceChange?.(e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Giá đến"
                  value={maxPrice}
                  onChange={(e) => onMaxPriceChange?.(e.target.value)}
                />
                <select value={priceSort} onChange={(e) => onPriceSortChange?.(e.target.value)}>
                  <option value="">Sắp xếp giá</option>
                  <option value="asc">Giá thấp đến cao</option>
                  <option value="desc">Giá cao đến thấp</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {loading && <div className={styles['service-status']}>Đang tải danh sách...</div>}
        {!loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className={styles['service-status']}>{emptyLabel}</div>
        )}

        {!loading && !error && filtered.length > 0 && isGridScroll && (
          <>
          <div className={`${styles['grid-scroll']} ${gridExpanded ? styles['grid-scroll-expanded'] : styles['grid-scroll-collapsed']}`}>
            {gridItems.map((item) => (
              <div key={item.id} className={styles['grid-item']}>
                {renderServiceCard(item)}
              </div>
            ))}
          </div>
          {canToggleGrid && (
            <div className={styles['expand-row']}>
              <button type="button" className={styles['expand-btn']} onClick={() => setGridExpanded((prev) => !prev)}>
                {gridExpanded ? 'Thu gọn' : `Xem thêm ${filtered.length - gridCollapsedCount} mục`}
              </button>
            </div>
          )}
          </>
        )}

        {!loading && !error && filtered.length > 0 && !isGridScroll && (
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
                  const priceText = formatPrice(item.price, item.priceText);
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
                        {priceText ? <div className={styles.price}>{priceText}</div> : null}
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
          {renderSelectedGroup('Dịch vụ đã chọn', selectedServiceItems, 'Chưa chọn dịch vụ.')}
          {renderSelectedGroup('Phụ tùng đã chọn', selectedPartItems, 'Chưa chọn phụ tùng.')}
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
