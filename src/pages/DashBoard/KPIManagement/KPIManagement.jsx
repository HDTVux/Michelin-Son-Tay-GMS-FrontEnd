import { useState, useEffect, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  fetchKpiDashboard, fetchStaffKpiDetails, fetchKpiConfigs,
  updateKpiConfig, recalculateKpi, recalculateAllKpi,
} from '../../../services/kpiService';
import styles from './KPIManagement.module.css';

/* ─────────────────── helpers ─────────────────── */
const getToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('staffToken') ||
  localStorage.getItem('adminToken') || '';

const scoreColor = (v) =>
  v >= 80 ? '#16a34a' : v >= 60 ? '#a16207' : '#b91c1c';

const defectColor = (n) =>
  n === 0 ? '#16a34a' : n <= 2 ? '#a16207' : '#b91c1c';

const badgeClass = (score, s) => {
  if (score >= 85) return s.badgeSuccess;
  if (score >= 70) return s.badgeWarning;
  return s.badgeDanger;
};

const badgeLabel = (score) => {
  if (score >= 85) return 'Xuất sắc';
  if (score >= 70) return 'Đạt yêu cầu';
  return 'Cần cải thiện';
};

const ROLES = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
  { value: 'ADVISOR', label: 'Cố vấn dịch vụ' },
  { value: 'RECEPTIONIST', label: 'Lễ tân' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ACCOUNTANT', label: 'Kế toán' },
  { value: 'WAREHOUSE_KEEPER', label: 'Thủ kho' },
];

