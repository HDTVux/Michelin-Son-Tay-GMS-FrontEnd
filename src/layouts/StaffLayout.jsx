import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect, useState, useEffect, useMemo } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import { useChat } from '../hooks/useChat.js';
import { useAIAssistant } from '../hooks/useAIAssistant.js';
import SideBar from './Sidebar/SideBar.jsx';
import MobileNavbar from './MobileNavbar/MobileNavbar.jsx';
import StaffHeader from './StaffHeader/StaffHeader.jsx';
import UserTour from '../components/UserTour/UserTour.jsx';
import ChatLauncher from '../components/Chat/ChatLauncher.jsx';
import ChatWindowDock from '../components/Chat/ChatWindowDock.jsx';
import ChatMobileNavButton from '../components/Chat/ChatMobileNavButton.jsx';
import AIAssistantPanel from '../components/AIAssistant/AIAssistantPanel.jsx';
import { resyncPushSubscription } from '../hooks/usePushNotifications.js';
import { initNotificationSound } from '../utils/notificationSound.js';
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

    let roles = Array.isArray(userInfo?.role) ? userInfo.role : [];
    const normalizedRoles = roles.map(r => String(r).trim().toUpperCase());
    if (normalizedRoles.includes('WAREHOUSE_MANAGER') || normalizedRoles.includes('ROLE_WAREHOUSE_MANAGER')) {
      if (!normalizedRoles.includes('WAREHOUSE_KEEPER') && !normalizedRoles.includes('ROLE_WAREHOUSE_KEEPER')) {
        roles = [...roles, 'WAREHOUSE_KEEPER'];
      }
    }
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

const SERVICE_TICKET_DETAIL_ROLES = new Set(['RECEPTIONIST', 'ACCOUNTANT', 'MANAGER', 'ADMIN']);
const TICKET_CODE_PATTERN = /\b(?:[A-Z]{2,}[A-Z0-9]*[_-][A-Z0-9_-]{2,}|[A-Z]{2,}[A-Z0-9_]{5,})\b/gi;

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRolesForNotificationRouting = () => {
  let roles = [];
  try {
    const rawRoles = localStorage.getItem('staffRoles');
    if (rawRoles) {
      const parsedRoles = JSON.parse(rawRoles);
      if (Array.isArray(parsedRoles)) {
        roles = parsedRoles
          .filter((role) => typeof role === 'string')
          .map((role) => normalizeRoleName(role))
          .filter(Boolean);
      }
    }
  } catch {
    // Fall back to staffProfile below.
  }

  if (roles.length === 0) {
    try {
      const rawProfile = localStorage.getItem('staffProfile');
      const profile = rawProfile ? JSON.parse(rawProfile) : null;
      const profileRoles = Array.isArray(profile?.role) ? profile.role : [];
      roles = profileRoles
        .filter((role) => typeof role === 'string')
        .map((role) => normalizeRoleName(role))
        .filter(Boolean);
    } catch {
      roles = [];
    }
  }

  if (roles.includes('WAREHOUSE_MANAGER') && !roles.includes('WAREHOUSE_KEEPER')) {
    roles.push('WAREHOUSE_KEEPER');
  }
  return roles;
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

const getNotificationRedirectPath = (notification) => {
  if (notification?.url) {
    try {
      const parsedUrl = new URL(notification.url, window.location.origin);
      if (
        parsedUrl.origin === window.location.origin ||
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname.includes('sontaygarage.vn')
      ) {
        return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
      }
    } catch {
      if (notification.url.startsWith('/')) {
        return notification.url;
      }
    }
  }
  return getTicketNotificationPath(notification);
};

const getNotificationServiceType = (notification) => {
  const url = notification?.url || '';
  const message = (notification?.message || '').toLowerCase();
  const title = (notification?.title || '').toLowerCase();

  if (url.includes('booking') || message.includes('dat lich') || title.includes('dat lich') || message.includes('đặt lịch') || title.includes('đặt lịch')) {
    return 'booking';
  }
  if (url.includes('warehouse-stock-entries') || message.includes('nhap kho') || title.includes('nhap kho') || message.includes('nhập kho') || title.includes('nhập kho')) {
    return 'import';
  }
  if (url.includes('warehouse-stock-issues') || message.includes('xuat kho') || title.includes('xuat kho') || message.includes('xuất kho') || title.includes('xuất kho')) {
    return 'export';
  }
  if (url.includes('warehouse-return-entries') || message.includes('hoan hang') || title.includes('hoan hang') || message.includes('hoàn hàng') || title.includes('hoàn hàng')) {
    return 'return';
  }
  if (url.includes('service-ticket') || url.includes('advisor') || url.includes('technician') || message.includes('phieu dich vu') || message.includes('phiếu dịch vụ') || message.includes('phan cong') || message.includes('phân công') || message.includes('giao phieu') || message.includes('giao phiếu')) {
    return 'ticket';
  }
  return 'general';
};

const getNotificationIcon = (notification) => {
  const type = getNotificationServiceType(notification);
  switch (type) {
    case 'booking':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#3b82f6' }}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
          <path d="M8 14h.01"/>
          <path d="M12 14h.01"/>
          <path d="M16 14h.01"/>
          <path d="M8 18h.01"/>
          <path d="M12 18h.01"/>
          <path d="M16 18h.01"/>
        </svg>
      );
    case 'import':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#10b981' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" x2="12" y1="15" y2="3"/>
        </svg>
      );
    case 'export':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#f59e0b' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" x2="12" y1="3" y2="15"/>
        </svg>
      );
    case 'return':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#ef4444' }}>
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
          <path d="M16 3h5v5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
          <path d="M8 21H3v-5"/>
        </svg>
      );
    case 'ticket':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#8b5cf6' }}>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
          <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          <path d="M10 9H8"/>
          <path d="M16 13H8"/>
          <path d="M16 17H8"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#9ca3af' }}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      );
  }
};

