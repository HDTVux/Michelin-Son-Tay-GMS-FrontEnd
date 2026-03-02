const STATUS_TEXT_VI = {
  // Booking request statuses
  PENDING: 'Chờ duyệt',
  CONTACTED: 'Đã liên hệ',
  CONFIRM: 'Đã xác nhận',
  CONFIRMED: 'Đã xác nhận',
  APPROVED: 'Đã xác nhận',
  CANCEL: 'Đã hủy',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',
  SPAM: 'Spam',

  // Booking lifecycle statuses
  IN_PROGRESS: 'Đang thực hiện',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  DONE: 'Hoàn tất',
};

function normalizeStatus(status) {
  if (status == null) return '';
  return String(status).trim();
}

function normalizeStatusCodeUpper(upper) {
  // Backward-compatible aliases treated as canceled
  if (upper === 'REJECT' || upper === 'REJECTED' || upper === 'DECLINED') return 'CANCELLED';
  if (upper === 'CANCEL') return 'CANCELLED';
  return upper;
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

  // Cancel variants
  if (
    upper === 'CANCELLED' ||
    upper === 'CANCELED' ||
    upper === 'SPAM'
  ) return 'danger';

  return fallback;
}

export function getBookingStatusTone(status, fallback = 'info') {
  return getStatusTone(status, fallback);
}
