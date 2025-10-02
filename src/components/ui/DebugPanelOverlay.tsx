import React, { useState, useEffect, useCallback } from 'react';
import DebugPanel from './DebugPanel';

const DebugPanelOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('debugPanel.isOpen') === 'true';
    } catch {
      return false;
    }
  });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      {/* Backdrop - only visual, no onClick to allow testing components */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300 pointer-events-none"
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Panel Container */}
      <div className="fixed inset-4 md:inset-8 lg:right-8 lg:left-auto lg:w-[800px] z-[9999]">
        <div className="relative h-full">
          {/* Close Button */}
          <button
            onClick={closePanel}
            className="absolute -top-2 -right-2 bg-red-600 text-white w-8 h-8 rounded-full hover:bg-red-700 transition-colors z-10 flex items-center justify-center shadow-lg"
            title="Close (ESC)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Keyboard Hint */}
          <div className="absolute -top-8 left-0 text-xs text-white/80 bg-gray-800/90 px-2 py-1 rounded backdrop-blur-sm">
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-white font-mono">
              Ctrl+Shift+D
            </kbd>
            <span className="mx-1">|</span>
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-white font-mono">ESC</kbd>
          </div>

          {/* Debug Panel */}
          <div className="h-full">
            <DebugPanel />
          </div>
        </div>
      </div>
    </>
  );
};

export default DebugPanelOverlay;
