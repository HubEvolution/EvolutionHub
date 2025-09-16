import { useEffect } from 'react';
import { toast } from 'sonner';

function getLocaleFromPath(pathname: string): 'de' | 'en' {
  try {
    if (pathname.startsWith('/de/')) return 'de';
    if (pathname === '/de') return 'de';
  } catch {}
  return 'en';
}

export default function BillingNotice() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const billing = url.searchParams.get('billing');
      if (!billing) return;

      const locale = getLocaleFromPath(url.pathname);

      const t = (key: string): string => {
        const de: Record<string, string> = {
          linked: 'Abo erfolgreich verknüpft.',
          nopending: 'Keine offene Bestellung zum Verknüpfen gefunden.',
          link_error: 'Fehler beim Verknüpfen der Bestellung.',
          stripe_not_configured: 'Stripe ist nicht konfiguriert. Bitte Admin benachrichtigen.',
          missing_session: 'Ungültiger Aufruf: session_id fehlt.',
          sync_error: 'Synchronisation mit Stripe fehlgeschlagen. Bitte erneut versuchen.',
          forbidden: 'Sitzung gehört zu einem anderen Benutzer.',
        };
        const en: Record<string, string> = {
          linked: 'Subscription linked successfully.',
          nopending: 'No pending order found to link.',
          link_error: 'Failed to link the order.',
          stripe_not_configured: 'Stripe is not configured. Please contact admin.',
          missing_session: 'Invalid request: missing session_id.',
          sync_error: 'Sync with Stripe failed. Please try again.',
          forbidden: 'Session belongs to a different user.',
        };
        return (locale === 'de' ? de : en)[key] || key;
      };

      const show = (kind: 'success' | 'error' | 'info' | 'warning', message: string) => {
        switch (kind) {
          case 'success':
            toast.success(message);
            break;
          case 'warning':
            toast.warning(message);
            break;
          case 'info':
            toast.info(message);
            break;
          default:
            toast.error(message);
        }
      };

      const kindMap: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
        linked: 'success',
        nopending: 'info',
        link_error: 'error',
        stripe_not_configured: 'error',
        missing_session: 'error',
        sync_error: 'error',
        forbidden: 'error',
      };

      const kind = kindMap[billing] || 'info';
      show(kind, t(billing));

      // Remove the query param to avoid duplicate notices on refresh
      url.searchParams.delete('billing');
      const newUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    } catch {
      // ignore
    }
  }, []);

  return null;
}
