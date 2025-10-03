import React, { useState, useEffect, useCallback, useRef } from 'react';
import DebugPanel from './DebugPanel';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;
const MIN_HEIGHT = 200;
const MAX_HEIGHT_VH = 90; // 90% of viewport height
const DEFAULT_HEIGHT = 400;
const GRID = 8; // grid snapping size

type PanelMode = 'floating' | 'rightDock' | 'bottomSheet';

const DebugPanelOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('debugPanel.isOpen') === 'true';
    } catch {
      return false;
    }
  });

  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    try {
      const saved = localStorage.getItem('debugPanel.width');
      return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });

  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_HEIGHT;
    try {
      const saved = localStorage.getItem('debugPanel.height');
      return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCandidate, setDragCandidate] = useState<{
    x: number; y: number; right: number; bottom: number;
  } | null>(null);
  const [right, setRight] = useState(() => {
    if (typeof window === 'undefined') return 16;
    try {
      const saved = localStorage.getItem('debugPanel.right');
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
      const saved = localStorage.getItem('debugPanel.bottom');
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
      const m = localStorage.getItem('debugPanel.mode') as PanelMode | null;
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
      try {
        localStorage.setItem('debugPanel.isOpen', String(newState));
      } catch (e) {
        console.warn('Failed to save debug panel state:', e);
      }
      return newState;
    });
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem('debugPanel.isOpen', 'false');
    } catch (e) {
      console.warn('Failed to save debug panel state:', e);
    }
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
    if (target.closest('button, input, label, kbd, svg, a')) return;
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
      try {
        localStorage.setItem('debugPanel.width', String(clampedWidth));
      } catch {
        /* noop */
      }
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

  // Clamp position and size when viewport changes (e.g., address bar/DevTools resize)
  useEffect(() => {
    const clamp = () => {
      const minMargin = 8;
      const maxHeight = (window.innerHeight * MAX_HEIGHT_VH) / 100;
      const nextHeight = Math.min(height, maxHeight);
      if (nextHeight !== height) setHeight(nextHeight);

      const maxRight = Math.max(minMargin, window.innerWidth - width - minMargin);
      const maxBottom = Math.max(minMargin, window.innerHeight - height - minMargin);

      const nextRight = Math.min(Math.max(right, minMargin), maxRight);
      const nextBottom = Math.min(Math.max(bottom, minMargin), maxBottom);
      if (nextRight !== right) setRight(nextRight);
      if (nextBottom !== bottom) setBottom(nextBottom);
    };
    // Run once on mount to normalize persisted values
    clamp();
    window.addEventListener('resize', clamp);
    window.addEventListener('orientationchange', clamp);
    return () => {
      window.removeEventListener('resize', clamp);
      window.removeEventListener('orientationchange', clamp);
    };
  }, [width, height, right, bottom]);

  const resetPosition = useCallback(() => {
    setRight(16);
    setBottom(16);
    try {
      localStorage.setItem('debugPanel.right', '16');
      localStorage.setItem('debugPanel.bottom', '16');
    } catch {/* noop */}
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
      // snap to GRID on release
      setRight((r) => Math.max(8, Math.round(r / GRID) * GRID));
      setBottom((b) => Math.max(8, Math.round(b / GRID) * GRID));
      setIsDragging(false);
      setDragCandidate(null);
      try {
        localStorage.setItem('debugPanel.right', String(right));
        localStorage.setItem('debugPanel.bottom', String(bottom));
      } catch {
        /* noop */
      }
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
        className="fixed bottom-4 right-4 z-[9998] bg-gray-800 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
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
        className="fixed z-[9999] flex flex-col focus:outline-none"
        role="dialog"
        aria-label="Debug Logs"
        tabIndex={-1}
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
          onMouseDown={handleVerticalMouseDown}
          className="absolute -top-2 left-0 right-0 h-6 cursor-ns-resize select-none hover:bg-blue-500/40 active:bg-blue-600/60 transition-colors flex items-center justify-center group z-[10000]"
          title="Drag to resize height"
        >
          <div className="h-1 w-12 bg-gray-400 dark:bg-gray-600 rounded-full group-hover:bg-blue-500" />
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
      </div>
    </>
  );
};

export default DebugPanelOverlay;
