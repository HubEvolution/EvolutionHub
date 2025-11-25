import React, { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
import type { ImagEnhancerMVPStrings, UsageData } from './types';
import type { OwnerType, Plan } from '../types';
import { clientLogger } from '@/lib/client-logger';

export interface SimpleResultProps {
  previewUrl: string;
  resultUrl: string;
  strings: ImagEnhancerMVPStrings;
  usage: UsageData | null;
  ownerType: OwnerType | null;
  plan: Plan | null;
  planLabel: string;
  monthlyUsage: UsageData | null;
  creditsBalanceTenths: number | null;
  onDownload: () => void;
  onStartOver: () => void;
  loading: boolean;
  processingLabel: string;
}

/**
 * Simplified result display component for MVP.
 * Shows before/after images with basic controls.
 */
export function SimpleResult(props: SimpleResultProps): React.ReactElement {
  const {
    previewUrl,
    resultUrl,
    strings,
    usage,
    ownerType,
    plan,
    planLabel,
    monthlyUsage,
    creditsBalanceTenths,
    onDownload,
    onStartOver,
    loading,
    processingLabel,
  } = props;

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
  const isDe = locale.startsWith('de');
  const monthlyLabel = strings.monthlyUsage || (isDe ? 'Monatliches Limit' : 'Monthly limit');
  const creditsLabel = strings.creditsBalance || (isDe ? 'Credits-Guthaben' : 'Credits balance');

  const cacheBustedUrl = useMemo(() => {
    try {
      const isAbsolute = /^https?:\/\//i.test(resultUrl);
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://local';
      const u = new URL(resultUrl, base);
      u.searchParams.set('v', Date.now().toString());
      return isAbsolute ? u.toString() : u.pathname + u.search;
    } catch {
      return resultUrl;
    }
  }, [resultUrl]);

  const onImgError = useCallback(() => {
    clientLogger.error('Result image failed to load', { component: 'SimpleResult', resultUrl });
    toast.error(strings.toasts.processingFailed);
  }, [resultUrl, strings.toasts.processingFailed]);

  const planId =
    ownerType === 'user' && plan
      ? plan === 'free'
        ? 'starter'
        : (plan as 'pro' | 'premium' | 'enterprise')
      : null;

  const quotaExceeded = Boolean(usage && usage.used >= usage.limit);

  return (
    <div className="space-y-4">
      {/* Result Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {strings.original}
          </h3>
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={previewUrl}
              alt={strings.original}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Enhanced */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{strings.result}</h3>
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{processingLabel}</p>
                </div>
              </div>
            ) : (
              <img
                src={cacheBustedUrl}
                alt={strings.result}
                className="w-full h-auto object-cover"
                loading="lazy"
                onError={onImgError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button type="button" onClick={onDownload} disabled={loading} className="px-6">
          {strings.download}
        </Button>

        <Button
          type="button"
          onClick={onStartOver}
          disabled={loading}
          variant="secondary"
          className="px-6"
        >
          {strings.ui?.startOver || 'Start Over'}
        </Button>
      </div>

      {/* Usage Info (HUD) */}
      {usage && (
        <div className="mt-2 flex justify-center">
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
          </div>
        </div>
      )}
    </div>
  );
}
