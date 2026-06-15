import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, BellOff, CheckCheck, Calendar, ChevronRight } from 'lucide-react';
import './StaffNotifications.css';

// ROLES AND ROUTING CONSTANTS
const SERVICE_TICKET_DETAIL_ROLES = new Set(['RECEPTIONIST', 'ACCOUNTANT', 'MANAGER', 'ADMIN']);
const TICKET_CODE_PATTERN = /\b(?:[A-Z]{2,}[A-Z0-9]*[_-][A-Z0-9_-]{2,}|[A-Z]{2,}[A-Z0-9_]{5,})\b/gi;

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const readStaffRolesForRouting = () => {
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
  } catch {}

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

const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

  const roles = readStaffRolesForRouting();
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

const StaffNotifications = () => {
  const navigate = useNavigate();
  // Get notifications state from StaffLayout Outlet Context
  const context = useOutletContext();
  const notificationState = context?.notificationState || {};
  const {
    notifications = [],
    markAsRead,
    loading = false,
  } = notificationState;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, UNREAD, URGENT

  // Handle Mark All As Read
  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter((item) => item && !item.isRead);
    unreadNotifications.forEach((item) => {
      if (item?.notificationId) {
        markAsRead(item.notificationId);
      }
    });
  };

  // Handle individual notification click
  const handleItemClick = (item) => {
    if (item?.notificationId && !item?.isRead) {
      markAsRead(item.notificationId);
    }

    const targetPath = getTicketNotificationPath(item);
    if (targetPath) {
      navigate(targetPath, {
        state: {
          notification: item,
          source: 'staff-notification-list',
        },
      });
    }
  };

  // Filtered and searched notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Search term match
      const titleNormalized = normalizeSearchText(item?.title || '');
      const messageNormalized = normalizeSearchText(item?.message || '');
      const searchNormalized = normalizeSearchText(searchTerm);
      const isSearchMatched =
        titleNormalized.includes(searchNormalized) ||
        messageNormalized.includes(searchNormalized);

      if (!isSearchMatched) return false;

      // 2. Filter match
      if (activeFilter === 'UNREAD') {
        return !item?.isRead;
      }
      if (activeFilter === 'URGENT') {
        const type = String(item?.notificationType || '').toUpperCase();
        return type === 'URGENT' || type === 'WARNING';
      }

      return true;
    });
  }, [notifications, searchTerm, activeFilter]);

  const hasUnread = useMemo(() => {
    return notifications.some((item) => item && !item.isRead);
  }, [notifications]);

  return (
    <div className="staff-notifications-page">
      <header className="staff-notifications-page__header">
        <h1 className="staff-notifications-page__title">Thông báo của tôi</h1>
        <div className="staff-notifications-page__actions">
          <button
            type="button"
            className="btn-mark-all-read"
            onClick={handleMarkAllAsRead}
            disabled={!hasUnread || loading}
          >
            <CheckCheck size={16} />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        </div>
      </header>

      {/* Search and Filters */}
      <section className="staff-notifications-page__controls">
        <div className="notifications-search">
          <span className="notifications-search__icon">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc nội dung thông báo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="notifications-filters">
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'UNREAD' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('UNREAD')}
          >
            Chưa đọc ({notifications.filter((n) => !n.isRead).length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'URGENT' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('URGENT')}
          >
            Khẩn cấp & Cảnh báo
          </button>
        </div>
      </section>

      {/* Notifications List */}
      <main className="notifications-list-container">
        {loading && notifications.length === 0 ? (
          <div className="notifications-empty-state">
            <p className="notifications-empty-state__title">Đang tải thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty-state">
            <div className="notifications-empty-state__icon">
              <BellOff size={48} />
            </div>
            <h3 className="notifications-empty-state__title">Không tìm thấy thông báo nào</h3>
            <p className="notifications-empty-state__desc">
              {searchTerm
                ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc hiện tại của bạn.'
                : 'Hộp thư của bạn hiện đang trống.'}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((item) => {
              const typeMeta = getNotificationTypeMeta(item?.notificationType);
              const targetPath = getTicketNotificationPath(item);

              return (
                <article
                  key={item?.notificationId ?? `${item?.title}-${item?.sentAt}`}
                  className={`notification-row-item ${item?.isRead ? '' : 'is-unread'}`}
                  onClick={() => handleItemClick(item)}
                >
                  {!item?.isRead && <span className="notification-row-item__status-dot" />}
                  
                  <div className="notification-row-item__content">
                    <header className="notification-row-item__header">
                      <h2 className="notification-row-item__title">{item?.title || 'Thông báo'}</h2>
                      <div className="notification-row-item__badges">
                        <span className={`badge-notif-type ${typeMeta.className}`}>
                          {typeMeta.label}
                        </span>
                      </div>
                    </header>
                    
                    <p className="notification-row-item__message">{item?.message || 'Không có nội dung.'}</p>
                    
                    <footer className="notification-row-item__meta">
                      <span className="notification-row-item__time">
                        <Calendar size={12} />
                        <time>{formatNotificationTime(item?.sentAt)}</time>
                      </span>
                      {targetPath && (
                        <span className="notification-row-item__action-text">
                          Chi tiết công việc
                          <ChevronRight size={14} />
                        </span>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffNotifications;
export { StaffNotifications };
