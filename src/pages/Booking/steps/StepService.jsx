import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import styles from './StepService.module.css';
import bookingStyles from '../Booking.module.css';

// Hàm chuẩn hóa loại mục (Dịch vụ, Phụ tùng, Combo, Thiết bị)
const normalizeItemType = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'COMBO' || text === 'COMBO_ITEM') return 'COMBO';
  if (text === 'EQUIPMENT' || text === 'MACHINERY' || text === 'TOOL' || text === 'DEVICE') return 'EQUIPMENT';
  if (text === 'PART' || text === 'PRODUCT' || text === 'SPARE_PART' || text === 'SPAREPART') return 'PART';
  return 'SERVICE';
};

// Hàm chuyển đổi giá trị sang số
const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

// Hàm định dạng giá trị thành chuỗi hiển thị
const formatPrice = (value, displayText = '') => {
  const label = typeof displayText === 'string' ? displayText.trim() : '';
  if (label) return label;
  const price = toPriceNumber(value);
  if (price == null) return '';
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
};

const getTabTitle = (type) => {
  if (type === 'PART') return 'Phụ tùng chính hãng';
  if (type === 'COMBO') return 'Gói Combo bảo dưỡng tiết kiệm';
  if (type === 'EQUIPMENT') return 'Thiết bị & Dụng cụ';
  return 'Dịch vụ chính hãng';
};

