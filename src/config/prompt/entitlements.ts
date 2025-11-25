import type { Plan } from '@/config/ai-image/entitlements';

export interface PromptPlanEntitlements {
  dailyBurstCap: number;
  monthlyRuns: number;
}

const GUEST_ENTITLEMENTS: Readonly<PromptPlanEntitlements> = Object.freeze({
  // Conservative guest caps to protect from abuse
  dailyBurstCap: 10,
  monthlyRuns: 100,
});

export const PROMPT_ENTITLEMENTS: Readonly<Record<Plan, PromptPlanEntitlements>> = Object.freeze({
  // Free users: Prompt Enhancer fungiert als "Free Tool" mit sehr großzügigen Quoten
  free: {
    dailyBurstCap: 100,
    monthlyRuns: 2000,
  },
  pro: {
    dailyBurstCap: 500,
    monthlyRuns: 15000,
  },
  premium: {
    dailyBurstCap: 2000,
    monthlyRuns: 60000,
  },
  enterprise: {
    dailyBurstCap: 10000,
    monthlyRuns: 1000000,
  },
});

export function getPromptEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): PromptPlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return PROMPT_ENTITLEMENTS[p];
}
