import { request } from './apiClient.js';

// Lấy danh sách dịch vụ hiển thị trên trang Home
export async function fetchHomeServices() {
  return request('/home/');
}

// Lấy chi tiết một dịch vụ cụ thể (GET /home/service/{serviceId})
export async function fetchHomeServiceDetail(serviceId) {
  return request(`/home/service/${serviceId}`);
}
