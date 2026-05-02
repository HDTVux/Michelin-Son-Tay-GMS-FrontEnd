import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import SideBar from './Sidebar/SideBar.jsx';
import './StaffLayout.css';

const base64UrlToBase64 = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replaceAll('-', '+').replaceAll('_', '/');
  const pad = normalized.length % 4;
  if (pad === 0) return normalized;
  return normalized + '='.repeat(4 - pad);
};

const decodeBase64ToUtf8 = (base64OrUrl) => {
  const b64 = base64UrlToBase64(base64OrUrl);
  if (!b64) return '';
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

const persistStaffSessionFromSso = ({ tokenFromUrl, infoFromUrl }) => {
  if (tokenFromUrl) {
    localStorage.setItem('authToken', tokenFromUrl);
  }

  if (!infoFromUrl) return;

  try {
    const decoded = decodeBase64ToUtf8(decodeURIComponent(infoFromUrl));
    const userInfo = JSON.parse(decoded);

    const roles = Array.isArray(userInfo?.role) ? userInfo.role : [];
    if (roles.length > 0) localStorage.setItem('staffRoles', JSON.stringify(roles));
    else localStorage.removeItem('staffRoles');

    const staffProfile = {
      staffId: userInfo?.staffId ?? null,
      fullName: typeof userInfo?.fullName === 'string' ? userInfo.fullName : '',
      avatarUrl: typeof userInfo?.avatarUrl === 'string' ? userInfo.avatarUrl : '',
      role: roles,
    };
    if (staffProfile.staffId != null || staffProfile.fullName || staffProfile.avatarUrl) {
      localStorage.setItem('staffProfile', JSON.stringify(staffProfile));
    } else {
      localStorage.removeItem('staffProfile');
    }

    if (!tokenFromUrl && typeof userInfo?.token === 'string' && userInfo.token) {
      localStorage.setItem('authToken', userInfo.token);
    }
  } catch {
    // Ignore malformed info param
  }
};

const removeSsoParams = (search) => {
  const params = new URLSearchParams(search);
  params.delete('token');
  params.delete('info');
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

const maybeForceReloadAfterSso = ({ tokenFromUrl, infoFromUrl, cleanUrl }) => {
  const signature = `${tokenFromUrl || ''}|${infoFromUrl || ''}`;
  const last = sessionStorage.getItem('sso:lastSignature');
  if (last === signature) return;
  sessionStorage.setItem('sso:lastSignature', signature);
  globalThis.location.replace(cleanUrl);
};

const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getNotificationTypeMeta = (type) => {
  const normalizedType = String(type || 'INFO').toUpperCase();
  const labels = {
    INFO: 'Thông tin',
    WARNING: 'Cảnh báo',
    URGENT: 'Khẩn cấp',
  };

  return {
    className: normalizedType.toLowerCase(),
    label: labels[normalizedType] || normalizedType,
  };
};

const StaffNotificationBell = ({
  connected,
  error,
  loading,
  markAsRead,
  notifications,
  unreadCount,
}) => {
  const latestNotifications = notifications.slice(0, 8);
  const markNotificationItemAsRead = (item) => {
    if (!item?.notificationId || item?.isRead) return;
    markAsRead(item.notificationId);
  };

  const handleNotificationKeyDown = (event, item) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    markNotificationItemAsRead(item);
  };

  return (
    <details className="staffNotification">
      <summary
        className={`staffNotification__button ${unreadCount > 0 ? 'hasUnread' : ''}`}
        aria-label="Thông báo nhân viên"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span
          className={`staffNotification__connectionDot ${connected ? 'isConnected' : ''}`}
          title={connected ? 'Đã kết nối realtime' : 'Đang chờ kết nối realtime'}
          aria-hidden="true"
        />
        {unreadCount > 0 && <span className="staffNotification__badge">{unreadCount}</span>}
      </summary>

      <section className="staffNotification__panel" aria-label="Danh sách thông báo">
        <header className="staffNotification__header">
          <div>
            <strong>Thông báo</strong>
            <span
              className={`staffNotification__panelConnectionDot ${connected ? 'isConnected' : ''}`}
              title={connected ? 'Đã kết nối realtime' : 'Đang chờ kết nối realtime'}
              aria-label={connected ? 'Đã kết nối realtime' : 'Đang chờ kết nối realtime'}
              role="status"
            />
          </div>
          <small>{loading ? 'Đang tải...' : `${notifications.length} thông báo`}</small>
        </header>

        {error && <p className="staffNotification__error">{error}</p>}

        <div className="staffNotification__list">
          {latestNotifications.length === 0 ? (
            <p className="staffNotification__empty">Chưa có thông báo.</p>
          ) : (
            latestNotifications.map((item) => {
              const typeMeta = getNotificationTypeMeta(item?.notificationType);

              return (
                <article
                  className={`staffNotification__item ${item?.isRead ? '' : 'isUnread'}`}
                  key={item?.notificationId ?? `${item?.title}-${item?.sentAt}`}
                  onClick={() => markNotificationItemAsRead(item)}
                  onKeyDown={(event) => handleNotificationKeyDown(event, item)}
                  role={item?.notificationId && !item?.isRead ? 'button' : undefined}
                  tabIndex={item?.notificationId && !item?.isRead ? 0 : undefined}
                >
                  <div>
                    <div className="staffNotification__itemTop">
                      <strong>{item?.title || 'Thông báo'}</strong>
                      <div className="staffNotification__badges">
                        <span className={`staffNotification__type ${typeMeta.className}`}>
                          {typeMeta.label}
                        </span>
                        <span
                          className={`staffNotification__status ${item?.isRead ? 'isRead' : 'isUnread'}`}
                        >
                          {item?.isRead ? 'Đã đọc' : 'Chưa đọc'}
                        </span>
                      </div>
                    </div>
                    <p>{item?.message || 'Không có nội dung.'}</p>
                    <time>{formatNotificationTime(item?.sentAt)}</time>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </details>
  );
};

const StaffLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasStaffToken = Boolean(localStorage.getItem('authToken') || localStorage.getItem('staffToken'));

  const notificationState = useNotifications({ enabled: hasStaffToken, notifyOnReceive: true });

  useLayoutEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get('token');
    const infoFromUrl = params.get('info');
    if (!tokenFromUrl && !infoFromUrl) return;

    persistStaffSessionFromSso({ tokenFromUrl, infoFromUrl });
    const nextSearch = removeSsoParams(location.search);
    const cleanUrl = `${location.pathname}${nextSearch}`;
    maybeForceReloadAfterSso({ tokenFromUrl, infoFromUrl, cleanUrl });

    // Fallback (should be reached only if reload is suppressed)
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="staffLayout">
      <SideBar />
      <main className="staffLayout__content">
        {hasStaffToken && <StaffNotificationBell {...notificationState} />}
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
