'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const aos_1 = require('@/lib/aos');
(0, vitest_1.describe)('aosDelayForIndex', () => {
  (0, vitest_1.it)('returns 0 for index 0 with defaults', () => {
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(0)).toBe(0);
  });
  (0, vitest_1.it)('increments by default step (100ms)', () => {
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(1)).toBe(100);
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(2)).toBe(200);
  });
  (0, vitest_1.it)('clamps to default max (400ms)', () => {
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(5)).toBe(400); // 5*100 = 500 -> 400
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(50)).toBe(400);
  });
  (0, vitest_1.it)('respects custom max', () => {
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(5, { max: 300 })).toBe(300);
  });
  (0, vitest_1.it)('respects custom step', () => {
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(3, { step: 80 })).toBe(240);
  });
  (0, vitest_1.it)('respects start offset', () => {
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(0, { start: 50 })).toBe(50);
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(3, { start: 50 })).toBe(350);
  });
  (0, vitest_1.it)('floors non-integer indices and clamps negatives to 0', () => {
    // non-integer index
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(2.7)).toBe(200);
    // negative index
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(-3)).toBe(0);
    (0, vitest_1.expect)((0, aos_1.aosDelayForIndex)(-1, { start: 50 })).toBe(50);
  });
});
