import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KVNamespace } from '@cloudflare/workers-types';

import { AiImageService } from '@/lib/services/ai-image-service';
import { getUsage as kvGetUsage } from '@/lib/kv/usage';
import type { OwnerType } from '@/config/ai-image';

vi.mock('@/lib/kv/usage', () => ({
  getUsage: vi.fn(),
  incrementDailyRolling: vi.fn(),
  rollingDailyKey: vi.fn().mockReturnValue('ai:rolling:key'),
  legacyMonthlyKey: vi.fn(),
  getCreditsBalanceTenths: vi.fn(),
  consumeCreditsTenths: vi.fn(),
}));

vi.mock('@/server/utils/logger-factory', () => ({
  loggerFactory: {
    createLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockedKvGetUsage = vi.mocked(kvGetUsage);

type RuntimeEnv = ConstructorParameters<typeof AiImageService>[0];

function createService(overrides: Partial<RuntimeEnv> = {}) {
  const kv = {
    get: vi.fn(),
    put: vi.fn(),
  } as unknown as KVNamespace;

  const env: RuntimeEnv = {
    KV_AI_ENHANCER: kv,
    ...overrides,
  };

  return {
    service: new AiImageService(env),
    kv,
    env,
  };
}

describe('AiImageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsage', () => {
    it('returns default usage when KV value is missing', async () => {
      const { service, kv } = createService();
      vi.mocked(kv.get).mockResolvedValueOnce(null);

      const result = await service.getUsage('user' as OwnerType, 'user-1', 3);

      expect(kv.get).toHaveBeenCalledWith('ai:usage:user:user-1');
      expect(result).toEqual({ used: 0, limit: 3, resetAt: null });
    });

    it('parses KV payload when present', async () => {
      const { service, kv } = createService();
      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify({ count: 2, resetAt: 1700000000 }));

      const result = await service.getUsage('guest' as OwnerType, 'guest-99', 5);

      expect(result).toEqual({ used: 2, limit: 5, resetAt: 1700000000 });
    });

    it('delegates to rolling usage helper when KV v2 is enabled', async () => {
      mockedKvGetUsage.mockResolvedValueOnce({ count: 4, resetAt: 1700000 });
      const { service, kv } = createService({ USAGE_KV_V2: 'true' });

      const result = await service.getUsage('user' as OwnerType, 'abc', 10);

      expect(mockedKvGetUsage).toHaveBeenCalledTimes(1);
      expect(mockedKvGetUsage.mock.calls[0][0]).toBe(kv);
      expect(result).toEqual({ used: 4, limit: 10, resetAt: 1700000 * 1000 });
    });
  });
});
