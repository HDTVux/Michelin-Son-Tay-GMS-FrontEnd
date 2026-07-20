import '../Services/Services.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHomeProducts } from '../../../services/homeService';
import serviceFallback from '../../../assets/lop and mam.jpg';

const extractPayload = (res) => res?.data?.data ?? res?.data ?? res;
const extractList = (res) => {
  const payload = extractPayload(res);
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.data)) return payload.data;
  return Array.isArray(payload) ? payload : [];
};
const parsePriceNumber = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const text = String(value).toLowerCase().trim();
  if (!text || text.includes('liên hệ')) return null;
  const match = text.match(/\d[\d.,]*/);
  if (!match) return null;
  const parsed = Number(match[0].replace(/[.,]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const toDisplayPrice = (item) => {
  if (item?.showPrice !== true) return 'Giá: Liên hệ';
  const numeric = parsePriceNumber(item?.displayPrice) ?? parsePriceNumber(item?.price);
  return numeric != null ? `Giá: ${numeric.toLocaleString('vi-VN')} VND` : 'Giá: Liên hệ';
};

const Combos = () => {
  const navigate = useNavigate();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchHomeProducts({ page: 0, size: 500, itemType: 'COMBO' })
      .then((res) => {
        if (!active) return;
        const items = extractList(res).map((item) => ({
          id: item?.itemId ?? item?.catalogItemId ?? item?.id,
          title: String(item?.itemName || item?.title || 'Combo dịch vụ').trim(),
          description: String(item?.comboDescription || item?.description || item?.shortDescription || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
          price: toDisplayPrice(item),
        }));
        setCombos(items);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Không thể tải danh sách combo.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="servicesPage">
      <div className="servicesPage-bg" />
      <div className="servicesHero visible isHome">
        <div className="servicesHeroContent">
          <div className="servicesLabel">DANH MỤC</div>
          <h1 className="servicesTitle">
            <span className="titlePart1">Combo</span>
            <span className="titlePart2">dịch vụ tiết kiệm</span>
          </h1>
          <p className="servicesSubtitle">
            Các gói dịch vụ trọn gói, tối ưu chi phí bảo dưỡng và sửa chữa xe của bạn.
          </p>
        </div>
      </div>

      <div className="servicesCatalogLayout">
        {loading && (
          <div className="serviceStatus">
            <div className="loadingSpinner" />
            <span>Đang tải danh sách combo...</span>
          </div>
        )}
        {!loading && error && (
          <div className="serviceStatus error">{error}</div>
        )}
        {!loading && !error && combos.length === 0 && (
          <div className="serviceStatus">Chưa có combo nào được công bố.</div>
        )}
        {!loading && combos.length > 0 && (
          <div className="servicesGrid">
            {combos.map((combo, idx) => (
              <div key={combo.id || idx} className="serviceGridItem">
                <div className="serviceCard">
                  <div className="serviceCard-imageTop">
                    <img src={serviceFallback} alt={combo.title} className="serviceCard-image" />
                    <div className="catalogTypeBadge">Combo</div>
                  </div>
                  <div className="serviceCard-content">
                    <h3 className="serviceTitle">{combo.title}</h3>
                    {combo.description && (
                      <p className="serviceDescription">{combo.description}</p>
                    )}
                    <div className="servicePriceInCard">{combo.price}</div>
                    <div className="serviceCard-footer">
                      <button
                        type="button"
                        className="btnBuyNowNew"
                        onClick={() => navigate('/booking')}
                      >
                        Đặt lịch ngay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Combos;
