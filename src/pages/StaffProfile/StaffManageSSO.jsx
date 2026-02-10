import { useState } from 'react';
import { useScrollToTop } from '../../hooks/useScrollToTop.js';
import './StaffManageSSO.css';

const StaffManageSSO = () => {
  useScrollToTop();
  const [providers, setProviders] = useState([
    {
      id: 'google',
      name: 'Google',
      status: 'linked',
      linkedAt: '22/03/2023 10:30',
    },
    {
      id: 'zalo',
      name: 'Zalo',
      status: 'linked',
      linkedAt: '15/01/2023 14:00',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      status: 'unlinked',
      linkedAt: null,
    },
  ]);

  const handleLink = (id) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'linked',
              linkedAt: new Date().toLocaleString('vi-VN'),
            }
          : p
      )
    );
    const provider = providers.find((p) => p.id === id);
    alert(`Đã liên kết tài khoản ${provider?.name || ''}`);
  };

  const handleUnlink = (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy liên kết tài khoản này?')) {
      return;
    }
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'unlinked',
              linkedAt: null,
            }
          : p
      )
    );
    const provider = providers.find((p) => p.id === id);
    alert(`Đã hủy liên kết tài khoản ${provider?.name || ''}`);
  };

  const handleAddNewSSO = () => {
    alert('Màn hình chọn nhà cung cấp SSO sẽ được mở (TODO).');
  };

  return (
    <div className="staffSsoPage">
      <div className="staffSsoContainer">
        <div className="staffSsoHeader">
          <h1 className="staffSsoTitle">Quản lý tài khoản liên kết</h1>
        </div>

        <div className="staffSsoActionsBar">
          <button
            type="button"
            className="staffSsoPrimaryButton"
            onClick={handleAddNewSSO}
          >
            Liên kết tài khoản SSO mới
          </button>
        </div>

        <section className="staffSsoSection">
          <div className="staffSsoTableHeader">
            <span className="col-provider">Tài khoản</span>
            <span className="col-status">Trạng thái</span>
            <span className="col-time">Thời gian liên kết</span>
            <span className="col-action">Thao tác</span>
          </div>

          <div className="staffSsoTableBody">
            {providers.map((provider) => (
              <div key={provider.id} className="staffSsoRow">
                <div className="col-provider">
                  <div className="ssoProviderInfo">
                    <div className={`ssoProviderIcon ${provider.id}`}>
                      {provider.name.charAt(0)}
                    </div>
                    <span className="ssoProviderName">{provider.name}</span>
                  </div>
                </div>
                <div className="col-status">
                  {provider.status === 'linked' ? (
                    <span className="ssoStatus linked">Đã liên kết</span>
                  ) : (
                    <span className="ssoStatus unlinked">Chưa liên kết</span>
                  )}
                </div>
                <div className="col-time">
                  {provider.status === 'linked'
                    ? provider.linkedAt
                    : '—'}
                </div>
                <div className="col-action">
                  {provider.status === 'linked' ? (
                    <button
                      type="button"
                      className="btnUnlinkSso"
                      onClick={() => handleUnlink(provider.id)}
                    >
                      Hủy liên kết
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btnLinkSso"
                      onClick={() => handleLink(provider.id)}
                    >
                      Liên kết
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StaffManageSSO;

