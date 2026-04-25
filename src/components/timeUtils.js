// Các hàm định dạng thời gian dùng chung cho frontend

// Cắt giây khỏi chuỗi giờ dạng HH:mm:ss, giữ nguyên nếu đã là HH:mm hoặc định dạng khác
export const formatTimeHHmm = (raw = '') => {
  if (!raw) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
  return raw;
};

// Chuẩn hoá chuỗi giờ khi gửi lên backend.
// Nếu người dùng nhập HH:mm thì backend thường muốn HH:mm:ss.
export const normalizeBackendTime = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
};

// Format Date (local) -> YYYY-MM-DD
export const formatLocalDateYYYYMMDD = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Build options cho dropdown chọn ngày trong X ngày tới.
export const buildDateOptions = (rangeDays = 10, locale = 'vi-VN') => {
  const today = new Date();
  const options = [];

  const days = Number(rangeDays);
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 10;

  for (let i = 0; i < safeDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatLocalDateYYYYMMDD(d);
    const label = d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
    options.push({ value, label });
  }

  return options;
};

// Chuyển date YYYY-MM-DD + time raw (HH:mm | HH:mm:ss) -> Date local
export const toLocalDateTime = (dateYYYYMMDD, timeRaw) => {
  if (!dateYYYYMMDD || !timeRaw) return null;
  const [yStr, mStr, dStr] = String(dateYYYYMMDD).split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  const parts = String(timeRaw).split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? 0);
  const ss = Number(parts[2] ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;

  const date = new Date(y, m - 1, d, hh, mm, ss, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Check slot có nằm trong quá khứ hay không (so với giờ hiện tại)
export const isPastSlot = (dateYYYYMMDD, timeRaw) => {
  const slotStart = toLocalDateTime(dateYYYYMMDD, timeRaw);
  if (!slotStart) return false;
  return slotStart.getTime() <= Date.now();
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
  if (/\dT\d/.test(raw) || raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const isoDate = new Date(raw);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  // đai đa số trường hợp backend trả về kiểu "2026-03-01 01:26:36" (không timezone, hiểu là giờ local)
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
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

// Chuyển đổi và định dạng ngày giờ từ backend sang định dạng Việt Nam, nhưng không hiển thị giây (nếu có) để giao diện gọn hơn. Vẫn giữ nguyên các phần khác của định dạng ngày giờ.
export const formatDateTimeViNoSeconds = (value, fallback = '-') => {
  const d = parseBackendDateTime(value);
  if (!d) return fallback;

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  try {
    return d.toLocaleString('vi-VN', { ...options, timeZone: 'Asia/Ho_Chi_Minh' });
  } catch {
    return d.toLocaleString('vi-VN', options);
  }
};
