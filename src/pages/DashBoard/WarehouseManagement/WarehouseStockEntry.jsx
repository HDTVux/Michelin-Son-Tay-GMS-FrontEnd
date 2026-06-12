import {
  readNumber,
  validateSupplierName,
  validateNotes,
  validateWarehouseQuantity,
  validateWarehouseImportPrice,
  validateWarehouseMarkupMultiplier,
} from '../../../components/inputValidation.js';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  createWarehouseStockEntryWithAttachment,
  fetchWarehousesAll,
  searchWarehouseCatalogItems,
} from '../../../services/warehouseService.js';
import styles from './WarehouseStockEntry.module.css';

const DEFAULT_WAREHOUSE_ID = 1;
const DRAFT_STORAGE_KEY = 'warehouse-stock-entry-draft-v1';

const toWarehouseIdText = (value) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
};

const getWarehouseIdText = (warehouse) =>
  toWarehouseIdText(warehouse?.warehouseId ?? warehouse?.warehouseID ?? warehouse?.id);

const getWarehouseLabel = (warehouse, fallbackIdText = '') => {
  const raw = String(
    warehouse?.warehouseName ||
      warehouse?.warehouseCode ||
      warehouse?.name ||
      warehouse?.warehouseId ||
      warehouse?.warehouseID ||
      warehouse?.id ||
      fallbackIdText ||
      '',
  ).trim();
  return raw || (fallbackIdText ? `KHO #${fallbackIdText}` : '-');
};

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(num)) return '-';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
};



const extractCatalogItems = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const mapCatalogItem = (item) => ({
  itemId: Number(item?.itemId ?? item?.id ?? 0) || 0,
  itemName: String(item?.itemName ?? item?.name ?? '').trim(),
  itemType: String(item?.itemType ?? item?.item_type ?? item?.type ?? item?.categoryType ?? '').trim(),
  sku: String(item?.sku ?? '').trim(),
  partNumber: String(item?.partNumber ?? '').trim(),
  barcode: String(item?.barcode ?? '').trim(),
  unit: String(item?.unit ?? '').trim(),
  brandId: item?.brandId ?? null,
  productLineId: item?.productLineId ?? null,
});

const isPartCatalogItem = (item) => {
  const typeText = String(item?.itemType ?? item?.item_type ?? item?.type ?? item?.categoryType ?? '').trim().toLowerCase();
  return typeText === 'part' || typeText === 'parts';
};

// Validation constants
const SUPPLIER_NAME_MAX_LENGTH = 100;
const NOTES_MAX_LENGTH = 500;
const QUANTITY_MAX_VALUE = 999999;
const IMPORT_PRICE_MAX_VALUE = 999999999;
const MARKUP_MULTIPLIER_MAX_VALUE = 999.99;

const buildDraftPayload = (warehouseId, supplierName, notes, selectedItems) => ({
  warehouseId: Number(warehouseId) || DEFAULT_WAREHOUSE_ID,
  supplierName: String(supplierName || '').trim(),
  notes: String(notes || '').trim(),
  items: (Array.isArray(selectedItems) ? selectedItems : []).map((row) => ({
    itemId: Number(row.itemId) || 0,
    quantity: Number(row.quantity) || 0,
    importPrice: Number(row.importPrice) || 0,
    markupMultiplier: Number(row.markupMultiplier) || 0,
  })),
});

