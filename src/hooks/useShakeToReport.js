import { useEffect } from 'react';
import { openBugReportModal } from '../components/BugReport/bugReportBus.js';

// Ngưỡng của công thức tốc độ đổi gia tốc bên dưới — đủ cao để cầm máy đi lại
// hay bỏ vào túi không kích hoạt nhầm, đủ thấp để lắc dứt khoát 2 nhịp là ăn.
const SHAKE_SPEED_THRESHOLD = 900;
const SAMPLE_INTERVAL_MS = 100;
const REQUIRED_SHAKES = 2;
const SHAKE_WINDOW_MS = 1200;
const COOLDOWN_MS = 5000;

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

const hasMotionSupport = () => typeof window !== 'undefined' && 'DeviceMotionEvent' in window;

// iOS 13+ chỉ cấp quyền cảm biến khi được xin trong một thao tác chạm của người dùng.
const needsMotionPermission = () =>
  hasMotionSupport() && typeof window.DeviceMotionEvent.requestPermission === 'function';

/**
 * Lắc điện thoại để mở form báo lỗi — thay cho nút tròn nổi vốn bị ẩn trên mobile.
 *
 * @param {boolean} enabled bật khi người dùng đã đăng nhập (form cần danh tính người gửi)
 */
export const useShakeToReport = (enabled = true) => {
  useEffect(() => {
    if (!enabled || !hasMotionSupport() || !isMobileViewport()) return undefined;

    let lastX = null;
    let lastY = null;
    let lastZ = null;
    let lastSampleAt = 0;
    let shakeCount = 0;
    let firstShakeAt = 0;
    let lastTriggeredAt = 0;
    let detached = false;

    const handleMotion = (event) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration || acceleration.x == null) return;

      const now = Date.now();
      const elapsed = now - lastSampleAt;
      if (elapsed < SAMPLE_INTERVAL_MS) return;
      lastSampleAt = now;

      const { x, y, z } = acceleration;
      if (lastX === null) {
        lastX = x;
        lastY = y;
        lastZ = z;
        return;
      }

      const speed = (Math.abs(x + y + z - lastX - lastY - lastZ) / elapsed) * 10000;
      lastX = x;
      lastY = y;
      lastZ = z;

      if (speed < SHAKE_SPEED_THRESHOLD) return;

      // Gom nhiều nhịp lắc trong một khoảng ngắn để phân biệt với va chạm đơn lẻ.
      if (now - firstShakeAt > SHAKE_WINDOW_MS) {
        firstShakeAt = now;
        shakeCount = 1;
        return;
      }

      shakeCount += 1;
      if (shakeCount < REQUIRED_SHAKES) return;

      shakeCount = 0;
      firstShakeAt = 0;
      if (now - lastTriggeredAt < COOLDOWN_MS) return;
      lastTriggeredAt = now;

      navigator.vibrate?.(60);
      openBugReportModal();
    };

    const attach = () => {
      if (detached) return;
      window.addEventListener('devicemotion', handleMotion);
    };

    let requestPermissionOnTouch;
    if (needsMotionPermission()) {
      // Xin quyền ở lần chạm đầu tiên; nếu bị từ chối thì im lặng bỏ qua.
      requestPermissionOnTouch = () => {
        window.removeEventListener('touchend', requestPermissionOnTouch);
        window.DeviceMotionEvent.requestPermission()
          .then((state) => {
            if (state === 'granted') attach();
          })
          .catch(() => {});
      };
      window.addEventListener('touchend', requestPermissionOnTouch, { once: true });
    } else {
      attach();
    }

    return () => {
      detached = true;
      window.removeEventListener('devicemotion', handleMotion);
      if (requestPermissionOnTouch) {
        window.removeEventListener('touchend', requestPermissionOnTouch);
      }
    };
  }, [enabled]);
};

export default useShakeToReport;
