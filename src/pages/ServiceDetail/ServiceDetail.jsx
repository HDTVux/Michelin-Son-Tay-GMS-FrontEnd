import './ServiceDetail.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchHomeServiceDetail } from '../../services/homeService';
import serviceFallback from '../../assets/lop and mam.jpg';

const ServiceDetail = () => {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!serviceId) {
      setError('Không tìm thấy dịch vụ.');
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');

    fetchHomeServiceDetail(serviceId)
      .then((res) => {
        if (!active) return;
        setService(res?.data || null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Không thể tải thông tin dịch vụ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serviceId]);

  const mediaList = service?.media?.length ? service.media : [];
  const heroImage = service?.mediaThumbnail || mediaList?.[0]?.mediaUrl || serviceFallback;

  return (
    <div className="serviceDetail">
      <div className="serviceDetail-header">
        <div className="serviceDetail-breadcrumbs">
          <Link to="/services">Dịch vụ</Link>
          <span>/</span>
          <span>{service?.title || 'Chi tiết dịch vụ'}</span>
        </div>
        <h1 className="serviceDetail-title">{service?.title || 'Chi tiết dịch vụ'}</h1>
        {service?.showPrice && (
          <div className="serviceDetail-price">Giá: {service?.displayPrice || 'Liên hệ'}</div>
        )}
      </div>

      {loading && <div className="serviceDetail-status">Đang tải thông tin dịch vụ...</div>}
      {!loading && error && <div className="serviceDetail-status error">{error}</div>}
      {!loading && !error && (
        <>
          <div className="serviceDetail-hero">
            <img src={heroImage} alt={service?.title || 'Dịch vụ'} />
          </div>

          <div className="serviceDetail-content">
            <div className="serviceDetail-section">
              <h2>Giới thiệu</h2>
              <p>{service?.shortDescription || 'Hiện chưa có mô tả ngắn.'}</p>
            </div>

            <div className="serviceDetail-section">
              <h2>Chi tiết dịch vụ</h2>
              <p>{service?.fullDescription || 'Hiện chưa có mô tả chi tiết cho dịch vụ này.'}</p>
            </div>

            {mediaList.length > 0 && (
              <div className="serviceDetail-section">
                <h2>Thư viện hình ảnh</h2>
                <div className="serviceDetail-mediaGrid">
                  {mediaList.map((item) => (
                    <div key={item.serviceMediaId || item.mediaUrl} className="serviceDetail-mediaItem">
                      <img src={item.mediaUrl} alt={item.mediaDescription || service?.title} />
                      {item.mediaDescription ? (
                        <div className="serviceDetail-mediaCaption">{item.mediaDescription}</div>
                      ) : null}
                    </div>
                  ))}
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
