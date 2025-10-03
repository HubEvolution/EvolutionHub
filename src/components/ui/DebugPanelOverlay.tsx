import React, { useState, useEffect, useCallback, useRef } from 'react';
import DebugPanel from './DebugPanel';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;
const MIN_HEIGHT = 200;
const MAX_HEIGHT_VH = 90; // 90% of viewport height
const DEFAULT_HEIGHT = 400;

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
  const [right, setRight] = useState(() => {
    if (typeof window === 'undefined') return 16;
    try {
      const saved = localStorage.getItem('debugPanel.right');
      return saved ? parseInt(saved, 10) : 16;
    } catch {
      return 16;
    }
  });
  const [bottom, setBottom] = useState(() => {
    if (typeof window === 'undefined') return 16;
    try {
      const saved = localStorage.getItem('debugPanel.bottom');
      return saved ? parseInt(saved, 10) : 16;
    } catch {
      return 16;
    }
  });
  const dragStartRef = useRef<{ x: number; y: number; right: number; bottom: number } | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const resizeVerticalRef = useRef<HTMLDivElement>(null);

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
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, right, bottom };
  }, [right, bottom]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
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
  }, [isResizing]);

  useEffect(() => {
    if (!isResizingVertical) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate height change (inverted: drag UP = taller, drag DOWN = shorter)
      const newHeight = window.innerHeight - e.clientY - 16; // 16px = bottom-4
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
  }, [isResizingVertical]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
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
      setIsDragging(false);
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
  }, [isDragging, width, height, right, bottom]);

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePanel, closePanel]);

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
        className="fixed z-[9999] flex flex-col relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          right: `${right}px`,
          bottom: `${bottom}px`,
          transition:
            isResizing || isResizingVertical ? 'none' : 'width 0.2s ease, height 0.2s ease',
        }}
      >
        {/* Top Resize Handle (overlayed above header controls) */}
        <div
          ref={resizeVerticalRef}
          onMouseDown={handleVerticalMouseDown}
          className="absolute -top-2 left-0 right-0 h-4 cursor-ns-resize select-none hover:bg-blue-500/40 active:bg-blue-600/60 transition-colors flex items-center justify-center group z-[10000]"
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
            className="w-2 h-full cursor-ew-resize select-none hover:bg-blue-500/40 active:bg-blue-600/60 transition-colors flex items-center justify-center group"
            title="Drag to resize width"
          >
            <div className="w-1 h-12 bg-gray-400 dark:bg-gray-600 rounded-full group-hover:bg-blue-500" />
          </div>

          {/* Panel Content */}
          <div className="relative flex-1 flex flex-col min-w-0">
            {/* Top Controls */}
            <div
              className="absolute -top-2 left-0 right-0 flex justify-between items-center px-2 z-10 cursor-move select-none"
              onMouseDown={handleDragMouseDown}
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
