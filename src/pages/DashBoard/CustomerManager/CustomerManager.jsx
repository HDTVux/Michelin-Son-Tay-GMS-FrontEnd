import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { toast } from 'react-toastify';
import { deleteCustomerAccount, fetchAllCustomers, fetchCustomerDetail, lockCustomerAccount, updateCustomer } from '../../../services/adminService.js';
import styles from './CustomerManager.module.css';
import { Phone, Mail, Search, User, Plus, RefreshCw, Lock, Trash2, Eye, Car, Edit, Upload } from 'lucide-react';

import CreateCustomerModal from './CreateCustomerModal.jsx';
import EditCustomerModal from './EditCustomerModal.jsx';
import RankBadge from '../../../components/RankBadge/RankBadge.jsx';
import { formatPartnerAddress } from './partnerForm.js';

// Force Vite HMR reload
const hasAnyValue = (customer, fields) => fields.some((field) => {
  const value = customer?.[field];
  return value !== null && value !== undefined && String(value).trim() !== '';
});

const LEGAL_FIELDS = [
  'representativeName',
  'repIdentityCard',
  'position',
  'contractNumber',
  'contractDate',
  'bankAccountInfo',
  'latitude',
  'longitude',
];

const CONTACT_FIELDS = ['contactName', 'contactPhone', 'contactEmail', 'contactAddress'];

const isCompanyValue = (item) => {
  if (!item) return false;
  if (item.isCompany === true || item.isCompany === 1 || item.isCompany === 'true' || item.isCompany === '1') return true;
  if (item.is_company === true || item.is_company === 1 || item.is_company === 'true' || item.is_company === '1') return true;
  if (item.companyName && String(item.companyName).trim() !== '') return true;
  if (item.company_name && String(item.company_name).trim() !== '') return true;
  return false;
};

const displayValue = (value, fallback = 'Chưa cập nhật') => {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  return String(value);
};

const normalizeCustomerStatus = (value) => {
  if (value == null || String(value).trim() === '') return null;
  return String(value).trim().toUpperCase();
};

const resolveCustomerStatus = (customer) =>
  customer?.status ??
  customer?.authStatus ??
  customer?.customerAuthStatus ??
  customer?.accountStatus ??
  customer?.userStatus ??
  customer?.customerAuth?.status;

const getCustomerTypeText = (customerType) => {
  switch (customerType) {
    case 'DEALER':
      return 'Đại lý';
    case 'GARAGE':
      return 'Garage khác';
    case 'INDIVIDUAL':
      return 'Khách lẻ';
    default:
      return 'Khách lẻ';
  }
};

const getInitials = (name) => {
  if (!name) return 'KH';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
};

