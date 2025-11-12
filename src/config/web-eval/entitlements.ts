import type { Plan } from '@/config/ai-image/entitlements';

export interface WebEvalPlanEntitlements {
  monthlyRuns: number;
  dailyBurstCap: number;
}

const GUEST_ENTITLEMENTS: Readonly<WebEvalPlanEntitlements> = Object.freeze({
  monthlyRuns: 90,
  dailyBurstCap: 3,
});

export const WEB_EVAL_ENTITLEMENTS: Readonly<Record<Plan, WebEvalPlanEntitlements>> = Object.freeze(
  {
    free: { monthlyRuns: 100, dailyBurstCap: 5 },
    pro: { monthlyRuns: 1000, dailyBurstCap: 50 },
    premium: { monthlyRuns: 3000, dailyBurstCap: 100 },
    enterprise: { monthlyRuns: 10000, dailyBurstCap: 400 },
  }
);

export function getWebEvalEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): WebEvalPlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return WEB_EVAL_ENTITLEMENTS[p];
}
