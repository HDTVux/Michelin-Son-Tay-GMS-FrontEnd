import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchManagerEmployeeDetail } from '../../../services/managerService.js';
import ui from '../common/ManagementCommon.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

const statusMeta = (status) => {
  const key = String(status || '').toUpperCase();
  if (key === 'PRESENT') return { label: 'Có m?t', cls: ui.badgeSuccess };
  if (key === 'LATE') return { label: 'Mu?n', cls: ui.badgeWarning };
  if (key === 'ABSENT') return { label: 'V?ng', cls: ui.badgeDanger };
  if (key === 'OFF') return { label: 'Ngh?', cls: ui.badgeMuted };
  return { label: key || '-', cls: ui.badgeMuted };
};

export default function EmployeeProfilePage() {
  const { staffId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng dang nh?p d? xem h? so nhân viên.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchManagerEmployeeDetail(staffId, token);
      setProfile(response?.data || null);
    } catch (err) {
      setProfile(null);
      setError(err?.message || 'Không t?i du?c chi ti?t nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const perf = profile?.performance || {};
    return {
      workDays: perf.totalWorkDays || 0,
      tickets: perf.totalTicketsHandled || 0,
    };
  }, [profile]);

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Chi ti?t h? so nhân viên</h1>
          <p className={ui.subtitle}>N?i tr?c ti?p EmployeeManageController#getEmployeeDetail</p>
        </div>
        <div className={ui.inlineActions}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate('/employee-manager')}>
            Quay l?i
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={loadData}>
            Làm m?i
          </button>
        </div>
      </div>

      {loading && <div className={ui.loading}>Ðang t?i h? so...</div>}
      {!loading && error && <div className={ui.error}>{error}</div>}
      {!loading && !error && !profile && <div className={ui.empty}>Không tìm th?y nhân viên.</div>}

      {!loading && !error && profile && (
        <>
          <div className={ui.statsGrid}>
            <div className={ui.statCard}>
              <p className={ui.statLabel}>Staff ID</p>
              <p className={ui.statValue}>#{profile.staffId}</p>
            </div>
            <div className={ui.statCard}>
              <p className={ui.statLabel}>Ngày công tháng này</p>
              <p className={ui.statValue}>{stats.workDays}</p>
            </div>
            <div className={ui.statCard}>
              <p className={ui.statLabel}>Ticket tháng này</p>
              <p className={ui.statValue}>{stats.tickets}</p>
            </div>
            <div className={ui.statCard}>
              <p className={ui.statLabel}>V? trí</p>
              <p className={ui.statValue} style={{ fontSize: '20px' }}>{profile.position || '-'}</p>
            </div>
          </div>

          <div className="ui-card" style={{ marginBottom: '16px' }}>
            <h2 className="ui-section-title">Thông tin co b?n</h2>
            <div className={ui.modalGrid}>
              <div className={ui.field}>
                <label>H? tên</label>
                <input className={ui.input} value={profile.fullName || '-'} readOnly />
              </div>
              <div className={ui.field}>
                <label>S? di?n tho?i</label>
                <input className={ui.input} value={profile.phone || '-'} readOnly />
              </div>
              <div className={ui.field}>
                <label>Gi?i tính</label>
                <input className={ui.input} value={profile.gender || '-'} readOnly />
              </div>
              <div className={ui.field}>
                <label>Ngày sinh</label>
                <input className={ui.input} value={profile.dob || '-'} readOnly />
              </div>
            </div>
          </div>

          <div className="ui-card">
            <h2 className="ui-section-title">L?ch s? ch?m công 30 ngày g?n nh?t</h2>
            {Array.isArray(profile.recentAttendance) && profile.recentAttendance.length > 0 ? (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Checkin ID</th>
                      <th>Ngày</th>
                      <th>Ca</th>
                      <th>Gi? vào</th>
                      <th>Gi? ra</th>
                      <th>Tr?ng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentAttendance.map((item) => {
                      const meta = statusMeta(item?.status);
                      return (
                        <tr key={item.checkinId}>
                          <td>#{item.checkinId}</td>
                          <td>{item.attendanceDate || '-'}</td>
                          <td>{item.shiftName || `Shift ${item.shiftId || '-'}`}</td>
                          <td>{item.checkInTime || '-'}</td>
                          <td>{item.checkOutTime || '-'}</td>
                          <td>
                            <span className={`${ui.badge} ${meta.cls}`}>{meta.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={ui.empty}>Chua có b?n ghi ch?m công g?n dây.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
