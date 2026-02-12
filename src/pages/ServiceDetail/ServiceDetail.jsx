import styles from './ServiceDetail.module.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchHomeServiceDetail } from '../../services/homeService';
import serviceFallback from '../../assets/lop and mam.jpg';

const ServiceDetail = () => {
  // 1. Lấy serviceId từ URL (ví dụ: /services/123)
  const { serviceId } = useParams();

  // 2. Quản lý trạng thái dữ liệu, trạng thái tải (loading) và lỗi (error)
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Hook useEffect: Xử lý các tác vụ ngoài luồng (Side Effects) - Gọi API lấy dữ liệu.
   * Chạy lại mỗi khi serviceId thay đổi.
   */
  useEffect(() => {
    // Kiểm tra nếu không có serviceId thì báo lỗi ngay
    if (!serviceId) {
      setError('Không tìm thấy dịch vụ.');
      setLoading(false);
      return undefined;
    }

    /**
     * Biến cờ 'active' (Cleanup Pattern):
     * Trong môi trường mạng chậm, người dùng có thể nhấn thoát trang trước khi API trả về. 
     * Nếu API trả về sau khi component đã bị gỡ bỏ (unmount), việc setState sẽ gây lỗi "memory leak".
     * Biến 'active' giúp đảm bảo chỉ cập nhật state nếu component vẫn đang hiển thị.
     */
    let active = true;
    setLoading(true);
    setError('');

    // Gọi hàm API từ service layer
    fetchHomeServiceDetail(serviceId)
      .then((res) => {
        if (!active) return; // Nếu đã unmount thì dừng lại
        setService(res?.data || null);
      })
      .catch((err) => {
        if (!active) return;
        // Trả về thông báo lỗi cụ thể từ server hoặc lỗi mặc định
        setError(err?.message || 'Không thể tải thông tin dịch vụ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Cleanup function: Chạy khi component bị unmount hoặc serviceId thay đổi
    return () => {
      active = false;
    };
  }, [serviceId]);

  // 3. Xử lý logic hiển thị hình ảnh (Fallback logic)
  // Lý do: Đảm bảo giao diện không bị trống nếu dịch vụ không có hình ảnh từ database.
  const mediaList = service?.media?.length ? service.media : [];
  const heroImage = service?.mediaThumbnail || mediaList?.[0]?.mediaUrl || serviceFallback;

  return (
    <div className={styles.serviceDetail}>
      <div className={styles['serviceDetail-header']}>
        <div className={styles['serviceDetail-breadcrumbs']}>
          <Link to="/services">Dịch vụ</Link>
          <span>/</span>
          <span>{service?.title || 'Chi tiết dịch vụ'}</span>
        </div>
        <h1 className={styles['serviceDetail-title']}>{service?.title || 'Chi tiết dịch vụ'}</h1>
        
        {/* Render có điều kiện: Chỉ hiện giá nếu service được cấu hình cho phép hiển thị */}
        {service?.showPrice && (
          <div className={styles['serviceDetail-price']}>
            Giá: {service?.displayPrice || 'Liên hệ'}
          </div>
        )}
      </div>

      {/* Trạng thái Loading: Tăng trải nghiệm người dùng khi chờ API */}
      {loading && <div className={styles['serviceDetail-status']}>Đang tải thông tin dịch vụ...</div>}
      
      {/* Hiển thị lỗi: Thông báo rõ ràng cho người dùng nếu API thất bại */}
      {!loading && error && (
        <div className={`${styles['serviceDetail-status']} ${styles.error}`}>
          {error}
        </div>
      )}

      {/* Nội dung chính: Chỉ hiển thị khi đã tải xong và không có lỗi */}
      {!loading && !error && (
        <>
          <div className={styles['serviceDetail-hero']}>
            <img src={heroImage} alt={service?.title || 'Dịch vụ'} />
          </div>

          <div className={styles['serviceDetail-content']}>
            <div className={styles['serviceDetail-section']}>
              <h2>Giới thiệu</h2>
              <p>{service?.shortDescription || 'Hiện chưa có mô tả ngắn.'}</p>
            </div>

            <div className={styles['serviceDetail-section']}>
              <h2>Chi tiết dịch vụ</h2>
              <p>{service?.fullDescription || 'Hiện chưa có mô tả chi tiết cho dịch vụ này.'}</p>
            </div>

            {/* Thư viện hình ảnh/video: Duyệt danh sách media nếu có */}
            {mediaList.length > 0 && (
              <div className={styles['serviceDetail-section']}>
                <h2>Thư viện hình ảnh</h2>
                <div className={styles['serviceDetail-mediaGrid']}>
                  {mediaList.map((item) => {
                    const url = item.mediaUrl || '';
                    
                    /**
                     * Kiểm tra định dạng video:
                     * Dùng Regex để kiểm tra đuôi file nếu backend không gửi mediaType.
                     */
                    const isVideo = item.mediaType === 'video' || /\.(mp4|webm|ogg)$/i.test(url);
                    
                    return (
                      <div key={item.serviceMediaId || url} className={styles['serviceDetail-mediaItem']}>
                        {isVideo ? (
                          /* Video tự động chạy chế độ tắt tiếng để làm "hình nền động" trong Grid */
                          <video src={url} autoPlay muted loop playsInline preload="metadata">
                            Trình duyệt không hỗ trợ video.
                          </video>
                        ) : (
                          <img src={url} alt={item.mediaDescription || service?.title} />
                        )}
                        
                        {/* Hiển thị chú thích ảnh nếu có để tối ưu SEO và thông tin */}
                        {item.mediaDescription && (
                          <div className={styles['serviceDetail-mediaCaption']}>
                            {item.mediaDescription}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceDetail;