import { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
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

export default function LotPicker({
  open,
  onClose,
  onBack,
  onPick,
  item,
  selectedWarehouse,
}) {
  const dialogRef = useRef(null);
  const [searchCode, setSearchCode] = useState('');

  // Reset searchCode when modal is opened or warehouse changes
  useEffect(() => {
    if (open) {
      setSearchCode('');
    }
  }, [open, selectedWarehouse]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const activeLots = useMemo(() => {
    const lots = Array.isArray(selectedWarehouse?.lots) ? selectedWarehouse.lots : [];
    return lots.filter((lot) => (lot?.remainingQuantity ?? 0) > 0);
  }, [selectedWarehouse]);

  const filteredLots = useMemo(() => {
    return activeLots.filter((lot) => {
      const entryCode = String(lot?.entryCode || '').toLowerCase();
      return entryCode.includes(searchCode.trim().toLowerCase());
    });
  }, [activeLots, searchCode]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.catalogPickerDialog}
      aria-labelledby="lot-picker-title"
      onCancel={(e) => {
        e.preventDefault();
      }}
      style={{ width: '90vw', maxWidth: '1000px', height: 'auto', maxHeight: '80vh' }}
    >
      <div className={styles.modalHeader}>
        <div>
          <h3 id="lot-picker-title" className={styles.modalTitle}>Chọn lô sản phẩm</h3>
          {item && selectedWarehouse ? (
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem', textAlign: 'left' }}>
              Sản phẩm: <strong style={{ color: '#1e293b' }}>{item.itemName || item.name}</strong> ({item.sku || 'N/A'}) &mdash; Kho: <strong style={{ color: '#1e293b' }}>{selectedWarehouse.warehouseName || selectedWarehouse.warehouseCode}</strong>
            </p>
          ) : null}
        </div>
        <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Đóng">×</button>
      </div>

      <div className={styles.modalBody}>
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
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>STT</th>
                <th>Mã lô</th>
                <th>Ngày nhập</th>
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
                    <td>{formatDate(lot.entryDate)}</td>
                    <td>{lot.remainingQuantity ?? 0}</td>
                    <td className={styles.tdNumber}>
                      {formatCurrencyVnd(lot.sellingPrice)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ui-btn ui-btn--primary"
                        onClick={() => onPick(lot)}
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
      </div>

      <div className={styles.modalFooter}>
        <div className={styles.modalActions}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onBack}>
            Quay lại
          </button>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </dialog>
  );
}

LotPicker.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
  item: PropTypes.object,
  selectedWarehouse: PropTypes.object,
};
