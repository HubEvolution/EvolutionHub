import { useMemo, useState } from 'react';

type OwnerType = 'user' | 'guest' | null;

type PlanId = 'starter' | 'pro' | 'premium' | 'enterprise';

type UsageSeverity = 'ok' | 'warn' | 'critical';

interface UsageShape {
  used: number;
  limit: number;
  resetAt: number | null;
}

export interface ToolUsageDetailItem {
  id: string;
  label: string;
  used: number;
  limit: number | null;
  resetAt?: number | null;
  kind?: 'requests' | 'credits';
}

interface ToolUsageBadgeProps {
  label: string;
  loadingLabel: string;
  usage: UsageShape | null;
  ownerType: OwnerType;
  planId: PlanId | null;
  planLabel?: string;
  layout?: 'pill' | 'card';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  showResetHint?: boolean;
  showOwnerHint?: boolean;
  showPercent?: boolean;
  align?: 'left' | 'right' | 'center';
  severity?: UsageSeverity;
  detailsItems?: ToolUsageDetailItem[];
  detailsTitle?: string;
  resetLabel?: string;
  headerCredits?: number | null;
}

const PLAN_BADGE_CLASSES: Record<PlanId, string> = {
  starter:
    'bg-slate-100/80 dark:bg-slate-900/60 ring-1 ring-slate-300/70 dark:ring-slate-600/70 text-slate-700 dark:text-slate-200',
  pro: 'bg-gradient-to-r from-primary-500/20 via-primary-400/18 to-primary-300/20 dark:from-primary-400/30 dark:via-primary-500/25 dark:to-primary-600/30 ring-1 ring-primary-300/70 dark:ring-primary-400/80 text-primary-900 dark:text-primary-50',
  premium:
    'bg-gradient-to-r from-secondary-500/20 via-secondary-400/18 to-primary-400/20 dark:from-secondary-500/30 dark:via-secondary-400/25 dark:to-primary-500/30 ring-1 ring-secondary-300/70 dark:ring-secondary-400/80 text-white dark:text-secondary-50',
  enterprise:
    'bg-gradient-to-r from-secondary-500/22 via-primary-500/20 to-primary-400/22 dark:from-secondary-500/32 dark:via-primary-500/30 dark:to-primary-400/32 ring-1 ring-primary-300/80 dark:ring-primary-400/90 text-white dark:text-primary-50',
};

const GUEST_BADGE_CLASSES =
  'bg-slate-100/80 dark:bg-slate-900/60 ring-1 ring-slate-400/70 dark:ring-slate-500/80 text-slate-700 dark:text-slate-200';

function PlanBadge({
  ownerType,
  planId,
  planLabel,
}: {
  ownerType: OwnerType;
  planId: PlanId | null;
  planLabel?: string;
}) {
  if (!planLabel) return null;

  if (ownerType === 'guest') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${GUEST_BADGE_CLASSES}`}
      >
        {planLabel}
      </span>
    );
  }

  if (ownerType !== 'user' || !planId) return null;

  const cls = PLAN_BADGE_CLASSES[planId];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${cls}`}>
      {planLabel}
    </span>
  );
}

