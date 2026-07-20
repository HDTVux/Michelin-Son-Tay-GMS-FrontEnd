import { API_BASE_URL, request } from './apiClient.js';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;

const toSafePage = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return DEFAULT_PAGE;
  return Math.trunc(num);
};

const toSafeSize = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return DEFAULT_SIZE;
  return Math.trunc(num);
};

// Mã (code) trên wire ↔ nhãn tiếng Việt hiển thị
export const SEVERITY_LABELS = {
  INFO: 'Thông tin',
  WARNING: 'Cảnh báo',
  CRITICAL: 'Nghiêm trọng',
};

export const ACTION_LABELS = {
  LOGIN: 'Đăng nhập',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  PERMISSION: 'Phân quyền',
  PRICE_OVERRIDE: 'Ghi đè giá',
  EXPORT: 'Xuất dữ liệu',
  OTHER: 'Khác',
};

export const MODULE_LABELS = {
  AUTH: 'Xác thực',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
  BOOKING: 'Đặt lịch',
  SERVICE_TICKET: 'Phiếu dịch vụ',
  WAREHOUSE: 'Kho',
  PROMOTION: 'Khuyến mãi',
  BILLING: 'Thanh toán',
  AI: 'Trợ lý AI',
  CATALOG: 'Danh mục xe/phụ tùng',
  SERVICE: 'Dịch vụ',
  ESTIMATION: 'Báo giá',
  ATTENDANCE: 'Chấm công',
  DASHBOARD: 'Bảng điều khiển',
  VEHICLE: 'Phương tiện',
  CHAT: 'Trò chuyện',
  NOTIFICATION: 'Thông báo',
  FEEDBACK: 'Phản hồi',
};

export const ROLE_LABELS = {
  ADMIN: 'Quản trị',
  MANAGER: 'Quản lý',
  ADVISOR: 'Cố vấn dịch vụ',
  RECEPTIONIST: 'Lễ tân',
  TECHNICIAN: 'Kỹ thuật viên',
  ACCOUNTANT: 'Kế toán',
  CUSTOMER: 'Khách hàng',
};

const buildQuery = (params) => {
  const safe = params || {};
  const searchParams = new URLSearchParams();
  Object.entries(safe).forEach(([key, value]) => {
    if (key === 'page' || key === 'size') return;
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    searchParams.set(key, text);
  });
  return searchParams;
};

// GET /api/admin/system-logs — phân trang + filter
// params: page, size, startDate, endDate, role, action, severity, module, search
export const fetchSystemLogsPaged = (params, token) => {
  const searchParams = buildQuery(params);
  searchParams.set('page', String(toSafePage(params?.page)));
  searchParams.set('size', String(toSafeSize(params?.size)));
  return request(`/api/admin/system-logs?${searchParams.toString()}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET /api/admin/system-logs/stats — số liệu cho thẻ thống kê (theo cùng filter)
export const fetchSystemLogStats = (params, token) => {
  const qs = buildQuery(params).toString();
  return request(`/api/admin/system-logs/stats${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// GET /api/admin/system-logs/export — tải CSV. Không dùng request() vì response
// là file, không phải JSON ApiResponse.
export const exportSystemLogs = async (params, token) => {
  const qs = buildQuery(params).toString();
  const authToken = token || localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE_URL}/api/admin/system-logs/export${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Xuất dữ liệu thất bại (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nhat-ky-he-thong_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
