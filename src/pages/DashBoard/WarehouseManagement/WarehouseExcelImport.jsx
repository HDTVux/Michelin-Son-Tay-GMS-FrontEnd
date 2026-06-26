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
            categoryName: String(row[3] ?? '').trim(),
            brandName: String(row[4] ?? '').trim(),
            productLineName: String(row[5] ?? '').trim(),
            unit: String(row[6] ?? '').trim(),
            price: Number(row[7]) || 0, // Giá bán
            showPrice: String(row[8] ?? '').trim().toLowerCase() === 'không' || String(row[8] ?? '').trim() === '0' ? false : true,
            warrantyDurationMonths: Number(row[9]) || 0,
            origin: String(row[10] ?? '').trim(),
            color: String(row[11] ?? '').trim(),
            compatibleCars: String(row[12] ?? '').trim(),
            description: String(row[13] ?? '').trim(),
            taxName: String(row[14] ?? '').trim(),
            lotCode: String(row[15] ?? '').trim(),
            lotDate: String(row[16] ?? '').trim(),
            quantity: Number(row[17]) || 0, // Tồn lô
            importPrice: Number(row[18]) || 0, // Giá nhập
            markupMultiplier: Number(row[19]) || 1.3,
            notes: String(row[20] ?? '').trim(),
            totalStock: Number(row[21]) || 0, // Tổng tồn kho
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
          const priceBuy = Number(editValues.importPrice);
          const priceSell = Number(editValues.price);
          const markup = Number(editValues.markupMultiplier);
          return {
            ...editValues,
            quantity: Number.isFinite(qty) && qty >= 0 ? qty : row.quantity,
            importPrice: Number.isFinite(priceBuy) && priceBuy >= 0 ? priceBuy : row.importPrice,
            price: Number.isFinite(priceSell) && priceSell >= 0 ? priceSell : row.price,
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

  // Real-time Data Integrity & Duplicate Check
  const validatedItems = useMemo(() => {
    return items.map((item) => {
      const errors = [];
      if (!item.sku) {
        errors.push('SKU không được rỗng');
      }
      if (!item.itemName) {
        errors.push('Tên phụ tùng không được rỗng');
      }
      if (item.quantity < 0) {
        errors.push('Tồn lô không được nhỏ hơn 0');
      }
      if (item.importPrice < 0) {
        errors.push('Giá nhập không được nhỏ hơn 0');
      }
      if (item.price < 0) {
        errors.push('Giá bán không được nhỏ hơn 0');
      }
      if (item.markupMultiplier <= 0) {
        errors.push('Hệ số markup phải lớn hơn 0');
      }

      // Duplicate Check
      if (item.sku) {
        // 1. Same SKU and Same Lot Code
        const sameSkuAndLot = items.filter(
          (x) => x.id !== item.id &&
                 x.sku &&
                 x.sku.trim().toLowerCase() === item.sku.trim().toLowerCase() &&
                 x.lotCode &&
                 x.lotCode.trim().toLowerCase() === item.lotCode.trim().toLowerCase()
        );
        if (sameSkuAndLot.length > 0 && item.lotCode && item.lotCode.trim()) {
          errors.push(`Trùng mã lô "${item.lotCode}" cho cùng mã SKU`);
        }

        // 2. Conflict in product details for same SKU
        const sameSkuDifferentDetails = items.filter(
          (x) => x.id !== item.id &&
                 x.sku &&
                 x.sku.trim().toLowerCase() === item.sku.trim().toLowerCase() &&
                 (x.itemName !== item.itemName ||
                  x.unit !== item.unit ||
                  x.price !== item.price ||
                  x.brandName !== item.brandName ||
                  x.categoryName !== item.categoryName)
        );
        if (sameSkuDifferentDetails.length > 0) {
          errors.push('Mâu thuẫn thông tin sản phẩm (Tên, ĐVT, Hãng, nhóm) cùng SKU');
        }
      }

      return {
        ...item,
        errors,
      };
    });
  }, [items]);

  const hasErrors = useMemo(() => {
    return validatedItems.some((row) => row.errors.length > 0);
  }, [validatedItems]);

  const handleConfirmSync = async () => {
    if (!selectedWarehouseId) {
      setError('Vui lòng chọn kho để đồng bộ.');
      return;
    }

    if (items.length === 0) {
      setError('Danh sách phụ tùng rỗng. Vui lòng chọn file Excel.');
      return;
    }

    if (hasErrors) {
      setError('Có hàng chứa dữ liệu không hợp lệ hoặc bị trùng lặp. Vui lòng sửa lại các dòng lỗi.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
      let fileToUpload = originalFile;

      // Always reconstruct sheet with full 22 columns to be uploaded to backend
      const wb = XLSX.utils.book_new();
      const exportRows = [
        [
          'STT',
          'SKU',
          'Tên phụ tùng',
          'Hạng mục',
          'Hãng sản xuất',
          'Dòng sản phẩm',
          'Đơn vị tính',
          'Giá bán (VNĐ)',
          'Hiển thị giá',
          'Bảo hành (tháng)',
          'Xuất xứ',
          'Màu sắc',
          'Xe tương thích',
          'Mô tả',
          'Thuế',
          'Mã lô',
          'Ngày nhập',
          'Tồn lô',
          'Giá nhập (VNĐ)',
          'Hệ số markup',
          'Ghi chú',
          'Tổng tồn kho',
        ],
      ];

      items.forEach((item, index) => {
        exportRows.push([
          index + 1,
          item.sku,
          item.itemName,
          item.categoryName || '',
          item.brandName || '',
          item.productLineName || '',
          item.unit || '',
          item.price || 0,
          item.showPrice ? 'Có' : 'Không',
          item.warrantyDurationMonths || 0,
          item.origin || '',
          item.color || '',
          item.compatibleCars || '',
          item.description || '',
          item.taxName || '',
          item.lotCode || '',
          item.lotDate || '',
          item.quantity || 0,
          item.importPrice || 0,
          item.markupMultiplier || 1.3,
          item.notes || '',
          item.totalStock || 0,
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

      const res = await syncWarehouseInventoryExcel(Number(selectedWarehouseId), fileToUpload, token);
      const payload = res?.data ?? res;
      if (payload?.syncEntryId) {
        toast.success(`Tạo phiếu nhập kho nháp #${payload.syncEntryId} thành công!`);
      } else {
        toast.info('Đồng bộ thành công (Không có tồn kho tăng thêm, không tạo phiếu mới).');
      }
      
      // Delay before redirecting
      setTimeout(() => {
        navigate('/warehouse-stock-entries', { state: { warehouseId: selectedWarehouseId } });
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
    if (!searchTerm.trim()) return validatedItems;
    const term = searchTerm.toLowerCase();
    return validatedItems.filter(
      (item) =>
        item.sku.toLowerCase().includes(term) ||
        item.itemName.toLowerCase().includes(term) ||
        item.lotCode.toLowerCase().includes(term)
    );
  }, [validatedItems, searchTerm]);

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
            <h1>Nhập kho bằng Excel (Nhập thêm)</h1>
            <p>Tải lên file Excel đầy đủ thuộc tính sản phẩm để cập nhật thông tin và nhập thêm tồn kho</p>
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
            Format tệp (22 cột): STT | SKU | Tên | Hạng mục | Hãng | Dòng sản phẩm | ĐVT | Giá bán | Hiển thị giá | Bảo hành | Xuất xứ | Màu | Xe tương thích | Mô tả | Thuế | Mã lô | Ngày nhập | Tồn lô | Giá nhập | Markup | Ghi chú | Tổng tồn kho
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
              <div className={styles.statLabel}>Tổng số lượng tồn lô nhập</div>
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
              <h2>Xem trước danh sách sản phẩm & lô hàng</h2>
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
                    <th>Giá bán</th>
                    <th>Mã lô</th>
                    <th>Ngày nhập</th>
                    <th>Tồn lô</th>
                    <th>Giá nhập</th>
                    <th>Hệ số markup</th>
                    <th>Ghi chú</th>
                    <th>Tổng tồn</th>
                    <th>Trạng thái / Lỗi</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const isEditing = editingRowId === item.id;
                    const rowErrors = item.errors || [];
                    const isRowInvalid = rowErrors.length > 0;

                    return (
                      <tr key={item.id} className={isRowInvalid ? styles.errorRow : ''}>
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
                              type="number"
                              value={editValues.price}
                              onChange={(e) => handleEditChange('price', e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          ) : (
                            `${formatCurrencyVnd(item.price)} ₫`
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
                          <strong>{formatCurrencyVnd(item.totalStock)}</strong>
                        </td>
                        <td className={styles.errorCell}>
                          {isRowInvalid ? (
                            <ul className={styles.errorList}>
                              {rowErrors.map((err, errIdx) => (
                                <li key={errIdx} className={styles.errorItem}>{err}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className={styles.successBadge}>Hợp lệ</span>
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
                {hasErrors ? (
                  <span className={styles.errorText}>
                    * Có dữ liệu lỗi hoặc trùng lặp trong danh sách xem trước. Vui lòng sửa hoặc xóa để tiếp tục.
                  </span>
                ) : hasEdits ? (
                  <span className={styles.warningText}>
                    * Bạn đã thay đổi dữ liệu xem trước. File mới sẽ được tự động tạo khi bạn bấm xác nhận.
                  </span>
                ) : null}
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
                  disabled={isSubmitting || items.length === 0 || hasErrors}
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
