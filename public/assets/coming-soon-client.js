/**
 * public/assets/coming-soon-client.js
 * Production JS (copied from TS source)
 */
(function () {
  var BODY_LOCK_CLASS = 'coming-soon-open';
  var isVisible = function (el) {
    if (!el) return false;
    var he = el;
    return !!(he.offsetWidth || he.offsetHeight || he.getClientRects().length);
  };
  var getFocusable = function (el) {
    if (!el) return [];
    var selector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    var nodes = Array.from(el.querySelectorAll(selector));
    return nodes.filter(isVisible);
  };
  function trapFocus(container) {
    var focusable = getFocusable(container);
    if (focusable.length === 0) return function () {};
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    function onKey(e) {
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
    return function () {
      return document.removeEventListener('keydown', onKey);
    };
  }
  function init() {
    var overlayEl = document.getElementById('coming-soon-overlay');
    if (!(overlayEl instanceof HTMLElement)) return;
    var overlay = overlayEl;
    var dismissible = overlay.getAttribute('data-dismissible') === 'true';
    document.body.classList.add(BODY_LOCK_CLASS);
    var focusable = getFocusable(overlay);
    var primary = overlay.querySelector('[data-cs-primary]') || focusable[0];
    if (primary) {
      primary.focus();
    } else {
      overlay.tabIndex = -1;
      overlay.focus();
    }
    var removeTrap = function () {};
    if (dismissible) {
      removeTrap = trapFocus(overlay);
    }
    function closeOverlay() {
      document.body.classList.remove(BODY_LOCK_CLASS);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      removeTrap();
      document.removeEventListener('keydown', onKeydown);
      var closeBtn = overlay.querySelector('.cs-close');
      if (closeBtn) closeBtn.removeEventListener('click', onCloseClick);
    }
    function onKeydown(e) {
      if (!dismissible) return;
      if (e.key === 'Escape') {
        closeOverlay();
      }
    }
    function onCloseClick(e) {
      e.preventDefault();
      closeOverlay();
    }
    if (dismissible) {
      document.addEventListener('keydown', onKeydown);
      var closeBtn = overlay.querySelector('.cs-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', onCloseClick);
      }
    }
    window.addEventListener('resize', function () {});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
