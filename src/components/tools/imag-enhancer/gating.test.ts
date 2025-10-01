import { describe, it, expect } from 'vitest';
import type { PlanEntitlements } from '@/config/ai-image/entitlements';
import { computeAllowedScales, computeCanUseFaceEnhance } from './gating';

const ent2: PlanEntitlements = {
  monthlyImages: 450,
  dailyBurstCap: 15,
  maxUpscale: 2,
  faceEnhance: false,
};

const ent4: PlanEntitlements = {
  monthlyImages: 400,
  dailyBurstCap: 40,
  maxUpscale: 4,
  faceEnhance: true,
};

describe('computeAllowedScales', () => {
  it('returns empty when model does not support scale', () => {
    expect(computeAllowedScales(false, ent2, true)).toEqual([]);
  });
  it('returns [2,4] when gating disabled or entitlements missing', () => {
    expect(computeAllowedScales(true, null, false)).toEqual([2, 4]);
    expect(computeAllowedScales(true, null, true)).toEqual([2, 4]);
    expect(computeAllowedScales(true, ent2, false)).toEqual([2, 4]);
  });
  it('respects maxUpscale when gating enabled', () => {
    expect(computeAllowedScales(true, ent2, true)).toEqual([2]);
    expect(computeAllowedScales(true, ent4, true)).toEqual([2, 4]);
  });
});

describe('computeCanUseFaceEnhance', () => {
  it('is false when model does not support face enhance', () => {
    expect(computeCanUseFaceEnhance(false, ent4, true)).toBe(false);
  });
  it('is true when gating disabled regardless of entitlements', () => {
    expect(computeCanUseFaceEnhance(true, ent2, false)).toBe(true);
    expect(computeCanUseFaceEnhance(true, null, false)).toBe(true);
  });
  it('respects entitlements when gating enabled', () => {
    expect(computeCanUseFaceEnhance(true, ent2, true)).toBe(false);
    expect(computeCanUseFaceEnhance(true, ent4, true)).toBe(true);
  });
});
