import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export type BillingSummary = {
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  status: string;
  subscriptionId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  lastSyncedAt: string | null;
  creditsRemaining: number | null;
};

interface BillingStrings {
  title: string;
  currentPlan: string;
  statusLabel: string;
  noSubscription: string;
  renewal: string;
  credits: string;
  actions: {
    manage: string;
    cancel: string;
    cancelled: string;
  };
  statusMap: Record<string, string>;
  planLabels: Record<'free' | 'pro' | 'premium' | 'enterprise', string>;
}

interface Props {
  summary: BillingSummary | null;
  strings: BillingStrings;
  manageLink?: string;
}

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
};

type ApiResult<T> = ApiSuccess<T> | ApiError;

function assertApiResult<T>(value: unknown): asserts value is ApiResult<T> {
  if (typeof value !== 'object' || value === null || !('success' in value)) {
    throw new Error('Invalid API response structure');
  }

  const successFlag = (value as { success?: unknown }).success;

  if (successFlag === true) {
    if (!('data' in value)) {
      throw new Error('API success response missing data');
    }
    return;
  }

  if (successFlag === false) {
    const errorPayload = (value as { error?: unknown }).error;
    if (typeof errorPayload !== 'string' || !errorPayload) {
      throw new Error('API error response missing error message');
    }
    return;
  }

  throw new Error('API response has invalid success flag');
}

function formatDate(date: Date | null, locale: string): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function BillingCard({ summary, strings, manageLink = '/pricing' }: Props) {
  const [state, setState] = useState<BillingSummary | null>(summary);
  const [loading, setLoading] = useState(false);

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  const statusLabel = useMemo(() => {
    if (!state) return strings.noSubscription;
    if (state.status === 'inactive') return strings.noSubscription;
    return strings.statusMap[state.status] ?? strings.statusMap.unknown;
  }, [state, strings]);

  const renewalDate = useMemo(() => {
    if (!state || !state.currentPeriodEnd) return null;
    return formatDate(new Date(state.currentPeriodEnd * 1000), locale);
  }, [state, locale]);

  // Refresh summary on mount to ensure latest plan/status from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/billing-summary', { method: 'GET' });
        if (!res.ok) return;

        const payload = (await res.json().catch(() => null)) as unknown;
        if (!payload) {
          return;
        }

        assertApiResult<BillingSummary>(payload);
        if (!cancelled && payload.success) {
          setState(payload.data);
        }
      } catch (error) {
        console.error('Failed to refresh billing summary', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancel = async () => {
    if (!state?.subscriptionId) return;
    setLoading(true);
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId: state.subscriptionId }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error('request_failed');
      }

      if (payload) {
        assertApiResult<unknown>(payload);
        if (payload.success === false) {
          throw new Error(payload.error ?? 'unknown_error');
        }
      }

      toast.success(strings.actions.cancelled);
      setState((current) =>
        current
          ? {
              ...current,
              cancelAtPeriodEnd: true,
            }
          : current
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to cancel subscription';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-white">{strings.title}</h3>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {strings.currentPlan}
          </span>
          <span className="text-lg font-bold text-white">
            {strings.planLabels[state?.plan ?? 'free']}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {strings.statusLabel}
          </span>
          <span className="text-sm font-medium text-slate-300">{statusLabel}</span>
          {state && (state.status !== 'active' || state.cancelAtPeriodEnd) ? (
            <a
              href={manageLink}
              className="mt-0.5 inline-block text-xs font-semibold text-emerald-400 hover:underline"
            >
              {strings.actions.manage}
            </a>
          ) : null}
        </div>

        {state && state.creditsRemaining !== null && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {strings.credits}
            </span>
            <span className="text-sm font-medium text-slate-300">{state.creditsRemaining}</span>
          </div>
        )}

        {renewalDate && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {strings.renewal}
            </span>
            <span className="text-sm text-slate-300">{renewalDate}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <a
            href={manageLink}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
          >
            {strings.actions.manage}
          </a>
          {state?.subscriptionId && !state.cancelAtPeriodEnd ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 backdrop-blur-sm transition hover:border-red-300/50 hover:bg-red-500/30 disabled:opacity-50"
            >
              {loading ? '...' : strings.actions.cancel}
            </button>
          ) : state?.cancelAtPeriodEnd ? (
            <span className="inline-flex items-center rounded-lg border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-300">
              {strings.actions.cancelled}
            </span>
          ) : null}
        </div>

        {state?.lastSyncedAt && (
          <p className="text-xs text-slate-500">
            Last synced {formatDate(new Date(state.lastSyncedAt), locale)}
          </p>
        )}
      </div>
    </div>
  );
}