export const StaffNotificationBell = ({
  error,
  loading,
  markAsRead,
  notifications,
  unreadCount,
}) => {
  const navigate = useNavigate();
  const [bellFilter, setBellFilter] = useState('ALL'); // ALL, UNREAD, URGENT

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (bellFilter === 'UNREAD') {
        return !item?.isRead;
      }
      if (bellFilter === 'URGENT') {
        const type = String(item?.notificationType || '').toUpperCase();
        return type === 'URGENT' || type === 'WARNING';
      }
      return true;
    });
  }, [notifications, bellFilter]);

  const latestNotifications = filteredNotifications.slice(0, 8);

  const hasUnreadUrgent = useMemo(() => {
    return notifications.some(n => !n.isRead && (String(n.notificationType).toUpperCase() === 'URGENT' || String(n.notificationType).toUpperCase() === 'WARNING'));
  }, [notifications]);
  const markNotificationItemAsRead = (item) => {
    if (!item?.notificationId || item?.isRead) return;
    markAsRead(item.notificationId);
  };

  const markOpenNotificationsAsRead = () => {
    notifications
      .filter((item) => {
        const isUrgent = String(item?.notificationType).toUpperCase() === 'URGENT' || String(item?.notificationType).toUpperCase() === 'WARNING';
        return item?.notificationId && !item?.isRead && !isUrgent;
      })
      .forEach((item) => markAsRead(item.notificationId));
  };

  const handlePanelToggle = (event) => {
    if (!event.currentTarget.open) return;
    markOpenNotificationsAsRead();
  };

  const handleNotificationAction = (event, item) => {
    markNotificationItemAsRead(item);

    const targetPath = getNotificationRedirectPath(item);
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
        {unreadCount > 0 && <span className="staffNotification__badge">{unreadCount}</span>}
      </summary>

      <section className="staffNotification__panel" aria-label="Danh sách thông báo">
        <header className="staffNotification__header">
          <div>
            <strong>Thông báo</strong>
          </div>
          <small>{loading ? 'Đang tải...' : `${notifications.length} thông báo`}</small>
        </header>

        {error && <p className="staffNotification__error">{error}</p>}

        <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', borderBottom: '1px solid #eef2f7', background: '#f9fafb', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid ' + (bellFilter === 'ALL' ? '#005aa9' : '#e5e7eb'),
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: bellFilter === 'ALL' ? '#005aa9' : '#ffffff',
              color: bellFilter === 'ALL' ? '#ffffff' : '#4b5563',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setBellFilter('ALL')}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid ' + (bellFilter === 'UNREAD' ? '#005aa9' : '#e5e7eb'),
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: bellFilter === 'UNREAD' ? '#005aa9' : '#ffffff',
              color: bellFilter === 'UNREAD' ? '#ffffff' : '#4b5563',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setBellFilter('UNREAD')}
          >
            Chưa đọc ({notifications.filter(n => !n.isRead).length})
          </button>
          <button
            type="button"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid ' + (bellFilter === 'URGENT' ? (hasUnreadUrgent ? '#dc2626' : '#ea580c') : (hasUnreadUrgent ? '#fecaca' : '#e5e7eb')),
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: bellFilter === 'URGENT' 
                ? (hasUnreadUrgent ? '#dc2626' : '#ea580c') 
                : (hasUnreadUrgent ? '#fef2f2' : '#ffffff'),
              color: bellFilter === 'URGENT' 
                ? '#ffffff' 
                : (hasUnreadUrgent ? '#dc2626' : '#4b5563'),
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={() => setBellFilter('URGENT')}
          >
            {hasUnreadUrgent && <span style={{ fontWeight: 'bold', fontSize: '13px', lineHeight: 1 }}>⚠</span>}
            Khẩn cấp
          </button>
        </div>

        <div className="staffNotification__list">
          {latestNotifications.length === 0 ? (
            <p className="staffNotification__empty">Chưa có thông báo.</p>
          ) : (
            latestNotifications.map((item) => {
              const targetPath = getNotificationRedirectPath(item);
              const isActionable = Boolean(targetPath || (item?.notificationId && !item?.isRead));
              const typeLower = String(item?.notificationType || 'info').toLowerCase();

              return (
                <article
                  className={`staffNotification__item type-${typeLower} ${item?.isRead ? '' : 'isUnread'}`}
                  key={item?.notificationId ?? `${item?.title}-${item?.sentAt}`}
                  onClick={(event) => handleNotificationAction(event, item)}
                  onKeyDown={(event) => handleNotificationKeyDown(event, item)}
                  role={isActionable ? 'button' : undefined}
                  tabIndex={isActionable ? 0 : undefined}
                >
                  <div className="staffNotification__itemIcon">
                    {getNotificationIcon(item)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="staffNotification__itemTop">
                      <strong>{item?.title || 'Thông báo'}</strong>
                      {!item?.isRead && <span className="staffNotification__unreadDot" title="Chưa đọc" />}
                    </div>
                    <p className="staffNotification__itemMessage">{item?.message || 'Không có nội dung.'}</p>
                    <time className="staffNotification__itemTime">{formatNotificationTime(item?.sentAt)}</time>
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

  // Tạo AudioContext + đăng ký mở khoá âm thanh từ tương tác đầu tiên của người dùng
  // càng sớm càng tốt — tránh trường hợp tin nhắn/thông báo đầu tiên (kích hoạt qua
  // WebSocket, không phải gesture) tới trước khi trình duyệt cho phép phát âm thanh.
  useEffect(() => {
    initNotificationSound();
  }, []);

  // Đăng ký Service Worker cho Web Push ngay khi nhân viên đã đăng nhập, để
  // thông báo cấp hệ điều hành hoạt động cả khi đã tắt web (việc bật/tắt
  // subscription do PushNotificationToggle xử lý). Idempotent — an toàn gọi lại.
  //
  // Đồng thời TỰ ĐỒNG BỘ subscription lên backend mỗi lần mở app: đây là cơ chế
  // tự chữa khi push "mất hiệu lực sau một thời gian" (BE prune do 404/410, push
  // service xoay endpoint lúc app đóng, iOS thu hồi subscription...).
  useEffect(() => {
    if (!hasStaffToken || !('serviceWorker' in navigator)) return undefined;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* Bỏ qua: trình duyệt không hỗ trợ hoặc context không an toàn (không phải HTTPS/localhost) */
    });

    resyncPushSubscription({ force: true });

    // Service worker báo endpoint vừa bị xoay -> đồng bộ ngay.
    const onSwMessage = (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGE') {
        resyncPushSubscription({ force: true });
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);

    // App mở lâu ngày (PWA) -> kiểm tra lại khi quay lại tab, có tiết chế tần suất.
    const onVisible = () => {
      if (document.visibilityState === 'visible') resyncPushSubscription();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hasStaffToken]);

  const notificationState = useNotifications({ enabled: hasStaffToken, notifyOnReceive: true });
  // Backend chat (/api/chat/*, /ws-chat) đã triển khai theo contract trong src/services/chatService.js.
  const chatState = useChat({ enabled: hasStaffToken, mock: false });

  // Mở đúng cửa sổ chat khi người dùng bấm thông báo đẩy tin nhắn (URL kèm ?openChat=<id>).
  const { openConversation } = chatState;
  useEffect(() => {
    if (!hasStaffToken) return;
    const params = new URLSearchParams(location.search);
    const openChat = params.get('openChat');
    if (!openChat) return;

    const convId = Number(openChat);
    if (Number.isFinite(convId)) openConversation(convId);

    params.delete('openChat');
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true },
    );
  }, [hasStaffToken, location.pathname, location.search, openConversation, navigate]);
  const aiAssistantState = useAIAssistant({ enabled: hasStaffToken, mock: false  });

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
      <SideBar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        chatButton={hasStaffToken ? <ChatMobileNavButton chatState={chatState} /> : null}
        aiAssistantState={aiAssistantState}
      />
      <main className="staffLayout__content">
        {hasStaffToken && (
          <StaffHeader
            notificationState={notificationState}
            notificationBell={<StaffNotificationBell {...notificationState} />}
            chatButton={<ChatLauncher chatState={chatState} />}
            onOpenAiAssistant={aiAssistantState.openPanel}
            aiAssistantState={aiAssistantState}
          />
        )}
        <div className="staffLayout__page-container">
          <Outlet context={{ notificationState, chatState, aiAssistantState }} />
        </div>
      </main>
      {hasStaffToken && <MobileNavbar notificationState={notificationState} />}
      {hasStaffToken && <ChatWindowDock chatState={chatState} />}
      {hasStaffToken && <AIAssistantPanel aiState={aiAssistantState} />}
      <UserTour type="staff" />
    </div>
  );
};

export default StaffLayout;
