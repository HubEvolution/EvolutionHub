import type { Plan } from '@/config/ai-image/entitlements';

export interface VideoPlanEntitlements {
  // monthly quota measured in tenths of a credit
  monthlyCreditsTenths: number;
}

const GUEST_ENTITLEMENTS: Readonly<VideoPlanEntitlements> = Object.freeze({
  monthlyCreditsTenths: 0,
});

export const VIDEO_ENTITLEMENTS: Readonly<Record<Plan, VideoPlanEntitlements>> = Object.freeze({
  free: { monthlyCreditsTenths: 0 },
  pro: { monthlyCreditsTenths: 1000 },
  premium: { monthlyCreditsTenths: 1000 },
  enterprise: { monthlyCreditsTenths: 5000 },
});

export function getVideoEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): VideoPlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return VIDEO_ENTITLEMENTS[p];
}
