import { useState } from 'react';
import { toast } from 'react-toastify';
import { createPromotion } from '../../../services/promotionService';
import styles from './PromotionManagement.module.css';

const PromotionManagement = () => {
  // State cho danh sách khuyến mãi (mock data - sau sẽ gọi API)
  const [promotions, setPromotions] = useState([]);
  const [loading] = useState(false);

  // State cho modal tạo mới
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State cho form
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'PERCENT',
    discountPercent: '',
    isActive: true,
    applyTo: 'ALL',
    buyItemId: '',
    buyQuantity: '',
    getItemId: '',
    getQuantity: '',
    targetType: 'ALL',
    minOrderValue: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
  });

  // State cho search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'PERCENT',
      discountPercent: '',
      isActive: true,
      applyTo: 'ALL',
      buyItemId: '',
      buyQuantity: '',
      getItemId: '',
      getQuantity: '',
      targetType: 'ALL',
      minOrderValue: '',
      startDate: '',
      endDate: '',
      usageLimit: '',
    });
  };

  // Validate form
  const validateForm = () => {
    if (!formData.code.trim()) {
      toast.error('Vui lòng nhập mã khuyến mãi');
      return false;
    }
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên khuyến mãi');
      return false;
    }
    if (!formData.startDate) {
      toast.error('Vui lòng chọn ngày bắt đầu');
      return false;
    }
    if (!formData.endDate) {
      toast.error('Vui lòng chọn ngày kết thúc');
      return false;
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu');
      return false;
    }
    return true;
  };

  // Submit form tạo khuyến mãi
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        promotionId: null,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        type: formData.type,
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
        isActive: formData.isActive,
        applyTo: formData.applyTo,
        buyItemId: formData.buyItemId ? parseInt(formData.buyItemId) : null,
        buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : null,
        getItemId: formData.getItemId ? parseInt(formData.getItemId) : null,
        getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : null,
        targetType: formData.targetType,
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      };

      const response = await createPromotion(payload);

      if (response?.success) {
        toast.success('Tạo khuyến mãi thành công!');
        setShowModal(false);
        resetForm();
        // Refresh danh sách
        setPromotions(prev => [response.data, ...prev]);
      } else {
        toast.error(response?.message || 'Tạo khuyến mãi thất bại');
      }
    } catch (error) {
      console.error('Error creating promotion:', error);
      toast.error(error?.message || 'Lỗi khi tạo khuyến mãi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter promotions
  const filteredPromotions = promotions.filter(promo => {
    const matchSearch = !searchTerm ||
      promo.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promo.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && promo.isActive) ||
      (filterStatus === 'inactive' && !promo.isActive);

    return matchSearch && matchStatus;
  });

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Quản lý khuyến mãi</h1>
          <p className={styles.subtitle}>Tạo và quản lý các chương trình khuyến mãi</p>
        </div>
        <button
          className={styles.createBtn}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <span className={styles.createBtnIcon}>+</span>
          Tạo khuyến mãi mới
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{promotions.length}</div>
            <div className={styles.statLabel}>Tổng khuyến mãi</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{promotions.filter(p => p.isActive).length}</div>
            <div className={styles.statLabel}>Đang hoạt động</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statExpired}`}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{promotions.filter(p => !p.isActive).length}</div>
            <div className={styles.statLabel}>Không hoạt động</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, tên khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Không hoạt động</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <p>Chưa có khuyến mãi nào</p>
            <span>Hãy tạo khuyến mãi đầu tiên cho cửa hàng của bạn</span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>MÃ KM</th>
                <th>TÊN KHUYẾN MÃI</th>
                <th>LOẠI</th>
                <th>GIÁ TRỊ</th>
                <th>NGÀY BẮT ĐẦU</th>
                <th>NGÀY KẾT THÚC</th>
                <th>LƯỢT SỬ DỤNG</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.map((promo, index) => (
                <tr key={promo.promotionId || index}>
                  <td>{index + 1}</td>
                  <td>
                    <span className={styles.codeBadge}>{promo.code}</span>
                  </td>
                  <td className={styles.nameCell}>{promo.name}</td>
                  <td>
                    <span className={`${styles.typeBadge} ${styles[`type${promo.type}`]}`}>
                      {promo.type === 'PERCENT' ? 'Phần trăm' : 'Quà tặng'}
                    </span>
                  </td>
                  <td>
                    {promo.discountPercent ? `${promo.discountPercent}%` : formatCurrency(promo.discountAmount)}
                  </td>
                  <td>{formatDate(promo.startDate)}</td>
                  <td>{formatDate(promo.endDate)}</td>
                  <td>
                    {promo.usageCount || 0} / {promo.usageLimit || '∞'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${promo.isActive ? styles.statusActive : styles.statusInactive}`}>
                      {promo.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tạo Khuyến Mãi */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Tạo khuyến mãi mới</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <form className={styles.modalBody} onSubmit={handleSubmit}>
              {/* Mã & Tên */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Mã khuyến mãi <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="VD: SUMMER2024"
                    disabled={isSubmitting}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Tên khuyến mãi <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="VD: Giảm giá mùa hè 2024"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Loại khuyến mãi */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Loại khuyến mãi</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={isSubmitting}
                  >
                    <option value="PERCENT">Giảm theo phần trăm</option>
                    <option value="GIFT">Tặng quà</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giá trị giảm (%)</label>
                  <input
                    type="number"
                    name="discountPercent"
                    value={formData.discountPercent}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="VD: 15"
                    min="0"
                    max="100"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Áp dụng cho */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Áp dụng cho</label>
                  <select
                    name="applyTo"
                    value={formData.applyTo}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={isSubmitting}
                  >
                    <option value="ALL">Tất cả dịch vụ</option>
                    <option value="SERVICE">Chỉ dịch vụ</option>
                    <option value="PRODUCT">Chỉ sản phẩm</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Đối tượng</label>
                  <select
                    name="targetType"
                    value={formData.targetType}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={isSubmitting}
                  >
                    <option value="ALL">Tất cả khách hàng</option>
                    <option value="NEW">Khách hàng mới</option>
                    <option value="VIP">Khách hàng VIP</option>
                  </select>
                </div>
              </div>

              {/* Giá trị đơn hàng tối thiểu */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Giá trị đơn hàng tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  name="minOrderValue"
                  value={formData.minOrderValue}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="VD: 500000"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>

              {/* Ngày bắt đầu & kết thúc */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Ngày bắt đầu <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isSubmitting}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Ngày kết thúc <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Số lượng sử dụng */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Số lượng sử dụng tối đa</label>
                <input
                  type="number"
                  name="usageLimit"
                  value={formData.usageLimit}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Để trống nếu không giới hạn"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>

              {/* Active toggle */}
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <span className={styles.checkmark}></span>
                  <span className={styles.checkboxLabel}>Kích hoạt ngay khi tạo</span>
                </label>
              </div>

              {/* Actions */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className={styles.btnSpinner}></span>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Tạo khuyến mãi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;
