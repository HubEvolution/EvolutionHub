'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useCompareInteractions = useCompareInteractions;
const react_1 = require('react');
// Interaction constants
const SLIDER_STEP = 5;
const SLIDER_STEP_SHIFT = 10;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const LOUPE_SIZE_MIN = 120;
const LOUPE_SIZE_MAX = 300;
const LOUPE_SIZE_STEP = 10;
const LOUPE_FACTOR_MIN = 1.5;
const LOUPE_FACTOR_MAX = 4;
const LOUPE_FACTOR_STEP = 0.1;
function useCompareInteractions(props) {
  const {
    containerRef,
    boxSize,
    setSliderPos,
    isHeld,
    setIsHeld,
    zoom,
    setZoom,
    pan,
    setPan,
    loupeEnabled,
    setLoupeEnabled,
    loupeSize,
    setLoupeSize,
    loupeFactor,
    setLoupeFactor,
    setLoupePos,
    setLoupeUiHint,
    compareVisible,
  } = props;
  const clamp = (0, react_1.useCallback)((val, min, max) => Math.min(max, Math.max(min, val)), []);
  const clampRound = (0, react_1.useCallback)((z) => {
    const v = Number.isFinite(z) ? z : ZOOM_MIN;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v * 100) / 100));
  }, []);
  const updateFromClientX = (0, react_1.useCallback)(
    (clientX) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      setSliderPos((prev) => {
        const next = clamp(Math.round(ratio * 100), 0, 100);
        return next === prev ? prev : next;
      });
    },
    [clamp, containerRef, setSliderPos]
  );
  const onMouseDown = (0, react_1.useCallback)(
    (e) => {
      draggingRef.current = true;
      updateFromClientX(e.clientX);
      const onMove = (ev) => {
        if (!draggingRef.current) return;
        updateFromClientX(ev.clientX);
      };
      const onUp = () => {
        draggingRef.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [updateFromClientX]
  );
  const onTouchStart = (0, react_1.useCallback)(
    (e) => {
      draggingRef.current = true;
      const t0 = e.touches[0];
      if (t0) {
        updateFromClientX(t0.clientX);
        touchStartPosRef.current = { x: t0.clientX, y: t0.clientY };
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = window.setTimeout(() => setIsHeld(true), 350);
      }
      const onMove = (ev) => {
        if (!draggingRef.current) return;
        const t = ev.touches[0];
        if (t) {
          updateFromClientX(t.clientX);
          const start = touchStartPosRef.current;
          if (start) {
            const dx = Math.abs(t.clientX - start.x);
            const dy = Math.abs(t.clientY - start.y);
            if (dx > 8 || dy > 8) {
              if (holdTimerRef.current) {
                window.clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
              }
              if (isHeld) setIsHeld(false);
            }
          }
        }
      };
      const onEnd = () => {
        draggingRef.current = false;
        if (holdTimerRef.current) {
          window.clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (isHeld) setIsHeld(false);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
      };
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    },
    [isHeld, setIsHeld, updateFromClientX]
  );
  const onHandleKeyDown = (0, react_1.useCallback)(
    (e) => {
      const fine = e.shiftKey ? SLIDER_STEP_SHIFT : SLIDER_STEP;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSliderPos((v) => clamp(v - fine, 0, 100));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSliderPos((v) => clamp(v + fine, 0, 100));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setSliderPos(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setSliderPos(100);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        setSliderPos(50);
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => clampRound(z + ZOOM_STEP));
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((z) => clampRound(z - ZOOM_STEP));
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        setZoom(1);
        return;
      }
    },
    [clamp, clampRound, setSliderPos, setZoom]
  );
  const zoomRef = (0, react_1.useRef)(zoom);
  const panRef = (0, react_1.useRef)(pan);
  const basePanRef = (0, react_1.useRef)(pan);
  const pointersRef = (0, react_1.useRef)(new Map());
  const dragStartRef = (0, react_1.useRef)(null);
  const pinchStartRef = (0, react_1.useRef)(null);
  const lastPointerRef = (0, react_1.useRef)(null);
  const draggingRef = (0, react_1.useRef)(false);
  const holdTimerRef = (0, react_1.useRef)(null);
  const touchStartPosRef = (0, react_1.useRef)(null);
  const loupeRafRef = (0, react_1.useRef)(null);
  const pendingLoupePosRef = (0, react_1.useRef)(null);
  (0, react_1.useEffect)(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  (0, react_1.useEffect)(() => {
    panRef.current = pan;
  }, [pan]);
  (0, react_1.useEffect)(() => {
    basePanRef.current = pan;
  }, [pan]);
  const applyZoomAround = (0, react_1.useCallback)(
    (direction, pivot) => {
      const s1 = zoomRef.current;
      const s2 = clampRound(s1 + (direction === 1 ? ZOOM_STEP : -ZOOM_STEP));
      if (s2 === s1) return;
      const T = panRef.current;
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const C = pivot ?? (rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 });
      const ratio = s2 / s1;
      const Tx = (1 - ratio) * C.x + ratio * T.x;
      const Ty = (1 - ratio) * C.y + ratio * T.y;
      setPan({ x: Math.round(Tx), y: Math.round(Ty) });
      setZoom(s2);
    },
    [clampRound, containerRef, setPan, setZoom]
  );
  const onZoomIn = (0, react_1.useCallback)(() => {
    applyZoomAround(1, lastPointerRef.current);
  }, [applyZoomAround]);
  const onZoomOut = (0, react_1.useCallback)(() => {
    applyZoomAround(-1, lastPointerRef.current);
  }, [applyZoomAround]);
  const onZoomReset = (0, react_1.useCallback)(() => {
    setZoom(1);
  }, [setZoom]);
  // Native wheel listener for non-passive control
  (0, react_1.useEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (ev) => {
      ev.preventDefault();
      if (ev.shiftKey) {
        setLoupeSize((prev) => {
          const next = Math.max(
            LOUPE_SIZE_MIN,
            Math.min(
              LOUPE_SIZE_MAX,
              Math.round(prev + (ev.deltaY < 0 ? LOUPE_SIZE_STEP : -LOUPE_SIZE_STEP))
            )
          );
          setLoupeUiHint(`Size: ${next}px`);
          return next;
        });
        return;
      }
      if (ev.altKey) {
        setLoupeFactor((prev) => {
          const next = Math.max(
            LOUPE_FACTOR_MIN,
            Math.min(
              LOUPE_FACTOR_MAX,
              Math.round((prev + (ev.deltaY < 0 ? LOUPE_FACTOR_STEP : -LOUPE_FACTOR_STEP)) * 10) /
                10
            )
          );
          setLoupeUiHint(`×${next.toFixed(1)}`);
          return next;
        });
        return;
      }
      const rect = el.getBoundingClientRect();
      const pivot = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      applyZoomAround(ev.deltaY < 0 ? 1 : -1, pivot);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [containerRef, applyZoomAround, setLoupeFactor, setLoupeSize, setLoupeUiHint]);
  // Pointer events: pinch-to-zoom and drag pan
  (0, react_1.useEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    const getPoint = (e) => {
      const rect = el.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const centerOf = (a, b) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    const onPointerDown = (e) => {
      const t = e.target;
      if (t && t.closest('[role="slider"]')) return;
      el.setPointerCapture(e.pointerId);
      const p = getPoint(e);
      pointersRef.current.set(e.pointerId, p);
      if (pointersRef.current.size === 1) {
        if (zoomRef.current > 1) {
          dragStartRef.current = p;
          basePanRef.current = panRef.current;
        }
      } else if (pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        const c = centerOf(pts[0], pts[1]);
        const d = distance(pts[0], pts[1]);
        pinchStartRef.current = {
          dist: Math.max(1, d),
          center: c,
          zoom: zoomRef.current,
          pan: panRef.current,
        };
      }
    };
    const onPointerMove = (e) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const p = getPoint(e);
      pointersRef.current.set(e.pointerId, p);
      const count = pointersRef.current.size;
      if (count >= 2 && pinchStartRef.current) {
        const pts = Array.from(pointersRef.current.values());
        const d = distance(pts[0], pts[1]);
        const c = centerOf(pts[0], pts[1]);
        const s1 = pinchStartRef.current.zoom;
        const ratioRaw = Math.max(0.2, Math.min(5, d / pinchStartRef.current.dist));
        const s2 = clampRound(s1 * ratioRaw);
        const T0 = pinchStartRef.current.pan;
        const ratio = s2 / s1;
        const Tx = (1 - ratio) * c.x + ratio * T0.x;
        const Ty = (1 - ratio) * c.y + ratio * T0.y;
        setZoom(s2);
        setPan({ x: Math.round(Tx), y: Math.round(Ty) });
        lastPointerRef.current = c;
      } else if (count === 1 && dragStartRef.current && zoomRef.current > 1) {
        const p0 = dragStartRef.current;
        const dx = p.x - p0.x;
        const dy = p.y - p0.y;
        const base = basePanRef.current;
        setPan({ x: Math.round(base.x + dx), y: Math.round(base.y + dy) });
        lastPointerRef.current = p;
      }
    };
    const endPointer = (e) => {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.delete(e.pointerId);
      }
      if (pointersRef.current.size < 2) pinchStartRef.current = null;
      if (pointersRef.current.size === 0) dragStartRef.current = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture release failures
      }
    };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endPointer);
      el.removeEventListener('pointercancel', endPointer);
    };
  }, [clampRound, containerRef, setPan, setZoom]);
  // Clear loupe hint shortly after change
  (0, react_1.useEffect)(() => {
    if (!compareVisible) return;
    const t = window.setTimeout(() => setLoupeUiHint(null), 1200);
    return () => window.clearTimeout(t);
  }, [loupeFactor, loupeSize, setLoupeUiHint, compareVisible]);
  const onMouseMoveLoupe = (0, react_1.useCallback)(
    (e) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const r = ((loupeSize || 160) / 2) | 0;
      const maxX = (boxSize?.w ?? rect.width) - r;
      const maxY = (boxSize?.h ?? rect.height) - r;
      const x = clamp(Math.round(rawX), r, maxX);
      const y = clamp(Math.round(rawY), r, maxY);
      lastPointerRef.current = { x, y };
      if (!loupeEnabled) return;
      pendingLoupePosRef.current = { x, y };
      if (loupeRafRef.current != null) return;
      loupeRafRef.current = requestAnimationFrame(() => {
        loupeRafRef.current = null;
        const p = pendingLoupePosRef.current;
        if (p) setLoupePos(p);
      });
    },
    [containerRef, boxSize, clamp, loupeEnabled, loupeSize, setLoupePos]
  );
  const onMouseLeaveLoupe = (0, react_1.useCallback)(() => {
    if (!loupeEnabled) return;
    setLoupePos(null);
  }, [loupeEnabled, setLoupePos]);
  const onToggleLoupe = (0, react_1.useCallback)(
    () => setLoupeEnabled((v) => !v),
    [setLoupeEnabled]
  );
  // Global Space key Press-and-Hold to show 100% Before
  (0, react_1.useEffect)(() => {
    if (!compareVisible) return;
    const isEditable = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (el.isContentEditable) return true;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
    };
    const onKeyDown = (e) => {
      if (!compareVisible) return;
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target;
        if (isEditable(target)) return;
        e.preventDefault();
        setIsHeld(true);
      }
    };
    const onKeyUp = (e) => {
      if (!compareVisible) return;
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target;
        if (isEditable(target)) return;
        e.preventDefault();
        setIsHeld(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [compareVisible, setIsHeld]);
  // Cleanup any pending rAF
  (0, react_1.useEffect)(() => {
    return () => {
      if (loupeRafRef.current != null) cancelAnimationFrame(loupeRafRef.current);
      loupeRafRef.current = null;
      pendingLoupePosRef.current = null;
    };
  }, []);
  return {
    onMouseDown,
    onTouchStart,
    onHandleKeyDown,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onMouseMoveLoupe,
    onMouseLeaveLoupe,
    onToggleLoupe,
  };
}
