const STATUS_TEXT_VI = {
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
  CONTACTED: 'Đã liên hệ',
  CONFIRM: 'Đã xác nhận',
  CONFIRMED: 'Đã xác nhận',
  APPROVED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  CANCEL: 'Đã hủy',
  CANCELED: 'Đã hủy',
  SPAM: 'Spam',
  PROCESSING: 'Đang xử lý',
  DONE: 'Hoàn tất',
  NEW: 'Mới',
  NOT_ARRIVED: 'Chưa đến',
};

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
  if (upper === 'REJECT' || upper === 'DECLINED') return 'REJECTED';
  if (upper === 'CANCEL') return 'CANCELLED';
  return upper;
}

function normalizeServiceTicketStatusCodeUpper(upper) {
  if (upper === 'DRAFT') return 'CREATED';
  if (upper === 'INSPECTION' || upper === 'DIAGNOSIS') return 'INSPECTING';
  if (upper === 'INSPECTED_DIAGNOSTIC') return 'INSPECTED';
  if (upper === 'ESTIMATE') return 'ESTIMATED';
  if (upper === 'IN_PROGRESS' || upper === 'INPROGRESS' || upper === 'PROCESSING') return 'REPAIRING';
  return normalizeStatusCodeUpper(upper);
}

export function normalizeStatusCode(status) {
  const raw = normalizeStatus(status);
  if (!raw) return '';

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return raw;

  return normalizeStatusCodeUpper(raw.toUpperCase());
}

export function normalizeServiceTicketStatusCode(status) {
  const raw = normalizeStatus(status);
  if (!raw) return '';

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return raw;

  return normalizeServiceTicketStatusCodeUpper(raw.toUpperCase());
}

export function getStatusTextVi(status, fallback = '-') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const upper = normalizeStatusCodeUpper(raw.toUpperCase());
  if (STATUS_TEXT_VI[upper]) return STATUS_TEXT_VI[upper];

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  return looksLikeCode ? fallback : raw;
}

export function getServiceTicketStatusTextVi(status, fallback = '-') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return raw;

  const canonical = normalizeServiceTicketStatusCodeUpper(raw.toUpperCase());
  if (SERVICE_TICKET_STATUS_TEXT_VI[canonical]) return SERVICE_TICKET_STATUS_TEXT_VI[canonical];
  if (STATUS_TEXT_VI[canonical]) return STATUS_TEXT_VI[canonical];
  return fallback;
}

export function getBookingStatusTextVi(status, fallback = 'Chờ duyệt') {
  return getStatusTextVi(status, fallback);
}

export function getStatusTone(status, fallback = 'info') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const upper = normalizeStatusCodeUpper(raw.toUpperCase());
  if (upper === 'PENDING') return 'warning';
  if (upper === 'CONTACTED') return 'info';
  if (upper === 'CONFIRM' || upper === 'CONFIRMED' || upper === 'APPROVED') return 'success';
  if (upper === 'DONE' || upper === 'COMPLETED' || upper === 'PAID') return 'success';
  if (upper === 'NEW' || upper === 'DRAFT' || upper === 'IN_PROGRESS' || upper === 'PROCESSING') return 'info';
  if (upper === 'REJECTED' || upper === 'CANCELLED' || upper === 'CANCELED' || upper === 'SPAM') return 'danger';
  if (upper === 'NOT_ARRIVED' || upper === 'INSPECTION') return 'warning';
  return fallback;
}

export function getServiceTicketStatusTone(status, fallback = 'info') {
  const raw = normalizeStatus(status);
  if (!raw) return fallback;

  const looksLikeCode = /^[A-Z0-9_]+$/.test(raw);
  if (!looksLikeCode) return fallback;

  const upper = normalizeServiceTicketStatusCodeUpper(raw.toUpperCase());
  if (upper === 'PENDING' || upper === 'INSPECTING') return 'warning';
  if (upper === 'COMPLETED' || upper === 'PAID') return 'success';
  if (upper === 'CANCELLED') return 'danger';
  if (upper === 'CREATED' || upper === 'INSPECTED' || upper === 'ESTIMATED' || upper === 'REPAIRING') return 'info';
  return getStatusTone(upper, fallback);
}

export function getBookingStatusTone(status, fallback = 'info') {
  return getStatusTone(status, fallback);
}
