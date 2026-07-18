// Âm thanh thông báo tổng hợp bằng Web Audio API (không dùng file audio ngoài).
// 2 mẫu âm khác nhau rõ rệt để phân biệt: tin nhắn chat (nhanh, sáng, đi lên)
// và thông báo hệ thống (trầm hơn, đi xuống, âm sắc khác).

let audioCtx = null;
let unlockRegistered = false;

// Chính sách autoplay của trình duyệt: AudioContext luôn khởi tạo ở trạng thái
// "suspended" và CHỈ được mở khoá bởi một user gesture trực tiếp (click/gõ phím/chạm),
// KHÔNG chấp nhận resume() gọi từ trong handler sự kiện WebSocket (không phải gesture
// thật). Vì vậy phải lắng nghe tương tác đầu tiên bất kỳ của người dùng trên trang để
// mở khoá — sau đó context giữ trạng thái "running" cho các lần phát âm tiếp theo dù
// được kích hoạt từ WS.
const registerUnlockOnFirstGesture = () => {
  if (unlockRegistered || typeof document === 'undefined') return;
  unlockRegistered = true;

  const unlock = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };

  ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) =>
    document.addEventListener(eventName, unlock, { passive: true }),
  );
};

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
    registerUnlockOnFirstGesture();
  }
  return audioCtx;
};

/**
 * Tạo sẵn AudioContext + đăng ký lắng nghe mở khoá càng sớm càng tốt (gọi 1 lần lúc
 * app khởi động, ví dụ trong StaffLayout) — để tới khi có tin nhắn/thông báo đầu tiên
 * (qua WS, không phải gesture) thì context nhiều khả năng đã được mở khoá rồi, thay vì
 * đợi tới lần phát âm đầu tiên mới tạo context (có thể đã quá muộn).
 */
export const initNotificationSound = () => {
  getAudioContext();
};

const playTone = (ctx, startTime, { frequency, duration, type, gain }) => {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
};

const safePlaySequence = (notes) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      // Trình duyệt có thể chặn audio tới khi có tương tác người dùng đầu tiên trên
      // trang — bỏ qua lỗi resume() một cách âm thầm, không phải lỗi nghiêm trọng.
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    notes.forEach((note) => playTone(ctx, now + (note.offset || 0), note));
  } catch {
    // Bỏ qua nếu trình duyệt không hỗ trợ/chặn Web Audio.
  }
};

/** Âm báo có tin nhắn chat mới: 2 nốt ngắn, sáng, đi lên (giống "pop" của Messenger). */
export const playMessageSound = () => {
  safePlaySequence([
    { frequency: 740, duration: 0.09, offset: 0, type: 'sine', gain: 0.13 },
    { frequency: 988, duration: 0.12, offset: 0.09, type: 'sine', gain: 0.13 },
  ]);
};

/**
 * Thông báo hệ thống chia 3 mức (notificationType), mỗi mức 1 âm khác nhau để phân biệt
 * ngay bằng tai mà không cần nhìn màn hình:
 *  - Bình thường (INFO...): "ping" 1 nhịp, ngắn gọn, nhẹ nhàng.
 *  - Cảnh báo (WARNING): giai điệu đi LÊN vài nốt, tốc độ vừa — báo hiệu cần chú ý.
 *  - Khẩn cấp (URGENT): giai điệu đi LÊN dồn dập hơn, nhiều nốt hơn, nhanh + âm sắc gắt
 *    hơn (sawtooth) + to hơn — báo hiệu mức độ nghiêm trọng cao nhất.
 */

/** Thông báo bình thường: 1 nốt "ping" duy nhất. */
export const playNotificationSound = () => {
  safePlaySequence([
    { frequency: 880, duration: 0.18, offset: 0, type: 'sine', gain: 0.15 },
  ]);
};

/** Thông báo cảnh báo: giai điệu đi lên 3 nốt, tốc độ vừa phải. */
export const playWarningNotificationSound = () => {
  safePlaySequence([
    { frequency: 523.25, duration: 0.14, offset: 0, type: 'triangle', gain: 0.16 },
    { frequency: 659.25, duration: 0.14, offset: 0.13, type: 'triangle', gain: 0.16 },
    { frequency: 784.0, duration: 0.2, offset: 0.26, type: 'triangle', gain: 0.18 },
  ]);
};

/** Thông báo khẩn cấp: giai điệu đi lên dồn dập, âm sắc gắt hơn, to hơn cảnh báo. */
export const playUrgentNotificationSound = () => {
  safePlaySequence([
    { frequency: 587.33, duration: 0.11, offset: 0, type: 'sawtooth', gain: 0.18 },
    { frequency: 739.99, duration: 0.11, offset: 0.09, type: 'sawtooth', gain: 0.19 },
    { frequency: 932.33, duration: 0.11, offset: 0.18, type: 'sawtooth', gain: 0.2 },
    { frequency: 1174.66, duration: 0.24, offset: 0.27, type: 'sawtooth', gain: 0.22 },
  ]);
};

/** Chọn đúng âm báo theo `notificationType` của thông báo hệ thống. */
export const playNotificationSoundByType = (notificationType) => {
  const type = String(notificationType || '').toUpperCase();
  if (type === 'URGENT') return playUrgentNotificationSound();
  if (type === 'WARNING') return playWarningNotificationSound();
  return playNotificationSound();
};
