import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { fetchAllStaff } from '../../../services/adminService.js';
import styles from './EmployeeManager.module.css';
import CreateEmployeeModal from './CreateEmployeeModal.jsx';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const normalizeStatus = (value) => {
  if (value == null || String(value).trim() === '') return null;
  return String(value).trim().toUpperCase();
};

const resolveStaffStatus = (staff) =>
  staff?.status ??
  staff?.employmentStatus ??
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
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]        = useState(false);
  const [searchTerm, setSearchTerm]      = useState('');
  const [statusFilter, setStatusFilter]  = useState('');

  // Pagination (client-side vì backend không hỗ trợ)
  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = 10;

  // Reset page khi search/filter thay đổi
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };
  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const requestSeqRef = useRef(0);

  // ── Derived summary stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = employees.length;
    const active   = employees.filter((e) => normalizeStatus(resolveStaffStatus(e)) === 'ACTIVE').length;
    const inactive = employees.filter((e) => normalizeStatus(resolveStaffStatus(e)) === 'INACTIVE').length;
    const locked   = employees.filter((e) => normalizeStatus(resolveStaffStatus(e)) === 'LOCKED').length;
    return { total, active, inactive, locked };
  }, [employees]);

  // ── Load employees ────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      setLoading(true);
      // Backend: GET /api/manager/employees → { success, data: [EmployeeResponse] }
      // EmployeeResponse: staffId, fullName, phone, email, position, gender, dob, avatar, employmentStatus, hireDate
      const response = await fetchAllStaff({});
      if (seq !== requestSeqRef.current) return;

      // unwrap: ApiResponse<List> → response.data = array
      const staffList = Array.isArray(response?.data) ? response.data : [];
      setEmployees(staffList);
    } catch (err) {
      console.error('Error loading employees:', err);
      toast.error(err?.message || 'Không tải được dữ liệu nhân viên');
      setEmployees([]);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadEmployees();
    const interval = setInterval(loadEmployees, 30000);
    return () => clearInterval(interval);
  }, [loadEmployees]);

  // ── Filter (client-side) ──────────────────────────────────────────────────
  const displayedEmployees = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();

    return employees.filter((e) => {
      if (statusFilter && normalizeStatus(resolveStaffStatus(e)) !== statusFilter) return false;
      if (term) {
        const matchName  = (e.fullName || '').toLowerCase().includes(term);
        const matchPhone = (e.phone    || '').toLowerCase().includes(term);
        const matchEmail = (e.email    || '').toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [employees, searchTerm, statusFilter]);

  // Slice đúng trang
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedEmployees.slice(start, start + itemsPerPage);
  }, [displayedEmployees, currentPage]);

  const handleCreated = () => {
    if (currentPage === 1) { loadEmployees(); return; }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(displayedEmployees.length / itemsPerPage) || 1;

  // ── Status label helper ──────────────────────────────────────────────────
  const getStatusMeta = (status) => {
    switch (status) {
      case 'ACTIVE':   return { cls: styles.statusActive,   label: 'Hoạt động' };
      case 'INACTIVE': return { cls: styles.statusInactive, label: 'Ngưng hoạt động' };
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
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Tổng nhân viên</div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statValue}>{stats.active}</div>
          <div className={styles.statLabel}>Đang hoạt động</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInactive}`}>
          <div className={styles.statValue}>{stats.inactive}</div>
          <div className={styles.statLabel}>Ngưng hoạt động</div>
        </div>
        <div className={`${styles.statCard} ${styles.statLocked}`}>
          <div className={styles.statValue}>{stats.locked}</div>
          <div className={styles.statLabel}>Đã khóa</div>
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
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngưng hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
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
              <th>EMAIL</th>
              <th>CHỨC DANH</th>
              <th>TRẠNG THÁI</th>
              <th>HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  Không có nhân viên nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp, idx) => {
                const status = normalizeStatus(resolveStaffStatus(emp));
                const statusMeta = getStatusMeta(status);
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
                    <td>{emp.email || '-'}</td>
                    <td>{emp.position || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </td>
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
          Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, displayedEmployees.length)} – {Math.min(currentPage * itemsPerPage, displayedEmployees.length)} trong {displayedEmployees.length} nhân viên
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
