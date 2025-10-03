// scripts/coming-soon-client.ts
(() => {
  const BODY_LOCK_CLASS = 'coming-soon-open';

  const isVisible = (el: Element | null): boolean => {
    if (!el) return false;
    const he = el as HTMLElement;
    return !!(he.offsetWidth || he.offsetHeight || he.getClientRects().length);
  };

  const getFocusable = (el: HTMLElement): HTMLElement[] => {
    const selector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(selector));
    return nodes.filter(isVisible);
  };

  function trapFocus(container: HTMLElement) {
    const focusable = getFocusable(container);
    if (focusable.length === 0) return () => {};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }

  function init() {
    const overlayEl = document.getElementById('coming-soon-overlay');
    if (!(overlayEl instanceof HTMLElement)) return;
    const overlay = overlayEl as HTMLElement;

    const dismissible = overlay.getAttribute('data-dismissible') === 'true';

    // Lock body scroll immediately (server may also add the class)
    document.body.classList.add(BODY_LOCK_CLASS);

    const focusable = getFocusable(overlay);
    const primary =
      (overlay.querySelector<HTMLElement>('[data-cs-primary]') as HTMLElement | null) ||
      focusable[0];
    if (primary) {
      primary.focus();
    } else {
      overlay.tabIndex = -1;
      overlay.focus();
    }

    let removeTrap = () => {};
    if (dismissible) {
      removeTrap = trapFocus(overlay);
    }

    function closeOverlay() {
      document.body.classList.remove(BODY_LOCK_CLASS);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      removeTrap();
      document.removeEventListener('keydown', onKeydown);
      const closeBtn = overlay.querySelector('.cs-close') as HTMLElement | null;
      if (closeBtn) closeBtn.removeEventListener('click', onCloseClick);
    }

    function onKeydown(e: KeyboardEvent) {
      if (!dismissible) return;
      if (e.key === 'Escape') {
        closeOverlay();
      }
    }

    function onCloseClick(e: Event) {
      e.preventDefault();
      closeOverlay();
    }

    if (dismissible) {
      document.addEventListener('keydown', onKeydown);
      const closeBtn = overlay.querySelector('.cs-close') as HTMLElement | null;
      if (closeBtn) {
        closeBtn.addEventListener('click', onCloseClick);
      }
    }

    // Placeholder for future enhancements
    window.addEventListener('resize', () => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
