import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import {
  createWarehouseReturnEntryWithAttachments,
  searchWarehouseCatalog,
} from '../../../services/warehouseService.js';
import styles from './WarehouseReturnEntry.module.css';

const DEFAULT_WAREHOUSE_ID = 1;
const RETURN_TYPES = [
  { value: 'CUSTOMER_RETURN', label: 'Khách hàng trả hàng' },
  { value: 'SUPPLIER_RETURN', label: 'Trả nhà cung cấp' },
  { value: 'EXCHANGE', label: 'Đổi hàng' },
];
const RETURN_REASON_OPTIONS = [
  { value: 'WRONG_TYPE', label: 'Xuất nhầm (WRONG_TYPE)' },
  { value: 'DEFECTIVE', label: 'Hàng lỗi (DEFECTIVE)' },
];

const DEFECT_CAUSE_OPTIONS = [
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
  { value: 'WAREHOUSE', label: 'Kho' },
  { value: 'SUPPLIER', label: 'Nhà cung cấp' },
];

const extractCatalogItems = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const mapCatalogItem = (item) => ({
  itemId: Number(item?.itemId ?? item?.id ?? 0) || 0,
  itemName: String(item?.itemName ?? item?.name ?? '').trim(),
  sku: String(item?.sku ?? '').trim(),
  unit: String(item?.unit ?? '').trim(),
});

const toPositiveNumber = (value) => {
  const num = Number(String(value ?? '').trim());
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : Number.NaN;
};

