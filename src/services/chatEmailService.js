/**
 * Chat Email Service - Thiết lập nhận thông báo tin nhắn qua email (chuẩn bị cho tích hợp sau này)
 * Backend Controller: CHƯA triển khai. Endpoint dưới đây là spec cho đội BE, hiện chưa tồn tại.
 * Mọi lỗi (404/network) bị nuốt và trả về giá trị mặc định an toàn để không làm vỡ UI.
 *
 *  GET /api/chat/settings/email -> { success, data: { emailOnMissedMessage: boolean } }
 *  PUT /api/chat/settings/email body { emailOnMissedMessage } -> { success, data }
 */
import { request } from './apiClient.js';

const getStaffToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';

const authHeaders = () => {
  const token = getStaffToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const DEFAULT_SETTING = { emailOnMissedMessage: false, available: false };

export const getEmailSetting = async () => {
  try {
    const response = await request('/api/chat/settings/email', {
      method: 'GET',
      headers: authHeaders(),
    });
    const data = response?.data;
    if (!data) return DEFAULT_SETTING;
    return { emailOnMissedMessage: Boolean(data.emailOnMissedMessage), available: true };
  } catch {
    return DEFAULT_SETTING;
  }
};

export const setEmailSetting = async (enabled) => {
  try {
    await request('/api/chat/settings/email', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ emailOnMissedMessage: enabled }),
    });
    return { emailOnMissedMessage: enabled, available: true };
  } catch {
    return { emailOnMissedMessage: enabled, available: false };
  }
};
