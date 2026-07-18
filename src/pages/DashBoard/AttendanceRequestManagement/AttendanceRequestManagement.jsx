import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  fetchAttendanceRequestsForManager,
  approveAttendanceRequest,
  rejectAttendanceRequest,
} from '../../../services/attendanceRequestService.js';
import styles from './AttendanceRequestManagement.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('adminToken')
  || localStorage.getItem('staffToken')
  || '';

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const normalizeRequestRecord = (record) => ({
  requestId: record?.requestId ?? record?.request_id ?? null,
  staffId: record?.staffId ?? record?.staff_id ?? null,
  staffName: record?.staffName ?? record?.staff_name ?? record?.fullName ?? record?.full_name ?? 'Không tên',
  requestType: record?.requestType ?? record?.request_type ?? 'COMPENSATORY',
  startDate: String(record?.startDate ?? record?.start_date ?? '').slice(0, 10),
  endDate: String(record?.endDate ?? record?.end_date ?? '').slice(0, 10),
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  checkInTime: record?.checkInTime ?? record?.check_in_time ?? '',
  checkOutTime: record?.checkOutTime ?? record?.check_out_time ?? '',
  reason: record?.reason ?? '',
  status: record?.status ?? 'PENDING',
  reviewNote: record?.reviewNote ?? record?.review_note ?? '',
  createdAt: record?.createdAt ?? record?.created_at ?? '',
});

const statusMeta = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'APPROVED') return { label: 'Đã duyệt', cls: 'badgeApproved' };
  if (key === 'REJECTED') return { label: 'Từ chối', cls: 'badgeRejected' };
  return { label: 'Chờ duyệt', cls: 'badgePending' };
};

const REQUEST_TYPE_LABEL = {
  COMPENSATORY: 'Chấm công bù',
  LEAVE: 'Đơn xin nghỉ',
};

const STATUS_TABS = [
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'ALL', label: 'Tất cả' },
];

const TYPE_FILTERS = [
  { id: 'ALL', label: 'Tất cả loại đơn' },
  { id: 'COMPENSATORY', label: 'Chấm công bù' },
  { id: 'LEAVE', label: 'Đơn xin nghỉ' },
];

export default function AttendanceRequestManagement() {
  const [statusTab, setStatusTab] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetchAttendanceRequestsForManager({
        status: statusTab === 'ALL' ? '' : statusTab,
        type: typeFilter === 'ALL' ? '' : typeFilter,
      }, token);
      const list = extractArrayPayload(response)
        .map(normalizeRequestRecord)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      setRequests(list);
    } catch (err) {
      toast.error(err?.message || 'Không tải được danh sách yêu cầu.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusTab, typeFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const rangeLabel = useMemo(() => (record) => (
    record.startDate === record.endDate ? record.startDate : `${record.startDate} → ${record.endDate}`
  ), []);

  const handleApprove = async (requestId) => {
    if (!window.confirm('Duyệt yêu cầu này?')) return;
    const token = getAuthToken();
    if (!token) return;
    setProcessingId(requestId);
    try {
      await approveAttendanceRequest(requestId, {}, token);
      toast.success('Đã duyệt yêu cầu.');
      await loadRequests();
    } catch (err) {
      toast.error(err?.message || 'Duyệt yêu cầu thất bại.');
    } finally {
      setProcessingId(null);
    }
  };

  const openReject = (record) => {
    setRejectTarget(record);
    setRejectNote('');
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setProcessingId(rejectTarget.requestId);
    try {
      await rejectAttendanceRequest(rejectTarget.requestId, { reviewNote: rejectNote }, token);
      toast.success('Đã từ chối yêu cầu.');
      setRejectTarget(null);
      await loadRequests();
    } catch (err) {
      toast.error(err?.message || 'Từ chối yêu cầu thất bại.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Duyệt đơn chấm công bù &amp; xin nghỉ</h1>
          <p className={styles.subtitle}>Xem và xử lý các yêu cầu chấm công bù, đơn xin nghỉ do nhân viên gửi lên.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.viewTabs}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.viewTabBtn} ${statusTab === tab.id ? styles.viewTabBtnActive : ''}`}
              onClick={() => setStatusTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          className={styles.typeSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {TYPE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Loại đơn</th>
                <th>Khoảng ngày</th>
                <th>Giờ vào/ra</th>
                <th>Lý do</th>
                <th>Gửi lúc</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyRowCell}>Không có yêu cầu nào.</td>
                </tr>
              ) : (
                requests.map((r) => {
                  const meta = statusMeta(r.status);
                  const isPending = String(r.status).toUpperCase() === 'PENDING';
                  return (
                    <tr key={r.requestId}>
                      <td className={styles.staffCell}>
                        <div className={styles.staffAvatar}>{(r.staffName || '?')[0]?.toUpperCase()}</div>
                        <span>{r.staffName}</span>
                      </td>
                      <td>{REQUEST_TYPE_LABEL[r.requestType] || r.requestType}</td>
                      <td>{rangeLabel(r)}</td>
                      <td>
                        {r.requestType === 'COMPENSATORY'
                          ? `${r.checkInTime ? r.checkInTime.slice(0, 5) : '—'} - ${r.checkOutTime ? r.checkOutTime.slice(0, 5) : '—'}`
                          : '—'}
                      </td>
                      <td className={styles.reasonCell}>{r.reason}</td>
                      <td>{r.createdAt ? String(r.createdAt).slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td>
                        {isPending ? (
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={styles.approveBtn}
                              disabled={processingId === r.requestId}
                              onClick={() => handleApprove(r.requestId)}
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              className={styles.rejectBtn}
                              disabled={processingId === r.requestId}
                              onClick={() => openReject(r)}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className={styles.reasonCell}>{r.reviewNote || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {rejectTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Từ chối yêu cầu của {rejectTarget.staffName}</h3>
                <p className={styles.modalSubtitle}>{REQUEST_TYPE_LABEL[rejectTarget.requestType]} — {rangeLabel(rejectTarget)}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setRejectTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Lý do từ chối <span className={styles.required}>*</span></label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Nhập lý do để nhân viên biết vì sao đơn bị từ chối"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setRejectTarget(null)}>Hủy</button>
              <button type="button" className={styles.saveBtn} onClick={submitReject}>Xác nhận từ chối</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
