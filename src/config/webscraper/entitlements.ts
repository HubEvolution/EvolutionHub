import type { Plan } from '@/config/ai-image/entitlements';

export interface WebscraperPlanEntitlements {
  dailyBurstCap: number;
  monthlyRuns: number;
}

const GUEST_ENTITLEMENTS: Readonly<WebscraperPlanEntitlements> = Object.freeze({
  dailyBurstCap: 5,
  monthlyRuns: 60,
});

export const WEBSCRAPER_ENTITLEMENTS: Readonly<Record<Plan, WebscraperPlanEntitlements>> =
  Object.freeze({
    free: { dailyBurstCap: 20, monthlyRuns: 200 },
    pro: { dailyBurstCap: 100, monthlyRuns: 2000 },
    premium: { dailyBurstCap: 300, monthlyRuns: 6000 },
    enterprise: { dailyBurstCap: 1000, monthlyRuns: 20000 },
  });

export function getWebscraperEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): WebscraperPlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return WEBSCRAPER_ENTITLEMENTS[p];
}
