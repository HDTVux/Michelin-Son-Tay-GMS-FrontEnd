import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import './ManageProfile.module.css';
import './ManageProfile.header.module.css';
import './ManageProfile.linkedAccounts.module.css';
import './ManageProfile.footer.module.css';

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
    <div className="manageProfilePage">
      <div className="manageProfileContainer">
        <div className="manageProfileHeader">
          <h1 className="manageProfileTitle">Liên kết tài khoản</h1>
          <Link to="/user-profile" className="backButton">
            ← Về Thông tin cá nhân
          </Link>
        </div>

        <section className="linkedAccountsSection">
          <h2 className="sectionTitle">Kết nối với mạng xã hội</h2>
          <div className="linkedAccountsList">
            <div className="linkedAccountItem">
              <div className="accountInfo">
                <div className="accountIcon google">G</div>
                <div className="accountDetails">
                  <span className="accountName">Google</span>
                  <span className="accountStatus">
                    {linkedAccounts.google ? '(Đã liên kết)' : '(Chưa liên kết)'}
                  </span>
                </div>
              </div>
              {linkedAccounts.google ? (
                <button
                  type="button"
                  className="btnUnlink"
                  onClick={() => handleUnlinkAccount('google')}
                >
                  Hủy liên kết
                </button>
              ) : (
                <button
                  type="button"
                  className="btnLink"
                  onClick={() => handleLinkAccount('google')}
                >
                  Liên kết
                </button>
              )}
            </div>

            <div className="linkedAccountItem">
              <div className="accountInfo">
                <div className="accountIcon zalo">💬</div>
                <div className="accountDetails">
                  <span className="accountName">Zalo</span>
                  <span className="accountStatus">
                    {linkedAccounts.zalo ? '(Đã liên kết)' : '(Chưa liên kết)'}
                  </span>
                </div>
              </div>
              {linkedAccounts.zalo ? (
                <button
                  type="button"
                  className="btnUnlink"
                  onClick={() => handleUnlinkAccount('zalo')}
                >
                  Hủy liên kết
                </button>
              ) : (
                <button
                  type="button"
                  className="btnLink"
                  onClick={() => handleLinkAccount('zalo')}
                >
                  Liên kết
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="formFooter">
          <button type="button" className="btnCancel" onClick={handleCancel}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedAccounts;

