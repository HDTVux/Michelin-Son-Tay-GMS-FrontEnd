import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchManagerEmployees } from '../../../services/managerService.js';
import styles from './EmployeeManager.module.css';

const ITEMS_PER_PAGE = 10;

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('adminToken') ||
  localStorage.getItem('staffToken') ||
  '';

export default function EmployeeManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Vui lòng đăng nhập để xem danh sách nhân viên.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchManagerEmployees(token);
      const list = Array.isArray(response?.data) ? response.data : [];
      setEmployees(list);
    } catch (err) {
      setEmployees([]);
      setError(err?.message || 'Không tải được danh sách nhân viên.');
      toast.error(err?.message || 'Không tải được danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const positions = useMemo(() => {
    const set = new Set(employees.map((e) => String(e?.position || '').trim()).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const positionOk = positionFilter === 'ALL' || String(e?.position || '') === positionFilter;
      if (!positionOk) return false;
      if (!q) return true;
      const haystack = `${e?.staffId ?? ''} ${e?.fullName ?? ''} ${e?.phone ?? ''} ${e?.position ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, search, positionFilter]);

  const stats = useMemo(() => {
    const total = employees.length;
    const female = employees.filter((e) => String(e?.gender || '').toUpperCase() === 'FEMALE').length;
    const male = employees.filter((e) => String(e?.gender || '').toUpperCase() === 'MALE').length;
    return { total, male, female, other: total - male - female };
  }, [employees]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, positionFilter]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý hồ sơ nhân viên</h1>
        <button type="button" className={styles.refreshButton} onClick={loadData}>
          ↻ Làm mới
        </button>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <p className={styles.statLabel}>Tổng nhân viên</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statMale}`}>
          <p className={styles.statLabel}>Nam</p>
          <p className={styles.statValue}>{stats.male}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statFemale}`}>
          <p className={styles.statLabel}>Nữ</p>
          <p className={styles.statValue}>{stats.female}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statOther}`}>
          <p className={styles.statLabel}>Khác / Chưa khai báo</p>
          <p className={styles.statValue}>{stats.other}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên, SĐT, staffId..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
        >
          {positions.map((p) => (
            <option key={p} value={p}>
              {p === 'ALL' ? 'Tất cả vị trí' : p}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải danh sách nhân viên...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠</div>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👤</div>
          <p className={styles.emptyTitle}>Không có nhân viên phù hợp</p>
          <p className={styles.emptyMessage}>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Số điện thoại</th>
                  <th>Vị trí</th>
                  <th>Giới tính</th>
                  <th>Ngày sinh</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((emp, idx) => (
                  <tr key={emp.staffId}>
                    <td>{(safePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td>
                      <div className={styles.employeeCell}>
                        <div className={styles.avatar}>{getInitials(emp.fullName)}</div>
                        <div className={styles.employeeMeta}>
                          <div className={styles.employeeName}>{emp.fullName || '-'}</div>
                          <div className={styles.employeeSub}>#{emp.staffId}</div>
                        </div>
                      </div>
                    </td>
                    <td>{emp.phone || '-'}</td>
                    <td>
                      <span className={styles.roleBadge}>{emp.position || '-'}</span>
                    </td>
                    <td>{emp.gender || '-'}</td>
                    <td>{emp.dob || '-'}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => navigate(`/employee-manager/${emp.staffId}`)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Hiển thị {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} trên {filtered.length} nhân viên
            </div>
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${safePage === p ? styles.active : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