/* ─────────────────── component ─────────────────── */
export default function KPIManagement() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // dashboard state
  const [kpiList, setKpiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // config state
  const [configs, setConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState(null);

  // drill-down state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDetails, setStaffDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcAll, setRecalcAll] = useState(false);

  /* ── load dashboard ── */
  const loadKpiDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchKpiDashboard(month, year, getToken());
      if (res?.success) setKpiList(res.data || []);
      else setError(res?.message || 'Không thể tải dữ liệu KPI.');
    } catch {
      setError('Lỗi kết nối server.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  /* ── load configs ── */
  const loadConfigs = useCallback(async () => {
    setConfigsLoading(true);
    try {
      const res = await fetchKpiConfigs(getToken());
      if (res?.success) setConfigs(res.data || []);
    } catch { /* ignore */ }
    finally { setConfigsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') loadKpiDashboard();
    else loadConfigs();
  }, [activeTab, month, year, loadKpiDashboard, loadConfigs]);

  /* ── drill-down ── */
  const handleStaffClick = async (staff) => {
    setSelectedStaff(staff);
    setDetailsLoading(true);
    setStaffDetails(null);
    try {
      const res = await fetchStaffKpiDetails(staff.staffId, month, year, getToken());
      if (res?.success) setStaffDetails(res.data);
    } catch { /* ignore */ }
    finally { setDetailsLoading(false); }
  };

  /* ── recalc single ── */
  const handleRecalculate = async () => {
    if (!selectedStaff) return;
    setRecalculating(true);
    try {
      const res = await recalculateKpi(selectedStaff.staffId, month, year, getToken());
      if (res?.success) {
        setStaffDetails(res.data);
        loadKpiDashboard();
      }
    } catch { /* ignore */ }
    finally { setRecalculating(false); }
  };

  /* ── recalc all ── */
  const handleRecalculateAll = async () => {
    setRecalcAll(true);
    try {
      await recalculateAllKpi(month, year, getToken());
      await loadKpiDashboard();
    } catch { /* ignore */ }
    finally { setRecalcAll(false); }
  };

  /* ── save config ── */
  const handleSaveConfig = async (config, index) => {
    const sum = config.attendanceWeight + config.completionWeight +
      config.satisfactionWeight + config.qualityWeight;
    if (Math.abs(sum - 1.0) > 0.001) {
      alert(`Tổng trọng số phải bằng 100%! Hiện tại: ${Math.round(sum * 100)}%`);
      return;
    }
    setSavingIdx(index);
    try {
      const res = await updateKpiConfig(config.configId, config, getToken());
      if (res?.success) alert(`✅ Đã lưu cấu hình KPI vai trò: ${config.roleName}`);
      else alert(res?.message || 'Có lỗi xảy ra.');
    } catch { alert('Lỗi kết nối.'); }
    finally { setSavingIdx(null); }
  };

  const updateWeight = (idx, field, val) => {
    setConfigs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: parseFloat(val) };
      return next;
    });
  };

  const updateTarget = (idx, field, val) => {
    setConfigs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === 'targetTickets' ? parseInt(val) || 0 : parseFloat(val) || 0 };
      return next;
    });
  };

  /* ── filtered list ── */
  const filtered = kpiList.filter(item => {
    const name = (item.fullName || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) &&
      (roleFilter === 'ALL' || item.role === roleFilter);
  });

  /* ── summary cards ── */
  const avgKpi = kpiList.length
    ? Math.round(kpiList.reduce((s, i) => s + i.totalKpiScore, 0) / kpiList.length * 10) / 10
    : 0;
  const top = kpiList.length
    ? [...kpiList].sort((a, b) => b.totalKpiScore - a.totalKpiScore)[0]
    : null;
  const warnCount = kpiList.filter(i => i.totalKpiScore < 70).length;

  /* ── render ── */
  return (
    <div className={styles.container}>

      {/* ─── Header ─── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý & Báo cáo KPI Nhân viên</h1>
          <p className={styles.subtitle}>Thiết lập trọng số và giám sát hiệu quả làm việc toàn garage</p>
        </div>
        <div className={styles.tabContainer}>
          {['dashboard', 'config'].map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' ? '📊 Dashboard Hiệu Suất' : '⚙️ Cấu Hình Trọng Số'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DASHBOARD TAB ─── */}
      {activeTab === 'dashboard' && (
        <>
          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <div className={styles.selectWrapper}>
                <label className={styles.filterLabel}>Tháng</label>
                <select value={month} onChange={e => setMonth(+e.target.value)} className={styles.filterSelect}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <label className={styles.filterLabel}>Năm</label>
                <select value={year} onChange={e => setYear(+e.target.value)} className={styles.filterSelect}>
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <label className={styles.filterLabel}>Chức vụ</label>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={styles.filterSelect}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.filterRight}>
              <input
                type="text"
                placeholder="🔍 Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <button
                className={styles.recalcAllBtn}
                onClick={handleRecalculateAll}
                disabled={recalcAll || loading}
                title="Xóa cache và tính lại KPI cho tất cả nhân viên trong kỳ này"
              >
                {recalcAll ? '⏳ Đang tính lại...' : '🔄 Tính lại tất cả'}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📈</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>KPI Trung Bình Tháng {month}/{year}</span>
                <span className={styles.summaryVal}>{avgKpi} / 100</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>🏆</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Xuất Sắc Nhất</span>
                <span className={styles.summaryVal}>
                  {top ? `${top.fullName} (${top.totalKpiScore})` : '—'}
                </span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>⚠️</div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Cần Cải Thiện (&lt;70 điểm)</span>
                <span className={styles.summaryVal}>{warnCount} nhân sự</span>
              </div>
            </div>
          </div>

          {/* KPI Table */}
          <div className={styles.tableCard}>
            {loading ? (
              <div className={styles.loadingState}>
                <span className={styles.spinner} /> Đang tải dữ liệu KPI...
              </div>
            ) : error ? (
              <div className={styles.errorState}>⚠️ {error}</div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>Không tìm thấy nhân viên phù hợp.</div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Vai trò</th>
                      <th title="Tỷ lệ ngày có mặt trừ điểm đi muộn">Chuyên cần</th>
                      <th title="Tỷ lệ ticket hoàn thành / được giao">Hiệu suất việc</th>
                      <th title="Điểm sao feedback từ khách hàng">Đánh giá KH</th>
                      <th title="Số lần gây lỗi hàng trong kỳ">Lỗi hỏng</th>
                      <th>KPI Tổng hợp</th>
                      <th>Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.staffId} className={styles.tableRow} onClick={() => handleStaffClick(item)}>
                        <td>
                          <div className={styles.staffProfile}>
                            <img
                              src={item.avatar || 'https://i.pravatar.cc/40'}
                              alt={item.fullName}
                              className={styles.avatar}
                              onError={e => { e.target.src = 'https://i.pravatar.cc/40'; }}
                            />
                            <div>
                              <span className={styles.staffName}>{item.fullName}</span>
                              <span className={styles.staffPosition}>{item.position || item.role}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className={styles.roleTag}>{item.role}</span></td>
                        <td>
                          <span style={{ fontWeight: 600, color: scoreColor(item.attendanceScore) }}>
                            {item.attendanceScore}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: scoreColor(item.completionScore) }}>
                            {item.completionScore}%
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: scoreColor(item.satisfactionScore) }}>
                            {item.satisfactionScore}%
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: defectColor(item.defectCount ?? 0) }}>
                            {item.defectCount ?? 0} lỗi
                          </span>
                        </td>
                        <td><span className={styles.totalScore}>{item.totalKpiScore}</span></td>
                        <td>
                          <span className={`${styles.badge} ${badgeClass(item.totalKpiScore, styles)}`}>
                            {badgeLabel(item.totalKpiScore)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── CONFIG TAB ─── */}
      {activeTab === 'config' && (
        <div className={styles.configContainer}>
          <div className={styles.configNote}>
            💡 Trọng số của mỗi vai trò phải cộng lại bằng <strong>100%</strong>.
            Sau khi lưu, hãy bấm <em>Tính lại tất cả</em> ở tab Dashboard để cập nhật điểm KPI.
          </div>
          {configsLoading ? (
            <div className={styles.loadingState}><span className={styles.spinner} /> Đang tải cấu hình...</div>
          ) : configs.length === 0 ? (
            <div className={styles.emptyState}>Chưa có cấu hình trọng số nào.</div>
          ) : (
            <div className={styles.configGrid}>
              {configs.map((config, idx) => {
                const total = config.attendanceWeight + config.completionWeight +
                  config.satisfactionWeight + config.qualityWeight;
                const valid = Math.abs(total - 1.0) < 0.001;
                return (
                  <div key={config.configId} className={styles.configCard}>
                    <h3 className={styles.configRoleTitle}>Vai trò: {config.roleName}</h3>
                    <div className={styles.slidersList}>
                      {[
                        { key: 'attendanceWeight', label: '📅 Chuyên cần (Điểm danh)' },
                        { key: 'completionWeight', label: '✅ Hiệu suất (Hoàn thành ticket)' },
                        { key: 'satisfactionWeight', label: '⭐ Đánh giá từ khách hàng' },
                        { key: 'qualityWeight', label: '🔧 Chất lượng (Phạt lỗi hỏng)' },
                      ].map(({ key, label }) => (
                        <div key={key} className={styles.sliderItem}>
                          <div className={styles.sliderHeader}>
                            <span>{label}</span>
                            <span className={styles.sliderVal}>{Math.round(config[key] * 100)}%</span>
                          </div>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={config[key]}
                            onChange={e => updateWeight(idx, key, e.target.value)}
                            className={styles.sliderInput}
                          />
                        </div>
                      ))}
                    </div>
                    <div className={styles.configTargets}>
                      <h4 className={styles.targetTitle}>Mục tiêu hàng tháng</h4>
                      <div className={styles.targetGrid}>
                        <div className={styles.targetItem}>
                          <label>Số Ticket</label>
                          <input type="number" value={config.targetTickets}
                            onChange={e => updateTarget(idx, 'targetTickets', e.target.value)}
                            className={styles.targetInput} min="0" />
                        </div>
                        <div className={styles.targetItem}>
                          <label>Số Giờ làm</label>
                          <input type="number" value={config.targetHours}
                            onChange={e => updateTarget(idx, 'targetHours', e.target.value)}
                            className={styles.targetInput} min="0" />
                        </div>
                        <div className={styles.targetItem}>
                          <label>Điểm Đánh Giá</label>
                          <input type="number" step="0.1" max="5.0" min="0" value={config.targetRating}
                            onChange={e => updateTarget(idx, 'targetRating', e.target.value)}
                            className={styles.targetInput} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.configFooter}>
                      <span className={`${styles.weightSum} ${valid ? styles.weightValid : styles.weightInvalid}`}>
                        Tổng: {Math.round(total * 100)}% {valid ? '✅' : '❌ (cần = 100%)'}
                      </span>
                      <button
                        onClick={() => handleSaveConfig(config, idx)}
                        className={styles.saveConfigBtn}
                        disabled={savingIdx === idx || !valid}
                      >
                        {savingIdx === idx ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── DRILL-DOWN MODAL ─── */}
      {selectedStaff && (
        <div className={styles.modalOverlay} onClick={() => setSelectedStaff(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div className={styles.modalStaffInfo}>
                <img
                  src={selectedStaff.avatar || 'https://i.pravatar.cc/50'}
                  alt={selectedStaff.fullName}
                  className={styles.modalAvatar}
                  onError={e => { e.target.src = 'https://i.pravatar.cc/50'; }}
                />
                <div>
                  <h2 className={styles.modalStaffName}>{selectedStaff.fullName}</h2>
                  <p className={styles.modalStaffDesc}>
                    {selectedStaff.position || selectedStaff.role} &nbsp;|&nbsp;
                    Kỳ đánh giá: tháng {month}/{year}
                  </p>
                </div>
              </div>
              <button className={styles.closeModalBtn} onClick={() => setSelectedStaff(null)}>×</button>
            </div>

            {detailsLoading ? (
              <div className={styles.modalLoading}><span className={styles.spinner} /> Đang tải chi tiết KPI...</div>
            ) : staffDetails ? (
              <div className={styles.modalBody}>

                {/* Top row: radar + score/trend */}
                <div className={styles.modalGrid}>
                  <div className={styles.cardSection}>
                    <p className={styles.sectionTitle}>Biểu đồ mạng nhện hiệu suất</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={[
                        { subject: 'Chuyên cần', score: staffDetails.attendanceScore },
                        { subject: 'Hoàn thành', score: staffDetails.completionScore },
                        { subject: 'Hài lòng KH', score: staffDetails.satisfactionScore },
                        { subject: 'Không lỗi', score: staffDetails.qualityScore },
                      ]}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.35} />
                        <Tooltip formatter={v => [`${v} điểm`]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={styles.cardSection}>
                    <div className={styles.scoreRow}>
                      <div className={styles.bigScoreCard}>
                        <span
                          className={styles.bigScoreVal}
                          style={{ color: scoreColor(staffDetails.totalKpiScore) }}
                        >
                          {staffDetails.totalKpiScore}
                        </span>
                        <span className={styles.bigScoreLabel}>ĐIỂM KPI TỔNG HỢP / 100</span>
                        <span className={`${styles.badge} ${badgeClass(staffDetails.totalKpiScore, styles)}`} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                          {badgeLabel(staffDetails.totalKpiScore)}
                        </span>
                      </div>
                      <button
                        className={styles.recalcBtn}
                        onClick={handleRecalculate}
                        disabled={recalculating}
                      >
                        {recalculating ? '⏳ Đang tính...' : '🔄 Tính lại'}
                      </button>
                    </div>

                    <p className={styles.sectionTitle} style={{ marginTop: 16 }}>Xu hướng KPI 6 tháng gần nhất</p>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={staffDetails.trend || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="periodMonth" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={v => [`${v} điểm`]} />
                        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Breakdown */}
                <div className={styles.breakdownSection}>
                  <p className={styles.sectionTitle}>📋 Chi tiết thông số tính toán</p>
                  <div className={styles.breakdownGrid}>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Chuyên cần (Điểm danh)</span>
                      <span className={styles.breakdownValue} style={{ color: scoreColor(staffDetails.attendanceScore) }}>
                        {staffDetails.presentCount} / {staffDetails.expectedWorkDays} ngày làm việc
                        {staffDetails.lateCount > 0 && (
                          <span className={styles.lateDetail}> — Muộn {staffDetails.lateCount} ngày (-{staffDetails.lateCount * 5}đ)</span>
                        )}
                      </span>
                    </div>

                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Hiệu suất công việc</span>
                      <span className={styles.breakdownValue} style={{ color: scoreColor(staffDetails.completionScore) }}>
                        {staffDetails.completedTasks} / {staffDetails.totalTasks} tickets hoàn thành
                        {staffDetails.totalTasks === 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}> (chưa có ticket)</span>}
                      </span>
                    </div>

                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Đánh giá từ khách hàng</span>
                      <span className={styles.breakdownValue} style={{ color: scoreColor(staffDetails.satisfactionScore) }}>
                        {staffDetails.averageRating} ★ / 5.0
                        {staffDetails.ratingCount === 0
                          ? <span style={{ color: '#94a3b8', fontWeight: 400 }}> (chưa có đánh giá)</span>
                          : <span style={{ color: '#64748b', fontWeight: 400 }}> ({staffDetails.ratingCount} lượt)</span>
                        }
                      </span>
                    </div>

                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Lỗi hỏng hóc (kho / kỹ thuật)</span>
                      <span className={styles.breakdownValue} style={{ color: defectColor(staffDetails.defectCount) }}>
                        {staffDetails.defectCount === 0
                          ? '✅ Không có lỗi'
                          : `${staffDetails.defectCount} lỗi — phạt ${staffDetails.defectCount * 10} điểm`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Ranh giới cứng */}
                  <div className={styles.hardLimitBox}>
                    <p className={styles.hardLimitTitle}>⚡ Ranh giới cứng (Hard Limit)</p>
                    <div className={styles.hardLimitGrid}>
                      <div className={`${styles.hardLimitItem} ${staffDetails.attendanceScore < 60 ? styles.hardLimitTriggered : styles.hardLimitOk}`}>
                        <span>Chuyên cần &lt; 60 điểm</span>
                        <span>→ KPI tổng bị giới hạn ≤ <strong>60</strong></span>
                        <span className={styles.hardLimitStatus}>
                          {staffDetails.attendanceScore < 60 ? '🔴 Đang áp dụng' : '🟢 Không kích hoạt'}
                        </span>
                      </div>
                      <div className={`${styles.hardLimitItem} ${staffDetails.qualityScore === 0 ? styles.hardLimitTriggered : styles.hardLimitOk}`}>
                        <span>Lỗi hỏng ≥ 10 lần (điểm chất lượng = 0)</span>
                        <span>→ KPI tổng bị giới hạn ≤ <strong>50</strong></span>
                        <span className={styles.hardLimitStatus}>
                          {staffDetails.qualityScore === 0 ? '🔴 Đang áp dụng' : '🟢 Không kích hoạt'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.modalError}>Không có dữ liệu chi tiết KPI cho nhân viên này trong kỳ này.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
