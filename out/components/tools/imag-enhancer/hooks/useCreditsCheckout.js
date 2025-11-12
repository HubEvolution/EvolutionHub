'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useCreditsCheckout = useCreditsCheckout;
const react_1 = require('react');
const sonner_1 = require('sonner');
const csrf_1 = require('@/lib/security/csrf');
const api_1 = require('../api');
function useCreditsCheckout() {
  const [buying, setBuying] = (0, react_1.useState)(false);
  const getWorkspaceId = (0, react_1.useCallback)(() => {
    try {
      const url = new URL(window.location.href);
      const ws = url.searchParams.get('ws');
      if (ws && ws.trim()) {
        localStorage.setItem('ws_id', ws);
        return ws;
      }
      const ls = localStorage.getItem('ws_id');
      if (ls && ls.trim()) return ls;
    } catch {
      /* noop */
    }
    return 'default';
  }, []);
  const createCreditsCheckout = (0, react_1.useCallback)(
    async (pack) => {
      try {
        setBuying(pack);
        const csrf = (0, csrf_1.ensureCsrfToken)();
        const res = await (0, api_1.postCredits)(pack, getWorkspaceId(), csrf);
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          sonner_1.toast.error('Checkout failed: ' + (text || res.status));
          return;
        }
        const dataUnknown = await res.json().catch(() => null);
        let url;
        if (
          dataUnknown &&
          typeof dataUnknown === 'object' &&
          'url' in dataUnknown &&
          typeof dataUnknown.url === 'string'
        ) {
          url = dataUnknown.url;
        } else {
          url = undefined;
        }
        if (url) {
          window.location.href = url;
        } else {
          sonner_1.toast.error('Checkout failed: Invalid response');
        }
      } catch {
        sonner_1.toast.error('Checkout failed');
      } finally {
        setBuying(false);
      }
    },
    [getWorkspaceId]
  );
  return { buying, createCreditsCheckout };
}
