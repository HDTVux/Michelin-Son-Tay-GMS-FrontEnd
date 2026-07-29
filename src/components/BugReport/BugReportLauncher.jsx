import { useCallback, useState } from 'react';
import { Bug, X } from 'lucide-react';

import BugReportModal from './BugReportModal.jsx';
import { useBugReportLauncherCollapsed, useBugReportOpenEvent } from './bugReportBus.js';
import { useShakeToReport } from '../../hooks/useShakeToReport.js';
import styles from './BugReport.module.css';

/**
 * Nút tròn nổi ở góc dưới bên phải để báo lỗi phần mềm.
 * Dùng cho khu vực nhân viên; phía khách hàng nút được gắn vào cụm
 * "Kênh liên hệ" của MainLayout nên chỉ tái sử dụng {@link BugReportModal}.
 *
 * Bấm X sẽ thu gọn thành chấm nhỏ sát góc màn hình; bấm chấm đó để bung lại.
 * Dù đang thu gọn vẫn báo lỗi được qua dropdown avatar.
 */
export default function BugReportLauncher() {
  const [open, setOpen] = useState(false);
  const { collapsed, collapse, expand } = useBugReportLauncherCollapsed();

  useBugReportOpenEvent(useCallback(() => setOpen(true), []));
  // Trên mobile nút nổi bị ẩn — lắc máy là cách mở form nhanh nhất.
  useShakeToReport(!open);

  return (
    <>
      {collapsed ? (
        <button
          type="button"
          className={styles.launcherMini}
          onClick={expand}
          aria-label="Mở lại nút báo lỗi phần mềm"
          title="Mở lại nút báo lỗi phần mềm"
          data-gms-no-global-loading="true"
        >
          <Bug size={12} strokeWidth={2.6} />
        </button>
      ) : (
        <div className={styles.launcherWrap} data-gms-no-global-loading="true">
          <button
            type="button"
            className={styles.launcherHide}
            onClick={collapse}
            aria-label="Thu gọn nút báo lỗi"
            title="Thu gọn — vẫn báo lỗi được trong menu tài khoản"
          >
            <X size={11} strokeWidth={3} />
          </button>
          <button
            type="button"
            className={styles.launcher}
            onClick={() => setOpen(true)}
            aria-label="Báo lỗi phần mềm"
            title="Báo lỗi phần mềm"
          >
            <span className={styles.launcherTooltip}>Báo lỗi phần mềm</span>
            <Bug size={20} strokeWidth={2.2} />
          </button>
        </div>
      )}

      <BugReportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
