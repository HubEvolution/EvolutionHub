import { useEffect, useMemo } from 'react';
import { computeAllowedScales, computeCanUseFaceEnhance } from '../gating';
import type { PlanEntitlements } from '@/config/ai-image/entitlements';

interface UsePlanGatingParams {
  modelSupportsScale: boolean;
  modelSupportsFace: boolean;
  entitlements: PlanEntitlements | null;
  gatingEnabled: boolean;
  // current selections
  scale: 2 | 4 | null;
  setScale: (s: 2 | 4 | null) => void;
  faceEnhance: boolean;
  setFaceEnhance: (next: boolean) => void;
}

export function usePlanGating(params: UsePlanGatingParams) {
  const {
    modelSupportsScale,
    modelSupportsFace,
    entitlements,
    gatingEnabled,
    scale,
    setScale,
    faceEnhance,
    setFaceEnhance,
  } = params;

  const allowedScales = useMemo(
    () => computeAllowedScales(modelSupportsScale, entitlements, gatingEnabled),
    [modelSupportsScale, entitlements, gatingEnabled]
  );

  const canUseFaceEnhance = useMemo(
    () => computeCanUseFaceEnhance(modelSupportsFace, entitlements, gatingEnabled),
    [modelSupportsFace, entitlements, gatingEnabled]
  );

  const featureBlockedByPlan = useMemo(() => {
    if (!gatingEnabled || !entitlements) return false;
    if (
      modelSupportsScale &&
      typeof scale === 'number' &&
      entitlements.maxUpscale &&
      scale > entitlements.maxUpscale
    ) {
      return true;
    }
    if (modelSupportsFace && faceEnhance && !entitlements.faceEnhance) return true;
    return false;
  }, [gatingEnabled, entitlements, modelSupportsScale, modelSupportsFace, scale, faceEnhance]);

  // Safety clamp
  useEffect(() => {
    if (!gatingEnabled || !entitlements) return;
    try {
      if (modelSupportsScale) {
        const max = entitlements.maxUpscale;
        if (scale === 4 && (max ?? 2) < 4) setScale(2);
      }
      if (modelSupportsFace) {
        if (faceEnhance && !entitlements.faceEnhance) setFaceEnhance(false);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatingEnabled, entitlements, modelSupportsScale, modelSupportsFace]);

  return { allowedScales, canUseFaceEnhance, featureBlockedByPlan } as const;
}
