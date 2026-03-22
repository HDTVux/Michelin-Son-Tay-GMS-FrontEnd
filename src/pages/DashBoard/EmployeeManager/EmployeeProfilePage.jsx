import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchStaffDetail } from '../../../services/adminService.js';
import styles from './EmployeeManager.module.css';

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Java sql.Date trả về string dạng "yyyy-MM-dd" hoặc "yyyy-MM-ddTHH:mm:ss"
const formatDob = (dob) => {
  if (!dob) return '—';
  const dateStr = String(dob);
  // Lấy phần date only (cắt phần time nếu có)
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

const getInitials = (name) => {
  if (!name) return 'NV';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts.at(-1)?.[0] : parts[0]?.[1] || '';
  return (first + last).toUpperCase() || 'NV';
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':   return { cls: 'statusActive',   label: 'Hoạt động' };
    case 'INACTIVE': return { cls: 'statusInactive', label: 'Ngưng hoạt động' };
    case 'LOCKED':   return { cls: 'statusLocked',   label: 'Đã khóa' };
    case 'DELETED':  return { cls: 'statusInactive', label: 'Đã xóa' };
    case null:       return { cls: 'statusInactive', label: 'Chưa kích hoạt' };
    default:         return { cls: 'statusInactive', label: status || '-' };
  }
};

const ATTENDANCE_STATUS_META = {
  PRESENT:    { label: 'Có mặt',   cls: 'statusActive' },
  LATE:       { label: 'Đi trễ',   cls: 'statusLocked' },
  EARLY_LEAVE:{ label: 'Về sớm',  cls: 'statusLocked' },
  ABSENT:     { label: 'Vắng',     cls: 'statusInactive' },
  OFF:        { label: 'Nghỉ',     cls: 'statusLocked' },
};

// ─── Tab: Hiệu suất ───────────────────────────────────────────────────────────

