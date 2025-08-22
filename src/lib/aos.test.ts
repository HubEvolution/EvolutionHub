import { describe, it, expect } from 'vitest';
import { aosDelayForIndex } from '@/lib/aos';

describe('aosDelayForIndex', () => {
  it('returns 0 for index 0 with defaults', () => {
    expect(aosDelayForIndex(0)).toBe(0);
  });

  it('increments by default step (100ms)', () => {
    expect(aosDelayForIndex(1)).toBe(100);
    expect(aosDelayForIndex(2)).toBe(200);
  });

  it('clamps to default max (400ms)', () => {
    expect(aosDelayForIndex(5)).toBe(400); // 5*100 = 500 -> 400
    expect(aosDelayForIndex(50)).toBe(400);
  });

  it('respects custom max', () => {
    expect(aosDelayForIndex(5, { max: 300 })).toBe(300);
  });

  it('respects custom step', () => {
    expect(aosDelayForIndex(3, { step: 80 })).toBe(240);
  });

  it('respects start offset', () => {
    expect(aosDelayForIndex(0, { start: 50 })).toBe(50);
    expect(aosDelayForIndex(3, { start: 50 })).toBe(350);
  });

  it('floors non-integer indices and clamps negatives to 0', () => {
    // non-integer index
    expect(aosDelayForIndex(2.7)).toBe(200);
    // negative index
    expect(aosDelayForIndex(-3)).toBe(0);
    expect(aosDelayForIndex(-1, { start: 50 })).toBe(50);
  });
});
