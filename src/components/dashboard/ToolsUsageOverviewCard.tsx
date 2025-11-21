import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import type { UsageOverview } from '@/lib/kv/usage';
import type { BillingSummary } from '@/components/dashboard/BillingCard';

type ToolKey = 'image' | 'video' | 'prompt' | 'voice' | 'webscraper';

type ToolsUsageOverview = Partial<Record<ToolKey, UsageOverview>>;

interface ToolsOverviewStrings {
  title: string;
  subtitle: string;
  columns: {
    tool: string;
    usage: string;
    remaining: string;
    period: string;
  };
  periods: {
    monthly: string;
    daily: string;
  };
  toolNames: Record<ToolKey, string>;
}

type BillingSummaryWithTools = BillingSummary & {
  monthlyLimit?: number;
  monthlyUsed?: number;
  periodEndsAt?: number;
  tools?: ToolsUsageOverview;
  image?: UsageOverview;
  video?: UsageOverview;
  prompt?: UsageOverview;
  voice?: UsageOverview;
  webscraper?: UsageOverview;
  toolsDebug?: {
    envName?: string;
    enableToolsBlock?: boolean;
    toolsCount?: number;
    toolsPresent?: string[];
  };
};

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

const toolOrder: ToolKey[] = ['image', 'video', 'prompt', 'voice', 'webscraper'];

interface Props {
  strings: ToolsOverviewStrings;
}

export default function ToolsUsageOverviewCard({ strings }: Props) {
  const [tools, setTools] = useState<ToolsUsageOverview | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/dashboard/billing-summary', { method: 'GET' });
        if (!res.ok) return;

        const payload = (await res.json().catch(() => null)) as unknown;
        if (!payload) return;

        assertApiResult<BillingSummaryWithTools>(payload);
        if (!payload.success) {
          return;
        }

        const data = payload.data;
        let resolvedTools: ToolsUsageOverview | null = null;

        if (data.tools && typeof data.tools === 'object') {
          resolvedTools = data.tools;
        } else {
          const fromTopLevel: Partial<Record<ToolKey, UsageOverview>> = {};

          for (const key of toolOrder) {
            const candidate = (data as Record<string, unknown>)[key];
            if (
              candidate &&
              typeof candidate === 'object' &&
              'used' in candidate &&
              'limit' in candidate &&
              'remaining' in candidate
            ) {
              fromTopLevel[key] = candidate as UsageOverview;
            }
          }

          resolvedTools =
            Object.keys(fromTopLevel).length > 0
              ? (fromTopLevel as ToolsUsageOverview)
              : null;
        }

        if (!cancelled) {
          setTools(resolvedTools);
        }
      } catch (error) {
        // Dashboard should remain functional even if tools overview fails to load
        // eslint-disable-next-line no-console
        console.warn('[dashboard] failed to load tools overview', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTools = useMemo(
    () =>
      tools
        ? toolOrder
            .map((key) => ({ key, entry: tools[key] }))
            .filter((item) => item.entry && item.entry.limit > 0)
        : [],
    [tools]
  );

  if (!tools || visibleTools.length === 0) {
    return null;
  }

  return (
    <Card as="div" className="group p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-white">{strings.title}</h3>
          <span className="text-[11px] font-medium text-slate-400">{strings.subtitle}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400">
          <span className="font-semibold uppercase tracking-wide">{strings.columns.tool}</span>
          <span className="font-semibold uppercase tracking-wide">{strings.columns.usage}</span>
          <span className="font-semibold uppercase tracking-wide">
            {strings.columns.remaining}
          </span>
          <span className="font-semibold uppercase tracking-wide">{strings.columns.period}</span>
        </div>

        <div className="space-y-1.5">
          {visibleTools.map(({ key, entry }) => {
            if (!entry) return null;

            const toolLabel = strings.toolNames[key];
            const periodLabel =
              key === 'image' || key === 'video' ? strings.periods.monthly : strings.periods.daily;

            return (
              <div key={key} className="grid grid-cols-4 items-baseline gap-2" data-tool={key}>
                <div className="truncate text-xs font-medium text-slate-200" title={toolLabel}>
                  {toolLabel}
                </div>
                <div className="text-xs text-slate-200">
                  {entry.used} / {entry.limit}
                </div>
                <div className="text-xs text-slate-200">{entry.remaining}</div>
                <div className="text-[11px] text-slate-400">{periodLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
