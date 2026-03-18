import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { toast } from 'react-toastify';
import { deleteCustomerAccount, fetchAllCustomers, lockCustomerAccount } from '../../../services/adminService.js';
import styles from './CustomerManager.module.css';

import CreateCustomerModal from './CreateCustomerModal.jsx';

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

  const requestSeqRef = useRef(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  // Load customers from API
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
        page: currentPage - 1, // Backend uses 0-based index
        size: itemsPerPage,
        search: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      };

      const response = await fetchAllCustomers(params, token);

      // If a newer request has started, ignore this response
      if (requestSeq !== requestSeqRef.current) return;
      
      if (response?.success && response?.data) {
        const { content, totalElements } = response.data;

        // Hide soft-deleted customers from UI.
        const visibleContent = (content || []).filter((customer) => {
          const status = normalizeCustomerStatus(resolveCustomerStatus(customer));
          return status !== 'DELETED';
        });

        // If requesting an out-of-range page, Spring may return empty content but still have totalElements.
        // Auto-step back so pagination remains usable.
        if ((visibleContent?.length || 0) === 0 && (totalElements || 0) > 0 && currentPage > 1) {
          setCurrentPage((prev) => Math.max(1, prev - 1));
          return;
        }

        setCustomers(visibleContent);
        setTotalItems(totalElements || 0);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error(error.message || 'Không tải được dữ liệu khách hàng');
      setCustomers([]);
      setTotalItems(0);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [searchTerm, currentPage, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreatedCustomer = () => {
    if (currentPage === 1) {
      loadCustomers();
      return;
    }
    setCurrentPage(1);
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

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const openCreateModal = () => {
    setShowModal(true);
  };

  const closeCreateModal = () => {
    setShowModal(false);
  };

  let mainContent = null;
  if (loading) {
    mainContent = (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  } else if (customers.length === 0) {
    mainContent = (
      <div className={styles.emptyState}>
        <p>Khong co khach hang nao</p>
      </div>
    );
  } else {
    mainContent = (
      <>
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Khách hàng</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Booking</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {customers
                .filter((customer) => {
                  const status = normalizeCustomerStatus(resolveCustomerStatus(customer));
                  return status !== 'DELETED';
                })
                .map((customer, index) => {
                  const status = normalizeCustomerStatus(resolveCustomerStatus(customer));
                  const canManage = status !== null && status !== 'DELETED';

                  return (
                <tr key={customer.customerId || customer.id}>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>
                    <span className={styles.customerName}>{customer.fullName}</span>
                  </td>
                  <td>{customer.phone}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </td>
                  <td>{customer.totalBookings || 0}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={`${styles.actionBtn} ${styles.viewBtn}`}
                        onClick={() => navigate(`/customer-profile/${customer.customerId || customer.id}`)}
                        title="Xem chi tiết"
                      >
                        Xem
                      </button>
                      {canManage && (
                        <>
                          {status !== 'LOCKED' && (
                            <button
                              className={`${styles.actionBtn} ${styles.lockBtn}`}
                              onClick={() => handleLockAccount(customer.customerId || customer.id)}
                              title="Khóa tài khoản"
                            >
                              Khóa
                            </button>
                          )}
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDeleteAccount(customer.customerId || customer.id)}
                            title="Xóa tài khoản"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} của {totalItems} khách hàng
          </div>
          <div className={styles.paginationButtons}>
            <button
              className={styles.pageBtn}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý khách hàng</h1>
        <button className={styles.addButton} onClick={openCreateModal}>
          <span>+</span> Thêm khách hàng mới
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className={styles.filters}>
          <select 
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Không hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>


          <button 
            className={styles.refreshButton}
            onClick={() => loadCustomers()}
            title="Làm mới"
          >
            Làm mới
          </button>
        </div>
      </div>

      {mainContent}

      <CreateCustomerModal
        open={showModal}
        onClose={closeCreateModal}
        onCreated={handleCreatedCustomer}
      />
    </div>
  );
};

export default CustomerManager;
