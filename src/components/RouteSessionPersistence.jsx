import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_STATE_PREFIX = 'routeState.v2:';
const MAX_PERSISTED_FIELDS = 350;
const RESTORE_RETRY_DELAYS = [0, 180, 560, 1200];
const SAVE_DEBOUNCE_MS = 320;
const SAVE_DEBOUNCE_SCROLL_MS = 700;
const escapeSelectorValue = (value) => String(value || '').replaceAll('\\', '\\\\').replaceAll('"', '\\"');

const encodeKeyPart = (value) => encodeURIComponent(String(value || ''));
const decodeKeyPart = (value) => decodeURIComponent(String(value || ''));

const buildElementKey = (el, fallbackIndex) => {
  const id = el.getAttribute('id');
  if (id) return `id:${encodeKeyPart(id)}`;

  const name = el.getAttribute('name');
  if (name) {
    const tag = el.tagName.toLowerCase();
    const selector = `${tag}[name="${escapeSelectorValue(name)}"]`;
    const siblings = Array.from(document.querySelectorAll(selector));
    const idx = siblings.indexOf(el);
    return `name:${encodeKeyPart(tag)}:${encodeKeyPart(name)}:${idx}`;
  }

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) {
    const tag = el.tagName.toLowerCase();
    const selector = `${tag}[placeholder="${escapeSelectorValue(placeholder)}"]`;
    const siblings = Array.from(document.querySelectorAll(selector));
    const idx = siblings.indexOf(el);
    return `placeholder:${encodeKeyPart(tag)}:${encodeKeyPart(placeholder)}:${idx}`;
  }

  return `index:${fallbackIndex}`;
};

const resolveElementByKey = (key) => {
  if (key.startsWith('id:')) {
    const id = decodeKeyPart(key.slice(3));
    return document.getElementById(id);
  }

  if (key.startsWith('name:')) {
    const [, tagRaw, nameRaw, idxRaw] = key.split(':');
    const tag = decodeKeyPart(tagRaw);
    const name = decodeKeyPart(nameRaw);
    const idx = Number(idxRaw);
    const selector = `${tag}[name="${escapeSelectorValue(name)}"]`;
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes[idx] || null;
  }

  if (key.startsWith('placeholder:')) {
    const [, tagRaw, placeholderRaw, idxRaw] = key.split(':');
    const tag = decodeKeyPart(tagRaw);
    const placeholder = decodeKeyPart(placeholderRaw);
    const idx = Number(idxRaw);
    const selector = `${tag}[placeholder="${escapeSelectorValue(placeholder)}"]`;
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes[idx] || null;
  }

  if (key.startsWith('index:')) {
    const idx = Number(key.slice(6));
    const nodes = Array.from(document.querySelectorAll('input,select,textarea'));
    return nodes[idx] || null;
  }

  return null;
};

const takePageSnapshot = () => {
  const fields = [];
  const nodes = Array.from(document.querySelectorAll('input,select,textarea'));

  for (let i = 0; i < nodes.length; i += 1) {
    if (fields.length >= MAX_PERSISTED_FIELDS) break;

    const el = nodes[i];
    const tag = el.tagName.toLowerCase();
    const key = buildElementKey(el, i);

    if (el instanceof HTMLInputElement) {
      const type = (el.type || 'text').toLowerCase();
      if (type === 'password' || type === 'file' || type === 'hidden') continue;
      if (type === 'checkbox' || type === 'radio') {
        fields.push({ key, tag, type, checked: el.checked });
      } else {
        fields.push({ key, tag, type, value: el.value });
      }
      continue;
    }

    if (el instanceof HTMLTextAreaElement) {
      fields.push({ key, tag, type: 'textarea', value: el.value });
      continue;
    }

    if (el instanceof HTMLSelectElement) {
      if (el.multiple) {
        const selectedValues = Array.from(el.selectedOptions).map((opt) => opt.value);
        fields.push({ key, tag, type: 'select-multiple', values: selectedValues });
      } else {
        fields.push({ key, tag, type: 'select-one', value: el.value });
      }
    }
  }

  return {
    x: window.scrollX,
    y: window.scrollY,
    fields,
  };
};

