import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollToTop } from '../../../hooks/useScrollToTop.js';
import { toast } from 'react-toastify';
import styles from './CustomerManager.module.css';

const CustomerManager = () => {
  useScrollToTop();
  const navigate = useNavigate();

  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'MALE',
    dateOfBirth: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    customerType: 'REGULAR'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Mock data
  const mockCustomers = [
    { id: 1, fullName: 'Nguyen Van A', phone: '0912345678', email: 'nguyenvana@email.com', gender: 'MALE', dateOfBirth: '1990-01-15', status: 'ACTIVE', customerType: 'VIP', createdAt: '2024-01-01', totalBookings: 15 },
    { id: 2, fullName: 'Tran Thi B', phone: '0923456789', email: 'tranthib@email.com', gender: 'FEMALE', dateOfBirth: '1992-03-20', status: 'ACTIVE', customerType: 'REGULAR', createdAt: '2024-01-05', totalBookings: 8 },
    { id: 3, fullName: 'Le Van C', phone: '0934567890', email: 'levanc@email.com', gender: 'MALE', dateOfBirth: '1985-07-10', status: 'ACTIVE', customerType: 'PREMIUM', createdAt: '2024-01-10', totalBookings: 25 },
    { id: 4, fullName: 'Pham Thi D', phone: '0945678901', email: 'phamthid@email.com', gender: 'FEMALE', dateOfBirth: '1995-11-25', status: 'INACTIVE', customerType: 'REGULAR', createdAt: '2024-01-15', totalBookings: 3 },
    { id: 5, fullName: 'Hoang Van E', phone: '0956789012', email: 'hoangvane@email.com', gender: 'MALE', dateOfBirth: '1988-09-08', status: 'ACTIVE', customerType: 'VIP', createdAt: '2024-01-20', totalBookings: 18 },
    { id: 6, fullName: 'Nguyen Thi F', phone: '0967890123', email: 'nguyenthif@email.com', gender: 'FEMALE', dateOfBirth: '1993-05-12', status: 'ACTIVE', customerType: 'REGULAR', createdAt: '2024-01-25', totalBookings: 6 },
    { id: 7, fullName: 'Vo Van G', phone: '0978901234', email: 'vovang@email.com', gender: 'MALE', dateOfBirth: '1991-12-30', status: 'ACTIVE', customerType: 'VIP', createdAt: '2024-02-01', totalBookings: 12 },
    { id: 8, fullName: 'Tran Van H', phone: '0989012345', email: 'tranvanh@email.com', gender: 'MALE', dateOfBirth: '1987-08-18', status: 'INACTIVE', customerType: 'REGULAR', createdAt: '2024-02-05', totalBookings: 2 },
    { id: 9, fullName: 'Le Thi I', phone: '0990123456', email: 'lethii@email.com', gender: 'FEMALE', dateOfBirth: '1994-04-22', status: 'ACTIVE', customerType: 'PREMIUM', createdAt: '2024-02-10', totalBookings: 20 },
    { id: 10, fullName: 'Phan Van K', phone: '0901234567', email: 'phanvank@email.com', gender: 'MALE', dateOfBirth: '1989-06-15', status: 'ACTIVE', customerType: 'REGULAR', createdAt: '2024-02-15', totalBookings: 9 },
    { id: 11, fullName: 'Nguyen Van L', phone: '0912345670', email: 'nguyenvanl@email.com', gender: 'MALE', dateOfBirth: '1992-10-05', status: 'ACTIVE', customerType: 'VIP', createdAt: '2024-02-20', totalBookings: 14 },
    { id: 12, fullName: 'Tran Thi M', phone: '0923456780', email: 'tranm@email.com', gender: 'FEMALE', dateOfBirth: '1996-02-28', status: 'ACTIVE', customerType: 'REGULAR', createdAt: '2024-02-25', totalBookings: 5 },
  ];

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredData = [...mockCustomers];

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredData = filteredData.filter(c =>
          c.fullName.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          c.email.toLowerCase().includes(search)
        );
      }

      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(c => c.status === statusFilter);
      }

      if (typeFilter !== 'all') {
        filteredData = filteredData.filter(c => c.customerType === typeFilter);
      }

      filteredData.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        if (sortBy === 'createdAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setTotalItems(filteredData.length);

      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

      setCustomers(paginatedData);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Khong tai du lieu khach hang');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui long nhap ho ten';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui long nhap so dien thoai';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'So dien thoai khong hop le';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui long nhap email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email khong hop le';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Vui long chon ngay sinh';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Them khach hang thanh cong!');
      setShowModal(false);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        gender: 'MALE',
        dateOfBirth: '',
        address: '',
        city: '',
        district: '',
        ward: '',
        customerType: 'REGULAR'
      });
      loadCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Them khach hang that bai');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return styles.statusActive;
      case 'INACTIVE': return styles.statusInactive;
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Hoat dong';
      case 'INACTIVE': return 'Khong hoat dong';
      default: return status;
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const renderSortIcon = (column) => {
    if (sortBy !== column) return <span className={styles.sortIcon}>↕</span>;
    return <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quan ly khach hang</h1>
        <button className={styles.addButton} onClick={() => setShowModal(true)}>
          <span>+</span> Them khach hang moi
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Tim kiem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tat ca trang thai</option>
            <option value="ACTIVE">Hoat dong</option>
            <option value="INACTIVE">Khong hoat dong</option>
          </select>

          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tat ca loai</option>
            <option value="VIP">VIP</option>
            <option value="PREMIUM">Premium</option>
            <option value="REGULAR">Thuong</option>
          </select>

          <select
            className={styles.sortSelect}
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order);
            }}
          >
            <option value="createdAt-desc">Moi nhat</option>
            <option value="createdAt-asc">Cu nhat</option>
            <option value="fullName-asc">Ten A-Z</option>
            <option value="fullName-desc">Ten Z-A</option>
            <option value="totalBookings-desc">Nhieu booking</option>
            <option value="totalBookings-asc">It booking</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Dang tai du lieu...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <p>Khong co khach hang nao</p>
        </div>
      ) : (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.sortable} onClick={() => handleSort('fullName')}>
                    Khach hang {renderSortIcon('fullName')}
                  </th>
                  <th>So dien thoai</th>
                  <th className={styles.sortable} onClick={() => handleSort('status')}>
                    Trang thai {renderSortIcon('status')}
                  </th>
                  <th className={styles.sortable} onClick={() => handleSort('totalBookings')}>
                    Booking {renderSortIcon('totalBookings')}
                  </th>
                  <th>Hanh dong</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div className={styles.customerInfo}>
                        <div className={styles.avatar}>{getInitials(customer.fullName)}</div>
                        <div className={styles.customerDetails}>
                          <span className={styles.customerName}>{customer.fullName}</span>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(customer.status)}`}>
                        {getStatusText(customer.status)}
                      </span>
                    </td>
                    <td>{customer.totalBookings}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => navigate(`/customer-profile/${customer.id}`)}
                        >
                          Xem
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => navigate(`/customer-profile/${customer.id}`)}
                        >
                          Sua
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Hien thi {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} cua {totalItems} khach hang
            </div>
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Truoc
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Them khach hang moi</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>X</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Ho ten <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                    placeholder="Nhap ho ten"
                  />
                  {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    So dien thoai <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    placeholder="0912345678"
                  />
                  {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Gioi tinh</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={styles.select}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nu</option>
                    <option value="OTHER">Khac</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Ngay sinh <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.dateOfBirth ? styles.inputError : ''}`}
                  />
                  {errors.dateOfBirth && <span className={styles.errorText}>{errors.dateOfBirth}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Loai khach hang</label>
                  <select
                    name="customerType"
                    value={formData.customerType}
                    onChange={handleInputChange}
                    className={styles.select}
                  >
                    <option value="REGULAR">Thuong</option>
                    <option value="VIP">VIP</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Dia chi</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="So nha, ten duong"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Thanh pho</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Ha Noi"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Quan/Huyen</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Son Tay"
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Huy
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? 'Dang luu...' : 'Luu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
