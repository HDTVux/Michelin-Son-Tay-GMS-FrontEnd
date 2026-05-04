import { useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BlogFormModal from './BlogFormModal.jsx';
import ServiceFormModal from './ServiceFormModal.jsx';

const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const SERVICE_LINK_CACHE_KEY = 'gms_service_link_cache_v3';

const writeServiceLinkCache = (catalogItemId, serviceId) => {
  if (typeof window === 'undefined') return;
  const safeCatalogItemId = toPositiveNumber(catalogItemId);
  const safeServiceId = toPositiveNumber(serviceId);
  if (safeCatalogItemId == null || safeServiceId == null) return;
  try {
    const raw = window.localStorage.getItem(SERVICE_LINK_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === 'object' ? parsed : {};
    next[String(safeCatalogItemId)] = safeServiceId;
    window.localStorage.setItem(SERVICE_LINK_CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore cache errors.
  }
};

export default function BlogFormPage({ itemType = 'PART' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const normalizedItemType = String(itemType || '').trim().toUpperCase() === 'SERVICE' ? 'SERVICE' : 'PART';
  const backPath = normalizedItemType === 'SERVICE' ? '/service-management' : '/part-management';
  const routeItemId = toPositiveNumber(itemId);

  const routeState = location.state && typeof location.state === 'object' ? location.state : {};
  const mode = routeState.mode || searchParams.get('mode') || 'createFromCatalog';
  const item = useMemo(() => {
    const stateItem = routeState.item && typeof routeState.item === 'object' ? routeState.item : {};
    return {
      ...stateItem,
      itemId: toPositiveNumber(stateItem.itemId) ?? routeItemId,
      itemType: stateItem.itemType || normalizedItemType,
    };
  }, [normalizedItemType, routeItemId, routeState.item]);

  const handleBack = () => {
    navigate(backPath);
  };

  const handleSaved = (savedData) => {
    writeServiceLinkCache(savedData?.catalogItemId ?? item.itemId, savedData?.serviceServiceId);
    navigate(backPath, { replace: true });
  };

  const FormComponent = normalizedItemType === 'SERVICE' ? ServiceFormModal : BlogFormModal;

  return (
    <FormComponent
      item={item}
      mode={mode}
      onClose={handleBack}
      onSaved={handleSaved}
      pageMode
    />
  );
}
