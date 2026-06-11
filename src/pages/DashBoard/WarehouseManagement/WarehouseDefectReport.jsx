import { useEffect, useState } from 'react';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchDefectSummary } from '../../../services/warehouseService.js';
import commonStyles from '../common/ManagementCommon.module.css';

const DEFECT_CAUSE_LABELS = {
  TECHNICIAN: 'Lỗi KTV',
  WAREHOUSE: 'Lỗi kho',
  SUPPLIER: 'Lỗi nhà cung cấp',
};

const CAUSE_COLOR = {
  TECHNICIAN: '#dc2626',
  WAREHOUSE: '#d97706',
  SUPPLIER: '#6b7280',
};

function toIsoLocal(date) {
  // format YYYY-MM-DDTHH:mm:ss for LocalDateTime param
  if (!date) return undefined;
  return `${date}T00:00:00`;
}

export default function WarehouseDefectReport() {
  useScrollToTop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // default: tháng hiện tại
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState('');

  const load = async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchDefectSummary(
        { from: toIsoLocal(fromDate), to: toDate ? `${toDate}T23:59:59` : undefined },
        token,
      );
      const data = res?.data?.data ?? res?.data ?? res ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Không thể tải báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // Nhóm theo staffId để tính tổng
  const byStaff = rows.reduce((acc, r) => {
    const key = r.staffId ?? 'unknown';
    if (!acc[key]) acc[key] = { staffId: r.staffId, staffName: r.staffName, total: 0, totalQty: 0, causes: [] };
    acc[key].total += Number(r.defectCount ?? 0);
    acc[key].totalQty += Number(r.defectQuantity ?? 0);
    acc[key].causes.push(r);
    return acc;
  }, {});
  const staffList = Object.values(byStaff).sort((a, b) => b.total - a.total);

  return (
    <div className={commonStyles.container}>
      <header className={commonStyles.header}>
        <div>
          <h1 className={commonStyles.title}>Báo cáo lỗi hàng & Trách nhiệm</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 4 }}>
            Thống kê số lần gây lỗi của nhân viên theo kỳ — dùng cho KPI penalty.
          </p>
        </div>
      </header>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="ui-field" style={{ minWidth: 160 }}>
          <label>Từ ngày</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="ui-field" style={{ minWidth: 160 }}>
          <label>Đến ngày</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button type="button" className="ui-btn ui-btn--primary" onClick={load} disabled={loading}>
          {loading ? 'Đang tải...' : 'Xem báo cáo'}
        </button>
      </div>

      {error && <div className={commonStyles.errorBanner}>{error}</div>}

      {!loading && staffList.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: 32 }}>
          Không có dữ liệu lỗi trong kỳ này.
        </p>
      )}

      {staffList.map((staff) => (
        <section key={staff.staffId} style={{ marginBottom: 24, background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: '1rem' }}>{staff.staffName || `NV #${staff.staffId}`}</strong>
              <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.8rem' }}>ID: {staff.staffId}</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{staff.total}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>lần lỗi</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{staff.totalQty}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>sản phẩm lỗi</div>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '6px 12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Nguyên nhân</th>
                <th style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Số lần</th>
                <th style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Số lượng hàng lỗi</th>
              </tr>
            </thead>
            <tbody>
              {staff.causes.map((c, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ color: CAUSE_COLOR[c.defectCause] || '#374151', fontWeight: 500 }}>
                      {DEFECT_CAUSE_LABELS[c.defectCause] || c.defectCause || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                    {c.defectCount}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                    {c.defectQuantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