export function ToolUsageBadge({
  label,
  loadingLabel,
  usage,
  ownerType,
  planId,
  planLabel,
  layout = 'pill',
  size = 'sm',
  showIcon = true,
  showResetHint = false,
  showOwnerHint = true,
  showPercent = false,
  align = 'left',
  severity,
  detailsItems,
  detailsTitle,
  resetLabel,
  headerCredits,
}: ToolUsageBadgeProps) {
  const percent = useMemo(() => {
    if (!usage || !usage.limit) return 0;
    return Math.min(100, Math.max(0, Math.round((usage.used / usage.limit) * 100)));
  }, [usage]);

  const effectiveSeverity: UsageSeverity = useMemo(() => {
    if (severity) return severity;
    if (!usage || !usage.limit) return 'ok';
    if (usage.used >= usage.limit || percent >= 90) return 'critical';
    if (percent >= 70) return 'warn';
    return 'ok';
  }, [severity, usage, percent]);

  const tooltip = useMemo(() => {
    const parts: string[] = [];

    if (Array.isArray(detailsItems) && detailsItems.length > 0) {
      for (const item of detailsItems) {
        if (item.limit != null) {
          parts.push(`${item.label}: ${item.used}/${item.limit}`);
        } else {
          parts.push(`${item.label}: ${item.used}`);
        }
      }
    } else if (usage) {
      parts.push(`${label}: ${usage.used}/${usage.limit}`);
      if (typeof usage.resetAt === 'number' && Number.isFinite(usage.resetAt)) {
        try {
          const d = new Date(usage.resetAt);
          const locale =
            typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
          const ts = d.toLocaleString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          parts.push(ts);
        } catch {
          /* ignore formatting errors */
        }
      }
    } else {
      return loadingLabel;
    }

    if (showOwnerHint && ownerType) {
      parts.push(`owner: ${ownerType}`);
    }

    return parts.join('\n');
  }, [detailsItems, label, loadingLabel, ownerType, showOwnerHint, usage]);

  const rootAlign =
    align === 'right'
      ? 'items-end text-right'
      : align === 'center'
        ? 'items-center text-center'
        : 'items-start text-left';
  const compact = size === 'sm';

  const barColor =
    effectiveSeverity === 'critical'
      ? 'bg-gradient-to-r from-red-500 via-red-400 to-amber-400'
      : effectiveSeverity === 'warn'
        ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-primary-300'
        : 'bg-gradient-to-r from-primary-400 via-primary-300 to-secondary-400';

  const hasDetails = Array.isArray(detailsItems) && detailsItems.length > 0;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (layout === 'card') {
    return (
      <div
        className={`relative inline-flex ${rootAlign}`}
        onMouseEnter={() => {
          setHovered(true);
          if (hasDetails) setDetailsOpen(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
          if (hasDetails) setDetailsOpen(false);
        }}
      >
        {hovered && tooltip && (
          <div className="absolute -top-2 right-0 -translate-y-full max-w-xs rounded-md border border-slate-700 bg-slate-950/95 px-2.5 py-1.5 text-[11px] leading-snug text-slate-100 shadow-lg whitespace-pre-line pointer-events-none z-50">
            {tooltip}
          </div>
        )}
        <div
          className={`w-full max-w-xs sm:max-w-sm rounded-2xl border border-cyan-400/25 bg-slate-900/50 dark:bg-slate-900/60 shadow-[0_0_40px_rgba(34,211,238,0.25)] backdrop-blur-md px-3.5 py-3 flex flex-col gap-2 ${
            hasDetails ? 'cursor-pointer' : 'cursor-default'
          }`}
          onClick={hasDetails ? () => setDetailsOpen((open) => !open) : undefined}
          role={hasDetails ? 'button' : undefined}
          aria-haspopup={hasDetails ? 'dialog' : undefined}
          aria-expanded={hasDetails ? detailsOpen : undefined}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[11px] uppercase tracking-[0.16em] text-cyan-300/90 whitespace-nowrap">
                {label}
              </span>
              <div className="flex items-baseline gap-1 text-xs text-slate-200">
                <span className="sr-only text-gray-600">
                  {usage ? `${label}: ${usage.used}/${usage.limit}` : loadingLabel}
                </span>
                <span className="text-sm font-semibold text-slate-50">
                  {usage ? usage.used : '-'}
                </span>
                <span className="text-xs text-slate-400">/{usage ? usage.limit : '-'}</span>
                {showPercent && usage && (
                  <span className="ml-1 font-medium text-cyan-300">{percent}%</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {typeof headerCredits === 'number' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/70 bg-primary-500/25 px-2 py-0.5 font-mono text-[11px] text-cyan-50">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                    aria-hidden="true"
                  />
                  {headerCredits}
                </span>
              )}
              <PlanBadge ownerType={ownerType} planId={planId} planLabel={planLabel} />
            </div>
          </div>
          <div className="mt-1 w-full bg-slate-900/70 dark:bg-slate-50/5 rounded-full h-1.5 overflow-hidden">
            <div
              className={`${barColor} h-1.5 rounded-full transition-all duration-300`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {showResetHint && usage && usage.resetAt && (
            <div className="pt-0.5 text-[10px] text-slate-400/60 italic" aria-hidden="true">
              {tooltip}
            </div>
          )}
        </div>
        {hasDetails && (
          <div
            className={`absolute z-40 mt-2 left-1/2 -translate-x-1/2 w-72 rounded-2xl border border-cyan-400/40 bg-slate-950/95 shadow-[0_0_45px_rgba(34,211,238,0.5)] backdrop-blur-xl px-3.5 py-3 transition-all duration-150 ${
              detailsOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}
            role="dialog"
            aria-label={detailsTitle || label}
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-300/90 mb-1.5">
              {detailsTitle || label}
            </div>
            <ul className="space-y-1.5 text-xs text-slate-100 text-left">
              {detailsItems!.map((item, index) => {
                const itemPercent =
                  item.limit && item.limit > 0
                    ? Math.min(100, Math.max(0, Math.round((item.used / item.limit) * 100)))
                    : null;
                const isCredits = item.kind === 'credits';
                return (
                  <li
                    key={item.id}
                    className={`flex flex-col gap-1 pt-1.5 ${
                      index > 0 ? 'mt-1.5 border-t border-slate-800/80' : ''
                    }`}
                  >
                    {isCredits ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-200 truncate flex-1">{item.label}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/70 bg-primary-500/25 px-3 py-1 font-mono text-[12px] text-cyan-50">
                          {item.used}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-slate-200 truncate flex-1">{item.label}</span>
                          <div className="flex flex-col items-end gap-0.5 text-right">
                            {item.limit != null && (
                              <span className="font-mono text-[11px] text-slate-50 whitespace-nowrap">
                                {`${item.used}/${item.limit}`}
                              </span>
                            )}
                            {itemPercent !== null && (
                              <span className="font-mono text-[10px] text-cyan-300 whitespace-nowrap">
                                {itemPercent}%
                              </span>
                            )}
                          </div>
                        </div>
                        {itemPercent !== null && (
                          <div className="h-1.5 w-full rounded-full bg-slate-900/80 overflow-hidden">
                            <div
                              className={`${barColor} h-1.5 rounded-full`}
                              style={{ width: `${itemPercent}%` }}
                            />
                          </div>
                        )}
                        {item.resetAt && (
                          <div className="text-[10px] text-slate-400/70 italic">
                            {resetLabel
                              ? `${resetLabel} ${new Date(item.resetAt).toLocaleString()}`
                              : new Date(item.resetAt).toLocaleString()}
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${rootAlign}`} title={tooltip}>
      <div className="flex items-center gap-2 flex-wrap">
        {showIcon && (
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-primary-500 via-primary-400 to-secondary-500 shadow-[0_0_0_1px_rgba(15,118,110,0.45)]" />
        )}
        <PlanBadge ownerType={ownerType} planId={planId} planLabel={planLabel} />
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ring-1 ${
            effectiveSeverity === 'critical'
              ? 'bg-red-500/15 ring-red-400/40 text-red-600 dark:text-red-300'
              : effectiveSeverity === 'warn'
                ? 'bg-amber-500/10 ring-amber-400/40 text-amber-700 dark:text-amber-200'
                : 'bg-white/10 dark:bg-slate-800/60 ring-cyan-400/20 text-gray-700 dark:text-gray-200'
          } ${usage ? '' : 'opacity-70'}`}
        >
          {label}: {usage ? `${usage.used}/${usage.limit}` : loadingLabel}
          {showPercent && usage && <span className="opacity-75">({percent}%)</span>}
          {showOwnerHint && ownerType && <span className="opacity-70">({ownerType})</span>}
        </span>
      </div>
      <span
        className={`mt-1 block rounded-full overflow-hidden ${compact ? 'h-[2px] w-24' : 'h-1 w-28'} bg-white/10 dark:bg-slate-900/60`}
        aria-hidden="true"
      >
        <span
          className={`${barColor} block h-full rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}

export default ToolUsageBadge;
