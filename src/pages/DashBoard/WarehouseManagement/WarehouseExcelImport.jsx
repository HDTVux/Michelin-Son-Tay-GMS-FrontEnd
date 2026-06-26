import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  fetchWarehouseInventorySyncTemplate,
  fetchWarehousesAll,
  syncWarehouseInventoryExcel,
} from '../../../services/warehouseService.js';
import styles from './WarehouseExcelImport.module.css';

export default function WarehouseExcelImport() {
  useScrollToTop();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  const [originalFile, setOriginalFile] = useState(null);
  const [items, setItems] = useState([]);
  const [hasEdits, setHasEdits] = useState(false);

  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Search/Filter preview list
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setWarehouseLoading(true);
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const res = await fetchWarehousesAll(token);
        const payload = res?.data?.data ?? res?.data ?? res;
        const list = Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setWarehouses(list);

        // Auto-select first active warehouse
        const activeWarehouse = list.find((w) => w?.isActive === true) || list[0] || null;
        if (activeWarehouse?.warehouseId != null) {
          setSelectedWarehouseId(String(activeWarehouse.warehouseId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Không thể tải danh sách kho.');
        }
      } finally {
        if (!cancelled) setWarehouseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadTemplate = async () => {
    if (!selectedWarehouseId) {
      setError('Vui lòng chọn kho để xuất mẫu Excel.');
      return;
    }
    try {
      setIsDownloadingTemplate(true);
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      const { blob, filename } = await fetchWarehouseInventorySyncTemplate(Number(selectedWarehouseId), token);
      const url = globalThis.URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = filename || `inventory-sync-template-warehouse-${selectedWarehouseId}.xlsx`;
      globalThis.document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
      toast.success('Tải file mẫu Excel thành công.');
    } catch (err) {
      setError(err?.message || 'Không thể tải mẫu Excel.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Reset input to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to a 2D array
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Find the header row (contains SKU or Tên phụ tùng)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
          const row = rawRows[i];
          if (
            row.some((cell) => String(cell).toLowerCase().includes('sku')) &&
            row.some((cell) => String(cell).toLowerCase().includes('tên') || String(cell).toLowerCase().includes('phụ tùng'))
          ) {
            headerRowIndex = i;
            break;
          }
        }

        const startIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
        const parsed = [];

        for (let i = startIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          const sku = String(row[1] ?? '').trim();
          const itemName = String(row[2] ?? '').trim();
          
          if (!sku && !itemName) continue; // Skip empty rows

          parsed.push({
            id: i, // Local unique identifier
            stt: parsed.length + 1,
            sku,
            itemName,
            unit: String(row[3] ?? '').trim(),
            lotCode: String(row[4] ?? '').trim(),
            lotDate: String(row[5] ?? '').trim(),
            quantity: Number(row[6]) || 0,
            importPrice: Number(row[7]) || 0,
            markupMultiplier: Number(row[8]) || 1.3,
            notes: String(row[9] ?? '').trim(),
          });
        }

        setItems(parsed);
        setOriginalFile(file);
        setHasEdits(false);
        setEditingRowId(null);
        setError('');
        toast.success(`Đọc thành công ${parsed.length} dòng từ file Excel!`);
      } catch (err) {
        console.error(err);
        setError('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file hoặc tải file mẫu.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      if (!isExcel) {
        setError('Chỉ chấp nhận file Excel (.xlsx, .xls).');
        return;
      }
      
      const fileEvent = { target: { files: [file] } };
      handleFileChange(fileEvent);
    }
  };

  const handleDeleteRow = (id) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
    setHasEdits(true);
    toast.info('Đã xóa dòng phụ tùng khỏi danh sách.');
  };

  const startEditRow = (row) => {
    setEditingRowId(row.id);
    setEditValues({ ...row });
  };

  const handleEditChange = (field, val) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const saveEditRow = () => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === editingRowId) {
          const qty = Number(editValues.quantity);
          const price = Number(editValues.importPrice);
          const markup = Number(editValues.markupMultiplier);
          return {
            ...editValues,
            quantity: Number.isFinite(qty) && qty >= 0 ? qty : row.quantity,
            importPrice: Number.isFinite(price) && price >= 0 ? price : row.importPrice,
            markupMultiplier: Number.isFinite(markup) && markup > 0 ? markup : row.markupMultiplier,
          };
        }
        return row;
      })
    );
    setEditingRowId(null);
    setHasEdits(true);
    toast.success('Cập nhật dòng thành công.');
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
  };

  const handleConfirmSync = async () => {
    if (!selectedWarehouseId) {
      setError('Vui lòng chọn kho để đồng bộ.');
      return;
    }

    if (items.length === 0) {
      setError('Danh sách phụ tùng rỗng. Vui lòng chọn file Excel.');
      return;
    }

    // Check if there are any validation errors (e.g. negative quantities)
    const hasInvalidRow = items.some((row) => row.quantity < 0 || row.importPrice < 0 || !row.sku);
    if (hasInvalidRow) {
      setError('Có hàng chứa dữ liệu không hợp lệ (SKU trống hoặc số lượng/giá nhỏ hơn 0). Vui lòng sửa lại.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      let fileToUpload = originalFile;

      // If changes were made, reconstruct the Excel file structure
      if (hasEdits) {
        const wb = XLSX.utils.book_new();
        const exportRows = [
          [
            'STT',
            'SKU',
            'Tên phụ tùng',
            'Đơn vị',
            'Mã lô',
            'Ngày nhập',
            'Tồn lô',
            'Giá nhập (VNĐ)',
            'Hệ số markup',
            'Ghi chú',
          ],
        ];

        items.forEach((item, index) => {
          exportRows.push([
            index + 1,
            item.sku,
            item.itemName,
            item.unit,
            item.lotCode,
            item.lotDate,
            item.quantity,
            item.importPrice,
            item.markupMultiplier,
            item.notes,
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(wb, ws, 'InventorySync');
        
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        
        fileToUpload = new File([blob], originalFile?.name || 'inventory_sync_modified.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }

      const res = await syncWarehouseInventoryExcel(Number(selectedWarehouseId), fileToUpload, token);
      toast.success(res?.message || 'Đồng bộ tồn kho qua file Excel thành công!');
      
      // Delay before redirecting
      setTimeout(() => {
        navigate('/warehouse-management');
      }, 1500);
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra trong quá trình đồng bộ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.skus.add(item.sku);
        acc.qty += item.quantity;
        acc.amount += item.quantity * item.importPrice;
        return acc;
      },
      { skus: new Set(), qty: 0, amount: 0 }
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.sku.toLowerCase().includes(term) ||
        item.itemName.toLowerCase().includes(term) ||
        item.lotCode.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const formatCurrencyVnd = (value) => {
    if (value == null) return '0';
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <button className={styles.backBtn} onClick={() => navigate('/warehouse-management')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1>Nhập kho bằng Excel</h1>
            <p>Tải lên file Excel để đồng bộ danh sách phụ tùng và số lượng đã được làm phẳng</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.warehouseSelector}>
            <label htmlFor="import-warehouse">Kho nhận hàng:</label>
            <select
              id="import-warehouse"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              disabled={warehouseLoading || isSubmitting}
            >
              <option value="">Chọn kho...</option>
              {warehouses.map((w) => (
                <option key={String(w?.warehouseId ?? w?.warehouseCode)} value={String(w?.warehouseId ?? '')}>
                  {String(w?.warehouseName || w?.warehouseCode || w?.warehouseId || '-')}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={styles.ghostBtn}
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate || isSubmitting}
          >
            {isDownloadingTemplate ? 'Đang xuất mẫu...' : 'Tải Excel mẫu'}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Upload Zone */}
      {items.length === 0 ? (
        <div
          className={styles.dropZone}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>Kéo thả file Excel vào đây</h3>
          <p>hoặc nhấn để chọn file (.xlsx, .xls) từ máy tính</p>
          <div className={styles.specsHint}>
            Format tệp: STT | SKU | Tên phụ tùng | Đơn vị | Mã lô | Ngày nhập | Tồn lô | Giá nhập | Hệ số markup | Ghi chú
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className={styles.fileInput}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className={styles.workspace}>
          {/* Summary stats */}
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tổng số mã SKU</div>
              <div className={styles.statValue}>{totals.skus.size}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tổng số lượng tồn lô</div>
              <div className={styles.statValue}>{formatCurrencyVnd(totals.qty)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tổng tiền nhập dự kiến</div>
              <div className={styles.statValue}>{formatCurrencyVnd(totals.amount)} ₫</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>File đang chọn</div>
              <div className={styles.statValueText}>
                {originalFile?.name} {hasEdits && <span className={styles.editedBadge}>(Đã chỉnh sửa)</span>}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className={styles.previewPanel}>
            <div className={styles.panelHeader}>
              <h2>Xem trước danh sách phụ tùng đã làm phẳng</h2>
              <div className={styles.panelSearch}>
                <div className={styles.searchWrapper}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm nhanh SKU, tên phụ tùng, lô..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={styles.dangerGhostBtn}
                  onClick={() => {
                    setItems([]);
                    setOriginalFile(null);
                    setHasEdits(false);
                    setEditingRowId(null);
                  }}
                  disabled={isSubmitting}
                >
                  Chọn lại file
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>SKU</th>
                    <th>Tên phụ tùng</th>
                    <th>ĐVT</th>
                    <th>Mã lô</th>
                    <th>Ngày nhập</th>
                    <th>Tồn lô</th>
                    <th>Giá nhập</th>
                    <th>Hệ số markup</th>
                    <th>Ghi chú</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const isEditing = editingRowId === item.id;
                    const hasError = !item.sku || item.quantity < 0 || item.importPrice < 0;

                    return (
                      <tr key={item.id} className={hasError ? styles.errorRow : ''}>
                        <td>{idx + 1}</td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.sku}
                              onChange={(e) => handleEditChange('sku', e.target.value)}
                              className={styles.tableInput}
                            />
                          ) : (
                            <span className={styles.skuText}>{item.sku || <span className={styles.errorText}>LỖI: Rỗng</span>}</span>
                          )}
                        </td>
                        <td className={styles.itemNameCell}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.itemName}
                              onChange={(e) => handleEditChange('itemName', e.target.value)}
                              className={styles.tableInput}
                            />
                          ) : (
                            item.itemName || '-'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.unit}
                              onChange={(e) => handleEditChange('unit', e.target.value)}
                              className={styles.tableInput}
                            />
                          ) : (
                            item.unit || '-'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.lotCode}
                              onChange={(e) => handleEditChange('lotCode', e.target.value)}
                              className={styles.tableInput}
                            />
                          ) : (
                            item.lotCode || <span className={styles.italicText}>Không có</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.lotDate}
                              onChange={(e) => handleEditChange('lotDate', e.target.value)}
                              className={styles.tableInput}
                            />
                          ) : (
                            item.lotDate || '-'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.quantity}
                              onChange={(e) => handleEditChange('quantity', e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          ) : (
                            <strong className={item.quantity <= 0 ? styles.errorText : ''}>
                              {formatCurrencyVnd(item.quantity)}
                            </strong>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.importPrice}
                              onChange={(e) => handleEditChange('importPrice', e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          ) : (
                            `${formatCurrencyVnd(item.importPrice)} ₫`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.markupMultiplier}
                              onChange={(e) => handleEditChange('markupMultiplier', e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          ) : (
                            item.markupMultiplier
                          )}
                        </td>
                        <td className={styles.noteCell}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.notes}
                              onChange={(e) => handleEditChange('notes', e.target.value)}
                              className={styles.tableInput}
                            />
                          ) : (
                            item.notes || '-'
                          )}
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {isEditing ? (
                              <>
                                <button type="button" className={styles.saveBtn} onClick={saveEditRow}>
                                  Lưu
                                </button>
                                <button type="button" className={styles.cancelBtn} onClick={cancelEditRow}>
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.editBtn}
                                  onClick={() => startEditRow(item)}
                                  disabled={isSubmitting}
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteBtn}
                                  onClick={() => handleDeleteRow(item.id)}
                                  disabled={isSubmitting}
                                >
                                  Xóa
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.submitPanel}>
              <div className={styles.submitLeft}>
                {hasEdits && (
                  <span className={styles.warningText}>
                    * Bạn đã thay đổi dữ liệu xem trước. File mới sẽ được tự động tạo khi bạn bấm xác nhận.
                  </span>
                )}
              </div>
              <div className={styles.submitActions}>
                <button
                  type="button"
                  className={styles.cancelMainBtn}
                  onClick={() => navigate('/warehouse-management')}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={handleConfirmSync}
                  disabled={isSubmitting || items.length === 0}
                >
                  {isSubmitting ? 'Đang đồng bộ...' : 'Xác nhận đồng bộ kho'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