export default function WarehouseStockEntry() {
  useScrollToTop();
  const navigate = useNavigate();

  const notify = (message) => toast(message, { containerId: 'app-toast' });

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [warehouseError, setWarehouseError] = useState('');
  const [warehouseId, setWarehouseId] = useState(String(DEFAULT_WAREHOUSE_ID));

  const [supplierName, setSupplierName] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') return;
      if (draft.warehouseId != null) setWarehouseId(toWarehouseIdText(draft.warehouseId) || String(DEFAULT_WAREHOUSE_ID));
      if (typeof draft.supplierName === 'string') setSupplierName(draft.supplierName);
      if (typeof draft.notes === 'string') setNotes(draft.notes);
      if (Array.isArray(draft.selectedItems)) {
        setSelectedItems(
          draft.selectedItems
            .map((row) => ({
              ...mapCatalogItem(row),
              quantity: String(row?.quantity ?? '1'),
              importPrice: String(row?.importPrice ?? ''),
              markupMultiplier: String(row?.markupMultiplier ?? '1'),
            }))
            .filter((row) => row.itemId),
        );
      }
    } catch {
      // Ignore malformed draft data.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setWarehouseLoading(true);
        setWarehouseError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const res = await fetchWarehousesAll(token);
        const payload = res?.data?.data ?? res?.data ?? res;
        const list = Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setWarehouses(list);
      } catch (err) {
        if (cancelled) return;
        setWarehouses([]);
        setWarehouseError(err?.message || 'Không thể tải danh sách kho.');
      } finally {
        if (!cancelled) setWarehouseLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(warehouses) || warehouses.length === 0) return;

    const currentIdText = toWarehouseIdText(warehouseId);
    const hasCurrent = Boolean(currentIdText) && warehouses.some((w) => getWarehouseIdText(w) === currentIdText);
    if (hasCurrent) return;

    const firstActive =
      warehouses.find((w) => w?.isActive === true && getWarehouseIdText(w)) ||
      warehouses.find((w) => getWarehouseIdText(w)) ||
      null;

    const nextIdText = getWarehouseIdText(firstActive) || String(DEFAULT_WAREHOUSE_ID);
    if (nextIdText && nextIdText !== currentIdText) setWarehouseId(nextIdText);
  }, [warehouses, warehouseId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSubmittedKeyword(keyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;

    const keywordValue = String(submittedKeyword || '').trim();

    if (!keywordValue) {
      setCatalogItems([]);
      setSearchError('');
      setSearchLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        setSearchLoading(true);
        setSearchError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
        const res = await searchWarehouseCatalogItems(
          {
            search: keywordValue,
            itemType: 'PART',
            isActive: true,
            page: 0,
            size: 30,
          },
          token,
        );
        const list = extractCatalogItems(res)
          .map(mapCatalogItem)
          .filter((item) => item.itemId && isPartCatalogItem(item));
        if (cancelled) return;
        setCatalogItems(list);
      } catch (err) {
        if (cancelled) return;
        setCatalogItems([]);
        setSearchError(err?.message || 'Không thể tìm phụ tùng.');
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [submittedKeyword]);

  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map((row) => Number(row.itemId)).filter((value) => Number.isFinite(value))),
    [selectedItems],
  );

  const selectedTotals = useMemo(() => {
    return selectedItems.reduce(
      (acc, row) => {
        const quantity = readNumber(row.quantity);
        const importPrice = readNumber(row.importPrice);
        if (Number.isFinite(quantity)) acc.quantity += quantity;
        if (Number.isFinite(importPrice) && Number.isFinite(quantity)) acc.amount += quantity * importPrice;
        return acc;
      },
      { quantity: 0, amount: 0 },
    );
  }, [selectedItems]);

  const catalogContent = searchLoading ? null : catalogItems;
  const hasCatalogResults = Array.isArray(catalogContent) && catalogContent.length > 0;

  let catalogResultsContent;
  if (searchLoading) {
    catalogResultsContent = <div className={styles.emptyState}>Đang tải dữ liệu...</div>;
  } else if (hasCatalogResults) {
    catalogResultsContent = (
      <div className={styles.resultsList}>
        {catalogItems.map((item) => {
          const alreadyAdded = selectedItemIds.has(Number(item.itemId));
          return (
            <article key={String(item.itemId)} className={styles.resultRow}>
              <div className={styles.resultMain}>
                <div className={styles.resultTitle}>{item.itemName || '-'}</div>
                <div className={styles.resultMeta}>
                  <span>ID: {item.itemId}</span>
                  <span>SKU: {item.sku || '-'}</span>
                  <span>PN: {item.partNumber || '-'}</span>
                  <span>ĐV: {item.unit || '-'}</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addCatalogItem(item)}
                disabled={alreadyAdded}
              >
                {alreadyAdded ? 'Đã thêm' : 'Thêm'}
              </button>
            </article>
          );
        })}
      </div>
    );
  } else {
    catalogResultsContent = <div className={styles.emptyState}>Không có kết quả phù hợp.</div>;
  }

  const addCatalogItem = (item) => {
    const mapped = mapCatalogItem(item);
    if (!mapped.itemId) return;
    setSelectedItems((prev) => {
      if (prev.some((row) => Number(row.itemId) === Number(mapped.itemId))) return prev;
      return [
        ...prev,
        {
          ...mapped,
          quantity: '1',
          importPrice: '',
          markupMultiplier: '1',
        },
      ];
    });
  };

  const [rowErrors, setRowErrors] = useState({});

  const getFieldError = (field, value) => {
    if (field === 'quantity') {
      const validation = validateWarehouseQuantity(value);
      return validation.error;
    }
    if (field === 'importPrice') {
      const validation = validateWarehouseImportPrice(value);
      return validation.error;
    }
    if (field === 'markupMultiplier') {
      const validation = validateWarehouseMarkupMultiplier(value);
      return validation.error;
    }
    return '';
  };

  const updateSelectedItem = (itemId, field, value) => {
    const error = getFieldError(field, value);
    setRowErrors((prevErrs) => ({ ...prevErrs, [`${itemId}_${field}`]: error }));
    setSelectedItems((prev) =>
      prev.map((row) => {
        if (Number(row.itemId) === Number(itemId)) {
          return { ...row, [field]: value };
        }
        return row;
      }),
    );
  };

  const removeSelectedItem = (itemId) => {
    setSelectedItems((prev) => prev.filter((row) => Number(row.itemId) !== Number(itemId)));
  };


  const handleSubmit = async () => {
    const warehouseIdText = toWarehouseIdText(warehouseId);
    if (!warehouseIdText) {
      notify('Vui lòng chọn kho.');
      return;
    }

    if (attachmentFile) {
      const mime = String(attachmentFile?.type || '').toLowerCase();
      const name = String(attachmentFile?.name || '').toLowerCase();
      const looksLikeImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
      if (!looksLikeImage) {
        notify('Chứng từ chỉ chấp nhận ảnh.');
        return;
      }
    }

    const supplierValidation = validateSupplierName(supplierName);
    if (!supplierValidation.valid) {
      notify(supplierValidation.error);
      return;
    }

    const notesValidation = validateNotes(notes);
    if (!notesValidation.valid) {
      notify(notesValidation.error);
      return;
    }

    if (selectedItems.length === 0) {
      notify('Vui lòng thêm ít nhất 1 hàng vào bảng nhập.');
      return;
    }

    const invalidRow = selectedItems.find((row) => {
      const quantityValidation = validateWarehouseQuantity(row.quantity);
      const importPriceValidation = validateWarehouseImportPrice(row.importPrice);
      const markupValidation = validateWarehouseMarkupMultiplier(row.markupMultiplier);
      return !quantityValidation.valid || !importPriceValidation.valid || !markupValidation.valid;
    });

    if (invalidRow) {
      const quantityValidation = validateWarehouseQuantity(invalidRow.quantity);
      const importPriceValidation = validateWarehouseImportPrice(invalidRow.importPrice);
      const markupValidation = validateWarehouseMarkupMultiplier(invalidRow.markupMultiplier);
      
      let errorMsg = '';
      if (quantityValidation.valid === false) {
        errorMsg = quantityValidation.error;
      } else if (importPriceValidation.valid === false) {
        errorMsg = importPriceValidation.error;
      } else {
        errorMsg = markupValidation.error;
      }
      
      notify(`${errorMsg} (${invalidRow.itemName || invalidRow.sku || invalidRow.itemId})`);
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để xác nhận nhập kho.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = buildDraftPayload(warehouseIdText, supplierName, notes, selectedItems);
      const response = await createWarehouseStockEntryWithAttachment(payload, attachmentFile, token);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      notify(response?.message || 'Xác nhận nhập kho thành công.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const message = err?.message || 'Không thể xác nhận nhập kho.';
      notify(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setSupplierName('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setKeyword('');
    setSubmittedKeyword('');
    setCatalogItems([]);
    setSelectedItems([]);
    setAttachmentFile(null);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.heroCard}>
          <div className={styles.headerMain}>
            <div>
              <h1 className={styles.title}>Phiếu nhập kho</h1>
              <p className={styles.subtitle}>Chọn phụ tùng theo keyword, thêm vào bảng nhập và xác nhận bằng file đính kèm.</p>
            </div>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Kho hiện tại</span>
              <strong>
                {(() => {
                  const idText = toWarehouseIdText(warehouseId);
                  const w = warehouses.find((row) => getWarehouseIdText(row) === idText) || null;
                  return getWarehouseLabel(w, idText);
                })()}
              </strong>
            </div>
            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Ngày nhập</span>
              <strong>{entryDate}</strong>
            </div>
            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Số dòng</span>
              <strong>{selectedItems.length}</strong>
            </div>
          </div>
        </header>

        <section className={styles.grid}>
          <div className={styles.mainColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardEyebrow}>Thông tin nhập kho</p>
                  <h2 className={styles.cardTitle}>Tạo phiếu nhập</h2>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Kho</span>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    disabled={warehouseLoading || isSubmitting}
                  >
                    {warehouses.length > 0 ? (
                      warehouses
                        .map((w) => {
                          const idText = getWarehouseIdText(w);
                          if (!idText) return null;
                          return (
                            <option key={idText} value={idText}>
                              {getWarehouseLabel(w, idText)}
                            </option>
                          );
                        })
                        .filter(Boolean)
                    ) : (
                      <option value={warehouseId}>{warehouseId || String(DEFAULT_WAREHOUSE_ID)}</option>
                    )}
                  </select>
                  {warehouseError ? <div className={styles.errorBanner}>{warehouseError}</div> : null}
                </label>

                <label className={styles.field}>
                  <span>Nhà cung cấp</span>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value.slice(0, SUPPLIER_NAME_MAX_LENGTH))}
                    maxLength={SUPPLIER_NAME_MAX_LENGTH}
                    placeholder="Nhập tên nhà cung cấp"
                  />
                  <div className={styles.helperText}>
                    {supplierName.length}/{SUPPLIER_NAME_MAX_LENGTH}
                  </div>
                </label>

                <label className={styles.field}>
                  <span>Ngày nhập</span>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </label>

                <label className={styles.field}>
                  <span>Ghi chú</span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                    maxLength={NOTES_MAX_LENGTH}
                    placeholder="Nhập ghi chú cho phiếu nhập"
                  />
                  <div className={styles.helperText}>
                    {notes.length}/{NOTES_MAX_LENGTH}
                  </div>
                </label>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Tìm phụ tùng</h2>
                </div>
                <span className={styles.badge}>{searchLoading ? 'Đang tìm...' : `${catalogItems.length} kết quả`}</span>
              </div>

              <div className={styles.searchBar}>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Nhập keyword để tìm mã, tên, SKU phụ tùng..."
                />
              </div>

              {searchError ? <div className={styles.errorBanner}>{searchError}</div> : null}

              <div className={styles.resultsPanel}>
                {catalogResultsContent}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardEyebrow}>Danh sách nhập</p>
                  <h2 className={styles.cardTitle}>Bảng nhập hàng</h2>
                </div>
                <span className={styles.badge}>{selectedItems.length} dòng</span>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>SL</th>
                      <th>Giá nhập</th>
                      <th>Mức lợi nhuận</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.tableEmpty}>
                          Chưa có phụ tùng nào.
                        </td>
                      </tr>
                    ) : (
                      selectedItems.map((row) => {
                        return (
                          <tr key={String(row.itemId)}>
                            <td>
                              <div className={styles.rowName}>
                                <strong>{row.itemName || '-'}</strong>
                                <span>{row.sku || row.partNumber || `#${row.itemId}`}</span>
                              </div>
                            </td>
                            <td>
                              <input
                                className={styles.inlineInput}
                                type="number"
                                min="1"
                                step="1"
                                max={QUANTITY_MAX_VALUE}
                                value={row.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || (Number(val) >= 0 && Number(val) <= QUANTITY_MAX_VALUE)) {
                                    updateSelectedItem(row.itemId, 'quantity', val);
                                  }
                                }}
                              />
                              {rowErrors[`${row.itemId}_quantity`] && (
                                <div className={styles.errorBanner}>{rowErrors[`${row.itemId}_quantity`]}</div>
                              )}
                            </td>
                            <td>
                              <input
                                className={styles.inlineInput}
                                type="number"
                                min="0"
                                step="1"
                                max={IMPORT_PRICE_MAX_VALUE}
                                value={row.importPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || (Number(val) >= 0 && Number(val) <= IMPORT_PRICE_MAX_VALUE)) {
                                    updateSelectedItem(row.itemId, 'importPrice', val);
                                  }
                                }}
                                placeholder="0"
                              />
                              {rowErrors[`${row.itemId}_importPrice`] && (
                                <div className={styles.errorBanner}>{rowErrors[`${row.itemId}_importPrice`]}</div>
                              )}
                            </td>
                            <td>
                              <input
                                className={styles.inlineInput}
                                type="number"
                                min="0"
                                step="0.01"
                                max={MARKUP_MULTIPLIER_MAX_VALUE}
                                value={row.markupMultiplier}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || (Number(val) >= 0 && Number(val) <= MARKUP_MULTIPLIER_MAX_VALUE)) {
                                    updateSelectedItem(row.itemId, 'markupMultiplier', val);
                                  }
                                }}
                                placeholder="1.0"
                              />
                              {rowErrors[`${row.itemId}_markupMultiplier`] && (
                                <div className={styles.errorBanner}>{rowErrors[`${row.itemId}_markupMultiplier`]}</div>
                              )}
                            </td>
                            <td>
                              <button type="button" className={styles.removeButton} onClick={() => removeSelectedItem(row.itemId)}>
                                Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.summaryRow}>
                <div className={styles.summaryItem}>
                  <span>Tổng số lượng</span>
                  <strong>{selectedTotals.quantity}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Tổng tiền nhập</span>
                  <strong>{formatCurrency(selectedTotals.amount)} ₫</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Tệp đính kèm</span>
                  <strong>{attachmentFile ? attachmentFile.name : 'Chưa chọn'}</strong>
                </div>
              </div>
            </div>
          </div>

          <aside className={styles.sideColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardEyebrow}>Tệp đính kèm</p>
                  <h2 className={styles.cardTitle}>Ảnh chứng từ</h2>
                </div>
              </div>

              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) {
                      setAttachmentFile(null);
                      return;
                    }
                    const mime = String(file?.type || '').toLowerCase();
                    const name = String(file?.name || '').toLowerCase();
                    const looksLikeImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
                    if (!looksLikeImage) {
                      notify('Chứng từ chỉ chấp nhận ảnh.');
                      e.target.value = '';
                      setAttachmentFile(null);
                      return;
                    }
                    setAttachmentFile(file);
                  }}
                />
                <span>Chọn ảnh chứng từ</span>
                <strong>{attachmentFile ? attachmentFile.name : 'Kéo thả hoặc bấm để chọn'}</strong>
              </label>

            </div>

            <div className={styles.actionCard}>
              <button type="button" className={styles.ghostButton} onClick={clearForm} disabled={isSubmitting}>
                Xóa form
              </button>
                <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={isSubmitting || selectedItems.length === 0}>
                {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận nhập kho'}
              </button>
            </div>
              <button type="button" className={styles.backBottomButton} onClick={() => navigate('/warehouse-stock-entries')}>
                Quay lại
              </button>
          </aside>
        </section>
      </div>
    </div>
  );
}
