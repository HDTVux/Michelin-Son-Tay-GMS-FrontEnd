import { useEffect } from 'react';

/**
 * Hook tùy chỉnh để cuộn lên đầu trang.
 * @param {Array<any> | any} deps - Mặc định là []; chạy khi mount hoặc khi các giá trị trong mảng này thay đổi (ví dụ: đổi bước/step).
 * @param {'auto' | 'smooth'} behavior - Kiểu cuộn; 'auto' (tức thì) hoặc 'smooth' (mượt mà). Mặc định là 'auto'.
 */
export const useScrollToTop = (deps = [], behavior = 'auto') => {
  // Đảm bảo deps luôn là một mảng để tránh lỗi khi truyền vào useEffect
  const depArray = Array.isArray(deps) ? deps : [deps];

  useEffect(() => {
    // requestAnimationFrame đảm bảo DOM đã được cập nhật trước khi thực hiện cuộn
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior });
    });

    // Hàm dọn dẹp (cleanup) để hủy frame nếu component bị unmount trước khi chạy
    return () => cancelAnimationFrame(rafId);
  }, [...depArray, behavior]); // Chạy lại nếu deps hoặc kiểu behavior thay đổi
};