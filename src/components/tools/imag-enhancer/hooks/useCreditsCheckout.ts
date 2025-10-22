import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { postCredits } from '../api';

export function useCreditsCheckout() {
  const [buying, setBuying] = useState<false | 100 | 500 | 1500>(false);

  const getWorkspaceId = useCallback(() => {
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

  const createCreditsCheckout = useCallback(
    async (pack: 100 | 500 | 1500) => {
      try {
        setBuying(pack);
        const csrf = ensureCsrfToken();
        const res = await postCredits(pack, getWorkspaceId(), csrf);
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          toast.error('Checkout failed: ' + (text || res.status));
          return;
        }
        const dataUnknown: unknown = await res.json().catch(() => null);
        let url: string | undefined;
        if (
          dataUnknown &&
          typeof dataUnknown === 'object' &&
          'url' in dataUnknown &&
          typeof (dataUnknown as { url?: unknown }).url === 'string'
        ) {
          url = (dataUnknown as { url: string }).url;
        } else {
          url = undefined;
        }
        if (url) {
          window.location.href = url;
        } else {
          toast.error('Checkout failed: Invalid response');
        }
      } catch {
        toast.error('Checkout failed');
      } finally {
        setBuying(false);
      }
    },
    [getWorkspaceId]
  );

  return { buying, createCreditsCheckout } as const;
}
