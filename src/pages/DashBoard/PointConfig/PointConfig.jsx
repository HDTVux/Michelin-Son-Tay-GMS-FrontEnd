import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { request } from '../../../services/apiClient.js';
import styles from './PointConfig.module.css';

const PointConfig = () => {
  const [config, setConfig] = useState({
    pointsPer1000Vnd: 1,
    bonusPointsPerService: 10,
    pointsPerReferral: 50
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
        setConfig(response.data);
      } else if (response && response.pointsPer1000Vnd !== undefined) {
        setConfig(response);
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
      <h2 className={styles['page-title']}>Cấu hình Điểm & Hạng</h2>
      <div className={styles['config-card']}>
        <form onSubmit={handleSubmit}>
          <div className={styles['form-group']}>
            <label>Hệ số điểm tiêu dùng (Mỗi 1,000 VNĐ quy ra bao nhiêu điểm)</label>
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
          </div>

          <div className={styles['form-group']}>
            <label>Điểm thưởng làm dịch vụ (Tặng thêm mỗi lần làm DV)</label>
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
          </div>

          <div className={styles['form-group']}>
            <label>Điểm thưởng giới thiệu (Cho mỗi khách hàng mới)</label>
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
          </div>

          <button type="submit" className={styles['submit-btn']} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PointConfig;
