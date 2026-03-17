import { request } from './apiClient';

// Lấy lịch sử công việc của kỹ thuật viên
export const fetchTechnicianWorkHistory = (params, token) => {
  const { startDate, endDate, licensePlate, page = 0, size = 20 } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('startDate', startDate);
  searchParams.set('endDate', endDate);
  if (licensePlate) searchParams.set('licensePlate', licensePlate);
  searchParams.set('page', page.toString());
  searchParams.set('size', size.toString());

  const path = `/api/work-history?${searchParams.toString()}`;

  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};
