import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchDefectSummary, fetchDefectDetails } from '../../../services/warehouseService.js';
import commonStyles from '../common/ManagementCommon.module.css';

const DEFECT_CAUSE_LABELS = {
  TECHNICIAN: '⚒ Lỗi KTV',
  WAREHOUSE:  '📦 Lỗi kho',
  SUPPLIER:   '🏭 Lỗi NCC',
};

const CAUSE_COLOR = {
  TECHNICIAN: '#dc2626',
  WAREHOUSE:  '#d97706',
  SUPPLIER:   '#6b7280',
};

const CAUSE_BG = {
  TECHNICIAN: '#fef2f2',
  WAREHOUSE:  '#fffbeb',
  SUPPLIER:   '#f9fafb',
};

// Mức penalty tham khảo (có thể config ở backend sau)
const PENALTY_LEVEL = {
  TECHNICIAN: { label: 'Phạt KTV', color: '#dc2626' },
  WAREHOUSE:  { label: 'Phạt thủ kho', color: '#d97706' },
  SUPPLIER:   { label: 'Yêu cầu bồi thường NCC', color: '#6b7280' },
};

function toIsoLocal(date) {
  if (!date) return undefined;
  return `${date}T00:00:00`;
}

function formatDateTime(val) {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(val); }
}

