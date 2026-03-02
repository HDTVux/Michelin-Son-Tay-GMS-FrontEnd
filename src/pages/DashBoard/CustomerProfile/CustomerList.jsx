import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CustomerList.module.css';

const CustomerList = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // TODO: Call API to fetch customers
      // const token = localStorage.getItem('staffToken');
      // const response = await fetchCustomers(token);
      
      // Mock data
      const mockData = [
        {
          customerId: 'CUS001',
          fullName: 'Nguyễn Văn An',
          email: 'nguyenvanan@gmail.com',
          phone: '0912345678',
          gender: 'MALE',
          dob: '1990-05-15',
          registeredDate: '2024-01-10',
          totalBookings: 12,
          status: 'ACTIVE'
        },
        {
          customerId: 'CUS002',
          fullName: 'Trần Thị Bình',
          email: 'tranthibinh@gmail.com',
          phone: '0923456789',
          gender: 'FEMALE',
          dob: '1985-08-20',
          registeredDate: '2024-01-15',
          totalBookings: 8,
          status: 'ACTIVE'
        },
        {
          customerId: 'CUS003',
          fullName: 'Lê Hoàng Cường',
          email: 'lehoangcuong@gmail.com',
          phone: '0934567890',
          gender: 'MALE',
          dob: '1992-03-10',
          registeredDate: '2024-02-01',
          totalBookings: 5,
          status: 'ACTIVE'
        },
        {
          customerId: 'CUS004',
          fullName: 'Phạm Thị Dung',
          email: 'phamthidung@gmail.com',
          phone: '0945678901',
          gender: 'FEMALE',
          dob: '1988-11-25',
          registeredDate: '2024-02-10',
          totalBookings: 15,
          status: 'ACTIVE'
        },
        {
          customerId: 'CUS005',
          fullName: 'Hoàng Văn Em',
          email: 'hoangvanem@gmail.com',
          phone: '0956789012',
          gender: 'MALE',
          dob: '1995-07-30',
          registeredDate: '2024-02-15',
          totalBookings: 3,
          status: 'INACTIVE'
        }
      ];
      
      setCustomers(mockData);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.customerId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleEditCustomer = (customerId) => {
    navigate(`/customer-profile/edit/${customerId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatGender = (gender) => {
    const genderMap = {
      'MALE': 'Nam',
      'FEMALE': 'Nữ',
      'OTHER': 'Khác'
    };
    return genderMap[gender] || gender;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ACTIVE': { label: 'Hoạt động', className: styles.statusActive },
      'INACTIVE': { label: 'Tạm ngưng', className: styles.statusInactive },
      'BLOCKED': { label: 'Đã khóa', className: styles.statusBlocked }
    };
    
    const config = statusConfig[status] || statusConfig['ACTIVE'];
    return <span className={`${styles.statusBadge} ${config.className}`}>{config.label}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Danh sách khách hàng</h1>
          <p className={styles.subtitle}>Quản lý thông tin khách hàng đã đăng ký</p>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại, mã KH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Tạm ngưng</option>
            <option value="BLOCKED">Đã khóa</option>
          </select>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Tổng số:</span>
            <span className={styles.statValue}>{customers.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Kết quả:</span>
            <span className={styles.statValue}>{filteredCustomers.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải danh sách khách hàng...</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Giới tính</th>
                <th>Ngày sinh</th>
                <th>Ngày đăng ký</th>
                <th>Số booking</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="10" className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📭</div>
                    <p>Không tìm thấy khách hàng nào</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.customerId} className={styles.tableRow}>
                    <td className={styles.customerId}>{customer.customerId}</td>
                    <td className={styles.customerName}>{customer.fullName}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone}</td>
                    <td>{formatGender(customer.gender)}</td>
                    <td>{formatDate(customer.dob)}</td>
                    <td>{formatDate(customer.registeredDate)}</td>
                    <td className={styles.bookingCount}>{customer.totalBookings}</td>
                    <td>{getStatusBadge(customer.status)}</td>
                    <td>
                      <button
                        onClick={() => handleEditCustomer(customer.customerId)}
                        className={styles.editButton}
                      >
                        ✏️ Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
