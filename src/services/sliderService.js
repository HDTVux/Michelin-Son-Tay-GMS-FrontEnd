import { request, API_BASE_URL } from './apiClient';

const adminUrl = '/api/admin/sliders';
const publicUrl = '/api/public/sliders';

const getAuthToken = () => {
  return localStorage.getItem('authToken') || 
         localStorage.getItem('adminToken') || 
         localStorage.getItem('staffToken') || '';
};

export const sliderService = {
  // Admin APIs
  getAllSliders: async () => {
    const token = getAuthToken();
    return request(adminUrl, { 
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  createSlider: async (data) => {
    const token = getAuthToken();
    return request(adminUrl, { 
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  },

  updateSlider: async (id, data) => {
    const token = getAuthToken();
    return request(`${adminUrl}/${id}`, { 
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  },

  deleteSlider: async (id) => {
    const token = getAuthToken();
    return request(`${adminUrl}/${id}`, { 
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  addSliderItem: async (sliderId, data) => {
    const token = getAuthToken();
    return request(`${adminUrl}/${sliderId}/items`, { 
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  },

  deleteSliderItem: async (sliderId, itemId) => {
    const token = getAuthToken();
    return request(`${adminUrl}/${sliderId}/items/${itemId}`, { 
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  updateSliderItem: async (sliderId, itemId, data) => {
    const token = getAuthToken();
    return request(`${adminUrl}/${sliderId}/items/${itemId}`, { 
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  },

  uploadImage: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    
    // Using fetch directly because apiClient forces Content-Type: application/json
    const response = await fetch(`${API_BASE_URL}${adminUrl}/upload-image`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    return response.json();
  },

  reorderSliderItems: async (sliderId, orderedItemIds) => {
    const token = getAuthToken();
    return request(`${adminUrl}/${sliderId}/items/reorder`, { 
      method: 'PUT',
      body: JSON.stringify(orderedItemIds),
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  },

  // Public APIs
  getSliderByLocation: async (locationCode) => {
    return request(`${publicUrl}/${locationCode}`, { method: 'GET' });
  }
};
