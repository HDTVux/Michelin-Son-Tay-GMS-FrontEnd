/**
 * Chat Upload Service - Upload đính kèm chat (ảnh/video/tệp) lên Cloudinary
 * Backend Controller: CloudinaryController.java (mở rộng, chưa triển khai cho video/file)
 * Base Path: /home/uploads
 *
 *  POST /home/uploads/image (đã có, xem imageService.js) -> { success, data: { imageUrl, publicId, width, height, format } }
 *  POST /home/uploads/video (MỚI)                        -> { success, data: { videoUrl, publicId, durationSec, width, height, format, thumbnailUrl } }
 *  POST /home/uploads/file  (MỚI, generic)                -> { success, data: { fileUrl, publicId, name, size, format } }
 */
import { API_BASE_URL } from './apiClient.js';
import { uploadImage } from './imageService.js';

const parseUploadResponse = async (response) => {
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

export const uploadChatImage = (file, token) => uploadImage(file, token);

export const uploadChatVideo = async (file, token) => {
  if (!file) throw new Error('File video không được để trống');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/home/uploads/video`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return parseUploadResponse(response);
};

export const uploadChatFile = async (file, token) => {
  if (!file) throw new Error('File không được để trống');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/home/uploads/file`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return parseUploadResponse(response);
};
