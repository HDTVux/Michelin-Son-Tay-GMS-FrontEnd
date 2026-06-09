import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAllStaff } from '../../../services/adminService.js';
import { fetchManagerEmployees } from '../../../services/managerService.js';
import { getAvatarSrc, handleAvatarError } from '../../../assets/defaultAvatar.js';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import styles from './EmployeeManager.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  ChartTooltip,
  ChartLegend
);

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

const getEmployeeRoleNames = (employee) => {
  const roleList = Array.isArray(employee?.roles)
    ? employee.roles.map(normalizeRoleName).filter(Boolean)
    : [];
  const fallbackRoles = getEmployeeRoleText(employee)
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
  return Array.from(new Set(roleList.length > 0 ? roleList : fallbackRoles));
};

const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const ROLE_SORT_ORDER = [
  'Quản trị viên',
  'Quản lý viên',
  'Cố vấn viên',
  'Lễ tân',
  'Kỹ thuật viên',
  'Kế toán viên',
  'Thủ kho',
  'ADMIN',
  'MANAGER',
  'ADVISOR',
  'RECEPTIONIST',
  'TECHNICIAN',
  'ACCOUNTANT',
  'WAREHOUSE',
  'STOREKEEPER',
];

const PIE_COLORS = [
  'rgba(30, 144, 255, 0.75)',   // Xanh dương (Dodger Blue)
  'rgba(16, 185, 129, 0.75)',   // Xanh lá (Emerald)
  'rgba(245, 158, 11, 0.75)',   // Vàng cam (Amber)
  'rgba(139, 92, 246, 0.75)',   // Tím (Violet)
  'rgba(236, 72, 153, 0.75)',   // Hồng (Pink)
  'rgba(14, 165, 233, 0.75)',   // Xanh da trời (Sky Blue)
  'rgba(20, 184, 166, 0.75)',   // Xanh ngọc (Teal)
  'rgba(239, 68, 68, 0.75)',    // Đỏ san hô (Coral Red)
  'rgba(168, 85, 247, 0.75)',   // Tím nhạt (Purple)
  'rgba(234, 179, 8, 0.75)',    // Vàng chanh (Yellow)
  'rgba(99, 102, 241, 0.75)',   // Indigo
  'rgba(244, 63, 94, 0.75)',    // Rose
];

const PIE_BORDER_COLORS = [
  'rgba(30, 144, 255, 1)',
  'rgba(16, 185, 129, 1)',
  'rgba(245, 158, 11, 1)',
  'rgba(139, 92, 246, 1)',
  'rgba(236, 72, 153, 1)',
  'rgba(14, 165, 233, 1)',
  'rgba(20, 184, 166, 1)',
  'rgba(239, 68, 68, 1)',
  'rgba(168, 85, 247, 1)',
  'rgba(234, 179, 8, 1)',
  'rgba(99, 102, 241, 1)',
  'rgba(244, 63, 94, 1)',
];

