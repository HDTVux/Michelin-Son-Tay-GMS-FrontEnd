import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import styles from './LinkedAccounts.module.css';

const LinkedAccounts = () => {
  useScrollToTop();
  const [linkedAccounts, setLinkedAccounts] = useState({
    google: true,
    zalo: false
  });

  const handleLinkAccount = (provider) => {
    setLinkedAccounts((prev) => ({ ...prev, [provider]: true }));
    alert(`Đã liên kết tài khoản ${provider === 'google' ? 'Google' : 'Zalo'}`);
  };

  const handleUnlinkAccount = (provider) => {
    setLinkedAccounts((prev) => ({ ...prev, [provider]: false }));
    alert(`Đã hủy liên kết tài khoản ${provider === 'google' ? 'Google' : 'Zalo'}`);
  };

  const handleCancel = () => {
    window.history.back();
  };

  return (
    <div className={styles['manage-profile-page']}>
      <div className={styles['manage-profile-container']}>
        <div className={styles['manage-profile-header']}>
          <h1 className={styles['manage-profile-title']}>Liên kết tài khoản</h1>
          <Link to="/user-profile" className={styles['back-button']}>
            ← Về Thông tin cá nhân
          </Link>
        </div>

        <section className={styles['linked-accounts-section']}>
          <h2 className={styles['section-title']}>Kết nối với mạng xã hội</h2>
          <div className={styles['linked-accounts-list']}>
            <div className={styles['linked-account-item']}>
              <div className={styles['account-info']}>
                <div className={`${styles['account-icon']} ${styles['google']}`}>G</div>
                <div className={styles['account-details']}>
                  <span className={styles['account-name']}>Google</span>
                  <span className={styles['account-status']}>
                    {linkedAccounts.google ? '(Đã liên kết)' : '(Chưa liên kết)'}
                  </span>
                </div>
              </div>
              {linkedAccounts.google ? (
                <button
                  type="button"
                  className={styles['btn-unlink']}
                  onClick={() => handleUnlinkAccount('google')}
                >
                  Hủy liên kết
                </button>
              ) : (
                <button
                  type="button"
                  className={styles['btn-link']}
                  onClick={() => handleLinkAccount('google')}
                >
                  Liên kết
                </button>
              )}
            </div>

            <div className={styles['linked-account-item']}>
              <div className={styles['account-info']}>
                <div className={`${styles['account-icon']} ${styles['zalo']}`}>💬</div>
                <div className={styles['account-details']}>
                  <span className={styles['account-name']}>Zalo</span>
                  <span className={styles['account-status']}>
                    {linkedAccounts.zalo ? '(Đã liên kết)' : '(Chưa liên kết)'}
                  </span>
                </div>
              </div>
              {linkedAccounts.zalo ? (
                <button
                  type="button"
                  className={styles['btn-unlink']}
                  onClick={() => handleUnlinkAccount('zalo')}
                >
                  Hủy liên kết
                </button>
              ) : (
                <button
                  type="button"
                  className={styles['btn-link']}
                  onClick={() => handleLinkAccount('zalo')}
                >
                  Liên kết
                </button>
              )}
            </div>
          </div>
        </section>

        <div className={styles['form-footer']}>
          <button type="button" className={styles['btn-cancel']} onClick={handleCancel}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedAccounts;

