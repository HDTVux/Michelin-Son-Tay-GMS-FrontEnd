import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import SideBar from './Sidebar/SideBar.jsx';
import './StaffLayout.css';

const base64UrlToBase64 = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replaceAll('-', '+').replaceAll('_', '/');
  const pad = normalized.length % 4;
  if (pad === 0) return normalized;
  return normalized + '='.repeat(4 - pad);
};

const decodeBase64ToUtf8 = (base64OrUrl) => {
  const b64 = base64UrlToBase64(base64OrUrl);
  if (!b64) return '';
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

const persistStaffSessionFromSso = ({ tokenFromUrl, infoFromUrl }) => {
  if (tokenFromUrl) {
    localStorage.setItem('authToken', tokenFromUrl);
  }

  if (!infoFromUrl) return;

  try {
    const decoded = decodeBase64ToUtf8(decodeURIComponent(infoFromUrl));
    const userInfo = JSON.parse(decoded);

    const roles = Array.isArray(userInfo?.role) ? userInfo.role : [];
    if (roles.length > 0) localStorage.setItem('staffRoles', JSON.stringify(roles));
    else localStorage.removeItem('staffRoles');

    const staffProfile = {
      staffId: userInfo?.staffId ?? null,
      fullName: typeof userInfo?.fullName === 'string' ? userInfo.fullName : '',
      avatarUrl: typeof userInfo?.avatarUrl === 'string' ? userInfo.avatarUrl : '',
      role: roles,
    };
    if (staffProfile.staffId != null || staffProfile.fullName || staffProfile.avatarUrl) {
      localStorage.setItem('staffProfile', JSON.stringify(staffProfile));
    } else {
      localStorage.removeItem('staffProfile');
    }

    if (!tokenFromUrl && typeof userInfo?.token === 'string' && userInfo.token) {
      localStorage.setItem('authToken', userInfo.token);
    }
  } catch {
    // Ignore malformed info param
  }
};

const removeSsoParams = (search) => {
  const params = new URLSearchParams(search);
  params.delete('token');
  params.delete('info');
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

const maybeForceReloadAfterSso = ({ tokenFromUrl, infoFromUrl, cleanUrl }) => {
  const signature = `${tokenFromUrl || ''}|${infoFromUrl || ''}`;
  const last = sessionStorage.getItem('sso:lastSignature');
  if (last === signature) return;
  sessionStorage.setItem('sso:lastSignature', signature);
  globalThis.location.replace(cleanUrl);
};

const StaffLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get('token');
    const infoFromUrl = params.get('info');
    if (!tokenFromUrl && !infoFromUrl) return;

    persistStaffSessionFromSso({ tokenFromUrl, infoFromUrl });
    const nextSearch = removeSsoParams(location.search);
    const cleanUrl = `${location.pathname}${nextSearch}`;
    maybeForceReloadAfterSso({ tokenFromUrl, infoFromUrl, cleanUrl });

    // Fallback (should be reached only if reload is suppressed)
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="staffLayout">
      <SideBar />
      <main className="staffLayout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
