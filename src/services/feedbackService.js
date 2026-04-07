import { request } from './apiClient.js';

// GET /api/feedback/all
// params: page, size, search, starRating, startDate, endDate
export const fetchFeedbackPaged = (params, token) => {
  const safe = params || {};
  const searchParams = new URLSearchParams();

  Object.entries(safe).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    searchParams.set(key, text);
  });

  const qs = searchParams.toString();
  const path = qs ? `/api/feedback/all?${qs}` : '/api/feedback/all';

  return request(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

