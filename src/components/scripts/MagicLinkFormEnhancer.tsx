import { useEffect } from 'react';
import { notify } from '@/lib/notify';

interface Props {
  formId: string;
  successText: string;
  errorText: string;
  cooldownSeconds?: number; // default 60
  cooldownLabel?: string; // e.g., 'Resend in {s}s'
}

type AuthLog = { via: string; t: number; note: string; data?: unknown };
type WindowWithAuth = Window & { __authLogs?: AuthLog[] };

interface SentResponse {
  success: true;
  data: { sent: boolean };
}

function isSentResponse(o: unknown): o is SentResponse {
  if (typeof o !== 'object' || o === null) return false;
  const u = o as { success?: unknown; data?: unknown };
  if (u.success !== true) return false;
  if (typeof u.data !== 'object' || u.data === null) return false;
  return (u.data as { sent?: unknown }).sent === true;
}

export default function MagicLinkFormEnhancer({
  formId,
  successText,
  errorText,
  cooldownSeconds = 60,
  cooldownLabel = 'Resend in {s}s',
}: Props) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formEl: HTMLFormElement = form;
    const debug = /(?:^|[?&])debug_auth=1(?:&|$)/.test(window.location.search);
    const log = (note: string, data?: unknown) => {
      if (!debug) return;
      try {
        const w = window as WindowWithAuth;
        w.__authLogs = w.__authLogs || [];
        w.__authLogs.push({ via: 'magic-form', t: Date.now(), note, data });

        console.debug('[MagicLinkFormEnhancer]', note, data ?? '');
      } catch {
        /* noop */
      }
    };

    const statusEl = document.getElementById(`${formId}-status`);
    const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement | null;

    const COOLDOWN_SECONDS =
      Number.isFinite(cooldownSeconds) && cooldownSeconds > 0 ? cooldownSeconds : 60;
    let cooldownInterval: number | null = null;

    function clearCooldown() {
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
    }

    function startCooldown() {
      if (!submitBtn) return;
      clearCooldown();
      const originalText = submitBtn.textContent || '';
      submitBtn.dataset.originalText = originalText;
      // Preserve inline visual styles so we can restore them later
      submitBtn.dataset.prevCursor = submitBtn.style.cursor || '';
      submitBtn.dataset.prevOpacity = submitBtn.style.opacity || '';
      let remaining = COOLDOWN_SECONDS;
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-disabled', 'true');
      submitBtn.classList.add('pointer-events-none', 'cursor-not-allowed', 'opacity-60');
      submitBtn.style.pointerEvents = 'none';
      // Enforce visual disabled state deterministically regardless of Tailwind class order
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.style.opacity = '0.6';
      // Prefer prop; fallback to form attribute to avoid hydration/caching issues
      const labelTemplate =
        (cooldownLabel && cooldownLabel.trim()) ||
        formEl.getAttribute('data-cooldown-label') ||
        '' ||
        'Resend in {s}s';
      const format = (s: number) => labelTemplate.replace('{s}', String(s));
      submitBtn.textContent = format(remaining);
      log('cooldown-start', { seconds: remaining });
      cooldownInterval = window.setInterval(() => {
        remaining -= 1;
        if (!submitBtn) return;
        if (remaining <= 0) {
          clearCooldown();
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-disabled');
          submitBtn.classList.remove('pointer-events-none', 'cursor-not-allowed', 'opacity-60');
          submitBtn.style.pointerEvents = '';
          // Restore previously saved inline styles
          submitBtn.style.cursor = submitBtn.dataset.prevCursor || '';
          submitBtn.style.opacity = submitBtn.dataset.prevOpacity || '';
          submitBtn.textContent = submitBtn.dataset.originalText || originalText || 'Continue';
          log('cooldown-end');
        } else {
          submitBtn.textContent = format(remaining);
        }
      }, 1000);
    }

    async function onSubmit(e: Event) {
      try {
        e.preventDefault();
        log('submit');
        // Client-side validation: use built-in constraints first
        if (!formEl.checkValidity()) {
          log('invalid');
          // Toggle aria-invalid for inputs with errors
          const inputs = Array.from(formEl.querySelectorAll('input')) as HTMLInputElement[];
          for (const input of inputs) {
            if (!input.willValidate) continue;
            if (!input.checkValidity()) {
              input.setAttribute('aria-invalid', 'true');
            } else {
              input.removeAttribute('aria-invalid');
            }
          }
          formEl.reportValidity();
          return;
        } else {
          const inputs = Array.from(formEl.querySelectorAll('input')) as HTMLInputElement[];
          for (const input of inputs) input.removeAttribute('aria-invalid');
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute('aria-disabled', 'true');
        }
        formEl.setAttribute('aria-busy', 'true');

        const formData = new FormData(formEl);
        const res = await fetch(formEl.action, {
          method: formEl.method || 'POST',
          body: formData,
          credentials: 'same-origin',
        });
        const _ok = res.ok;
        let json: unknown;
        try {
          json = await res.json();
          if (typeof json !== 'object' || json === null) {
            json = null;
          }
        } catch {
          /* noop */
        }
        log('response', { ok: _ok, json });

        if (_ok && isSentResponse(json)) {
          if (statusEl) {
            statusEl.textContent = successText;
            statusEl.classList.remove('hidden');
            statusEl.classList.add('text-emerald-600');
            statusEl.setAttribute('role', 'status');
          }
          try {
            notify.success(successText);
          } catch {}
          // keep the form visible; user may resend with another email
          log('success');
        } else {
          if (statusEl) {
            statusEl.textContent = errorText;
            statusEl.classList.remove('hidden');
            statusEl.classList.remove('text-emerald-600');
            statusEl.classList.add('text-red-600');
            statusEl.setAttribute('role', 'alert');
          }
          log('error');
        }
      } catch (_err) {
        // Fallback to normal submission
        formEl.removeEventListener('submit', onSubmit);
        formEl.submit();
        log('exception-fallback');
      } finally {
        formEl.removeAttribute('aria-busy');
        // Start cooldown regardless of outcome to avoid multiple triggers
        startCooldown();
        log('cooldown-triggered');
      }
    }

    formEl.addEventListener('submit', onSubmit);
    return () => {
      formEl.removeEventListener('submit', onSubmit);
      clearCooldown();
    };
  }, [formId, successText, errorText, cooldownSeconds, cooldownLabel]);

  return null;
}
