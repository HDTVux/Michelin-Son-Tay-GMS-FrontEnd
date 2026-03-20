import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchAllStaff, fetchAllStaffRoles } from '../../../services/adminService.js';
import styles from './EmployeeManager.module.css';
import CreateEmployeeModal from './CreateEmployeeModal.jsx';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

const normalizeStatus = (value) => {
  if (value == null || String(value).trim() === '') return null;
  return String(value).trim().toUpperCase();
};

const resolveStaffStatus = (staff) =>
  staff?.status ??
  staff?.authStatus ??
  staff?.staffAuthStatus ??
  staff?.accountStatus ??
  staff?.userStatus ??
  staff?.staffAuth?.status;


// ─── Main Component ────────────────────────────────────────────────────────────

const EmployeeManager = () => {
  useScrollToTop();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [employees, setEmployees]        = useState([]);
  const [allRoles, setAllRoles]          = useState([]);
  const [loading, setLoading]            = useState(true);
  const [showModal, setShowModal]        = useState(false);
  const [searchTerm, setSearchTerm]      = useState('');
  const [statusFilter, setStatusFilter]  = useState('ALL');
  const [roleFilter, setRoleFilter]      = useState('');

  // Pagination
  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems]     = useState(0);

  const requestSeqRef = useRef(0);

  // ── Derived summary stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = employees.length;
    const active     = employees.filter((e) => normalizeStatus(resolveStaffStatus(e)) === 'ACTIVE').length;
    const totalTickets  = employees.reduce((s, e) => s + (e.totalTickets || 0), 0);
    const totalServices = employees.reduce((s, e) => s + (e.totalServices || 0), 0);
    return { total, active, totalTickets, totalServices };
  }, [employees]);

  // ── Load roles ────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const response = await fetchAllStaffRoles(token);
        const list = Array.isArray(response?.data) ? response.data : [];
        const normalized = list
          .map((r) => {
            const id = Number(r?.roleId);
            return {
              roleId: Number.isFinite(id) ? id : undefined,
              roleCode: r?.roleCode ? String(r.roleCode).trim().toUpperCase() : '',
              label: r?.roleName ? String(r.roleName).trim() : (r?.roleCode || '')
            };
          })
          .filter((r) => Number.isFinite(r.roleId) && r.roleId > 0);
        setAllRoles(normalized);
      } catch {
        setAllRoles([]);
      }
    };
    loadRoles();
  }, []);

  // ── Load employees ────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        toast.error('Vui lòng đăng nhập để xem danh sách nhân viên');
        return;
      }

      const params = {
        page: currentPage - 1,
        size: itemsPerPage,
        search: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      };

      const response = await fetchAllStaff(params, token);
      if (seq !== requestSeqRef.current) return;

      if (response?.success && response?.data) {
        const { content, totalElements } = response.data;
        const visible = (content || []).filter(
          (e) => normalizeStatus(resolveStaffStatus(e)) !== 'DELETED'
        );

        if (visible.length === 0 && (totalElements || 0) > 0 && currentPage > 1) {
          setCurrentPage((p) => Math.max(1, p - 1));
          return;
        }

        setEmployees(visible);
        setTotalItems(totalElements || 0);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      toast.error(err?.message || 'Không tải được dữ liệu nhân viên');
      setEmployees([]);
      setTotalItems(0);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadEmployees();
    const interval = setInterval(loadEmployees, 30000);
    return () => clearInterval(interval);
  }, [loadEmployees]);

  const handleCreated = () => {
    if (currentPage === 1) { loadEmployees(); return; }
    setCurrentPage(1);
  };

  // ── Role display helper ──────────────────────────────────────────────────
  const getRoleLabel = (emp) => {
    const roles = emp?.roles;
    if (Array.isArray(roles) && roles.length > 0) {
      return roles
        .map((r) => r?.roleName?.trim() || r?.roleCode || '')
        .filter(Boolean)
        .join(', ');
    }
    return emp?.position || '-';
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const displayedEmployees = useMemo(() => {
    let list = employees;
    if (roleFilter) {
      list = list.filter((e) =>
        (e?.roles || []).some((r) => String(r?.roleId) === String(roleFilter))
      );
    }
    return list;
  }, [employees, roleFilter]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // ── Status label helper ──────────────────────────────────────────────────
  const getStatusMeta = (status) => {
    switch (status) {
      case 'ACTIVE':   return { cls: styles.statusActive,   label: 'Hoạt động' };
      case 'INACTIVE':  return { cls: styles.statusInactive, label: 'Ngưng hoạt động' };
      case 'LOCKED':   return { cls: styles.statusLocked,   label: 'Đã khóa' };
      default:         return { cls: styles.statusInactive, label: status || '-' };
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading && employees.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý hồ sơ nhân viên</h1>
      </div>

      {/* Stats row */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statValue}>{totalItems}</div>
          <div className={styles.statLabel}>Tổng nhân viên</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{stats.active}</div>
          <div className={styles.statLabel}>Đang hoạt động</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <div className={styles.statValue}>{stats.totalTickets}</div>
          <div className={styles.statLabel}>Tổng Ticket</div>
        </div>
        <div className={`${styles.statCard} ${styles.statLocked}`}>
          <div className={styles.statValue}>{stats.totalServices}</div>
          <div className={styles.statLabel}>Tổng Dịch Vụ</div>
        </div>
        <div className={`${styles.statCard} ${styles.statRating}`}>
          <div className={styles.statValue}>4.7</div>
          <div className={styles.statLabel}>Điểm TB</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên, SĐT..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngưng hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Tất cả vai trò</option>
            {allRoles.map((r) => (
              <option key={r.roleId} value={String(r.roleId)}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>STT</th>
              <th>NHÂN VIÊN</th>
              <th>VAI TRÒ</th>
              <th>TRẠNG THÁI</th>
              <th>TỔNG TICKET</th>
              <th>TỔNG DỊCH VỤ</th>
              <th>TỔNG GIỜ LÀM</th>
              <th>ĐÁNH GIÁ</th>
              <th>HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {displayedEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  Không có nhân viên nào phù hợp.
                </td>
              </tr>
            ) : (
              displayedEmployees.map((emp, idx) => {
                const status = normalizeStatus(resolveStaffStatus(emp));
                const statusMeta = getStatusMeta(status);
                const roleLabel = getRoleLabel(emp);
                return (
                  <tr key={emp.staffId || emp.id || idx}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td>
                      <div className={styles.employeeCell}>
                        <img
                          src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName || 'NV')}&background=1E90FF&color=fff`}
                          alt={emp.fullName || 'Avatar'}
                          className={styles.avatar}
                        />
                        <div className={styles.employeeMeta}>
                          <div className={styles.employeeName}>{emp.fullName || emp.name || '-'}</div>
                          <div className={styles.employeeSub}>{emp.phone || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.roleBadge}>{roleLabel}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>{emp.totalTickets || 0}</td>
                    <td>{emp.totalServices || 0}</td>
                    <td>{emp.totalHours ? `${emp.totalHours} giờ` : '0 giờ'}</td>
                    <td>{emp.avgRating ? `${emp.avgRating} ★` : 'Chưa có'}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => navigate(`/employee-manager/${emp.staffId || emp.id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Hiển thị {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, totalItems)} trong {totalItems} nhân viên
        </div>
        <div className={styles.paginationButtons}>
          <button
            className={styles.pageBtn}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`${styles.pageBtn} ${currentPage === p ? styles.active : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Sau
          </button>
        </div>
      </div>

      {/* Create Modal */}
      <CreateEmployeeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default EmployeeManager;
