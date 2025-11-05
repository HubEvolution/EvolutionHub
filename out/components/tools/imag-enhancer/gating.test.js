"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gating_1 = require("./gating");
const ent2 = {
    monthlyImages: 450,
    dailyBurstCap: 15,
    maxUpscale: 2,
    faceEnhance: false,
};
const ent4 = {
    monthlyImages: 400,
    dailyBurstCap: 40,
    maxUpscale: 4,
    faceEnhance: true,
};
(0, vitest_1.describe)('computeAllowedScales', () => {
    (0, vitest_1.it)('returns empty when model does not support scale', () => {
        (0, vitest_1.expect)((0, gating_1.computeAllowedScales)(false, ent2, true)).toEqual([]);
    });
    (0, vitest_1.it)('returns [2,4] when gating disabled or entitlements missing', () => {
        (0, vitest_1.expect)((0, gating_1.computeAllowedScales)(true, null, false)).toEqual([2, 4]);
        (0, vitest_1.expect)((0, gating_1.computeAllowedScales)(true, null, true)).toEqual([2, 4]);
        (0, vitest_1.expect)((0, gating_1.computeAllowedScales)(true, ent2, false)).toEqual([2, 4]);
    });
    (0, vitest_1.it)('respects maxUpscale when gating enabled', () => {
        (0, vitest_1.expect)((0, gating_1.computeAllowedScales)(true, ent2, true)).toEqual([2]);
        (0, vitest_1.expect)((0, gating_1.computeAllowedScales)(true, ent4, true)).toEqual([2, 4]);
    });
});
(0, vitest_1.describe)('computeCanUseFaceEnhance', () => {
    (0, vitest_1.it)('is false when model does not support face enhance', () => {
        (0, vitest_1.expect)((0, gating_1.computeCanUseFaceEnhance)(false, ent4, true)).toBe(false);
    });
    (0, vitest_1.it)('is true when gating disabled regardless of entitlements', () => {
        (0, vitest_1.expect)((0, gating_1.computeCanUseFaceEnhance)(true, ent2, false)).toBe(true);
        (0, vitest_1.expect)((0, gating_1.computeCanUseFaceEnhance)(true, null, false)).toBe(true);
    });
    (0, vitest_1.it)('respects entitlements when gating enabled', () => {
        (0, vitest_1.expect)((0, gating_1.computeCanUseFaceEnhance)(true, ent2, true)).toBe(false);
        (0, vitest_1.expect)((0, gating_1.computeCanUseFaceEnhance)(true, ent4, true)).toBe(true);
    });
});
