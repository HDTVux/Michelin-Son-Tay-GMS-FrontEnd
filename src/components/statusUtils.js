const STATUS_TEXT_VI = {
  // ── Service Ticket statuses ──
  DRAFT: 'Nháp',
  INSPECTION: 'Đang kiểm tra',
  CREATED: 'Tạo mới',
  INSPECTING: 'Đang kiểm tra',
  INSPECTED: 'Đã kiểm tra',
  ESTIMATED: 'Đã báo giá',
  REPAIRING: 'Đang sửa chữa',
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',

  // ── Booking request statuses ──
  CONTACTED: 'Đã liên hệ',
  CONFIRM: 'Đã xác nhận',
  CONFIRMED: 'Đã xác nhận',
  APPROVED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  CANCEL: 'Đã hủy',
  CANCELED: 'Đã hủy',
  SPAM: 'Spam',

  // ── Booking lifecycle statuses ──
  PROCESSING: 'Đang xử lý',
  DONE: 'Hoàn tất',

  // ── Managed booking statuses ──
  NEW: 'Mới',
  NOT_ARRIVED: 'Chưa đến',
};

// Dedicated Service Ticket translations because some codes overlap with other domains
// (e.g. COMPLETED in booking vs service ticket completion semantics).
const SERVICE_TICKET_STATUS_TEXT_VI = {
  CREATED: 'Tạo mới',
  INSPECTING: 'Đang kiểm tra',
  INSPECTED: 'Đã kiểm tra',
  PENDING: 'Chờ xử lý',
  ESTIMATED: 'Đã báo giá',
  REPAIRING: 'Đang sửa chữa',
  COMPLETED: 'Hoàn tất sửa chữa',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

function normalizeStatus(status) {
  if (status == null) return '';
  return String(status).trim();
}

function normalizeStatusCodeUpper(upper) {
  // Backward-compatible aliases treated as rejected
  if (upper === 'REJECT' || upper === 'DECLINED') return 'REJECTED';
  if (upper === 'CANCEL') return 'CANCELLED';
  return upper;
}

function normalizeServiceTicketStatusCodeUpper(upper) {
  // Legacy/aliases -> new canonical ticket pipeline
  if (upper === 'DRAFT') return 'CREATED';
  if (upper === 'INSPECTION' || upper === 'DIAGNOSIS') return 'INSPECTING';
  if (upper === 'INSPECTED_DIAGNOSTIC') return 'INSPECTED';
  if (upper === 'ESTIMATE') return 'ESTIMATED';
  if (upper === 'IN_PROGRESS' || upper === 'INPROGRESS' || upper === 'PROCESSING') return 'REPAIRING';

  // Keep existing cancel aliasing behavior
  return normalizeStatusCodeUpper(upper);
}

/**
 * Normalize backend status codes to a canonical code for UI logic.
 * - Treat reject/decline as cancel
 * - Canonicalize CANCEL -> CANCELLED
 * If input doesn't look like a status code, return it unchanged.
 */
export function normalizeStatusCode(status) {
  const raw = normalizeStatus(status);
  if (!raw) return '';

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return raw;

  return normalizeStatusCodeUpper(raw.toUpperCase());
}

/**
 * Normalize Service Ticket backend status codes to canonical codes for UI.
 * Uses the new pipeline: CREATED → INSPECTING → INSPECTED → (PENDING) → ESTIMATED → REPAIRING → COMPLETED → PAID.
 */
export function normalizeServiceTicketStatusCode(status) {
  const raw = normalizeStatus(status);
  if (!raw) return '';

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return raw;

  return normalizeServiceTicketStatusCodeUpper(raw.toUpperCase());
}

/**
 * Convert backend status codes (e.g. PENDING, CONFIRMED) to Vietnamese text for UI.
 * If status already looks like a friendly label, it will be returned unchanged.
 */
export function getStatusTextVi(status, fallback = '-') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const upper = normalizeStatusCodeUpper(raw.toUpperCase());
  if (STATUS_TEXT_VI[upper]) return STATUS_TEXT_VI[upper];

  // If it's already a readable label (e.g. 'Đã liên hệ'), keep it.
  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  return looksLikeCode ? fallback : raw;
}

/**
 * Convert Service Ticket status codes to Vietnamese labels.
 * Keeps booking/warehouse semantics separated from service ticket semantics.
 */
export function getServiceTicketStatusTextVi(status, fallback = '-') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return raw;

  const canonical = normalizeServiceTicketStatusCodeUpper(raw.toUpperCase());
  if (SERVICE_TICKET_STATUS_TEXT_VI[canonical]) return SERVICE_TICKET_STATUS_TEXT_VI[canonical];

  // Fall back to generic translations if present
  if (STATUS_TEXT_VI[canonical]) return STATUS_TEXT_VI[canonical];
  return fallback;
}

export function getBookingStatusTextVi(status, fallback = 'Chờ duyệt') {
  return getStatusTextVi(status, fallback);
}

/**
 * Map backend status to UI tone used by badges/pills.
 * Tones must match existing CSS modifiers: warning | info | success | danger
 */
export function getStatusTone(status, fallback = 'info') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const upper = normalizeStatusCodeUpper(raw.toUpperCase());

  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'CONFIRM' || upper === 'CONFIRMED' || upper === 'APPROVED') return 'success';
  if (upper === 'DONE' || upper === 'COMPLETED' || upper === 'PAID') return 'success';
  if (upper === 'NEW' || upper === 'DRAFT' || upper === 'IN_PROGRESS' || upper === 'PROCESSING') return 'info';

  // Cancel variants
  if (
    upper === 'REJECTED' ||
    upper === 'CANCELLED' ||
    upper === 'CANCELED' ||
    upper === 'SPAM'
  ) return 'danger';

  if (upper === 'NOT_ARRIVED') return 'warning';
  if (upper === 'INSPECTION') return 'warning';

  return fallback;
}

export function getServiceTicketStatusTone(status, fallback = 'info') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return fallback;

  const upper = normalizeServiceTicketStatusCodeUpper(raw.toUpperCase());
  if (upper === 'PENDING') return 'warning';
  if (upper === 'INSPECTING') return 'warning';
  if (upper === 'COMPLETED' || upper === 'PAID') return 'success';
  if (upper === 'CANCELLED') return 'danger';
  if (upper === 'CREATED' || upper === 'INSPECTED' || upper === 'ESTIMATED' || upper === 'REPAIRING') return 'info';
  return getStatusTone(upper, fallback);
}

export function getBookingStatusTone(status, fallback = 'info') {
  return getStatusTone(status, fallback);
}