const getAvatarColor = (name) => {
  const gradients = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
    'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Green
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Orange/Amber
    'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)', // Purple
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'  // Cyan
  ];
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const CustomerManager = () => {
  useScrollToTop();
  const navigate = useNavigate();

  const getAuthToken = () =>
    localStorage.getItem('authToken') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('staffToken');

  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);

  const requestSeqRef = useRef(0);

  const handleUpdatedCustomer = async (updatedData) => {
    // Cập nhật tạm từ payload trả về
    const normalized = {
      ...updatedData,
      isCompany: isCompanyValue(updatedData),
      companyName: updatedData.companyName || updatedData.company_name || ''
    };
    setSelectedCustomer(normalized);
    setCustomers((prev) =>
      prev.map((c) => {
        const id = c.customerId || c.id;
        const targetId = updatedData.customerId || updatedData.id;
        if (id === targetId) return { ...c, ...normalized };
        return c;
      })
    );
    // Fetch lại dữ liệu mới nhất từ server để đảm bảo đúng (bao gồm isCompany, companyName)
    try {
      const token = getAuthToken();
      const id = updatedData.customerId || updatedData.id;
      if (token && id) {
        const res = await fetchCustomerDetail(id, token);
        if (res?.success && res?.data) {
          const detail = res.data;
          const fresh = {
            ...detail,
            isCompany: isCompanyValue(detail),
            companyName: detail.companyName || detail.company_name || ''
          };
          setSelectedCustomer(fresh);
          setCustomers((prev) =>
            prev.map((c) => {
              const cid = c.customerId || c.id;
              if (cid === id) return { ...c, ...fresh };
              return c;
            })
          );
        }
      }
    } catch (err) {
      console.error('Error re-fetching customer detail after update:', err);
    }
  };

  // Load customers from API (all at once)
  const loadCustomers = useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để xem danh sách khách hàng');
        return;
      }

      const params = {
        page: 0,
        size: 10000, // Load all customers at once to disable pagination
        search: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      };

      const response = await fetchAllCustomers(params, token);

      // If a newer request has started, ignore this response
      if (requestSeq !== requestSeqRef.current) return;
      
      if (response?.success && response?.data) {
        const { content } = response.data;
        const normalized = (content || []).map((item) => ({
          ...item,
          isCompany: isCompanyValue(item),
          companyName: item.companyName || item.company_name || ''
        }));
        setCustomers(normalized);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error(error.message || 'Không tải được dữ liệu khách hàng');
      setCustomers([]);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Handle selected customer details persistence or fallback
  useEffect(() => {
    if (customers && customers.length > 0) {
      if (!selectedCustomer) {
        // Default select first on desktop
        const isMobile = window.innerWidth <= 900;
        if (!isMobile) {
          handleSelectCustomer(customers[0]);
        }
      }
      // Không overwrite selectedCustomer từ danh sách — vì dữ liệu detail (isCompany, companyName)
      // đã được fetch riêng qua fetchCustomerDetail và sẽ đầy đủ hơn dữ liệu danh sách.
    } else {
      setSelectedCustomer(null);
    }
  }, [customers]);

  const handleSelectCustomer = async (cust) => {
    if (!cust) {
      setSelectedCustomer(null);
      return;
    }
    const safeCust = {
      ...cust,
      isCompany: isCompanyValue(cust),
      companyName: cust.companyName || cust.company_name || ''
    };
    setSelectedCustomer(safeCust);
    try {
      const token = getAuthToken();
      const id = cust.customerId || cust.id;
      if (token && id) {
        const res = await fetchCustomerDetail(id, token);
        if (res?.success && res?.data) {
          const detail = res.data;
          setSelectedCustomer({
            ...detail,
            isCompany: isCompanyValue(detail),
            companyName: detail.companyName || detail.company_name || ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching detail on select:', err);
    }
  };

  const handleCreatedCustomer = () => {
    loadCustomers();
    if (selectedCustomer) {
      handleSelectCustomer(selectedCustomer);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return styles.statusActive;
      case 'INACTIVE':
        return styles.statusInactive;
      case 'LOCKED':
        return styles.statusInactive;
      case 'DELETED':
        return styles.statusInactive;
      case null:
        return styles.statusVip;
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Hoạt động';
      case 'INACTIVE':
        return 'Không hoạt động';
      case 'LOCKED':
        return 'Đã khóa';
      case 'DELETED':
        return 'Đã xóa';
      case null:
        return 'Chưa kích hoạt';
      default:
        return status;
    }
  };

  const handleLockAccount = async (customerId) => {
    if (!globalThis.confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) return;
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Vui lòng đăng nhập để thực hiện thao tác');
        return;
      }

      const response = await lockCustomerAccount(customerId, token);

      if (response?.success && response?.data) {
        const updated = response.data;
        setCustomers((prevCustomers) =>
          (prevCustomers || []).map((customer) => {
            const id = customer?.customerId ?? customer?.id;
            if (id !== customerId) return customer;
            return { ...customer, ...updated };
          })
        );
      }

      toast.success('Khóa tài khoản thành công!');
      loadCustomers();
    } catch (error) {
      console.error('Error locking account:', error);
      toast.error(error.message || 'Khóa tài khoản thất bại');
      loadCustomers();
    }
  };

  const handleDeleteAccount = async (customerId) => {
    if (!globalThis.confirm('Bạn có chắc chắn muốn xóa tài khoản này? Hành động này không thể hoàn tác!')) return;
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Vui lòng đăng nhập để thực hiện thao tác');
        return;
      }

      const response = await deleteCustomerAccount(customerId, token);

      // Remove from UI immediately (soft-delete should not be displayed).
      setCustomers((prevCustomers) =>
        (prevCustomers || []).filter((customer) => {
          const id = customer?.customerId ?? customer?.id;
          return id !== customerId;
        })
      );

      if (response?.success && response?.data) {
        // Nothing else needed; list will be refreshed below.
      }

      toast.success('Xóa tài khoản thành công!');
      loadCustomers();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Xóa tài khoản thất bại');
      loadCustomers();
    }
  };

  const openCreateModal = () => {
    setModalInitialData(null);
    setShowModal(true);
  };

  const closeCreateModal = () => {
    setShowModal(false);
    setModalInitialData(null);
  };

  const handleCreateAccountForGuest = () => {
    if (!selectedCustomer) return;
    setModalInitialData({
      ...selectedCustomer,
      fullName: selectedCustomer.fullName || '',
      email: selectedCustomer.email || '',
      phone: selectedCustomer.phone || '',
      gender: selectedCustomer.gender || '',
      dob: selectedCustomer.dob || ''
    });
    setShowModal(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Danh bạ đối tác</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.excelButton} onClick={() => navigate('/customer-excel-import')} title="Nhập đối tác từ Excel">
            <Upload size={16} /> <span className={styles.addButtonText}>Nhập Excel</span>
          </button>
          <button className={styles.addButton} onClick={openCreateModal} title="Thêm đối tác mới">
            <Plus size={16} /> <span className={styles.addButtonText}>Thêm đối tác mới</span>
          </button>
        </div>
      </div>

      <div className={`${styles.directoryLayout} ${selectedCustomer ? styles.hasSelection : ''}`}>
        {/* Left column: Contact list */}
        <div className={styles.leftPane}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} size={16} />
              <input
                type="text"
                placeholder="Tìm tên, mã KH, MST, SĐT, biển số xe..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              />
            </div>
            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
                <option value="LOCKED">Bị khóa</option>
                <option value="DELETED">Đã xóa</option>
              </select>
              <button
                className={styles.refreshButton}
                onClick={() => loadCustomers()}
                title="Làm mới"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Không có khách hàng nào</p>
            </div>
          ) : (
            <div className={styles.contactsList}>
              {customers
                .map((customer) => {
                  const isSelected =
                    selectedCustomer &&
                    (customer.customerId || customer.id) === (selectedCustomer.customerId || selectedCustomer.id);

                  return (
                    <div
                      key={customer.customerId || customer.id}
                      className={`${styles.contactItem} ${isSelected ? styles.contactItemActive : ''}`}
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div
                        className={styles.contactAvatar}
                        style={{ background: getAvatarColor(customer.fullName) }}
                      >
                        {getInitials(customer.fullName)}
                      </div>
                      <div className={styles.contactInfo}>
                        <span className={styles.contactNameRow}>
                          <span className={styles.contactName}>{customer.fullName}</span>
                          <span className={`${styles.customerTypeTag} ${customer.customerType === 'DEALER' ? styles.customerTypeTagDealer : ''}`}>
                            {getCustomerTypeText(customer.customerType)}
                          </span>
                          {customer.isDealer && (
                            <span className={`${styles.customerTypeTag} ${styles.customerTypeTagDealerAccount}`} title="Có quyền truy cập giao diện Đại lý">
                              TK Đại lý
                            </span>
                          )}
                          {isCompanyValue(customer) && (
                            <span className={`${styles.customerTypeTag} ${styles.customerTypeTagCompany}`} title="Khách hàng công ty">
                              Công ty
                            </span>
                          )}
                        </span>
                        <span className={styles.contactPhone}>{customer.phone}</span>
                      </div>
                      <div className={styles.quickActions}>
                        <a
                          href={`tel:${customer.phone}`}
                          className={styles.quickCallBtn}
                          title="Gọi điện"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={13} />
                        </a>
                        {customer.email && (
                          <a
                            href={`mailto:${customer.email}`}
                            className={styles.quickMailBtn}
                            title="Gửi email"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right column: Customer details */}
        <div className={styles.rightPane}>
          {selectedCustomer ? (
            <div className={styles.detailCard}>
              <button className={styles.backBtn} onClick={() => setSelectedCustomer(null)}>
                &larr; Danh bạ
              </button>

              <div className={styles.detailHeader}>
                <div
                  className={styles.detailAvatar}
                  style={{ background: getAvatarColor(selectedCustomer.fullName) }}
                >
                  {getInitials(selectedCustomer.fullName)}
                </div>
                <div className={styles.detailMeta}>
                  <h2 className={styles.detailName}>{selectedCustomer.fullName}</h2>
                  <div className={styles.detailBadges}>
                    <span
                      className={`${styles.statusBadge} ${getStatusBadgeClass(
                        normalizeCustomerStatus(resolveCustomerStatus(selectedCustomer))
                      )}`}
                    >
                      {getStatusText(normalizeCustomerStatus(resolveCustomerStatus(selectedCustomer)))}
                    </span>
                    {selectedCustomer.isGuest && (
                      <span className={`${styles.statusBadge} ${styles.statusVip}`}>Guest</span>
                    )}
                    <span className={`${styles.customerTypeTag} ${selectedCustomer.customerType === 'DEALER' ? styles.customerTypeTagDealer : ''}`}>
                      {getCustomerTypeText(selectedCustomer.customerType)}
                    </span>
                    {selectedCustomer.isDealer && (
                      <span className={`${styles.customerTypeTag} ${styles.customerTypeTagDealerAccount}`} title="Có quyền truy cập giao diện Đại lý">
                        TK Đại lý
                      </span>
                    )}
                    {isCompanyValue(selectedCustomer) && (
                      <span className={`${styles.customerTypeTag} ${styles.customerTypeTagCompany}`} title="Khách hàng công ty">
                        Công ty
                      </span>
                    )}
                    <RankBadge rank={selectedCustomer.currentRank || 'BRONZE'} size="sm" />
                  </div>
                </div>
              </div>

              {/* Call and Mail Buttons */}
              <div className={styles.detailActions}>
                <a href={`tel:${selectedCustomer.phone}`} className={`${styles.detailActionBtn} ${styles.btnCall}`}>
                  <Phone size={16} /> Gọi điện
                </a>
                {selectedCustomer.email ? (
                  <a href={`mailto:${selectedCustomer.email}`} className={`${styles.detailActionBtn} ${styles.btnMail}`}>
                    <Mail size={16} /> Gửi Email
                  </a>
                ) : (
                  <button className={`${styles.detailActionBtn} ${styles.btnMail}`} disabled title="Chưa có Email">
                    <Mail size={16} /> Chưa có Email
                  </button>
                )}
              </div>

              {/* Info Grid */}
              <div className={styles.detailSectionTitle}>Thông tin chung</div>
              <div className={styles.detailGrid}>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Mã khách hàng</span>
                  <span className={styles.detailValue}>{displayValue(selectedCustomer.customerCode)}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Mã số thuế</span>
                  <span className={styles.detailValue}>{displayValue(selectedCustomer.taxCode)}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Số điện thoại</span>
                  <span className={styles.detailValue}>{selectedCustomer.phone}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>{selectedCustomer.email || 'Chưa cung cấp'}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Địa chỉ</span>
                  <span className={styles.detailValue}>
                    {displayValue(formatPartnerAddress(selectedCustomer))}
                  </span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Số CMND / CCCD</span>
                  <span className={styles.detailValue}>{displayValue(selectedCustomer.identityCard)}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Ngày cấp</span>
                  <span className={styles.detailValue}>{displayValue(selectedCustomer.idIssueDate)}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Nơi cấp</span>
                  <span className={styles.detailValue}>{displayValue(selectedCustomer.idIssuePlace)}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Giới tính</span>
                  <span className={styles.detailValue}>
                    {selectedCustomer.gender === 'MALE'
                      ? 'Nam'
                      : selectedCustomer.gender === 'FEMALE'
                      ? 'Nữ'
                      : selectedCustomer.gender === 'OTHER'
                      ? 'Khác'
                      : 'Chưa cập nhật'}
                  </span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Ngày sinh</span>
                  <span className={styles.detailValue}>{selectedCustomer.dob || 'Chưa cập nhật'}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Loại khách hàng</span>
                  <span className={styles.detailValue}>{getCustomerTypeText(selectedCustomer.customerType)}</span>
                </div>
                {isCompanyValue(selectedCustomer) && (
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}>Tên công ty</span>
                    <span className={styles.detailValue}>{displayValue(selectedCustomer.companyName || selectedCustomer.company_name, 'Chưa cập nhật')}</span>
                  </div>
                )}
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Nhóm khách hàng</span>
                  <span className={styles.detailValue}>
                    {displayValue(selectedCustomer.customerGroupName, 'Chưa phân nhóm')}
                  </span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Số lần đặt lịch</span>
                  <span className={styles.detailValue}>{selectedCustomer.totalBookings || 0} lần</span>
                </div>
              </div>

              {selectedCustomer.note && <div className={styles.detailNote}>{selectedCustomer.note}</div>}

              {hasAnyValue(selectedCustomer, LEGAL_FIELDS) && (
                <>
                  <div className={styles.detailSectionTitle}>Pháp nhân</div>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Người đại diện</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.representativeName)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Số CMND người đại diện</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.repIdentityCard)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Chức vụ</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.position)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Số hợp đồng</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.contractNumber)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Ngày ký hợp đồng</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.contractDate)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Ngân hàng</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.bankAccountInfo)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Toạ độ</span>
                      <span className={styles.detailValue}>
                        {selectedCustomer.latitude && selectedCustomer.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${selectedCustomer.latitude},${selectedCustomer.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {selectedCustomer.latitude}, {selectedCustomer.longitude}
                          </a>
                        ) : (
                          'Chưa cập nhật'
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {hasAnyValue(selectedCustomer, CONTACT_FIELDS) && (
                <>
                  <div className={styles.detailSectionTitle}>Liên hệ khác</div>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Người liên hệ</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.contactName)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Điện thoại liên hệ</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.contactPhone)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Email liên hệ</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.contactEmail)}</span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Địa chỉ liên hệ</span>
                      <span className={styles.detailValue}>{displayValue(selectedCustomer.contactAddress)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Ranking Section */}
              {(selectedCustomer.currentRank || selectedCustomer.totalPoints >= 0) && (
                <>
                  <div className={styles.detailSectionTitle}>Hạng thành viên</div>
                  <div className={styles.rankingInfoGrid}>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Hạng hiện tại</span>
                      <span className={styles.detailValue}>
                        <RankBadge rank={selectedCustomer.currentRank || 'BRONZE'} size="sm" />
                      </span>
                    </div>
                    <div className={styles.detailField}>
                      <span className={styles.detailLabel}>Điểm tích lũy (năm nay)</span>
                      <span className={styles.detailValue} style={{ color: '#2563eb', fontWeight: 700 }}>
                        {(selectedCustomer.totalPoints || 0).toLocaleString()} điểm
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Actions Section */}
              <div className={styles.detailSectionTitle}>Thao tác quản trị</div>
              <div className={styles.managementButtons}>
                {(() => {
                  const status = normalizeCustomerStatus(resolveCustomerStatus(selectedCustomer));
                  const isGuestCustomer = status === null || status === undefined;

                  if (isGuestCustomer) {
                    return (
                      <button
                        className={`${styles.mgmtBtn} ${styles.mgmtActivateBtn}`}
                        onClick={handleCreateAccountForGuest}
                        title="Tạo tài khoản chính thức cho khách vãng lai"
                      >
                        <Plus size={14} /> Tạo tài khoản
                      </button>
                    );
                  }

                  return (
                    <button
                      className={`${styles.mgmtBtn} ${styles.mgmtEditBtn}`}
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit size={14} /> Chỉnh sửa hồ sơ
                    </button>
                  );
                })()}
                <button
                  className={`${styles.mgmtBtn} ${styles.mgmtViewBtn}`}
                  onClick={() => navigate(`/customer-profile/${selectedCustomer.customerId || selectedCustomer.id}`)}
                >
                  <Eye size={14} /> Chi tiết lịch sử
                </button>
                <button
                  className={`${styles.mgmtBtn} ${styles.mgmtVehicleBtn}`}
                  onClick={() =>
                    navigate(
                      `/vehicle-management?customerId=${encodeURIComponent(
                        selectedCustomer.customerId || selectedCustomer.id
                      )}&customerName=${encodeURIComponent(selectedCustomer.fullName || '')}`
                    )
                  }
                >
                  <Car size={14} /> Danh sách xe
                </button>

                {(() => {
                  const status = normalizeCustomerStatus(resolveCustomerStatus(selectedCustomer));
                  const canManage = status !== null && status !== 'DELETED';
                  if (!canManage) return null;

                  return (
                    <>
                      {status !== 'LOCKED' && (
                        <button
                          className={`${styles.mgmtBtn} ${styles.mgmtLockBtn}`}
                          onClick={() => handleLockAccount(selectedCustomer.customerId || selectedCustomer.id)}
                        >
                          <Lock size={14} /> Khóa tài khoản
                        </button>
                      )}
                      <button
                        className={`${styles.mgmtBtn} ${styles.mgmtDeleteBtn}`}
                        onClick={() => handleDeleteAccount(selectedCustomer.customerId || selectedCustomer.id)}
                      >
                        <Trash2 size={14} /> Xóa khách hàng
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className={styles.emptyStateDetails}>
              <User size={48} className={styles.emptyIcon} />
              <h3>Chưa chọn khách hàng</h3>
              <p>Chọn một khách hàng từ danh sách bên trái để xem thông tin chi tiết.</p>
            </div>
          )}
        </div>
      </div>

      <CreateCustomerModal
        open={showModal}
        onClose={closeCreateModal}
        onCreated={handleCreatedCustomer}
        initialData={modalInitialData}
      />

      <EditCustomerModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        customer={selectedCustomer}
        onUpdated={handleUpdatedCustomer}
      />
    </div>
  );
};

export default CustomerManager;

