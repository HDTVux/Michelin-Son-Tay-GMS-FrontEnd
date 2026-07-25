import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { request } from '../../../services/apiClient.js';
import styles from './PointConfig.module.css';
import { Save, Info, Crown, Star } from 'lucide-react';

const PointConfig = () => {
  const [config, setConfig] = useState({
    pointsPer1000Vnd: 1,
    bonusPointsPerService: 10,
    pointsPerReferral: 50,
    rankSilverPoints: 5000,
    rankGoldPoints: 15000,
    rankPlatinumPoints: 30000,
    rankDiamondPoints: 50000,
    dealerLevel2Points: 50000,
    dealerLevel3Points: 150000,
    dealerLevel4Points: 300000,
    dealerLevel5Points: 500000
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      const response = await request('/api/admin/point-config', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response && response.data) {
        setConfig(prev => ({ ...prev, ...response.data }));
      } else if (response && response.pointsPer1000Vnd !== undefined) {
        setConfig(prev => ({ ...prev, ...response }));
      }
    } catch (error) {
      toast.error('Lỗi khi tải cấu hình điểm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken') || localStorage.getItem('authToken');
      await request('/api/admin/point-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      toast.success('Cập nhật cấu hình thành công!');
    } catch (error) {
      toast.error('Lỗi khi cập nhật cấu hình: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['point-config-container']}>
      <div className={styles['page-header']}>
        <div>
          <h2 className={styles['page-title']}>Cấu hình Điểm & Hạng</h2>
          <p className={styles['page-subtitle']}>Thiết lập quy tắc quy đổi điểm thưởng và các hạng thành viên</p>
        </div>
      </div>

      <div className={styles['grid-container']}>
        {/* Form Cấu hình */}
        <div className={styles['config-card']}>
          <div className={styles['card-header']}>
            <div className={styles['icon-wrapper']}><Save size={20} /></div>
            <h3>Quy tắc thưởng điểm</h3>
          </div>
          
          <form onSubmit={handleSubmit} className={styles['config-form']}>
            <div className={styles['form-group']}>
              <label>Hệ số điểm tiêu dùng</label>
              <p className={styles['help-text']}>Số điểm khách hàng nhận được trên mỗi 1,000 VNĐ thanh toán</p>
              <div className={styles['input-with-suffix']}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="pointsPer1000Vnd"
                  value={config.pointsPer1000Vnd}
                  onChange={handleInputChange}
                  className={styles['form-control']}
                  required
                />
                <span className={styles['suffix']}>điểm / 1K VNĐ</span>
              </div>
            </div>

            <div className={styles['form-group']}>
              <label>Điểm thưởng làm dịch vụ</label>
              <p className={styles['help-text']}>Điểm tặng thêm cho khách hàng sau mỗi lần hoàn thành phiếu dịch vụ</p>
              <div className={styles['input-with-suffix']}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="bonusPointsPerService"
                  value={config.bonusPointsPerService}
                  onChange={handleInputChange}
                  className={styles['form-control']}
                  required
                />
                <span className={styles['suffix']}>điểm / lượt</span>
              </div>
            </div>

            <div className={styles['form-group']}>
              <label>Điểm thưởng giới thiệu</label>
              <p className={styles['help-text']}>Điểm tặng thêm khi khách hàng giới thiệu được người mới (Sắp ra mắt)</p>
              <div className={styles['input-with-suffix']}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="pointsPerReferral"
                  value={config.pointsPerReferral}
                  onChange={handleInputChange}
                  className={styles['form-control']}
                  required
                />
                <span className={styles['suffix']}>điểm / người</span>
              </div>
            </div>

            <div className={styles['card-header']} style={{ marginTop: '32px' }}>
              <div className={`${styles['icon-wrapper']} ${styles['icon-blue']}`}><Crown size={20} /></div>
              <h3>Mốc điểm Hạng Khách lẻ</h3>
            </div>

            <div className={styles['form-group']}>
              <label>Mốc Hạng Bạc</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="rankSilverPoints" value={config.rankSilverPoints} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>
            <div className={styles['form-group']}>
              <label>Mốc Hạng Vàng</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="rankGoldPoints" value={config.rankGoldPoints} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>
            <div className={styles['form-group']}>
              <label>Mốc Hạng Bạch Kim</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="rankPlatinumPoints" value={config.rankPlatinumPoints} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>
            <div className={styles['form-group']}>
              <label>Mốc Hạng Kim Cương</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="rankDiamondPoints" value={config.rankDiamondPoints} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>

            <div className={styles['card-header']} style={{ marginTop: '32px' }}>
              <div className={`${styles['icon-wrapper']} ${styles['icon-purple']}`}><Star size={20} /></div>
              <h3>Mốc điểm Hạng Đại lý</h3>
            </div>

            <div className={styles['form-group']}>
              <label>Mốc Đại lý Cấp 2</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="dealerLevel2Points" value={config.dealerLevel2Points} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>
            <div className={styles['form-group']}>
              <label>Mốc Đại lý Cấp 3</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="dealerLevel3Points" value={config.dealerLevel3Points} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>
            <div className={styles['form-group']}>
              <label>Mốc Đại lý Cấp 4</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="dealerLevel4Points" value={config.dealerLevel4Points} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>
            <div className={styles['form-group']}>
              <label>Mốc Đại lý Cấp 5</label>
              <div className={styles['input-with-suffix']}>
                <input type="number" name="dealerLevel5Points" value={config.dealerLevel5Points} onChange={handleInputChange} className={styles['form-control']} required />
                <span className={styles['suffix']}>điểm</span>
              </div>
            </div>

            <div className={styles['form-actions']}>
              <button type="submit" className={styles['submit-btn']} disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </form>
        </div>

        {/* Thông tin Hạng (Preview) */}
        <div className={styles['info-column']}>
          <div className={styles['info-card']}>
            <div className={styles['card-header']}>
              <div className={`${styles['icon-wrapper']} ${styles['icon-blue']}`}><Crown size={20} /></div>
              <h3>Xem trước Hạng Khách lẻ</h3>
            </div>
            <ul className={styles['rank-list']}>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-bronze']}`}>Đồng</span>
                <span className={styles['rank-points']}>0 điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-silver']}`}>Bạc</span>
                <span className={styles['rank-points']}>{config.rankSilverPoints?.toLocaleString()} điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-gold']}`}>Vàng</span>
                <span className={styles['rank-points']}>{config.rankGoldPoints?.toLocaleString()} điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-platinum']}`}>Bạch Kim</span>
                <span className={styles['rank-points']}>{config.rankPlatinumPoints?.toLocaleString()} điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-diamond']}`}>Kim Cương</span>
                <span className={styles['rank-points']}>{config.rankDiamondPoints?.toLocaleString()} điểm</span>
              </li>
            </ul>
          </div>

          <div className={styles['info-card']}>
            <div className={styles['card-header']}>
              <div className={`${styles['icon-wrapper']} ${styles['icon-purple']}`}><Star size={20} /></div>
              <h3>Xem trước Hạng Đại lý</h3>
            </div>
            <ul className={styles['rank-list']}>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-dealer']}`}>Cấp 1</span>
                <span className={styles['rank-points']}>0 điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-dealer']}`}>Cấp 2</span>
                <span className={styles['rank-points']}>{config.dealerLevel2Points?.toLocaleString()} điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-dealer']}`}>Cấp 3</span>
                <span className={styles['rank-points']}>{config.dealerLevel3Points?.toLocaleString()} điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-dealer']}`}>Cấp 4</span>
                <span className={styles['rank-points']}>{config.dealerLevel4Points?.toLocaleString()} điểm</span>
              </li>
              <li>
                <span className={`${styles['rank-badge']} ${styles['rank-dealer']}`}>Cấp 5</span>
                <span className={styles['rank-points']}>{config.dealerLevel5Points?.toLocaleString()} điểm</span>
              </li>
            </ul>
            <div className={styles['info-note']}>
              <Info size={16} />
              <p>Mốc điểm Đại lý cao hơn nhiều so với khách lẻ do đặc thù mua sỉ số lượng lớn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointConfig;
