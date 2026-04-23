import { request } from './apiClient';

const toSafePage = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
};

const toSafeSize = (value, fallback = 20) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? Math.trunc(number) : fallback;
};

// Lấy lịch sử công việc của kỹ thuật viên
export const fetchTechnicianWorkHistory = (params, token) => {
  const { startDate, endDate, licensePlate, page = 0, size = 20 } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('startDate', startDate);
  searchParams.set('endDate', endDate);
  if (licensePlate) searchParams.set('licensePlate', licensePlate);
  searchParams.set('page', String(toSafePage(page)));
  searchParams.set('size', String(toSafeSize(size)));

  const path = `/api/work-history?${searchParams.toString()}`;

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
