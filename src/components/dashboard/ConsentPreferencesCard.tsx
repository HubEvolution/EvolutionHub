import { useCallback, useEffect, useMemo, useState } from 'react';

type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

type StatusKey = 'granted' | 'limited' | 'disabled';

type ConsentStrings = {
  title: string;
  description: string;
  categories: {
    necessary: {
      label: string;
      description: string;
    };
    analytics: {
      label: string;
      description: string;
    };
    marketing: {
      label: string;
      description: string;
    };
  };
  actions: {
    manage: string;
    acceptAll: string;
    rejectAll: string;
  };
  status: Record<StatusKey, string>;
};

interface Props {
  strings: ConsentStrings;
  manageHref: string;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function readStoredPreferences(): ConsentPreferences {
  try {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

    const cc = (window as unknown as { CookieConsent?: unknown }).CookieConsent as
      | {
          getUserPreferences?: () => unknown;
        }
      | undefined;

    if (cc && typeof cc.getUserPreferences === 'function') {
      const prefs = cc.getUserPreferences();
      if (prefs && typeof prefs === 'object') {
        const accepted = Array.isArray((prefs as { accepted?: unknown }).accepted)
          ? ((prefs as { accepted?: string[] }).accepted ?? [])
          : [];
        const analyticsAccepted = Boolean(
          (prefs as { analytics?: boolean }).analytics ?? accepted.includes('analytics')
        );
        const marketingAccepted = Boolean(
          (prefs as { marketing?: boolean }).marketing ?? accepted.includes('marketing')
        );
        return {
          necessary: true,
          analytics: analyticsAccepted,
          marketing: marketingAccepted,
        };
      }
    }
  } catch (error) {
    console.warn('[ConsentCard] Failed to read CookieConsent prefs', error);
  }

  try {
    const status = localStorage.getItem('cookieconsent_status');
    if (status === 'accept') {
      return {
        necessary: true,
        analytics: true,
        marketing: true,
      };
    }
    if (status === 'accept_specific') {
      const raw = localStorage.getItem('cookieconsent_preferences');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ConsentPreferences> | null;
        if (parsed && typeof parsed === 'object') {
          return {
            necessary: true,
            analytics: Boolean(parsed.analytics),
            marketing: Boolean(parsed.marketing),
          };
        }
      }
    }
  } catch (error) {
    console.warn('[ConsentCard] Failed to read stored preferences', error);
  }

  return DEFAULT_PREFERENCES;
}

function persistPreferences(preferences: ConsentPreferences) {
  try {
    const status = preferences.analytics && preferences.marketing ? 'accept' : 'accept_specific';
    localStorage.setItem('cookieconsent_status', status);
    localStorage.setItem('cookieconsent_preferences', JSON.stringify(preferences));
  } catch (error) {
    console.warn('[ConsentCard] Failed to persist preferences', error);
  }
}

function dispatchConsentEvent(preferences: ConsentPreferences) {
  try {
    document.dispatchEvent(
      new CustomEvent('cookieconsent:userpreferencesset', { detail: preferences })
    );
  } catch (error) {
    console.warn('[ConsentCard] Failed to dispatch consent event', error);
  }
}

function syncCookieConsent(preferences: ConsentPreferences) {
  try {
    const cc = (window as unknown as { CookieConsent?: unknown }).CookieConsent as
      | {
          accept?: () => void;
          reject?: () => void;
          acceptCategory?: (category: string) => void;
          rejectCategory?: (category: string) => void;
        }
      | undefined;

    if (!cc) return;

    if (preferences.analytics && preferences.marketing) {
      if (typeof cc.accept === 'function') {
        cc.accept();
        return;
      }
    }

    if (!preferences.analytics && !preferences.marketing) {
      if (typeof cc.reject === 'function') {
        cc.reject();
        return;
      }
    }

    if (typeof cc.acceptCategory === 'function') {
      cc.acceptCategory('necessary');
      if (preferences.analytics) {
        cc.acceptCategory('analytics');
      } else if (typeof cc.rejectCategory === 'function') {
        cc.rejectCategory('analytics');
      }

      if (preferences.marketing) {
        cc.acceptCategory('marketing');
      } else if (typeof cc.rejectCategory === 'function') {
        cc.rejectCategory('marketing');
      }
    }
  } catch (error) {
    console.warn('[ConsentCard] Failed to sync CookieConsent state', error);
  }
}

export default function ConsentPreferencesCard({ strings, manageHref }: Props) {
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
  const [busyAction, setBusyAction] = useState<'acceptAll' | 'rejectAll' | null>(null);

  useEffect(() => {
    setPreferences(readStoredPreferences());

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ConsentPreferences>>).detail;
      if (!detail || typeof detail !== 'object') return;
      setPreferences((prev) => ({
        necessary: true,
        analytics: Boolean('analytics' in detail ? detail.analytics : prev.analytics),
        marketing: Boolean('marketing' in detail ? detail.marketing : prev.marketing),
      }));
    };

    document.addEventListener('cookieconsent:userpreferencesset', handler);
    return () => {
      document.removeEventListener('cookieconsent:userpreferencesset', handler);
    };
  }, []);

  const overallStatus = useMemo<StatusKey>(() => {
    if (preferences.analytics && preferences.marketing) return 'granted';
    if (preferences.analytics || preferences.marketing) return 'limited';
    return 'disabled';
  }, [preferences]);

  const applyPreferences = useCallback((next: ConsentPreferences) => {
    setPreferences(next);
    persistPreferences(next);
    dispatchConsentEvent(next);
    if (typeof window !== 'undefined') {
      syncCookieConsent(next);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    setBusyAction('acceptAll');
    try {
      applyPreferences({ necessary: true, analytics: true, marketing: true });
    } finally {
      setBusyAction(null);
    }
  }, [applyPreferences]);

  const handleRejectAll = useCallback(() => {
    setBusyAction('rejectAll');
    try {
      applyPreferences({ necessary: true, analytics: false, marketing: false });
    } finally {
      setBusyAction(null);
    }
  }, [applyPreferences]);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 via-slate-950/40 to-emerald-950/40 p-5 shadow-xl backdrop-blur-sm transition-all hover:border-cyan-400/30 hover:shadow-cyan-500/20">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 opacity-60" />
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-cyan-100">{strings.title}</h3>
          <p className="text-sm leading-relaxed text-slate-300/90">{strings.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
            {strings.status[overallStatus]}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                key: 'necessary' as const,
                enabled: true,
              },
              {
                key: 'analytics' as const,
                enabled: preferences.analytics,
              },
              {
                key: 'marketing' as const,
                enabled: preferences.marketing,
              },
            ] satisfies { key: keyof ConsentStrings['categories']; enabled: boolean }[]
          ).map(({ key, enabled }) => (
            <div
              key={key}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white/90">
                  {strings.categories[key].label}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    enabled ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {strings.status[enabled ? 'granted' : 'disabled']}
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug text-slate-300/80">
                {strings.categories[key].description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleAcceptAll}
            disabled={busyAction !== null}
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 backdrop-blur-sm transition hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {busyAction === 'acceptAll' ? '…' : strings.actions.acceptAll}
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            disabled={busyAction !== null}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-400/40 bg-slate-500/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-sm transition hover:bg-slate-500/20 disabled:opacity-60"
          >
            {busyAction === 'rejectAll' ? '…' : strings.actions.rejectAll}
          </button>
          <a
            href={manageHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 backdrop-blur-sm transition hover:bg-cyan-500/20"
          >
            {strings.actions.manage}
          </a>
        </div>
      </div>
    </div>
  );
}
