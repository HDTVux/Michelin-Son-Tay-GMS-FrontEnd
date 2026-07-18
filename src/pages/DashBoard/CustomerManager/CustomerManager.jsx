import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { toast } from 'react-toastify';
import { deleteCustomerAccount, fetchAllCustomers, lockCustomerAccount, updateCustomer } from '../../../services/adminService.js';
import styles from './CustomerManager.module.css';
import { Phone, Mail, Search, User, Plus, RefreshCw, Lock, Trash2, Eye, Car, Edit, Upload } from 'lucide-react';

import CreateCustomerModal from './CreateCustomerModal.jsx';
import EditCustomerModal from './EditCustomerModal.jsx';
import RankBadge from '../../../components/RankBadge/RankBadge.jsx';

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

  const handleUpdatedCustomer = (updatedData) => {
    setSelectedCustomer(updatedData);
    setCustomers((prev) =>
      prev.map((c) => {
        const id = c.customerId || c.id;
        const targetId = updatedData.customerId || updatedData.id;
        if (id === targetId) return { ...c, ...updatedData };
        return c;
      })
    );
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
        setCustomers(content || []);
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
        // Default select first on desktop, but keep null on mobile for contact list view
        const isMobile = window.innerWidth <= 900;
        if (!isMobile) {
          setSelectedCustomer(customers[0]);
        }
      } else {
        const updated = customers.find(
          (c) => (c.customerId || c.id) === (selectedCustomer.customerId || selectedCustomer.id)
        );
        if (updated) {
          setSelectedCustomer(updated);
        } else {
          const isMobile = window.innerWidth <= 900;
          if (!isMobile) {
            setSelectedCustomer(customers[0]);
          } else {
            setSelectedCustomer(null);
          }
        }
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [customers]);

  const handleCreatedCustomer = () => {
    loadCustomers();
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
        <h1 className={styles.title}>Danh bạ khách hàng</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.excelButton} onClick={() => navigate('/customer-excel-import')} title="Nhập khách hàng từ Excel">
            <Upload size={16} /> <span className={styles.addButtonText}>Nhập Excel</span>
          </button>
          <button className={styles.addButton} onClick={openCreateModal} title="Thêm khách hàng mới">
            <Plus size={16} /> <span className={styles.addButtonText}>Thêm khách hàng mới</span>
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
                placeholder="Tìm tên, SĐT..."
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
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div
                        className={styles.contactAvatar}
                        style={{ background: getAvatarColor(customer.fullName) }}
                      >
                        {getInitials(customer.fullName)}
                      </div>
                      <div className={styles.contactInfo}>
                        <span className={styles.contactName}>{customer.fullName}</span>
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
              <div className={styles.detailSectionTitle}>Thông tin liên hệ</div>
              <div className={styles.detailGrid}>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Số điện thoại</span>
                  <span className={styles.detailValue}>{selectedCustomer.phone}</span>
                </div>
                <div className={styles.detailField}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>{selectedCustomer.email || 'Chưa cung cấp'}</span>
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
                  <span className={styles.detailLabel}>Số lần đặt lịch</span>
                  <span className={styles.detailValue}>{selectedCustomer.totalBookings || 0} lần</span>
                </div>
              </div>

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

