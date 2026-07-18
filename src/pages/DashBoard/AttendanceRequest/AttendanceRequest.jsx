import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  fetchShiftsForRequest,
  fetchMyAttendanceRequests,
  createAttendanceRequest,
  cancelAttendanceRequest,
} from '../../../services/attendanceRequestService.js';
import styles from './AttendanceRequest.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('staffToken')
  || localStorage.getItem('adminToken')
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

const normalizeShiftRecord = (record) => ({
  shiftId: record?.shiftId ?? record?.shift_id ?? null,
  shiftName: record?.shiftName ?? record?.shift_name ?? '',
  startTime: record?.startTime ?? record?.start_time ?? '',
  endTime: record?.endTime ?? record?.end_time ?? '',
  isActive: record?.isActive ?? record?.is_active ?? true,
});

const normalizeRequestRecord = (record) => ({
  requestId: record?.requestId ?? record?.request_id ?? null,
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

const EMPTY_COMPENSATORY_FORM = { startDate: '', shiftId: '', checkInTime: '', checkOutTime: '', reason: '' };
const EMPTY_LEAVE_FORM = { startDate: '', endDate: '', reason: '' };

export default function AttendanceRequest() {
  const [activeTab, setActiveTab] = useState('COMPENSATORY');
  const [shifts, setShifts] = useState([]);
  const [compensatoryForm, setCompensatoryForm] = useState(EMPTY_COMPENSATORY_FORM);
  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadShifts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const response = await fetchShiftsForRequest(token);
      setShifts(extractArrayPayload(response).map(normalizeShiftRecord).filter((s) => s.isActive !== false));
    } catch {
      setShifts([]);
    }
  }, []);

  const loadMyRequests = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetchMyAttendanceRequests(token);
      const list = extractArrayPayload(response)
        .map(normalizeRequestRecord)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      setMyRequests(list);
    } catch (err) {
      toast.error(err?.message || 'Không tải được danh sách đơn.');
      setMyRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
    loadMyRequests();
  }, [loadShifts, loadMyRequests]);

  const submitCompensatory = async (e) => {
    e.preventDefault();
    if (!compensatoryForm.startDate) {
      toast.error('Vui lòng chọn ngày cần chấm công bù.');
      return;
    }
    if (!compensatoryForm.reason.trim()) {
      toast.error('Vui lòng nhập lý do.');
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await createAttendanceRequest({
        requestType: 'COMPENSATORY',
        startDate: compensatoryForm.startDate,
        endDate: compensatoryForm.startDate,
        shiftId: compensatoryForm.shiftId,
        checkInTime: compensatoryForm.checkInTime,
        checkOutTime: compensatoryForm.checkOutTime,
        reason: compensatoryForm.reason,
      }, token);
      toast.success('Đã gửi yêu cầu chấm công bù, chờ quản lý duyệt.');
      setCompensatoryForm(EMPTY_COMPENSATORY_FORM);
      await loadMyRequests();
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }
    if (leaveForm.endDate < leaveForm.startDate) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    if (!leaveForm.reason.trim()) {
      toast.error('Vui lòng nhập lý do.');
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await createAttendanceRequest({
        requestType: 'LEAVE',
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
      }, token);
      toast.success('Đã gửi đơn xin nghỉ, chờ quản lý duyệt.');
      setLeaveForm(EMPTY_LEAVE_FORM);
      await loadMyRequests();
    } catch (err) {
      toast.error(err?.message || 'Gửi đơn thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm('Hủy yêu cầu này?')) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await cancelAttendanceRequest(requestId, token);
      toast.success('Đã hủy yêu cầu.');
      await loadMyRequests();
    } catch (err) {
      toast.error(err?.message || 'Hủy yêu cầu thất bại.');
    }
  };

  const rangeLabel = useMemo(() => (record) => (
    record.startDate === record.endDate ? record.startDate : `${record.startDate} → ${record.endDate}`
  ), []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Chấm công bù &amp; Xin nghỉ</h1>
          <p className={styles.subtitle}>Gửi yêu cầu chấm công bù khi quên chấm công, hoặc gửi đơn xin nghỉ tới quản lý duyệt.</p>
        </div>
      </div>

      <div className={styles.viewTabs}>
        <button
          type="button"
          className={`${styles.viewTabBtn} ${activeTab === 'COMPENSATORY' ? styles.viewTabBtnActive : ''}`}
          onClick={() => setActiveTab('COMPENSATORY')}
        >
          Chấm công bù
        </button>
        <button
          type="button"
          className={`${styles.viewTabBtn} ${activeTab === 'LEAVE' ? styles.viewTabBtnActive : ''}`}
          onClick={() => setActiveTab('LEAVE')}
        >
          Đơn xin nghỉ
        </button>
      </div>

      <div className={styles.formCard}>
        {activeTab === 'COMPENSATORY' ? (
          <form onSubmit={submitCompensatory} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ngày cần bù <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="date"
                  value={compensatoryForm.startDate}
                  onChange={(e) => setCompensatoryForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ca làm liên quan</label>
                <select
                  className={styles.select}
                  value={compensatoryForm.shiftId}
                  onChange={(e) => setCompensatoryForm((p) => ({ ...p, shiftId: e.target.value }))}
                >
                  <option value="">Không chọn ca</option>
                  {shifts.map((s) => (
                    <option key={s.shiftId} value={s.shiftId}>
                      {s.shiftName} ({String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Giờ vào</label>
                <input
                  className={styles.input}
                  type="time"
                  value={compensatoryForm.checkInTime}
                  onChange={(e) => setCompensatoryForm((p) => ({ ...p, checkInTime: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Giờ ra</label>
                <input
                  className={styles.input}
                  type="time"
                  value={compensatoryForm.checkOutTime}
                  onChange={(e) => setCompensatoryForm((p) => ({ ...p, checkOutTime: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Lý do <span className={styles.required}>*</span></label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Ví dụ: quên chấm công buổi sáng, mất kết nối mạng khi quét QR..."
                value={compensatoryForm.reason}
                onChange={(e) => setCompensatoryForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.saveBtn} disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu chấm công bù'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitLeave} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Từ ngày <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Đến ngày <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Lý do <span className={styles.required}>*</span></label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Ví dụ: xin nghỉ phép việc gia đình..."
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.saveBtn} disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}
              </button>
            </div>
          </form>
        )}
      </div>

      <h2 className={styles.historyTitle}>Lịch sử yêu cầu của tôi</h2>

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
                <th>Loại đơn</th>
                <th>Khoảng ngày</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Ghi chú của quản lý</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRowCell}>Bạn chưa gửi yêu cầu nào.</td>
                </tr>
              ) : (
                myRequests.map((r) => {
                  const meta = statusMeta(r.status);
                  return (
                    <tr key={r.requestId}>
                      <td>{REQUEST_TYPE_LABEL[r.requestType] || r.requestType}</td>
                      <td>{rangeLabel(r)}</td>
                      <td className={styles.reasonCell}>{r.reason}</td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td className={styles.reasonCell}>{r.reviewNote || '—'}</td>
                      <td>
                        {String(r.status).toUpperCase() === 'PENDING' && (
                          <button type="button" className={styles.cancelBtn} onClick={() => handleCancel(r.requestId)}>
                            Hủy đơn
                          </button>
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
    </div>
  );
}