const restorePageSnapshot = (snapshot, { restoreScroll = true } = {}) => {
  if (!snapshot || typeof snapshot !== 'object') return;

  const fields = Array.isArray(snapshot.fields) ? snapshot.fields : [];
  fields.forEach((item) => {
    const el = resolveElementByKey(item?.key || '');
    if (!el) return;

    if (el instanceof HTMLInputElement) {
      const type = (el.type || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        const nextChecked = Boolean(item?.checked);
        if (el.checked !== nextChecked) {
          el.checked = nextChecked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      const nextValue = item?.value ?? '';
      if (el.value !== String(nextValue)) {
        el.value = String(nextValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    if (el instanceof HTMLTextAreaElement) {
      const nextValue = item?.value ?? '';
      if (el.value !== String(nextValue)) {
        el.value = String(nextValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    if (el instanceof HTMLSelectElement) {
      if (el.multiple && Array.isArray(item?.values)) {
        const values = new Set(item.values.map((v) => String(v)));
        let changed = false;
        Array.from(el.options).forEach((opt) => {
          const nextSelected = values.has(String(opt.value));
          if (opt.selected !== nextSelected) {
            opt.selected = nextSelected;
            changed = true;
          }
        });
        if (changed) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        const nextValue = String(item?.value ?? '');
        const optionExists = Array.from(el.options).some((opt) => opt.value === nextValue);
        if (optionExists && el.value !== nextValue) {
          el.value = nextValue;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  if (restoreScroll) {
    const x = Number(snapshot?.x) || 0;
    const y = Number(snapshot?.y) || 0;
    window.scrollTo(x, y);
  }
};

export default function RouteSessionPersistence() {
  const location = useLocation();
  const timerRef = useRef(null);
  const isRestoringRef = useRef(false);
  const restoreTimersRef = useRef([]);
  const lastScrollSaveRef = useRef(0);
  const userScrolledDuringRestoreRef = useRef(false);

  useEffect(() => {
    // Some routes (like create forms) should always start from defaults.
    // Disable persistence entirely for those paths.
    const disabledPaths = new Set([
      '/create-booking',
      '/part-management/create-product',
      '/queue-management',
    ]);

    if (disabledPaths.has(location.pathname)) {
      try {
        const prefix = `${ROUTE_STATE_PREFIX}${location.pathname}`;
        for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
          const k = sessionStorage.key(i);
          if (k?.startsWith(prefix)) sessionStorage.removeItem(k);
        }
      } catch {
        // ignore storage failures
      }
      return () => {
        // no-op
      };
    }

    const routeKey = `${location.pathname}${location.search}${location.hash || ''}`;
    const storageKey = `${ROUTE_STATE_PREFIX}${routeKey}`;
    const allowScrollRestore = location.pathname !== '/services';

    const save = () => {
      if (isRestoringRef.current) return;
      try {
        const snapshot = takePageSnapshot();
        sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // ignore storage write failures
      }
    };

    const scheduleSave = (delay = SAVE_DEBOUNCE_MS) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(save, delay);
    };

    const scheduleSaveFromScroll = () => {
      const now = Date.now();
      if (now - lastScrollSaveRef.current < SAVE_DEBOUNCE_SCROLL_MS) return;
      lastScrollSaveRef.current = now;
      scheduleSave(SAVE_DEBOUNCE_SCROLL_MS);
    };

    const restoreOnce = ({ restoreScroll = true } = {}) => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return null;
        const snapshot = JSON.parse(raw);
        restorePageSnapshot(snapshot, { restoreScroll });
        return snapshot;
      } catch {
        // ignore parse/restore failures
        return null;
      }
    };

    const restoreWithRetries = () => {
      isRestoringRef.current = true;
      userScrolledDuringRestoreRef.current = false;
      restoreTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      let lastRestoredX = window.scrollX;
      let lastRestoredY = window.scrollY;
      restoreTimersRef.current = RESTORE_RETRY_DELAYS.map((delay, index) => (
        window.setTimeout(() => {
          const currentX = window.scrollX;
          const currentY = window.scrollY;
          const userMovedScroll = index > 0 && (
            Math.abs(currentX - lastRestoredX) > 2 || Math.abs(currentY - lastRestoredY) > 2
          );
          if (userMovedScroll) userScrolledDuringRestoreRef.current = true;
          const shouldRestoreScroll = allowScrollRestore && !userScrolledDuringRestoreRef.current;
          const snapshot = restoreOnce({ restoreScroll: shouldRestoreScroll });
          if (shouldRestoreScroll && snapshot) {
            lastRestoredX = window.scrollX;
            lastRestoredY = window.scrollY;
          }
          if (delay === RESTORE_RETRY_DELAYS[RESTORE_RETRY_DELAYS.length - 1]) {
            isRestoringRef.current = false;
          }
        }, delay)
      ));
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(restoreWithRetries);
    });

    const onBeforeUnload = () => save();
    const onPageHide = () => save();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save();
    };

    const onInput = () => scheduleSave(SAVE_DEBOUNCE_MS);
    const onChange = () => scheduleSave(SAVE_DEBOUNCE_MS);

    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onChange, true);
    window.addEventListener('scroll', scheduleSaveFromScroll, { passive: true });
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timerRef.current);
      restoreTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      restoreTimersRef.current = [];
      save();
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onChange, true);
      window.removeEventListener('scroll', scheduleSaveFromScroll);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
