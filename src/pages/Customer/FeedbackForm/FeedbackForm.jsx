import { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './FeedbackForm.module.css';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    serviceTicketId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    rating: 0,
    comment: '',
    serviceQuality: 0,
    staffAttitude: 0,
    facilityClean: 0,
    priceReasonable: 0
  });

  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredServiceQuality, setHoveredServiceQuality] = useState(0);
  const [hoveredStaffAttitude, setHoveredStaffAttitude] = useState(0);
  const [hoveredFacilityClean, setHoveredFacilityClean] = useState(0);
  const [hoveredPriceReasonable, setHoveredPriceReasonable] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }

    if (!formData.customerPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }

    if (!formData.customerEmail.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    if (formData.rating === 0) {
      toast.error('Vui lòng chọn đánh giá tổng thể');
      return;
    }

    if (!formData.comment.trim()) {
      toast.error('Vui lòng nhập nhận xét');
      return;
    }

    setSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Replace with actual API call
      // await submitFeedback(formData);

      setShowSuccessModal(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setFormData({
          serviceTicketId: '',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          rating: 0,
          comment: '',
          serviceQuality: 0,
          staffAttitude: 0,
          facilityClean: 0,
          priceReasonable: 0
        });
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Không thể gửi phản hồi. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      serviceTicketId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      rating: 0,
      comment: '',
      serviceQuality: 0,
      staffAttitude: 0,
      facilityClean: 0,
      priceReasonable: 0
    });
    toast.info('Đã xóa toàn bộ thông tin');
  };

  const renderStars = (field, value, hoveredValue, setHovered) => {
    return (
      <div className={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${styles.star} ${
              star <= (hoveredValue || value) ? styles.starFilled : styles.starEmpty
            }`}
            onClick={() => handleRatingClick(field, star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        {/* Left Column - Customer Info */}
        <div className={styles.leftColumn}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Lời cảm ơn từ chúng tôi</h2>
            <p className={styles.thankYouText}>
              Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi. 
              Ý kiến đóng góp của quý khách là động lực để chúng tôi 
              không ngừng cải thiện chất lượng dịch vụ.
            </p>
          </div>

          <div className={styles.sectionCard}>
            <h3 className={styles.cardTitle}>Thông tin khách hàng</h3>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Mã phiếu dịch vụ <span className={styles.optional}>(Tùy chọn)</span>
              </label>
              <input
                type="text"
                name="serviceTicketId"
                value={formData.serviceTicketId}
                onChange={handleInputChange}
                placeholder="Nhập mã phiếu dịch vụ (nếu có)"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Họ và tên <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Nhập họ và tên"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Số điện thoại <span className={styles.required}>*</span>
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                placeholder="Nhập số điện thoại"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Email <span className={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                placeholder="Nhập địa chỉ email"
                className={styles.input}
                required
              />
            </div>
          </div>
        </div>

        {/* Right Column - Feedback */}
        <div className={styles.rightColumn}>
          <div className={styles.sectionCard}>
            <h3 className={styles.cardTitle}>Đánh giá dịch vụ</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Đánh giá tổng thể <span className={styles.required}>*</span>
              </label>
              <div className={styles.ratingRow}>
                {renderStars('rating', formData.rating, hoveredRating, setHoveredRating)}
                {formData.rating > 0 && (
                  <span className={styles.ratingText}>{formData.rating}/5</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Chất lượng dịch vụ</label>
              <div className={styles.ratingRow}>
                {renderStars('serviceQuality', formData.serviceQuality, hoveredServiceQuality, setHoveredServiceQuality)}
                {formData.serviceQuality > 0 && (
                  <span className={styles.ratingText}>{formData.serviceQuality}/5</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Thái độ nhân viên</label>
              <div className={styles.ratingRow}>
                {renderStars('staffAttitude', formData.staffAttitude, hoveredStaffAttitude, setHoveredStaffAttitude)}
                {formData.staffAttitude > 0 && (
                  <span className={styles.ratingText}>{formData.staffAttitude}/5</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Cơ sở vật chất</label>
              <div className={styles.ratingRow}>
                {renderStars('facilityClean', formData.facilityClean, hoveredFacilityClean, setHoveredFacilityClean)}
                {formData.facilityClean > 0 && (
                  <span className={styles.ratingText}>{formData.facilityClean}/5</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Giá cả hợp lý</label>
              <div className={styles.ratingRow}>
                {renderStars('priceReasonable', formData.priceReasonable, hoveredPriceReasonable, setHoveredPriceReasonable)}
                {formData.priceReasonable > 0 && (
                  <span className={styles.ratingText}>{formData.priceReasonable}/5</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nhận xét <span className={styles.required}>*</span>
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                placeholder="Vui lòng chia sẻ trải nghiệm của bạn về dịch vụ..."
                className={styles.textarea}
                rows={6}
                required
              />
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleReset}
                className={styles.resetButton}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>Gửi đánh giá thành công!</h3>
            <p className={styles.successMessage}>
              Cảm ơn bạn đã dành thời gian đánh giá dịch vụ của chúng tôi.
              Ý kiến của bạn rất quan trọng với chúng tôi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackForm;
