import { API_BASE_URL, request } from './apiClient.js';
import { MODULE_LABELS } from './systemLogService.js';

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

// Phân hệ dùng chung bộ mã với nhật ký hệ thống để lọc/đối chiếu thống nhất.
export { MODULE_LABELS };

export const CATEGORY_LABELS = {
  BUG: 'Lỗi chức năng',
  UI: 'Giao diện / hiển thị',
  PERFORMANCE: 'Chậm / treo',
  DATA: 'Sai dữ liệu',
  IMPROVEMENT: 'Góp ý cải tiến',
  OTHER: 'Khác',
};

export const SEVERITY_LABELS = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng',
};

export const STATUS_LABELS = {
  NEW: 'Mới',
  ACKNOWLEDGED: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
  REJECTED: 'Từ chối',
};

export const REPORTER_TYPE_LABELS = {
  STAFF: 'Nhân viên',
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

/**
 * Ngữ cảnh kỹ thuật tự thu thập để lập trình viên tái hiện lỗi mà không phải
 * hỏi lại người báo (trang nào, trình duyệt gì, màn hình bao nhiêu).
 */
export const collectClientContext = () => ({
  pageUrl: globalThis.location?.href?.slice(0, 500) || '',
  screenSize: `${globalThis.screen?.width || 0}x${globalThis.screen?.height || 0} @${globalThis.devicePixelRatio || 1}x`,
  appVersion: import.meta.env?.VITE_APP_VERSION || 'web',
});

// Nhân viên dùng authToken, khách hàng dùng customerToken (hai subdomain khác
// nhau nên không đụng nhau); BE tự nhận diện người gửi từ token.
export const getReporterToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('customerToken') || '';

/**
 * POST báo lỗi. Hai token ký bằng key khác nhau và StaffJwtFilter trả 401 khi
 * gặp token khách ngoài prefix /api/customer/ — nên khách phải đi đường riêng.
 */
export const submitBugReport = (payload) => {
  const staffToken = localStorage.getItem('authToken');
  const token = staffToken || localStorage.getItem('customerToken') || '';
  const path = staffToken ? '/api/bug-reports' : '/api/customer/bug-reports';
  return request(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
};

// GET /api/admin/bug-reports — danh sách phân trang (ADMIN)
export const fetchBugReportsPaged = (params) => {
  const searchParams = buildQuery(params);
  searchParams.set('page', String(toSafePage(params?.page)));
  searchParams.set('size', String(toSafeSize(params?.size)));
  return request(`/api/admin/bug-reports?${searchParams.toString()}`, { method: 'GET' });
};

// GET /api/admin/bug-reports/stats — thẻ thống kê theo cùng bộ lọc
export const fetchBugReportStats = (params) => {
  const qs = buildQuery(params).toString();
  return request(`/api/admin/bug-reports/stats${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

// PUT /api/admin/bug-reports/{id} — cập nhật trạng thái xử lý
export const updateBugReport = (reportId, payload) =>
  request(`/api/admin/bug-reports/${encodeURIComponent(reportId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// GET /api/admin/bug-reports/export — tải CSV. Không dùng request() vì response
// là file, không phải JSON ApiResponse.
export const exportBugReports = async (params) => {
  const qs = buildQuery(params).toString();
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE_URL}/api/admin/bug-reports/export${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Xuất dữ liệu thất bại (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bao-loi-phan-mem_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