export default function WarehouseDefectReport() {
  useScrollToTop();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken') || localStorage.getItem('staffToken');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drill-down state
  const [expandedStaffId, setExpandedStaffId] = useState(null);
  const [details, setDetails] = useState({}); // { [staffId]: [...] }
  const [loadingDetails, setLoadingDetails] = useState({});

  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setExpandedStaffId(null);
    setDetails({});
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

  const toggleExpand = async (staffId) => {
    if (expandedStaffId === staffId) {
      setExpandedStaffId(null);
      return;
    }
    setExpandedStaffId(staffId);
    if (details[staffId]) return; // đã tải rồi

    setLoadingDetails((p) => ({ ...p, [staffId]: true }));
    try {
      const res = await fetchDefectDetails(
        { staffId, from: toIsoLocal(fromDate), to: toDate ? `${toDate}T23:59:59` : undefined },
        token,
      );
      const data = res?.data?.data ?? res?.data ?? res ?? [];
      setDetails((p) => ({ ...p, [staffId]: Array.isArray(data) ? data : [] }));
    } catch {
      setDetails((p) => ({ ...p, [staffId]: [] }));
    } finally {
      setLoadingDetails((p) => ({ ...p, [staffId]: false }));
    }
  };

  // Nhóm theo staffId
  const byStaff = rows.reduce((acc, r) => {
    const key = r.staffId ?? 'unknown';
    if (!acc[key]) acc[key] = { staffId: r.staffId, staffName: r.staffName, total: 0, totalQty: 0, causes: [] };
    acc[key].total    += Number(r.defectCount ?? 0);
    acc[key].totalQty += Number(r.defectQuantity ?? 0);
    acc[key].causes.push(r);
    return acc;
  }, {});
  const staffList = Object.values(byStaff).sort((a, b) => b.total - a.total);

  // Tổng toàn kỳ
  const grandTotal    = staffList.reduce((s, x) => s + x.total, 0);
  const grandTotalQty = staffList.reduce((s, x) => s + x.totalQty, 0);

  return (
    <div className={commonStyles.container}>
      <header className={commonStyles.header}>
        <div>
          <h1 className={commonStyles.title}>Báo cáo lỗi hàng & Trách nhiệm</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 4 }}>
            Thống kê lỗi theo nhân viên — bấm vào tên để xem chi tiết từng phiếu.
          </p>
        </div>
      </header>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap',
                    background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
        {grandTotal > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{grandTotal}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>tổng lần lỗi</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{grandTotalQty}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>tổng SP lỗi</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#374151' }}>{staffList.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>nhân viên</div>
            </div>
          </div>
        )}
      </div>

      {error && <div className={commonStyles.errorBanner}>{error}</div>}

      {!loading && staffList.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#6b7280', background: '#fff',
                      borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <p>Không có lỗi nào trong kỳ này.</p>
        </div>
      )}

      {/* Bảng xếp hạng lỗi */}
      {staffList.map((staff, rankIdx) => {
        const isExpanded = expandedStaffId === staff.staffId;
        const staffDetails = details[staff.staffId] ?? [];
        const isLoadingDetail = loadingDetails[staff.staffId];

        // Xác định loại lỗi nặng nhất
        const hasTechnician = staff.causes.some((c) => c.defectCause === 'TECHNICIAN');
        const hasWarehouse   = staff.causes.some((c) => c.defectCause === 'WAREHOUSE');
        const mainCause = hasTechnician ? 'TECHNICIAN' : hasWarehouse ? 'WAREHOUSE' : 'SUPPLIER';

        return (
          <section key={staff.staffId} style={{
            marginBottom: 12,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: `2px solid ${isExpanded ? '#3b82f6' : '#f3f4f6'}`,
            overflow: 'hidden',
          }}>
            {/* Header nhân viên */}
            <button
              type="button"
              onClick={() => toggleExpand(staff.staffId)}
              style={{
                width: '100%',
                background: isExpanded ? '#eff6ff' : '#fff',
                border: 'none',
                cursor: 'pointer',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
              }}
            >
              {/* Rank */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: rankIdx === 0 ? '#fbbf24' : rankIdx === 1 ? '#9ca3af' : '#d97706',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
              }}>
                {rankIdx + 1}
              </div>

              {/* Tên + ID */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                  {staff.staffName || `NV #${staff.staffId}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>ID: {staff.staffId}</div>
              </div>

              {/* Nguyên nhân tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {staff.causes.map((c, i) => (
                  <span key={i} style={{
                    background: CAUSE_BG[c.defectCause] || '#f9fafb',
                    color: CAUSE_COLOR[c.defectCause] || '#374151',
                    border: `1px solid ${CAUSE_COLOR[c.defectCause] || '#e5e7eb'}`,
                    borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {DEFECT_CAUSE_LABELS[c.defectCause] || c.defectCause} ×{c.defectCount}
                  </span>
                ))}
              </div>

              {/* Số liệu */}
              <div style={{ display: 'flex', gap: 20, marginLeft: 8 }}>
                <div style={{ textAlign: 'center', minWidth: 50 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>{staff.total}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>lần lỗi</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 50 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{staff.totalQty}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>SP lỗi</div>
                </div>
              </div>

              {/* Penalty label */}
              <div style={{
                background: CAUSE_BG[mainCause],
                color: PENALTY_LEVEL[mainCause]?.color,
                border: `1px solid ${PENALTY_LEVEL[mainCause]?.color}`,
                borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {PENALTY_LEVEL[mainCause]?.label}
              </div>

              <div style={{ color: '#9ca3af', fontSize: '1rem' }}>
                {isExpanded ? '▲' : '▼'}
              </div>
            </button>

            {/* Drill-down chi tiết */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: 16 }}>
                {isLoadingDetail ? (
                  <p style={{ color: '#6b7280', textAlign: 'center' }}>Đang tải chi tiết...</p>
                ) : staffDetails.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center' }}>Không có dữ liệu chi tiết.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={thStyle}>Ngày xác nhận</th>
                        <th style={thStyle}>Phiếu hoàn</th>
                        <th style={thStyle}>Sản phẩm</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>SL</th>
                        <th style={thStyle}>Nguyên nhân</th>
                        <th style={thStyle}>Ghi chú tình trạng</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Xem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffDetails.map((d, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={tdStyle}>{formatDateTime(d.confirmedAt)}</td>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1e40af' }}>
                              {d.returnCode || `#${d.returnId}`}
                            </span>
                          </td>
                          <td style={tdStyle}><strong>{d.itemName || `SP #${d.itemId}`}</strong></td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{d.quantity}</td>
                          <td style={tdStyle}>
                            <span style={{
                              color: CAUSE_COLOR[d.defectCause] || '#374151',
                              fontWeight: 600,
                            }}>
                              {DEFECT_CAUSE_LABELS[d.defectCause] || d.defectCause || '-'}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: '#6b7280', maxWidth: 200 }}>
                            {d.conditionNote || '-'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <button
                              type="button"
                              className="ui-btn ui-btn--ghost"
                              style={{ padding: '2px 10px', fontSize: '0.75rem' }}
                              onClick={() => navigate(`/warehouse-return-entries/${d.returnId}`)}
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Chú thích */}
      {staffList.length > 0 && (
        <section style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: 16, marginTop: 8 }}>
          <h3 style={{ margin: '0 0 10px', color: '#92400e', fontSize: '0.875rem' }}>
            📋 Quy định KPI Penalty
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {[
              { cause: 'TECHNICIAN', desc: 'Lỗi do KTV gây ra khi lắp đặt / sử dụng không đúng kỹ thuật. KTV chịu trách nhiệm bồi thường theo quy định.' },
              { cause: 'WAREHOUSE', desc: 'Hàng hư hỏng do bảo quản kho sai quy cách. Thủ kho chịu trách nhiệm, kiểm tra lại quy trình nhập/lưu kho.' },
              { cause: 'SUPPLIER', desc: 'Hàng lỗi từ nhà cung cấp. Liên hệ NCC để đổi/trả hàng, tạo phiếu SUPPLIER_RETURN.' },
            ].map((item) => (
              <div key={item.cause} style={{
                background: CAUSE_BG[item.cause], border: `1px solid ${CAUSE_COLOR[item.cause]}`,
                borderRadius: 6, padding: '10px 12px',
              }}>
                <div style={{ fontWeight: 700, color: CAUSE_COLOR[item.cause], marginBottom: 4 }}>
                  {DEFECT_CAUSE_LABELS[item.cause]}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#374151' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const thStyle = {
  padding: '8px 12px', textAlign: 'left',
  border: '1px solid #e5e7eb', fontWeight: 600,
  fontSize: '0.8rem', color: '#374151',
};
const tdStyle = {
  padding: '8px 12px', border: '1px solid #f3f4f6', verticalAlign: 'top',
};
