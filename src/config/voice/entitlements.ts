import type { Plan } from '@/config/ai-image/entitlements';
import { VOICE_FREE_LIMIT_GUEST, VOICE_FREE_LIMIT_USER } from '@/config/voice';

export interface VoicePlanEntitlements {
  dailyBurstCap: number;
}

const GUEST_ENTITLEMENTS: Readonly<VoicePlanEntitlements> = Object.freeze({
  dailyBurstCap: VOICE_FREE_LIMIT_GUEST,
});

export const VOICE_ENTITLEMENTS: Readonly<Record<Plan, VoicePlanEntitlements>> = Object.freeze({
  free: { dailyBurstCap: VOICE_FREE_LIMIT_USER },
  pro: { dailyBurstCap: 600 },
  premium: { dailyBurstCap: 1200 },
  enterprise: { dailyBurstCap: 3000 },
});

export function getVoiceEntitlementsFor(
  ownerType: 'user' | 'guest',
  plan?: Plan
): VoicePlanEntitlements {
  if (ownerType === 'guest') return GUEST_ENTITLEMENTS;
  const p = plan ?? 'free';
  return VOICE_ENTITLEMENTS[p];
}
