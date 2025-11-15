import { describe, it, expect } from 'vitest';
import { LogUtils } from '@/config/logging';

describe('LogUtils.sanitizeObject', () => {
  it('redacts sensitive keys and preserves non-sensitive fields', () => {
    const input = {
      password: 'super-secret',
      token: 'abc123',
      secret: 'top-secret',
      apiKey: 'key-xyz',
      privateKey: 'pk',
      authorization: 'Bearer something',
      auth: 'basic',
      email: 'user@example.com',
      nested: {
        password: 'nested-secret',
        value: 'keep-me',
      },
    };

    const sanitized = LogUtils.sanitizeObject(input) as Record<string, unknown>;

    expect(sanitized.password).toBe('[FILTERED]');
    expect(sanitized.token).toBe('[FILTERED]');
    expect(sanitized.secret).toBe('[FILTERED]');
    expect(sanitized.apiKey).toBe('[FILTERED]');
    expect(sanitized.privateKey).toBe('[FILTERED]');
    expect(sanitized.authorization).toBe('[FILTERED]');
    expect(sanitized.auth).toBe('[FILTERED]');

    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.password).toBe('[FILTERED]');
    expect(nested.value).toBe('keep-me');
  });

  it('limits string length and marks deep objects as [Object]', () => {
    const longString = 'x'.repeat(1500);
    const input = {
      long: longString,
      deep: {
        level1: {
          level2: {
            level3: {
              password: 'should-be-filtered',
            },
          },
        },
      },
    };

    const sanitized = LogUtils.sanitizeObject(input) as Record<string, unknown>;

    const long = sanitized.long as string;
    expect(long.length).toBeLessThanOrEqual(1001); // 1000 + ellipsis
    expect(long.endsWith('…')).toBe(true);

    const deep = sanitized.deep as Record<string, unknown>;
    const level1 = deep.level1 as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3;
    // Beyond max depth we expect a placeholder
    expect(level3).toBe('[Object]');
  });

  it('handles circular references and arrays', () => {
    const obj: { self?: unknown; arr: unknown[] } = {
      arr: ['a', 'b', { password: 'secret' }],
    };
    obj.self = obj;

    const sanitized = LogUtils.sanitizeObject(obj) as { self: unknown; arr: unknown[] };

    expect(sanitized.self).toBe('[Circular]');

    const arr = sanitized.arr as unknown[];
    expect(arr[0]).toBe('a');
    expect(arr[1]).toBe('b');
    const nested = arr[2] as Record<string, unknown>;
    expect(nested.password).toBe('[FILTERED]');
  });
});