const getBadgeLabel = (type) => {
  if (type === 'PART') return 'Phụ tùng';
  if (type === 'COMBO') return 'Combo';
  if (type === 'EQUIPMENT') return 'Thiết bị';
  return 'Dịch vụ';
};

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
  showPriceFilter = true,
  minPrice = '',
  maxPrice = '',
  priceSort = '',
  onMinPriceChange,
  onMaxPriceChange,
  onPriceSortChange,
}) {
  const currentTab = normalizeItemType(activeTab);
  const allItems = useMemo(() => (Array.isArray(services) ? services : []), [services]);

  // Đếm số lượng theo từng loại mục
  const counts = useMemo(() => {
    const res = { SERVICE: 0, PART: 0, COMBO: 0, EQUIPMENT: 0 };
    allItems.forEach((item) => {
      const type = normalizeItemType(item?.itemType);
      if (res[type] !== undefined) res[type] += 1;
    });
    return res;
  }, [allItems]);

  // Lọc ra các mục đã chọn dựa trên selectedIds
  const selectedItems = useMemo(() => {
    const selectedSet = new Set((Array.isArray(selectedIds) ? selectedIds : []).map((id) => String(id)));
    return allItems.filter((item) => selectedSet.has(String(item?.id)));
  }, [allItems, selectedIds]);

  // Phân nhóm các mục đã chọn
  const selectedServiceItems = useMemo(
    () => selectedItems.filter((item) => normalizeItemType(item?.itemType) === 'SERVICE'),
    [selectedItems],
  );
  const selectedPartItems = useMemo(
    () => selectedItems.filter((item) => normalizeItemType(item?.itemType) === 'PART'),
    [selectedItems],
  );
  const selectedComboItems = useMemo(
    () => selectedItems.filter((item) => normalizeItemType(item?.itemType) === 'COMBO'),
    [selectedItems],
  );
  const selectedEquipmentItems = useMemo(
    () => selectedItems.filter((item) => normalizeItemType(item?.itemType) === 'EQUIPMENT'),
    [selectedItems],
  );

  // Lọc danh sách tất cả mục dựa trên tab hiện tại
  const scopedByType = useMemo(
    () => allItems.filter((item) => normalizeItemType(item?.itemType) === currentTab),
    [allItems, currentTab],
  );

  // Tạo danh sách các tùy chọn category
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
    if (!onFilter || filter === 'all') return;
    const exists = categoryOptions.some((opt) => opt.value === filter);
    if (!exists) onFilter('all');
  }, [categoryOptions, filter, onFilter]);

  // Lọc danh sách hiển thị
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

  const searchPlaceholder = `Tìm kiếm ${getBadgeLabel(currentTab).toLowerCase()}...`;
  const emptyLabel = `Chưa có ${getBadgeLabel(currentTab).toLowerCase()} phù hợp.`;

  // Render thẻ sản phẩm / dịch vụ
  const renderServiceCard = (item) => {
    const active = selectedIds.includes(item.id);
    const thumbStyle = item.thumbnail
      ? { backgroundImage: `url(${item.thumbnail})` }
      : undefined;
    const priceText = formatPrice(item.price, item.priceText);
    const itemTypeBadge = getBadgeLabel(normalizeItemType(item.itemType));

    return (
      <div key={item.id} className={`${styles['service-card']} ${active ? styles['selected-card'] : ''}`}>
        <div className={styles.thumb} style={thumbStyle}>
          <span className={styles['type-badge']}>{itemTypeBadge}</span>
          <button
            type="button"
            className={`${styles.check} ${active ? styles.checked : ''}`}
            onClick={() => onToggle(item.id)}
            aria-label={`Select ${item.name}`}
          >
            {active ? '✓' : ''}
          </button>
        </div>
        <div className={styles['card-body']}>
          <div className={styles.name}>{item.name}</div>
          <div className={styles.desc}>{item.desc}</div>
          {priceText ? <div className={styles.price}>{priceText}</div> : <div className={styles.price}>Liên hệ</div>}
        </div>
      </div>
    );
  };

  // Render nhóm các mục đã chọn
  const renderSelectedGroup = (title, items, groupEmptyLabel) => (
    <div className={styles['selected-group']}>
      <div className={styles['selected-subtitle']}>{title} ({items.length})</div>
      {items.length > 0 ? (
        <div className={styles['chip-row']}>
          {items.map((item) => (
            <span key={item.id} className={styles.chip}>
              <span>🔧</span>
              {item.name}
              <button
                type="button"
                className={styles['chip-remove']}
                onClick={() => onToggle(item.id)}
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className={styles['selected-empty']}>{groupEmptyLabel}</div>
      )}
    </div>
  );

  return (
    <>
      <h3 className={bookingStyles['section-title']}>Chọn dịch vụ & phụ tùng bảo dưỡng</h3>
      <div className={styles['service-step']}>
        {/* Layout 2 cột: Sidebar bên trái + Main Grid hiển thị toàn bộ bên phải */}
        <div className={styles['booking-catalog-layout']}>
          {/* Sidebar Bộ Lọc Bên Trái */}
          <aside className={styles['sidebar-filter-box']}>
            <div>
              <div className={styles['filter-section-title']}>Loại hạng mục</div>
              <div className={styles['tabs-vertical']}>
                <button
                  type="button"
                  className={`${styles['tab-btn']} ${currentTab === 'SERVICE' ? styles.active : ''}`}
                  onClick={() => onChangeTab?.('SERVICE')}
                >
                  <span>Dịch vụ</span>
                  <span className={styles['tab-count']}>{counts.SERVICE}</span>
                </button>
                <button
                  type="button"
                  className={`${styles['tab-btn']} ${currentTab === 'PART' ? styles.active : ''}`}
                  onClick={() => onChangeTab?.('PART')}
                >
                  <span>Phụ tùng</span>
                  <span className={styles['tab-count']}>{counts.PART}</span>
                </button>
                <button
                  type="button"
                  className={`${styles['tab-btn']} ${currentTab === 'COMBO' ? styles.active : ''}`}
                  onClick={() => onChangeTab?.('COMBO')}
                >
                  <span>Combo</span>
                  <span className={styles['tab-count']}>{counts.COMBO}</span>
                </button>
                <button
                  type="button"
                  className={`${styles['tab-btn']} ${currentTab === 'EQUIPMENT' ? styles.active : ''}`}
                  onClick={() => onChangeTab?.('EQUIPMENT')}
                >
                  <span>Thiết bị</span>
                  <span className={styles['tab-count']}>{counts.EQUIPMENT}</span>
                </button>
              </div>
            </div>

            {/* Ô tìm kiếm */}
            <div>
              <div className={styles['filter-section-title']}>Tìm kiếm</div>
              <div className={styles['sidebar-search-box']}>
                <span>🔍</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => onSearch?.(e.target.value)}
                />
                {search && (
                  <button type="button" className={styles['search-clear']} onClick={() => onSearch?.('')}>
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Lọc danh mục */}
            {categoryOptions.length > 0 && (
              <div>
                <div className={styles['filter-section-title']}>Danh mục</div>
                <select
                  className={styles['sidebar-select']}
                  value={filter}
                  onChange={(e) => onFilter?.(e.target.value)}
                >
                  <option value="all">Tất cả danh mục</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lọc & Sắp xếp giá */}
            {showPriceFilter && (
              <div>
                <div className={styles['filter-section-title']}>Bộ lọc giá</div>
                <div className={styles['sidebar-price-range']}>
                  <input
                    type="number"
                    min="0"
                    className={styles['sidebar-price-input']}
                    placeholder="Giá từ (VND)"
                    value={minPrice}
                    onChange={(e) => onMinPriceChange?.(e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    className={styles['sidebar-price-input']}
                    placeholder="Giá đến (VND)"
                    value={maxPrice}
                    onChange={(e) => onMaxPriceChange?.(e.target.value)}
                  />
                  <select
                    className={styles['sidebar-select']}
                    value={priceSort}
                    onChange={(e) => onPriceSortChange?.(e.target.value)}
                  >
                    <option value="">Sắp xếp giá (Mặc định)</option>
                    <option value="asc">Giá thấp đến cao</option>
                    <option value="desc">Giá cao đến thấp</option>
                  </select>
                </div>
              </div>
            )}
          </aside>

          {/* Main Area Bên Phải: Hiển thị TOÀN BỘ danh sách không giới hạn 3 box */}
          <main className={styles['main-catalog-area']}>
            <div className={styles['catalog-header-bar']}>
              <h4 className={styles['catalog-main-title']}>{getTabTitle(currentTab)}</h4>
              <span className={styles['catalog-item-count']}>Hiển thị {filtered.length} hạng mục</span>
            </div>

            {loading && <div className={styles['service-status']}>Đang tải danh sách...</div>}
            {!loading && error && <div className={`${styles['service-status']} ${styles.error}`}>{error}</div>}
            {!loading && !error && filtered.length === 0 && (
              <div className={styles['service-status']}>{emptyLabel}</div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className={styles['full-items-grid']}>
                {filtered.map(renderServiceCard)}
              </div>
            )}
          </main>
        </div>

        {/* Floating Bottom Navbar cho Hạng mục đã chọn & Nút thao tác chuyển bước */}
        <div className={styles['sticky-bottom-bar']}>
          <div className={styles['selected-bar-left']}>
            <div className={styles['selected-bar-title']}>
              Hạng mục đã chọn <span className={styles['selected-bar-badge']}>{selectedIds.length}</span>
            </div>
            <div className={styles['selected-chips-scroll']}>
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => (
                  <span key={item.id} className={styles['sticky-chip']}>
                    <span>🔧</span>
                    <span className={styles['sticky-chip-name']}>{item.name}</span>
                    <button
                      type="button"
                      className={styles['sticky-chip-remove']}
                      onClick={() => onToggle(item.id)}
                      aria-label="Bỏ chọn"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className={styles['selected-bar-empty']}>Chưa chọn hạng mục nào</span>
              )}
            </div>
          </div>

          {showActions && (
            <div className={styles['selected-bar-actions']}>
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
      </div>
    </>
  );
}

StepService.propTypes = {
  services: PropTypes.array,
  selectedIds: PropTypes.array,
  onToggle: PropTypes.func.isRequired,
  search: PropTypes.string,
  onSearch: PropTypes.func,
  filter: PropTypes.string,
  onFilter: PropTypes.func,
  onNext: PropTypes.func,
  onBack: PropTypes.func,
  showActions: PropTypes.bool,
  nextLabel: PropTypes.string,
  backLabel: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  activeTab: PropTypes.string,
  onChangeTab: PropTypes.func,
  showPriceFilter: PropTypes.bool,
  minPrice: PropTypes.string,
  maxPrice: PropTypes.string,
  priceSort: PropTypes.string,
  onMinPriceChange: PropTypes.func,
  onMaxPriceChange: PropTypes.func,
  onPriceSortChange: PropTypes.func,
};
