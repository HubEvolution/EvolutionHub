import { renderHook, act } from '@testing-library/react';
import { vi, expect, test } from 'vitest';
import { usePlanGating } from '@/components/tools/imag-enhancer/hooks/usePlanGating';
import type { PlanEntitlements } from '@/config/ai-image/entitlements';

function setup(
  params: Partial<{
    modelSupportsScale: boolean;
    modelSupportsFace: boolean;
    entitlements: PlanEntitlements | null;
    gatingEnabled: boolean;
    scale: 2 | 4;
    faceEnhance: boolean;
  }>
) {
  const setScale = vi.fn();
  const setFaceEnhance = vi.fn();
  const res = renderHook(() =>
    usePlanGating({
      modelSupportsScale: params.modelSupportsScale ?? true,
      modelSupportsFace: params.modelSupportsFace ?? true,
      entitlements: params.entitlements ?? null,
      gatingEnabled: params.gatingEnabled ?? false,
      scale: params.scale ?? 4,
      setScale,
      faceEnhance: params.faceEnhance ?? true,
      setFaceEnhance,
    })
  );
  return { ...res, setScale, setFaceEnhance };
}

test('returns full allowed scales when gating disabled', () => {
  const { result } = setup({ gatingEnabled: false, entitlements: null, modelSupportsScale: true });
  expect(result.current.allowedScales).toEqual([2, 4]);
  expect(result.current.canUseFaceEnhance).toBe(true);
  expect(result.current.featureBlockedByPlan).toBe(false);
});

test('clamps scale when entitlements.maxUpscale=2 and scale=4', () => {
  const entitlements: PlanEntitlements = {
    plan: 'free',
    maxUpscale: 2,
    faceEnhance: false,
    dailyLimit: 10,
  };
  const { setScale } = setup({
    gatingEnabled: true,
    entitlements,
    scale: 4,
    modelSupportsScale: true,
  });
  // run effects
  act(() => {});
  expect(setScale).toHaveBeenCalledWith(2);
});

test('disables face enhance when not allowed', () => {
  const entitlements: PlanEntitlements = {
    plan: 'free',
    maxUpscale: 4,
    faceEnhance: false,
    dailyLimit: 10,
  };
  const { setFaceEnhance, result } = setup({
    gatingEnabled: true,
    entitlements,
    faceEnhance: true,
    modelSupportsFace: true,
  });
  act(() => {});
  expect(setFaceEnhance).toHaveBeenCalledWith(false);
  expect(result.current.canUseFaceEnhance).toBe(false);
});
