import { useEffect } from 'react';

/**
 * Hook để tự động scroll lên đầu trang khi component mount
 * Sử dụng cho tất cả các trang để tránh auto scroll xuống dưới
 */
export const useScrollToTop = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
};
