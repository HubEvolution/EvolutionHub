/*
 * src/scripts/verify-email-client.ts
 * Client-Logik für die Seite verify-email.astro
 * - Resend-Request
 * - Button-State + Countdown
 * - Basis-A11y (aria-busy/aria-disabled)
 * - Liefert Cleanup-Funktion zurück, um Timer/Listener aufzuräumen
 */

export default function init(): () => void {
  const resendBtn = document.getElementById('resend-btn') as HTMLButtonElement | null;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement | null;
  const successMessage = document.getElementById('success-message') as HTMLDivElement | null;
  const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement | null;

  if (!resendBtn) {
    // Nichts zu initialisieren
    return () => {};
  }

  let isResending = false;
  let countdownInterval: number | null = null;
  let abortCtrl: AbortController | null = null;
  const defaultLabel = resendBtn.textContent || '📧 E-Mail erneut senden';

  const hideMessages = () => {
    errorMessage?.classList.add('hidden');
    successMessage?.classList.add('hidden');
  };

  const showError = (message: string) => {
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.classList.remove('hidden');
    }
  };

  const showSuccess = (message: string) => {
    if (successMessage) {
      successMessage.textContent = message;
      successMessage.classList.remove('hidden');
    }
  };

  const setBusy = (busy: boolean, labelWhenBusy?: string) => {
    isResending = busy;
    resendBtn.disabled = busy;
    resendBtn.setAttribute('aria-busy', String(busy));
    resendBtn.setAttribute('aria-disabled', String(busy));
    resendBtn.textContent = busy ? (labelWhenBusy || '⏳ Wird gesendet...') : defaultLabel;
  };

  const clearCountdown = () => {
    if (countdownInterval !== null) {
      window.clearInterval(countdownInterval);
      countdownInterval = null;
    }
  };

  const startCountdown = (seconds: number) => {
    let remaining = seconds;
    setBusy(true, `⏳ Erneut senden (${remaining}s)`);

    clearCountdown();
    countdownInterval = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        setBusy(false);
        return;
      }
      resendBtn.textContent = `⏳ Erneut senden (${remaining}s)`;
    }, 1000);
  };

  const resetButton = () => {
    clearCountdown();
    setBusy(false);
  };

  const onClick = async () => {
    if (isResending) return;

    const email = emailInput?.value || '';
    if (!email) {
      showError('E-Mail-Adresse nicht verfügbar. Bitte registrieren Sie sich erneut.');
      return;
    }

    hideMessages();
    setBusy(true);

    try {
      abortCtrl?.abort();
      abortCtrl = new AbortController();

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: abortCtrl.signal,
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && (result as any).success) {
        showSuccess('✅ E-Mail erfolgreich erneut gesendet! Prüfen Sie Ihr Postfach.');
        startCountdown(60);
      } else {
        showError((result as any)?.message || 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.');
        resetButton();
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        // Navigationsabbruch o. ä.
        return;
      }
      console.error('Resend verification error:', err);
      showError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      resetButton();
    }
  };

  resendBtn.addEventListener('click', onClick);

  // Auto-hide messages nach 10s (wie bisheriges Verhalten)
  const autoHideTimeout = window.setTimeout(hideMessages, 10000);

  // Cleanup-Funktion zurückgeben
  return () => {
    try {
      resendBtn.removeEventListener('click', onClick);
    } catch {}
    try {
      window.clearTimeout(autoHideTimeout);
    } catch {}
    try {
      clearCountdown();
    } catch {}
    try {
      abortCtrl?.abort();
    } catch {}
    try {
      // Button-Zustand wiederherstellen
      resendBtn.textContent = defaultLabel;
      resendBtn.disabled = false;
      resendBtn.removeAttribute('aria-busy');
      resendBtn.removeAttribute('aria-disabled');
    } catch {}
  };
}
