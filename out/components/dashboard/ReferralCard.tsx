import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ReferralStatus = 'pending' | 'verified' | 'paid' | 'cancelled';

export type ReferralStatsSummary = {
  referredTotal: number;
  verified: number;
  paid: number;
  pending: number;
  cancelled: number;
  totalCredits: number;
};

export type ReferralEventListItem = {
  id: string;
  status: ReferralStatus;
  occurredAt: number;
  creditsAwarded: number;
};

export type ReferralSummary = {
  referralCode: string;
  referralLink: string;
  stats: ReferralStatsSummary;
  recentEvents: ReferralEventListItem[];
  updatedAt: number;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  error: {
    type: string;
    message: string;
  };
};
type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ReferralCardStrings = {
  title: string;
  description: string;
  linkLabel: string;
  copy: string;
  copied: string;
  loading: string;
  error: string;
  empty: string;
  statsTitle: string;
  stats: {
    referred: string;
    verified: string;
    paid: string;
    pending: string;
    cancelled: string;
  };
  creditsEarned: string;
  recentTitle: string;
  recentEmpty: string;
  status: Record<ReferralStatus, string>;
  updated: string;
  retry: string;
};

interface ReferralCardProps {
  initialSummary: ReferralSummary | null;
  strings: ReferralCardStrings;
}

function assertApiResponse(value: unknown): asserts value is ApiResponse<ReferralSummary> {
  if (!value || typeof value !== 'object' || !('success' in value)) {
    throw new Error('Invalid response structure');
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function ReferralCard({ initialSummary, strings }: ReferralCardProps) {
  const [summary, setSummary] = useState<ReferralSummary | null>(initialSummary);
  const [loading, setLoading] = useState<boolean>(!initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/referral-summary', { method: 'GET' });
      if (!res.ok) {
        throw new Error('request_failed');
      }
      const payload = (await res.json().catch(() => null)) as unknown;
      assertApiResponse(payload);
      if (!mountedRef.current) return;
      if (payload.success) {
        setSummary(payload.data);
      } else {
        throw new Error(payload.error?.message ?? 'request_failed');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(strings.error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [strings.error]);

  useEffect(() => {
    // Always refresh on mount for up-to-date data
    fetchSummary().catch(() => undefined);
  }, [fetchSummary]);

  const handleCopy = useCallback(async () => {
    if (!summary?.referralLink) return;
    try {
      await navigator.clipboard.writeText(summary.referralLink);
      setCopied(true);
    } catch (err) {
      console.error('clipboard_failed', err);
      setCopied(true);
    }
  }, [summary?.referralLink]);

  const stats = summary?.stats;
  const recentEvents = summary?.recentEvents ?? [];
  const isEmpty = !summary && !loading && !error;

  const hasEvents = recentEvents.length > 0;

  const copyButtonLabel = copied ? strings.copied : strings.copy;

  const cardStatus = useMemo(() => {
    if (loading && !summary) {
      return 'loading';
    }
    if (error) {
      return 'error';
    }
    if (isEmpty) {
      return 'empty';
    }
    return 'ready';
  }, [loading, summary, error, isEmpty]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">{strings.title}</h3>
          <p className="text-sm text-slate-300">{strings.description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {strings.linkLabel}
          </span>
          <div className="flex w-full flex-col gap-2 sm:w-[320px] sm:flex-row">
            <div className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
              {summary?.referralLink ?? '—'}
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/30 disabled:opacity-60"
              onClick={handleCopy}
              disabled={!summary?.referralLink}
            >
              {copyButtonLabel}
            </button>
          </div>
        </div>
      </div>

      {cardStatus === 'loading' && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          {strings.loading}
        </div>
      )}

      {cardStatus === 'error' && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <span>{strings.error}</span>
          <button
            type="button"
            className="inline-flex w-fit items-center rounded-md border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-300/60 hover:bg-red-500/30"
            onClick={fetchSummary}
          >
            {strings.retry}
          </button>
        </div>
      )}

      {cardStatus === 'empty' && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          {strings.empty}
        </div>
      )}

      {cardStatus === 'ready' && summary && stats && (
        <div className="space-y-5">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {strings.statsTitle}
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatBlock label={strings.stats.referred} value={stats.referredTotal} />
              <StatBlock label={strings.stats.verified} value={stats.verified} />
              <StatBlock label={strings.stats.paid} value={stats.paid} />
              <StatBlock label={strings.stats.pending} value={stats.pending} />
              <StatBlock label={strings.stats.cancelled} value={stats.cancelled} />
              <StatBlock
                label={strings.creditsEarned}
                value={stats.totalCredits}
                highlight
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                {strings.recentTitle}
              </h4>
              <span className="text-xs text-slate-500">
                {strings.updated}: {formatDateTime(summary.updatedAt)}
              </span>
            </div>

            {hasEvents ? (
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {recentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        {strings.status[event.status]}
                      </span>
                      <p className="text-xs text-slate-300">
                        {formatDateTime(event.occurredAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-white">
                        +{formatNumber(event.creditsAwarded)}
                      </span>
                      <p className="text-xs text-slate-400">{strings.creditsEarned}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-300">{strings.recentEmpty}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'flex flex-col gap-1 rounded-md border border-white/10 px-3 py-2 ' +
        (highlight ? 'bg-emerald-500/10 text-emerald-100' : 'bg-white/5 text-slate-200')
      }
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-lg font-bold text-white">{formatNumber(value)}</span>
    </div>
  );
}
