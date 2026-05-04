import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const INTENT_TTL_MS = 1600;
const MIN_LOADING_MS = 260;
const MAX_LOADING_MS = 15000;

const findButton = (target) => {
  if (!target || typeof target.closest !== 'function') return null;
  return target.closest('button');
};

const canTrackButton = (button) => {
  if (!button) return false;
  if (button.disabled) return false;
  if (button.dataset?.gmsNoGlobalLoading === 'true') return false;
  if (button.closest?.('[data-gms-no-global-loading="true"]')) return false;
  return true;
};

export default function GlobalRequestButtonLoading() {
  const intentRef = useRef({ button: null, at: 0 });
  const loadingCountRef = useRef(0);
  const loadingStartedAtRef = useRef(0);
  const hideTimerRef = useRef(null);
  const forceHideTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (forceHideTimerRef.current) {
        window.clearTimeout(forceHideTimerRef.current);
        forceHideTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return undefined;

    const showOverlay = () => {
      loadingCountRef.current += 1;
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (loadingCountRef.current === 1) {
        loadingStartedAtRef.current = Date.now();
        if (mountedRef.current) setVisible(true);
        if (forceHideTimerRef.current) window.clearTimeout(forceHideTimerRef.current);
        forceHideTimerRef.current = window.setTimeout(() => {
          loadingCountRef.current = 0;
          forceHideTimerRef.current = null;
          if (mountedRef.current) setVisible(false);
        }, MAX_LOADING_MS);
      }
    };

    const hideOverlay = () => {
      loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
      if (loadingCountRef.current > 0) return;

      if (forceHideTimerRef.current) {
        window.clearTimeout(forceHideTimerRef.current);
        forceHideTimerRef.current = null;
      }

      const elapsed = Date.now() - loadingStartedAtRef.current;
      const remaining = Number.isFinite(elapsed) ? Math.max(0, MIN_LOADING_MS - elapsed) : 0;
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null;
        if (loadingCountRef.current === 0 && mountedRef.current) setVisible(false);
      }, remaining);
    };

    const rememberIntent = (button) => {
      if (!canTrackButton(button)) return;
      intentRef.current = { button, at: Date.now() };
    };

    const onPointerDown = (event) => {
      rememberIntent(findButton(event.target));
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      rememberIntent(findButton(event.target));
    };

    const onSubmit = (event) => {
      rememberIntent(event.submitter || findButton(document.activeElement));
    };

    const originalFetch = window.fetch;
    const wrappedFetch = async (...args) => {
      const { button, at } = intentRef.current || {};
      const shouldShowOverlay = Date.now() - at <= INTENT_TTL_MS && canTrackButton(button);
      if (shouldShowOverlay) showOverlay();

      try {
        return await originalFetch(...args);
      } finally {
        if (shouldShowOverlay) hideOverlay();
      }
    };

    window.fetch = wrappedFetch;
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('submit', onSubmit, true);

    return () => {
      if (window.fetch === wrappedFetch) window.fetch = originalFetch;
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div className="global-request-loading" role="status" aria-live="polite" aria-label="Loading">
      <div className="global-request-loading__panel">
        <div className="global-request-loading__spinner" aria-hidden="true" />
        <div className="global-request-loading__text">Loading...</div>
      </div>
    </div>,
    document.body,
  );
}
