import React, { useState, useEffect, useCallback, useRef } from 'react';
import DebugPanel from './DebugPanel';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;
const MIN_HEIGHT = 200;
const MAX_HEIGHT_VH = 90; // 90% of viewport height
const DEFAULT_HEIGHT = 400;
const GRID = 8; // grid snapping size

// Route-scoped LocalStorage helpers to avoid cross-route clashes
const keyPrefix = typeof window !== 'undefined' ? `debugPanel:${window.location.pathname}:` : 'debugPanel:';
const getLS = (key: string) => {
  try {
    return localStorage.getItem(keyPrefix + key) ?? localStorage.getItem('debugPanel.' + key);
  } catch {
    return null;
  }
};
const setLS = (key: string, value: string) => {
  try {
    localStorage.setItem(keyPrefix + key, value);
  } catch {
    /* noop */
  }
};

type PanelMode = 'floating' | 'rightDock' | 'bottomSheet';

const DebugPanelOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const v = getLS('isOpen');
      return v === 'true';
    } catch {
      return false;
    }
  });

  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    try {
      const saved = getLS('width');
      return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });

  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_HEIGHT;
    try {
      const saved = getLS('height');
      return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [minTop, setMinTop] = useState(56);
  const [dragCandidate, setDragCandidate] = useState<{
    x: number; y: number; right: number; bottom: number;
  } | null>(null);
  const [right, setRight] = useState(() => {
    if (typeof window === 'undefined') return 16;
    try {
      const saved = getLS('right');
      if (!saved) return 16;
      const n = parseInt(saved, 10);
      return Number.isFinite(n) ? n : 16;
    } catch {
      return 16;
    }
  });
  const [bottom, setBottom] = useState(() => {
    if (typeof window === 'undefined') return 16;
    try {
      const saved = getLS('bottom');
      if (!saved) return 16;
      const n = parseInt(saved, 10);
      return Number.isFinite(n) ? n : 16;
    } catch {
      return 16;
    }
  });
  const dragStartRef = useRef<{ x: number; y: number; right: number; bottom: number } | null>(null);
  const [mode, setMode] = useState<PanelMode>(() => {
    if (typeof window === 'undefined') return 'floating';
    try {
      const m = getLS('mode') as PanelMode | null;
      return m === 'rightDock' || m === 'bottomSheet' ? m : 'floating';
    } catch { return 'floating'; }
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const prevLayoutRef = useRef<{ width: number; height: number; right: number; bottom: number } | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const resizeVerticalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      setLS('isOpen', String(newState));
      return newState;
    });
  }, []);

  // Avoid overlapping common fixed/sticky CTAs by nudging panel away
  const avoidOverlap = useCallback((currentRight: number, currentBottom: number) => {
    try {
      const panelRect = {
        left: Math.max(0, window.innerWidth - currentRight - width),
        top: Math.max(0, window.innerHeight - currentBottom - height),
        right: Math.max(0, window.innerWidth - currentRight),
        bottom: Math.max(0, window.innerHeight - currentBottom),
      };
      const selectors = 'button, a.btn, [data-avoid-debug], .toast, .fixed-cta, .sticky-cta';
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        const pos = style.position;
        if (pos !== 'fixed' && pos !== 'sticky') return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        // Only consider items near the panel corner (bottom-right by default)
        return r.top < panelRect.bottom && r.bottom > panelRect.top && r.left < panelRect.right && r.right > panelRect.left;
      });
      if (!candidates.length) return { right: currentRight, bottom: currentBottom };
      // Nudge away from the first overlapping element
      const r = candidates[0].getBoundingClientRect();
      const panelCenterX = (panelRect.left + panelRect.right) / 2;
      const panelCenterY = (panelRect.top + panelRect.bottom) / 2;
      const targetCenterX = (r.left + r.right) / 2;
      const targetCenterY = (r.top + r.bottom) / 2;
      let nextRight = currentRight;
      let nextBottom = currentBottom;
      const delta = 24; // nudge distance
      if (targetCenterX >= panelCenterX) {
        // push panel left (increase right)
        nextRight = Math.min(Math.max(8, currentRight + delta), Math.max(8, window.innerWidth - width - 8));
      } else {
        // push panel right (decrease right)
        nextRight = Math.max(8, currentRight - delta);
      }
      if (targetCenterY >= panelCenterY) {
        // push panel up (increase bottom)
        nextBottom = Math.min(Math.max(8, currentBottom + delta), Math.max(8, window.innerHeight - height - 8));
      } else {
        // push panel down (decrease bottom)
        nextBottom = Math.max(8, currentBottom - delta);
      }
      return { right: nextRight, bottom: nextBottom };
    } catch {
      return { right: currentRight, bottom: currentBottom };
    }
  }, [width, height]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setLS('isOpen', 'false');
  }, []);

  // Horizontal resize logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Vertical resize logic
  const handleVerticalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingVertical(true);
  }, []);

  // Drag positioning (drag by header controls bar)
  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore drags starting on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, label, kbd, svg, a, [role="button"], [role="listbox"]')) return;
    e.preventDefault();
    // start as candidate; require threshold before real dragging
    setDragCandidate({ x: e.clientX, y: e.clientY, right, bottom });
    dragStartRef.current = { x: e.clientX, y: e.clientY, right, bottom };
  }, [right, bottom]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Use current right offset to compute width correctly after dragging
      const newWidth = window.innerWidth - e.clientX - right;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setWidth(clampedWidth);
      setLS('width', String(clampedWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, right]);

  useEffect(() => {
    if (!isResizingVertical) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate height change (inverted: drag UP = taller, drag DOWN = shorter)
      // Use current bottom offset to compute height correctly after dragging
      const newHeight = window.innerHeight - e.clientY - bottom;
      const maxHeight = (window.innerHeight * MAX_HEIGHT_VH) / 100;
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, newHeight));
      setHeight(clampedHeight);
      try {
        localStorage.setItem('debugPanel.height', String(clampedHeight));
      } catch {
        /* noop */
      }
    };

    const handleMouseUp = () => {
      setIsResizingVertical(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVertical, bottom]);

  const [isResizingCorner, setIsResizingCorner] = useState(false);
  useEffect(() => {
    if (!isResizingCorner) return;
    const onMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX - right;
      const newHeight = window.innerHeight - e.clientY - bottom;
      const maxHeight = (window.innerHeight * MAX_HEIGHT_VH) / 100;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, newHeight));
      setWidth(clampedWidth);
      setHeight(clampedHeight);
      setLS('width', String(clampedWidth));
      setLS('height', String(clampedHeight));
    };
    const onUp = () => setIsResizingCorner(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
    return () => document.removeEventListener('mousemove', onMove);
  }, [isResizingCorner, right, bottom]);

  // Compute dynamic safe top margin to avoid overlapping sticky/fixed headers
  const computeMinTop = useCallback(() => {
    try {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('header, nav, .sticky, [data-sticky], .site-header'));
      let maxBottom = 56;
      for (const el of candidates) {
        const style = getComputedStyle(el);
        const pos = style.position;
        if (pos === 'fixed' || pos === 'sticky') {
          const r = el.getBoundingClientRect();
          if (r.top <= 0 && r.height > 0 && r.height < window.innerHeight * 0.5) {
            maxBottom = Math.max(maxBottom, r.bottom);
          }
        }
      }
      setMinTop(Math.min(Math.max(40, Math.round(maxBottom + 8)), Math.floor(window.innerHeight * 0.4)));
    } catch {}
  }, []);

  // Clamp position and size when viewport changes (e.g., address bar/DevTools resize)
  useEffect(() => {
    const clamp = () => {
      const minMargin = 8;
      // ensure header controls remain accessible
      const maxHeight = (window.innerHeight * MAX_HEIGHT_VH) / 100;
      const nextHeight = Math.min(height, maxHeight);
      if (nextHeight !== height) setHeight(nextHeight);

      const maxRight = Math.max(minMargin, window.innerWidth - width - minMargin);
      // additionally ensure top >= minTop → bottom <= window.innerHeight - height - minTop
      const maxBottomByTop = Math.max(minMargin, window.innerHeight - height - minTop);
      const maxBottom = Math.min(Math.max(minMargin, window.innerHeight - height - minMargin), maxBottomByTop);

      let nextRight = Math.min(Math.max(right, minMargin), maxRight);
      let nextBottom = Math.min(Math.max(bottom, minMargin), maxBottom);
      // Nudge away from overlapping CTAs
      const nudged = avoidOverlap(nextRight, nextBottom);
      nextRight = Math.min(Math.max(nudged.right, minMargin), maxRight);
      nextBottom = Math.min(Math.max(nudged.bottom, minMargin), maxBottom);
      if (nextRight !== right) setRight(nextRight);
      if (nextBottom !== bottom) setBottom(nextBottom);
    };
    // Run once on mount to normalize persisted values
    computeMinTop();
    clamp();
    window.addEventListener('resize', clamp);
    window.addEventListener('orientationchange', clamp);
    window.addEventListener('scroll', () => { computeMinTop(); clamp(); }, { passive: true });
    return () => {
      window.removeEventListener('resize', clamp);
      window.removeEventListener('orientationchange', clamp);
      window.removeEventListener('scroll', () => { computeMinTop(); clamp(); });
    };
  }, [width, height, right, bottom, minTop, computeMinTop]);

  const resetPosition = useCallback(() => {
    setRight(16);
    setBottom(16);
    setLS('right', '16');
    setLS('bottom', '16');
  }, []);

  // Maximize/restore toggling
  const toggleMaximize = useCallback(() => {
    if (!isMaximized) {
      prevLayoutRef.current = { width, height, right, bottom };
      setIsMaximized(true);
      const maxHeight = (window.innerHeight * MAX_HEIGHT_VH) / 100;
      setHeight(maxHeight);
      setWidth(Math.min(MAX_WIDTH, Math.round(window.innerWidth * 0.4)));
      setRight(GRID * 2);
      setBottom(GRID * 2);
    } else {
      const prev = prevLayoutRef.current;
      setIsMaximized(false);
      if (prev) {
        setWidth(prev.width);
        setHeight(prev.height);
        setRight(prev.right);
        setBottom(prev.bottom);
      }
    }
  }, [isMaximized, width, height, right, bottom]);

  // Persist mode
  useEffect(() => {
    try { localStorage.setItem('debugPanel.mode', mode); } catch {/* noop */}
  }, [mode]);

  useEffect(() => {
    if (!isDragging && !dragCandidate) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      // promote candidate to real dragging after threshold
      if (!isDragging && dragCandidate) {
        const ddx = e.clientX - dragCandidate.x;
        const ddy = e.clientY - dragCandidate.y;
        if (Math.hypot(ddx, ddy) >= 6) {
          setIsDragging(true);
        } else {
          return; // do nothing until threshold crossed
        }
      }
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const maxRight = Math.max(8, window.innerWidth - width - 8);
      const maxBottom = Math.max(8, window.innerHeight - height - 8);
      const newRight = Math.min(maxRight, Math.max(8, dragStartRef.current.right - dx));
      const newBottom = Math.min(maxBottom, Math.max(8, dragStartRef.current.bottom - dy));
      setRight(newRight);
      setBottom(newBottom);
    };
    const handleMouseUp = () => {
      // snap to GRID and to nearest edges (left/top/right/bottom) if within 16px
      const minMargin = 8;
      let newRight = Math.max(minMargin, Math.round(right / GRID) * GRID);
      let newBottom = Math.max(minMargin, Math.round(bottom / GRID) * GRID);
      const leftDist = Math.max(0, window.innerWidth - width - newRight);
      const topDist = Math.max(0, window.innerHeight - height - newBottom);
      if (leftDist < 16) {
        newRight = Math.max(minMargin, window.innerWidth - width - GRID);
      }
      if (topDist < 16) {
        newBottom = Math.max(minMargin, window.innerHeight - height - GRID);
      }
      // clamp to viewport
      const maxRight = Math.max(minMargin, window.innerWidth - width - minMargin);
      let maxBottom = Math.max(minMargin, window.innerHeight - height - minMargin);
      // enforce minTop for header controls
      maxBottom = Math.min(maxBottom, Math.max(minMargin, window.innerHeight - height - minTop));
      // Nudge away from overlapping elements on release
      const nudged2 = avoidOverlap(newRight, newBottom);
      newRight = Math.min(Math.max(nudged2.right, minMargin), maxRight);
      newBottom = Math.min(Math.max(nudged2.bottom, minMargin), maxBottom);
      setRight(newRight);
      setBottom(newBottom);
      setIsDragging(false);
      setDragCandidate(null);
      setLS('right', String(newRight));
      setLS('bottom', String(newBottom));
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp, { once: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, dragCandidate, width, height, right, bottom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside form fields or editable areas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          !!target.closest('input, textarea, select, [contenteditable="true"]'))
      ) {
        return;
      }

      // Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        togglePanel();
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closePanel();
      }

      // Keyboard move/resize only in floating mode
      if (!isOpen || mode !== 'floating') return;
      const step = e.altKey ? 1 : 10;
      const minMargin = 8;
      const clampNum = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
      let handled = false;
      if (e.shiftKey) {
        // Resize
        if (e.key === 'ArrowLeft') {
          setWidth((w) => clampNum(w - step, MIN_WIDTH, MAX_WIDTH)); handled = true;
        } else if (e.key === 'ArrowRight') {
          setWidth((w) => clampNum(w + step, MIN_WIDTH, MAX_WIDTH)); handled = true;
        } else if (e.key === 'ArrowUp') {
          const maxH = (window.innerHeight * MAX_HEIGHT_VH) / 100;
          setHeight((h) => clampNum(h + step, MIN_HEIGHT, maxH)); handled = true;
        } else if (e.key === 'ArrowDown') {
          const maxH = (window.innerHeight * MAX_HEIGHT_VH) / 100;
          setHeight((h) => clampNum(h - step, MIN_HEIGHT, maxH)); handled = true;
        }
      } else {
        // Move
        if (e.key === 'ArrowLeft') {
          // move left => increase right
          setRight((r) => clampNum(r + step, minMargin, Math.max(minMargin, window.innerWidth - width - minMargin))); handled = true;
        } else if (e.key === 'ArrowRight') {
          setRight((r) => clampNum(r - step, minMargin, Math.max(minMargin, window.innerWidth - width - minMargin))); handled = true;
        } else if (e.key === 'ArrowUp') {
          // move up => increase bottom
          setBottom((b) => clampNum(b + step, minMargin, Math.max(minMargin, window.innerHeight - height - minMargin))); handled = true;
        } else if (e.key === 'ArrowDown') {
          setBottom((b) => clampNum(b - step, minMargin, Math.max(minMargin, window.innerHeight - height - minMargin))); handled = true;
        }
      }
      if (handled) e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePanel, closePanel, mode, width, height]);

  // Focus management: focus panel on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => containerRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Basic focus trap within the panel when open
  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !el.contains(active)) {
          (last as HTMLElement).focus();
          e.preventDefault();
        }
      } else {
        if (active === last) {
          (first as HTMLElement).focus();
          e.preventDefault();
        }
      }
    };
    el.addEventListener('keydown', onKeydown);
    return () => el.removeEventListener('keydown', onKeydown);
  }, [isOpen]);

  // Mini button when closed
  if (!isOpen) {
    return (
      <button
        onClick={togglePanel}
        className="fixed bottom-4 right-4 z-[100000] bg-gray-800 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        Debug
      </button>
    );
  }

  // Overlay when open
  return (
    <>
      {/* Panel Container - lower-right, resizable */}
      <div
        ref={containerRef}
        className="fixed z-[9999] flex flex-col focus:outline-none overscroll-contain"
        role="dialog"
        aria-label="Debug Logs"
        tabIndex={-1}
        onWheelCapture={(e) => { e.stopPropagation(); }}
        onTouchMoveCapture={(e) => { e.stopPropagation(); }}
        style={(() => {
          const base: React.CSSProperties = {
            width: `${width}px`,
            height: `${height}px`,
            transition: isResizing || isResizingVertical ? 'none' : 'width 0.2s ease, height 0.2s ease',
          };
          if (mode === 'rightDock') {
            return { ...base, right: `${GRID}px`, bottom: `${GRID}px` };
          }
          if (mode === 'bottomSheet') {
            return { ...base, left: '50%', transform: 'translateX(-50%)', bottom: `${GRID}px` };
          }
          return { ...base, right: `${right}px`, bottom: `${bottom}px` };
        })()}
      >
        {/* Top Resize Handle (overlayed above header controls) */}
        <div
          ref={resizeVerticalRef}
          className="absolute -top-2 left-0 right-0 h-6 select-none transition-colors flex items-center justify-center z-[10000] pointer-events-none"
          title="Drag to resize height"
        >
          <div
            onMouseDown={handleVerticalMouseDown}
            className="h-1 w-12 cursor-ns-resize bg-gray-400 dark:bg-gray-600 rounded-full hover:bg-blue-500 active:bg-blue-600 pointer-events-auto"
          />
        </div>

        {/* Main Panel Area */}
        <div className="flex-1 flex min-h-0">
          {/* Left Resize Handle */}
          <div
            ref={resizeRef}
            onMouseDown={handleMouseDown}
            className="w-4 h-full cursor-ew-resize select-none hover:bg-blue-500/40 active:bg-blue-600/60 transition-colors flex items-center justify-center group"
            title="Drag to resize width"
          >
            <div className="w-1 h-12 bg-gray-400 dark:bg-gray-600 rounded-full group-hover:bg-blue-500" />
          </div>

          {/* Panel Content */}
          <div className="relative flex-1 flex flex-col min-w-0">
            {/* Top Controls */}
            <div
              className="absolute -top-2 left-0 right-0 flex justify-between items-center px-2 z-10 select-none"
              onMouseDown={mode === 'floating' ? handleDragMouseDown : undefined}
              onDoubleClick={toggleMaximize}
              title={mode === 'floating' ? 'Drag to move • Double-click to maximize/restore' : 'Double-click to maximize/restore'}
            >
              {/* Keyboard Hint */}
              <div className="text-xs text-white/80 bg-gray-800/90 px-2 py-1 rounded backdrop-blur-sm">
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">
                  Ctrl+Shift+D
                </kbd>
                <span className="mx-1">|</span>
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">
                  ESC
                </kbd>
              </div>

              {/* Close Button */}
              <div className="flex items-center gap-2">
                {/* Mode selector */}
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PanelMode)}
                  className="text-xs bg-gray-800/90 text-white rounded px-2 py-1 border border-white/10"
                  title="Panel mode"
                >
                  <option value="floating">Floating</option>
                  <option value="rightDock">Right Dock</option>
                  <option value="bottomSheet">Bottom Sheet</option>
                </select>
                <button
                  onClick={resetPosition}
                  className="bg-gray-700 text-white w-7 h-7 rounded-full hover:bg-gray-600 transition-colors flex items-center justify-center shadow-lg cursor-pointer"
                  title="Reset position to bottom-right"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M4 20h6v-6M20 4h-6v6" />
                  </svg>
                </button>
                <button
                  onClick={closePanel}
                  className="bg-red-600 text-white w-7 h-7 rounded-full hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg"
                  title="Close (ESC)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Debug Panel */}
            <div className="flex-1 mt-8 min-h-0">
              <DebugPanel />
            </div>
          </div>
        </div>
        {/* Bottom-right diagonal resize handle */}
        <div
          onMouseDown={() => setIsResizingCorner(true)}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize select-none"
          title="Drag to resize"
        >
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M1 15h2l12-12V1h-2L1 13v2z" />
          </svg>
        </div>
      </div>
    </>
  );
};

export default DebugPanelOverlay;
