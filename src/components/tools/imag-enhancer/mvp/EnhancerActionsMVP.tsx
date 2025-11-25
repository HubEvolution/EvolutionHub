import type React from 'react';
import Button from '@/components/ui/Button';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
import type { ImagEnhancerMVPStrings, ModelOption, UsageData } from './types';
import type { OwnerType, Plan } from '../types';

export interface EnhancerActionsMVPProps {
  strings: ImagEnhancerMVPStrings;
  model: string;
  models: readonly ModelOption[];
  onChangeModel: (model: string) => void;
  canSubmit: boolean;
  loading: boolean;
  onEnhance: () => void;
  usage: UsageData | null;
  quotaExceeded: boolean;
  ownerType: OwnerType | null;
  plan: Plan | null;
  planLabel: string;
  monthlyUsage: UsageData | null;
  creditsBalanceTenths: number | null;
}

/**
 * Simplified action bar for MVP with strict typing.
 */
export function EnhancerActionsMVP(props: EnhancerActionsMVPProps): React.ReactElement {
  const {
    strings,
    model,
    models,
    onChangeModel,
    canSubmit,
    loading,
    onEnhance,
    usage,
    quotaExceeded,
    ownerType,
    plan,
    planLabel,
    monthlyUsage,
    creditsBalanceTenths,
  } = props;

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
  const isDe = locale.startsWith('de');
  const monthlyLabel = strings.monthlyUsage || (isDe ? 'Monatliches Limit' : 'Monthly limit');
  const creditsLabel = strings.creditsBalance || (isDe ? 'Credits-Guthaben' : 'Credits balance');

  const planId =
    ownerType === 'user' && plan
      ? plan === 'free'
        ? 'starter'
        : (plan as 'pro' | 'premium' | 'enterprise')
      : null;

  return (
    <div className="space-y-4">
      {/* Model Selection */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label
          htmlFor="model-select"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit"
        >
          {strings.model}
        </label>
        <select
          id="model-select"
          value={model}
          onChange={(e) => onChangeModel(e.target.value)}
          className="flex-1 sm:w-auto sm:min-w-[200px] rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          {models.map((modelOption) => (
            <option key={modelOption.slug} value={modelOption.slug}>
              {modelOption.label}
            </option>
          ))}
        </select>
      </div>

      {/* Enhance Button */}
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={onEnhance}
          disabled={!canSubmit || loading || quotaExceeded}
          size="md"
          className="px-8"
        >
          {loading ? strings.processing : strings.enhance}
        </Button>
      </div>

      {/* Usage Info */}
      {usage && (
        <div className="flex justify-center">
          <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-2">
            <ToolUsageBadge
              label={strings.usage}
              loadingLabel={strings.loading}
              usage={usage}
              ownerType={ownerType}
              planId={planId}
              planLabel={planLabel}
              layout="card"
              size="md"
              align="center"
              showIcon
              showResetHint={false}
              showOwnerHint={false}
              showPercent
              severity={quotaExceeded ? 'critical' : undefined}
              detailsTitle={strings.usageDetailsTitle}
              resetLabel={strings.resetLabel}
              headerCredits={
                creditsBalanceTenths != null ? Math.round(creditsBalanceTenths) / 10 : null
              }
              detailsItems={[
                {
                  id: 'daily',
                  label: strings.usage,
                  used: usage.used,
                  limit: usage.limit,
                  resetAt: usage.resetAt,
                },
                ...(monthlyUsage
                  ? [
                      {
                        id: 'monthly',
                        label: monthlyLabel,
                        used: monthlyUsage.used,
                        limit: monthlyUsage.limit,
                        resetAt: monthlyUsage.resetAt,
                      },
                    ]
                  : []),
                ...(creditsBalanceTenths != null
                  ? [
                      {
                        id: 'credits',
                        label: creditsLabel,
                        used: Math.round(creditsBalanceTenths) / 10,
                        limit: null,
                        kind: 'credits' as const,
                      },
                    ]
                  : []),
              ]}
            />
            {quotaExceeded && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                {strings.quotaBanner}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
