/**
 * Unit tests for AOS utilities
 * Tests aosDelayForIndex and getAosAttributes functions
 */

import { describe, it, expect } from 'vitest';
import { aosDelayForIndex, getAosAttributes } from '@/lib/aos';

describe('aosDelayForIndex', () => {
  it('should return 0 for index 0 with default options', () => {
    expect(aosDelayForIndex(0)).toBe(0);
  });

  it('should calculate delay with default step (100ms)', () => {
    expect(aosDelayForIndex(0)).toBe(0);
    expect(aosDelayForIndex(1)).toBe(100);
    expect(aosDelayForIndex(2)).toBe(200);
    expect(aosDelayForIndex(3)).toBe(300);
  });

  it('should cap delay at max value (default 400ms)', () => {
    expect(aosDelayForIndex(4)).toBe(400);
    expect(aosDelayForIndex(5)).toBe(400);
    expect(aosDelayForIndex(10)).toBe(400);
  });

  it('should respect custom step option', () => {
    expect(aosDelayForIndex(0, { step: 50 })).toBe(0);
    expect(aosDelayForIndex(1, { step: 50 })).toBe(50);
    expect(aosDelayForIndex(2, { step: 50 })).toBe(100);
    expect(aosDelayForIndex(3, { step: 50 })).toBe(150);
  });

  it('should respect custom max option', () => {
    expect(aosDelayForIndex(3, { max: 200 })).toBe(200); // Would be 300, capped at 200
    expect(aosDelayForIndex(5, { max: 300 })).toBe(300);
  });

  it('should respect custom start offset', () => {
    expect(aosDelayForIndex(0, { start: 100 })).toBe(100);
    expect(aosDelayForIndex(1, { start: 100 })).toBe(200);
    expect(aosDelayForIndex(2, { start: 100 })).toBe(300);
  });

  it('should combine all options correctly', () => {
    expect(aosDelayForIndex(0, { step: 50, max: 300, start: 50 })).toBe(50);
    expect(aosDelayForIndex(1, { step: 50, max: 300, start: 50 })).toBe(100);
    expect(aosDelayForIndex(5, { step: 50, max: 300, start: 50 })).toBe(300);
    expect(aosDelayForIndex(10, { step: 50, max: 300, start: 50 })).toBe(300); // Capped
  });

  it('should handle negative indices by clamping to 0', () => {
    expect(aosDelayForIndex(-1)).toBe(0);
    expect(aosDelayForIndex(-5)).toBe(0);
  });

  it('should handle decimal indices by flooring', () => {
    expect(aosDelayForIndex(1.5)).toBe(100);
    expect(aosDelayForIndex(2.9)).toBe(200);
  });

  it('should handle null/undefined by treating as 0', () => {
    expect(aosDelayForIndex(null as unknown as number)).toBe(0);
    expect(aosDelayForIndex(undefined as unknown as number)).toBe(0);
  });
});

describe('getAosAttributes', () => {
  it('should return default attributes when no props provided', () => {
    const attrs = getAosAttributes();
    expect(attrs).toEqual({
      'data-aos': 'fade-up',
      'data-aos-duration': '700',
    });
  });

  it('should use custom animation type', () => {
    const attrs = getAosAttributes({ animation: 'fade-left' }) as Record<string, string>;
    expect(attrs['data-aos']).toBe('fade-left');
  });

  it('should use custom duration', () => {
    const attrs = getAosAttributes({ duration: 600 }) as Record<string, string>;
    expect(attrs['data-aos-duration']).toBe('600');
  });

  it('should include delay only when > 0', () => {
    const attrs1 = getAosAttributes({ delay: 0 }) as Record<string, string>;
    expect(attrs1).not.toHaveProperty('data-aos-delay');

    const attrs2 = getAosAttributes({ delay: 100 }) as Record<string, string>;
    expect(attrs2).toHaveProperty('data-aos-delay', '100');
  });

  it('should combine all custom options', () => {
    const attrs = getAosAttributes({
      animation: 'zoom-in',
      delay: 200,
      duration: 500,
    }) as Record<string, string>;
    expect(attrs).toEqual({
      'data-aos': 'zoom-in',
      'data-aos-delay': '200',
      'data-aos-duration': '500',
    });
  });

  it('should return empty object when disableAos is true', () => {
    const attrs = getAosAttributes({
      animation: 'fade-up',
      delay: 100,
      duration: 700,
      disableAos: true,
    }) as Record<string, string>;
    expect(attrs).toEqual({});
  });

  it('should handle partial props correctly', () => {
    const attrs1 = getAosAttributes({ animation: 'slide-up' }) as Record<string, string>;
    expect(attrs1).toEqual({
      'data-aos': 'slide-up',
      'data-aos-duration': '700',
    });

    const attrs2 = getAosAttributes({ delay: 150 }) as Record<string, string>;
    expect(attrs2).toEqual({
      'data-aos': 'fade-up',
      'data-aos-delay': '150',
      'data-aos-duration': '700',
    });
  });

  it('should convert numeric values to strings', () => {
    const attrs = getAosAttributes({ delay: 100, duration: 600 }) as Record<string, string>;
    expect(typeof attrs['data-aos-delay']).toBe('string');
    expect(typeof attrs['data-aos-duration']).toBe('string');
  });
});
