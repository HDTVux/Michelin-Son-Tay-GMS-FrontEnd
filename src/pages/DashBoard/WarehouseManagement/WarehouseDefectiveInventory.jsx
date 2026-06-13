import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchWarehousesAll, fetchInventoryByWarehouse, fetchWarehouseReturnEntries } from '../../../services/warehouseService.js';
import styles from './WarehouseReturnEntry.module.css';

function formatNumber(n) {
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString('vi-VN');
}

function formatCurrency(n) {
  if (!n || Number(n) === 0) return '-';
  return Number(n).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

const CAUSE_LABELS = {
  TECHNICIAN: { label: '⚒ Lỗi KTV', color: '#dc2626', bg: '#fef2f2' },
  WAREHOUSE:  { label: '📦 Lỗi kho', color: '#d97706', bg: '#fffbeb' },
  SUPPLIER:   { label: '🏭 Lỗi NCC', color: '#6b7280', bg: '#f9fafb' },
};

export default function WarehouseDefectiveInventory() {
  useScrollToTop();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

  const [defectiveWarehouses, setDefectiveWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [recentReturns, setRecentReturns] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'returns'

  // Tải kho DEFECTIVE
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingWarehouses(true);
        const res = await fetchWarehousesAll(token);
        const all = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(all) ? all : [];
        const defective = list.filter((w) => String(w?.warehouseType || '').toUpperCase() === 'DEFECTIVE');
        if (cancelled) return;
        setDefectiveWarehouses(defective);
        if (defective.length > 0) setSelectedWarehouseId(defective[0].warehouseId);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải danh sách kho.');
      } finally {
        if (!cancelled) setLoadingWarehouses(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Tải inventory
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
      } catch {
        if (!cancelled) setInventory([]);
      } finally {
        if (!cancelled) setLoadingInventory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedWarehouseId, token]);

  // Tải phiếu hoàn gần đây của kho DEFECTIVE (liên quan tới kho chính của nó)
  useEffect(() => {
    if (!selectedWarehouseId) return;
    const selectedWarehouse = defectiveWarehouses.find((w) => w.warehouseId === selectedWarehouseId);
    const parentId = selectedWarehouse?.parentWarehouseId;
    if (!parentId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingReturns(true);
        const res = await fetchWarehouseReturnEntries(
          { warehouseId: parentId, size: 20, page: 0 },
          token
        );
        const payload = res?.data?.data ?? res?.data ?? res ?? {};
        const content = Array.isArray(payload) ? payload : (payload?.content ?? []);
        if (cancelled) return;
        // Lọc phiếu có hàng DEFECTIVE
        setRecentReturns(content);
      } catch {
        if (!cancelled) setRecentReturns([]);
      } finally {
        if (!cancelled) setLoadingReturns(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedWarehouseId, defectiveWarehouses, token]);

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
  const totalValue = filteredInventory.reduce((sum, i) =>
    sum + (Number(i.importPrice) || 0) * (Number(i.quantity) || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>⚠️ Kho hàng lỗi</h1>
            <p className={styles.subtitle}>Hàng trả về kho lỗi đang chờ xử lý — tra cứu, theo dõi và xử lý theo nguyên nhân</p>
          </div>
          <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>Quay lại</button>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        {loadingWarehouses ? (
          <p className={styles.emptyText}>Đang tải danh sách kho...</p>
        ) : defectiveWarehouses.length === 0 ? (
          <div className={styles.card}>
            <p className={styles.empty}>Chưa có kho hàng lỗi nào. Liên hệ quản trị viên tạo kho loại DEFECTIVE.</p>
          </div>
        ) : (
          <>
            {/* Chọn kho */}
            <section className={styles.card}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Kho hàng lỗi</span>
                  <select value={selectedWarehouseId || ''}
                    onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}>
                    {defectiveWarehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                </label>
                {selectedWarehouse?.address && (
                  <label className={styles.field}>
                    <span>Địa chỉ</span>
                    <input type="text" value={selectedWarehouse.address} disabled />
                  </label>
                )}
              </div>
            </section>

            {/* Thống kê nhanh */}
            {!loadingInventory && inventory.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Mặt hàng lỗi', value: `${inventory.length}`, icon: '📦', color: '#dc2626' },
                  { label: 'Tổng số lượng', value: formatNumber(totalItems), icon: '🔢', color: '#d97706' },
                  { label: 'Giá trị ước tính', value: formatCurrency(totalValue), icon: '💰', color: '#6b7280' },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: '#fff', borderRadius: 8, padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28 }}>{s.icon}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, margin: '4px 0' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 4 }}>
              {[
                { key: 'inventory', label: '📦 Tồn kho hàng lỗi' },
                { key: 'returns', label: '↩️ Phiếu hoàn liên quan' },
              ].map((tab) => (
                <button key={tab.key} type="button"
                  style={{
                    flex: 1, padding: '8px 16px', border: 'none', borderRadius: 6,
                    cursor: 'pointer', fontWeight: 600, fontSize: 14,
                    background: activeTab === tab.key ? '#fff' : 'transparent',
                    color: activeTab === tab.key ? '#1e40af' : '#6b7280',
                    boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                  onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Tồn kho */}
            {activeTab === 'inventory' && (
              <section className={styles.card}>
                <div className={styles.searchBar}>
                  <input type="text" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc mã sản phẩm..." />
                </div>

                {loadingInventory ? (
                  <p className={styles.emptyText}>Đang tải...</p>
                ) : filteredInventory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40 }}>✅</div>
                    <p style={{ color: '#6b7280', marginTop: 8 }}>
                      {inventory.length === 0
                        ? 'Kho hàng lỗi hiện trống — tốt!'
                        : 'Không tìm thấy sản phẩm phù hợp.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Tên sản phẩm</th>
                          <th>SKU / Mã</th>
                          <th className={styles.tdCenter}>Số lượng</th>
                          <th className={styles.tdCenter}>Giá nhập</th>
                          <th className={styles.tdCenter}>Giá trị</th>
                          <th className={styles.tdCenter}>ĐVT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.map((item, idx) => (
                          <tr key={item.itemId ?? idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{item.itemName || '-'}</strong></td>
                            <td style={{ color: '#6b7280', fontSize: 13 }}>{item.itemCode || item.sku || '-'}</td>
                            <td className={styles.tdCenter}>
                              <span className={styles.badgeDefective}>{formatNumber(item.quantity)}</span>
                            </td>
                            <td className={styles.tdCenter}>{formatCurrency(item.importPrice)}</td>
                            <td className={styles.tdCenter} style={{ fontWeight: 600 }}>
                              {formatCurrency((Number(item.importPrice) || 0) * (Number(item.quantity) || 0))}
                            </td>
                            <td className={styles.tdCenter}>{item.unit || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f9fafb' }}>
                          <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right', padding: '10px 10px' }}>Tổng</td>
                          <td className={styles.tdCenter} style={{ fontWeight: 700 }}>{formatNumber(totalItems)}</td>
                          <td />
                          <td className={styles.tdCenter} style={{ fontWeight: 700 }}>{formatCurrency(totalValue)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Tab: Phiếu hoàn liên quan */}
            {activeTab === 'returns' && (
              <section className={styles.card}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                    Hiển thị 20 phiếu hoàn gần nhất của kho chính
                  </p>
                  <button type="button" className="ui-btn ui-btn--ghost"
                    onClick={() => navigate('/warehouse-return-entries')}
                    style={{ fontSize: 13 }}>
                    Xem tất cả →
                  </button>
                </div>

                {loadingReturns ? (
                  <p className={styles.emptyText}>Đang tải...</p>
                ) : recentReturns.length === 0 ? (
                  <p className={styles.empty}>Không có phiếu hoàn nào.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Mã phiếu</th>
                          <th>Loại trả</th>
                          <th>Phiếu xuất nguồn</th>
                          <th>Phiếu dịch vụ</th>
                          <th className={styles.tdCenter}>Trạng thái</th>
                          <th className={styles.tdCenter}>Ngày tạo</th>
                          <th className={styles.tdCenter}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentReturns.map((r) => {
                          const statusValue = String(r?.status || '').toUpperCase();
                          const statusColors = {
                            SUBMITTED: { bg: '#fef9c3', color: '#92400e', label: 'Đã gửi' },
                            CONFIRMED: { bg: '#dcfce7', color: '#166534', label: 'Đã xác nhận' },
                            CANCELLED: { bg: '#f3f4f6', color: '#9ca3af', label: 'Đã hủy' },
                          };
                          const sc = statusColors[statusValue] || { bg: '#f3f4f6', color: '#374151', label: statusValue };
                          return (
                            <tr key={r.returnId}>
                              <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e40af' }}>
                                {r.returnCode || `#${r.returnId}`}
                              </td>
                              <td style={{ fontSize: 13 }}>
                                {{ CUSTOMER_RETURN: 'Khách trả', SUPPLIER_RETURN: 'Trả NCC', EXCHANGE: 'Đổi hàng' }[r.returnType] || r.returnType || '-'}
                              </td>
                              <td style={{ fontSize: 13, color: '#6b7280' }}>{r.sourceIssueCode || '-'}</td>
                              <td style={{ fontSize: 13, color: '#6b7280' }}>{r.serviceTicketCode || '-'}</td>
                              <td className={styles.tdCenter}>
                                <span style={{
                                  background: sc.bg, color: sc.color,
                                  border: `1px solid ${sc.color}`,
                                  borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                                }}>{sc.label}</span>
                              </td>
                              <td className={styles.tdCenter} style={{ fontSize: 12, color: '#6b7280' }}>
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '-'}
                              </td>
                              <td className={styles.tdCenter}>
                                <button type="button" className="ui-btn ui-btn--ghost"
                                  style={{ padding: '2px 10px', fontSize: 12 }}
                                  onClick={() => navigate(`/warehouse-return-entries/${r.returnId}`)}>
                                  Chi tiết
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Hướng dẫn xử lý */}
            <section style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#92400e', fontSize: '0.9rem', fontWeight: 700 }}>
                📋 Hướng dẫn xử lý hàng trong kho lỗi
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {Object.entries(CAUSE_LABELS).map(([key, v]) => (
                  <div key={key} style={{
                    background: v.bg, border: `1px solid ${v.color}`,
                    borderRadius: 6, padding: '10px 12px',
                  }}>
                    <div style={{ fontWeight: 700, color: v.color, marginBottom: 4 }}>{v.label}</div>
                    <div style={{ fontSize: '0.8rem', color: '#374151' }}>
                      {key === 'SUPPLIER' && 'Liên hệ NCC để đổi/trả hàng. Tạo phiếu SUPPLIER_RETURN trong "Quản lý phiếu hoàn".'}
                      {key === 'TECHNICIAN' && 'Xem báo cáo lỗi & trách nhiệm để xác định KTV. Xử lý theo quy định nội bộ.'}
                      {key === 'WAREHOUSE' && 'Kiểm tra quy trình nhập/bảo quản. Ghi nhận và xử lý theo quy định.'}
                    </div>
                    {key === 'SUPPLIER' && (
                      <button type="button" className="ui-btn ui-btn--ghost"
                        style={{ marginTop: 8, fontSize: 12, padding: '2px 10px' }}
                        onClick={() => navigate('/warehouse-return-entries')}>
                        Tạo phiếu hoàn →
                      </button>
                    )}
                    {key === 'TECHNICIAN' && (
                      <button type="button" className="ui-btn ui-btn--ghost"
                        style={{ marginTop: 8, fontSize: 12, padding: '2px 10px' }}
                        onClick={() => navigate('/warehouse-defect-report')}>
                        Xem báo cáo →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
