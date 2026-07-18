/**
 * AI Assistant Service - Kết nối với backend proxy tới Google Gemini
 * Backend Controller: (chưa triển khai, repo BE riêng) - contract dưới đây là spec cho đội BE.
 * Base Path: /api/ai-assistant
 *
 * Contract:
 *  POST /api/ai-assistant/chat  body { message, history }  -> { success, data: { reply } }
 *
 * history = Array<{ role: 'user'|'model', text: string }>  (vài lượt hội thoại gần nhất, không bắt buộc)
 */
import { request } from './apiClient.js';

const unwrapData = (response, fallback = null) =>
  response?.data !== undefined ? response.data : fallback;

const getStaffToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';

const authHeaders = () => {
  const token = getStaffToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const sendAiMessage = ({ message, history = [] }) =>
  request('/api/ai-assistant/chat', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, history }),
  }).then((response) => unwrapData(response, null));
