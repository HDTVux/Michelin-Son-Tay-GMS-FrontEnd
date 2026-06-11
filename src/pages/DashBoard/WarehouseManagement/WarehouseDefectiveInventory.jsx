import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchWarehousesAll, fetchInventoryByWarehouse } from '../../../services/warehouseService.js';
import styles from './WarehouseReturnEntry.module.css';

function formatNumber(n) {
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString('vi-VN');
}

function formatCurrency(n) {
  if (n === null || n === undefined || Number(n) === 0) return '-';
  return Number(n).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export default function WarehouseDefectiveInventory() {
  useScrollToTop();
  const navigate = useNavigate();

  const [defectiveWarehouses, setDefectiveWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

  // Tải danh sách kho, lọc DEFECTIVE
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingWarehouses(true);
        const res = await fetchWarehousesAll(token);
        const all = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(all) ? all : [];
        const defective = list.filter((w) =>
          String(w?.warehouseType || '').toUpperCase() === 'DEFECTIVE'
        );
        if (cancelled) return;
        setDefectiveWarehouses(defective);
        if (defective.length > 0) {
          setSelectedWarehouseId(defective[0].warehouseId);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải danh sách kho.');
      } finally {
        if (!cancelled) setLoadingWarehouses(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Tải inventory khi chọn kho
  useEffect(() => {
    if (!selectedWarehouseId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingInventory(true);
        setInventory([]);
        const res = await fetchInventoryByWarehouse(selectedWarehouseId, token);
        const data = res?.data?.data ?? res?.data ?? res ?? [];
        if (cancelled) return;
        setInventory(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải tồn kho.');
      } finally {
        if (!cancelled) setLoadingInventory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedWarehouseId, token]);

  const selectedWarehouse = useMemo(() =>
    defectiveWarehouses.find((w) => w.warehouseId === selectedWarehouseId),
    [defectiveWarehouses, selectedWarehouseId]
  );

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((item) =>
      String(item?.itemName || '').toLowerCase().includes(q) ||
      String(item?.itemCode || item?.sku || '').toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const totalItems = filteredInventory.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>⚠️ Kho hàng lỗi (DEFECTIVE)</h1>
            <p className={styles.subtitle}>
              Danh sách hàng hóa đang chờ xử lý trong kho hàng lỗi
            </p>
          </div>
          <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        {/* Chọn kho lỗi */}
        {loadingWarehouses ? (
          <p className={styles.emptyText}>Đang tải danh sách kho...</p>
        ) : defectiveWarehouses.length === 0 ? (
          <div className={styles.card}>
            <p className={styles.empty}>
              Chưa có kho hàng lỗi (DEFECTIVE) nào được tạo.
              Vui lòng liên hệ quản trị viên để tạo kho loại DEFECTIVE.
            </p>
          </div>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Chọn kho hàng lỗi</span>
                  <select
                    value={selectedWarehouseId || ''}
                    onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                  >
                    {defectiveWarehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                </label>
                {selectedWarehouse && (
                  <label className={styles.field}>
                    <span>Địa chỉ</span>
                    <input type="text" value={selectedWarehouse.address || '-'} disabled />
                  </label>
                )}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>
                  Tồn kho hàng lỗi
                  {!loadingInventory && (
                    <span style={{ fontWeight: 400, fontSize: 14, color: '#6b7280', marginLeft: 8 }}>
                      ({filteredInventory.length} mặt hàng — tổng {formatNumber(totalItems)} sản phẩm)
                    </span>
                  )}
                </h2>
              </div>

              <div className={styles.searchBar}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã sản phẩm..."
                />
              </div>

              {loadingInventory ? (
                <p className={styles.emptyText}>Đang tải tồn kho...</p>
              ) : filteredInventory.length === 0 ? (
                <p className={styles.empty}>
                  {inventory.length === 0
                    ? 'Kho hàng lỗi hiện không có sản phẩm nào.'
                    : 'Không tìm thấy sản phẩm phù hợp.'}
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Tên sản phẩm</th>
                        <th>SKU / Mã</th>
                        <th className={styles.tdCenter}>Số lượng</th>
                        <th className={styles.tdCenter}>Đã dự trữ</th>
                        <th className={styles.tdCenter}>Giá nhập</th>
                        <th className={styles.tdCenter}>Đơn vị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item, idx) => (
                        <tr key={item.itemId ?? idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{item.itemName || '-'}</strong>
                          </td>
                          <td style={{ color: '#6b7280', fontSize: 13 }}>
                            {item.itemCode || item.sku || '-'}
                          </td>
                          <td className={styles.tdCenter}>
                            <span className={styles.badge}>{formatNumber(item.quantity)}</span>
                          </td>
                          <td className={styles.tdCenter}>
                            {Number(item.reservedQuantity) > 0 ? (
                              <span style={{ color: '#d97706' }}>{formatNumber(item.reservedQuantity)}</span>
                            ) : '-'}
                          </td>
                          <td className={styles.tdCenter}>
                            {formatCurrency(item.importPrice)}
                          </td>
                          <td className={styles.tdCenter}>
                            {item.unit || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ fontWeight: 600, textAlign: 'right', padding: '12px 10px' }}>
                          Tổng
                        </td>
                        <td className={styles.tdCenter} style={{ fontWeight: 700 }}>
                          {formatNumber(totalItems)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            <section className={styles.card} style={{ background: '#fef9c3', borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ margin: '0 0 8px', color: '#92400e', fontSize: 15 }}>Hướng xử lý hàng lỗi</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#78350f', fontSize: 14, lineHeight: '1.8' }}>
                <li><strong>Lỗi nhà cung cấp (SUPPLIER):</strong> Liên hệ NCC để đổi/trả hàng — tạo phiếu SUPPLIER_RETURN</li>
                <li><strong>Lỗi kỹ thuật viên (TECHNICIAN):</strong> Xem báo cáo trách nhiệm, xử lý nội bộ</li>
                <li><strong>Lỗi kho (WAREHOUSE):</strong> Kiểm tra quy trình nhập/bảo quản, xử lý theo quy định</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
