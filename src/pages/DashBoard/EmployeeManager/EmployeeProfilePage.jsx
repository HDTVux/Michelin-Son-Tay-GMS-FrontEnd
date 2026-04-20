import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchStaffDetail } from '../../../services/adminService.js';
import { fetchManagerEmployeeDetail } from '../../../services/managerService.js';
import styles from './EmployeeProfilePage.module.css';

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('adminToken')
  || localStorage.getItem('staffToken')
  || '';

const pickValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const normalizeRoleName = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return pickValue(
      value.roleName,
      value.name,
      value.label,
      value.roleCode,
      value.code,
      value.position,
    );
  }
  return '';
};

const getRoleText = (profile) => {
  const roleList = Array.isArray(profile?.roles)
    ? profile.roles.map(normalizeRoleName).filter(Boolean)
    : [];
  const uniqueRoles = Array.from(new Set(roleList));
  if (uniqueRoles.length > 0) return uniqueRoles.join(', ');

  return pickValue(
    profile?.roleName,
    profile?.role,
    profile?.staffRole,
    profile?.staffRoleName,
    profile?.position,
    '-',
  );
};

const extractPayload = (response) => {
  if (!response) return null;
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  if (typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }
  return null;
};

const formatDateVi = (value) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString('vi-VN');
};

const formatGenderLabel = (value) => {
  const code = String(value || '').trim().toUpperCase();
  if (!code) return '-';
  if (code === 'MALE' || code === 'M' || code === '1') return 'Nam';
  if (code === 'FEMALE' || code === 'F' || code === '0') return 'Nữ';
  if (code === 'OTHER' || code === 'O') return 'Khác';
  return code;
};

const toStatusMeta = (status) => {
  const key = String(status || '').trim().toUpperCase();
  if (key === 'PRESENT') return { label: 'Có mặt', className: styles.badgeSuccess };
  if (key === 'LATE') return { label: 'Muộn', className: styles.badgeWarning };
  if (key === 'ABSENT') return { label: 'Vắng', className: styles.badgeDanger };
  if (key === 'OFF') return { label: 'Nghỉ', className: styles.badgeMuted };
  return { label: key || '-', className: styles.badgeMuted };
};

const getInitials = (name) => {
  const text = String(name || '').trim();
  if (!text) return 'NV';
  return text
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
      setError('Vui lòng đăng nhập để xem hồ sơ nhân viên.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchManagerEmployeeDetail(staffId, token);
      let payload = extractPayload(response);

      if (!getRoleText(payload)) {
        try {
          const adminResponse = await fetchStaffDetail(staffId, token);
          const adminPayload = extractPayload(adminResponse);
          if (adminPayload && typeof adminPayload === 'object') {
            payload = {
              ...adminPayload,
              ...payload,
              roles: Array.isArray(payload?.roles) && payload.roles.length > 0 ? payload.roles : adminPayload?.roles,
            };
          }
        } catch {
          // Ignore fallback failure.
        }
      }

      setProfile(payload);
    } catch (err) {
      setProfile(null);
      setError(err?.message || 'Không tải được chi tiết nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const performance = profile?.performance || {};
    const fullName = pickValue(profile?.fullName, profile?.staffName, profile?.name, '-');

    return {
      staffId: pickValue(profile?.staffId, staffId, '-'),
      fullName,
      phone: pickValue(profile?.phone, profile?.phoneNumber, '-'),
      role: getRoleText(profile),
      gender: formatGenderLabel(profile?.gender),
      dob: formatDateVi(profile?.dob || profile?.dateOfBirth),
      avatar: pickValue(profile?.avatar, profile?.avatarUrl, ''),
      workDays: Number(performance?.totalWorkDays || 0),
      tickets: Number(performance?.totalTicketsHandled || 0),
    };
  }, [profile, staffId]);

  const attendanceRows = useMemo(() => {
    const rows = Array.isArray(profile?.recentAttendance) ? profile.recentAttendance : [];
    return [...rows].sort((a, b) => {
      const da = new Date(a?.attendanceDate || 0).getTime();
      const db = new Date(b?.attendanceDate || 0).getTime();
      return db - da;
    });
  }, [profile]);

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroIdentity}>
          <div className={styles.avatarWrap}>
            {summary.avatar ? (
              <img src={summary.avatar} alt={summary.fullName} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarFallback}>{getInitials(summary.fullName)}</span>
            )}
          </div>
          <div>
            <h1 className={styles.title}>Chi tiết hồ sơ nhân viên</h1>
            <p className={styles.subtitle}>Mã nhân viên: #{summary.staffId}</p>
          </div>
        </div>

        <div className={styles.heroActions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate('/employee-manager')}>
            Quay lại
          </button>
          <button type="button" className={styles.primaryButton} onClick={loadData}>
            Làm mới
          </button>
        </div>
      </section>

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Đang tải hồ sơ nhân viên...</p>
        </div>
      )}

      {!loading && error && <div className={styles.errorState}>{error}</div>}

      {!loading && !error && !profile && (
        <div className={styles.emptyState}>Không tìm thấy thông tin nhân viên.</div>
      )}

      {!loading && !error && profile && (
        <>
          <section className={styles.statGrid}>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Staff ID</p>
              <p className={styles.statValue}>#{summary.staffId}</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Ngày công tháng này</p>
              <p className={styles.statValue}>{summary.workDays}</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Ticket tháng này</p>
              <p className={styles.statValue}>{summary.tickets}</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Vai trò</p>
              <p className={styles.statValue}>{summary.role}</p>
            </article>
          </section>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitle}>Thông tin cơ bản</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span>Họ tên</span>
                <strong>{summary.fullName}</strong>
              </div>
              <div className={styles.infoItem}>
                <span>Số điện thoại</span>
                <strong>{summary.phone}</strong>
              </div>
              <div className={styles.infoItem}>
                <span>Giới tính</span>
                <strong>{summary.gender}</strong>
              </div>
              <div className={styles.infoItem}>
                <span>Ngày sinh</span>
                <strong>{summary.dob}</strong>
              </div>
            </div>
          </section>

          <section className={styles.tableCard}>
            <h2 className={styles.sectionTitle}>Lịch sử chấm công 30 ngày gần nhất</h2>

            {attendanceRows.length === 0 ? (
              <div className={styles.emptyState}>Chưa có bản ghi chấm công gần đây.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Check-in ID</th>
                      <th>Ngày</th>
                      <th>Ca</th>
                      <th>Giờ vào</th>
                      <th>Giờ ra</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((item) => {
                      const meta = toStatusMeta(item?.status);
                      return (
                        <tr key={item?.checkinId || `${item?.attendanceDate}-${item?.shiftId}`}>
                          <td>#{item?.checkinId ?? '-'}</td>
                          <td>{formatDateVi(item?.attendanceDate)}</td>
                          <td>{pickValue(item?.shiftName, item?.shiftId ? `Ca #${item.shiftId}` : '-', '-')}</td>
                          <td>{pickValue(item?.checkInTime, '-')}</td>
                          <td>{pickValue(item?.checkOutTime, '-')}</td>
                          <td>
                            <span className={`${styles.badge} ${meta.className}`}>{meta.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
