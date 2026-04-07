import { request, API_BASE_URL } from './apiClient.js';

// Lấy danh sách dịch vụ hiển thị trên trang Home (GET /home/)
export async function fetchHomeServices() {
  return request('/home/');
}

// Lấy chi tiết một dịch vụ cụ thể (GET /home/service/{serviceId})
export async function fetchHomeServiceDetail(serviceId) {
  return request(`/home/service/${serviceId}`);
}

// Lấy chi tiết dịch vụ/phụ tùng qua cùng API với danh sách (đảm bảo data nhất quán)
export async function fetchHomeProductDetail(catalogItemId) {
  const targetId = Number(catalogItemId);
  const searchParams = new URLSearchParams();
  searchParams.set('catalogItemId', String(catalogItemId));
  searchParams.set('size', '50');
  const qs = searchParams.toString();
  const res = await request(`/home/products?${qs}`);
  const payload = res?.data?.data ?? res?.data ?? res;
  const content = Array.isArray(payload?.content) ? payload.content
    : Array.isArray(payload) ? payload : [];
  const matched = Number.isFinite(targetId)
    ? content.find((item) => Number(item?.catalogItemId) === targetId)
    : null;
  return { data: matched || null };
}

// Lấy catalog item theo bộ lọc cho Home (dịch vụ/phụ tùng)
// GET /api/warehouse/search/catalog-items
export async function fetchHomeCatalogItems(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    searchParams.set(key, text);
  });
  const qs = searchParams.toString();
  return request(`/api/warehouse/search/catalog-items${qs ? `?${qs}` : ''}`);
}

// Fallback public endpoint (trả basic fields)
// GET /api/catalog/items
export async function fetchPublicCatalogItems() {
  return request('/api/catalog/items');
}

// Lấy danh sách sản phẩm (dịch vụ / phụ tùng) từ /home/products - fallback khi /home/ không có data
// itemType: SERVICE | PART | EQUIPMENT | COMBO | MAI
export async function fetchHomeProducts(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    searchParams.set(key, text);
  });
  const qs = searchParams.toString();
  return request(`/home/products${qs ? `?${qs}` : ''}`);
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
