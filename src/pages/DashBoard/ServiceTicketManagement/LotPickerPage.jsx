import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CatalogPicker.module.css';
import { formatCurrencyVnd } from './useAdvisorItemsTableHandlers.js';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function getWarehouseAvailableQty(detail) {
  const availableStockLevel = toFiniteNumber(
    detail?.availableStockLevel
      ?? detail?.available_stock_level
      ?? detail?.availableStock
      ?? detail?.available_stock,
  );
  if (availableStockLevel != null) return availableStockLevel;

  const qty = toFiniteNumber(detail?.quantity ?? detail?.stockQuantity ?? detail?.stock_quantity);
  if (qty != null) return qty;

  const availableQty = toFiniteNumber(detail?.availableQuantity ?? detail?.available_quantity);
  if (availableQty != null) return availableQty;

  return null;
}

function buildPickedCatalogItem(item, warehouseDetail, selectedLot) {
  if (!warehouseDetail) return item;
  const sellingPrice = selectedLot ? selectedLot?.sellingPrice : warehouseDetail?.sellingPrice;
  const nextPrice = sellingPrice ?? item?.price ?? item?.unitPrice;
  const availableQuantity = selectedLot 
    ? selectedLot?.remainingQuantity 
    : getWarehouseAvailableQty(warehouseDetail);

  return {
    ...item,
    warehouseId: warehouseDetail?.warehouseId,
    selectedWarehouse: warehouseDetail,
    sellingPrice,
    price: nextPrice,
    unitPrice: nextPrice,
    availableQuantity,
    entryItemId: selectedLot ? selectedLot?.entryItemId : null,
    entryCode: selectedLot ? selectedLot?.entryCode : null,
  };
}

export default function LotPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};
  const { ticketCode = '', rowIndex = null, item = null, selectedWarehouse = null } = state;

  const [searchCode, setSearchCode] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. Chỉ hiển thị các lô còn hàng (remainingQuantity > 0)
  const activeLots = useMemo(() => {
    const lots = Array.isArray(selectedWarehouse?.lots) ? selectedWarehouse.lots : [];
    return lots.filter((lot) => (lot?.remainingQuantity ?? 0) > 0);
  }, [selectedWarehouse]);

  // 2. Tìm kiếm nhanh theo mã lô (entryCode)
  const filteredLots = useMemo(() => {
    return activeLots.filter((lot) => {
      const entryCode = String(lot?.entryCode || '').toLowerCase();
      return entryCode.includes(searchCode.trim().toLowerCase());
    });
  }, [activeLots, searchCode]);

  if (!item || !selectedWarehouse) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorBanner}>
          Không tìm thấy thông tin sản phẩm hoặc kho hàng. Vui lòng quay lại.
        </div>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    );
  }

  const handlePickLot = (lot) => {
    const activeTicketId = ticketCode || 'new_booking';
    const pickedItem = buildPickedCatalogItem(item, selectedWarehouse, lot);
    const pickedProductData = {
      item: pickedItem,
      rowIndex,
    };
    sessionStorage.setItem(`gms_picked_product_${activeTicketId}`, JSON.stringify(pickedProductData));
    // Quay lại màn hình chi tiết báo giá trước đó (bỏ qua trang chọn catalog bằng cách lùi 2 bước)
    navigate(-2);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Chọn lô sản phẩm</h2>
          <div 
            style={{ 
              margin: '4px 0 0', 
              color: '#64748b', 
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '2px' : '8px',
              flexWrap: 'wrap'
            }}
          >
            <span>
              Sản phẩm: <strong style={{ color: '#1e293b' }}>{item.itemName || item.name}</strong> ({item.sku || 'N/A'})
            </span>
            {!isMobile && <span>&mdash;</span>}
            <span>
              Hãng: <strong style={{ color: '#1e293b' }}>{item.brand || 'N/A'}</strong>
            </span>
            {!isMobile && <span>&mdash;</span>}
            <span>
              Kho: <strong style={{ color: '#1e293b' }}>{selectedWarehouse.warehouseName || selectedWarehouse.warehouseCode}</strong>
            </span>
          </div>
        </div>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>

      <div className={styles.modalBody} style={{ padding: 0 }}>
        {/* Bộ lọc mã lô */}
        <div className={styles.filterSection}>
          <div className={styles.searchRow}>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã lô (entryCode)..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
            />
            <button
              type="button"
              className="ui-btn ui-btn--ghost"
              onClick={() => setSearchCode('')}
              disabled={!searchCode}
            >
              Đặt lại
            </button>
          </div>
        </div>

        {/* Danh sách lô hàng */}
        {!isMobile ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>STT</th>
                  <th>Mã lô</th>
                  <th>Số lượng tồn</th>
                  <th>Đơn giá lô</th>
                  <th style={{ width: '120px' }} />
                </tr>
              </thead>
              <tbody>
                {filteredLots.length > 0 ? (
                  filteredLots.map((lot, index) => (
                    <tr key={String(lot.entryItemId || index)}>
                      <td>{index + 1}</td>
                      <td>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>
                          {lot.entryCode || '-'}
                        </span>
                        {lot.entryItemId && lot.entryItemId === activeLots[0]?.entryItemId ? (
                          <span 
                            style={{
                              marginLeft: '8px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              display: 'inline-block',
                              verticalAlign: 'middle'
                            }}
                          >
                            FIFO
                          </span>
                        ) : null}
                      </td>
                      <td>{lot.remainingQuantity ?? 0}</td>
                      <td className={styles.tdNumber}>
                        {formatCurrencyVnd(lot.sellingPrice)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ui-btn ui-btn--primary"
                          onClick={() => handlePickLot(lot)}
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      Không tìm thấy lô hàng nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.mobileCardList}>
            {filteredLots.length > 0 ? (
              filteredLots.map((lot, index) => {
                const isFirstFifo = lot.entryItemId && lot.entryItemId === activeLots[0]?.entryItemId;
                return (
                  <div className={styles.mobileCard} key={lot.entryItemId || index}>
                    <div className={styles.cardHeader}>
                      <span className={styles.skuTag}>Mã lô: {lot.entryCode || '-'}</span>
                      {isFirstFifo && (
                        <span 
                          className={styles.typeTag}
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            borderColor: '#bae6fd',
                            fontWeight: '700'
                          }}
                        >
                          FIFO
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.cardSpecsGrid}>
                      <div className={styles.specItem}>
                        <span className={styles.specLabel}>Ngày nhập</span>
                        <span className={styles.specValue}>{formatDate(lot.entryDate)}</span>
                      </div>
                      <div className={styles.specItem}>
                        <span className={styles.specLabel}>Số lượng tồn</span>
                        <span className={styles.specValue}>{lot.remainingQuantity ?? 0}</span>
                      </div>
                    </div>

                    <div className={styles.cardDivider} />

                    <div className={styles.cardFooter}>
                      <div className={styles.priceContainer}>
                        <span className={styles.priceLabel}>Đơn giá lô</span>
                        <span className={styles.priceVal}>{formatCurrencyVnd(lot.sellingPrice)}</span>
                      </div>

                      <button
                        type="button"
                        className={`${styles.mobileActionBtn} ${styles.btnPrimary}`}
                        onClick={() => handlePickLot(lot)}
                      >
                        Chọn
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyRow} style={{ padding: '40px 0', textWrap: 'nowrap', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                Không tìm thấy lô hàng nào phù hợp.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
