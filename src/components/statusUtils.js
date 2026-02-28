const STATUS_TEXT_VI = {
  // Booking request statuses
  PENDING: 'Chờ duyệt',
  CONTACTED: 'Đã liên hệ',
  CONFIRM: 'Đã xác nhận',
  CONFIRMED: 'Đã xác nhận',
  APPROVED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  DECLINED: 'Từ chối',
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

/**
 * Convert backend status codes (e.g. PENDING, CONFIRMED) to Vietnamese text for UI.
 * If status already looks like a friendly label, it will be returned unchanged.
 */
export function getStatusTextVi(status, fallback = '-') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const upper = raw.toUpperCase();
  if (STATUS_TEXT_VI[upper]) return STATUS_TEXT_VI[upper];

  // If it's already a readable label (e.g. 'Đã liên hệ'), keep it.
  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  return looksLikeCode ? fallback : raw;
}

export function getBookingStatusTextVi(status, fallback = 'Chờ duyệt') {
  return getStatusTextVi(status, fallback);
}
