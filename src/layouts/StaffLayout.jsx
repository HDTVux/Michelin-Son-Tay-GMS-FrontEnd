import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect, useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import SideBar from './Sidebar/SideBar.jsx';
import MobileNavbar from './MobileNavbar/MobileNavbar.jsx';
import StaffHeader from './StaffHeader/StaffHeader.jsx';
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

const SERVICE_TICKET_DETAIL_ROLES = new Set(['RECEPTIONIST', 'ACCOUNTANT', 'MANAGER', 'ADMIN']);
const TICKET_CODE_PATTERN = /\b(?:[A-Z]{2,}[A-Z0-9]*[_-][A-Z0-9_-]{2,}|[A-Z]{2,}[A-Z0-9_]{5,})\b/gi;

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRolesForNotificationRouting = () => {
  try {
    const rawRoles = localStorage.getItem('staffRoles');
    if (rawRoles) {
      const parsedRoles = JSON.parse(rawRoles);
      if (Array.isArray(parsedRoles)) {
        return parsedRoles
          .filter((role) => typeof role === 'string')
          .map((role) => normalizeRoleName(role))
          .filter(Boolean);
      }
    }
  } catch {
    // Fall back to staffProfile below.
  }

  try {
    const rawProfile = localStorage.getItem('staffProfile');
    const profile = rawProfile ? JSON.parse(rawProfile) : null;
    const roles = Array.isArray(profile?.role) ? profile.role : [];
    return roles
      .filter((role) => typeof role === 'string')
      .map((role) => normalizeRoleName(role))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const normalizeSearchText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

const cleanTicketCode = (value) => {
  const code = String(value ?? '')
    .trim()
    .replace(/^#/, '')
    .replace(/^[^\w]+|[^\w-]+$/g, '');

  if (!/^[A-Za-z0-9_-]{3,}$/.test(code)) return '';
  if (!/[0-9_-]/.test(code)) return '';
  return code;
};

const isTicketAssignmentNotification = (notification) => {
  const text = normalizeSearchText(`${notification?.title || ''} ${notification?.message || ''}`);
  return (
    text.includes('duoc giao phieu') ||
    text.includes('giao phieu') ||
    text.includes('giao viec') ||
    text.includes('phan cong')
  );
};

const getDirectNotificationTicketCode = (notification) => {
  const candidates = [
    notification?.ticketCode,
    notification?.serviceTicketCode,
    notification?.code,
    notification?.serviceTicket?.ticketCode,
    notification?.serviceTicket?.code,
    notification?.ticket?.ticketCode,
    notification?.ticket?.code,
  ];

  return candidates.map(cleanTicketCode).find(Boolean) || '';
};

const getTextNotificationTicketCode = (notification) => {
  const text = `${notification?.title || ''} ${notification?.message || ''}`;
  const matches = text.match(TICKET_CODE_PATTERN) || [];
  return matches.map(cleanTicketCode).find(Boolean) || '';
};

const getNotificationTicketCode = (notification) => {
  const directCode = getDirectNotificationTicketCode(notification);
  if (directCode) return directCode;
  if (!isTicketAssignmentNotification(notification)) return '';
  return getTextNotificationTicketCode(notification);
};

const getTicketNotificationPath = (notification) => {
  const ticketCode = getNotificationTicketCode(notification);
  if (!ticketCode) return '';

  const roles = readStaffRolesForNotificationRouting();
  const canOpenServiceTicketDetail =
    roles.some((role) => SERVICE_TICKET_DETAIL_ROLES.has(role));
  const encodedCode = encodeURIComponent(ticketCode);

  if (roles.length === 0 || roles.includes('ADVISOR')) {
    return `/advisor/inspection?ticketCode=${encodedCode}`;
  }

  if (!canOpenServiceTicketDetail && roles.includes('TECHNICIAN')) {
    return `/technician/safetyinspection-ticket/${encodedCode}`;
  }

  return `/service-ticket-detail/${encodedCode}`;
};

export const StaffNotificationBell = ({
  connected,
  error,
  loading,
  markAsRead,
  notifications,
  unreadCount,
}) => {
  const navigate = useNavigate();
  const latestNotifications = notifications.slice(0, 8);

  const markNotificationItemAsRead = (item) => {
    if (!item?.notificationId || item?.isRead) return;
    markAsRead(item.notificationId);
  };

  const markOpenNotificationsAsRead = () => {
    notifications
      .filter((item) => item?.notificationId && !item?.isRead)
      .forEach((item) => markAsRead(item.notificationId));
  };

  const handlePanelToggle = (event) => {
    if (!event.currentTarget.open) return;
    markOpenNotificationsAsRead();
  };

  const handleNotificationAction = (event, item) => {
    markNotificationItemAsRead(item);

    const targetPath = getTicketNotificationPath(item);
    if (!targetPath) return;

    event.currentTarget.closest('details')?.removeAttribute('open');
    navigate(targetPath, {
      state: {
        notification: item,
        source: 'staff-notification',
      },
    });
  };

  const handleNotificationKeyDown = (event, item) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleNotificationAction(event, item);
  };

  const handleViewAllClick = (event) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    navigate('/notifications');
  };

  return (
    <details className="staffNotification" onToggle={handlePanelToggle}>
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
              const targetPath = getTicketNotificationPath(item);
              const isActionable = Boolean(targetPath || (item?.notificationId && !item?.isRead));

              return (
                <article
                  className={`staffNotification__item ${item?.isRead ? '' : 'isUnread'}`}
                  key={item?.notificationId ?? `${item?.title}-${item?.sentAt}`}
                  onClick={(event) => handleNotificationAction(event, item)}
                  onKeyDown={(event) => handleNotificationKeyDown(event, item)}
                  role={isActionable ? 'button' : undefined}
                  tabIndex={isActionable ? 0 : undefined}
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
        <footer className="staffNotification__footer">
          <button
            type="button"
            className="staffNotification__viewAllBtn"
            onClick={handleViewAllClick}
          >
            Xem tất cả thông báo
          </button>
        </footer>
      </section>
    </details>
  );
};

const StaffLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasStaffToken = Boolean(localStorage.getItem('authToken') || localStorage.getItem('staffToken'));

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

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
    <div className={`staffLayout ${isCollapsed ? 'is-collapsed' : ''}`}>
      <SideBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main className="staffLayout__content">
        {hasStaffToken && (
          <StaffHeader
            notificationState={notificationState}
            notificationBell={<StaffNotificationBell {...notificationState} />}
          />
        )}
        <div className="staffLayout__page-container">
          <Outlet context={{ notificationState }} />
        </div>
      </main>
      {hasStaffToken && <MobileNavbar notificationState={notificationState} />}
    </div>
  );
};

export default StaffLayout;
