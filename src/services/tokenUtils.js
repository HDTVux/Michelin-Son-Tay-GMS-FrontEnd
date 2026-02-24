
const decodeBase64Url = (input) => {
  if (!input) return '';
  // 1. Thay thế các ký tự đặc biệt của URL trở lại Base64 chuẩn
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  
  // 2. Tính toán số lượng dấu '=' cần bù (padding) để độ dài chuỗi chia hết cho 4
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  
  // 3. Sử dụng hàm atob có sẵn của trình duyệt để giải mã chuỗi Base64
  return atob(padded);
};


export const tryGetJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    
    const parts = token.split('.'); // Tách token thành 3 phần dựa trên dấu chấm
    if (parts.length < 2) return null; // Nếu không đủ phần Header và Payload thì token lỗi
    
    const json = decodeBase64Url(parts[1]); // Giải mã phần Payload (phần thứ 2)
    return JSON.parse(json); // Chuyển chuỗi JSON vừa giải mã thành Object JavaScript
  } catch {
    return null; // Trả về null nếu có bất kỳ lỗi nào (để tránh app bị dừng)
  }
};

/**
 * Kiểm tra xem JWT đã hết hạn hay chưa.
 * @param skewSeconds Thời gian trừ hao (giây) để bù đắp việc lệch đồng hồ giữa Client và Server.
 */
export const isJwtExpired = (token, skewSeconds = 30) => {
  const payload = tryGetJwtPayload(token);
  const exp = payload?.exp; // Lấy trường 'exp' (Expiration Time) từ Payload
  
  // Nếu không tìm thấy trường exp hoặc không phải là số, coi như chưa hết hạn (hoặc lỗi)
  if (!Number.isFinite(exp)) return false;
  
  // Lấy thời gian hiện tại tính bằng giây (Unix timestamp)
  const nowSeconds = Math.floor(Date.now() / 1000);
  
  // Nếu (Thời gian hiện tại) >= (Thời gian hết hạn - Thời gian trừ hao) => Token đã hết hạn
  return nowSeconds >= exp - skewSeconds;
};

/**
 * Tự động xóa các token đã hết hạn khỏi localStorage.
 */
export const cleanupExpiredTokens = (keys = ['authToken', 'customerToken', 'staffToken', 'adminToken']) => {
  try {
    keys.forEach((key) => {
      const token = localStorage.getItem(key);
      if (token && isJwtExpired(token)) {
        localStorage.removeItem(key); // Xóa khỏi bộ nhớ nếu token đã hết hạn
      }
    });
  } catch {
    // Bỏ qua lỗi nếu môi trường không hỗ trợ localStorage 
  }
};

/**
 * Lấy token từ localStorage nhưng kiểm tra xem nó còn dùng được không.
 */
export const getValidToken = (key, skewSeconds = 30) => {
  try {
    const token = localStorage.getItem(key) || '';
    
    // Nếu có token nhưng đã hết hạn thì xóa luôn và trả về chuỗi rỗng
    if (token && isJwtExpired(token, skewSeconds)) {
      localStorage.removeItem(key);
      return '';
    }
    
    return token; // Trả về token hợp lệ
  } catch {
    return ''; // Trả về rỗng nếu có lỗi truy cập storage
  }
};