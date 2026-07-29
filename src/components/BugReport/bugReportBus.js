import { useCallback, useEffect, useState } from 'react';

/**
 * Cầu nối nhỏ giữa nơi mở form báo lỗi (dropdown avatar ở Header/StaffHeader)
 * và nơi render modal (StaffLayout / MainLayout) — hai nhánh component khác
 * nhau nên truyền props sẽ phải xuyên qua nhiều tầng không liên quan.
 */
const OPEN_EVENT = 'gms:open-bug-report';
const COLLAPSE_EVENT = 'gms:bug-report-launcher-collapse';
const COLLAPSED_STORAGE_KEY = 'bugReportLauncherCollapsed';

export const openBugReportModal = () => {
  window.dispatchEvent(new Event(OPEN_EVENT));
};

/** Gọi `onOpen` mỗi khi có nơi khác yêu cầu mở form báo lỗi. */
export const useBugReportOpenEvent = (onOpen) => {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [onOpen]);
};

const readCollapsed = () => localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';

/**
 * Trạng thái thu gọn của nút tròn nổi: bấm X thì co lại thành chấm nhỏ nhất ở
 * sát góc dưới bên phải, bấm chấm đó thì bung lại. Lựa chọn được nhớ giữa các
 * lần vào; kể cả khi đang thu gọn vẫn báo lỗi được qua dropdown avatar.
 */
export const useBugReportLauncherCollapsed = () => {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    const sync = () => setCollapsed(readCollapsed());
    window.addEventListener(COLLAPSE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COLLAPSE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setPersisted = useCallback((next) => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  return {
    collapsed,
    collapse: useCallback(() => setPersisted(true), [setPersisted]),
    expand: useCallback(() => setPersisted(false), [setPersisted]),
  };
};
