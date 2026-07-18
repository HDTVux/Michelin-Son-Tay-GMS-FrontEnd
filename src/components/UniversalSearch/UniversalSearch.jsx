import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Layers, User, FileText, Download, Upload, Undo } from 'lucide-react';
import { request } from '../../services/apiClient.js';
import './UniversalSearch.css';

const normalizeSearchText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

const normalizeRoleName = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
};

const SEARCHABLE_FUNCTIONS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', roles: 'ALL' },
  { id: 'system-tutorials', label: 'Hướng dẫn sử dụng', path: '/system-tutorials', roles: 'ALL' },
  { id: 'customer-manager', label: 'Danh bạ khách hàng', path: '/customer-manager', roles: ['RECEPTIONIST', 'ADMIN'] },
  { id: 'create-booking', label: 'Tạo lịch giữ chỗ', path: '/create-booking', roles: ['RECEPTIONIST'] },
  { id: 'parts-sales', label: 'Bán hàng', path: '/parts-sales', roles: ['RECEPTIONIST'] },
  { id: 'booking-management', label: 'Quản lý lịch hẹn', path: '/booking-management', roles: ['RECEPTIONIST'] },
  { id: 'booking-request-management', label: 'Yêu cầu đặt lịch', path: '/booking-request-management', roles: ['RECEPTIONIST'] },
  { id: 'queue-management', label: 'Quản lý hàng chờ đặt lịch', path: '/queue-management', roles: ['RECEPTIONIST'] },
  { id: 'advisor-inspection', label: 'Điều phối phiếu dịch vụ', path: '/advisor/inspection', roles: ['ADVISOR', 'MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ADMIN'] },
  { id: 'service-ticket-management', label: 'Phiếu dịch vụ', path: '/service-ticket-management', roles: ['RECEPTIONIST', 'ACCOUNTANT'] },
  { id: 'my-tasks', label: 'Công việc hôm nay', path: '/technician/my-tasks', roles: ['TECHNICIAN'] },
  { id: 'service-management', label: 'Quản lý dịch vụ', path: '/service-management', roles: ['MANAGER', 'ACCOUNTANT'] },
  { id: 'combo-management', label: 'Quản lý gói Combo', path: '/combo-management', roles: ['MANAGER', 'ACCOUNTANT'] },
  { id: 'warehouse-management', label: 'Quản lý kho', path: '/warehouse-management', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-config', label: 'Cấu hình kho', path: '/warehouse-config', roles: ['MANAGER', 'ADMIN', 'WAREHOUSE_MANAGER'] },
  { id: 'warehouse-pricing', label: 'Giá theo kho', path: '/warehouse-pricing', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'part-management', label: 'Quản lý phụ tùng', path: '/part-management', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-stock-entries', label: 'Quản lý phiếu nhập', path: '/warehouse-stock-entries', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-stock-issues', label: 'Quản lý phiếu xuất', path: '/warehouse-stock-issues', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-return-entries', label: 'Quản lý phiếu trả hàng', path: '/warehouse-return-entries', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-defective-inventory', label: 'Kho hàng lỗi', path: '/warehouse-defective-inventory', roles: ['MANAGER', 'WAREHOUSE_KEEPER'] },
  { id: 'warehouse-defect-report', label: 'Báo cáo lỗi & Trách nhiệm', path: '/warehouse-defect-report', roles: ['MANAGER'] },
  { id: 'staff-manager', label: 'Quản lý nhân viên', path: '/staff-manager', roles: ['MANAGER', 'ADMIN'] },
  { id: 'employee-manager', label: 'Quản lý hồ sơ nhân viên', path: '/employee-manager', roles: ['MANAGER', 'ADMIN'] },
  { id: 'shift-management', label: 'Quản lý ca làm việc', path: '/shift-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'attendance-management', label: 'Chấm công nhân viên', path: '/attendance-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'attendance-locations', label: 'Vị trí chấm công (QR)', path: '/attendance-locations', roles: ['MANAGER', 'ADMIN'] },
  { id: 'attendance-request-management', label: 'Duyệt đơn chấm công', path: '/attendance-request-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'staff-notification-sender', label: 'Thông báo nhân viên', path: '/staff-notification-sender', roles: ['RECEPTIONIST', 'MANAGER', 'ADMIN'] },
  { id: 'promotion-management', label: 'Quản lý khuyến mãi', path: '/promotion-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'maintenance-reminders', label: 'Nhắc lịch bảo dưỡng', path: '/maintenance-reminders', roles: ['RECEPTIONIST', 'MANAGER'] },
  { id: 'announcement-campaign', label: 'Chiến dịch thông báo', path: '/announcement_campaign', roles: ['RECEPTIONIST', 'MANAGER'] },
  { id: 'feedback-management', label: 'Quản lý feedback', path: '/feedback-management', roles: ['MANAGER', 'ADMIN'] },
  { id: 'system-log-management', label: 'Nhật ký hệ thống', path: '/system-log-management', roles: ['ADMIN'] },
  { id: 'backend-logs', label: 'Log Backend', path: '/backend-logs', roles: ['ADMIN'] },
  { id: 'revenue-management', label: 'Quản lý doanh thu', path: '/revenue-management', roles: ['ACCOUNTANT', 'MANAGER', 'ADMIN'] },
  { id: 'staff-profile', label: 'Hồ sơ nhân viên', path: '/staff-profile', roles: 'ALL' },
  { id: 'attendance-checkin', label: 'Chấm công QR', path: '/attendance-checkin', roles: 'ALL' },
  { id: 'attendance-requests', label: 'Chấm công bù / Xin nghỉ', path: '/attendance-requests', roles: 'ALL' },
  { id: 'staff-notifications-page', label: 'Thông báo cá nhân', path: '/notifications', roles: 'ALL' },
  { id: 'daily-schedule', label: 'Lịch làm việc', path: '/daily-schedule', roles: 'ALL' },
];

const querySearch = async (searchTerm, staffRoles) => {
  const token = localStorage.getItem('authToken');
  if (!token || !searchTerm.trim()) return null;

  const query = searchTerm.trim();
  const normalizedRoles = staffRoles.map(normalizeRoleName);

  const results = {
    functions: [],
    customers: [],
    tickets: [],
    stockEntries: [],
    stockIssues: [],
    returnEntries: [],
  };

  const normalizedQuery = normalizeSearchText(query);
  results.functions = SEARCHABLE_FUNCTIONS.filter((item) => {
    const hasRole = item.roles === 'ALL' || (Array.isArray(item.roles) && item.roles.some((r) => normalizedRoles.includes(normalizeRoleName(r))));
    if (!hasRole) return false;
    return normalizeSearchText(item.label).includes(normalizedQuery);
  }).slice(0, 5);

  const promises = [];

  const hasCustomerAccess = normalizedRoles.some((r) => ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(r));
  if (hasCustomerAccess) {
    promises.push(
      request(`/api/admin/customer/getAllCustomer?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then((res) => {
          results.customers = (res?.data?.content || []).map((c) => ({
            id: c.customerId || c.id,
            title: c.fullName || 'Khách hàng',
            subtitle: c.phoneNumber || c.phone || '',
            path: `/customer-manager?search=${encodeURIComponent(c.phoneNumber || c.fullName)}`,
          }));
        })
        .catch(() => {}),
    );
  }

  const hasTicketAccess = normalizedRoles.some((r) => ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'ADVISOR', 'TECHNICIAN'].includes(r));
  if (hasTicketAccess) {
    promises.push(
      request(`/api/service-ticket/manage/tickets?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then((res) => {
          results.tickets = (res?.data?.content || []).map((t) => ({
            id: t.serviceTicketId || t.ticketId || t.id,
            title: t.ticketCode || t.code || 'Phiếu dịch vụ',
            subtitle: `${t.licensePlate || ''} - ${t.customerName || ''}`,
            path: `/service-ticket-detail/${encodeURIComponent(t.ticketCode || t.code)}`,
          }));
        })
        .catch(() => {}),
    );
  }

  const hasWarehouseAccess = normalizedRoles.some((r) => ['ADMIN', 'MANAGER', 'WAREHOUSE_KEEPER', 'WAREHOUSE_MANAGER'].includes(r));
  if (hasWarehouseAccess) {
    promises.push(
      request(`/api/warehouse/stock-entries?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then((res) => {
          results.stockEntries = (res?.data?.content || []).map((e) => ({
            id: e.entryId,
            title: e.entryCode || 'Phiếu nhập',
            subtitle: `NCC: ${e.supplierName || ''} - Tổng: ${e.totalAmount?.toLocaleString('vi-VN') || 0}đ`,
            path: `/warehouse-stock-entries/${e.entryId}`,
          }));
        })
        .catch(() => {}),
    );

    promises.push(
      request(`/api/warehouse/stock-issues?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then((res) => {
          results.stockIssues = (res?.data?.content || []).map((e) => ({
            id: e.issueId,
            title: e.issueCode || 'Phiếu xuất',
            subtitle: `Người nhận: ${e.receiverName || ''} - Loại: ${e.issueType || ''}`,
            path: `/warehouse-stock-issues/${e.issueId}`,
          }));
        })
        .catch(() => {}),
    );

    promises.push(
      request(`/api/warehouse/return-entries?search=${encodeURIComponent(query)}&page=0&size=5`)
        .then((res) => {
          results.returnEntries = (res?.data?.content || []).map((e) => ({
            id: e.returnId,
            title: e.returnCode || 'Phiếu hoàn hàng',
            subtitle: `Người trả: ${e.staffName || ''} - Lý do: ${e.reason || ''}`,
            path: `/warehouse-return-entries/${e.returnId}`,
          }));
        })
        .catch(() => {}),
    );
  }

  await Promise.all(promises);
  return results;
};

/**
 * Universal search box: quick nav to functions + live lookup of customers,
 * tickets and warehouse documents. Shared by the desktop header (always
 * inline) and the mobile popover (mounted only while open).
 */
const UniversalSearch = ({ staffRoles = [], className = '', autoFocus = false, onNavigate }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const normalizedRoles = useMemo(() => staffRoles.map(normalizeRoleName), [staffRoles]);

  useEffect(() => {
    if (!autoFocus) return;
    containerRef.current?.querySelector('input')?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        containerRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await querySearch(searchQuery, staffRoles);
        setSearchResults(data);
      } catch (err) {
        console.error('Lỗi khi tìm kiếm universal:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, staffRoles]);

  const handleItemClick = (path) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(path);
    onNavigate?.();
  };

  const suggestedFunctions = useMemo(() => {
    return SEARCHABLE_FUNCTIONS.filter((item) => {
      return item.roles === 'ALL' || (Array.isArray(item.roles) && item.roles.some((r) => normalizedRoles.includes(normalizeRoleName(r))));
    }).slice(0, 4);
  }, [normalizedRoles]);

  const hasResults = useMemo(() => {
    return searchResults && Object.values(searchResults).some((arr) => Array.isArray(arr) && arr.length > 0);
  }, [searchResults]);

  return (
    <div
      className={`${className} ${isSearchFocused ? 'is-focused' : ''}`.trim()}
      ref={containerRef}
    >
      <div className="universal-search__wrapper">
        <Search size={16} className="universal-search__icon" />
        <input
          type="text"
          placeholder="Tìm kiếm mọi thứ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          className="universal-search__input"
        />
        {searchQuery ? (
          <button
            type="button"
            className="universal-search__clear"
            onClick={() => setSearchQuery('')}
            aria-label="Xóa từ khóa"
          >
            <X size={14} />
          </button>
        ) : (
          <span className="universal-search__shortcut">Ctrl K</span>
        )}
      </div>

      {isSearchFocused && (
        <div className="universal-search__dropdown">
          {isSearching ? (
            <div className="universal-search__loader">
              <Loader2 size={24} />
            </div>
          ) : searchQuery.trim() ? (
            !hasResults ? (
              <div className="universal-search__empty">
                <p>Không tìm thấy kết quả phù hợp cho "{searchQuery}"</p>
              </div>
            ) : (
              <>
                {searchResults.functions && searchResults.functions.length > 0 && (
                  <div className="universal-search__group">
                    <div className="universal-search__group-header">Chức năng</div>
                    {searchResults.functions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="universal-search__item"
                        onClick={() => handleItemClick(item.path)}
                      >
                        <span className="universal-search__item-icon"><Layers size={14} /></span>
                        <div className="universal-search__item-info">
                          <div className="universal-search__item-title">{item.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.customers && searchResults.customers.length > 0 && (
                  <div className="universal-search__group">
                    <div className="universal-search__group-header">Khách hàng</div>
                    {searchResults.customers.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="universal-search__item"
                        onClick={() => handleItemClick(item.path)}
                      >
                        <span className="universal-search__item-icon"><User size={14} /></span>
                        <div className="universal-search__item-info">
                          <div className="universal-search__item-title">{item.title}</div>
                          <div className="universal-search__item-subtitle">{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.tickets && searchResults.tickets.length > 0 && (
                  <div className="universal-search__group">
                    <div className="universal-search__group-header">Phiếu dịch vụ</div>
                    {searchResults.tickets.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="universal-search__item"
                        onClick={() => handleItemClick(item.path)}
                      >
                        <span className="universal-search__item-icon"><FileText size={14} /></span>
                        <div className="universal-search__item-info">
                          <div className="universal-search__item-title">{item.title}</div>
                          <div className="universal-search__item-subtitle">{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.stockEntries && searchResults.stockEntries.length > 0 && (
                  <div className="universal-search__group">
                    <div className="universal-search__group-header">Phiếu nhập kho</div>
                    {searchResults.stockEntries.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="universal-search__item"
                        onClick={() => handleItemClick(item.path)}
                      >
                        <span className="universal-search__item-icon"><Download size={14} /></span>
                        <div className="universal-search__item-info">
                          <div className="universal-search__item-title">{item.title}</div>
                          <div className="universal-search__item-subtitle">{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.stockIssues && searchResults.stockIssues.length > 0 && (
                  <div className="universal-search__group">
                    <div className="universal-search__group-header">Phiếu xuất kho</div>
                    {searchResults.stockIssues.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="universal-search__item"
                        onClick={() => handleItemClick(item.path)}
                      >
                        <span className="universal-search__item-icon"><Upload size={14} /></span>
                        <div className="universal-search__item-info">
                          <div className="universal-search__item-title">{item.title}</div>
                          <div className="universal-search__item-subtitle">{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.returnEntries && searchResults.returnEntries.length > 0 && (
                  <div className="universal-search__group">
                    <div className="universal-search__group-header">Phiếu hoàn hàng</div>
                    {searchResults.returnEntries.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="universal-search__item"
                        onClick={() => handleItemClick(item.path)}
                      >
                        <span className="universal-search__item-icon"><Undo size={14} /></span>
                        <div className="universal-search__item-info">
                          <div className="universal-search__item-title">{item.title}</div>
                          <div className="universal-search__item-subtitle">{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )
          ) : (
            <div className="universal-search__suggestions">
              <div className="universal-search__group-header">Gợi ý chức năng</div>
              {suggestedFunctions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="universal-search__item"
                  onClick={() => handleItemClick(item.path)}
                >
                  <span className="universal-search__item-icon"><Layers size={14} /></span>
                  <div className="universal-search__item-info">
                    <div className="universal-search__item-title">{item.label}</div>
                  </div>
                </button>
              ))}
              <div className="universal-search__tip">
                Mẹo: Nhấn <kbd>Ctrl + K</kbd> để tìm nhanh từ bất kỳ đâu.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversalSearch;