export default function WarehouseReturnEntry() {
  useScrollToTop();
  const navigate = useNavigate();

  const notify = (message) => toast(message, { containerId: 'app-toast' });

  const [warehouseId] = useState(DEFAULT_WAREHOUSE_ID);
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('CUSTOMER_RETURN');

  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [catalogItems, setCatalogItems] = useState([]);

  const [returnItems, setReturnItems] = useState([]);
  const [exchangeItems, setExchangeItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSubmittedKeyword(keyword.trim()), 300);
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
        const res = await searchWarehouseCatalog(keywordValue, token);
        const list = extractCatalogItems(res).map(mapCatalogItem).filter((item) => item.itemId);
        if (cancelled) return;
        setCatalogItems(list);
      } catch (err) {
        if (cancelled) return;
        setCatalogItems([]);
        setSearchError(err?.message || 'Không thể tìm hạng mục.');
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [submittedKeyword]);

  const returnItemIds = useMemo(
    () => new Set(returnItems.map((row) => Number(row.itemId)).filter((n) => Number.isFinite(n))),
    [returnItems],
  );

  const exchangeItemIds = useMemo(
    () => new Set(exchangeItems.map((row) => Number(row.itemId)).filter((n) => Number.isFinite(n))),
    [exchangeItems],
  );

  const isExchangeType = returnType === 'EXCHANGE';

  const addReturnItem = (item) => {
    const mapped = mapCatalogItem(item);
    if (!mapped.itemId) return;
    setReturnItems((prev) => {
      if (prev.some((row) => Number(row.itemId) === mapped.itemId)) return prev;
      return [...prev, { ...mapped, quantity: '1', conditionNote: '', returnReason: 'WRONG_TYPE', defectCause: '', responsibleStaffId: '' }];
    });
  };

  const addExchangeItem = (item) => {
    const mapped = mapCatalogItem(item);
    if (!mapped.itemId) return;
    setExchangeItems((prev) => {
      if (prev.some((row) => Number(row.itemId) === mapped.itemId)) return prev;
      return [...prev, { ...mapped, quantity: '1' }];
    });
  };

  const updateReturnItem = (itemId, field, value) => {
    setReturnItems((prev) => prev.map((row) => (Number(row.itemId) === Number(itemId) ? { ...row, [field]: value } : row)));
  };

  const updateExchangeItem = (itemId, field, value) => {
    setExchangeItems((prev) => prev.map((row) => (Number(row.itemId) === Number(itemId) ? { ...row, [field]: value } : row)));
  };

  const removeReturnItem = (itemId) => {
    setReturnItems((prev) => prev.filter((row) => Number(row.itemId) !== Number(itemId)));
  };

  const removeExchangeItem = (itemId) => {
    setExchangeItems((prev) => prev.filter((row) => Number(row.itemId) !== Number(itemId)));
  };

  const clearForm = () => {
    setReturnReason('');
    setReturnType('CUSTOMER_RETURN');
    setKeyword('');
    setSubmittedKeyword('');
    setCatalogItems([]);
    setReturnItems([]);
    setExchangeItems([]);
    setFiles([]);
    setSearchError('');
  };

  const handleSubmit = async () => {
    const reason = String(returnReason || '').trim();
    if (!reason) {
      notify('Vui lòng nhập lý do trả hàng.');
      return;
    }

    if (returnItems.length === 0) {
      notify('Vui lòng thêm ít nhất 1 item trả hàng.');
      return;
    }

    const hasInvalidReturnQty = returnItems.some((row) => !Number.isFinite(toPositiveNumber(row.quantity)));
    if (hasInvalidReturnQty) {
      notify('Số lượng trong danh sách trả hàng phải lớn hơn 0.');
      return;
    }

    if (isExchangeType && exchangeItems.length > 0) {
      const hasInvalidExchangeQty = exchangeItems.some((row) => !Number.isFinite(toPositiveNumber(row.quantity)));
      if (hasInvalidExchangeQty) {
        notify('Số lượng trong danh sách sản phẩm thay thế phải lớn hơn 0.');
        return;
      }
    }

    // Client-side validation for defective items
    for (const row of returnItems) {
      const rr = String(row.returnReason || 'WRONG_TYPE');
      if (rr === 'DEFECTIVE') {
        if (!row.defectCause) {
          notify(`Item ${row.itemName || row.itemId}: vui lòng chọn nguyên nhân lỗi (defectCause).`);
          return;
        }
        if (row.defectCause === 'SUPPLIER' && row.responsibleStaffId) {
          notify(`Item ${row.itemName || row.itemId}: không được nhập responsibleStaffId khi defectCause = SUPPLIER.`);
          return;
        }
        if ((row.defectCause === 'TECHNICIAN' || row.defectCause === 'WAREHOUSE') && !row.responsibleStaffId) {
          notify(`Item ${row.itemName || row.itemId}: vui lòng nhập responsibleStaffId khi defectCause = ${row.defectCause}.`);
          return;
        }
      }
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) {
      notify('Vui lòng đăng nhập để tạo phiếu trả hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId,
        returnReason: reason,
        returnType,
        items: returnItems.map((row) => ({
          itemId: Number(row.itemId),
          quantity: toPositiveNumber(row.quantity),
          conditionNote: String(row.conditionNote || '').trim(),
          returnReason: String(row.returnReason || 'WRONG_TYPE'),
          defectCause: row.defectCause || null,
          responsibleStaffId: row.responsibleStaffId ? Number(row.responsibleStaffId) : null,
        })),
        exchangeItems: isExchangeType
          ? exchangeItems.map((row) => ({
              itemId: Number(row.itemId),
              quantity: toPositiveNumber(row.quantity),
            }))
          : [],
      };

      const res = await createWarehouseReturnEntryWithAttachments(payload, files, token);
      notify(res?.message || 'Tạo phiếu trả hàng thành công.');
      clearForm();
    } catch (err) {
      notify(err?.message || 'Không thể tạo phiếu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Phiếu trả hàng</h1>
            <p className={styles.subtitle}>POST /api/warehouse/return-entries/with-attachments</p>
          </div>
          <button type="button" className={styles.backButton} onClick={() => navigate('/warehouse-stock-entries')}>
            Quay lại
          </button>
        </header>

        <section className={styles.card}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Kho</span>
              <select value={warehouseId} disabled>
                <option value={1}>Kho Michelin Sơn Tây </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Loại trả hàng</span>
              <select value={returnType} onChange={(e) => setReturnType(e.target.value)}>
                {RETURN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className={`${styles.field} ${styles.fullRow}`}>
              <span>Lý do trả hàng</span>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="VD: Khách trả hàng lỗi / Đổi hàng"
              />
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Tìm sản phẩm</h2>
            <span>{searchLoading ? 'Đang tìm...' : `${catalogItems.length} kết quả`}</span>
          </div>
          <div className={styles.searchBar}>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập keyword..."
            />
          </div>
          {searchError ? <div className={styles.error}>{searchError}</div> : null}

          <div className={styles.resultList}>
            {catalogItems.length === 0 ? <p className={styles.empty}>Không có dữ liệu.</p> : null}
            {catalogItems.map((item) => {
              const inReturn = returnItemIds.has(Number(item.itemId));
              const inExchange = exchangeItemIds.has(Number(item.itemId));
              return (
                <div className={styles.resultRow} key={String(item.itemId)}>
                  <div>
                    <strong>{item.itemName || '-'}</strong>
                    <p>ID: {item.itemId} | SKU: {item.sku || '-'} | ĐV: {item.unit || '-'}</p>
                  </div>
                  <div className={styles.resultActions}>
                    <button type="button" onClick={() => addReturnItem(item)} disabled={inReturn}>Thêm vào sản phẩm trả hàng</button>
                    <button type="button" onClick={() => addExchangeItem(item)} disabled={!isExchangeType || inExchange}>
                      Thêm vào sản phẩm thay thế
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={isExchangeType ? styles.grid : `${styles.grid} ${styles.gridSingle}`}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2>Sản phẩm lỗi (<span className={styles.required}>*</span>)</h2></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Ghi chú tình trạng</th>
                    <th>Lý do</th>
                    <th>Nguyên nhân / Người chịu trách nhiệm</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {returnItems.length === 0 ? (
                    <tr><td colSpan={6} className={styles.empty}>Chưa có sản phẩm trả hàng.</td></tr>
                  ) : (
                    returnItems.map((row) => (
                      <tr key={String(row.itemId)}>
                        <td>{row.itemName || `#${row.itemId}`}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity}
                            onChange={(e) => updateReturnItem(row.itemId, 'quantity', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={row.conditionNote}
                            onChange={(e) => updateReturnItem(row.itemId, 'conditionNote', e.target.value)}
                            placeholder="VD: Vỏ nhựa bị nứt"
                          />
                        </td>
                        <td>
                          <select value={row.returnReason || 'WRONG_TYPE'} onChange={(e) => updateReturnItem(row.itemId, 'returnReason', e.target.value)}>
                            {RETURN_REASON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {String(row.returnReason) === 'DEFECTIVE' ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select value={row.defectCause || ''} onChange={(e) => updateReturnItem(row.itemId, 'defectCause', e.target.value)}>
                                <option value="">Chọn nguyên nhân</option>
                                {DEFECT_CAUSE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={row.responsibleStaffId || ''}
                                onChange={(e) => updateReturnItem(row.itemId, 'responsibleStaffId', e.target.value)}
                                placeholder="Staff ID (nếu có)"
                                style={{ width: 120 }}
                              />
                            </div>
                          ) : (
                            <em>Không áp dụng</em>
                          )}
                        </td>
                        <td>
                          <button type="button" onClick={() => removeReturnItem(row.itemId)}>Xóa</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isExchangeType ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Sản phẩm thay thế (áp dụng khi Đổi hàng)</h2>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Số lượng</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeItems.length === 0 ? (
                      <tr><td colSpan={3} className={styles.empty}>Chưa có sản phẩm thay thế.</td></tr>
                    ) : (
                      exchangeItems.map((row) => (
                        <tr key={String(row.itemId)}>
                          <td>{row.itemName || `#${row.itemId}`}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={row.quantity}
                              onChange={(e) => updateExchangeItem(row.itemId, 'quantity', e.target.value)}
                            />
                          </td>
                          <td>
                            <button type="button" onClick={() => removeExchangeItem(row.itemId)}>Xóa</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}><h2> Ảnh chứng từ</h2></div>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </section>

        <section className={styles.footerActions}>
          <button type="button" className={styles.ghostButton} onClick={clearForm} disabled={isSubmitting}>Xóa form</button>
          <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Tạo phiếu trả hàng'}
          </button>
        </section>
      </div>
    </div>
  );
}
