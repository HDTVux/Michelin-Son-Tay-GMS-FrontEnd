import { API_BASE_URL } from './apiClient';

/**
 * Image Upload Service - Kết nối với Cloudinary Upload APIs
 * Backend Controller: CloudinaryController.java
 * Base Path: /home/uploads
 */

/**
 * Upload image to Cloudinary
 * Backend: POST /home/uploads/image
 * 
 * @param {File} file - File ảnh cần upload
 * @param {string} token - JWT token (optional)
 * @returns {Promise} Response chứa URL của ảnh đã upload
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     imageUrl: string,
 *     publicId: string,
 *     width: number,
 *     height: number,
 *     format: string
 *   }
 * }
 */
export const uploadImage = async (file, token) => {
  if (!file) {
    throw new Error('File không được để trống');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/home/uploads/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') 
    ? await response.json() 
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || 'Upload failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (data?.success === false) {
    const error = new Error(data?.message || data?.data?.message || 'Upload failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

/**
 * Upload multiple images to Cloudinary
 * 
 * @param {File[]} files - Mảng các file ảnh cần upload
 * @param {string} token - JWT token (optional)
 * @returns {Promise<Array>} Response chứa mảng URLs của các ảnh đã upload
 */
export const uploadMultipleImages = async (files, token) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error('Danh sách file không được để trống');
  }

  const uploadPromises = files.map(file => uploadImage(file, token));
  return Promise.all(uploadPromises);
};
