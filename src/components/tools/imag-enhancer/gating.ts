import type { PlanEntitlements } from '@/config/ai-image/entitlements';

/**
 * Compute allowed scales (subset of [2, 4]) based on model capability, feature-flag and entitlements.
 */
export function computeAllowedScales(
  modelSupportsScale: boolean,
  entitlements: PlanEntitlements | null,
  gatingEnabled: boolean
): (2 | 4)[] {
  if (!modelSupportsScale) return [];
  if (!gatingEnabled || !entitlements) return [2, 4];
  const max = entitlements.maxUpscale;
  const arr: (2 | 4)[] = [];
  if (2 <= max) arr.push(2);
  if (4 <= max) arr.push(4);
  return arr;
}

/**
 * Decide if face enhance is allowed based on model capability, feature-flag and entitlements.
 */
export function computeCanUseFaceEnhance(
  modelSupportsFaceEnhance: boolean,
  entitlements: PlanEntitlements | null,
  gatingEnabled: boolean
): boolean {
  if (!modelSupportsFaceEnhance) return false;
  if (!gatingEnabled || !entitlements) return modelSupportsFaceEnhance;
  return Boolean(entitlements.faceEnhance);
}
