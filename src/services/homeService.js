import { request, API_BASE_URL } from './apiClient.js';

// Lấy danh sách dịch vụ hiển thị trên trang Home
export async function fetchHomeServices() {
  return request('/home/');
}

// Lấy chi tiết một dịch vụ cụ thể (GET /home/service/{serviceId})
export async function fetchHomeServiceDetail(serviceId) {
  return request(`/home/service/${serviceId}`);
}

// Upload ảnh lên Cloudinary (POST /home/uploads/)
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${API_BASE_URL}/home/uploads/`, {
    method: 'POST',
    body: formData,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Upload failed');
    }
    return data;
  });
}
