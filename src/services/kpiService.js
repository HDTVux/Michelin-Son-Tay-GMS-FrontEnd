import { request } from './apiClient';

// Lấy danh sách KPI tổng hợp cho Manager
export const fetchKpiDashboard = (month, year, token) => {
  const path = `/api/kpi/dashboard?month=${month}&year=${year}`;
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy chi tiết KPI của một nhân viên (Manager xem hoặc cá nhân xem)
export const fetchStaffKpiDetails = (staffId, month, year, token) => {
  const path = `/api/kpi/staff/${staffId}?month=${month}&year=${year}`;
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Nhân viên tự lấy KPI cá nhân
export const fetchPersonalKpi = (month, year, token) => {
  const path = `/api/kpi/personal?month=${month}&year=${year}`;
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Lấy danh sách cấu hình KPI trọng số
export const fetchKpiConfigs = (token) => {
  const path = '/api/kpi/configs';
  return request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Cập nhật cấu hình trọng số KPI
export const updateKpiConfig = (configId, configData, token) => {
  const path = `/api/kpi/configs/${configId}`;
  return request(path, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configData),
  });
};

// Ép buộc tính toán lại KPI cho một nhân viên
export const recalculateKpi = (staffId, month, year, token) => {
  const path = `/api/kpi/recalculate?staffId=${staffId}&month=${month}&year=${year}`;
  return request(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Tính lại KPI cho TẤT CẢ nhân viên trong kỳ (xóa cache + tính mới)
export const recalculateAllKpi = (month, year, token) => {
  const path = `/api/kpi/recalculate-all?month=${month}&year=${year}`;
  return request(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};
