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
  if (dateStr && time) return `${dateStr} ${time}`;
  return dateStr || time || fallback;
};
