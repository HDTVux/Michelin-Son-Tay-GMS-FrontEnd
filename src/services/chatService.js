/**
 * Chat Service - Kết nối với Internal Staff Chat APIs
 * Backend Controller: (chưa triển khai, repo BE riêng) - contract dưới đây là spec cho đội BE.
 * Base Path: /api/chat
 *
 * Contract:
 *  GET  /api/chat/contacts?search=            -> { success, data: Contact[] }
 *  GET  /api/chat/conversations               -> { success, data: Conversation[] }
 *  POST /api/chat/conversations                body { participantIds, type }         -> { success, data: Conversation }
 *  GET  /api/chat/conversations/{id}/messages?before=&limit=30 -> { success, data: { messages, hasMore, nextCursor } }
 *  POST /api/chat/conversations/{id}/read      body { upToMessageId }                 -> { success, data: true }
 *  POST /api/chat/conversations/{id}/messages  body SendMessagePayload                -> { success, data: Message }
 *
 * SendMessagePayload = { clientMsgId, type: 'text'|'image'|'video'|'file'|'sticker', text?, attachments?, stickerId? }
 * Message = { messageId, conversationId, clientMsgId, senderId, senderName, senderAvatar, type, text, attachments, stickerId, createdAt, status }
 *
 * WebSocket (STOMP/SockJS, xem src/hooks/useChat.js):
 *  Connect: ${API_BASE_URL}/ws-chat
 *  Subscribe: /user/queue/chat-messages, /user/queue/chat-receipts, /topic/chat-presence
 *  Send: /app/chat.send, /app/chat.read, /app/chat.typing
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

export const fetchContacts = (search = '') =>
  request(`/api/chat/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
    method: 'GET',
    headers: authHeaders(),
  }).then((response) => unwrapData(response, []));

export const fetchConversations = () =>
  request('/api/chat/conversations', {
    method: 'GET',
    headers: authHeaders(),
  }).then((response) => unwrapData(response, []));

export const createConversation = (participantIds, type = 'direct') =>
  request('/api/chat/conversations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ participantIds, type }),
  }).then((response) => unwrapData(response, null));

export const fetchMessages = (conversationId, { before, limit = 30 } = {}) => {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();

  return request(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: authHeaders(),
  }).then((response) => unwrapData(response, { messages: [], hasMore: false, nextCursor: null }));
};

export const sendMessageRest = (conversationId, payload) =>
  request(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then((response) => unwrapData(response, null));

export const markConversationRead = (conversationId, upToMessageId) =>
  request(`/api/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ upToMessageId }),
  }).then((response) => unwrapData(response, true));
