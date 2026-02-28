// Các hàm định dạng thời gian dùng chung cho frontend

// Cắt giây khỏi chuỗi giờ dạng HH:mm:ss, giữ nguyên nếu đã là HH:mm hoặc định dạng khác
export const formatTimeHHmm = (raw = '') => {
  if (!raw) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
  return raw;
};

// Ghép ngày + giờ (đã cắt giây) với fallback khi thiếu dữ liệu
export const combineDateTime = (dateStr, timeStr, fallback = '-') => {
  const time = formatTimeHHmm(timeStr);
  if (!dateStr && !time) return fallback;
  if (dateStr && time) return `${time} ${dateStr} `;
  return dateStr || time || fallback;
};

// Parse datetime từ backend một cách an toàn.
// Hỗ trợ:
// - ISO 8601 có timezone (ví dụ: 2026-03-01T01:26:36Z)
// - Chuỗi kiểu DB không timezone (ví dụ: 2026-03-01 01:26:36) => hiểu là giờ local
export const parseBackendDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  // ISO-like: let JS handle, it respects timezone offsets/Z
  if (/\dT\d/.test(raw) || /Z$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const isoDate = new Date(raw);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  // DB-like: YYYY-MM-DD HH:mm:ss (no timezone) => treat as local time
  const m = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    const hour = Number(m[4] ?? 0);
    const minute = Number(m[5] ?? 0);
    const second = Number(m[6] ?? 0);
    const d = new Date(year, monthIndex, day, hour, minute, second);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const formatDateTimeVi = (value, fallback = '-') => {
  const d = parseBackendDateTime(value);
  if (!d) return fallback;

  // Force VN timezone if supported to keep UI consistent across machines
  try {
    return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  } catch {
    return d.toLocaleString('vi-VN');
  }
};
