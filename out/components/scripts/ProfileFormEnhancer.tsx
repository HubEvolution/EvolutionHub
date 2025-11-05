import { useEffect } from 'react';
import { notify } from '@/lib/notify';

interface Props {
  formId: string;
}

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: { type: string; message: string } };

function isJsonResponse(x: unknown): x is ApiSuccess<unknown> | ApiError {
  if (!x || typeof x !== 'object') return false;
  const u = x as { success?: unknown };
  return typeof u.success === 'boolean';
}

export default function ProfileFormEnhancer({ formId }: Props) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formEl: HTMLFormElement = form;

    const statusEl = document.getElementById(`${formId}-status`);
    const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement | null;

    function setStatus(text: string, ok: boolean) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.remove('hidden');
      statusEl.classList.toggle('text-emerald-600', ok);
      statusEl.classList.toggle('text-red-600', !ok);
      statusEl.setAttribute('role', ok ? 'status' : 'alert');
    }

    async function onSubmit(e: Event) {
      try {
        e.preventDefault();

        if (!formEl.checkValidity()) {
          formEl.reportValidity();
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute('aria-disabled', 'true');
        }

        const formData = new FormData(formEl);
        // Prevent server redirect in case it still occurs; prefer JSON
        const res = await fetch(formEl.action, {
          method: formEl.method || 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          redirect: 'manual',
        });

        let data: unknown = null;
        try {
          data = await res.json();
        } catch {}

        if (res.ok && isJsonResponse(data) && data.success) {
          const next = (formEl.querySelector('input[name="next"]') as HTMLInputElement | null)
            ?.value;
          notify.success(
            (data as ApiSuccess<{ message?: string }>).data?.message ||
              'Profile updated successfully'
          );
          if (next && typeof next === 'string') {
            window.location.assign(next);
          } else {
            window.location.assign('/dashboard');
          }
          return;
        }

        // Error case: show inline + toast
        let msg = 'Update failed';
        if (isJsonResponse(data) && !data.success && data.error?.message) {
          msg = data.error.message;
        } else if (!res.ok) {
          msg = `${res.status} ${res.statusText || 'Error'}`;
        }
        setStatus(msg, false);
        try {
          notify.error(msg);
        } catch {}
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-disabled');
        }
      }
    }

    formEl.addEventListener('submit', onSubmit);
    return () => formEl.removeEventListener('submit', onSubmit);
  }, [formId]);

  return null;
}
