import { useEffect, useState, useMemo } from 'react';
import { fetchComboItems, saveComboItems } from '../../../services/comboService.js';
import { fetchCatalogItems } from '../../../services/blogService.js';
import { searchWarehouseCatalogItemsDetail } from '../../../services/warehouseService.js';
import styles from './ServiceManagement.module.css';
import { Search, Plus, Trash2, X, Settings } from 'lucide-react';

const getLotsForCatalogItem = (catalogItem) => {
  if (!catalogItem) return [];
  const warehouses = catalogItem.warehouseDetails || [];
  const lots = [];
  warehouses.forEach(w => {
    if (Array.isArray(w.lots)) {
      w.lots.forEach(lot => {
        if ((lot.remainingQuantity || 0) > 0) {
          lots.push({
            ...lot,
            warehouseId: w.warehouseId,
            warehouseName: w.warehouseName || w.warehouseCode || `Kho #${w.warehouseId}`
          });
        }
      });
    }
  });
  return lots;
};

export default function ComboItemsConfigModal({ isOpen, onClose, comboItem }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subItems, setSubItems] = useState([]);
  const [catalogList, setCatalogList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState(null);
  const [odometerKmToAdd, setOdometerKmToAdd] = useState(0);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [allocationMethodToAdd, setAllocationMethodToAdd] = useState('FIFO');
  const [entryItemIdToAdd, setEntryItemIdToAdd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch catalog list & existing combo items
  useEffect(() => {
    if (!isOpen || !comboItem) return;

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

    const loadCatalog = async () => {
      try {
        const [servicesRes, partsRes] = await Promise.all([
          searchWarehouseCatalogItemsDetail({ size: 1000, itemType: 'SERVICE' }, token).catch(() => null),
          searchWarehouseCatalogItemsDetail({ size: 1000, itemType: 'PART' }, token).catch(() => null)
        ]);

        const extractList = (res) => {
          const payload = res?.data?.data ?? res?.data ?? res;
          return Array.isArray(payload?.content) ? payload.content : (Array.isArray(payload) ? payload : []);
        };

        const services = extractList(servicesRes);
        const parts = extractList(partsRes);
        setCatalogList([...services, ...parts]);
      } catch (err) {
        console.error('Failed to load catalog items for combo configurations:', err);
      }
    };

    const loadComboItems = async () => {
      try {
        setIsLoading(true);
        setError('');
        setSuccess('');
        const res = await fetchComboItems(comboItem.itemId, null, token);
        const payload = res?.data?.data ?? res?.data ?? res;
        const data = Array.isArray(payload) ? payload : [];
        setSubItems(data);
      } catch (err) {
        setError(err?.message || 'Không thể tải danh sách sản phẩm trong combo.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCatalog();
    loadComboItems();
    setSelectedItemToAdd(null);
    setSearchQuery('');
  }, [isOpen, comboItem]);

  // Catalog mapping for lookup
  const catalogMap = useMemo(() => {
    const map = new Map();
    catalogList.forEach(item => {
      if (item.itemId != null) {
        map.set(Number(item.itemId), item);
      }
    });
    return map;
  }, [catalogList]);

  // Autocomplete search
  const filteredCatalog = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    return catalogList.filter(item => {
      const matchName = String(item.itemName || '').toLowerCase().includes(query);
      const matchSku = String(item.sku || '').toLowerCase().includes(query);
      return matchName || matchSku;
    }).slice(0, 10);
  }, [catalogList, searchQuery]);

  // Add local item to combo
  const handleAddLocalItem = () => {
    if (!selectedItemToAdd) return;
    const includedItemId = Number(selectedItemToAdd.itemId);
    const quantity = Number(quantityToAdd) || 1;
    const odometerKm = Number(odometerKmToAdd) || 0;
    const allocationMethod = selectedItemToAdd.itemType === 'PART' ? allocationMethodToAdd : 'FIFO';
    const entryItemId = (selectedItemToAdd.itemType === 'PART' && allocationMethod === 'MANUAL' && entryItemIdToAdd)
      ? Number(entryItemIdToAdd)
      : null;

    // Check duplicate
    const duplicateIndex = subItems.findIndex(
      item => Number(item.includedItemId) === includedItemId && 
              Number(item.odometerKm || 0) === odometerKm &&
              (item.allocationMethod || 'FIFO') === allocationMethod &&
              (item.entryItemId || null) === entryItemId
    );

    if (duplicateIndex !== -1) {
      const next = [...subItems];
      next[duplicateIndex].quantity = (next[duplicateIndex].quantity || 0) + quantity;
      setSubItems(next);
    } else {
      setSubItems([...subItems, {
        includedItemId,
        quantity,
        odometerKm,
        allocationMethod,
        entryItemId,
        comboId: comboItem.itemId
      }]);
    }

    setSelectedItemToAdd(null);
    setSearchQuery('');
    setQuantityToAdd(1);
    setOdometerKmToAdd(0);
    setAllocationMethodToAdd('FIFO');
    setEntryItemIdToAdd('');
  };

  // Remove local item
  const handleRemoveLocalItem = (index) => {
    const next = [...subItems];
    next.splice(index, 1);
    setSubItems(next);
  };

  // Edit quantity inline
  const handleQtyChange = (index, value) => {
    const next = [...subItems];
    next[index].quantity = Math.max(1, Number(value) || 1);
    setSubItems(next);
  };

  // Edit odometer km inline
  const handleOdometerChange = (index, value) => {
    const next = [...subItems];
    next[index].odometerKm = Math.max(0, Number(value) || 0);
    setSubItems(next);
  };

  const handleAllocationMethodChange = (index, value) => {
    const next = [...subItems];
    next[index].allocationMethod = value;
    if (value === 'FIFO') {
      next[index].entryItemId = null;
    } else {
      const matchedCatalog = catalogMap.get(Number(next[index].includedItemId));
      const lots = getLotsForCatalogItem(matchedCatalog);
      next[index].entryItemId = lots[0]?.entryItemId || null;
    }
    setSubItems(next);
  };

  const handleEntryItemIdChange = (index, value) => {
    const next = [...subItems];
    next[index].entryItemId = value ? Number(value) : null;
    setSubItems(next);
  };

  // Save config to backend
  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      
      const payload = subItems.map(item => ({
        comboItemId: item.comboItemId || null,
        comboId: comboItem.itemId,
        includedItemId: item.includedItemId,
        quantity: item.quantity,
        odometerKm: item.odometerKm || 0,
        allocationMethod: item.allocationMethod || 'FIFO',
        entryItemId: item.entryItemId || null
      }));

      await saveComboItems(comboItem.itemId, payload, token);
      setSuccess('Cập nhật cấu hình Combo thành công!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Không thể lưu cấu hình Combo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-box']} style={{ maxWidth: '800px', width: '100%', borderRadius: '12px' }}>
        <div className={styles['modal-header']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings className={styles['header-icon']} size={20} style={{ color: '#9333ea' }} />
            <h3>Cấu hình Combo cho dịch vụ: {comboItem?.itemName}</h3>
          </div>
          <button className={styles['modal-close']} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles['modal-body']} style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '20px' }}>
          {error && <div className={styles['error-banner']} style={{ marginBottom: '15px' }}>{error}</div>}
          {success && <div className={styles['success-banner']} style={{ marginBottom: '15px', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '6px', fontWeight: 500 }}>{success}</div>}

          {/* Input Form Section */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Thêm phụ tùng hoặc dịch vụ con vào Combo
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px auto', gap: '12px', alignItems: 'end', position: 'relative' }}>
              
              {/* Autocomplete picker */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                  Tìm phụ tùng hoặc dịch vụ
                </label>
                {selectedItemToAdd ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', border: '1px solid #c084fc', padding: '8px 12px', borderRadius: '6px', background: '#faf5ff' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 500 }}>
                      [{selectedItemToAdd.itemType === 'SERVICE' ? 'Dịch vụ' : 'Phụ tùng'}] {selectedItemToAdd.itemName}
                    </span>
                    <button 
                      onClick={() => setSelectedItemToAdd(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', display: 'flex', marginLeft: 'auto' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', padding: '0 8px' }}>
                    <Search size={16} color="#94a3b8" />
                    <input
                      placeholder="Gõ tìm kiếm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', border: 'none', outline: 'none', padding: '8px', fontSize: '12.5px' }}
                    />
                  </div>
                )}

                {/* Autocomplete list */}
                {!selectedItemToAdd && filteredCatalog.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 1000, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                    {filteredCatalog.map(item => (
                      <div
                        key={item.itemId}
                        onClick={() => {
                          setSelectedItemToAdd(item);
                          setSearchQuery('');
                        }}
                        style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontWeight: 500 }}>
                          [{item.itemType === 'SERVICE' ? 'DV' : 'PT'}] {item.itemName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          SKU: {item.sku || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Odometer Milestone */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                  Mốc bảo dưỡng (km)
                </label>
                <select
                  value={String(odometerKmToAdd)}
                  onChange={(e) => setOdometerKmToAdd(Number(e.target.value))}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px', fontSize: '12.5px', background: '#fff', outline: 'none' }}
                >
                  <option value="0">Mặc định (Mọi mốc)</option>
                  <option value="5000">5.000 km</option>
                  <option value="10000">10.000 km</option>
                  <option value="20000">20.000 km</option>
                  <option value="40000">40.000 km</option>
                  <option value="80000">80.000 km</option>
                </select>
              </div>

              {/* Qty */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                  Số lượng
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px', fontSize: '12.5px', outline: 'none' }}
                />
              </div>

              {/* Add trigger */}
              <button
                type="button"
                className={styles['primary-button']}
                onClick={handleAddLocalItem}
                disabled={!selectedItemToAdd}
                style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 12px' }}
              >
                <Plus size={16} /> Thêm
              </button>

            </div>
          </div>

          {/* Sub-items table list */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Danh sách thành phần có trong Combo ({subItems.length})
            </h4>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Đang tải danh sách Combo...</div>
            ) : subItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', border: '2px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                Combo chưa chứa sản phẩm nào. Hãy tìm và thêm ở trên.
              </div>
            ) : (
              <div className={styles['table-wrapper']} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className={styles['service-table']} style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>STT</th>
                      <th>TÊN PHỤ TÙNG / DỊCH VỤ CON</th>
                      <th style={{ width: '90px' }}>LOẠI</th>
                      <th style={{ width: '130px' }}>MỐC KM BẢO DƯỠNG</th>
                      <th style={{ width: '140px' }}>PHƯƠNG THỨC CẤP PHÁT</th>
                      <th style={{ width: '200px' }}>LÔ HÀNG THỦ CÔNG</th>
                      <th style={{ width: '90px' }}>SỐ LƯỢNG</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>XÓA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subItems.map((item, idx) => {
                      const matchedCatalog = catalogMap.get(Number(item.includedItemId));
                      const isPart = matchedCatalog?.itemType === 'PART';
                      const lots = getLotsForCatalogItem(matchedCatalog);
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 500, color: '#1e293b' }}>
                              {matchedCatalog?.itemName || 'Sản phẩm #' + item.includedItemId}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                              Mã SKU: {matchedCatalog?.sku || '-'}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                              {isPart ? 'Phụ tùng' : 'Dịch vụ'}
                            </span>
                          </td>
                          <td>
                            <select
                              value={String(item.odometerKm || 0)}
                              onChange={(e) => handleOdometerChange(idx, e.target.value)}
                              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '12px', background: '#fff' }}
                            >
                              <option value="0">Mặc định (Mọi mốc)</option>
                              <option value="5000">5.000 km</option>
                              <option value="10000">10.000 km</option>
                              <option value="20000">20.000 km</option>
                              <option value="40000">40.000 km</option>
                              <option value="80000">80.000 km</option>
                            </select>
                          </td>
                          <td>
                            {isPart ? (
                              <select
                                value={item.allocationMethod || 'FIFO'}
                                onChange={(e) => handleAllocationMethodChange(idx, e.target.value)}
                                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '11.5px', background: '#fff' }}
                              >
                                <option value="FIFO">FIFO (Tự động)</option>
                                <option value="MANUAL">Chọn lô thủ công</option>
                              </select>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '11.5px' }}>Tự động (FIFO)</span>
                            )}
                          </td>
                          <td>
                            {isPart && (item.allocationMethod === 'MANUAL') ? (
                              <select
                                value={item.entryItemId || ''}
                                onChange={(e) => handleEntryItemIdChange(idx, e.target.value)}
                                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '11.5px', background: '#fff' }}
                              >
                                <option value="">-- Chọn lô hàng --</option>
                                {lots.map(lot => (
                                  <option key={lot.entryItemId} value={lot.entryItemId}>
                                    {lot.entryCode} ({lot.warehouseName} - Còn {lot.remainingQuantity} - Giá {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lot.sellingPrice)})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Không áp dụng</span>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              style={{ width: '50px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', textAlign: 'center', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveLocalItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className={styles['modal-footer']} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button className={styles['ghost-button']} onClick={onClose} disabled={isSaving}>
            Hủy bỏ
          </button>
          <button className={styles['primary-button']} onClick={handleSaveConfig} disabled={isSaving || isLoading}>
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>
    </div>
  );
}
