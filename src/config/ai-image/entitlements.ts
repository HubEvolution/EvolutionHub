export type Plan = 'free' | 'pro' | 'premium' | 'enterprise';

export interface PlanEntitlements {
  monthlyImages: number;      // total images per calendar month
  dailyBurstCap: number;      // max images per rolling 24h window
  maxUpscale: 2 | 4 | 6 | 8;  // allowed upscale factor
  faceEnhance: boolean;       // allow face enhancement toggle
  // Future: add maxMegapixels, batchMax, api monthly calls, queue priority, commercial use, support SLA
}

export const ENTITLEMENTS: Readonly<Record<Plan, PlanEntitlements>> = Object.freeze({
  free: {
    monthlyImages: 450,
    dailyBurstCap: 15,
    maxUpscale: 2,
    faceEnhance: false,
  },
  pro: {
    monthlyImages: 400,
    dailyBurstCap: 40,
    maxUpscale: 4,
    faceEnhance: true,
  },
  premium: {
    monthlyImages: 1200,
    dailyBurstCap: 120,
    maxUpscale: 6,
    faceEnhance: true,
  },
  enterprise: {
    monthlyImages: 5000,
    dailyBurstCap: 500,
    maxUpscale: 8,
    faceEnhance: true,
  }
});

export function getEntitlementsFor(ownerType: 'user' | 'guest', plan?: Plan): PlanEntitlements {
  if (ownerType === 'guest') {
    // Guests map to a conservative free-like entitlement
    return ENTITLEMENTS.free;
  }
  const p = plan ?? 'free';
  return ENTITLEMENTS[p];
}
