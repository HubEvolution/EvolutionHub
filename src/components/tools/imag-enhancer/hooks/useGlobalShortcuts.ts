import { useEffect } from 'react';

interface UseGlobalShortcutsOptions {
  enabled: boolean;
  onReset: () => void;
  onDownload: () => void;
  onToggleLoupe: () => void;
}

export function useGlobalShortcuts({
  enabled,
  onReset,
  onDownload,
  onToggleLoupe,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const isEditable = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (el.isContentEditable) return true;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      if (isEditable(target)) return;
      // R to reset compare position
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onReset();
        return;
      }
      // Cmd/Ctrl+S to download result
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onDownload();
        return;
      }
      // L to toggle loupe
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onToggleLoupe();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onReset, onDownload, onToggleLoupe]);
}