function PerformanceTab({ profile }) {
  const perf = profile?.performance || {};
  const totalWorkDays    = perf.totalWorkDays    ?? 0;
  const totalTickets     = perf.totalTicketsHandled ?? 0;
  const ticketsAsAdvisor    = perf.ticketsAsAdvisor    ?? 0;
  const ticketsAsTechnician  = perf.ticketsAsTechnician ?? 0;
  const recentAttendance = profile?.recentAttendance || [];

  // ── Summary stats from recentAttendance ────────────────────────────────────
  const present   = recentAttendance.filter(a => a.status === 'PRESENT').length;
  const late      = recentAttendance.filter(a => a.status === 'LATE').length;
  const absent    = recentAttendance.filter(a => a.status === 'ABSENT').length;
  const earlyLeave = recentAttendance.filter(a => a.status === 'EARLY_LEAVE').length;

  return (
    <div>
      {/* KPI cards — 4 stats từ backend */}
      <div className={styles.statsGrid} style={{ marginBottom: '16px' }}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{totalWorkDays}</div>
          <div className={styles.statLabel}>Ngày đi làm</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{totalTickets}</div>
          <div className={styles.statLabel}>Tổng Ticket</div>
        </div>
        <div className={`${styles.statCard} ${styles.statLocked}`}>
          <div className={styles.statValue}>{ticketsAsAdvisor}</div>
          <div className={styles.statLabel}>Ticket Advisor</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <div className={styles.statValue}>{ticketsAsTechnician}</div>
          <div className={styles.statLabel}>Ticket KTV</div>
        </div>
      </div>

      {/* Biểu đồ mini: Tỷ lệ điểm danh */}
      {recentAttendance.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px', padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '14px' }}>
            Tỷ lệ điểm danh (30 ngày gần nhất)
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'Có mặt', value: present, color: '#10b981' },
              { label: 'Đi trễ', value: late, color: '#f59e0b' },
              { label: 'Vắng', value: absent, color: '#ef4444' },
              { label: 'Về sớm', value: earlyLeave, color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, minWidth: '100px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '10px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', marginTop: '16px' }}>
            {[
              { value: present,    color: '#10b981' },
              { value: late,       color: '#f59e0b' },
              { value: absent,    color: '#ef4444' },
              { value: earlyLeave, color: '#8b5cf6' },
            ].map(({ value, color }, i) => (
              value > 0 && (
                <div
                  key={i}
                  style={{
                    display: 'inline-block',
                    height: '100%',
                    width: `${(value / recentAttendance.length) * 100}%`,
                    background: color,
                  }}
                />
              )
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', textAlign: 'right' }}>
            Tổng: {recentAttendance.length} bản ghi
          </div>
        </div>
      )}

      {/* Chi tiết attendance gần đây */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionHeader}>
          <div className={styles.detailSectionTitle}>
            <span className={styles.icon}>📅</span>
            <span>Chi tiết điểm danh gần đây</span>
            <span className={`${styles.sectionCount} ${styles.countTicket}`}>
              {recentAttendance.length}
            </span>
          </div>
        </div>
        <div className={styles.detailSectionBody}>
          {recentAttendance.length === 0 ? (
            <div className={styles.emptyInner}>Chưa có bản ghi điểm danh.</div>
          ) : (
            <table className={styles.innerTable}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>NGÀY</th>
                  <th>CA</th>
                  <th>CHECK-IN</th>
                  <th>CHECK-OUT</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.slice(0, 20).map((att, idx) => {
                  const meta = ATTENDANCE_STATUS_META[att.status] || { label: att.status || '-', cls: 'statusInactive' };
                  const dateStr = att.attendanceDate
                    ? new Date(att.attendanceDate).toLocaleDateString('vi-VN', {
                        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
                      })
                    : '-';
                  return (
                    <tr key={att.checkinId || idx}>
                      <td className={styles.cellSTT}>{idx + 1}</td>
                      <td className={styles.cellDateCol}>{dateStr}</td>
                      <td className={styles.cellPlate}>{att.shiftName || '-'}</td>
                      <td className={styles.cellPlate}>{att.checkInTime || '-'}</td>
                      <td className={styles.cellPlate}>{att.checkOutTime || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.statusBadge} ${styles[meta.cls]}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  useScrollToTop();
  const navigate = useNavigate();
  const { staffId } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Load profile ──
  const doFetchProfile = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      const res = await fetchStaffDetail(staffId);
      setProfile(res?.data || null);
      setError('');
    } catch (err) {
      setError(err?.message || 'Không tải được thông tin nhân viên');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    doFetchProfile();
  }, [doFetchProfile]);

  // ── Derive ──────────────────────────────────────────────────────────────────
  const statusMeta = profile
    ? getStatusBadge(profile.employmentStatus || profile.status)
    : { cls: 'statusInactive', label: '-' };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Đang tải thông tin nhân viên...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.viewDetailBtn}
            onClick={() => navigate('/employee-manager')}
            style={{ fontSize: '14px', padding: '10px 16px' }}
          >
            ← Quay lại
          </button>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠️</div>
          <div className={styles.emptyTitle}>Lỗi tải dữ liệu</div>
          <div className={styles.emptyMessage}>{error || 'Không tìm thấy nhân viên'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={styles.viewDetailBtn}
            onClick={() => navigate('/employee-manager')}
            style={{ fontSize: '14px', padding: '10px 16px' }}
          >
            ← Quay lại
          </button>
          <h1 className={styles.title}>Hồ sơ nhân viên</h1>
        </div>
      </div>

      {/* Profile hero card */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px'
      }}>
        {/* Avatar + name + status */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: 'white', flexShrink: 0,
            overflow: 'hidden'
          }}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(profile?.fullName)
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
              {profile?.fullName || '-'}
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
              Mã NV: #{profile?.staffId} • {profile?.position || '-'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`${styles.statusBadge} ${styles[statusMeta.cls]}`}>{statusMeta.label}</span>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div style={{
          display: 'flex', gap: '0', marginTop: '20px',
          borderTop: '1px solid #f3f4f6', paddingTop: '16px',
          flexWrap: 'wrap'
        }}>
          {[
            { label: 'ĐIỆN THOẠI', value: profile?.phone || '—' },
            { label: 'EMAIL', value: profile?.email || '—' },
            { label: 'NGÀY SINH', value: profile?.dob ? formatDob(profile.dob) : '—' },
          ].map(({ label, value }, idx) => (
            <div key={label} style={{
              flex: 1, minWidth: '140px',
              borderRight: idx < 2 ? '1px solid #f3f4f6' : 'none',
              paddingRight: idx < 2 ? '20px' : '0',
              paddingLeft: idx > 0 ? '20px' : '0',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.5px' }}>
                {label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', wordBreak: 'break-word' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab: Hiệu suất — lấy từ profile.performance + profile.recentAttendance */}
      <PerformanceTab profile={profile} />
    </div>
  );
}
