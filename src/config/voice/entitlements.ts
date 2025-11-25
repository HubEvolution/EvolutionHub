import type { Plan } from '@/config/ai-image/entitlements';
import { VOICE_FREE_LIMIT_GUEST, VOICE_FREE_LIMIT_USER } from '@/config/voice';

export interface VoicePlanEntitlements {
  dailyBurstCap: number;
  monthlyRuns: number;
}

const GUEST_ENTITLEMENTS: Readonly<VoicePlanEntitlements> = Object.freeze({
  dailyBurstCap: VOICE_FREE_LIMIT_GUEST,
  monthlyRuns: VOICE_FREE_LIMIT_GUEST * 30,
});

export const VOICE_ENTITLEMENTS: Readonly<Record<Plan, VoicePlanEntitlements>> = Object.freeze({
  free: { dailyBurstCap: VOICE_FREE_LIMIT_USER, monthlyRuns: VOICE_FREE_LIMIT_USER * 30 },
  pro: { dailyBurstCap: 600, monthlyRuns: 600 * 30 },
  premium: { dailyBurstCap: 1200, monthlyRuns: 1200 * 30 },
  enterprise: { dailyBurstCap: 3000, monthlyRuns: 3000 * 30 },
});

export function getVoiceEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): VoicePlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return VOICE_ENTITLEMENTS[p];
}
