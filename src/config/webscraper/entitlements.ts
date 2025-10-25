import type { Plan } from '@/config/ai-image/entitlements';

export interface WebscraperPlanEntitlements {
  dailyBurstCap: number;
}

const GUEST_ENTITLEMENTS: Readonly<WebscraperPlanEntitlements> = Object.freeze({
  dailyBurstCap: 5,
});

export const WEBSCRAPER_ENTITLEMENTS: Readonly<Record<Plan, WebscraperPlanEntitlements>> =
  Object.freeze({
    free: { dailyBurstCap: 20 },
    pro: { dailyBurstCap: 100 },
    premium: { dailyBurstCap: 300 },
    enterprise: { dailyBurstCap: 1000 },
  });

export function getWebscraperEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): WebscraperPlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return WEBSCRAPER_ENTITLEMENTS[p];
}
