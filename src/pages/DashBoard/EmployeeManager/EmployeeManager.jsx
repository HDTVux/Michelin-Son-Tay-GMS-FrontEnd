import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAllStaff } from '../../../services/adminService.js';
import { fetchManagerEmployees } from '../../../services/managerService.js';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import styles from './EmployeeManager.module.css';

const ITEMS_PER_PAGE = 10;

const getAuthToken = () =>
  localStorage.getItem('authToken')
  || localStorage.getItem('adminToken')
  || localStorage.getItem('staffToken')
  || '';

const pickText = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const normalizeRoleName = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return pickText(
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

const getEmployeeRoleText = (employee) => {
  const roleList = Array.isArray(employee?.roles)
    ? employee.roles.map(normalizeRoleName).filter(Boolean)
    : [];
  const uniqueRoles = Array.from(new Set(roleList));
  if (uniqueRoles.length > 0) return uniqueRoles.join(', ');

  return pickText(
    employee?.roleName,
    employee?.role,
    employee?.staffRole,
    employee?.staffRoleName,
    employee?.position,
  );
};

const extractStaffList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload)) return payload;
  return [];
};

export default function EmployeeManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
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
      const managerList = Array.isArray(response?.data) ? response.data : [];
      let adminMap = new Map();

      try {
        const adminResponse = await fetchAllStaff({ page: 0, size: 500 }, token);
        const adminList = extractStaffList(adminResponse);
        adminMap = new Map(
          adminList
            .map((staff) => [Number(staff?.staffId), staff])
            .filter(([staffId]) => Number.isFinite(staffId) && staffId > 0),
        );
      } catch {
        adminMap = new Map();
      }

      const normalized = managerList.map((employee) => {
        const staffId = Number(employee?.staffId);
        const adminEmployee = Number.isFinite(staffId) ? adminMap.get(staffId) : null;
        const mergedEmployee = adminEmployee ? { ...adminEmployee, ...employee, roles: employee?.roles ?? adminEmployee?.roles } : employee;
        return {
          ...mergedEmployee,
          roleDisplay: getEmployeeRoleText(mergedEmployee),
        };
      });
      setEmployees(normalized);
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

  const roles = useMemo(() => {
    const set = new Set(employees.map((e) => String(e?.roleDisplay || '').trim()).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const roleOk = roleFilter === 'ALL' || String(employee?.roleDisplay || '') === roleFilter;
      if (!roleOk) return false;
      if (!q) return true;

      const haystack = `${employee?.staffId ?? ''} ${employee?.fullName ?? ''} ${employee?.phone ?? ''} ${employee?.roleDisplay ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, search, roleFilter]);

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
  }, [search, roleFilter]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý hồ sơ nhân viên</h1>
        <button type="button" className={styles.refreshButton} onClick={loadData}>
          Làm mới
        </button>
      </div>

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

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên, SĐT, staffId..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role === 'ALL' ? 'Tất cả vai trò' : role}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Đang tải danh sách nhân viên...</p>
        </div>
      )}

      {!loading && error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>!</div>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>N</div>
          <p className={styles.emptyTitle}>Không có nhân viên phù hợp</p>
          <p className={styles.emptyMessage}>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Giới tính</th>
                  <th>Ngày sinh</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((employee, idx) => (
                  <tr key={employee.staffId}>
                    <td>{(safePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td>
                      <div className={styles.employeeCell}>
                        <div className={styles.avatar}>
                          <img
                            src={getAvatarSrc(employee.avatar || employee.avatarUrl)}
                            alt={employee.fullName || 'Avatar'}
                            onError={handleAvatarError}
                          />
                        </div>
                        <div className={styles.employeeMeta}>
                          <div className={styles.employeeName}>{employee.fullName || '-'}</div>
                          <div className={styles.employeeSub}>#{employee.staffId}</div>
                        </div>
                      </div>
                    </td>
                    <td>{employee.phone || '-'}</td>
                    <td>
                      <span className={styles.roleBadge}>{employee.roleDisplay || '-'}</span>
                    </td>
                    <td>{employee.gender || '-'}</td>
                    <td>{employee.dob || '-'}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => navigate(`/employee-manager/${employee.staffId}`)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Hiển thị {(safePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} trên {filtered.length} nhân viên
            </div>
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  className={`${styles.pageBtn} ${safePage === value ? styles.active : ''}`}
                  onClick={() => setPage(value)}
                >
                  {value}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