const compareRoleNames = (a, b) => {
  const aIndex = ROLE_SORT_ORDER.findIndex((role) => role.toLowerCase() === String(a).toLowerCase());
  const bIndex = ROLE_SORT_ORDER.findIndex((role) => role.toLowerCase() === String(b).toLowerCase());
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return String(a).localeCompare(String(b), 'vi', { sensitivity: 'base' });
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
    const set = new Set();
    employees.forEach((employee) => {
      getEmployeeRoleNames(employee).forEach((role) => set.add(role));
    });
    return ['ALL', ...Array.from(set).sort(compareRoleNames)];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const roleOk = !roleFilter || roleFilter === 'ALL' || getEmployeeRoleNames(employee).includes(roleFilter);
      if (!roleOk) return false;
      if (!q) return true;

      const haystack = `${employee?.staffId ?? ''} ${employee?.fullName ?? ''} ${employee?.phone ?? ''} ${employee?.roleDisplay ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, search, roleFilter]);

  const stats = useMemo(() => {
    const total = employees.length;
    const roleCounts = new Map();
    employees.forEach((employee) => {
      getEmployeeRoleNames(employee).forEach((role) => {
        roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
      });
    });
    const roleStats = Array.from(roleCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return compareRoleNames(a.label, b.label);
      });

    const maxCount = roleStats.length > 0 ? Math.max(...roleStats.map((r) => r.count)) : 1;

    return { total, roleStats, maxCount };
  }, [employees]);

  const chartData = useMemo(() => {
    return {
      labels: stats.roleStats.map((r) => r.label),
      datasets: [
        {
          label: 'Số lượng nhân viên',
          data: stats.roleStats.map((r) => r.count),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(16, 185, 129, 0.95)',
        },
      ],
    };
  }, [stats.roleStats]);

  const chartOptions = useMemo(() => {
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          padding: 10,
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleFont: {
            family: 'Inter, sans-serif',
            size: 13,
            weight: 'bold',
          },
          bodyFont: {
            family: 'Inter, sans-serif',
            size: 13,
          },
          callbacks: {
            label: (context) => ` ${context.raw} nhân viên`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0,
            font: {
              family: 'Inter, sans-serif',
              size: 12,
            },
          },
          grid: {
            color: '#f3f4f6',
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: 'Inter, sans-serif',
              size: 12.5,
              weight: '600',
            },
            color: '#374151',
          },
        },
      },
    };
  }, []);

  const pieData = useMemo(() => {
    return {
      labels: stats.roleStats.map((r) => r.label),
      datasets: [
        {
          label: 'Tỷ lệ vai trò',
          data: stats.roleStats.map((r) => r.count),
          backgroundColor: PIE_COLORS.slice(0, stats.roleStats.length),
          borderColor: PIE_BORDER_COLORS.slice(0, stats.roleStats.length),
          borderWidth: 1.5,
        },
      ],
    };
  }, [stats.roleStats]);

  const pieOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 10,
            font: {
              family: 'Inter, sans-serif',
              size: 11,
              weight: '500',
            },
            color: '#374151',
            padding: 8,
          },
        },
        tooltip: {
          padding: 10,
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleFont: {
            family: 'Inter, sans-serif',
            size: 13,
            weight: 'bold',
          },
          bodyFont: {
            family: 'Inter, sans-serif',
            size: 13,
          },
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw} nhân viên`,
          },
        },
      },
    };
  }, []);

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

      <div className={styles.statsContainer}>
        <div className={styles.totalStaffCard}>
          <div className={styles.totalStaffIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className={styles.totalStaffInfo}>
            <p className={styles.totalStaffValue}>{stats.total}</p>
            <p className={styles.totalStaffLabel}>Tổng nhân sự thực tế</p>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Phân bố vai trò (Cột ngang)</h2>
          <div className={styles.chartContainer}>
            {stats.roleStats.length > 0 ? (
              <Bar options={chartOptions} data={chartData} />
            ) : (
              <p className={styles.noChartData}>Chưa có dữ liệu thống kê vai trò.</p>
            )}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Tỷ lệ vai trò nhân viên (Tròn)</h2>
          <div className={styles.chartContainer}>
            {stats.roleStats.length > 0 ? (
              <Pie options={pieOptions} data={pieData} />
            ) : (
              <p className={styles.noChartData}>Chưa có dữ liệu thống kê vai trò.</p>
            )}
          </div>
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
          key={roles.length}
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
                      <div className={styles.roleBadgesContainer}>
                        {getEmployeeRoleNames(employee).length > 0 ? (
                          chunkArray(getEmployeeRoleNames(employee), 3).map((chunk, chunkIdx) => (
                            <div key={chunkIdx} className={styles.roleRow}>
                              {chunk.map((role) => (
                                <span key={role} className={styles.roleBadge}>
                                  {role}
                                </span>
                              ))}
                            </div>
                          ))
                        ) : (
                          '-'
                        )}
                      </div>
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
