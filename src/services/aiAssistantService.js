/**
 * AI Assistant Service - Kết nối với backend proxy tới Google Gemini
 * Backend Controller: AiAssistantController + PublicAiAssistantController (repo BE riêng)
 *
 * Contract:
 *  POST /api/ai-assistant/chat    (nhân viên, cần Bearer token)  body { message, history } -> { success, data: { reply, usage, quota } }
 *  POST /home/ai-assistant/chat   (khách hàng, công khai, rate-limit theo IP)  cùng body/response
 *  GET  /api/ai-assistant/quota   (nhân viên)   -> { success, data: quota }
 *  GET  /home/ai-assistant/quota  (khách hàng)  -> { success, data: quota }
 *
 * history = Array<{ role: 'user'|'model', text: string }>  (vài lượt hội thoại gần nhất, không bắt buộc)
 * usage   = { promptTokens, responseTokens, totalTokens }  (số token của riêng lượt chat vừa gửi)
 * quota   = { date, requestsUsed, requestLimit, requestsRemaining, tokensUsed, tokenLimit, tokensRemaining }
 *   — đếm NỘI BỘ ở backend (in-memory, dùng chung cho cả 2 kênh vì cùng 1 API key Gemini),
 *   KHÔNG PHẢI số quota thật Google còn cấp (Gemini free tier không có API tra cứu quota còn lại).
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

// Kênh công khai cho khách hàng trên website — không gửi token, BE tự rate-limit theo IP.
export const sendPublicAiMessage = ({ message, history = [] }) =>
  request('/home/ai-assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  }).then((response) => unwrapData(response, null));

export const getAiQuota = () =>
  request('/api/ai-assistant/quota', { headers: authHeaders() }).then((response) => unwrapData(response, null));

export const getPublicAiQuota = () =>
  request('/home/ai-assistant/quota').then((response) => unwrapData(response, null));
