import { request } from './apiClient';

// Lấy thống kê cá nhân theo tháng
export const fetchStaffStatistics = (month, year) => {
  // apiClient.js tự lấy authToken từ localStorage
  const path = `/api/staff/statistics?month=${month}&year=${year}`;
  return request(path, { method: 'GET' });
};
