// Âm thanh thông báo tổng hợp bằng Web Audio API (không dùng file audio ngoài).
// 2 mẫu âm khác nhau rõ rệt để phân biệt: tin nhắn chat (nhanh, sáng, đi lên)
// và thông báo hệ thống (trầm hơn, đi xuống, âm sắc khác).

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
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

/** Âm báo có thông báo hệ thống mới: 2 nốt trầm hơn, đi xuống, âm sắc khác (triangle). */
export const playNotificationSound = () => {
  safePlaySequence([
    { frequency: 523.25, duration: 0.16, offset: 0, type: 'triangle', gain: 0.15 },
    { frequency: 392, duration: 0.22, offset: 0.14, type: 'triangle', gain: 0.15 },
  ]);
};
