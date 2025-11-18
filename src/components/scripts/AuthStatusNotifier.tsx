import { useEffect } from 'react';
import { toast } from 'sonner';
import { getI18n } from '@/utils/i18n';
import { getLocale } from '@/lib/i18n';

type Mode =
  | 'login'
  | 'password-reset-sent'
  | 'forgot-password'
  | 'reset-password'
  | 'register'
  | 'email-verified';

type AuthLog = { via: string; t: number; note: string; data?: unknown };
type WindowWithAuth = Window & { __authLogs?: AuthLog[] };

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForToaster(timeout = 150): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (document.querySelector('[data-sonner-toaster]')) return true;
    await wait(10);
  }
  return false;
}

export default function AuthStatusNotifier({ mode }: { mode: Mode }) {
  useEffect(() => {
    let cancelled = false;
    const notifyHandler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { type?: string; message?: string } | undefined;
        const t = (detail?.type || 'info').toLowerCase();
        const msg = detail?.message || '';
        if (!msg) return;
        if (t === 'error') toast.error(msg);
        else if (t === 'success') toast.success(msg);
        else if (t === 'warning' || t === 'warn') toast(msg);
        else toast(msg);
      } catch {}
    };
    window.addEventListener('notify', notifyHandler as EventListener);
    (window as any).onTurnstileError = function () {
      try {
        const locale = getLocale(window.location.pathname);
        const t = getI18n(locale);
        const message = t('auth.toasts.turnstile_load_error');
        window.dispatchEvent(new CustomEvent('notify', { detail: { type: 'error', message } }));
      } catch {}
    };
    (async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const locale = getLocale(window.location.pathname);
        const t = getI18n(locale);
        const debug = /(?:^|[?&])debug_auth=1(?:&|$)/.test(url.search);
        const log = (note: string, data?: unknown) => {
          if (!debug) return;
          try {
            const w = window as WindowWithAuth;
            w.__authLogs = w.__authLogs || [];
            w.__authLogs.push({ via: 'notifier', t: Date.now(), note, data });
            // keep console noise low but available when needed

            console.debug('[AuthStatusNotifier]', note, data ?? '');
          } catch {
            /* noop */
          }
        };
        const keys = mode === 'login' ? ['loggedOut', 'success', 'error'] : ['success', 'error'];

        const hasAny = keys.some((k) => params.has(k));
        if (!hasAny) {
          log('no-query-flags', { mode });
          return;
        }

        // Ensure toaster is mounted to avoid missed toasts
        const toasterReady = await waitForToaster();
        log('toaster-ready', { ready: toasterReady });
        if (cancelled) return;

        if (mode === 'login') {
          const loggedOut = params.get('loggedOut');
          const success = params.get('success');
          const error = params.get('error');

          if (loggedOut === 'true') {
            toast.success(t('auth.toasts.logged_out'));
            log('toast-loggedOut');
            try {
              window.dispatchEvent(
                new CustomEvent('auth:changed', { detail: { state: 'logged_out', via: 'login' } })
              );
              try {
                localStorage.setItem(
                  'auth:changed',
                  JSON.stringify({ state: 'logged_out', t: Date.now(), via: 'login' })
                );
              } catch {
                /* noop */
              }
            } catch {
              /* noop */
            }
          }
          if (success) {
            const msg = t('auth.toasts.login_success');
            toast.success(msg);
            log('toast-success', { code: success });
            try {
              window.dispatchEvent(
                new CustomEvent('auth:changed', { detail: { state: 'logged_in', via: 'login' } })
              );
              try {
                localStorage.setItem(
                  'auth:changed',
                  JSON.stringify({ state: 'logged_in', t: Date.now(), via: 'login' })
                );
              } catch {
                /* noop */
              }
            } catch {
              /* noop */
            }
          }
          if (error) {
            const code = error;
            const msg = t('auth.toasts.login_error', { code });
            toast.error(msg);
            log('toast-error', { code });
          }
        } else if (mode === 'password-reset-sent') {
          const success = params.get('success');
          const error = params.get('error');
          if (success) {
            toast.success(t('auth.toasts.password_reset_sent.success'));
            log('toast-success', { mode, code: success });
          }
          if (error) {
            const code = error;
            toast.error(t('auth.toasts.password_reset_sent.error', { code }));
            log('toast-error', { mode, code });
          }
        } else if (mode === 'forgot-password') {
          const success = params.get('success');
          const error = params.get('error');
          if (success) {
            toast.success(t('auth.toasts.forgot_password.success'));
            log('toast-success', { mode, code: success });
          }
          if (error) {
            const code = error;
            toast.error(t('auth.toasts.forgot_password.error', { code }));
            log('toast-error', { mode, code });
          }
        } else if (mode === 'reset-password') {
          const success = params.get('success');
          const error = params.get('error');
          if (success) {
            toast.success(t('auth.toasts.reset_password.success'));
            log('toast-success', { mode, code: success });
          }
          if (error) {
            const code = error;
            toast.error(t('auth.toasts.reset_password.error', { code }));
            log('toast-error', { mode, code });
          }
        } else if (mode === 'register') {
          const success = params.get('success');
          const error = params.get('error');
          if (success) {
            toast.success(t('auth.toasts.register.success'));
            log('toast-success', { mode, code: success });
            try {
              window.dispatchEvent(
                new CustomEvent('auth:changed', { detail: { state: 'logged_in', via: 'register' } })
              );
              try {
                localStorage.setItem(
                  'auth:changed',
                  JSON.stringify({ state: 'logged_in', t: Date.now(), via: 'register' })
                );
              } catch {
                /* noop */
              }
            } catch {
              /* noop */
            }
          }
          if (error) {
            const code = error;
            toast.error(t('auth.toasts.register.error', { code }));
            log('toast-error', { mode, code });
          }
        }

        // Cleanup known params while preserving others
        let mutated = false;
        for (const k of keys) {
          if (params.has(k)) {
            params.delete(k);
            mutated = true;
          }
        }
        if (mutated) {
          const newQuery = params.toString();
          const newUrl = url.pathname + (newQuery ? `?${newQuery}` : '') + url.hash;
          window.history.replaceState({}, document.title, newUrl);
          log('cleaned-query', { newUrl });
        }
      } catch (e) {
        console.error('[AuthStatusNotifier] Failed:', e);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('notify', notifyHandler as EventListener);
    };
  }, [mode]);

  return null;
}
