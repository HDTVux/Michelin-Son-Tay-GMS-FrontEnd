import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'staffMobileNavbarDock';
const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 10;
const BAR_SIZE = 64;
const COLLAPSED_SIZE = 52;
const MARGIN = 16;

const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const savePrefs = (prefs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota / private-mode errors
  }
};

const getSafeAreaInset = (side) => {
  if (typeof window === 'undefined' || !window.CSS?.supports?.(`padding-${side}`, 'env(safe-area-inset-top)')) return 0;
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style[`padding${side.charAt(0).toUpperCase()}${side.slice(1)}`] = `env(safe-area-inset-${side})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe)[`padding${side.charAt(0).toUpperCase()}${side.slice(1)}`]) || 0;
  document.body.removeChild(probe);
  return value;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const VALID_EDGES = new Set(['top', 'bottom', 'left', 'right']);

/**
 * Drag-to-redock + collapse behavior for a floating mobile bar.
 * Long-press (not a separate handle) starts the drag so normal taps on
 * child buttons keep working; releasing snaps to the nearest screen edge.
 */
export const useDraggableDock = () => {
  const initial = useMemo(() => loadPrefs(), []);
  const [edge, setEdge] = useState(VALID_EDGES.has(initial?.edge) ? initial.edge : 'bottom');
  const [verticalOffset, setVerticalOffset] = useState(
    typeof initial?.verticalOffset === 'number' ? initial.verticalOffset : null,
  );
  const [collapsed, setCollapsed] = useState(Boolean(initial?.collapsed));
  const [dragPos, setDragPos] = useState(null); // { x, y } top-left while dragging
  const [previewEdge, setPreviewEdge] = useState(null);

  const containerRef = useRef(null);
  const longPressTimer = useRef(null);
  const pointerStart = useRef(null);
  const grabOffset = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  // Hold the latest handlers so add/remove listener pairs always match,
  // without the two callbacks needing to reference each other directly.
  const handlePointerMoveRef = useRef(null);
  const handlePointerUpRef = useRef(null);

  const barSize = collapsed ? COLLAPSED_SIZE : BAR_SIZE;

  const clampVerticalOffset = useCallback((value) => {
    const viewportH = window.innerHeight;
    const min = MARGIN + getSafeAreaInset('top');
    const max = viewportH - barSize - MARGIN - getSafeAreaInset('bottom');
    return clamp(value, min, max);
  }, [barSize]);

  useEffect(() => {
    savePrefs({ edge, verticalOffset, collapsed });
  }, [edge, verticalOffset, collapsed]);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const nearestEdgeFromRect = useCallback((left, top) => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cx = left + barSize / 2;
    const cy = top + barSize / 2;
    const distances = {
      top: cy,
      bottom: viewportH - cy,
      left: cx,
      right: viewportW - cx,
    };
    return Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
  }, [barSize]);

  const handlePointerMove = useCallback((event) => {
    if (!pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;

    if (!didDragRef.current) {
      if (Math.abs(dx) > MOVE_CANCEL_PX || Math.abs(dy) > MOVE_CANCEL_PX) {
        clearLongPressTimer();
      }
      return;
    }

    event.preventDefault();
    const nextX = event.clientX - grabOffset.current.x;
    const nextY = event.clientY - grabOffset.current.y;
    setDragPos({ x: nextX, y: nextY });
    setPreviewEdge(nearestEdgeFromRect(nextX, nextY));
  }, [nearestEdgeFromRect]);

  const handlePointerUp = useCallback((event) => {
    clearLongPressTimer();
    window.removeEventListener('pointermove', handlePointerMoveRef.current);
    window.removeEventListener('pointerup', handlePointerUpRef.current);
    window.removeEventListener('pointercancel', handlePointerUpRef.current);

    if (didDragRef.current) {
      const nextX = event.clientX - grabOffset.current.x;
      const nextY = event.clientY - grabOffset.current.y;
      const nextEdge = nearestEdgeFromRect(nextX, nextY);
      if (nextEdge === 'left' || nextEdge === 'right') {
        setVerticalOffset(clampVerticalOffset(nextY));
      }
      setEdge(nextEdge);
      setDragPos(null);
      setPreviewEdge(null);
      // Swallow the synthetic click pointerup would otherwise fire on
      // whatever nav button sits under the release point.
      setTimeout(() => { didDragRef.current = false; }, 0);
    }
    pointerStart.current = null;
  }, [nearestEdgeFromRect, clampVerticalOffset]);

  useLayoutEffect(() => {
    handlePointerMoveRef.current = handlePointerMove;
    handlePointerUpRef.current = handlePointerUp;
  });

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    pointerStart.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;

    const rect = el.getBoundingClientRect();
    grabOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      didDragRef.current = true;
      setDragPos({ x: rect.left, y: rect.top });
      setPreviewEdge(edge);
      if (navigator.vibrate) navigator.vibrate(12);
    }, LONG_PRESS_MS);

    window.addEventListener('pointermove', handlePointerMoveRef.current, { passive: false });
    window.addEventListener('pointerup', handlePointerUpRef.current);
    window.addEventListener('pointercancel', handlePointerUpRef.current);
  }, [edge]);

  const handleClickCapture = useCallback((event) => {
    if (didDragRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setVerticalOffset((prev) => (prev == null ? prev : clampVerticalOffset(prev)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampVerticalOffset]);

  useEffect(() => () => {
    clearLongPressTimer();
    window.removeEventListener('pointermove', handlePointerMoveRef.current);
    window.removeEventListener('pointerup', handlePointerUpRef.current);
    window.removeEventListener('pointercancel', handlePointerUpRef.current);
  }, []);

  const dockStyle = useMemo(() => {
    const transition = 'left .25s ease, right .25s ease, top .25s ease, bottom .25s ease, width .25s ease, height .25s ease';

    if (dragPos) {
      return {
        position: 'fixed',
        left: `${dragPos.x}px`,
        top: `${dragPos.y}px`,
        right: 'auto',
        bottom: 'auto',
        transition: 'none',
      };
    }

    if (edge === 'top' || edge === 'bottom') {
      const edgeInset = `${MARGIN + getSafeAreaInset(edge)}px`;
      if (collapsed) {
        return {
          position: 'fixed',
          [edge]: edgeInset,
          right: `${MARGIN + getSafeAreaInset('right')}px`,
          left: 'auto',
          top: edge === 'top' ? edgeInset : 'auto',
          bottom: edge === 'bottom' ? edgeInset : 'auto',
          transition,
        };
      }
      return {
        position: 'fixed',
        [edge]: edgeInset,
        left: `${MARGIN + getSafeAreaInset('left')}px`,
        right: `${MARGIN + getSafeAreaInset('right')}px`,
        top: edge === 'top' ? edgeInset : 'auto',
        bottom: edge === 'bottom' ? edgeInset : 'auto',
        transition,
      };
    }

    const fallbackOffset = window.innerHeight / 2 - barSize / 2;
    const top = clampVerticalOffset(verticalOffset ?? fallbackOffset);
    return {
      position: 'fixed',
      [edge]: `${MARGIN + getSafeAreaInset(edge)}px`,
      top: `${top}px`,
      bottom: 'auto',
      transition,
    };
  }, [dragPos, edge, collapsed, verticalOffset, clampVerticalOffset, barSize]);

  return {
    containerRef,
    edge,
    collapsed,
    isDragging: Boolean(dragPos),
    previewEdge,
    dockStyle,
    toggleCollapsed,
    dragHandlers: { onPointerDown: handlePointerDown, onClickCapture: handleClickCapture },
  };
};

export default useDraggableDock;
