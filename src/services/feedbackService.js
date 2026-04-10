import { request } from './apiClient.js';

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

// GET /api/feedback/all
// params: page, size, search, starRating, startDate, endDate
export const fetchFeedbackPaged = (params, token) => {
  const safe = params || {};
  const searchParams = new URLSearchParams();

  // Defensive defaults to avoid backend crash: PageRequest requires size >= 1
  searchParams.set('page', String(toSafePage(safe.page)));
  searchParams.set('size', String(toSafeSize(safe.size)));

  Object.entries(safe).forEach(([key, value]) => {
    if (key === 'page' || key === 'size') return;
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
