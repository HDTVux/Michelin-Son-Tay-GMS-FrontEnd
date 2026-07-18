import { request } from './apiClient.js';

// Lấy log ứng dụng backend (ADMIN). Hỗ trợ poll tăng dần bằng afterId.
// GET /api/admin/backend-logs?level=&search=&afterId=&limit=
export const fetchBackendLogs = (params = {}, token) => {
  const qp = new URLSearchParams();
  if (params.level) qp.set('level', params.level);
  if (params.search) qp.set('search', params.search);
  if (params.afterId != null) qp.set('afterId', String(params.afterId));
  if (params.limit != null) qp.set('limit', String(params.limit));
  const qs = qp.toString();
  return request(`/api/admin/backend-logs${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
